/**
 * 판정용 1회 조립 스크립트 — 검증 끝난 Stage1~4 프로토타입 중 strategy→structure→copy 순차 호출.
 * 이미지브리프·Gemini는 제외(무과금, 카피·구조 품질 판정 집중).
 * 기존 generate/recommend-sections 파이프라인은 일절 건드리지 않음. 조립만.
 *
 * 사용: dev 서버(next dev, localhost:3000)가 떠 있는 상태에서  node scripts/assemble-onepage.mjs
 * 출력: _prototype_out/onepage-judge.html (완성 카피 한 장) + onepage-judge.json (전략/구조/카피 원본)
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const OUT_DIR = join(process.cwd(), '_prototype_out');
mkdirSync(OUT_DIR, { recursive: true });

// ── 입력 (리프그린 시카토너, 화장품/스마트스토어/블로그형/간결16) ──────────────
const cat = '화장품';
const ch = '스마트스토어';
const depth = '간결';
const sectionCount = 16;
const productName = '리프그린 시카 진정 토너 250ml';

const productExtra = [
  '브랜드명: 리프그린(LEAFGREEN)',
  '정가: 28,000원',
  '판매가: 19,900원',
  '할인율: 29%',
  '가격 표시 여부: 상세페이지에 표시',
  '옵션: 250ml 단품 / 1+1 / 2개+패드',
  '[주요 성분]: 히알루론산, 병풀(센텔라), 판테놀',
  '[인증 및 특징]: 무향, 무색소, 피부과 테스트 완료',
  '경쟁 차별점: 제주산 병풀 함유, 무향·무색소 저자극, 끈적임 없는 워터리 제형, 250ml 대용량',
  '기타 추가 정보: 워터리 제형으로 끈적임 없이 흡수, 세안 후 화장솜 또는 손으로 아침저녁 도포, 250ml 대용량(약 2~3개월 사용), 제조국 대한민국, 유통기한 제조일로부터 24개월·개봉 후 12개월',
  '기타 요청사항: 20~30대 민감성 피부·직장인 여성 타겟, 자극 없이 매일 쓰는 진정 토너 컨셉, 신뢰감 있되 친근한 톤',
].join('\n');

async function call(path, body) {
  const t0 = Date.now();
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const ms = Date.now() - t0;
  const json = await res.json();
  if (!res.ok || json.error) {
    throw new Error(`[${path}] HTTP ${res.status} (${ms}ms): ${json.error || JSON.stringify(json).slice(0, 300)}`);
  }
  console.log(`✓ ${path} — ${ms}ms`);
  return json;
}

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function buildHtml({ strategy, structure, copy }) {
  const dna = strategy.dna || {};
  const strat = strategy.strategy || {};
  const plan = structure.sections || [];
  const secs = copy.sections || [];

  const dnaRows = Object.entries(dna).map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`).join('');
  const stratRows = Object.entries(strat).map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`).join('');
  const planRows = plan.map((s, i) => `<tr><td>${i + 1}</td><td><b>${esc(s.name)}</b></td><td>${esc(s.role)}</td><td>${esc(s.mission)}</td></tr>`).join('');

  const sections = secs.map((s, i) => `
    <section class="sec">
      <div class="sec-num">${String(i + 1).padStart(2, '0')}</div>
      <div class="sec-body">
        <div class="sec-name">${esc(s.name)}</div>
        <h2 class="sec-headline">${esc(s.headline)}</h2>
        ${s.subcopy ? `<p class="sec-subcopy">${esc(s.subcopy)}</p>` : ''}
        <div class="sec-img">[이미지: ${esc(plan[i]?.role || s.name || 'shot')}]</div>
        ${s.body ? `<p class="sec-text">${esc(s.body).replace(/\n/g, '<br>')}</p>` : ''}
      </div>
    </section>`).join('');

  return `<!DOCTYPE html>
<html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>리프그린 시카 토너 — 새 엔진 완성본 (판정용)</title>
<style>
  * { box-sizing: border-box; }
  body { margin: 0; font-family: 'Pretendard', -apple-system, system-ui, sans-serif; color: #1a1a1a; background: #f4f4f6; line-height: 1.65; }
  .wrap { max-width: 760px; margin: 0 auto; padding: 32px 16px 80px; }
  .meta-card { background: #fff; border-radius: 14px; padding: 20px 24px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,.06); }
  .meta-card h3 { margin: 0 0 12px; font-size: 14px; letter-spacing: .04em; color: #6D4CFF; text-transform: uppercase; }
  table { width: 100%; border-collapse: collapse; font-size: 14px; }
  th, td { text-align: left; padding: 7px 10px; vertical-align: top; border-bottom: 1px solid #f0f0f3; }
  th { white-space: nowrap; color: #555; font-weight: 600; width: 140px; }
  .plan th { color: #555; }
  .plan td:first-child { width: 28px; color: #999; }
  .banner { background: linear-gradient(135deg,#6D4CFF,#9b7bff); color: #fff; border-radius: 14px; padding: 22px 24px; margin-bottom: 24px; }
  .banner h1 { margin: 0 0 4px; font-size: 20px; }
  .banner p { margin: 0; opacity: .9; font-size: 13px; }
  .page { background: #fff; border-radius: 14px; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,.07); }
  .sec { display: flex; gap: 14px; padding: 26px 24px; border-bottom: 1px solid #f2f2f4; }
  .sec:last-child { border-bottom: 0; }
  .sec-num { font-size: 12px; font-weight: 800; color: #c9c2ee; min-width: 26px; padding-top: 4px; }
  .sec-body { flex: 1; min-width: 0; }
  .sec-name { font-size: 11px; font-weight: 700; color: #6D4CFF; letter-spacing: .03em; margin-bottom: 6px; }
  .sec-headline { margin: 0 0 6px; font-size: 21px; line-height: 1.35; }
  .sec-subcopy { margin: 0 0 12px; font-size: 15px; color: #6b6b72; font-weight: 500; }
  .sec-img { background: repeating-linear-gradient(45deg,#f7f7fa,#f7f7fa 10px,#f1f1f5 10px,#f1f1f5 20px); border: 1px dashed #d5d5dd; border-radius: 8px; color: #a0a0aa; font-size: 12px; text-align: center; padding: 22px; margin: 10px 0 14px; }
  .sec-text { margin: 0; font-size: 15px; color: #333; }
  .foot { text-align: center; color: #aaa; font-size: 12px; margin-top: 28px; }
</style></head>
<body><div class="wrap">
  <div class="banner">
    <h1>리프그린 시카 진정 토너 — 새 엔진 완성본</h1>
    <p>strategy → structure → copy 조립 · ${esc(cat)}/${esc(ch)}/${esc(copy.meta?.form || '블로그형')}/${esc(depth)}${secs.length}섹션 · 이미지 미생성(무과금 판정)</p>
  </div>

  <div class="meta-card">
    <h3>Stage1 · DNA</h3>
    <table>${dnaRows}</table>
  </div>
  <div class="meta-card">
    <h3>Stage1 · 전략(strategy)</h3>
    <table>${stratRows}</table>
  </div>
  <div class="meta-card">
    <h3>Stage2 · 구조 설계 (섹션별 mission) — 카피 대조용</h3>
    <table class="plan"><tr><th></th><th>섹션</th><th>역할</th><th>mission</th></tr>${planRows}</table>
  </div>

  <div class="meta-card" style="background:#faf8ff;">
    <h3>Stage3 · 완성 카피 (${secs.length}섹션)</h3>
    <p style="margin:0;font-size:13px;color:#777;">아래가 새 엔진이 만든 실물 상세페이지 카피입니다. 이미지 자리는 [이미지: ...]로 표시.</p>
  </div>
  <div class="page">${sections}</div>

  <div class="foot">판정용 1회 생성 · 기존 generate 파이프라인 미변경 · ${new Date().toISOString()}</div>
</div></body></html>`;
}

(async () => {
  console.log(`▶ BASE=${BASE}  cat=${cat} ch=${ch} depth=${depth} target=${sectionCount}`);

  console.log('\n[1/3] strategy 호출…');
  const strategy = await call('/api/strategy', { cat, ch, productName, productExtra });
  console.log('   main_weapon:', strategy.dna?.main_weapon);
  console.log('   concept   :', strategy.strategy?.concept);
  console.log('   story_flow:', strategy.strategy?.story_flow);

  console.log('\n[2/3] structure 호출…');
  const structure = await call('/api/structure', {
    dna: strategy.dna, strategy: strategy.strategy, cat, ch, depth, sectionCount,
  });
  console.log(`   sections=${structure.sections?.length} (target=${structure.section_count})`);

  console.log('\n[3/3] copy 호출…');
  const copy = await call('/api/copy', {
    dna: strategy.dna, strategy: strategy.strategy, sections: structure.sections,
    cat, ch, out: null, depth,
  });
  console.log(`   copy sections=${copy.sections?.length}  form=${copy.meta?.form}`);

  const html = buildHtml({ strategy, structure, copy });
  const htmlPath = join(OUT_DIR, 'onepage-judge.html');
  const jsonPath = join(OUT_DIR, 'onepage-judge.json');
  writeFileSync(htmlPath, html, 'utf-8');
  writeFileSync(jsonPath, JSON.stringify({ input: { cat, ch, depth, sectionCount, productName, productExtra }, strategy, structure, copy }, null, 2), 'utf-8');

  console.log(`\n✅ 저장 완료`);
  console.log(`   HTML: ${htmlPath}`);
  console.log(`   JSON: ${jsonPath}`);
})().catch((e) => {
  console.error('\n❌ 조립 실패:', e.message);
  process.exit(1);
});
