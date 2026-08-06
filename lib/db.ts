import { neon } from '@neondatabase/serverless';
import { parseGenerationReason, RATE_LIMITS } from '@/lib/pricing';
import { API_ERROR_CODES } from '@/lib/apiErrors';

/**
 * Neon Postgres 연결 모듈 (크레딧 서버 이전 1단계).
 *
 * - 연결: Vercel Storage(Neon)가 주입하는 DATABASE_URL(없으면 POSTGRES_URL) 사용.
 * - 테이블 2개: credits(잔액) + credit_ledger(차감/지급 이력).
 * - 신규 유저 기본 30 (현재 localStorage 로직과 동일).
 *
 * ★이번 단계는 "조회·지급"만. 차감(deduct)은 3단계에서 서버로 이전(이 파일에 함수만 미리 둘 수 있으나
 *   이번엔 getOrCreateBalance만 사용 — 기존 클라 차감 로직 0접촉).
 */

const connectionString = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
if (!connectionString) {
  // 런타임에 연결 시도 시점에 명확히 실패하도록(빌드 타임 throw 방지) 경고만.
  console.warn('[db] DATABASE_URL(또는 POSTGRES_URL) 미설정 — DB 연결 불가. .env.local 확인.');
}

export const sql = neon(connectionString ?? '');

/** 신규 가입 체험 지급량(2026-07-30: 16 → 10). 체험 계정은 섹션 수도 10으로 제한된다(lib/pricing.ts). */
export const SIGNUP_GRANT = 10;
/** 체험 크레딧 유효기간(일) — 7일 내에 한 번은 써보게 만드는 목적 */
export const TRIAL_VALID_DAYS = 7;

// ★생성 비용 상수(고정가 10)는 제거됨 — 크레딧 금액은 lib/pricing.ts calculateGenerationCost(1섹션=1크레딧)가 단일 소스.
//   서버 차감(strategy·generate)·클라 안내 모두 이 함수 경유. 고정 리터럴을 다시 두지 말 것.

/** dev/harness 크레딧 우회 — ★production에서는 어떤 경우에도 false.
 *  로컬 개발·하네스가 선차감 강제(402)에 막히지 않게 하는 명시적 옵트인(.env.local). */
export function creditsBypassEnabled(): boolean {
  return process.env.NODE_ENV !== 'production' && process.env.FLIK_BYPASS_CREDITS_IN_DEV === 'true';
}

export interface QuotaResult {
  allowed: boolean;
  /** allowed=true면 선점 후 누적 사용량, false면 현재 사용량(참고용) */
  used: number;
}

/** ★quota 원자 선점(P0) — count + weight ≤ limit일 때만 증가(단일 문장 = 동시 호출 안전).
 *  외부 API 호출 '전'에 호출해 초과분은 호출 자체가 실행되지 않게 한다.
 *  조건 불충족 시 UPDATE가 무효(RETURNING 없음) → allowed=false + 현재 사용량 별도 조회(보고용).
 *  실패 환급 없음(정책) — quota는 크레딧이 아니라 비용 폭주 안전장치. */
export async function consumeUsageQuota(scopeKey: string, weight: number, limit: number): Promise<QuotaResult> {
  const rows = await sql`
    INSERT INTO usage_counters (scope_key, count) VALUES (${scopeKey}, ${weight})
    ON CONFLICT (scope_key) DO UPDATE
      SET count = usage_counters.count + ${weight}, updated_at = now()
      WHERE usage_counters.count + ${weight} <= ${limit}
    RETURNING count` as Array<{ count: number }>;
  if (rows.length) return { allowed: true, used: rows[0].count };
  const cur = await sql`SELECT count FROM usage_counters WHERE scope_key = ${scopeKey}` as Array<{ count: number }>;
  return { allowed: false, used: cur[0]?.count ?? 0 };
}

/** ★차감 없이 현재 사용량만 읽는다(2026-08-04) — 결과 화면이 '남은 무료 재생성'을
 *  처음부터 보여주려면 필요하다. 전엔 한 번 재생성해봐야 숫자가 떴다. */
export async function peekUsageQuota(scopeKey: string): Promise<number> {
  const rows = await sql`SELECT count FROM usage_counters WHERE scope_key = ${scopeKey}` as Array<{ count: number }>;
  return rows[0]?.count ?? 0;
}

/* ── user/IP 시간창 rate limit — usage_counters 재사용(신규 테이블 없음) ── */

export type RateClass = 'image' | 'llm' | 'prep';
export interface RateCheck { allowed: boolean; limit?: number; used?: number; window?: string }

/** 요청의 클라이언트 IP — 프록시(x-forwarded-for) 첫 항목. 없으면 null(로컬 등). */
export function clientIp(req: Request): string | null {
  const xf = req.headers.get('x-forwarded-for');
  return xf ? xf.split(',')[0].trim() : null;
}

/** ★시간창 rate limit(보조 방어) — 고정 윈도(hour/day) 카운터를 원자 선점.
 *  scope_key 규약: rl:{subject}:{class}:{h|d}:{window} (subject = email 또는 ip).
 *  차감·quota(주 방어, fail-closed)와 달리 DB 오류 시 fail-open(허용+로그) — 보조층이
 *  DB 순단으로 전 서비스를 죽이지 않게. 초과 판정은 consumeUsageQuota와 동일 선점 방식. */
export async function checkRateLimit(cls: RateClass, email: string | null | undefined, ip: string | null): Promise<RateCheck> {
  // ★운영자는 제외 — 점검·재현 테스트가 셀러용 도배 방어에 걸리면 안 된다(8개 API 공통 지점에서 한 번에)
  if (email && (process.env.ADMIN_EMAILS ?? '').split(',').some(a => a.trim().toLowerCase() === email.toLowerCase() && a.trim())) {
    return { allowed: true };
  }
  const now = new Date().toISOString();
  const hour = now.slice(0, 13);   // 2026-07-08T14
  const day = now.slice(0, 10);    // 2026-07-08
  const checks: Array<{ scope: string; limit: number; window: string }> = [];
  if (cls === 'image') {
    if (email) {
      checks.push({ scope: `rl:${email}:image:h:${hour}`, limit: RATE_LIMITS.image.emailHour, window: '시간' });
      checks.push({ scope: `rl:${email}:image:d:${day}`, limit: RATE_LIMITS.image.emailDay, window: '일' });
    }
    if (ip) checks.push({ scope: `rl:${ip}:image:d:${day}`, limit: RATE_LIMITS.image.ipDay, window: '일' });
  } else if (cls === 'llm') {
    if (email) checks.push({ scope: `rl:${email}:llm:h:${hour}`, limit: RATE_LIMITS.llm.emailHour, window: '시간' });
  } else {
    if (email) checks.push({ scope: `rl:${email}:prep:d:${day}`, limit: RATE_LIMITS.prep.emailDay, window: '일' });
    if (ip) checks.push({ scope: `rl:${ip}:prep:d:${day}`, limit: RATE_LIMITS.prep.ipDay, window: '일' });
  }
  try {
    for (const c of checks) {
      const q = await consumeUsageQuota(c.scope, 1, c.limit);
      if (!q.allowed) return { allowed: false, limit: c.limit, used: q.used, window: c.window };
    }
    return { allowed: true };
  } catch (err) {
    console.error('[checkRateLimit] 오류 — fail-open(보조 방어):', err);
    return { allowed: true };
  }
}

export type PaidJobCheck =
  | { ok: true; paidSections: number }
  | { ok: false; status: number; error: string; code?: string };

/** ★유료 뒷문 가드(P0 2차) — 세션 email + jobKey + 본인 결제 기록(generation:{count})을 검증.
 *  copy·imagebrief·generate-image·regen-section이 외부 API 호출 '전'에 사용.
 *  creditsBypassEnabled() 분기는 호출부(라우트)에서 — production에서는 우회 불가. */
export async function verifyPaidJob(email: string | null | undefined, jobKey: unknown): Promise<PaidJobCheck> {
  if (!email) return { ok: false, status: 401, error: '로그인이 필요해요.' };
  if (!jobKey || typeof jobKey !== 'string') {
    return { ok: false, status: 400, error: '생성 요청에 jobKey가 필요해요.' };
  }
  try {
    const paid = await getPaidSections(email, jobKey);
    if (paid === null) {
      return { ok: false, status: 402, error: '결제된 생성 작업을 찾을 수 없어요. 새로 생성해주세요.', code: API_ERROR_CODES.paymentRequired };
    }
    return { ok: true, paidSections: paid };
  } catch (err) {
    console.error('[verifyPaidJob] 결제 기록 조회 오류:', err);
    return { ok: false, status: 500, error: '결제 기록 확인 중 오류가 발생했어요.' };
  }
}

/** 멱등키(jobKey)로 결제된 섹션 수 조회 — credit_ledger.reason 규약 "generation:{count}" 파싱.
 *  본인(user_email) 차감 기록만 인정(타인 키 재사용 차단). 기록 없거나 규약 불일치면 null.
 *  ★환불된 jobKey는 미결제 취급 — 산출물 0장 환불(refundZeroOutputJob) 후 그 키로
 *  이미지를 계속 뽑는 악용(환불+산출물 이중 수취) 차단. */
export async function getPaidSections(email: string, idempotencyKey: string): Promise<number | null> {
  const refundKey = `refund:zero-output:${idempotencyKey}`;
  const rows = await sql`
    SELECT reason FROM credit_ledger
    WHERE idempotency_key = ${idempotencyKey} AND user_email = ${email} AND type = 'deduct'
      AND NOT EXISTS (SELECT 1 FROM credit_ledger WHERE idempotency_key = ${refundKey})
    LIMIT 1` as Array<{ reason: string | null }>;
  if (!rows.length) return null;
  return parseGenerationReason(rows[0].reason);
}

export interface RefundResult {
  status: 'refunded' | 'not_eligible' | 'duplicate';
  balance: number;
}

/**
 * ★산출물 0장 환불 — 선차감(strategy) 후 파이프라인 실패·이탈로 이미지가 한 장도
 * 생성되지 않은 jobKey의 크레딧을 자동 환불한다(2026-07-18 크레딧 증발 사고 재발 방지).
 *
 * 단일 SQL 원자 검증 3중:
 *  ① 본인 차감 기록 존재(generation:%) ② img:{jobKey} 카운터 0 또는 없음 ③ 기환불 없음.
 * 이미지가 1장이라도 나갔으면 not_eligible(카피+이미지 일부를 받은 생성은 환불 없음 —
 * 정책상 부분 실패는 재생성 쿼터로 해결). 환불 후 해당 jobKey는 getPaidSections에서
 * 미결제 취급되어 추가 이미지 생성이 402로 막힌다.
 */
export async function refundZeroOutputJob(email: string, jobKey: string): Promise<RefundResult> {
  const refundKey = `refund:zero-output:${jobKey}`;
  const imgKey = `img:${jobKey}`;
  // ★텍스트 산출물 전달 여부(2026-07-27 보안점검) — 카피/이미지브리프를 받아간 job은 환불 불가.
  //   '이미지 0장'만 보던 판정은 카피만 뽑고 전액 환불받는 무료 사용 경로였다.
  const txtKey = `txt:${jobKey}`;
  const rows = await sql`
    WITH ded AS (
      SELECT -amount AS refund FROM credit_ledger
      WHERE idempotency_key = ${jobKey} AND user_email = ${email}
        AND type = 'deduct' AND reason LIKE 'generation%' AND amount < 0
      LIMIT 1
    ),
    eligible AS (
      SELECT refund FROM ded
      WHERE NOT EXISTS (SELECT 1 FROM usage_counters WHERE scope_key = ${imgKey} AND count > 0)
        AND NOT EXISTS (SELECT 1 FROM usage_counters WHERE scope_key = ${txtKey} AND count > 0)
        AND NOT EXISTS (SELECT 1 FROM credit_ledger WHERE idempotency_key = ${refundKey})
    ),
    r AS (
      UPDATE credits SET balance = balance + (SELECT refund FROM eligible), updated_at = now()
      WHERE user_email = ${email} AND EXISTS (SELECT 1 FROM eligible)
      RETURNING balance
    ),
    l AS (
      INSERT INTO credit_ledger (user_email, amount, type, reason, idempotency_key)
      SELECT ${email}, (SELECT refund FROM eligible), 'grant', 'refund:zero-output-generation', ${refundKey}
      WHERE EXISTS (SELECT 1 FROM r)
      RETURNING id
    )
    SELECT
      (SELECT balance FROM r) AS refunded_balance,
      (SELECT balance FROM credits WHERE user_email = ${email}) AS current_balance,
      EXISTS (SELECT 1 FROM credit_ledger WHERE idempotency_key = ${refundKey}) AS already`;
  const r = rows[0] as { refunded_balance: number | null; current_balance: number | null; already: boolean };
  if (r.refunded_balance !== null && r.refunded_balance !== undefined) {
    return { status: 'refunded', balance: r.refunded_balance };
  }
  if (r.already) return { status: 'duplicate', balance: r.current_balance ?? 0 };
  return { status: 'not_eligible', balance: r.current_balance ?? 0 };
}

/** ★무료 한도 초과 유료 이미지 생성의 실패 환불(2026-07-21) — 차감 원장(chargeKey)이 있고
 *  아직 환불 안 됐을 때만 원자 지급(멱등). generate-image가 차감 후 생성 실패 시 호출. */
export async function refundImageExtraCharge(email: string, chargeKey: string): Promise<void> {
  const refundKey = `refund:${chargeKey}`;
  await sql`
    WITH ded AS (
      SELECT -amount AS refund FROM credit_ledger
      WHERE idempotency_key = ${chargeKey} AND user_email = ${email}
        AND type = 'deduct' AND amount < 0
      LIMIT 1
    ),
    eligible AS (
      SELECT refund FROM ded
      WHERE NOT EXISTS (SELECT 1 FROM credit_ledger WHERE idempotency_key = ${refundKey})
    ),
    r AS (
      UPDATE credits SET balance = balance + (SELECT refund FROM eligible), updated_at = now()
      WHERE user_email = ${email} AND EXISTS (SELECT 1 FROM eligible)
      RETURNING balance
    )
    INSERT INTO credit_ledger (user_email, amount, type, reason, idempotency_key)
    SELECT ${email}, (SELECT refund FROM eligible), 'grant', 'refund:image-extra', ${refundKey}
    WHERE EXISTS (SELECT 1 FROM r)`;
}

/** 테이블 생성/마이그레이션(IF NOT EXISTS) — db-init 스크립트에서 1회 실행. 재실행 안전(멱등). */
/* ── ★스키마 자동 보장(2026-07-30) — ensureCreditTables가 수동 스크립트에서만 불려서
 *    신규 테이블(credit_lots·payment_orders)이 배포 환경에 없으면 결제/크레딧이 런타임에 죽는다.
 *    프로세스당 1회만 실행되도록 프라미스를 캐시한다(요청마다 DDL이 도는 것 방지). ── */
let schemaReady: Promise<void> | null = null;
export function ensureSchemaOnce(): Promise<void> {
  schemaReady ??= ensureCreditTables().catch(e => {
    schemaReady = null;   // 실패 시 다음 요청에서 재시도
    throw e;
  });
  return schemaReady;
}

export async function ensureCreditTables(): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS credits (
      user_email TEXT PRIMARY KEY,
      balance    INTEGER NOT NULL DEFAULT 30,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`;
  await sql`
    CREATE TABLE IF NOT EXISTS credit_ledger (
      id         BIGSERIAL PRIMARY KEY,
      user_email TEXT NOT NULL,
      amount     INTEGER NOT NULL,
      type       TEXT NOT NULL,            -- grant | deduct | refund
      reason     TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`;
  await sql`CREATE INDEX IF NOT EXISTS credit_ledger_email_idx ON credit_ledger (user_email)`;
  // ★3단계 차감: 멱등키 컬럼 + UNIQUE(이중차감 방지의 하드 가드). deduct에만 채워짐(grant는 NULL 허용).
  await sql`ALTER TABLE credit_ledger ADD COLUMN IF NOT EXISTS idempotency_key TEXT`;
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS credit_ledger_idem_idx ON credit_ledger (idempotency_key)`;
  // ★이미지 quota(P0) — 사용량 카운터. 재무 원장(credit_ledger)과 분리(고빈도·비재무).
  //   scope_key 규약: img:{jobKey} (추후 rl:{email}:{class}:{window} 시간창 rate에도 재사용)
  await sql`
    CREATE TABLE IF NOT EXISTS usage_counters (
      scope_key  TEXT PRIMARY KEY,
      count      INTEGER NOT NULL DEFAULT 0,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`;
  /* ★크레딧 유효기간(2026-07-30) — credit_lots는 '만료 원장'이다.
   *  차감은 여전히 credits.balance에서 원자적으로 일어나고(기존 로직·보안 가드 0접촉),
   *  lots는 "언제 받은 얼마가 언제 만료되는지"만 기록한다. 만료 처리는 sweepExpiredCredits가
   *  잔액 조회 시점에 수행(배치 미의존 — 크론이 안 돌아도 잔액이 틀리지 않는다).
   *  ⚠️lot이 없는 기존 계정은 만료 대상이 아니다(소급 소멸 금지 — 분쟁 방지). */
  await sql`
    CREATE TABLE IF NOT EXISTS credit_lots (
      id         BIGSERIAL PRIMARY KEY,
      user_email TEXT NOT NULL,
      amount     INTEGER NOT NULL,          -- 지급/충전 수량
      kind       TEXT NOT NULL,             -- trial | purchase | refund
      plan_id    TEXT,                      -- 구매 시 플랜 id
      expires_at TIMESTAMPTZ,               -- NULL = 무기한
      swept_at   TIMESTAMPTZ,               -- 만료 처리 완료 시각(중복 차감 방지)
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`;
  await sql`CREATE INDEX IF NOT EXISTS credit_lots_email_idx ON credit_lots (user_email)`;
  /* ★lot ↔ 결제 연결(2026-07-31) — 같은 플랜을 두 번 결제하면 plan_id만으로는 어느 묶음이
   *  어느 결제의 것인지 구분되지 않아, 환불 시 엉뚱한 묶음을 무효화할 수 있었다. */
  await sql`ALTER TABLE credit_lots ADD COLUMN IF NOT EXISTS payment_id TEXT`;
  /* ★결제 주문(2026-07-30) — 포트원 V2 인증결제.
   *  ⚠️금액은 반드시 서버가 정한다. 클라이언트가 보낸 금액을 신뢰하면 1원 결제로 크레딧을 받는다.
   *  prepare에서 주문을 만들고(서버 가격), complete에서 포트원 조회 금액과 이 주문 금액을 대조한다. */
  await sql`
    CREATE TABLE IF NOT EXISTS payment_orders (
      payment_id   TEXT PRIMARY KEY,        -- 포트원 paymentId(영문·숫자만)
      user_email   TEXT NOT NULL,
      plan_id      TEXT NOT NULL,
      amount       INTEGER NOT NULL,        -- 서버가 정한 결제 금액(원)
      credits      INTEGER NOT NULL,        -- 지급 예정 크레딧
      valid_months INTEGER NOT NULL,        -- 크레딧 유효기간(개월)
      status       TEXT NOT NULL DEFAULT 'pending',   -- pending | paid | failed
      created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
      paid_at      TIMESTAMPTZ
    )`;
  await sql`CREATE INDEX IF NOT EXISTS payment_orders_email_idx ON payment_orders (user_email)`;
  /* ★다운로드 이력(2026-07-30) — 환불 판정에 필요.
   *  악용 경로: 체험 크레딧으로 생성 → 결제(다운로드 권한 열림) → 전부 내려받기 →
   *  "결제분은 안 썼다"며 전액 환불 요구. 결제 이후의 다운로드가 있으면 환불 불가로 판정한다. */
  await sql`
    CREATE TABLE IF NOT EXISTS download_events (
      id         BIGSERIAL PRIMARY KEY,
      user_email TEXT NOT NULL,
      kind       TEXT NOT NULL,          -- html | merged | smartstore | capture
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`;
  await sql`CREATE INDEX IF NOT EXISTS download_events_email_idx ON download_events (user_email, created_at)`;
  /* ★고객의 소리(2026-07-30) — 불편을 겪은 셀러와 실제로 풀어내기 위한 창구.
   *  ⚠️핵심은 '맥락'이다. "카피가 이상해요"만으로는 못 고친다. 어떤 상품·설정으로 만든 결과인지가
   *  자동으로 붙어야 재현하고 수정할 수 있다. context에 상품정보·생성 설정을 JSON으로 담는다.
   *  이미지는 클라이언트에서 압축(약 800px JPEG)해 data URL로 저장 — 초기 물량에선 충분하다. */
  await sql`
    CREATE TABLE IF NOT EXISTS job_index (
      job_key      TEXT PRIMARY KEY,
      email        TEXT NOT NULL,
      product_name TEXT NOT NULL,
      cat          TEXT,
      ch           TEXT,
      out_type     TEXT,
      sec_cnt      INTEGER,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
    )`;
  await sql`CREATE INDEX IF NOT EXISTS job_index_email_idx ON job_index (email, created_at DESC)`;
  /* ★기기 간 '최근 작업' 목록(2026-08-04) — 목록만 서버에 둔다.
   *  결과물(섹션 카피·이미지 base64)은 여기 넣지 않는다: 16섹션이면 수십 MB라 DB에 들어갈 것이 아니고,
   *  넣는 순간 백업·비용·유출 위험이 전부 커진다. 셀러가 폰에서 확인하고 싶은 건 대개 '뭘 만들었나'다.
   *  ⚠️그래서 다른 기기에서 만든 항목은 열 수 없다 — 화면에서 그 사실을 반드시 밝힐 것(숨기면 고장으로 보인다). */
  await sql`
    CREATE TABLE IF NOT EXISTS feedback (
      id         BIGSERIAL PRIMARY KEY,
      user_email TEXT NOT NULL,
      rating     INTEGER,                 -- 1~5 (선택)
      message    TEXT NOT NULL,
      context    JSONB,                   -- 상품정보·생성 설정 스냅샷
      image      TEXT,                    -- 압축된 data URL(선택)
      status     TEXT NOT NULL DEFAULT 'new',   -- new | replied | closed
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`;
  await sql`CREATE INDEX IF NOT EXISTS feedback_created_idx ON feedback (created_at DESC)`;
}

export interface FeedbackInput {
  email: string;
  message: string;
  rating?: number | null;
  context?: Record<string, unknown> | null;
  image?: string | null;
}

/** 의견 저장 — 반환된 id는 관리자 응대 시 참조용 */
export async function saveFeedback(f: FeedbackInput): Promise<number> {
  const rows = await sql`
    INSERT INTO feedback (user_email, rating, message, context, image)
    VALUES (${f.email}, ${f.rating ?? null}, ${f.message},
            ${f.context ? JSON.stringify(f.context) : null}, ${f.image ?? null})
    RETURNING id`;
  return Number((rows[0] as { id: string }).id);
}

/** 다운로드 1건 기록 — 실패해도 내보내기를 막지 않는다(기록은 부가 기능). */
export async function recordDownload(email: string, kind: string): Promise<void> {
  try {
    await sql`INSERT INTO download_events (user_email, kind) VALUES (${email}, ${kind.slice(0, 20)})`;
  } catch (e) { console.error('[recordDownload]', e); }
}

export interface PaymentOrder {
  payment_id: string; user_email: string; plan_id: string;
  amount: number; credits: number; valid_months: number; status: string;
}

/** 결제 주문 생성 — 금액·크레딧은 호출부(서버)가 PLANS에서 계산해 넘긴다. */
export async function createPaymentOrder(o: {
  paymentId: string; email: string; planId: string;
  amount: number; credits: number; validMonths: number;
}): Promise<void> {
  await sql`
    INSERT INTO payment_orders (payment_id, user_email, plan_id, amount, credits, valid_months)
    VALUES (${o.paymentId}, ${o.email}, ${o.planId}, ${o.amount}, ${o.credits}, ${o.validMonths})`;
}

export async function getPaymentOrder(paymentId: string): Promise<PaymentOrder | null> {
  const rows = await sql`SELECT * FROM payment_orders WHERE payment_id = ${paymentId}`;
  return (rows[0] as PaymentOrder | undefined) ?? null;
}

export type SettleResult =
  | { status: 'granted'; balance: number; credits: number }
  | { status: 'duplicate'; balance: number }
  | { status: 'not_found' };

/**
 * ★결제 확정 — 크레딧 지급을 원자적·멱등적으로 처리.
 *  멱등키 `payment:{paymentId}`로 credit_ledger UNIQUE 인덱스를 활용해 이중 지급을 하드 차단한다
 *  (complete가 여러 번 호출되거나 웹훅과 중복돼도 1회만 지급).
 *  유효기간 lot 기록은 지급 성공 시에만 남긴다.
 */
export async function settlePaidOrder(paymentId: string): Promise<SettleResult> {
  const order = await getPaymentOrder(paymentId);
  if (!order) return { status: 'not_found' };
  const key = `payment:${paymentId}`;

  const rows = await sql`
    WITH l AS (
      INSERT INTO credit_ledger (user_email, amount, type, reason, idempotency_key)
      VALUES (${order.user_email}, ${order.credits}, 'grant', ${'purchase:' + order.plan_id}, ${key})
      ON CONFLICT (idempotency_key) DO NOTHING
      RETURNING id
    ),
    c AS (
      INSERT INTO credits (user_email, balance) VALUES (${order.user_email}, ${order.credits})
      ON CONFLICT (user_email) DO UPDATE
        SET balance = credits.balance + ${order.credits}, updated_at = now()
      WHERE EXISTS (SELECT 1 FROM l)
      RETURNING balance
    ),
    o AS (
      UPDATE payment_orders SET status = 'paid', paid_at = now()
      WHERE payment_id = ${paymentId} AND status <> 'paid'
      RETURNING payment_id
    )
    SELECT (SELECT balance FROM c) AS granted_balance,
           (SELECT balance FROM credits WHERE user_email = ${order.user_email}) AS current_balance`;
  const r = rows[0] as { granted_balance: number | null; current_balance: number | null };

  if (r.granted_balance !== null && r.granted_balance !== undefined) {
    // 구매 lot 기록 — 유효기간(개월) 기준. 실패해도 잔액엔 영향 없음.
    await recordCreditLot(order.user_email, order.credits, 'purchase', order.valid_months * 30, order.plan_id, paymentId);
    return { status: 'granted', balance: r.granted_balance, credits: order.credits };
  }
  return { status: 'duplicate', balance: r.current_balance ?? 0 };
}

export interface RefundEvaluation {
  eligible: boolean;
  reason: string;
  /** 환불 예정 금액(원) — 조건 충족 시 결제 전액 */
  amount: number;
  /** 회수할 크레딧 */
  credits: number;
  planId: string;
  email: string;
  /** 참고 정보 */
  daysSincePaid: number | null;
  lotRemaining: number | null;
  lotAmount: number | null;
  downloadsAfterPaid: number;
}

/**
 * ★환불 가능 여부 판정(2026-07-30) — 정책: 7일 이내 + 해당 충전분 미사용 + 결제 후 다운로드 없음.
 *
 * '미사용' 기준은 그 결제로 생긴 lot의 remaining == amount 이다.
 * (선입선출로 유효기간이 짧은 크레딧부터 쓰이므로, 체험분으로 생성했다면 결제분은 그대로 남는다.
 *  이 경우 결제한 것을 아직 소비하지 않은 것이 맞으므로 환불이 타당하다 — 단 다운로드는 별도 확인.)
 */
export async function evaluateRefund(paymentId: string): Promise<RefundEvaluation | null> {
  const order = await getPaymentOrder(paymentId);
  if (!order) return null;

  const base = {
    amount: order.amount, credits: order.credits,
    planId: order.plan_id, email: order.user_email,
  };

  if (order.status !== 'paid') {
    return { ...base, eligible: false, reason: `결제 완료 상태가 아니에요(${order.status}).`,
             daysSincePaid: null, lotRemaining: null, lotAmount: null, downloadsAfterPaid: 0 };
  }

  const rows = await sql`
    SELECT
      (SELECT paid_at FROM payment_orders WHERE payment_id = ${paymentId})                 AS paid_at,
      (SELECT EXTRACT(EPOCH FROM (now() - paid_at)) / 86400
         FROM payment_orders WHERE payment_id = ${paymentId})                              AS days,
      (SELECT count(*) FROM download_events d
        WHERE d.user_email = ${order.user_email}
          AND d.created_at >= (SELECT paid_at FROM payment_orders WHERE payment_id = ${paymentId})) AS downloads`;
  const r = rows[0] as { days: string | null; downloads: string | null };
  const days = r.days === null ? null : Number(r.days);
  const downloads = Number(r.downloads ?? 0);

  // 이 결제로 생긴 lot — 결제 시각 이후 생성된 purchase lot 중 해당 플랜
  const lotRows = await sql`
    SELECT amount, swept_at FROM credit_lots
    WHERE user_email = ${order.user_email} AND kind = 'purchase' AND plan_id = ${order.plan_id}
    ORDER BY created_at DESC LIMIT 1`;
  const lot = lotRows[0] as { amount: number; swept_at: string | null } | undefined;

  // 잔액을 만료 순으로 배분해 이 lot의 남은 수량 추정(credits/lots API와 동일 규칙)
  const allocRows = await sql`
    WITH active AS (
      SELECT id, amount FROM credit_lots
      WHERE user_email = ${order.user_email} AND swept_at IS NULL
        AND (expires_at IS NULL OR expires_at > now())
      ORDER BY expires_at NULLS LAST, id
    ),
    bal AS (SELECT COALESCE(balance,0) AS b FROM credits WHERE user_email = ${order.user_email})
    SELECT COALESCE(SUM(amount),0) AS active_total, (SELECT b FROM bal) AS balance FROM active`;
  const a = allocRows[0] as { active_total: string; balance: number };
  // 보수적 추정: 활성 묶음 합계와 잔액이 같으면 아무것도 안 쓴 것
  const untouched = Number(a.active_total) > 0 && Number(a.balance) >= Number(a.active_total);
  const lotAmount = lot?.amount ?? null;
  const lotRemaining = untouched ? lotAmount : null;

  const info = { daysSincePaid: days, lotRemaining, lotAmount, downloadsAfterPaid: downloads };

  if (days !== null && days > 7) {
    return { ...base, ...info, eligible: false, reason: `결제 후 7일이 지났어요(${Math.floor(days)}일 경과).` };
  }
  if (downloads > 0) {
    return { ...base, ...info, eligible: false, reason: `결제 이후 다운로드 이력이 ${downloads}건 있어요.` };
  }
  if (!untouched) {
    return { ...base, ...info, eligible: false, reason: '충전한 크레딧을 이미 사용했어요.' };
  }
  return { ...base, ...info, eligible: true, reason: '환불 가능 — 7일 이내, 미사용, 다운로드 없음' };
}

/**
 * 환불 확정 — 크레딧 회수 + 묶음 무효화 + 원장 기록(원자적). 포트원 취소는 호출부가 먼저 성공시킨다.
 *
 * ★안전장치 3가지:
 *  1) 지급된 적 없으면 회수하지 않는다 — `payment:{id}` 지급 원장이 있을 때만 동작한다.
 *     (pending 주문이 외부에서 취소됐을 때 주지도 않은 크레딧을 빼앗는 것을 막는다.)
 *  2) 회수는 멱등 — `refund:payment:{id}` 유니크키. 웹훅 재전송·관리자 중복 실행에도 1회만.
 *  3) 무효화할 묶음은 payment_id로 특정한다. 같은 플랜을 두 번 산 계정에서 엉뚱한 묶음이
 *     날아가지 않게. (payment_id가 없는 과거 묶음만 기존 규칙으로 1건 대체 처리)
 *
 * ⚠️이미 쓴 크레딧은 되돌릴 수 없으므로 잔액은 0에서 멈춘다(음수 금지). 이 경우는 로그로 남긴다.
 */
export async function revokeRefundedCredits(paymentId: string): Promise<{ balance: number; revoked: boolean }> {
  const order = await getPaymentOrder(paymentId);
  if (!order) throw new Error('주문을 찾을 수 없어요.');
  const key = `refund:payment:${paymentId}`;
  const rows = await sql`
    WITH granted AS (
      SELECT 1 FROM credit_ledger WHERE idempotency_key = ${'payment:' + paymentId}
    ),
    l AS (
      INSERT INTO credit_ledger (user_email, amount, type, reason, idempotency_key)
      SELECT ${order.user_email}, ${-order.credits}, 'refund', ${'refund:' + order.plan_id}, ${key}
      WHERE EXISTS (SELECT 1 FROM granted)
      ON CONFLICT (idempotency_key) DO NOTHING
      RETURNING id
    ),
    c AS (
      UPDATE credits SET balance = GREATEST(0, balance - ${order.credits}), updated_at = now()
      WHERE user_email = ${order.user_email} AND EXISTS (SELECT 1 FROM l)
      RETURNING balance
    ),
    linked AS (
      SELECT id FROM credit_lots
      WHERE user_email = ${order.user_email} AND swept_at IS NULL AND payment_id = ${paymentId}
    ),
    legacy AS (
      SELECT id FROM credit_lots
      WHERE user_email = ${order.user_email} AND swept_at IS NULL AND payment_id IS NULL
        AND kind = 'purchase' AND plan_id = ${order.plan_id}
        AND NOT EXISTS (SELECT 1 FROM linked)
      ORDER BY created_at DESC LIMIT 1
    ),
    lot AS (
      UPDATE credit_lots SET swept_at = now()
      WHERE id IN (SELECT id FROM linked UNION SELECT id FROM legacy)
        AND EXISTS (SELECT 1 FROM l)
      RETURNING id
    ),
    o AS (
      UPDATE payment_orders SET status = 'refunded'
      WHERE payment_id = ${paymentId} AND EXISTS (SELECT 1 FROM l)
      RETURNING payment_id
    )
    SELECT (SELECT count(*) FROM l) AS revoked,
           COALESCE((SELECT balance FROM c),
                    (SELECT balance FROM credits WHERE user_email = ${order.user_email}), 0) AS balance`;
  const r = rows[0] as { revoked: string; balance: number };
  return { balance: Number(r.balance), revoked: Number(r.revoked) > 0 };
}

/** 결제 실패·취소 기록(정보용) */
export async function markPaymentFailed(paymentId: string): Promise<void> {
  try {
    await sql`UPDATE payment_orders SET status = 'failed' WHERE payment_id = ${paymentId} AND status = 'pending'`;
  } catch (e) { console.error('[markPaymentFailed]', e); }
}

/** 만료되는 크레딧 지급 기록 — 잔액 증가는 호출부(기존 로직)가 하고, 여기서는 만료 정보만 남긴다. */
export async function recordCreditLot(
  email: string, amount: number, kind: 'trial' | 'purchase' | 'refund',
  validDays: number | null, planId?: string, paymentId?: string,
): Promise<void> {
  if (amount <= 0) return;
  try {
    if (validDays === null) {
      await sql`INSERT INTO credit_lots (user_email, amount, kind, plan_id, payment_id, expires_at)
                VALUES (${email}, ${amount}, ${kind}, ${planId ?? null}, ${paymentId ?? null}, NULL)`;
    } else {
      await sql`INSERT INTO credit_lots (user_email, amount, kind, plan_id, payment_id, expires_at)
                VALUES (${email}, ${amount}, ${kind}, ${planId ?? null}, ${paymentId ?? null},
                        now() + (${validDays} || ' days')::interval)`;
    }
  } catch (e) {
    // 만료 기록 실패가 지급 자체를 막지 않게(잔액은 이미 증가). 다음 충전 때 다시 기록된다.
    console.error('[recordCreditLot] 실패(잔액엔 영향 없음):', e);
  }
}

/**
 * ★만료 소멸 처리 — 잔액 조회 시점에 수행(단일 SQL = 원자적).
 *
 * 소비는 '만료가 임박한 lot부터'(FIFO by expiry)라고 정의한다. 그러면 어느 시점의 잔액은
 * 항상 '가장 늦게 만료되는 lot들'이 뒷받침한다. 따라서 만료된 lot에서 실제로 잃는 양은
 *   loss = max(0, balance - (아직 만료되지 않은 lot들의 amount 합))
 * 이다. 이 식이면 lot마다 소비량을 따로 추적하지 않아도 정확하다(차감 경로 무수정의 근거).
 *
 * 예) 체험10(D+7) + PRO160(D+90), 5 사용 → 잔액 165. D+8에 loss = max(0,165-160) = 5 → 체험 미사용분만 소멸.
 */
export async function sweepExpiredCredits(email: string): Promise<number> {
  try {
    const rows = await sql`
      WITH expired AS (
        SELECT id FROM credit_lots
        WHERE user_email = ${email} AND swept_at IS NULL
          AND expires_at IS NOT NULL AND expires_at <= now()
      ),
      later AS (
        SELECT COALESCE(SUM(amount), 0) AS total FROM credit_lots
        WHERE user_email = ${email} AND swept_at IS NULL
          AND (expires_at IS NULL OR expires_at > now())
      ),
      cur AS (SELECT COALESCE(balance, 0) AS balance FROM credits WHERE user_email = ${email}),
      calc AS (
        SELECT GREATEST(0, (SELECT balance FROM cur) - (SELECT total FROM later)) AS loss
        WHERE EXISTS (SELECT 1 FROM expired)
      ),
      upd AS (
        UPDATE credits SET balance = balance - (SELECT loss FROM calc), updated_at = now()
        WHERE user_email = ${email} AND EXISTS (SELECT 1 FROM calc) AND (SELECT loss FROM calc) > 0
        RETURNING balance
      ),
      mark AS (
        UPDATE credit_lots SET swept_at = now()
        WHERE id IN (SELECT id FROM expired)
        RETURNING id
      ),
      led AS (
        INSERT INTO credit_ledger (user_email, amount, type, reason)
        SELECT ${email}, -(SELECT loss FROM calc), 'deduct', 'expire:credit-lot'
        WHERE EXISTS (SELECT 1 FROM calc) AND (SELECT loss FROM calc) > 0
        RETURNING id
      )
      SELECT COALESCE((SELECT loss FROM calc), 0) AS loss, (SELECT count(*) FROM mark) AS swept`;
    const r = rows[0] as { loss: number | null; swept: number | null };
    const loss = Number(r?.loss ?? 0);
    if (loss > 0) console.log(`[sweepExpiredCredits] ${email} — ${loss}크레딧 소멸(lot ${r?.swept}개 처리)`);
    return loss;
  } catch (e) {
    console.error('[sweepExpiredCredits] 실패(잔액 유지):', e);
    return 0;
  }
}

export interface DeductResult {
  status: 'deducted' | 'duplicate' | 'insufficient';
  balance: number;
}

/**
 * ★원자적 차감 (3단계 핵심). 단일 SQL문(data-modifying CTE)으로:
 *  - 이중차감 방지: idempotency_key가 이미 있으면 차감 안 함(NOT EXISTS) → 'duplicate'.
 *  - 마이너스/동시 방지: UPDATE ... WHERE balance >= amount (credits 행 잠금으로 동시 요청 직렬화).
 *  - 실패시차감 방지: 호출 자체를 생성 성공 후에만(클라 타이밍) — 서버는 호출되면 차감 시도만.
 *  - 차감과 ledger 기록이 같은 문장 = 원자적(중간에 끊겨 한쪽만 반영되는 일 없음).
 *
 * @returns deducted(새 잔액) | duplicate(이미 차감됨, 현재 잔액) | insufficient(부족, 차감 안 함)
 */
export async function deductCreditsAtomic(
  email: string, amount: number, idempotencyKey: string, reason = 'generation',
): Promise<DeductResult> {
  const rows = await sql`
    WITH d AS (
      UPDATE credits SET balance = balance - ${amount}, updated_at = now()
      WHERE user_email = ${email}
        AND balance >= ${amount}
        AND NOT EXISTS (SELECT 1 FROM credit_ledger WHERE idempotency_key = ${idempotencyKey})
      RETURNING balance
    ),
    l AS (
      INSERT INTO credit_ledger (user_email, amount, type, reason, idempotency_key)
      SELECT ${email}, ${-amount}, 'deduct', ${reason}, ${idempotencyKey}
      WHERE EXISTS (SELECT 1 FROM d)
      RETURNING id
    )
    SELECT
      (SELECT balance FROM d)                                                      AS deducted_balance,
      (SELECT balance FROM credits WHERE user_email = ${email})                    AS current_balance,
      EXISTS (SELECT 1 FROM credit_ledger WHERE idempotency_key = ${idempotencyKey}) AS key_exists`;
  const r = rows[0] as { deducted_balance: number | null; current_balance: number | null; key_exists: boolean };
  const current = r.current_balance ?? 0;
  if (r.deducted_balance !== null && r.deducted_balance !== undefined) {
    return { status: 'deducted', balance: r.deducted_balance };
  }
  if (r.key_exists) return { status: 'duplicate', balance: current };   // 이미 차감(멱등) — 재차감 안 함
  return { status: 'insufficient', balance: current };                  // 잔액 부족 — 차감 안 함
}

/** 가입 지급 어뷰징용 이메일 정규화 — +태그 제거, gmail은 점 제거·googlemail 통일.
 *  같은 실제 메일함으로 무한 재가입해 크레딧을 반복 수령하는 가장 싼 트릭을 차단한다.
 *  (계정 식별은 원본 email 그대로 — 정규화는 '가입 지급 1회' 판정에만 사용) */
export function normalizeEmailForGrant(email: string): string {
  const [localRaw = '', domainRaw = ''] = email.trim().toLowerCase().split('@');
  const domain = domainRaw === 'googlemail.com' ? 'gmail.com' : domainRaw;
  let local = localRaw.split('+')[0];
  if (domain === 'gmail.com') local = local.replace(/\./g, '');
  return `${local}@${domain}`;
}

/** IP당 하루 가입 지급 상한 — 계정 갈아타기 파밍 방어.
 *
 *  ★1 → 10으로 완화(2026-08-06). 원래 1회는 강경책이었고(2026-07-18) 전제가 "같은 사무실 동료는
 *    각자 폰=개별 IP로 가입하면 된다"였는데, 그 전제가 사실과 다르다:
 *    국내 이동통신은 CGNAT를 써서 서로 모르는 수많은 가입자가 같은 공인 IP를 공유한다.
 *    즉 모바일에서 온 신규 셀러 대부분이 '오늘 그 IP의 첫 사람'이 아니라 체험 크레딧을 못 받는다.
 *    실제로 오늘 같은 사무실에서 두 번째 가입(카카오)이 0을 받았다.
 *    ⚠️대면 테스트·오픈 직후처럼 여러 명이 한 와이파이에서 가입하는 상황이 정확히 이 함정이다.
 *
 *  ★파밍 방어의 본체는 IP가 아니라 '정규화 이메일 기지급 검사'다(gmail 점·+별칭까지 흡수).
 *    IP 상한은 보조층이므로, 정상 사용자를 막지 않는 선까지 올린다. */
const SIGNUP_GRANTS_PER_IP_PER_DAY = 10;

/**
 * 유저 잔액 조회. row 없으면 신규 지급(grant) + ledger 기록 후 반환.
 * ON CONFLICT DO NOTHING으로 동시요청에도 중복 지급 안 됨(멱등).
 *
 * ★가입 지급 어뷰징 가드(2단):
 *  ① 정규화 이메일 기준 기지급이면 0 지급(ledger idempotency_key = signup:{norm})
 *  ② 같은 IP에서 하루 3회 초과 지급이면 0 지급 (usage_counters 재사용)
 *  0 지급이어도 계정 생성·서비스 접근은 정상 — 크레딧만 없음.
 */
/** 가입 지급 가드 통과 여부 — 정규화 이메일 기지급·IP 일일 상한 검사. 통과 시 지급액, 차단 시 0. */
async function decideSignupGrant(email: string, ip: string | null | undefined, normKey: string): Promise<number> {
  // 기지급 검사 2중: ①정규화 이메일 키(신규 방식) ②본인 email의 signup 기록(키 없는 레거시 지급분 —
  //   없으면 잔액 0까지 쓴 레거시 유저가 지연 지급 경로로 재수령하는 구멍이 생김)
  const already = await sql`
    SELECT 1 FROM credit_ledger
    WHERE idempotency_key = ${normKey} OR (user_email = ${email} AND reason = 'signup')
    LIMIT 1`;
  if (already.length) {
    console.warn(`[signup] 기지급 — 0 지급: ${email}`);
    return 0;
  }
  if (ip) {
    const day = new Date().toISOString().slice(0, 10);
    try {
      const q = await consumeUsageQuota(`signup-ip:${ip}:${day}`, 1, SIGNUP_GRANTS_PER_IP_PER_DAY);
      if (!q.allowed) {
        console.warn(`[signup] IP 일일 지급 상한 — 지연 지급 대상: ${email} ip=${ip}`);
        return 0;
      }
    } catch { /* 카운터 오류 시 fail-open(지급) — 보조 방어층 */ }
  }
  return SIGNUP_GRANT;
}

/** ★유료 결제 이력 여부(2026-07-30) — 다운로드 게이트·섹션 상한 판정 기준.
 *  purchase 종류의 lot이 하나라도 있으면 유료 사용자로 본다(만료 여부와 무관 — 한 번 결제한 사람의
 *  다운로드 권한을 만료로 회수하지 않는다). 체험만 있는 계정은 false. */
export async function hasPaidHistory(email: string | null | undefined): Promise<boolean> {
  if (!email) return false;
  try {
    const rows = await sql`SELECT 1 FROM credit_lots WHERE user_email = ${email} AND kind = 'purchase' LIMIT 1`;
    return rows.length > 0;
  } catch (e) {
    // 조회 실패 시엔 막지 않는다(정상 사용자를 잠그는 쪽이 더 큰 사고)
    console.error('[hasPaidHistory] 실패 — 허용으로 폴백:', e);
    return true;
  }
}

export async function getOrCreateBalance(email: string, ip?: string | null): Promise<number> {
  const normKey = `signup:${normalizeEmailForGrant(email)}`;
  // ★만료 소멸을 잔액 조회 '전에' 수행 — 화면·차감 게이트가 항상 만료 반영된 잔액을 본다.
  await sweepExpiredCredits(email);
  const existing = await sql`SELECT balance FROM credits WHERE user_email = ${email}`;
  if (existing.length) {
    const bal = (existing[0] as { balance: number }).balance;
    // ★지연 지급 — IP 상한 때문에 0으로 시작한 계정은 이후 방문에서 자동 수령(박탈→지연).
    //   가드가 그대로 다시 돌므로: 기지급 메일함은 여전히 0, 어뷰저 파밍 속도도 IP 상한 그대로.
    //   (크레딧을 다 쓴 유저는 signup ledger가 있어 기지급 검사에서 걸림 — 재지급 없음)
    if (bal === 0) {
      const grant = await decideSignupGrant(email, ip, normKey);
      if (grant > 0) {
        const rows = await sql`
          WITH l AS (
            INSERT INTO credit_ledger (user_email, amount, type, reason, idempotency_key)
            VALUES (${email}, ${grant}, 'grant', 'signup', ${normKey})
            ON CONFLICT (idempotency_key) DO NOTHING
            RETURNING id
          )
          UPDATE credits SET balance = balance + ${grant}, updated_at = now()
          WHERE user_email = ${email} AND EXISTS (SELECT 1 FROM l)
          RETURNING balance`;
        if (rows.length) {
          await recordCreditLot(email, grant, 'trial', TRIAL_VALID_DAYS);
          return (rows[0] as { balance: number }).balance;
        }
      }
    }
    return bal;
  }

  // 신규 — 지급액 결정(어뷰징 가드) 후 생성
  const grant = await decideSignupGrant(email, ip, normKey);
  const inserted = await sql`
    INSERT INTO credits (user_email, balance) VALUES (${email}, ${grant})
    ON CONFLICT (user_email) DO NOTHING
    RETURNING balance`;
  if (inserted.length > 0) {
    if (grant > 0) {
      await sql`
        INSERT INTO credit_ledger (user_email, amount, type, reason, idempotency_key)
        VALUES (${email}, ${grant}, 'grant', 'signup', ${normKey})
        ON CONFLICT (idempotency_key) DO NOTHING`;
      // ★체험 크레딧은 7일 만료 — lot으로 기록해 sweepExpiredCredits가 소멸시킨다.
      await recordCreditLot(email, grant, 'trial', TRIAL_VALID_DAYS);
    }
    return grant;
  }
  const rows = await sql`SELECT balance FROM credits WHERE user_email = ${email}`;
  return (rows[0] as { balance: number } | undefined)?.balance ?? 0;
}
