/**
 * 판정용 1회 조립 (v3) — Stage3 카피 개선(섹션별 writing_style 문체 변주, 브랜드 톤은 공유) 검증.
 * strategy → structure(emotion_goal + writing_style) → copy(문체 변주 + emotion_goal 달성 + blocks) 순차 호출.
 * 이미지브리프·Gemini 제외(무과금). 기존 generate 파이프라인 미변경. 조립만.
 *
 * 사용: dev 서버 띄운 채  node scripts/assemble-onepage-v3.mjs
 * 출력: _prototype_out/onepage-judge-v3.html + onepage-judge-v3.json
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const OUT_DIR = join(process.cwd(), '_prototype_out');
mkdirSync(OUT_DIR, { recursive: true });

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
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  const ms = Date.now() - t0;
  const json = await res.json();
  if (!res.ok || json.error) throw new Error(`[${path}] HTTP ${res.status} (${ms}ms): ${json.error || JSON.stringify(json).slice(0, 300)}`);
  console.log(`✓ ${path} — ${ms}ms`);
  return json;
}

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// ── 블록 렌더링 (AppContext Block 12종) ─────────────────────────────
function renderBlock(b) {
  if (!b || typeof b !== 'object') return '';
  switch (b.type) {
    case 'hero': return `<div class="b b-hero"><div class="b-h1">${esc(b.title)}</div>${b.subtitle ? `<div class="b-sub">${esc(b.subtitle)}</div>` : ''}</div>`;
    case 'heading': return `<div class="b b-heading">${esc(b.text)}</div>`;
    case 'paragraph': return `<p class="b b-para">${esc(b.text)}</p>`;
    case 'checklist': return `<ul class="b b-check">${(b.items || []).map(i => `<li>${esc(i)}</li>`).join('')}</ul>`;
    case 'steps': return `<ol class="b b-steps">${(b.items || []).map(i => `<li><b>${esc(i.title)}</b>${i.desc ? `<span>${esc(i.desc)}</span>` : ''}</li>`).join('')}</ol>`;
    case 'iconcards': return `<div class="b b-cards">${(b.cards || []).map(c => `<div class="card"><b>${esc(c.title)}</b>${c.desc ? `<p>${esc(c.desc)}</p>` : ''}</div>`).join('')}</div>`;
    case 'stats': return `<div class="b b-stats">${(b.items || []).map(i => `<div class="stat"><div class="v">${esc(i.value)}</div><div class="l">${esc(i.label)}</div></div>`).join('')}</div>`;
    case 'compare': return `<table class="b b-compare"><thead><tr>${(b.headers || []).map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${(b.rows || []).map(r => `<tr>${r.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
    case 'quote': return `<blockquote class="b b-quote">${b.rating ? `<div class="stars">${'★'.repeat(b.rating)}</div>` : ''}<p>“${esc(b.text)}”</p>${b.author ? `<cite>— ${esc(b.author)}</cite>` : ''}</blockquote>`;
    case 'faq': return `<dl class="b b-faq">${(b.items || []).map(i => `<dt>Q. ${esc(i.q)}</dt><dd>A. ${esc(i.a)}</dd>`).join('')}</dl>`;
    case 'image': return `<div class="b b-imgblock">[이미지: ${esc(b.label)}] ${esc(b.desc)}</div>`;
    case 'cta': return `<div class="b b-cta">${esc(b.text)} <span class="btn">${esc(b.button)}</span></div>`;
    default: return `<div class="b b-unknown">[알 수 없는 블록: ${esc(b.type)}]</div>`;
  }
}

function buildHtml({ strategy, structure, copy }) {
  const dna = strategy.dna || {};
  const strat = strategy.strategy || {};
  const plan = structure.sections || [];
  const secs = copy.sections || [];

  const dnaRows = Object.entries(dna).map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`).join('');
  const stratRows = Object.entries(strat).map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`).join('');
  const planRows = plan.map((s, i) => `<tr><td>${i + 1}</td><td><b>${esc(s.name)}</b></td><td class="sty">${esc(s.writing_style)}</td><td class="emo">${esc(s.emotion_goal)}</td></tr>`).join('');

  const sections = secs.map((s, i) => {
    const blocks = (s.blocks || []).map(renderBlock).join('');
    const blockTypes = (s.blocks || []).map(b => b?.type).filter(Boolean).join(', ') || '없음';
    return `
    <section class="sec">
      <div class="sec-num">${String(i + 1).padStart(2, '0')}</div>
      <div class="sec-body">
        <div class="sec-name">${esc(s.name)} <span class="blk-tag">블록: ${esc(blockTypes)}</span></div>
        <div class="sty-tag">✍️ 문체: ${esc(plan[i]?.writing_style || '')}</div>
        <div class="emo-goal">🎯 ${esc(plan[i]?.emotion_goal || '')}</div>
        <h2 class="sec-headline">${esc(s.headline)}</h2>
        ${s.subcopy ? `<p class="sec-subcopy">${esc(s.subcopy)}</p>` : ''}
        <div class="sec-img">[이미지: ${esc(plan[i]?.role || s.name || 'shot')}]</div>
        ${s.body ? `<p class="sec-text">${esc(s.body).replace(/\n/g, '<br>')}</p>` : ''}
        ${blocks}
      </div>
    </section>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>리프그린 시카 토너 — 새 엔진 v2 (대화체+블록, 판정용)</title>
<style>
  * { box-sizing: border-box; }
  body { margin: 0; font-family: 'Pretendard', -apple-system, system-ui, sans-serif; color: #1a1a1a; background: #f4f4f6; line-height: 1.65; }
  .wrap { max-width: 760px; margin: 0 auto; padding: 32px 16px 80px; }
  .meta-card { background: #fff; border-radius: 14px; padding: 20px 24px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,.06); }
  .meta-card h3 { margin: 0 0 12px; font-size: 14px; letter-spacing: .04em; color: #6D4CFF; text-transform: uppercase; }
  table { width: 100%; border-collapse: collapse; font-size: 14px; }
  th, td { text-align: left; padding: 7px 10px; vertical-align: top; border-bottom: 1px solid #f0f0f3; }
  th { white-space: nowrap; color: #555; font-weight: 600; }
  .plan td:first-child { width: 24px; color: #999; }
  .plan .emo { color: #c2410c; font-weight: 600; }
  .banner { background: linear-gradient(135deg,#0d9488,#34d399); color: #fff; border-radius: 14px; padding: 22px 24px; margin-bottom: 24px; }
  .banner h1 { margin: 0 0 4px; font-size: 20px; }
  .banner p { margin: 0; opacity: .92; font-size: 13px; }
  .page { background: #fff; border-radius: 14px; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,.07); }
  .sec { display: flex; gap: 14px; padding: 26px 24px; border-bottom: 1px solid #f2f2f4; }
  .sec:last-child { border-bottom: 0; }
  .sec-num { font-size: 12px; font-weight: 800; color: #a7e3d4; min-width: 26px; padding-top: 4px; }
  .sec-body { flex: 1; min-width: 0; }
  .sec-name { font-size: 11px; font-weight: 700; color: #0d9488; letter-spacing: .03em; margin-bottom: 4px; }
  .blk-tag { color: #999; font-weight: 500; }
  .sty-tag { font-size: 12px; color: #1d4ed8; background: #eff6ff; border-radius: 6px; padding: 4px 8px; display: inline-block; margin-bottom: 6px; margin-right: 6px; }
  .emo-goal { font-size: 12px; color: #c2410c; background: #fff7ed; border-radius: 6px; padding: 4px 8px; display: inline-block; margin-bottom: 8px; }
  .plan .sty { color: #1d4ed8; font-weight: 600; }
  .sec-headline { margin: 0 0 6px; font-size: 21px; line-height: 1.35; }
  .sec-subcopy { margin: 0 0 12px; font-size: 15px; color: #6b6b72; font-weight: 500; }
  .sec-img { background: repeating-linear-gradient(45deg,#f7f7fa,#f7f7fa 10px,#f1f1f5 10px,#f1f1f5 20px); border: 1px dashed #d5d5dd; border-radius: 8px; color: #a0a0aa; font-size: 12px; text-align: center; padding: 18px; margin: 10px 0 14px; }
  .sec-text { margin: 0 0 12px; font-size: 15px; color: #333; }
  /* blocks */
  .b { margin: 12px 0; font-size: 14px; }
  .b-heading { font-size: 17px; font-weight: 800; color: #111; }
  .b-check { list-style: none; padding: 0; margin: 12px 0; }
  .b-check li { padding: 8px 12px 8px 34px; position: relative; background: #f0fdf9; border-radius: 8px; margin-bottom: 6px; }
  .b-check li::before { content: '✓'; position: absolute; left: 12px; color: #0d9488; font-weight: 800; }
  .b-steps { margin: 12px 0; padding-left: 20px; }
  .b-steps li { margin-bottom: 8px; } .b-steps li b { display: block; } .b-steps li span { color: #666; font-size: 13px; }
  .b-cards { display: grid; grid-template-columns: repeat(auto-fit,minmax(150px,1fr)); gap: 10px; margin: 12px 0; }
  .b-cards .card { background: #f7f7fb; border-radius: 10px; padding: 12px 14px; } .b-cards .card b { color: #0d9488; } .b-cards .card p { margin: 4px 0 0; font-size: 13px; color: #555; }
  .b-stats { display: flex; gap: 12px; flex-wrap: wrap; margin: 12px 0; }
  .b-stats .stat { flex: 1; min-width: 90px; text-align: center; background: #f0fdf9; border-radius: 10px; padding: 12px; } .b-stats .v { font-size: 22px; font-weight: 800; color: #0d9488; } .b-stats .l { font-size: 12px; color: #666; }
  .b-compare { font-size: 13px; margin: 12px 0; } .b-compare th, .b-compare td { border: 1px solid #eee; text-align: center; } .b-compare thead th { background: #f0fdf9; }
  .b-quote { margin: 12px 0; padding: 14px 16px; background: #fafafa; border-left: 3px solid #0d9488; border-radius: 0 8px 8px 0; } .b-quote p { margin: 4px 0; font-style: italic; } .b-quote .stars { color: #f59e0b; } .b-quote cite { font-size: 12px; color: #888; }
  .b-faq dt { font-weight: 700; margin-top: 10px; } .b-faq dd { margin: 4px 0 0; color: #555; }
  .b-cta { background: linear-gradient(135deg,#0d9488,#34d399); color: #fff; padding: 14px 18px; border-radius: 10px; font-weight: 700; display: flex; align-items: center; justify-content: space-between; margin: 14px 0; } .b-cta .btn { background: #fff; color: #0d9488; padding: 6px 14px; border-radius: 20px; font-size: 13px; }
  .b-imgblock, .b-unknown { color: #a0a0aa; font-size: 12px; }
  .foot { text-align: center; color: #aaa; font-size: 12px; margin-top: 28px; }
</style></head>
<body><div class="wrap">
  <div class="banner">
    <h1>리프그린 시카 토너 — 새 엔진 v3 (섹션별 문체 변주)</h1>
    <p>strategy → structure(+emotion_goal +writing_style) → copy(문체 변주 + blocks) · 브랜드 톤: ${esc(strat.tone || '')} · ${esc(cat)}/${esc(ch)}/${esc(copy.meta?.form || '블로그형')}/${esc(depth)}${secs.length}섹션 · 이미지 미생성</p>
  </div>

  <div class="meta-card"><h3>Stage1 · DNA</h3><table>${dnaRows}</table></div>
  <div class="meta-card"><h3>Stage1 · 전략</h3><table>${stratRows}</table></div>
  <div class="meta-card">
    <h3>Stage2 · 구조 + writing_style (신규) + emotion_goal</h3>
    <table class="plan"><tr><th></th><th>섹션</th><th>writing_style</th><th>emotion_goal</th></tr>${planRows}</table>
  </div>

  <div class="meta-card" style="background:#f0fdf9;">
    <h3>Stage3 · 문체 변주 카피 + 블록 (${secs.length}섹션)</h3>
    <p style="margin:0;font-size:13px;color:#777;">각 섹션 상단 ✍️ = 그 섹션 문체(writing_style), 🎯 = emotion_goal. 본문 아래 박스 = 블록. 바닥 브랜드 톤은 전 섹션 공유.</p>
  </div>
  <div class="page">${sections}</div>

  <div class="foot">판정용 1회 생성 (v3) · 기존 generate 파이프라인 미변경 · ${new Date().toISOString()}</div>
</div></body></html>`;
}

(async () => {
  console.log(`▶ v2  BASE=${BASE}  cat=${cat} ch=${ch} depth=${depth} target=${sectionCount}`);

  console.log('\n[1/3] strategy…');
  const strategy = await call('/api/strategy', { cat, ch, productName, productExtra });

  console.log('\n[2/3] structure (+emotion_goal +writing_style)…');
  const structure = await call('/api/structure', { dna: strategy.dna, strategy: strategy.strategy, cat, ch, depth, sectionCount });
  const withEmo = (structure.sections || []).filter(s => s.emotion_goal).length;
  const withStyle = (structure.sections || []).filter(s => s.writing_style).length;
  console.log(`   sections=${structure.sections?.length}  emotion_goal=${withEmo}  writing_style=${withStyle}`);
  console.log(`   문체 목록:`, (structure.sections || []).map(s => s.writing_style));

  console.log('\n[3/3] copy (문체 변주 + emotion_goal 달성 + blocks)…');
  const copy = await call('/api/copy', { dna: strategy.dna, strategy: strategy.strategy, sections: structure.sections, cat, ch, out: null, depth });
  const withBlocks = (copy.sections || []).filter(s => Array.isArray(s.blocks) && s.blocks.length).length;
  const blockTypeCount = {};
  (copy.sections || []).forEach(s => (s.blocks || []).forEach(b => { if (b?.type) blockTypeCount[b.type] = (blockTypeCount[b.type] || 0) + 1; }));
  console.log(`   copy sections=${copy.sections?.length}  블록 포함 섹션=${withBlocks}/${copy.sections?.length}`);
  console.log(`   블록 종류별 개수:`, blockTypeCount);

  const html = buildHtml({ strategy, structure, copy });
  const htmlPath = join(OUT_DIR, 'onepage-judge-v3.html');
  const jsonPath = join(OUT_DIR, 'onepage-judge-v3.json');
  writeFileSync(htmlPath, html, 'utf-8');
  writeFileSync(jsonPath, JSON.stringify({ input: { cat, ch, depth, sectionCount, productName, productExtra }, strategy, structure, copy }, null, 2), 'utf-8');

  console.log(`\n✅ 저장 완료\n   HTML: ${htmlPath}\n   JSON: ${jsonPath}`);
})().catch((e) => { console.error('\n❌ 실패:', e.message); process.exit(1); });
