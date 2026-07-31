/**
 * credit_lots.payment_id 백필 — 컬럼 도입(2026-07-31) 전에 만들어진 구매 묶음을 결제와 연결한다.
 * 연결이 없으면 환불 시 '같은 플랜의 다른 묶음'을 무효화할 위험이 남는다.
 *
 * ★안전 규칙: 결제 시각 ±10분 안에 만들어진 같은 계정·같은 플랜 묶음이 '정확히 1건'일 때만 연결한다.
 *   후보가 0건이거나 2건 이상이면 사람이 판단할 문제라 손대지 않는다.
 * 실행: npx --yes tsx scripts/lot-payment-backfill.mts [--apply]
 */
import { readFileSync } from 'node:fs';
const env = readFileSync('.env.local', 'utf8');
for (const line of env.split('\n')) {
  const m = line.match(/^([A-Z_0-9]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
}

const { sql, ensureCreditTables } = await import('../lib/db');
await ensureCreditTables();

const doApply = process.argv.includes('--apply');

const orders = await sql`SELECT payment_id, user_email, plan_id, paid_at
                         FROM payment_orders WHERE status = 'paid' AND paid_at IS NOT NULL
                         ORDER BY paid_at` as unknown as
  Array<{ payment_id: string; user_email: string; plan_id: string; paid_at: string }>;

const report: Array<Record<string, unknown>> = [];

for (const o of orders) {
  const cands = await sql`
    SELECT id, amount, created_at FROM credit_lots
    WHERE user_email = ${o.user_email} AND kind = 'purchase' AND plan_id = ${o.plan_id}
      AND payment_id IS NULL
      AND created_at BETWEEN ${o.paid_at}::timestamptz - interval '10 minutes'
                         AND ${o.paid_at}::timestamptz + interval '10 minutes'` as unknown as
    Array<{ id: string; amount: number }>;

  if (cands.length === 1) {
    if (doApply) {
      await sql`UPDATE credit_lots SET payment_id = ${o.payment_id}
                WHERE id = ${cands[0].id} AND payment_id IS NULL`;
    }
    report.push({ 결제ID: o.payment_id, 묶음: cands[0].id, 수량: cands[0].amount, 조치: doApply ? '연결함' : '연결 예정' });
  } else {
    report.push({ 결제ID: o.payment_id, 묶음: '-', 수량: '-', 조치: cands.length === 0 ? '후보 없음(이미 연결됨)' : `후보 ${cands.length}건 — 수동 확인` });
  }
}

console.log(doApply ? '=== 백필 실행 ===' : '=== 백필 예정(미실행) ===');
console.table(report);
process.exit(0);
