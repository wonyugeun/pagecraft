/** 요금제 개편 검증 — 크레딧 계산·플랜 수량·체험 한도가 의도대로인지. 실행: npx tsx scripts/pricing-verify.mts */
import fs from 'node:fs';
for (const l of fs.readFileSync('.env.local','utf8').split('\n')) {
  const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) process.env[m[1]] ??= m[2].replace(/^["']|["']$/g,'');
}
const { calculateGenerationCost, creditPerSection, TRIAL_MAX_SECTIONS, clampSectionsForTrial } = await import('../lib/pricing');
const { PLANS, currentPrice, pricePerCredit, pagesPerPlan, CREDIT_UNIT_NOTE } = await import('../data/plans');
const { SIGNUP_GRANT } = await import('../lib/db');

let pass = true;
const chk = (label: string, ok: boolean, detail = '') => { if (!ok) pass = false; console.log(`  ${ok ? '✅' : '❌'} ${label}${detail ? ' — ' + detail : ''}`); };

console.log('1) 출력형태별 섹션 단가');
chk('블로그 1.25', creditPerSection('blog') === 1.25);
chk('슬라이드 1.0', creditPerSection('slide') === 1);
chk('미지정 1.0(썸네일·빠른제작)', creditPerSection(undefined) === 1);

console.log('\n2) 생성 비용 — 블로그형(올림)');
for (const [n, want] of [[8, 10], [10, 13], [12, 15], [16, 20], [24, 30]] as const) {
  const got = calculateGenerationCost({ sectionCount: n, out: 'blog' });
  chk(`${n}섹션 → ${want}크레딧`, got === want, `실제 ${got}`);
}
console.log('\n3) 생성 비용 — 슬라이드형');
for (const [n, want] of [[8, 8], [10, 10], [16, 16]] as const) {
  const got = calculateGenerationCost({ sectionCount: n, out: 'slide' });
  chk(`${n}섹션 → ${want}크레딧`, got === want, `실제 ${got}`);
}
console.log('\n4) 단건 경로는 그대로 1크레딧');
chk('썸네일/빠른제작 1섹션 = 1', calculateGenerationCost({ sectionCount: 1 }) === 1);

console.log('\n5) 체험 계정 — 가입 지급 ' + SIGNUP_GRANT + '크레딧');
const blog8 = calculateGenerationCost({ sectionCount: 8, out: 'blog' });
const slide10 = calculateGenerationCost({ sectionCount: 10, out: 'slide' });
chk(`블로그 8섹션(${blog8}) 가능`, blog8 <= SIGNUP_GRANT);
chk(`블로그 10섹션(${calculateGenerationCost({ sectionCount: 10, out: 'blog' })}) 불가 — 의도대로`, calculateGenerationCost({ sectionCount: 10, out: 'blog' }) > SIGNUP_GRANT);
chk(`슬라이드 10섹션(${slide10}) 가능`, slide10 <= SIGNUP_GRANT);
chk(`체험 섹션 상한 ${TRIAL_MAX_SECTIONS}`, clampSectionsForTrial(16, false) === TRIAL_MAX_SECTIONS);
chk('유료는 clamp 없음', clampSectionsForTrial(16, true) === 16);

console.log('\n6) 플랜 — ' + CREDIT_UNIT_NOTE);
console.log(`  ${'플랜'.padEnd(10)}${'특가'.padStart(9)}${'정가'.padStart(9)}${'크레딧'.padStart(7)}${'단가'.padStart(7)}${'블로그'.padStart(8)}${'슬라이드'.padStart(9)}`);
const base = currentPrice(PLANS[0]) / PLANS[0].credits;
for (const p of PLANS) {
  const u = pricePerCredit(p);
  const disc = (1 - u / base) * 100;
  console.log(`  ${p.nameEn.padEnd(10)}${currentPrice(p).toLocaleString().padStart(8)}원${p.listPrice.toLocaleString().padStart(8)}원${String(p.credits).padStart(7)}${String(u).padStart(6)}원${(pagesPerPlan(p) + '장').padStart(8)}${((p.credits / 8).toFixed(1) + '장').padStart(9)}  할인 ${disc.toFixed(0)}%`);
}
const units = PLANS.map(p => pricePerCredit(p));
chk('단가가 계단식으로 내려간다(역전 없음)', units.every((u, i) => i === 0 || u < units[i - 1]), units.join(' > '));

console.log(pass ? '\n✅ 전부 통과' : '\n❌ 실패 있음');
process.exit(pass ? 0 : 1);
