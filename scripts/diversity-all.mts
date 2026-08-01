/**
 * 다양성 테스트 전체 보기 — 요약 지표 + 모든 상품의 완성 페이지를 한 화면에(2026-08-01).
 *
 * ★상품별로 페이지를 따로 열면 비교가 안 된다. 카테고리마다 어디가 무너지는지는
 *   나란히 놓고 훑어야 보인다. 그래서 좌측 목차 + 전체 스크롤 한 장으로 만든다.
 *
 * ★렌더 규칙은 ResultScreen 다운로드 경로와 동일해야 한다(diversity-render와 같은 기준):
 *   센터 정렬(body 260자 이하) · 강조 마킹(**볼드** / ((포인트컬러))) · 섹션 태그 · 테마색.
 *   검수 화면이 실물과 다르면 검수가 틀린다.
 *
 * 실행: npx --yes tsx scripts/diversity-all.mts [폴더=runs/diversity]
 * 출력: <폴더>/all.html
 */
import fs from 'node:fs';
import path from 'node:path';
import type { Block } from '../store/AppContext';

const ROOT = process.cwd();
const REL = process.argv[2] ?? 'runs/diversity';
const DIR = path.join(ROOT, REL);

const esc = (s: unknown) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const CENTER_MAX = 260;
const PROBLEM_KEYS = ['공감', '고민', '일상', '불편', '걱정', '망설'];
const FEATURE_KEYS = ['솔루션', '해결', '성분', '제형', '특징', '효능', '원료'];
const SUSPECT = /(설계했|공정|특허|임상시험|테스트를 거|직접 입어|직접 써봤|자연광 컷|실내조명 컷|드롭숄더|수십 번|장인이|숙련된)/g;
const GLYPH: Record<string, string> = { '4:5': '▮', '16:9': '▬', '1:1': '■' };

interface Visual { primary_color?: string; soft_color?: string; soft_border?: string; accent_color?: string }
interface Sec {
  num: string; name: string; headline: string; subcopy?: string; body?: string;
  blocks?: Block[]; visual?: Visual; imageBrief?: { prompt?: string; ratio?: string };
}
interface Raw {
  product: { key: string; cat: string; density: string; productName: string; fields: string[] };
  visual?: Visual; sections: Sec[];
}

/* ★슬라이드형은 카피가 이미지에 박혀 나온다 — 실제 다운로드 파일도 이미지만 세로로 쌓는다.
 *  블로그처럼 헤드라인·본문을 따로 그리면 같은 글자가 두 번 보여 검수가 틀린다.
 *  폴더 이름으로 판정한다(diversity-slide). */
const IS_SLIDE = REL.includes('slide');

function markHtml(t: string, accent: string, src: string): string {
  let h = esc(t)
    .replace(/\*\*([\s\S]+?)\*\*/g, '<b>$1</b>')
    .replace(/\(\(([\s\S]+?)\)\)/g, `<em style="font-style:normal;font-weight:700;color:${accent};">$1</em>`);
  for (const m of new Set([...t.matchAll(SUSPECT)].map(x => x[0]))) {
    if (src.includes(m)) continue;
    h = h.split(esc(m)).join(`<span class="fab" title="셀러 입력에 없는 표현">${esc(m)}</span>`);
  }
  return h;
}
const bodyHtml = (b: string, a: string, src: string) =>
  b.split(/\n{2,}/).map(p => p.trim()).filter(Boolean)
    .map(p => `<p class="bodytext">${p.split('\n').map(l => markHtml(l.trim(), a, src)).join('<br>')}</p>`).join('');

function designKind(s: Sec, first: boolean, last: boolean) {
  if (first || last || s.blocks?.some(b => b.type === 'compare')) return null;
  const n = (s.name ?? '').toLowerCase();
  if (PROBLEM_KEYS.some(k => n.includes(k))) return 'problem';
  if (FEATURE_KEYS.some(k => n.includes(k))) return 'feature';
  return null;
}

function blockHtml(sec: Sec, b: Block, bi: number, files: Record<string, string>, a: string, src: string): string {
  switch (b.type) {
    case 'checklist': return `<ul class="ck">${b.items.map(i => `<li>${markHtml(i, a, src)}</li>`).join('')}</ul>`;
    case 'steps': return `<ol class="st">${b.items.map(s => `<li><b>${esc(s.title)}</b>${s.desc ? ` — ${esc(s.desc)}` : ''}</li>`).join('')}</ol>`;
    case 'iconcards': return `<div class="cards">${b.cards.map(c => `<div class="card"><b>${esc(c.title)}</b>${c.desc ? `<p>${esc(c.desc)}</p>` : ''}</div>`).join('')}</div>`;
    case 'stats': return `<div class="stats">${b.items.map(i => `<div><em>${esc(i.value)}</em><span>${esc(i.label)}</span></div>`).join('')}</div>`;
    case 'compare': return `<table class="cmp"><tr>${b.headers.map(h => `<th>${esc(h)}</th>`).join('')}</tr>${b.rows.map(r => `<tr>${r.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</table>`;
    case 'quote': return `<blockquote>${markHtml(b.text, a, src)}${b.author ? `<cite>— ${esc(b.author)}</cite>` : ''}</blockquote>`;
    case 'faq': return b.items.map(f => `<div class="faq"><b>Q. ${esc(f.q)}</b><p>A. ${esc(f.a)}</p></div>`).join('');
    case 'cta': return `<div class="cta"><p>${esc(b.text)}</p><span>${esc(b.button)}</span></div>`;
    case 'image': { const f = files[`${sec.num}#${bi}`]; return f ? `<img src="${f}" alt="">` : `<div class="miss">이미지 실패</div>`; }
    case 'heading': return `<h3>${esc(b.text)}</h3>`;
    case 'paragraph': return `<p class="bodytext">${markHtml(b.text, a, src)}</p>`;
    default: return '';
  }
}

if (!fs.existsSync(DIR)) { console.error('폴더 없음:', DIR); process.exit(1); }
const dirs = fs.readdirSync(DIR).filter(d => fs.existsSync(path.join(DIR, d, 'raw.json'))).sort();
if (!dirs.length) { console.error('완료된 상품이 없습니다.'); process.exit(1); }

const cards: string[] = [];
const pages: string[] = [];
const allRatios: string[] = [];
let totalFab = 0;

for (const d of dirs) {
  const raw = JSON.parse(fs.readFileSync(path.join(DIR, d, 'raw.json'), 'utf8')) as Raw;
  const p = raw.product;
  const src = [p.productName, ...p.fields].join(' ');
  const pv: Required<Visual> = {
    primary_color: raw.visual?.primary_color ?? '#6D4CFF',
    soft_color: raw.visual?.soft_color ?? '#F4F0FF',
    soft_border: raw.visual?.soft_border ?? '#E6DEFF',
    accent_color: raw.visual?.accent_color ?? raw.visual?.primary_color ?? '#6D4CFF',
  };

  const files: Record<string, string> = {};
  let imgs = 0;
  raw.sections.forEach((s, i) => {
    const f = `sec${String(i + 1).padStart(2, '0')}.png`;
    if (fs.existsSync(path.join(DIR, d, f))) { files[s.num] = `${encodeURIComponent(d)}/${f}`; imgs++; }
    s.blocks?.forEach((b, bi) => {
      if (b.type !== 'image') return;
      const bf = `sec${String(i + 1).padStart(2, '0')}-b${bi}.png`;
      if (fs.existsSync(path.join(DIR, d, bf))) { files[`${s.num}#${bi}`] = `${encodeURIComponent(d)}/${bf}`; imgs++; }
    });
  });

  const ratios = raw.sections.map(s => s.imageBrief?.ratio ?? '?');
  allRatios.push(...ratios);
  const lens = raw.sections.map(s => (s.body ?? '').length);
  const killers = raw.sections.filter(s => /\(\(.+?\)\)/.test(s.body ?? '')).length;
  const text = raw.sections.map(s => `${s.headline}${s.subcopy ?? ''}${s.body ?? ''}`).join(' ');
  const fabs = [...new Set([...text.matchAll(SUSPECT)].map(m => m[0]).filter(w => !src.includes(w)))];
  totalFab += fabs.length;

  cards.push(`<tr>
    <td><a href="#${esc(d)}"><b>${esc(p.key.replace(/^\d+-/, ''))}</b></a><span class="dim"> ${esc(p.cat)}</span></td>
    <td class="dim">${esc(p.density)} · ${p.fields.length}항목</td>
    <td class="mono">${ratios.map(r => GLYPH[r] ?? '?').join('')}</td>
    <td>${lens[0]}자</td><td>${Math.max(...lens)}자</td><td>${Math.max(...lens) - Math.min(...lens)}</td>
    <td class="${killers === 1 ? 'ok' : 'warn'}">${killers}곳</td>
    <td>${imgs}장</td>
    <td class="${fabs.length ? 'warn' : 'ok'}">${fabs.length ? fabs.join(', ') : '0건'}</td>
  </tr>`);

  const secHtml = IS_SLIDE
    ? raw.sections.map(s => files[s.num]
        ? `<img class="slide" src="${files[s.num]}" alt="${esc(s.name)}">`
        : `<div class="miss">이미지 없음 — ${esc(s.name)}</div>`).join('')
    : raw.sections.map((s, idx) => {
    const t = {
      primary: s.visual?.primary_color ?? pv.primary_color,
      soft: s.visual?.soft_color ?? pv.soft_color,
      border: s.visual?.soft_border ?? pv.soft_border,
      accent: s.visual?.accent_color ?? s.visual?.primary_color ?? pv.accent_color,
    };
    const kind = designKind(s, idx === 0, idx === raw.sections.length - 1);
    const tag = kind ? `<span class="sec-tag" style="background:${t.soft};border:1px solid ${t.border};color:${t.primary}">${kind === 'problem' ? '이런 고민, 있으셨나요?' : '이렇게 해결합니다'}</span>` : '';
    const img = files[s.num] ? `<img src="${files[s.num]}" alt="${esc(s.name)}">` : '';
    const blocks = s.blocks?.length ? `<div class="blocks">${s.blocks.map((b, bi) => blockHtml(s, b, bi, files, t.accent, src)).join('')}</div>` : '';
    const centered = (s.body ?? '').length <= CENTER_MAX;
    return `<section class="sec${centered ? ' sec-center' : ''}">
      <span class="rn">${esc(s.imageBrief?.ratio ?? '')}</span>${tag}
      <h2>${markHtml(s.headline, t.accent, src)}</h2>
      ${s.subcopy ? `<p class="subcopy">${markHtml(s.subcopy, t.accent, src)}</p>` : ''}
      ${img}${s.body ? bodyHtml(s.body, t.accent, src) : ''}${blocks}
    </section>`;
  }).join('');

  pages.push(`<div class="prod" id="${esc(d)}" style="--p:${pv.primary_color};--soft:${pv.soft_color};--sb:${pv.soft_border}">
    <div class="phead">
      <h3>${esc(p.productName)}</h3>
      <div class="pmeta">${esc(p.cat)} · 정보량 ${esc(p.density)} · ${raw.sections.length}섹션 · 이미지 ${imgs}장
        · 비율 <span class="mono">${ratios.map(r => GLYPH[r] ?? '?').join('')}</span></div>
      <details><summary>▸ 셀러가 입력한 상품정보 (${p.fields.length}항목)</summary>
        <div class="fields">${p.fields.map(f => `<div>${esc(f)}</div>`).join('')}</div></details>
    </div>
    ${IS_SLIDE ? '<div class="slidenote">슬라이드형은 카피가 이미지에 합성돼 나옵니다 — 실제 다운로드 파일과 같이 이미지만 세로로 쌓아 보여줍니다.</div>' : ''}
    ${secHtml}
  </div>`);
}

const dist = allRatios.reduce<Record<string, number>>((a, r) => { a[r] = (a[r] ?? 0) + 1; return a; }, {});
const kinds = Object.keys(dist).filter(k => k !== '?').length;
const skew = Math.max(...Object.values(dist)) / allRatios.length;

const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Flik 다양성 테스트 — 전체 보기</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css">
<style>
 *{box-sizing:border-box;margin:0;padding:0}
 body{font-family:'Pretendard','Apple SD Gothic Neo',sans-serif;background:#F4F4F8;color:#191F28;line-height:1.6}
 .wrap{display:grid;grid-template-columns:230px 1fr;gap:0;align-items:start}
 nav{position:sticky;top:0;height:100vh;overflow:auto;background:#191F28;color:#fff;padding:22px 18px}
 nav h1{font-size:15px;margin-bottom:4px}
 nav .sub{font-size:11.5px;color:#8B95A1;line-height:1.7;margin-bottom:16px}
 nav a{display:block;color:#C9D1DA;text-decoration:none;font-size:12.5px;padding:7px 9px;border-radius:7px;margin-bottom:3px}
 nav a:hover{background:#252C38;color:#fff}
 main{padding:26px 24px 90px;min-width:0}
 .panel{background:#fff;border-radius:14px;padding:20px 22px;margin-bottom:22px;box-shadow:0 2px 10px rgba(0,0,0,.05)}
 .panel h2{font-size:16px;margin-bottom:3px}
 .panel .d{font-size:12.5px;color:#8B95A1;margin-bottom:14px;line-height:1.7}
 table{width:100%;border-collapse:collapse;font-size:12.5px}
 th{background:#F4F4F8;padding:9px 8px;font-size:11px;font-weight:800;color:#4E5968;text-align:left;white-space:nowrap}
 td{padding:10px 8px;border-top:1px solid #F1F1F5;vertical-align:top}
 td a{color:#6D4CFF;text-decoration:none}
 .dim{color:#8B95A1} .ok{color:#0B8A4B;font-weight:700} .warn{color:#C92A2A;font-weight:700}
 .mono{font-family:ui-monospace,monospace;letter-spacing:2px;color:#4E5968}
 .verdict{font-size:13px;padding:12px 14px;border-radius:10px;margin-top:14px;line-height:1.75}
 .verdict.good{background:#EAFBF1;color:#0B6B3C} .verdict.bad{background:#FFF0F0;color:#B02020}
 .prod{background:#fff;border-radius:14px;margin-bottom:26px;overflow:hidden;box-shadow:0 2px 10px rgba(0,0,0,.05);max-width:820px}
 .phead{background:#FAFAFC;border-bottom:1px solid #ECECF2;padding:18px 26px}
 .phead h3{font-size:18px;margin-bottom:3px}
 .pmeta{font-size:12px;color:#8B95A1}
 .phead details{margin-top:9px}
 .phead summary{cursor:pointer;font-size:12px;font-weight:700;color:#4E5968}
 .fields{font-size:11.5px;color:#555;padding-top:7px}
 .fields div{padding:3px 0;border-top:1px dashed #E5E5EC}
 .sec{padding:40px 44px 0;position:relative}
 .sec:last-child{padding-bottom:44px}
 .rn{position:absolute;top:14px;right:18px;font-size:10px;font-weight:800;color:#C4C9D0;letter-spacing:.5px}
 .sec-tag{display:inline-block;padding:6px 13px;border-radius:999px;font-size:12.5px;font-weight:700;margin-bottom:13px}
 .sec h2{font-size:25px;font-weight:800;text-align:left;line-height:1.45;margin-bottom:13px;letter-spacing:-.5px;word-break:keep-all}
 .sec .subcopy{font-size:16px;font-weight:600;text-align:left;line-height:1.6;color:#5b5b66;margin:0 0 17px}
 .sec .bodytext{font-size:16px;line-height:1.85;text-align:left;color:#34343c;margin:0 0 14px;word-break:keep-all}
 .sec-center,.sec-center h2,.sec-center .subcopy,.sec-center .bodytext{text-align:center}
 .sec img{width:100%;display:block;margin:22px auto;border-radius:14px}
 .blocks{padding-top:30px;text-align:left}
 .ck{list-style:none;padding:0}.ck li{padding:7px 0 7px 26px;position:relative;font-size:15px}
 .ck li:before{content:'✓';position:absolute;left:2px;color:var(--p);font-weight:800}
 .st{padding-left:22px}.st li{margin:9px 0;font-size:15px}
 .cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(165px,1fr));gap:11px}
 .card{background:#fff;border:1px solid #ECECF2;border-radius:20px;padding:18px;text-align:center;box-shadow:0 6px 20px rgba(0,0,0,.04)}
 .card p{margin:5px 0 0;font-size:13px;color:#666}
 .stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(115px,1fr));gap:11px}
 .stats>div{padding:20px 10px;text-align:center;border:1px solid var(--sb);border-radius:16px}
 .stats em{display:block;font-style:normal;font-size:21px;font-weight:800;color:var(--p)}
 .stats span{font-size:12px;color:#777}
 .cmp{width:100%;border-collapse:collapse;font-size:13.5px}
 .cmp th{background:var(--soft);padding:14px;text-align:center}
 .cmp td{border-top:1px solid #eee;padding:14px;text-align:center}
 blockquote{background:var(--soft);border-left:3px solid var(--p);margin:13px 0;padding:15px 19px;border-radius:0 11px 11px 0;font-size:15px}
 cite{display:block;font-size:12px;color:#999;margin-top:7px}
 .faq{margin:13px 0}.faq p{margin:4px 0 0;color:#555}
 .cta{border-radius:20px;border:1px solid var(--sb);background:var(--soft);padding:28px;text-align:center}
 .cta span{display:inline-block;background:var(--p);color:#fff;font-weight:800;border-radius:999px;padding:11px 26px;margin-top:11px}
 .miss{background:#fee;color:#c00;padding:18px;border-radius:10px;text-align:center;font-size:13px}
 .slide{width:100%;display:block;margin:0;padding:0}
 .slidenote{background:#FFF9E8;border-bottom:1px solid #FFE9A8;padding:11px 26px;font-size:12px;color:#7A5C00;line-height:1.7}
 .fab{background:#FFE3E3;color:#C92A2A;border-radius:3px;padding:0 3px;font-weight:700}
 @media(max-width:900px){.wrap{grid-template-columns:1fr}nav{position:static;height:auto}}
</style></head><body>
<div class="wrap">
<nav>
  <h1>다양성 테스트</h1>\n  <div class="sub" style="margin-bottom:8px">${IS_SLIDE ? '슬라이드형' : '블로그형'}</div>
  <div class="sub">신규 상품 ${dirs.length}종 · 블로그형 8섹션<br>모델이 비율 선택 · salesMode ON</div>
  <a href="#summary">📊 요약 지표</a>
  ${dirs.map(d => `<a href="#${esc(d)}">${esc(d.replace(/^\d+-/, ''))}</a>`).join('')}
</nav>
<main>
  <div class="panel" id="summary">
    <h2>요약 지표</h2>
    <p class="d">비율 글리프 — ▮ 4:5 세로 · ■ 1:1 정사각 · ▬ 16:9 가로 &nbsp;|&nbsp;
      <span class="fab">빨간 표시</span>는 셀러 입력에 없는 표현입니다.</p>
    <table>
      <tr><th>상품</th><th>정보량</th><th>비율 흐름</th><th>히어로</th><th>최장</th><th>편차</th><th>킬러라인</th><th>이미지</th><th>날조</th></tr>
      ${cards.join('')}
    </table>
    <div class="verdict ${kinds >= 2 && skew < 0.75 ? 'good' : 'bad'}">
      <b>비율</b> ${JSON.stringify(dist)} — ${kinds}종 사용, 최다 비중 ${(skew * 100).toFixed(0)}%.
      ${kinds >= 2 && skew < 0.75
        ? '모델이 장면에 따라 다양하게 고르고 있습니다.'
        : '한 비율에 쏠렸습니다 — 모델이 사실상 기본값만 쓰고 있을 수 있습니다.'}
      <br><b>날조</b> 총 ${totalFab}건.
      ${totalFab === 0 ? 'salesMode를 켠 상태에서도 셀러 입력 밖으로 나가지 않았습니다.' : '확인이 필요합니다.'}
    </div>
  </div>
  ${pages.join('')}
</main></div></body></html>`;

fs.writeFileSync(path.join(DIR, 'all.html'), html);
console.log(`완료 — ${dirs.length}개 상품\n열기: open ${path.join(REL, 'all.html')}`);
