/**
 * DB 초기화·검증 (크레딧 1단계) — 테이블 생성 + getOrCreateBalance 동작 확인. 과금 0(DB만).
 * .env.local의 DATABASE_URL(또는 POSTGRES_URL) 필요.
 * 실행: npx --yes tsx scripts/db-init.mts
 */
import { readFileSync } from 'node:fs';
const env = readFileSync('.env.local', 'utf8');
for (const line of env.split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
}
if (!process.env.DATABASE_URL && !process.env.POSTGRES_URL) {
  console.error('❌ DATABASE_URL(또는 POSTGRES_URL) 없음 — .env.local에 Neon 연결 문자열을 추가하세요.');
  process.exit(1);
}

const { ensureCreditTables, getOrCreateBalance, sql, SIGNUP_GRANT } = await import('../lib/db');

console.log('1) 테이블 생성(IF NOT EXISTS)...');
await ensureCreditTables();
const tables = await sql`
  SELECT table_name FROM information_schema.tables
  WHERE table_schema='public' AND table_name IN ('credits','credit_ledger') ORDER BY table_name`;
console.log('   생성된 테이블:', tables.map(t => String(t.table_name)).join(', '));

console.log('\n2) 신규 유저 30 지급 + 멱등성 테스트...');
const testEmail = `diag+${Date.now()}@example.com`;
const b1 = await getOrCreateBalance(testEmail);   // 신규 → 30 + ledger grant
const b2 = await getOrCreateBalance(testEmail);   // 재조회 → 30, 재지급 X
const ledger = await sql`SELECT count(*)::int AS n FROM credit_ledger WHERE user_email=${testEmail}`;
const ledgerN = (ledger[0] as { n: number }).n;
console.log(`   1차 조회(신규): ${b1}  → ${b1 === SIGNUP_GRANT ? '✅ 30 지급' : '❌'}`);
console.log(`   2차 조회(기존): ${b2}  → ${b2 === SIGNUP_GRANT ? '✅ 동일(재지급 안 됨)' : '❌'}`);
console.log(`   ledger grant 행 수: ${ledgerN}  → ${ledgerN === 1 ? '✅ 정확히 1건(멱등)' : '❌ 중복 지급'}`);

console.log('\n3) 테스트 데이터 정리...');
await sql`DELETE FROM credits WHERE user_email=${testEmail}`;
await sql`DELETE FROM credit_ledger WHERE user_email=${testEmail}`;
console.log('   정리 완료.');

const pass = tables.length === 2 && b1 === SIGNUP_GRANT && b2 === SIGNUP_GRANT && ledgerN === 1;
console.log(`\n${pass ? '✅ DB 준비 완료 — 테이블·신규지급·멱등 전부 정상' : '❌ 일부 실패'}`);
