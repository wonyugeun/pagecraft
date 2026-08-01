/**
 * 다운로드 게이트 검증(2026-08-01) — 서버가 정말로 막는지.
 * 예전 게이트는 브라우저 안에만 있어서 개발자도구로 뚫렸다. 이제 서버가 판정한다.
 * 실행: npx --yes tsx scripts/export-gate-test.mts
 */
import fs from 'node:fs';
import { encode } from 'next-auth/jwt';
for (const l of fs.readFileSync('.env.local','utf8').split('\n')) {
  const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) process.env[m[1]] ??= m[2].replace(/^["']|["']$/g,'');
}
const BASE = 'http://localhost:3000';
const { sql } = await import('../lib/db');

const body = {
  sections: [{ num: '1', name: '히어로', headline: '테스트', body: '본문', blocks: [] }],
  meta: 'test', productName: '게이트테스트', isSlide: false,
  sectionImages: {}, blockImages: {}, blockAspects: {},
};
const call = async (cookie?: string) => {
  const res = await fetch(`${BASE}/api/export/html`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
    body: JSON.stringify(body),
  });
  return { status: res.status, text: (await res.text()).slice(0, 120) };
};
const token = async (email: string) =>
  `next-auth.session-token=${await encode({ token: { email, name: 'T' }, secret: process.env.NEXTAUTH_SECRET! })}`;

let pass = true;
const chk = (l: string, ok: boolean, d = '') => { if (!ok) pass = false; console.log(`  ${ok ? '✅' : '❌'} ${l}${d ? ' — ' + d : ''}`); };

console.log('다운로드 게이트 검증\n');

const r1 = await call();
chk('비로그인 → 401', r1.status === 401, `실제 ${r1.status}`);

const TRIAL = `gatetest-trial-${Date.now()}@flik.test`;
const r2 = await call(await token(TRIAL));
chk('체험 계정(결제 이력 없음) → 402 차단', r2.status === 402, `실제 ${r2.status} ${r2.text}`);

// 결제 이력을 심어 유료 계정으로 만든 뒤 재시도
const PAID = `gatetest-paid-${Date.now()}@flik.test`;
await sql`INSERT INTO credit_lots (user_email, amount, kind, plan_id, expires_at)
          VALUES (${PAID}, 20, 'purchase', 'light', now() + interval '30 days')`;
const r3 = await call(await token(PAID));
chk('유료 계정 → 200 + HTML 내려옴', r3.status === 200 && r3.text.includes('<!DOCTYPE html>'), `실제 ${r3.status}`);

await sql`DELETE FROM credit_lots WHERE user_email = ${PAID}`;
await sql`DELETE FROM download_events WHERE user_email = ${PAID}`;

console.log(pass ? '\n✅ 서버가 게이트를 강제한다 (테스트 데이터 정리 완료)' : '\n❌ 실패');
process.exit(pass ? 0 : 1);
