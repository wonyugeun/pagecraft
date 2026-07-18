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

/** 신규 가입 기본 지급량 — 기존 로직(30)과 동일. */
export const SIGNUP_GRANT = 16;   // 신규 가입 체험 크레딧 — 일반 품질 16섹션 1회(원가 ~2,500원)

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

/** 테이블 생성/마이그레이션(IF NOT EXISTS) — db-init 스크립트에서 1회 실행. 재실행 안전(멱등). */
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

/** IP당 하루 가입 지급 상한 — 계정 갈아타기 파밍 방어. 공유 IP(회사·통신사 NAT) 오탐을
 *  피하려고 여유 있게 3회(지급만 제한 — 가입·이용 자체는 막지 않음). */
const SIGNUP_GRANTS_PER_IP_PER_DAY = 3;

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

export async function getOrCreateBalance(email: string, ip?: string | null): Promise<number> {
  const normKey = `signup:${normalizeEmailForGrant(email)}`;
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
        if (rows.length) return (rows[0] as { balance: number }).balance;
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
    }
    return grant;
  }
  const rows = await sql`SELECT balance FROM credits WHERE user_email = ${email}`;
  return (rows[0] as { balance: number } | undefined)?.balance ?? 0;
}
