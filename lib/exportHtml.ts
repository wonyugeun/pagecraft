/**
 * 내보내기 HTML 조립 — 서버·클라이언트 공용 순수 함수(2026-08-01).
 *
 * ★왜 lib으로 옮겼나: 다운로드 게이트가 브라우저 안에만 있어서 무력했다.
 *   서버는 "권한 있음/없음"만 알려주고 파일은 브라우저가 만들었기 때문에,
 *   개발자도구로 그 판정을 바꾸면 체험 계정도 결과물을 받아갈 수 있었다.
 *   조립을 서버(/api/export/html)로 옮겨 '권한을 통과해야 파일이 나오는' 구조로 바꾼다.
 *
 * ★이 파일은 DOM에 의존하지 않는다 — 이미지 압축(canvas)과 파일 저장은 브라우저에 남고,
 *   여기서는 이미 압축된 data URL을 받아 문자열만 만든다.
 *
 * ⚠️화면 렌더(ResultScreen)와 규칙이 어긋나면 '보던 것과 다른 파일'이 나간다.
 *   센터 정렬(body 260자 이하)·강조 마킹·섹션 태그·테마색은 화면과 같은 기준을 쓴다.
 */
import type { Block } from '@/store/AppContext';
import { assignBlockVariants, scrubPriceBlocks, variantsForSection, type BlockVariant } from '@/lib/blockLayout';
import { isCenteredSection, limitPageAccent } from '@/lib/pageAccent';
import { assignSectionLayouts } from '@/lib/sectionLayout';
import { compareColumns } from '@/components/result/BlockRenderer';

export interface ExportSection {
  num: string;
  name?: string;
  headline: string;
  subcopy?: string;
  body?: string;
  blocks?: Block[];
  imageLabel?: string;
  visual?: { primary_color?: string; soft_color?: string; soft_border?: string; accent_color?: string };
}
export type PurchaseInfo = { ico: string; label: string; value: string }[];


/* ─── HTML 이스케이프 ─── */
export function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;');
}

export const HTML_BLOCKS_CSS = `
:root { color-scheme: light; }
.hero { margin-bottom: 32px; }
.hero h1 { font-size: 34px; font-weight: 900; line-height: 1.35; letter-spacing: -0.04em; color: #111; }
.hero-sub { margin-top: 20px; font-size: 16px; line-height: 1.9; color: #666; white-space: pre-line; }
.heading { margin: 40px 0 16px; border-left: 4px solid var(--p,#6D4CFF); padding-left: 12px; font-size: 21px; font-weight: 700; line-height: 1.45; letter-spacing: -0.03em; color: #111; }
.paragraph { margin-bottom: 24px; font-size: 16px; line-height: 1.9; color: #666; white-space: pre-line; }

/* ★리디자인(2026-08-04) — 박스·색 카드 제거, 헤어라인 행(화면과 동일) */
.checklist { list-style: none; margin-bottom: 32px; }
.checklist li { display: flex; gap: 11px; font-size: 15px; line-height: 1.65; color: #333; padding: 13px 2px; border-top: 1px solid #F1F1F4; }
.checklist li::before { content: '\\2713'; color: var(--p,#6D4CFF); font-weight: 700; flex-shrink: 0; }

.steps { list-style: none; margin-bottom: 32px; display: flex; flex-direction: column; gap: 10px; }
.steps li { display: flex; gap: 14px; border-radius: 14px; background: #FAFAFC; padding: 16px 17px; }
.step-num { width: 26px; height: 26px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; border-radius: 8px; background: var(--p,#6D4CFF); color: #fff; font-size: 12.5px; font-weight: 700; }
.steps li strong { display: block; font-size: 15px; font-weight: 700; color: #111; }
.steps li p { margin-top: 4px; font-size: 14px; line-height: 1.7; color: #666; }

.iconcards { margin-bottom: 32px; display: grid; gap: 10px; }
.iconcard { border-radius: 14px; background: #FAFAFC; padding: 18px 17px; text-align: left; }
.iconcard-icon { margin: 0 0 10px; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; border-radius: 9px; background: var(--soft,#F4F0FF); color: var(--p,#6D4CFF); font-size: 14px; }
.iconcard strong { display: block; font-size: 14px; font-weight: 700; color: #111; }
.iconcard p { margin-top: 4px; font-size: 13px; line-height: 1.55; color: #666; }

.stats { margin-bottom: 32px; display: grid; column-gap: 28px; row-gap: 24px; }
/* ★리디자인(2026-08-04) — 테두리 카드·아이콘 원 제거. 얇은 포인트 윗줄 + 큰 잉크색 숫자(화면과 동일). */
.stat { padding-top: 14px; text-align: left; border-top: 2px solid var(--p,#6D4CFF); }
.stat strong { display: block; font-size: 30px; font-weight: 800; letter-spacing: -0.04em; color: #191F28; line-height: 1.15; }
.stat small { margin-top: 7px; display: block; font-size: 13px; font-weight: 600; color: #6B7684; line-height: 1.5; }

.compare { width: 100%; border-collapse: collapse; margin-bottom: 32px; border: 1px solid #F1F1F4; border-radius: 14px; overflow: hidden; font-size: 14px; }
.compare th, .compare td { padding: 16px; text-align: center; }
.compare th { background: #FAFAFC; font-weight: 700; color: #111; }
.compare th.hilite { background: var(--p,#6D4CFF); color: #fff; }
.compare td { border-top: 1px solid #ECECF2; }
.compare td.firstcol { font-weight: 500; color: #111; }
.compare td.hilite { background: var(--soft,#FBFAFF); font-weight: 700; color: var(--p,#6D4CFF); }
.compare .check { display: block; margin: 0 auto 4px; color: var(--p,#6D4CFF); font-weight: 900; }

.quote { margin-bottom: 32px; border-left: 2px solid var(--p,#6D4CFF); padding: 4px 0 4px 20px; }
.quote-icon { display: none; }
.quote p { font-size: 16px; line-height: 1.85; color: #333; white-space: pre-line; }
.quote footer { margin-top: 16px; display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.quote .stars { color: var(--p,#6D4CFF); font-size: 14px; letter-spacing: 2px; }
.quote .author { font-size: 13px; color: #666; }
.quote-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 32px; align-items: stretch; }
.quote-grid .quote-compact { margin-bottom: 0; padding: 18px; height: 100%; display: flex; flex-direction: column; background: #FAFAFC; border-radius: 12px; }
.quote-grid .quote-compact p { font-size: 15px; line-height: 1.7; flex-grow: 1; }
@media (max-width: 560px) { .quote-grid { grid-template-columns: 1fr; } }

.faq { margin-bottom: 32px; }
.faq dt { padding: 18px 2px 0; font-size: 15px; font-weight: 700; color: #111; border-top: 1px solid #F1F1F4; }
.faq dt::before { content: 'Q'; color: var(--p,#6D4CFF); margin-right: 10px; }
.faq dd { padding: 8px 2px 18px 24px; font-size: 14px; line-height: 1.75; color: #666; }

.image { margin: 0 0 32px; overflow: hidden; border-radius: 24px; border: 1px solid #ECECF2; background: #FAFAFC; }
.image img { width: 100%; height: 100%; display: block; }
.image-slot { margin-bottom: 32px; width: 100%; background: linear-gradient(135deg,var(--soft,#F4F0FF),#fff,#FAFAFC); border-radius: 24px; border: 1px solid #ECECF2; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700; color: var(--p,#6D4CFF); }

/* ★리디자인(2026-08-04) — 파스텔 라운드 박스 → 잉크 패널(화면과 동일) */
.cta { border-radius: 20px; background: #191F28; padding: 44px 36px; text-align: center; margin-bottom: 32px; }
.cta h2 { font-size: 28px; font-weight: 800; line-height: 1.3; letter-spacing: -0.03em; color: #fff; }
.cta-close { margin-top: 24px; font-size: 16px; font-weight: 700; color: rgba(255,255,255,0.85); letter-spacing: -0.2px; display: inline-block; border-top: 1px solid rgba(255,255,255,0.18); padding-top: 20px; min-width: 200px; }

/* ★생김새 수식자(2026-08-02) — 내용과 페이지 흐름이 고른다(lib/blockLayout).
   ⚠️어느 조합에서도 읽히기만 하면 된다. 화려함이 아니라 '같아 보이지 않기'가 목적이다. */
.stats.v-solo { display: block; border: none; padding: 0; }
.stats.v-solo .stat { border: none; background: transparent; padding: 6px 0 0; text-align: left; }
.stats.v-solo .stat strong { font-size: 40px; letter-spacing: -0.04em; }
.stats.v-solo .stat small { font-size: 15px; color: #666; margin-top: 8px; }
.stats.v-stack { display: block; border-top: 1px solid var(--sb,#E6DEFF); }
.stats.v-stack .stat { display: flex; align-items: baseline; gap: 14px; text-align: left;
  border: none; border-bottom: 1px solid var(--sb,#E6DEFF); border-radius: 0; background: transparent; padding: 15px 2px; }
.stats.v-stack .stat strong { font-size: 22px; flex-shrink: 0; min-width: 30%; }
.stats.v-stack .stat small { margin-top: 0; color: #555; }
.stats.v-rail { grid-template-columns: repeat(2, 1fr) !important; row-gap: 12px; }
.stats.v-rail .stat { border: none; background: var(--sf,#F7F6FD); border-radius: 14px; padding: 16px 12px; }

.iconcards.v-stack { grid-template-columns: 1fr !important; }
.iconcards.v-stack .iconcard { display: grid; grid-template-columns: 34px 1fr; align-items: start;
  column-gap: 14px; text-align: left; padding: 18px; }
.iconcards.v-stack .iconcard-icon { margin: 0; }
.iconcards.v-stack .iconcard p { grid-column: 2; }
.iconcards.v-plain .iconcard { border: none; background: transparent; padding: 10px 0; }
.iconcards.v-plain .iconcard-icon { display: none; }
.iconcards.v-plain .iconcard strong { font-size: 15px; }

.steps.v-rail { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
.steps.v-rail li { display: block; padding: 15px 16px; }
.steps.v-rail .step-num { display: inline-block; margin-bottom: 7px; }
.steps.v-flow li { border: none; background: transparent; border-left: 2px solid var(--sb,#E6DEFF);
  border-radius: 0; padding: 6px 0 18px 20px; margin-left: 9px; gap: 12px; }
.steps.v-flow .step-num { margin-left: -31px; }

.checklist.v-rail { display: grid; grid-template-columns: repeat(2, 1fr); column-gap: 18px; }

@media (max-width: 520px) {
  .stats.v-rail, .steps.v-rail, .checklist.v-rail { grid-template-columns: 1fr !important; }
  .stats.v-solo .stat strong { font-size: 32px; }
}
`;

/* ─── 블록 → HTML 변환 (블로그형 blocks 모드) ─── */
export function blocksToHtml(
  blocks: Block[],
  sectionNum: string,
  blockImageUrls: Record<string, string>,
  blockAspects: Record<string, string> = {},
  /** ★생김새 수식자(2026-08-02) — 없으면 내용만 보고 정한다(lib/blockLayout 참고).
   *  페이지 전체 리듬까지 반영하려면 assignBlockVariants 결과를 넘긴다. */
  variants?: BlockVariant[],
): string {
  blocks = scrubPriceBlocks(blocks);   // ★가격·할인 KPI 카드 제거 — 화면(BlockRenderer)과 동일 규칙
  const vs = variants ?? variantsForSection(blocks);
  const vc = (i: number) => (vs[i] ? ` v-${vs[i]}` : '');
  // ★후기 카드 그리드(2026-07-27): 연속 quote 2개 이상 → 2열 그리드(화면 BlockRenderer와 동일 규칙)
  const quoteRunLen: Record<number, number> = {};
  const quoteRunFollower = new Set<number>();
  for (let qi = 0; qi < blocks.length; qi++) {
    if (blocks[qi].type !== 'quote' || quoteRunFollower.has(qi) || quoteRunLen[qi]) continue;
    let qj = qi;
    while (qj + 1 < blocks.length && blocks[qj + 1].type === 'quote') qj++;
    if (qj > qi) { quoteRunLen[qi] = qj - qi + 1; for (let qk = qi + 1; qk <= qj; qk++) quoteRunFollower.add(qk); }
  }
  const quoteHtml = (b: Extract<Block, { type: 'quote' }>, compact = false) => {
    const stars = typeof b.rating === 'number' && b.rating > 0 ? Math.min(5, Math.max(0, Math.round(b.rating))) : 0;
    return `<blockquote class="quote${compact ? ' quote-compact' : ''}">
  <div class="quote-icon">&ldquo;</div>
  <p>${escHtml(b.text)}</p>
  <footer>
    ${stars > 0 ? `<span class="stars">${'★'.repeat(stars)}${'☆'.repeat(5 - stars)}</span>` : '<span></span>'}
    ${b.author ? `<span class="author">${escHtml(b.author)}</span>` : ''}
  </footer>
</blockquote>`;
  };
  return blocks.map((b, i) => {
    switch (b.type) {
      case 'hero':
        return `<header class="hero">
  <h1>${escHtml(b.title).replace(/\n/g, '<br>')}</h1>
  ${b.subtitle ? `<p class="hero-sub">${escHtml(b.subtitle).replace(/\n/g, '<br>')}</p>` : ''}
</header>`;
      case 'heading':
        return `<h2 class="heading">${escHtml(b.text).replace(/\n/g, '<br>')}</h2>`;
      case 'paragraph':
        return `<p class="paragraph">${escHtml(b.text)}</p>`;
      case 'checklist':
        return `<ul class="checklist${vc(i)}">${b.items.map(it => `<li>${escHtml(it)}</li>`).join('')}</ul>`;
      case 'steps':
        return `<ol class="steps${vc(i)}">${b.items.map((s, idx) => `<li>
  <span class="step-num">${idx + 1}</span>
  <div><strong>${escHtml(s.title)}</strong>${s.desc ? `<p>${escHtml(s.desc)}</p>` : ''}</div>
</li>`).join('')}</ol>`;
      case 'iconcards': {
        const cols = b.cards.length >= 4 ? 4 : Math.max(2, b.cards.length);
        const colStyle = vs[i] === 'stack' ? '' : ` style="grid-template-columns:repeat(${cols},1fr);"`;
        return `<div class="iconcards${vc(i)}"${colStyle}>${b.cards.map(c => `<div class="iconcard">
  <div class="iconcard-icon">✦</div>
  <strong>${escHtml(c.title)}</strong>
  ${c.desc ? `<p>${escHtml(c.desc)}</p>` : ''}
</div>`).join('')}</div>`;
      }
      case 'stats': {
        const wide = vs[i] === 'stack' || vs[i] === 'solo';
        const colStyle = wide ? '' : ` style="grid-template-columns:repeat(${b.items.length},1fr);"`;
        return `<div class="stats${vc(i)}"${colStyle}>${b.items.map(s => `<div class="stat">
  <strong>${escHtml(s.value)}</strong>
  <small>${escHtml(s.label)}</small>
</div>`).join('')}</div>`;
      }
      case 'compare': {
        const { ourIdx } = compareColumns(b.headers);  // 우리 제품 컬럼을 데이터로 판정해 강조(화면과 동일)
        return `<table class="compare">
  <thead><tr>${b.headers.map((h, idx) => `<th class="${idx === ourIdx ? 'hilite' : ''}">${escHtml(h)}</th>`).join('')}</tr></thead>
  <tbody>${b.rows.map(row => `<tr>${row.map((cell, idx) => `<td class="${idx === ourIdx ? 'hilite' : idx === 0 ? 'firstcol' : ''}">${idx === ourIdx ? '<span class="check">✓</span>' : ''}${escHtml(cell)}</td>`).join('')}</tr>`).join('')}</tbody>
</table>`;
      }
      case 'quote': {
        if (quoteRunFollower.has(i)) return '';   // 런 후속 — 시작 인덱스에서 그리드로 함께 출력
        const runLen = quoteRunLen[i];
        if (runLen) {
          const run = blocks.slice(i, i + runLen).filter((qb): qb is Extract<Block, { type: 'quote' }> => qb.type === 'quote');
          return `<div class="quote-grid">${run.map(qb => quoteHtml(qb, true)).join('\n')}</div>`;
        }
        return quoteHtml(b);
      }
      case 'faq':
        return `<dl class="faq">${b.items.map(f => `<dt>Q. ${escHtml(f.q)}</dt>
<dd>${escHtml(f.a)}</dd>`).join('')}</dl>`;
      case 'image': {
        const key = `${sectionNum}#${i}`;
        const url = blockImageUrls[key];
        const cssAspect = (blockAspects[key] ?? '1:1').replace(':', '/');
        const imgStyle = `aspect-ratio:${cssAspect};object-fit:contain;`;
        // ★이미지 없는 블록은 스킵(슬롯 플레이스홀더 미노출) — 셀러 결과물에 내부 안내 요소 0.
        return url
          ? `<figure class="image" style="aspect-ratio:${cssAspect};"><img src="${url}" alt="${escHtml(b.label)}" style="${imgStyle}" /></figure>`
          : '';
      }
      case 'cta':
        // ⚠️가짜 버튼 제거(2026-07-21) — 클릭 안 되는 '구매하기' 모양 요소는 기만 소지. 마감 문구로만.
        return `<div class="cta">
  <h2>${escHtml(b.text).replace(/\n/g, '<br>')}</h2>
  ${b.button ? `<p class="cta-close">${escHtml(b.button)}</p>` : ''}
</div>`;
      default:
        return '';
    }
  }).join('\n');
}

/* ─── 디자인 블록 판정 — 섹션 role 미보유라 name 키워드 + 블록 타입으로 Problem/Feature 분류.
   Hero(첫)·CTA(끝)·Comparison(compare 블록)은 제외(이미 전용 디자인). 색은 BlogSection이 테마로 주입. ─── */
const PROBLEM_KEYS = ['공감', '고민', '일상', '불편', '걱정', '망설'];
const FEATURE_KEYS = ['솔루션', '해결', '성분', '제형', '특징', '효능', '원료'];
export function sectionDesignKind(sec: ExportSection, isFirst: boolean, isLast: boolean): 'problem' | 'feature' | null {
  if (isFirst || isLast) return null;
  if (sec.blocks?.some((b: Block) => b.type === 'compare')) return null; // Comparison 영역
  // ⚠️섹션 이름(역할)만으로 판정. 블록 타입 폴백은 원인/후기/신뢰를 오태깅하므로 쓰지 않음.
  const name = (sec.name ?? '').toLowerCase();
  const hit = (keys: string[]) => keys.some(k => name.includes(k.toLowerCase()));
  if (hit(PROBLEM_KEYS)) return 'problem';
  if (hit(FEATURE_KEYS)) return 'feature';
  return null;
}
/** 슬라이드형 — 텍스트가 이미지에 합성돼 있어 이미지만 세로로 쌓는다(여백 0). */
export function buildSlideExportHtml(
  sections: ExportSection[], meta: string, productName: string,
  compressed: Record<string, string>,
): string {
  const imgsHtml = sections
    .map(sec => compressed[sec.num]
      ? `  <img src="${compressed[sec.num]}" alt="${escHtml(sec.imageLabel ?? '')}" style="width:100%;display:block;margin:0;padding:0;" />`
      : '')
    .filter(Boolean)
    .join('\n');
    const slideHtml = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escHtml(productName || '상세페이지')}</title>
  <style>* { margin: 0; padding: 0; box-sizing: border-box; } body { max-width: 860px; margin: 0 auto; background: #fff; font-size: 0; }</style>
</head>
<body>
  <!-- Flik 생성 · ${escHtml(meta)} -->
${imgsHtml}
</body>
</html>`;
  return slideHtml;
}

/** 블로그형 — 카피·블록·이미지를 화면과 같은 규칙으로 조립한다. */
export function buildBlogExportHtml(
  sections: ExportSection[], meta: string, productName: string,
  compressedSectionUrls: Record<string, string>,
  compressedBlockUrls: Record<string, string>,
  blockAspectMap: Record<string, string>,
  purchaseInfo?: PurchaseInfo,
): string {
  // 제품 테마색(visualPalette) — 다운로드도 화면과 같은 색. CSS 변수로 주입(보라 폴백).
  const themeV = sections.find(s => s.visual)?.visual;
  const cP = themeV?.primary_color ?? '#6D4CFF';
  const cSoft = themeV?.soft_color ?? '#F4F0FF';
  const cSB = themeV?.soft_border ?? '#E6DEFF';

  /* ★페이지 전체를 한 번 보고 블록 생김새를 정한다(2026-08-02) — 청크가 병렬이라
     모델은 페이지 전체를 못 본다. 같은 모양이 줄줄이 이어지는 걸 아는 건 코드뿐이다. */
  const pageVariants = assignBlockVariants(sections.map(sc => sc.blocks ?? []));
  /* 포인트 컬러는 페이지에 한 곳만 — 카피 청크가 병렬이라 모델은 옆 섹션을 모른다.
     페이지 전체를 보는 건 여기뿐이므로 여기서 정리한다(문장은 지우지 않고 괄호만 벗긴다). */
  const accentBodies = limitPageAccent(sections.map(sc => sc.body ?? ''));
  /* 섹션 뼈대도 페이지 흐름이 정한다 — 16개가 전부 '제목 → 이미지 → 본문'이면
     블록·정렬을 아무리 바꿔도 같은 페이지로 읽힌다(2026-08-03). */
  const layouts = assignSectionLayouts(sections.map(sc => sc.name ?? ''));

  const sectionsHtml = sections.map((sec, idx) => {
    // Problem/Feature 태그 — 텍스트로(SEO), 색은 제품 테마(sec.visual)
    const kind = sectionDesignKind(sec, idx === 0, idx === sections.length - 1);
    const tPrimary = sec.visual?.primary_color ?? '#6D4CFF';
    const tSoft = sec.visual?.soft_color ?? '#F4F0FF';
    const tBorder = sec.visual?.soft_border ?? '#E6DEFF';
    const tag = kind
      ? `\n      <span class="sec-tag" style="background:${tSoft};border:1px solid ${tBorder};color:${tPrimary};">${kind === 'problem' ? '이런 고민, 있으셨나요?' : '이렇게 해결합니다'}</span>`
      : '';
    // 카피(headline + subcopy + body)는 분기 무관 항상 포함 — 화면 렌더와 동일하게 카피 소실 방지.
    const head = `<h2>${escHtml(sec.headline).replace(/\n/g, '<br>')}</h2>`;
    const markHtml = (t: string) => escHtml(t)
      .replace(/\*\*([\s\S]+?)\*\*/g, '<b>$1</b>')
      .replace(/\(\(([\s\S]+?)\)\)/g, `<em style="font-style:normal;font-weight:700;color:${sec.visual?.accent_color ?? cP};">$1</em>`);
    const sub = sec.subcopy ? `\n      <p class="subcopy">${markHtml(sec.subcopy)}</p>` : '';
    // body: 이중 줄바꿈(\n\n)=문단, 단일 줄바꿈(\n)=<br>(붙여서). 화면 렌더와 동일한 v5 호흡.
    const secBody = accentBodies[idx];
    const bodyHtml = secBody
      ? '\n      ' + secBody.split(/\n{2,}/).map(p => p.trim()).filter(Boolean)
          .map(p => `<p class="bodytext">${p.split('\n').map(l => markHtml(l.trim())).join('<br>')}</p>`)
          .join('\n      ')
      : '';
    // 섹션 대표 이미지(base64 임베드) — 블록 유무 무관 카피 아래에 노출(화면과 동일: 본문→이미지→블록).
    const secImgUrl = compressedSectionUrls[sec.num];
    const lay = layouts[idx];
    // bleed = 좌우 패딩(48px)을 뚫고 화면 끝까지. 그 외에는 줄이지 않는다(compact 폐기 2026-08-03)
    const imgStyleBySec = lay === 'bleed'
      ? 'width:calc(100% + 96px);max-width:none;display:block;margin:28px -48px;border-radius:0;'
      : 'width:100%;max-width:860px;display:block;margin:24px auto;border-radius:16px;';
    const imgTag = secImgUrl
      ? `\n      <img src="${secImgUrl}" alt="${escHtml(sec.imageLabel ?? '')}" style="${imgStyleBySec}" />`
      : '';
    // 화면 BlogSection과 동일하게 블록 컨테이너에 위 여백(36px) — 이미지-KPI/블록이 딱 붙지 않게.
    const blocksHtml = sec.blocks?.length
      ? `\n      <div style="padding-top:36px;">\n${blocksToHtml(sec.blocks, sec.num, compressedBlockUrls, blockAspectMap, pageVariants[idx])}\n      </div>`
      : '';
    // ★구매 정보 스트립(2026-07-27) — 마지막 섹션에서 블록 위에 노출(화면 BlogSection과 동일 위치)
    const stripHtml = (idx === sections.length - 1 && purchaseInfo?.length)
      ? `\n      <div style="display:grid;grid-template-columns:repeat(${Math.min(purchaseInfo.length, 4)},1fr);gap:10px;margin-top:32px;">${purchaseInfo.map(it =>
          `<div style="background:${tSoft};border:1px solid ${tBorder};border-radius:12px;padding:14px 10px;text-align:center;"><div style="font-size:20px;margin-bottom:6px;">${it.ico}</div><div style="font-size:11px;font-weight:700;color:${tPrimary};margin-bottom:3px;">${escHtml(it.label)}</div><div style="font-size:12.5px;font-weight:600;color:#333;line-height:1.4;word-break:keep-all;">${escHtml(it.value)}</div></div>`).join('')}</div>`
      : '';
    /* ★샌드위치 배치(2026-07-27): 헤드라인 → 이미지 → 본문.
       정렬은 길이가 아니라 역할이 정한다(2026-08-02) — 260자 기준이던 때는 실제 본문이 128~220자라
       사실상 전 섹션이 가운데였고, 설명하는 글까지 가운데로 흘러 청첩장처럼 읽혔다. */
    const centered = isCenteredSection(sec.name ?? '', sec.body ?? '', idx === 0, idx === sections.length - 1);
    // textfirst = 글로 먼저 걸고 사진으로 확인시킨다(공감·문제 제기형)
    const flow = lay === 'textfirst'
      ? `${head}${sub}${bodyHtml}${imgTag}`
      : `${head}${sub}${imgTag}${bodyHtml}`;
    return `\n    <section class="sec${centered ? ' sec-center' : ''}">${tag}\n      ${flow}${stripHtml}${blocksHtml}\n    </section>`;
  }).join('\n');
  const html = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escHtml(productName || '상세페이지')} — Flik</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css">
  <style>
  :root { --p: ${cP}; --soft: ${cSoft}; --sb: ${cSB}; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Pretendard', 'Apple SD Gothic Neo', 'Noto Sans KR', system-ui, -apple-system, sans-serif; background: #fff; color: #111; max-width: 800px; margin: 0 auto; padding: 0 0 80px; }
  .meta { background: #f8f9fa; padding: 12px 20px; font-size: 12px; color: #888; border-bottom: 1px solid #eee; }
  .sec { padding: 48px 48px 0; }
  .sec-blocks { padding-top: 0; padding-bottom: 0; }
  .sec-tag { display: inline-block; padding: 7px 14px; border-radius: 999px; font-size: 13px; font-weight: 700; letter-spacing: -0.2px; margin-bottom: 14px; }
  .sec h2 { font-size: 27px; font-weight: 800; text-align: left; line-height: 1.45; margin-bottom: 14px; letter-spacing: -0.5px; word-break: keep-all; }
  .sec .subcopy { font-size: 17px; font-weight: 600; text-align: left; line-height: 1.6; color: #5b5b66; margin: 0 0 18px; letter-spacing: -0.2px; }
  .sec .bodytext { font-size: 17px; line-height: 1.85; text-align: left; color: #34343c; margin: 0 0 15px; letter-spacing: -0.2px; word-break: keep-all; }
  .sec .bodytext:last-of-type { margin-bottom: 0; }
  .sec p { font-size: 15px; line-height: 2.1; text-align: left; color: #555; white-space: pre-line; }
  /* ★센터 정렬은 반드시 위 .sec 규칙들 '뒤'에 온다 — 특정도가 같아서(둘 다 클래스 2개)
     순서가 곧 승패다. 앞에 두면 .sec .subcopy / .sec .bodytext 가 다시 left로 덮어써서
     제목만 가운데 오고 본문은 왼쪽에 남는다(2026-08-01 유근님 발견). 위로 옮기지 말 것. */
  /* ★가운데 정렬은 카피(제목·서브·본문)에만(2026-08-04) — '.sec-center p'가 블록 내부(카드 설명·
     단계 설명·FAQ 답변)까지 끌고 가서 '제목 왼쪽 + 설명 가운데'로 어긋났다. 블록은 자기 정렬을 지킨다. */
  .sec-center h2, .sec-center .subcopy, .sec-center .bodytext { text-align: center; }
  .img-slot { width: 100%; aspect-ratio: 4/3; background: #f1f5f9; border: 2px dashed #cbd5e1; border-radius: 8px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; margin-bottom: 20px; }
  .img-slot img { width: 100%; border-radius: 8px; display: block; margin-bottom: 20px; }
  .img-icon { font-size: 36px; }
  .img-label { font-size: 14px; font-weight: 700; color: #64748b; }
  ${HTML_BLOCKS_CSS}
  </style>
</head>
<body>
  <!-- Flik 생성 · ${escHtml(meta)} -->
${sectionsHtml}
</body>
</html>`;
  return html;
}
