/** 후처리 그물 검증:
 *  A) Brix 미입력 단호박 → 미입력 20Brix·강분질·신품종 0건
 *  B) Brix 입력 단호박   → 입력한 Brix는 살아남아야(셀러 입력 막으면 실패) */
import { Agent, setGlobalDispatcher } from 'undici';
setGlobalDispatcher(new Agent({ headersTimeout: 0, bodyTimeout: 0 }));
const BASE = process.env.BASE_URL || 'http://localhost:3000';
const RISK = /(?:약|대략|최대|평균)?\s*\d+(?:\.\d+)?\s*(?:brix|브릭스)|당도\s*\d|강분질|신품종|개량품종/gi;

async function gen(extra) {
  const r = await (await fetch(`${BASE}/api/pipeline`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cat: '식품', ch: '스마트스토어', out: 'blog', depth: '간결', sectionCount: 8, generateImages: false,
      productName: '보우짱 밤호박 1kg', productExtra: extra.join('\n') }),
  })).json();
  if (r.error) throw new Error(r.error);
  return r.sections;
}
function scan(secs) {
  const blob = secs.map(s => `${s.headline} ${s.subcopy} ${s.body} ${JSON.stringify(s.blocks||[])}`).join('\n');
  return blob.match(RISK) || [];
}

// A: 미입력
console.log('[A] Brix 미입력');
const a = await gen(['브랜드: 보우짱', '판매가 11,900원', '국내산, 전자레인지 3분, 2개입, 포슬하고 달콤']);
const am = scan(a);
console.log(`  위험 매치: ${am.length === 0 ? '✓ 0건' : '✗ ' + am.join(', ')}`);

// B: 입력 (당도 20Brix) → 살아야
console.log('[B] Brix 입력(당도 20Brix)');
const b = await gen(['브랜드: 보우짱', '당도: 20Brix (당도 측정 완료)', '국내산, 2개입']);
const bblob = b.map(s => `${s.headline} ${s.subcopy} ${s.body} ${JSON.stringify(s.blocks||[])}`).join('\n');
const keptBrix = /20\s*brix|당도\s*20/i.test(bblob);
console.log(`  입력 20Brix 사용: ${keptBrix ? '✓ 살아있음(정상)' : '✗ 스크러버가 셀러 입력을 막음(실패)'}`);

console.log(`\n[결과] ${am.length === 0 && keptBrix ? '✓ 통과 — 미입력 차단 + 입력 보존' : '✗ 실패'}`);
process.exit(am.length === 0 && keptBrix ? 0 : 1);
