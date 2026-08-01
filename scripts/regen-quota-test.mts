/**
 * 재생성 통합 쿼터 검증(2026-08-01) — 카피·이미지가 무료 5회를 나눠 쓰는지.
 *
 * ★확인할 것:
 *   1) 첫 생성은 공용 통을 안 건드린다 — 섹션당 이미지 1장은 생성 비용에 포함된 몫이다.
 *      (분리하지 않으면 카피를 먼저 다시 뽑았을 때 아직 안 만든 섹션이 유료가 된다)
 *   2) 카피와 이미지가 같은 통을 쓴다 — 카피 3회 + 이미지 2회 = 5회로 소진.
 *   3) 고품질 이미지는 2를 먹는다(원가 4배 반영).
 *   4) 소진 후엔 더 못 쓴다.
 *
 * DB의 usage_counters를 직접 쓰므로 테스트 후 정리한다.
 * 실행: npx --yes tsx scripts/regen-quota-test.mts
 */
import fs from 'node:fs';
for (const l of fs.readFileSync('.env.local', 'utf8').split('\n')) {
  const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) process.env[m[1]] ??= m[2].replace(/^["']|["']$/g, '');
}
const { consumeUsageQuota, sql } = await import('../lib/db');
const { calculateFreeRegenQuota, imageQuotaWeight } = await import('../lib/pricing');

const JOB = `quotatest-${Date.now()}`;
const SECTIONS = 8;
const FREE = calculateFreeRegenQuota(SECTIONS);

let pass = true;
const chk = (label: string, ok: boolean, detail = '') => {
  if (!ok) pass = false;
  console.log(`  ${ok ? '✅' : '❌'} ${label}${detail ? ' — ' + detail : ''}`);
};

/** 이미지 1장 생성 시도 — 라우트와 동일한 순서(첫 장 우선, 아니면 공용 통) */
async function image(sectionNum: string, quality = 'medium') {
  const first = await consumeUsageQuota(`imgfirst:${JOB}:${sectionNum}`, 1, 1);
  if (first.allowed) return { free: true, viaFirst: true, used: 0 };
  const w = imageQuotaWeight(quality);
  const q = await consumeUsageQuota(`freeregen:${JOB}`, w, FREE);
  return { free: q.allowed, viaFirst: false, used: q.used };
}
/** 카피 재생성 1회 시도 */
async function copy() {
  const q = await consumeUsageQuota(`freeregen:${JOB}`, 1, FREE);
  return { free: q.allowed, used: q.used };
}

console.log(`재생성 통합 검증 — ${SECTIONS}섹션 · 무료 ${FREE}회\n`);

console.log('1) 첫 생성 8장은 공용 통을 안 건드린다');
for (let i = 1; i <= SECTIONS; i++) {
  const r = await image(String(i));
  if (!r.viaFirst || !r.free) { chk(`섹션 ${i} 첫 장 무료`, false, JSON.stringify(r)); break; }
}
{
  const rows = await sql`SELECT count FROM usage_counters WHERE scope_key = ${`freeregen:${JOB}`}`;
  chk('첫 생성 8장 후 공용 통 사용 0', rows.length === 0, `실제 ${(rows[0] as { count?: number } | undefined)?.count ?? 0}`);
}

console.log('\n2) 카피 3회 + 이미지 2회 = 5회로 정확히 소진');
for (let i = 1; i <= 3; i++) chk(`카피 재생성 ${i}회차 무료`, (await copy()).free);
chk('이미지 재생성 1회차 무료', (await image('1')).free);
chk('이미지 재생성 2회차 무료', (await image('2')).free);

console.log('\n3) 6회차부터는 유료(무료 통 소진)');
chk('카피 6회차 → 무료 아님', !(await copy()).free);
chk('이미지 6회차 → 무료 아님', !(await image('3')).free);

console.log('\n4) 고품질 이미지는 2를 먹는다');
const JOB2 = `${JOB}-hq`;
{
  await consumeUsageQuota(`imgfirst:${JOB2}:1`, 1, 1);          // 첫 장 소모
  const w = imageQuotaWeight('high');
  chk('high 가중치 2', w === 2);
  const a = await consumeUsageQuota(`freeregen:${JOB2}`, w, FREE);
  const b = await consumeUsageQuota(`freeregen:${JOB2}`, w, FREE);
  const c = await consumeUsageQuota(`freeregen:${JOB2}`, w, FREE);
  chk('high 2회(=4)까지 통과', a.allowed && b.allowed, `used=${b.used}`);
  chk('high 3회(=6)는 초과 거부', !c.allowed);
}

console.log('\n5) 섹션 수에 비례');
for (const [n, want] of [[8, 5], [16, 10], [32, 20], [1, 0]] as const) {
  chk(`${n}섹션 → 무료 ${want}회`, calculateFreeRegenQuota(n) === want, `실제 ${calculateFreeRegenQuota(n)}`);
}

await sql`DELETE FROM usage_counters WHERE scope_key LIKE ${`%${JOB}%`}`;
console.log(pass ? '\n✅ 전부 통과 (테스트 카운터 정리 완료)' : '\n❌ 실패 있음');
process.exit(pass ? 0 : 1);
