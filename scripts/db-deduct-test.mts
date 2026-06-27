/**
 * 크레딧 3단계 차감 검증 (0원, DB만) — 사고 시나리오 빡세게.
 *   정상 / 이중차감 / 잔액부족 / 마이너스 / ★동시요청.
 * 실행: npx --yes tsx scripts/db-deduct-test.mts
 */
import { readFileSync } from 'node:fs';
const env = readFileSync('.env.local', 'utf8');
for (const line of env.split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
}

const { ensureCreditTables, getOrCreateBalance, deductCreditsAtomic, sql, GENERATION_COST } = await import('../lib/db');
const C = GENERATION_COST; // 10
let pass = true;
const chk = (label: string, ok: boolean, detail = '') => { if (!ok) pass = false; console.log(`  ${ok ? '✅' : '❌'} ${label}${detail ? ' — ' + detail : ''}`); };

console.log('0) 마이그레이션(idempotency_key 컬럼/UNIQUE)...');
await ensureCreditTables();
const col = await sql`SELECT column_name FROM information_schema.columns WHERE table_name='credit_ledger' AND column_name='idempotency_key'`;
chk('credit_ledger.idempotency_key 존재', col.length === 1);

const u = `deduct+${Date.now()}@example.com`;
console.log(`\n테스트 유저: ${u} (신규 30)`);
await getOrCreateBalance(u);

console.log('\n1) 정상 차감');
const r1 = await deductCreditsAtomic(u, C, 'keyA');
chk('차감 → deducted, 잔액 20', r1.status === 'deducted' && r1.balance === 30 - C, `status=${r1.status} bal=${r1.balance}`);

console.log('\n2) ★이중차감 — 같은 키 재호출');
const r2 = await deductCreditsAtomic(u, C, 'keyA');
chk('같은 키 → duplicate, 잔액 그대로 20(재차감 X)', r2.status === 'duplicate' && r2.balance === 30 - C, `status=${r2.status} bal=${r2.balance}`);

console.log('\n3) 잔액 소진 + 부족');
const r3 = await deductCreditsAtomic(u, C, 'keyB'); // 20→10
const r4 = await deductCreditsAtomic(u, C, 'keyC'); // 10→0
const r5 = await deductCreditsAtomic(u, C, 'keyD'); // 0 → 부족
chk('keyB → 10', r3.status === 'deducted' && r3.balance === 10);
chk('keyC → 0', r4.status === 'deducted' && r4.balance === 0);
chk('★keyD 잔액0 → insufficient, 차감 0, 마이너스 없음', r5.status === 'insufficient' && r5.balance === 0, `status=${r5.status} bal=${r5.balance}`);

console.log('\n4) ledger 무결성');
const led = await sql`SELECT type, count(*)::int AS n FROM credit_ledger WHERE user_email=${u} GROUP BY type ORDER BY type`;
const ledMap = Object.fromEntries(led.map(x => [String(x.type), Number(x.n)]));
chk('deduct 행 정확히 3건(keyA,B,C — 이중/부족은 기록 안 됨)', ledMap.deduct === 3, JSON.stringify(ledMap));

console.log('\n5) ★동시요청 — 잔액 10에서 두 차감 동시(다른 키)');
const cu = `concur+${Date.now()}@example.com`;
await getOrCreateBalance(cu);
await sql`UPDATE credits SET balance = 10 WHERE user_email = ${cu}`; // 정확히 10으로
const [a, b] = await Promise.all([
  deductCreditsAtomic(cu, C, 'concurE'),
  deductCreditsAtomic(cu, C, 'concurF'),
]);
const okCount = [a, b].filter(x => x.status === 'deducted').length;
const insCount = [a, b].filter(x => x.status === 'insufficient').length;
const finalBal = (await sql`SELECT balance FROM credits WHERE user_email=${cu}`)[0].balance;
const concDeduct = (await sql`SELECT count(*)::int AS n FROM credit_ledger WHERE user_email=${cu} AND type='deduct'`)[0].n;
chk('★정확히 1건만 성공(나머지 부족)', okCount === 1 && insCount === 1, `deducted=${okCount} insufficient=${insCount}`);
chk('★최종 잔액 0 (마이너스/이중차감 없음)', Number(finalBal) === 0, `bal=${finalBal}`);
chk('★deduct ledger 1건만', Number(concDeduct) === 1, `n=${concDeduct}`);

console.log('\n6) 정리...');
await sql`DELETE FROM credit_ledger WHERE user_email IN (${u}, ${cu})`;
await sql`DELETE FROM credits WHERE user_email IN (${u}, ${cu})`;

console.log(`\n${pass ? '✅ 전체 PASS — 이중차감/부족/마이너스/동시 전부 안전' : '❌ 일부 실패'}`);
process.exit(pass ? 0 : 1);
