import { neon } from '@neondatabase/serverless';

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
export const SIGNUP_GRANT = 30;

/** 상세페이지 1회 생성 비용 — ★서버 권위값(클라가 보내는 금액을 신뢰하지 않는다 = 조작 방지). */
export const GENERATION_COST = 10;

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

/**
 * 유저 잔액 조회. row 없으면 30 지급(grant) + ledger 기록 후 30 반환(신규 지급).
 * ON CONFLICT DO NOTHING으로 동시요청에도 중복 지급 안 됨(멱등).
 */
export async function getOrCreateBalance(email: string): Promise<number> {
  const inserted = await sql`
    INSERT INTO credits (user_email, balance) VALUES (${email}, ${SIGNUP_GRANT})
    ON CONFLICT (user_email) DO NOTHING
    RETURNING balance`;
  if (inserted.length > 0) {
    await sql`
      INSERT INTO credit_ledger (user_email, amount, type, reason)
      VALUES (${email}, ${SIGNUP_GRANT}, 'grant', 'signup')`;
    return SIGNUP_GRANT;
  }
  const rows = await sql`SELECT balance FROM credits WHERE user_email = ${email}`;
  return (rows[0] as { balance: number } | undefined)?.balance ?? 0;
}
