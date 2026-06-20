/** 단호박(보우짱) Brix 미입력 새 생성 → 셀러 미입력 20Brix·강분질·신품종 누수 재현 진단.
 * 모든 섹션 headline/subcopy/body + 블록(stats/iconcards 등) 전수 스캔. */
import { Agent, setGlobalDispatcher } from 'undici';
import { writeFileSync } from 'node:fs';
setGlobalDispatcher(new Agent({ headersTimeout: 0, bodyTimeout: 0 }));
const BASE = process.env.BASE_URL || 'http://localhost:3000';

const r = await (await fetch(`${BASE}/api/pipeline`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    cat: '식품', ch: '스마트스토어', out: 'blog', depth: '간결', sectionCount: 10, generateImages: false,
    productName: '보우짱 밤호박 1kg',
    productExtra: ['브랜드: 보우짱', '정가 15,900원 / 판매가 11,900원', '국내산 밤호박, 전자레인지 3분 간편 조리', '2개입, 달콤하고 포슬한 식감'].join('\n'),
  }),
})).json();
if (r.error) { console.log('생성 실패:', r.error); process.exit(1); }
writeFileSync('_prototype_out/brix-diag.json', JSON.stringify(r.sections, null, 2));

const RISK = /(?:당도\s*)?(?:약|대략|최대|최소|평균)?\s*\d+(?:\.\d+)?\s*(?:brix|브릭스)|당도\s*\d|강분질|신품종|개량품종/gi;
console.log(`생성 ${r.sections.length}섹션. 전수 스캔(블록 포함):`);
let total = 0;
r.sections.forEach((s, i) => {
  const fields = { headline: s.headline, subcopy: s.subcopy, body: s.body };
  for (const [k, v] of Object.entries(fields)) {
    const m = (v || '').match(RISK);
    if (m) { console.log(`  [${s.name}] ${k}: ${m.join(', ')}`); total += m.length; }
  }
  (s.blocks || []).forEach(b => {
    const blob = JSON.stringify(b);
    const m = blob.match(RISK);
    if (m) { console.log(`  [${s.name}] block(${b.type}): ${m.join(', ')} | ${blob.slice(0, 120)}`); total += m.length; }
  });
});
console.log(`\n[결과] 위험 매치 ${total}건 ${total === 0 ? '✓ 누수 없음(옛 저장본이었을 가능성)' : '⚠️ 라이브 누수 — 가드/후처리 필요'}`);
