/**
 * 다양성 테스트 결과 렌더러 — raw.json + 생성된 이미지로 '완성된 페이지'를 만든다.
 *
 * ★생성 스크립트(diversity-run.mts)와 분리한 이유: 렌더는 언제든 다시 돌릴 수 있어야 한다.
 *   생성은 비싸고 느린데 렌더는 공짜다.
 *
 * ⚠️이 파일의 렌더 규칙은 ResultScreen의 HTML 내보내기(다운로드 경로)를 그대로 따라야 한다.
 *   처음엔 대충 근사해서 만들었더니 실제 앱에 있는 기능(가운데 정렬·강조 마킹)이 안 보여서
 *   "기능이 적용 안 됐다"는 오판을 불렀다. 검수용 렌더러가 실물과 다르면 검수 자체가 틀린다.
 *   동기화 대상(ResultScreen.tsx 기준):
 *     · 센터 정렬: body 260자 이하 → .sec-center            (line 545)
 *     · 강조 마킹: **볼드** / ((포인트 컬러=accent))          (markHtml)
 *     · 본문 문단: \n\n = 문단, \n = <br>                     (bodyHtml)
 *     · 섹션 태그: PROBLEM/FEATURE 키워드 → 안내 칩           (sectionDesignKind)
 *     · 배치 순서: 태그 → 헤드라인 → 서브 → 이미지 → 본문 → 블록
 *     · 색: sec.visual의 primary/soft/softBorder/accent
 *
 * 실행: npx --yes tsx scripts/diversity-render.mts
 * 출력: runs/diversity/<상품>/index.html + runs/diversity/index.html(전체 목록)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Block } from '../store/AppContext';
import type { TestProduct } from './test-products';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT_ROOT = path.join(ROOT, 'runs', 'diversity');

const esc = (s: unknown) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** ResultScreen과 동일 — 짧은 카피는 센터가 상세페이지답게 읽힌다는 기준 */
const CENTER_MAX = 260;
const PROBLEM_KEYS = ['공감', '고민', '일상', '불편', '걱정', '망설'];
const FEATURE_KEYS = ['솔루션', '해결', '성분', '제형', '특징', '효능', '원료'];

interface Visual { primary_color?: string; soft_color?: string; soft_border?: string; accent_color?: string; mood?: string }
interface RawSection {
  num: string; name: string; headline: string; subcopy?: string; body?: string;
  blocks?: Block[]; visual?: Visual; imageBrief?: { prompt?: string };
}
interface Raw { product: TestProduct; visual?: Visual; sections: RawSection[] }

function designKind(sec: RawSection, isFirst: boolean, isLast: boolean): 'problem' | 'feature' | null {
  if (isFirst || isLast) return null;
  if (sec.blocks?.some(b => b.type === 'compare')) return null;
  const name = (sec.name ?? '').toLowerCase();
  const hit = (keys: string[]) => keys.some(k => name.includes(k.toLowerCase()));
  if (hit(PROBLEM_KEYS)) return 'problem';
  if (hit(FEATURE_KEYS)) return 'feature';
  return null;
}

/** ★강조 마킹 — **볼드** / ((포인트 컬러)). 이게 빠지면 괄호가 그대로 화면에 찍힌다. */
function markHtml(t: string, accent: string): string {
  return esc(t)
    .replace(/\*\*([\s\S]+?)\*\*/g, '<b>$1</b>')
    .replace(/\(\(([\s\S]+?)\)\)/g, `<em style="font-style:normal;font-weight:700;color:${accent};">$1</em>`);
}

/** body — 이중 줄바꿈=문단, 단일 줄바꿈=<br> (v5 호흡) */
function bodyHtml(body: string, accent: string): string {
  return body.split(/\n{2,}/).map(p => p.trim()).filter(Boolean)
    .map(p => `<p class="bodytext">${p.split('\n').map(l => markHtml(l.trim(), accent)).join('<br>')}</p>`)
    .join('\n      ');
}

function renderBlock(sec: RawSection, b: Block, bi: number, files: Record<string, string>, t: Required<Visual>): string {
  const a = t.accent_color;
  switch (b.type) {
    case 'checklist': return `<ul class="ck">${b.items.map(i => `<li>${markHtml(i, a)}</li>`).join('')}</ul>`;
    case 'steps': return `<ol class="st">${b.items.map(s => `<li><b>${esc(s.title)}</b>${s.desc ? ` — ${esc(s.desc)}` : ''}</li>`).join('')}</ol>`;
    case 'iconcards': return `<div class="cards">${b.cards.map(c => `<div class="card"><b>${esc(c.title)}</b>${c.desc ? `<p>${esc(c.desc)}</p>` : ''}</div>`).join('')}</div>`;
    case 'stats': return `<div class="stats">${b.items.map(s => `<div><em>${esc(s.value)}</em><span>${esc(s.label)}</span></div>`).join('')}</div>`;
    case 'compare': return `<table class="cmp"><tr>${b.headers.map(h => `<th>${esc(h)}</th>`).join('')}</tr>${b.rows.map(r => `<tr>${r.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</table>`;
    case 'quote': return `<blockquote>${markHtml(b.text, a)}${b.author ? `<cite>— ${esc(b.author)}</cite>` : ''}</blockquote>`;
    case 'faq': return b.items.map(f => `<div class="faq"><b>Q. ${esc(f.q)}</b><p>A. ${esc(f.a)}</p></div>`).join('');
    case 'cta': return `<div class="cta"><p>${markHtml(b.text, '#fff')}</p><span>${esc(b.button)}</span></div>`;
    case 'image': {
      const f = files[`${sec.num}#${bi}`];
      return f ? `<img src="${f}" alt="${esc(b.label)}">` : `<div class="miss">이미지 실패: ${esc(b.label)}</div>`;
    }
    case 'heading': return `<h3>${esc(b.text)}</h3>`;
    case 'paragraph': return `<p class="bodytext">${markHtml(b.text, a)}</p>`;
    default: return '';
  }
}

/** ResultScreen 내보내기 CSS를 그대로 옮긴 것 — 폭·크기·정렬 기준이 실물과 같아야 한다. */
function pageCss(v: Required<Visual>): string {
  return `
  :root { --p:${v.primary_color}; --soft:${v.soft_color}; --sb:${v.soft_border}; }
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Pretendard','Apple SD Gothic Neo','Noto Sans KR',system-ui,sans-serif;background:#f2f0ec;color:#111;line-height:1.7}
  .page{max-width:800px;margin:0 auto;background:#fff;padding:0 0 80px;box-shadow:0 0 30px rgba(0,0,0,.08)}
  .topbar{background:#191F28;color:#fff;padding:18px 28px;font-size:13px}
  .topbar a{color:#9db8ff;text-decoration:none}
  .topbar h1{font-size:19px;margin:6px 0 2px}
  .topbar .meta{color:#9AA3AF;font-size:12.5px}
  details.input{background:#FAFAFC;border-bottom:1px solid #ECECF2}
  details.input summary{cursor:pointer;padding:14px 28px;font-size:13.5px;font-weight:700;color:#4E5968}
  details.input .fields{padding:4px 28px 20px;font-size:13px;color:#333}
  details.input .fields div{padding:5px 0;border-top:1px dashed #E5E5EC}
  details.input .fields b{color:var(--p);font-weight:700}
  .sec{padding:48px 48px 0}
  .sec-tag{display:inline-block;padding:7px 14px;border-radius:999px;font-size:13px;font-weight:700;letter-spacing:-.2px;margin-bottom:14px}
  .sec h2{font-size:27px;font-weight:800;text-align:left;line-height:1.45;margin-bottom:14px;letter-spacing:-.5px;word-break:keep-all}
  .sec .subcopy{font-size:17px;font-weight:600;text-align:left;line-height:1.6;color:#5b5b66;margin:0 0 18px;letter-spacing:-.2px}
  .sec .bodytext{font-size:17px;line-height:1.85;text-align:left;color:#34343c;margin:0 0 15px;letter-spacing:-.2px;word-break:keep-all}
  .sec .bodytext:last-of-type{margin-bottom:0}
  /* ★센터 규칙은 반드시 위 .sec 규칙들 뒤 — 특정도가 같아 순서가 승패를 가른다(ResultScreen과 동일) */
  .sec-center,.sec-center h2,.sec-center .subcopy,.sec-center .bodytext{text-align:center}
  .sec img{width:100%;max-width:860px;display:block;margin:24px auto;border-radius:16px}
  .blocks{padding-top:36px;text-align:left}
  .ck{list-style:none;padding:0}.ck li{padding:8px 0 8px 28px;position:relative;font-size:16px}.ck li:before{content:'✓';position:absolute;left:2px;color:var(--p);font-weight:800}
  .st{padding-left:22px}.st li{margin:10px 0;font-size:16px}
  .cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px}
  .card{background:#fff;border:1px solid #ECECF2;border-radius:24px;padding:20px;text-align:center;box-shadow:0 8px 24px rgba(0,0,0,.04)}
  .card p{margin:6px 0 0;font-size:13.5px;color:#666}
  .stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:12px}
  .stats>div{padding:22px 12px;text-align:center;border:1px solid var(--sb);border-radius:18px;background:#fff}
  .stats em{display:block;font-style:normal;font-size:22px;font-weight:800;color:var(--p)}
  .stats span{font-size:12.5px;color:#777}
  .cmp{width:100%;border-collapse:collapse;font-size:14px}
  .cmp th{background:var(--soft);padding:16px;text-align:center}
  .cmp td{border-top:1px solid #eee;padding:16px;text-align:center}
  blockquote{background:var(--soft);border-left:3px solid var(--p);margin:14px 0;padding:16px 20px;border-radius:0 12px 12px 0;font-size:16px}
  cite{display:block;font-size:12.5px;color:#999;margin-top:8px}
  .faq{margin:14px 0}.faq p{margin:4px 0 0;color:#555}
  .cta{border-radius:24px;border:1px solid var(--sb);background:var(--soft);padding:32px;text-align:center}
  .cta span{display:inline-block;background:var(--p);color:#fff;font-weight:800;border-radius:999px;padding:12px 28px;margin-top:12px}
  .miss{background:#fee;color:#c00;padding:20px;border-radius:10px;text-align:center;font-size:13px}`;
}

function renderProduct(dir: string): { key: string; cat: string; sections: number; images: number } | null {
  const rawPath = path.join(dir, 'raw.json');
  if (!fs.existsSync(rawPath)) return null;
  const raw = JSON.parse(fs.readFileSync(rawPath, 'utf8')) as Raw;
  const p = raw.product;

  const pageV: Required<Visual> = {
    primary_color: raw.visual?.primary_color ?? '#6D4CFF',
    soft_color: raw.visual?.soft_color ?? '#F4F0FF',
    soft_border: raw.visual?.soft_border ?? '#E6DEFF',
    accent_color: raw.visual?.accent_color ?? raw.visual?.primary_color ?? '#6D4CFF',
    mood: raw.visual?.mood ?? '',
  };

  const files: Record<string, string> = {};
  let imageCount = 0;
  raw.sections.forEach((sec, i) => {
    const f = `sec${String(i + 1).padStart(2, '0')}.png`;
    if (fs.existsSync(path.join(dir, f))) { files[sec.num] = f; imageCount++; }
    sec.blocks?.forEach((b, bi) => {
      if (b.type !== 'image') return;
      const bf = `sec${String(i + 1).padStart(2, '0')}-b${bi}.png`;
      if (fs.existsSync(path.join(dir, bf))) { files[`${sec.num}#${bi}`] = bf; imageCount++; }
    });
  });

  const fieldRows = p.fields.map(line => {
    const m = line.match(/^\[([^\]]+)\]:\s*(.*)$/);
    return m ? `<div><b>${esc(m[1])}</b> — ${esc(m[2])}</div>` : `<div>${esc(line)}</div>`;
  }).join('');

  const sectionsHtml = raw.sections.map((sec, idx) => {
    const t: Required<Visual> = {
      primary_color: sec.visual?.primary_color ?? pageV.primary_color,
      soft_color: sec.visual?.soft_color ?? pageV.soft_color,
      soft_border: sec.visual?.soft_border ?? pageV.soft_border,
      accent_color: sec.visual?.accent_color ?? sec.visual?.primary_color ?? pageV.accent_color,
      mood: '',
    };
    const kind = designKind(sec, idx === 0, idx === raw.sections.length - 1);
    const tag = kind
      ? `\n      <span class="sec-tag" style="background:${t.soft_color};border:1px solid ${t.soft_border};color:${t.primary_color};">${kind === 'problem' ? '이런 고민, 있으셨나요?' : '이렇게 해결합니다'}</span>`
      : '';
    const head = `<h2>${esc(sec.headline).replace(/\n/g, '<br>')}</h2>`;
    const sub = sec.subcopy ? `\n      <p class="subcopy">${markHtml(sec.subcopy, t.accent_color)}</p>` : '';
    const img = files[sec.num] ? `\n      <img src="${files[sec.num]}" alt="${esc(sec.name)}">` : '';
    const body = sec.body ? '\n      ' + bodyHtml(sec.body, t.accent_color) : '';
    const blocks = sec.blocks?.length
      ? `\n      <div class="blocks">\n        ${sec.blocks.map((b, bi) => renderBlock(sec, b, bi, files, t)).join('\n        ')}\n      </div>`
      : '';
    // ★센터 정렬 — 실제 앱과 동일 기준(260자)
    const centered = (sec.body ?? '').length <= CENTER_MAX;
    return `\n    <section class="sec${centered ? ' sec-center' : ''}">${tag}\n      ${head}${sub}${img}${body}${blocks}\n    </section>`;
  }).join('\n');

  const centerCount = raw.sections.filter(s => (s.body ?? '').length <= CENTER_MAX).length;
  const markCount = raw.sections.filter(s => /\*\*[\s\S]+?\*\*|\(\([\s\S]+?\)\)/.test(s.body ?? '')).length;

  const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(p.productName)} — 블로그형</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css">
<style>${pageCss(pageV)}</style></head><body>
<div class="page">
  <div class="topbar">
    <a href="../index.html">← 전체 목록</a>
    <h1>${esc(p.productName)}</h1>
    <div class="meta">${esc(p.cat)} · ${esc(p.ch)} · 블로그형 ${raw.sections.length}섹션 · 이미지 ${imageCount}장 · 정보량 ${esc(p.density)}
      · 센터정렬 ${centerCount}/${raw.sections.length} · 강조마킹 ${markCount}/${raw.sections.length}
      · 테마 ${esc(pageV.primary_color)}</div>
  </div>
  <details class="input">
    <summary>▸ 셀러가 입력한 상품정보 (${p.fields.length}개 항목) — 결과에 없는 정보가 나왔는지 대조용</summary>
    <div class="fields"><div><b>상품명</b> — ${esc(p.productName)}</div>${fieldRows}</div>
  </details>
${sectionsHtml}
</div></body></html>`;

  fs.writeFileSync(path.join(dir, 'index.html'), html);
  return { key: p.key, cat: p.cat, sections: raw.sections.length, images: imageCount };
}

/* ── 실행 ── */
if (!fs.existsSync(OUT_ROOT)) { console.error('결과 폴더가 없습니다:', OUT_ROOT); process.exit(1); }

const dirs = fs.readdirSync(OUT_ROOT)
  .filter(d => fs.statSync(path.join(OUT_ROOT, d)).isDirectory()).sort();

const done: Array<{ key: string; cat: string; sections: number; images: number }> = [];
for (const d of dirs) {
  const r = renderProduct(path.join(OUT_ROOT, d));
  if (r) { done.push(r); console.log(`  ✅ ${r.key} — ${r.sections}섹션 / 이미지 ${r.images}장`); }
  else console.log(`  ⏳ ${d} — 아직 raw.json 없음`);
}

const index = `<!doctype html><html lang="ko"><head><meta charset="utf-8">
<title>Flik 다양성 테스트 — 신규 상품</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css">
<style>
 body{margin:0;background:#F4F4F8;font-family:'Pretendard','Apple SD Gothic Neo',sans-serif;color:#191F28;padding:40px 20px}
 .w{max-width:900px;margin:0 auto} h1{font-size:24px;margin:0 0 6px}
 .sub{color:#8B95A1;font-size:14px;margin:0 0 28px;line-height:1.7}
 .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:14px}
 a.card{display:block;background:#fff;border-radius:14px;padding:18px 20px;text-decoration:none;color:inherit;box-shadow:0 2px 10px rgba(0,0,0,.05)}
 a.card:hover{box-shadow:0 6px 20px rgba(0,0,0,.1)}
 a.card .cat{display:inline-block;font-size:11.5px;font-weight:800;color:#6D4CFF;background:#F4F0FF;border-radius:99px;padding:3px 10px;margin-bottom:9px}
 a.card b{display:block;font-size:15px;line-height:1.45;margin-bottom:8px}
 a.card .m{font-size:12.5px;color:#8B95A1}
</style></head><body>
<div class="w">
 <h1>Flik 다양성 테스트 — 신규 상품</h1>
 <p class="sub">기존 테스트 상품을 쓰지 않고 전부 새로 만든 가상 상품입니다. 전부 블로그형 8섹션.<br>
 각 페이지 상단에서 <b>셀러가 입력한 상품정보</b>를 펼쳐 볼 수 있습니다.<br>
 렌더 규칙은 ResultScreen 다운로드 경로와 동일 — 센터 정렬(260자 이하)·강조 마킹·테마색 반영.</p>
 <div class="grid">
${done.map(d => `  <a class="card" href="${encodeURIComponent(d.key)}/index.html">
   <span class="cat">${esc(d.cat)}</span>
   <b>${esc(d.key.replace(/^\d+-[^-]+-/, ''))}</b>
   <span class="m">${d.sections}섹션 · 이미지 ${d.images}장</span>
  </a>`).join('\n')}
 </div>
</div></body></html>`;
fs.writeFileSync(path.join(OUT_ROOT, 'index.html'), index);
console.log(`\n완료 — ${done.length}개\n열기: open ${path.relative(ROOT, path.join(OUT_ROOT, 'index.html'))}`);
