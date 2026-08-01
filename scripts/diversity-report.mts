/**
 * 다양성 테스트 결과 분석 — 렌더된 페이지를 눈으로 보기 전에 숫자로 먼저 훑는다(2026-08-01).
 *
 * ★확인 항목(이번 런에서 바뀐 것들이 실제로 먹혔는지):
 *   1) 비율 — 모델이 장면 보고 다양하게 고르는가. 한 값에 쏠리면 구조 개편이 실패한 것.
 *   2) 날조 — salesMode를 켠 채로 정보량이 적은 상품에서도 버티는가.
 *   3) 카피 리듬 — 히어로가 짧고 설득형이 긴가(분량 차등이 실제로 벌어졌는가).
 *   4) 킬러 라인 — 페이지당 정확히 1곳인가(균등 강조로 돌아가지 않았는가).
 *   5) 콜라주 — 여전히 우연에 맡겨져 있는가.
 *
 * 실행: npx --yes tsx scripts/diversity-report.mts [결과폴더=runs/diversity]
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const DIR = path.join(ROOT, process.argv[2] ?? 'runs/diversity');

interface Sec {
  num: string; name: string; headline: string; subcopy?: string; body?: string;
  blocks?: Array<{ type: string }>; imageBrief?: { prompt?: string; ratio?: string };
}
interface Raw { product: { key: string; cat: string; density: string; productName: string; fields: string[] }; sections: Sec[] }

/** 상품 고유의 구체 주장 — 일반 표현은 넣지 않는다(전부 빨개지면 신호가 죽는다) */
const SUSPECT = /(설계했|공정|특허|임상시험|테스트를 거|직접 입어|직접 써봤|자연광 컷|실내조명 컷|드롭숄더|수십 번|장인이|숙련된)/g;

if (!fs.existsSync(DIR)) { console.error('결과 폴더 없음:', DIR); process.exit(1); }
const dirs = fs.readdirSync(DIR).filter(d => fs.existsSync(path.join(DIR, d, 'raw.json'))).sort();
if (!dirs.length) { console.error('완료된 상품 없음'); process.exit(1); }

const GLYPH: Record<string, string> = { '4:5': '▮', '16:9': '▬', '1:1': '■' };
const allRatios: string[] = [];
let totalFab = 0;

console.log(`다양성 테스트 분석 — ${dirs.length}개 상품\n`);

for (const d of dirs) {
  const raw = JSON.parse(fs.readFileSync(path.join(DIR, d, 'raw.json'), 'utf8')) as Raw;
  const p = raw.product;
  const src = [p.productName, ...p.fields].join(' ');
  const secs = raw.sections;

  const ratios = secs.map(s => s.imageBrief?.ratio ?? '?');
  allRatios.push(...ratios);
  const rdist = ratios.reduce<Record<string, number>>((a, r) => { a[r] = (a[r] ?? 0) + 1; return a; }, {});

  const lens = secs.map(s => (s.body ?? '').length);
  const killers = secs.filter(s => /\(\([\s\S]+?\)\)/.test(s.body ?? '')).length;
  const collage = secs.filter(s => /collage|three-panel|split[- ]screen|triptych/i.test(s.imageBrief?.prompt ?? '')).length;

  const text = secs.map(s => `${s.headline}${s.subcopy ?? ''}${s.body ?? ''}`).join(' ');
  const fabs = [...new Set([...text.matchAll(SUSPECT)].map(m => m[0]).filter(w => !src.includes(w)))];
  totalFab += fabs.length;

  // 이미지 실제 생성 수
  const files = fs.readdirSync(path.join(DIR, d)).filter(f => /^sec\d+.*\.png$/.test(f)).length;
  const errs = fs.readdirSync(path.join(DIR, d)).filter(f => f.endsWith('.error.txt')).length;

  console.log(`■ ${p.key}  (${p.cat} · 정보량 ${p.density} · 입력 ${p.fields.length}항목)`);
  console.log(`   비율   ${ratios.map(r => GLYPH[r] ?? '?').join(' ')}   ${JSON.stringify(rdist)}`);
  console.log(`   카피   히어로 ${lens[0]}자 · 최대 ${Math.max(...lens)}자 · 편차 ${Math.max(...lens) - Math.min(...lens)}`);
  console.log(`   강조   킬러라인 ${killers}곳 ${killers === 1 ? '✅' : '⚠️'}   콜라주 ${collage}곳`);
  console.log(`   이미지 ${files}장 생성${errs ? ` · 실패 ${errs}건 ⚠️` : ''}`);
  console.log(`   날조   ${fabs.length === 0 ? '0건 ✅' : `${fabs.length}건 ⚠️ ${JSON.stringify(fabs)}`}`);
  console.log(`   히어로 ${secs[0].headline}`);
  const kl = secs.flatMap(s => [...(s.body ?? '').matchAll(/\(\((.+?)\)\)/g)].map(m => m[1]));
  if (kl.length) console.log(`   킬러   ${kl.join(' / ')}`);
  console.log();
}

/* ── 전체 판정 ── */
const dist = allRatios.reduce<Record<string, number>>((a, r) => { a[r] = (a[r] ?? 0) + 1; return a; }, {});
const kinds = Object.keys(dist).filter(k => k !== '?').length;
const top = Math.max(...Object.values(dist));
const skew = top / allRatios.length;

console.log('══ 전체 판정 ══');
console.log(`  비율 분포 ${JSON.stringify(dist)} — ${kinds}종 사용, 최다 비중 ${(skew * 100).toFixed(0)}%`);
console.log(`  ${kinds >= 2 && skew < 0.75
  ? '  ✅ 모델이 장면에 따라 다양하게 고르고 있다'
  : '  ⚠️ 한 비율에 쏠림 — 모델이 사실상 기본값만 쓰고 있을 수 있다'}`);
console.log(`  날조 총 ${totalFab}건 ${totalFab === 0 ? '✅' : '⚠️'}`);
console.log(`\n페이지 보기: npx --yes tsx scripts/diversity-render.mts && open runs/diversity/index.html`);
