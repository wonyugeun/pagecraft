/**
 * 환불 크레딧 회수 검증 (0원, DB만) — 웹훅/대사가 부르는 revokeRefundedCredits의 안전장치 확인.
 *   같은 플랜 2회 구매 시 묶음 오인 / 미지급 주문 회수 차단 / 멱등성.
 * 실행: npx --yes tsx scripts/refund-revoke-test.mts
 */
import { readFileSync } from 'node:fs';
const env = readFileSync('.env.local', 'utf8');
for (const line of env.split('\n')) {
  const m = line.match(/^([A-Z_0-9]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
}

const { ensureCreditTables, createPaymentOrder, settlePaidOrder, revokeRefundedCredits, sql } =
  await import('../lib/db');

const EMAIL = 'revoketest@flik.test';
const A = 'flikREVOKETESTAAAA', B = 'flikREVOKETESTBBBB', C = 'flikREVOKETESTCCCC';

let pass = true;
const chk = (label: string, ok: boolean, detail = '') => {
  if (!ok) pass = false;
  console.log(`  ${ok ? '✅' : '❌'} ${label}${detail ? ' — ' + detail : ''}`);
};
const balance = async () => {
  const r = await sql`SELECT balance FROM credits WHERE user_email = ${EMAIL}`;
  return Number((r[0] as { balance?: number } | undefined)?.balance ?? 0);
};
const lots = async () => await sql`SELECT payment_id, amount, swept_at FROM credit_lots
                                   WHERE user_email = ${EMAIL} ORDER BY id` as unknown as
  Array<{ payment_id: string | null; amount: number; swept_at: string | null }>;

const cleanup = async () => {
  await sql`DELETE FROM credit_lots    WHERE user_email = ${EMAIL}`;
  await sql`DELETE FROM credit_ledger  WHERE user_email = ${EMAIL}`;
  await sql`DELETE FROM credits        WHERE user_email = ${EMAIL}`;
  await sql`DELETE FROM payment_orders WHERE user_email = ${EMAIL}`;
};

await ensureCreditTables();
await cleanup();

console.log('0) 준비 — 같은 플랜(light)을 두 번 구매');
await createPaymentOrder({ paymentId: A, email: EMAIL, planId: 'light', amount: 9900, credits: 20, validMonths: 1 });
await createPaymentOrder({ paymentId: B, email: EMAIL, planId: 'light', amount: 9900, credits: 20, validMonths: 1 });
await settlePaidOrder(A);
await settlePaidOrder(B);
chk('잔액 40', await balance() === 40, `실제 ${await balance()}`);
{
  const l = await lots();
  chk('묶음 2개, payment_id 각각 연결', l.length === 2 && l[0].payment_id === A && l[1].payment_id === B,
      JSON.stringify(l.map(x => x.payment_id)));
}

console.log('1) A만 환불 — B의 묶음은 살아있어야 함(같은 플랜 오인 방지)');
{
  const r = await revokeRefundedCredits(A);
  chk('revoked=true', r.revoked === true);
  chk('잔액 20', r.balance === 20, `실제 ${r.balance}`);
  const l = await lots();
  const a = l.find(x => x.payment_id === A), b = l.find(x => x.payment_id === B);
  chk('A 묶음 무효화됨', a?.swept_at !== null);
  chk('★B 묶음은 그대로', b?.swept_at === null, b?.swept_at ? `잘못 무효화됨: ${b.swept_at}` : '');
  const o = await sql`SELECT status FROM payment_orders WHERE payment_id = ${A}`;
  chk("주문 상태 refunded", (o[0] as { status: string }).status === 'refunded');
}

console.log('2) A 재환불 — 멱등(중복 회수 금지)');
{
  const r = await revokeRefundedCredits(A);
  chk('revoked=false', r.revoked === false);
  chk('잔액 그대로 20', r.balance === 20, `실제 ${r.balance}`);
}

console.log('3) ★미지급 주문(pending) 취소 — 주지도 않은 크레딧을 뺏으면 안 됨');
await createPaymentOrder({ paymentId: C, email: EMAIL, planId: 'light', amount: 9900, credits: 20, validMonths: 1 });
{
  const before = await balance();
  const r = await revokeRefundedCredits(C);
  chk('revoked=false', r.revoked === false);
  chk('잔액 불변', r.balance === before, `${before} → ${r.balance}`);
  const o = await sql`SELECT status FROM payment_orders WHERE payment_id = ${C}`;
  chk("주문 상태 pending 유지", (o[0] as { status: string }).status === 'pending');
}

console.log('4) 이미 쓴 크레딧보다 큰 회수 — 잔액이 음수로 가면 안 됨');
{
  await sql`UPDATE credits SET balance = 5 WHERE user_email = ${EMAIL}`;   // B분 20 중 15 소비 가정
  const r = await revokeRefundedCredits(B);
  chk('revoked=true', r.revoked === true);
  chk('잔액 0에서 멈춤', r.balance === 0, `실제 ${r.balance}`);
}

console.log('5) 원장 정합성 — 지급/회수가 모두 기록됐는가');
{
  const led = await sql`SELECT type, amount, idempotency_key FROM credit_ledger
                        WHERE user_email = ${EMAIL} ORDER BY id` as unknown as
    Array<{ type: string; amount: number; idempotency_key: string }>;
  const grants = led.filter(x => x.type === 'grant').length;
  const refunds = led.filter(x => x.type === 'refund').length;
  chk('지급 2건 / 회수 2건', grants === 2 && refunds === 2, `grant=${grants} refund=${refunds}`);
  chk('회수 멱등키 중복 없음', new Set(led.map(x => x.idempotency_key)).size === led.length);
}

await cleanup();
console.log(pass ? '\n✅ 전부 통과 (테스트 데이터 정리 완료)' : '\n❌ 실패 있음');
process.exit(pass ? 0 : 1);
