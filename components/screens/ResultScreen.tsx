'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useApp, Section, Block } from '@/store/AppContext';
import ResultMobile from './ResultMobile';
import { useIsMobile, MOBILE_BREAKPOINT } from '@/hooks/useIsMobile';
import { resolveOutputType } from '@/lib/outputType';
import { compressMap } from '@/lib/imageCompress';
import { CLEAN_IMAGE_BRIEF, buildSectionBrief } from '@/lib/adBrief';
import type { DirectorPlan } from '@/lib/stages/director';
import { selectRequiredAssetIndex, buildPlatePrompt, compositeRequiredAsset } from '@/lib/sectionReference';
import { friendlyGenerationError } from '@/lib/apiErrors';
import { classifyCutArchetype } from '@/lib/sectionArchetype';
import { runPool } from '@/lib/asyncPool';
import BlockRenderer, { HeroBlock, DEFAULT_THEME, compareColumns, Editable } from '@/components/result/BlockRenderer';
import { aspectRatioFor } from '@/lib/sectionAspect';
import {
  Sparkles, Smartphone, Monitor, Eye, GripVertical, Upload, RefreshCw,
  Type, Image as ImageIcon, ArrowUpDown, EyeOff,
} from 'lucide-react';

const DEFAULT_SECTIONS: Section[] = [
  {
    num: 'SECTION 01', name: '히어로 — 메인 후킹',
    headline: '🔥 피부과 원장이 직접 쓰는 토너, 이유가 있습니다',
    body: '자극받은 피부, 제주 병풀이 하루 만에 다독입니다. 민감하고 붉어진 피부에 청정 제주 병풀 추출물을 가득 담아, 바르는 순간부터 시원하고 촉촉한 진정감을 선사합니다.',
    imageLabel: '📸 메인 이미지 슬롯', imageDesc: '제품 클로즈업 · 클린 화이트 배경 · 수분 텍스처 강조',
  },
  {
    num: 'SECTION 02', name: '공감 — 피부 고민 제기',
    headline: '😔 바르면 따갑고, 안 바르면 당기고\n이 악순환, 나만의 이야기가 아니죠?',
    body: '마스크 착용 후 달아오르는 피부, 환절기마다 반복되는 트러블과 붉음증, 스킨케어 후에도 당기고 불편한 피부장벽 문제. 이제 이 고민을 함께 해결할게요.',
    imageLabel: '📸 감성 이미지 슬롯', imageDesc: '피부 고민 공감 타이포그래피 · 뉴트럴 배경',
  },
  {
    num: 'SECTION 03', name: '성분 신뢰 — 핵심 성분 강조',
    headline: '🌱 히알루론산 5중 복합체\n병풀 추출물 · EWG 그린등급',
    body: '제주 청정 지역에서 직접 재배한 병풀 추출물을 50% 고농도로 배합했습니다. 아시아티코사이드 등 4대 핵심 성분이 손상된 피부장벽을 강화하고 붉어진 피부를 빠르게 진정시킵니다.',
    imageLabel: '📸 성분 인포그래픽 슬롯', imageDesc: '성분 아이콘 + 설명 텍스트 배치',
  },
];

/* ─── HTML 이스케이프 ─── */
function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;');
}

/* 슬라이드 Hero 텍스트 방식 — false=baked(이미지에 합성, 현재 채택) / true=overlay(SlideHero 진짜폰트, 롤백용). */
const SLIDE_HERO_OVERLAY = false;

/* ─── 슬라이드 baked 텍스트 지시 — 헤드라인(+서브카피)을 이미지에 한글로 합성. GPT Image 2 한글 정확 활용.
   (overlay 보류: 텍스트를 진짜 폰트로 얹는 방식은 buildBakedText 대신 textZone 전송으로 롤백.) ─── */
export function buildBakedText(headline: string, subcopy?: string): string {
  const head = (headline ?? '').replace(/\n/g, ' ').trim();
  const sub = (subcopy ?? '').replace(/\n/g, ' ').trim();
  return [
    `Render the following Korean marketing copy as crisp, accurate, correctly-spelled text integrated naturally into the ad layout`,
    `(clean modern Korean sans-serif like Pretendard, perfectly legible, no garbled or broken glyphs).`,
    `Headline: "${head}"${sub ? `. Subcopy (smaller, lighter): "${sub}"` : ''}.`,
    `Only this copy as text — no other text, no logos, no numbers, no fabricated data.`,
  ].join(' ');
}

/** 아직 생성 중(loading)인 이미지 개수 — 다운로드 전 "생성 중" 가드용(섹션 대표 + image 블록). */
export function countGeneratingImages(
  sections: Section[],
  imgMap: Record<string, ImgState>,
  blockImgMap: Record<string, ImgState>,
): number {
  let n = 0;
  for (const sec of sections) {
    if (imgMap[sec.num]?.loading) n++;
    sec.blocks?.forEach((b, i) => {
      if (b.type === 'image' && blockImgMap[`${sec.num}#${i}`]?.loading) n++;
    });
  }
  return n;
}

/** 생성 중 이미지가 있으면 확인 — 완성분만 받을지/대기할지. true=진행, false=취소(대기). count 0이면 무조건 진행. */
export function confirmSkipGenerating(count: number): boolean {
  if (count <= 0) return true;
  return confirm(`아직 생성 중인 이미지가 ${count}개 있어요.\n지금 내려받으면 미완성 이미지는 제외돼요.\n\n[확인] 완성분만 다운로드   [취소] 생성 완료 후 다시 시도`);
}

/* ─── 통이미지 다운로드 ─── */
export async function downloadMergedImage(
  sections: Section[],
  imgMap: Record<string, ImgState>,
  blockImgMap: Record<string, ImgState>,
  productName: string,
): Promise<void> {
  // 슬라이드 Hero(overlay): 배경 위에 진짜 폰트 텍스트를 DOM 캡처로 '합성'해 1장 PNG로. (raw 배경엔 텍스트 없음)
  // modern-screenshot = 블로그 통이미지와 동일 엔진(Tailwind v4 oklch 대응). bs-actions(재생성 버튼)는 캡처 제외.
  let heroDataUrl: string | null = null;
  const heroNode = typeof document !== 'undefined' ? (document.querySelector('[data-slide-hero-capture]') as HTMLElement | null) : null;
  if (heroNode) {
    try {
      const { domToCanvas } = await import('modern-screenshot');
      const c = await domToCanvas(heroNode, {
        backgroundColor: '#ffffff', scale: 1,
        style: { width: '1080px', maxWidth: '1080px' },
        filter: (node: Node) => {
          if (!(node instanceof Element)) return true;
          const cls = typeof (node as HTMLElement).className === 'string' ? (node as HTMLElement).className : '';
          return !cls.includes('bs-actions');
        },
      });
      heroDataUrl = c.toDataURL('image/png');
    } catch (e) {
      console.warn('[downloadMergedImage] Hero overlay 캡처 실패 — raw 배경으로 폴백', e);
    }
  }

  const urls: string[] = [];
  let skipped = 0;
  sections.forEach((sec, secIdx) => {
    // 섹션 대표 이미지 — ★blocks 유무 무관 수집. (기존엔 blocks 있으면 대표 이미지를 건너뛰어,
    //  블록을 항상 가진 슬라이드 섹션이 전부 빠짐 = 통이미지 0장 무반응 버그의 원인)
    const own = (secIdx === 0 && heroDataUrl) ? heroDataUrl : imgMap[sec.num]?.url;
    if (own) urls.push(own);
    else skipped++;
    // image 타입 블록 이미지(블로그 호환) — 대표 이미지에 추가로
    sec.blocks?.forEach((b, i) => {
      if (b.type !== 'image') return;
      const url = blockImgMap[`${sec.num}#${i}`]?.url;
      if (url) urls.push(url);
    });
  });
  if (urls.length === 0) {
    alert('다운로드할 이미지가 없습니다. 섹션 이미지를 먼저 생성해주세요.');
    return;
  }
  if (skipped > 0) {
    alert(`이미지가 없는 ${skipped}개 섹션은 제외하고 ${urls.length}장을 합칩니다.`);
  }
  const imgs = await Promise.all(
    urls.map(url =>
      new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = url;
      })
    )
  );
  const OUTPUT_W = 1080;
  const heights = imgs.map(img => img.naturalWidth ? Math.round(img.naturalHeight * (OUTPUT_W / img.naturalWidth)) : 0);
  const totalH = heights.reduce((s, h) => s + h, 0);
  const canvas = document.createElement('canvas');
  canvas.width = OUTPUT_W;
  canvas.height = totalH;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, OUTPUT_W, totalH);
  let y = 0;
  for (let i = 0; i < imgs.length; i++) {
    ctx.drawImage(imgs[i], 0, y, OUTPUT_W, heights[i]);
    y += heights[i];
  }
  await new Promise<void>(resolve => {
    canvas.toBlob(blob => {
      if (!blob) { resolve(); return; }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${productName || 'flik'}_detail.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      resolve();
    }, 'image/png');
  });
}

/* ─── 블록 → HTML 변환 (블로그형 blocks 모드) ─── */
function blocksToHtml(
  blocks: Block[],
  sectionNum: string,
  blockImageUrls: Record<string, string>,
  blockAspects: Record<string, string> = {},
): string {
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
        return `<ul class="checklist">${b.items.map(it => `<li>${escHtml(it)}</li>`).join('')}</ul>`;
      case 'steps':
        return `<ol class="steps">${b.items.map((s, idx) => `<li>
  <span class="step-num">${idx + 1}</span>
  <div><strong>${escHtml(s.title)}</strong>${s.desc ? `<p>${escHtml(s.desc)}</p>` : ''}</div>
</li>`).join('')}</ol>`;
      case 'iconcards': {
        const cols = b.cards.length >= 4 ? 4 : Math.max(2, b.cards.length);
        return `<div class="iconcards" style="grid-template-columns:repeat(${cols},1fr);">${b.cards.map(c => `<div class="iconcard">
  <div class="iconcard-icon">✦</div>
  <strong>${escHtml(c.title)}</strong>
  ${c.desc ? `<p>${escHtml(c.desc)}</p>` : ''}
</div>`).join('')}</div>`;
      }
      case 'stats':
        return `<div class="stats" style="grid-template-columns:repeat(${b.items.length},1fr);">${b.items.map(s => `<div class="stat">
  <strong>${escHtml(s.value)}</strong>
  <small>${escHtml(s.label)}</small>
</div>`).join('')}</div>`;
      case 'compare': {
        const { ourIdx } = compareColumns(b.headers);  // 우리 제품 컬럼을 데이터로 판정해 강조(화면과 동일)
        return `<table class="compare">
  <thead><tr>${b.headers.map((h, idx) => `<th class="${idx === ourIdx ? 'hilite' : ''}">${escHtml(h)}</th>`).join('')}</tr></thead>
  <tbody>${b.rows.map(row => `<tr>${row.map((cell, idx) => `<td class="${idx === ourIdx ? 'hilite' : idx === 0 ? 'firstcol' : ''}">${idx === ourIdx ? '<span class="check">✓</span>' : ''}${escHtml(cell)}</td>`).join('')}</tr>`).join('')}</tbody>
</table>`;
      }
      case 'quote': {
        const stars = typeof b.rating === 'number' && b.rating > 0 ? Math.min(5, Math.max(0, Math.round(b.rating))) : 5;
        return `<blockquote class="quote">
  <div class="quote-icon">&ldquo;</div>
  <p>${escHtml(b.text)}</p>
  <footer>
    <span class="stars">${'★'.repeat(stars)}${'☆'.repeat(5 - stars)}</span>
    ${b.author ? `<span class="author">${escHtml(b.author)}</span>` : ''}
  </footer>
</blockquote>`;
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
        return `<div class="cta">
  <h2>${escHtml(b.text).replace(/\n/g, '<br>')}</h2>
  <a class="cta-btn">${escHtml(b.button)} →</a>
</div>`;
      default:
        return '';
    }
  }).join('\n');
}

// 색은 CSS 변수(--p 제품 primary / --soft / --sb soft-border)로. 다운로드 시 제품 테마로 치환됨(보라 폴백).
const HTML_BLOCKS_CSS = `
:root { color-scheme: light; }
.hero { margin-bottom: 32px; }
.hero h1 { font-size: 34px; font-weight: 900; line-height: 1.35; letter-spacing: -0.04em; color: #111; }
.hero-sub { margin-top: 20px; font-size: 16px; line-height: 1.9; color: #666; white-space: pre-line; }
.heading { margin: 40px 0 16px; border-left: 4px solid var(--p,#6D4CFF); padding-left: 12px; font-size: 21px; font-weight: 700; line-height: 1.45; letter-spacing: -0.03em; color: #111; }
.paragraph { margin-bottom: 24px; font-size: 16px; line-height: 1.9; color: #666; white-space: pre-line; }

.checklist { list-style: none; margin-bottom: 32px; border-radius: 24px; border: 1px solid #ECECF2; background: #fff; padding: 20px; }
.checklist li { display: flex; gap: 12px; font-size: 15px; line-height: 1.7; color: #333; padding: 6px 0; }
.checklist li::before { content: '\\2713'; color: var(--p,#6D4CFF); font-weight: 700; flex-shrink: 0; }

.steps { list-style: none; margin-bottom: 32px; display: flex; flex-direction: column; gap: 12px; }
.steps li { display: flex; gap: 16px; border-radius: 24px; border: 1px solid #ECECF2; background: #fff; padding: 20px; }
.step-num { width: 32px; height: 32px; flex-shrink: 0; display: inline-flex; align-items: center; justify-content: center; border-radius: 50%; background: var(--p,#6D4CFF); color: #fff; font-size: 14px; font-weight: 700; }
.steps li strong { display: block; font-size: 16px; font-weight: 700; color: #111; }
.steps li p { margin-top: 4px; font-size: 14px; line-height: 1.7; color: #666; }

.iconcards { margin-bottom: 32px; display: grid; gap: 12px; }
.iconcard { border-radius: 24px; border: 1px solid #ECECF2; background: #fff; padding: 20px; text-align: center; box-shadow: 0 8px 24px rgba(0,0,0,0.04); }
.iconcard-icon { margin: 0 auto 12px; width: 48px; height: 48px; display: flex; align-items: center; justify-content: center; border-radius: 50%; background: var(--soft,#F4F0FF); color: var(--p,#6D4CFF); font-size: 22px; }
.iconcard strong { display: block; font-size: 14px; font-weight: 700; color: #111; }
.iconcard p { margin-top: 4px; font-size: 13px; line-height: 1.5; color: #666; }

.stats { margin-bottom: 32px; display: grid; column-gap: 12px; }
.stat { padding: 22px 12px; text-align: center; border: 1px solid var(--sb,#E6DEFF); border-radius: 18px; background: #fff; }
.stat strong { display: block; font-size: 21px; font-weight: 800; letter-spacing: -0.03em; color: var(--p,#6D4CFF); line-height: 1.2; }
.stat small { margin-top: 6px; display: block; font-size: 13px; font-weight: 600; color: #333; line-height: 1.45; }

.compare { width: 100%; border-collapse: collapse; margin-bottom: 32px; border: 1px solid #ECECF2; border-radius: 24px; overflow: hidden; font-size: 14px; }
.compare th, .compare td { padding: 16px; text-align: center; }
.compare th { background: #FAFAFC; font-weight: 700; color: #111; }
.compare th.hilite { background: var(--p,#6D4CFF); color: #fff; }
.compare td { border-top: 1px solid #ECECF2; }
.compare td.firstcol { font-weight: 500; color: #111; }
.compare td.hilite { background: var(--soft,#FBFAFF); font-weight: 700; color: var(--p,#6D4CFF); }
.compare .check { display: block; margin: 0 auto 4px; color: var(--p,#6D4CFF); font-weight: 900; }

.quote { margin-bottom: 32px; border-radius: 24px; border: 1px solid var(--sb,#E6DEFF); background: var(--soft,#F4F0FF); padding: 24px; }
.quote-icon { font-size: 36px; line-height: 1; color: var(--p,#6D4CFF); font-family: Georgia, serif; margin-bottom: 8px; }
.quote p { font-size: 16px; line-height: 1.85; color: #333; white-space: pre-line; }
.quote footer { margin-top: 16px; display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.quote .stars { color: var(--p,#6D4CFF); font-size: 14px; letter-spacing: 2px; }
.quote .author { font-size: 13px; color: #666; }

.faq { margin-bottom: 32px; border-radius: 24px; border: 1px solid #ECECF2; background: #fff; overflow: hidden; }
.faq dt { padding: 20px 20px 8px; font-size: 15px; font-weight: 700; color: #111; }
.faq dd { padding: 0 20px 20px; font-size: 14px; line-height: 1.7; color: #666; border-bottom: 1px solid #ECECF2; }
.faq dd:last-child { border-bottom: none; }

.image { margin: 0 0 32px; overflow: hidden; border-radius: 24px; border: 1px solid #ECECF2; background: #FAFAFC; }
.image img { width: 100%; height: 100%; display: block; }
.image-slot { margin-bottom: 32px; width: 100%; background: linear-gradient(135deg,var(--soft,#F4F0FF),#fff,#FAFAFC); border-radius: 24px; border: 1px solid #ECECF2; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700; color: var(--p,#6D4CFF); }

.cta { border-radius: 24px; border: 1px solid var(--sb,#E6DEFF); background: var(--soft,#F4F0FF); padding: 32px; text-align: center; margin-bottom: 32px; }
.cta h2 { font-size: 24px; font-weight: 900; line-height: 1.45; letter-spacing: -0.04em; color: #111; }
.cta-btn { display: inline-flex; align-items: center; justify-content: center; margin-top: 24px; height: 48px; padding: 0 24px; border-radius: 16px; background: var(--p,#6D4CFF); color: #fff; font-size: 15px; font-weight: 700; text-decoration: none; }
`;

/* ─── HTML 다운로드 ─── */
export async function downloadHtml(
  sections: Section[],
  meta: string,
  productName: string,
  imgMap: Record<string, ImgState>,
  blockImgMap: Record<string, ImgState>,
  isSlide = false,   // 슬라이드형: 텍스트가 이미지에 baked → 이미지만 세로 스택(여백 0)
): Promise<boolean> {
  try {
    // ── 슬라이드형: 섹션당 <img>만, 카피/블록 렌더 전부 제외(이미 이미지에 합성됨) ──
    if (isSlide) {
      const rawUrls: Record<string, string> = {};
      for (const sec of sections) {
        const u = imgMap[sec.num]?.url;
        if (u) rawUrls[sec.num] = u;
      }
      const compressed = await compressMap(rawUrls);
      const imgsHtml = sections
        .map(sec => compressed[sec.num]
          ? `  <img src="${compressed[sec.num]}" alt="${escHtml(sec.imageLabel)}" style="width:100%;display:block;margin:0;padding:0;" />`
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
      const blob = new Blob([slideHtml], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(productName || 'flik').replace(/[/\\?%*:|"<>]/g, '_')}_detail.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      return true;
    }

    // 블록 이미지 압축본으로 추출 (800px / JPEG 0.7)
    const rawBlockUrls: Record<string, string> = {};
    for (const [k, st] of Object.entries(blockImgMap)) {
      if (st?.url) rawBlockUrls[k] = st.url;
    }
    const compressedBlockUrls = await compressMap(rawBlockUrls);

    // 블록 이미지 비율 맵 — 표시 시 비율 그대로 보존(잘림 0).
    const blockAspectMap: Record<string, string> = {};
    for (const [k, st] of Object.entries(blockImgMap)) {
      if (st?.aspectRatio) blockAspectMap[k] = st.aspectRatio;
    }

    // 섹션 대표 이미지도 압축본(base64 data URL)으로 임베드 — 파일 하나로 이미지까지 보이게.
    const rawSectionUrls: Record<string, string> = {};
    for (const [k, st] of Object.entries(imgMap)) {
      if (st?.url) rawSectionUrls[k] = st.url;
    }
    const compressedSectionUrls = await compressMap(rawSectionUrls);

    // 제품 테마색(visualPalette) — 다운로드도 화면과 같은 색. CSS 변수로 주입(보라 폴백).
    const themeV = sections.find(s => s.visual)?.visual;
    const cP = themeV?.primary_color ?? '#6D4CFF';
    const cSoft = themeV?.soft_color ?? '#F4F0FF';
    const cSB = themeV?.soft_border ?? '#E6DEFF';

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
      const sub = sec.subcopy ? `\n      <p class="subcopy">${escHtml(sec.subcopy)}</p>` : '';
      // body: 이중 줄바꿈(\n\n)=문단, 단일 줄바꿈(\n)=<br>(붙여서). 화면 렌더와 동일한 v5 호흡.
      const bodyHtml = sec.body
        ? '\n      ' + sec.body.split(/\n{2,}/).map(p => p.trim()).filter(Boolean)
            .map(p => `<p class="bodytext">${p.split('\n').map(l => escHtml(l.trim())).join('<br>')}</p>`)
            .join('\n      ')
        : '';
      // 섹션 대표 이미지(base64 임베드) — 블록 유무 무관 카피 아래에 노출(화면과 동일: 본문→이미지→블록).
      const secImgUrl = compressedSectionUrls[sec.num];
      const imgTag = secImgUrl
        ? `\n      <img src="${secImgUrl}" alt="${escHtml(sec.imageLabel)}" style="width:100%;max-width:860px;display:block;margin:20px auto 0;border-radius:16px;" />`
        : '';
      // 화면 BlogSection과 동일하게 블록 컨테이너에 위 여백(36px) — 이미지-KPI/블록이 딱 붙지 않게.
      const blocksHtml = sec.blocks?.length
        ? `\n      <div style="padding-top:36px;">\n${blocksToHtml(sec.blocks, sec.num, compressedBlockUrls, blockAspectMap)}\n      </div>`
        : '';
      return `\n    <section class="sec">${tag}\n      ${head}${sub}${bodyHtml}${imgTag}${blocksHtml}\n    </section>`;
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
    .sec h2 { font-size: 24px; font-weight: 700; text-align: left; line-height: 1.5; margin-bottom: 14px; letter-spacing: -0.4px; }
    .sec .subcopy { font-size: 17px; font-weight: 600; text-align: left; line-height: 1.6; color: #5b5b66; margin: 0 0 18px; letter-spacing: -0.2px; }
    .sec .bodytext { font-size: 16.5px; line-height: 1.85; text-align: left; color: #34343c; margin: 0 0 15px; letter-spacing: -0.2px; }
    .sec .bodytext:last-of-type { margin-bottom: 0; }
    .sec p { font-size: 15px; line-height: 2.1; text-align: left; color: #555; white-space: pre-line; }
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
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(productName || 'flik').replace(/[/\\?%*:|"<>]/g, '_')}_detail.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    return true;
  } catch (err) {
    console.error('[downloadHtml]', err);
    return false;
  }
}

/* ─── 썸네일 타입 ─── */
type ThumbTypeId = 'white' | 'concept' | 'text_overlay' | 'ref_copy';

const THUMB_TYPES: Array<{ id: ThumbTypeId; label: string; desc: string; prompt: string }> = [
  { id: 'white', label: '흰배경 단독컷', desc: '화이트 배경 · 제품 단독', prompt: '순백색 배경에 제품만 중앙에 배치한 이커머스 썸네일. 제품 형태가 선명하게 보이도록 고른 조명 처리.' },
  { id: 'concept', label: '컨셉컷', desc: '브랜드 무드 배경 합성', prompt: '브랜드 무드와 카테고리에 어울리는 감성 배경에 제품을 자연스럽게 합성한 이커머스 썸네일. 색감과 분위기를 제품과 조화롭게 연출.' },
  { id: 'text_overlay', label: '텍스트오버레이컷', desc: '핵심 카피 텍스트 강조', prompt: '제품 이미지 위에 한국어 핵심 카피를 굵은 폰트로 오버레이한 이커머스 썸네일. 고대비 배경과 명확한 가독성 강조.' },
  { id: 'ref_copy', label: '레퍼런스 카피컷', desc: '레퍼런스 스타일 참고', prompt: '업로드된 레퍼런스 이미지의 레이아웃·색감·구도를 참고하여 제품에 맞게 재해석한 이커머스 썸네일.' },
];

const THUMB_SIZES: Record<string, string> = {
  '스마트스토어': '1000×1000',
  '쿠팡': '1000×1000',
  '와디즈': '1200×675',
  '자사몰': '1200×630',
};

/* ─── 이미지 상태 ─── */
export type ImgState = { loading: boolean; url: string | null; error: boolean; errorMsg?: string; aspectRatio?: string };
export const EMPTY_IMG: ImgState = { loading: false, url: null, error: false };

/* ─── 향상된 라이트박스 (prev/next + keyboard) ─── */
export function EnhancedLightbox({ items, initialIndex, onClose }: {
  items: { url: string; alt: string }[];
  initialIndex: number;
  onClose: () => void;
}) {
  const [idx, setIdx] = useState(initialIndex);

  useEffect(() => { setIdx(initialIndex); }, [initialIndex]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft') setIdx(p => Math.max(0, p - 1));
      else if (e.key === 'ArrowRight') setIdx(p => Math.min(items.length - 1, p + 1));
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length, onClose]);

  const item = items[idx];
  if (!item) return null;

  const arrowBtn: React.CSSProperties = {
    position: 'absolute', top: '50%', transform: 'translateY(-50%)',
    width: 48, height: 48, borderRadius: '50%',
    background: 'rgba(255,255,255,.15)', border: '1px solid rgba(255,255,255,.25)',
    color: '#fff', fontSize: 24, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: 'var(--f)', transition: 'background .15s',
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.9)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '56px 72px 40px' }}
      onClick={onClose}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={item.url} alt={item.alt}
        style={{ maxWidth: '100%', maxHeight: '82vh', borderRadius: 8, boxShadow: '0 8px 48px rgba(0,0,0,.6)', display: 'block', objectFit: 'contain' }}
        onClick={e => e.stopPropagation()}
      />
      <button onClick={onClose} aria-label="닫기" style={{ position: 'absolute', top: 16, right: 20, fontSize: 28, color: '#fff', background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1, fontFamily: 'var(--f)', padding: 4 }}>✕</button>
      {items.length > 1 && (
        <div style={{ position: 'absolute', top: 18, left: '50%', transform: 'translateX(-50%)', fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,.8)', background: 'rgba(0,0,0,.4)', padding: '4px 14px', borderRadius: 20, pointerEvents: 'none' }}>
          {idx + 1} / {items.length}
        </div>
      )}
      {idx > 0 && (
        <button aria-label="이전" onClick={e => { e.stopPropagation(); setIdx(p => Math.max(0, p - 1)); }} style={{ ...arrowBtn, left: 14 }}>‹</button>
      )}
      {idx < items.length - 1 && (
        <button aria-label="다음" onClick={e => { e.stopPropagation(); setIdx(p => Math.min(items.length - 1, p + 1)); }} style={{ ...arrowBtn, right: 14 }}>›</button>
      )}
    </div>
  );
}

/* ─── 이미지 슬롯 ─── */
function ImgSlot({
  sec, imgState, onGenerate,
  slotStyle, labelColor = '#64748b', descColor = '#94a3b8', genBg = '#e0f2fe',
  onLightbox,
}: {
  sec: Section;
  imgState: ImgState;
  onGenerate: () => void;
  slotStyle: React.CSSProperties;
  labelColor?: string;
  descColor?: string;
  genBg?: string;
  onLightbox?: () => void;
}) {
  const { loading, url, error } = imgState;

  if (url) {
    return (
      <div className="img-regen-wrap" style={{ ...slotStyle, height: 'auto', padding: 0, position: 'relative', display: 'flex', justifyContent: 'center', background: '#f8fafc' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url} alt={sec.imageLabel}
          style={{ width: '100%', maxWidth: 860, height: 'auto', objectFit: 'contain', display: 'block', cursor: onLightbox ? 'zoom-in' : 'default' }}
          onClick={onLightbox}
        />
        <button
          className="img-regen-overlay"
          onClick={e => { e.stopPropagation(); onGenerate(); }}
          aria-label="이미지 재생성"
        ><Sparkles size={12} /> 재생성</button>
      </div>
    );
  }

  return (
    <div
      className="img-slot-empty"   /* ★미생성/실패/생성중 슬롯 — export 캡처에서 제외(셀러 결과물에 빈 슬롯 안 들어가게) */
      onClick={loading ? undefined : onGenerate}
      style={{ ...slotStyle, cursor: loading ? 'default' : 'pointer', transition: 'background .15s' }}
      title={loading ? '생성 중...' : '클릭하면 AI 이미지 재생성'}
    >
      {loading ? (
        <>
          <div style={{ width: 32, height: 32, border: '3px solid #cbd5e1', borderTopColor: '#6D4CFF', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <div style={{ fontSize: 12, color: labelColor, marginTop: 6 }}>이미지 생성 중...</div>
        </>
      ) : (
        <>
          <div style={{ fontSize: 28 }}>📸</div>
          <div style={{ fontSize: 12, fontWeight: 700, color: labelColor }}>{sec.imageLabel}</div>
          {!error && <div style={{ marginTop: 8, fontSize: 11, padding: '4px 12px', background: genBg, color: '#6D4CFF', borderRadius: 20, fontWeight: 600 }}>✦ 클릭하여 재생성</div>}
          {error && <div style={{ fontSize: 11, color: '#ef4444', marginTop: 4, padding: '0 12px', textAlign: 'center', lineHeight: 1.5 }}>{imgState.errorMsg ?? '생성 실패 — 클릭하여 재시도'}</div>}
        </>
      )}
    </div>
  );
}

/* ─── 디자인 블록 판정 — 섹션 role 미보유라 name 키워드 + 블록 타입으로 Problem/Feature 분류.
   Hero(첫)·CTA(끝)·Comparison(compare 블록)은 제외(이미 전용 디자인). 색은 BlogSection이 테마로 주입. ─── */
const PROBLEM_KEYS = ['공감', '고민', '일상', '불편', '걱정', '망설'];
const FEATURE_KEYS = ['솔루션', '해결', '성분', '제형', '특징', '효능', '원료'];
function sectionDesignKind(sec: Section, isFirst: boolean, isLast: boolean): 'problem' | 'feature' | null {
  if (isFirst || isLast) return null;
  if (sec.blocks?.some(b => b.type === 'compare')) return null; // Comparison 영역
  // ⚠️섹션 이름(역할)만으로 판정. 블록 타입 폴백은 원인/후기/신뢰를 오태깅하므로 쓰지 않음.
  const name = (sec.name ?? '').toLowerCase();
  const hit = (keys: string[]) => keys.some(k => name.includes(k.toLowerCase()));
  if (hit(PROBLEM_KEYS)) return 'problem';
  if (hit(FEATURE_KEYS)) return 'feature';
  return null;
}

/* ─── 블로그형 섹션 ─── (controlled: sec 표시 + body 수정/재생성은 외부 위임) */
export function BlogSection({ sec, onRegen, regenLoading, onPatch, imgState, onGenerateImage, isLast, isFirst, onLightbox, blockImages, onLightboxBlock, isMobile }: {
  sec: Section;
  onRegen: () => void;
  regenLoading: boolean;
  onPatch?: (patch: Partial<Section>) => void;   // body/headline/subcopy/blocks 등 인라인 편집 patch (AI 0). body도 인라인으로 통일.
  imgState: ImgState;
  onGenerateImage: () => void;
  isLast: boolean;
  isFirst?: boolean;
  onLightbox?: () => void;
  blockImages?: Record<string, ImgState>;
  onLightboxBlock?: (key: string) => void;
  isMobile?: boolean;
}) {
  const hasBlocks = !!sec.blocks?.length;
  const hasImageBlock = !!sec.blocks?.some(b => b.type === 'image');

  // Problem/Feature 디자인 블록 판정 + 제품 테마(하드코딩 금지 — 전부 sec.visual)
  const designKind = sectionDesignKind(sec, !!isFirst, isLast);
  const theme = {
    primary:    sec.visual?.primary_color ?? DEFAULT_THEME.primary,
    soft:       sec.visual?.soft_color   ?? DEFAULT_THEME.soft,
    softBorder: sec.visual?.soft_border  ?? DEFAULT_THEME.softBorder,
  };

  // 섹션 재생성 버튼 — 첫 image 블록 우상단 오버레이 (데스크탑 hover 표시, 모바일 항상 표시)
  const regenOverlayBtn = (
    <button
      className={`img-regen-overlay${regenLoading ? ' is-loading' : ''}`}
      onClick={e => { e.stopPropagation(); onRegen(); }}
      disabled={regenLoading}
      aria-label="섹션 재생성"
    >
      {regenLoading
        ? <><span style={{ display: 'inline-block', width: 11, height: 11, border: '2px solid #c4b5fd', borderTopColor: '#6D4CFF', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />생성 중</>
        : <><Sparkles size={12} /> 재생성</>}
    </button>
  );

  return (
    <>
      <div style={{ background: '#fff' }}>
        {/* ── 카피 헤더(headline + subcopy) — 분기 무관 항상 렌더. 첫 섹션만 Hero가 담당(기존 유지) ──
            기존엔 bodyFlow 미설정/블록 섹션에서 headline·subcopy·body가 통째로 사라졌음(분기② 블록만, 분기③ subcopy 누락).
            이제 카피를 먼저 항상 렌더하고, 이미지/블록은 그 아래 공존시킨다. */}
        {isFirst && sec.bodyFlow ? (
          /* 첫 섹션 = Hero (headline/subcopy는 HeroBlock 담당, 변경 없음) */
          <div style={{ padding: isMobile ? '16px 16px 0' : '24px 36px 0' }}>
            <HeroBlock
              headline={sec.headline}
              subcopy={sec.subcopy}
              onHeadlineCommit={onPatch ? v => onPatch({ headline: v }) : undefined}
              onSubcopyCommit={onPatch ? v => onPatch({ subcopy: v }) : undefined}
              productImage={imgState?.url ?? null}
              onImageClick={imgState?.url ? onLightbox : undefined}
              bodySlot={(sec.body || onPatch) ? (
                <Editable multiline value={sec.body ?? ''} onCommit={onPatch ? v => onPatch({ body: v }) : undefined}
                  style={{ fontSize: 16, fontWeight: 400, color: '#34343c', lineHeight: 1.85, letterSpacing: '-0.2px' }} />
              ) : undefined}
              primary={sec.visual?.primary_color ?? DEFAULT_THEME.primary}
              accent={sec.visual?.accent_color ?? DEFAULT_THEME.accent}
              soft={sec.visual?.soft_color ?? DEFAULT_THEME.soft}
              softBorder={sec.visual?.soft_border ?? DEFAULT_THEME.softBorder}
            />
          </div>
        ) : (
          <>
            {/* 디자인 블록 태그(Problem/Feature) — soft 배경 pill, 색은 제품 테마 */}
            {designKind && (
              <div style={{ padding: '40px 36px 0' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '7px 14px', borderRadius: 999, background: theme.soft, border: `1px solid ${theme.softBorder}`, fontSize: 13, fontWeight: 700, color: theme.primary, letterSpacing: '-0.2px' }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: theme.primary, flexShrink: 0 }} />
                  {designKind === 'problem' ? '이런 고민, 있으셨나요?' : '이렇게 해결합니다'}
                </span>
              </div>
            )}
            <div style={{ padding: designKind ? '14px 36px 0' : '48px 36px 0', textAlign: 'left', fontSize: designKind ? 23 : 21, fontWeight: 700, color: '#111', lineHeight: 1.45, letterSpacing: '-0.4px', whiteSpace: 'pre-line' }}>
              <Editable value={sec.headline} onCommit={onPatch ? v => onPatch({ headline: v }) : undefined} />
            </div>
            {(sec.subcopy || onPatch) && (
              <div style={{ padding: '20px 36px 0', textAlign: 'left', fontSize: 16, fontWeight: 600, color: '#5b5b66', lineHeight: 1.6, letterSpacing: '-0.2px' }}>
                <Editable value={sec.subcopy ?? ''} onCommit={onPatch ? v => onPatch({ subcopy: v }) : undefined} />
              </div>
            )}
          </>
        )}

        {/* ── 본문(body) — 인라인 편집(멀티라인 contentEditable). pre-wrap이 v5 호흡 유지(단일 \n=줄바꿈, 이중 \n\n=문단 띄움).
            Hero는 위 HeroBlock의 bodySlot에서 이미지 위로 렌더하므로 여기선 제외. ── */}
        {!(isFirst && sec.bodyFlow) && (sec.body || onPatch) && (
          <div style={{ padding: '22px 36px 0', textAlign: 'left' }}>
            <Editable multiline value={sec.body ?? ''} onCommit={onPatch ? v => onPatch({ body: v }) : undefined}
              style={{ fontSize: 16, fontWeight: 400, color: '#34343c', lineHeight: 1.85, letterSpacing: '-0.2px' }} />
          </div>
        )}

        {/* ── 섹션 대표 이미지(V2 image_mission 브리프 → Gemini) — 블록 유무 무관 항상 노출.
            첫 섹션(Hero)은 HeroBlock 내부에 이미지가 들어가므로 여기선 제외. 실패/미생성 시 ImgSlot이 placeholder 폴백. ── */}
        {!(isFirst && sec.bodyFlow) && sec.imageDesc && (
          <div style={{ marginTop: 20 }}>
            <ImgSlot
              sec={sec} imgState={imgState} onGenerate={onGenerateImage}
              slotStyle={{ width: '100%', aspectRatio: imgState?.aspectRatio ? imgState.aspectRatio.replace(':', '/') : '4/3', background: '#f4f6f8', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 8 }}
              onLightbox={onLightbox}
            />
          </div>
        )}

        {/* ── 블록(보조) — 카피·이미지 아래 공존. 이미지와 KPI/블록 사이 간격 ── */}
        {hasBlocks && (
          <div style={{ paddingTop: 36 }}>
            <BlockRenderer blocks={sec.blocks!} sectionNum={sec.num} blockImages={blockImages} onLightboxBlock={onLightboxBlock} isMobile={isMobile} regenOverlay={hasImageBlock ? regenOverlayBtn : undefined} onBlocksChange={onPatch ? (blocks) => onPatch({ blocks }) : undefined} primaryColor={sec.visual?.primary_color} accentColor={sec.visual?.accent_color} softColor={sec.visual?.soft_color} softBorder={sec.visual?.soft_border} />
          </div>
        )}

        {/* ── 재생성 버튼 — 텍스트는 전부 인라인 편집(클릭)이라 '수정' 패널/버튼 없음. bs-actions = 통이미지 캡처 시 제외 ── */}
        <div className="bs-actions" style={{ padding: '18px 36px 40px', display: 'flex', justifyContent: 'center', gap: 8 }}>
          <button className="bs-regen-btn" onClick={onRegen} disabled={regenLoading}>
            {regenLoading ? <><span style={{ display: 'inline-block', width: 11, height: 11, border: '2px solid #a78bfa', borderTopColor: '#6D4CFF', borderRadius: '50%', animation: 'spin 0.7s linear infinite', marginRight: 4, verticalAlign: 'middle' }} />생성 중</> : '✦ 재생성'}
          </button>
        </div>
      </div>
      {!isLast && <div style={{ height: 56 }} />}
    </>
  );
}

/* ─── 슬라이드형 카드 ─── */
export function SlideCard({ sec, onRegen, imgState, onGenerateImage, index, onLightbox }: {
  sec: Section;
  onRegen: (s: Section) => Promise<Section | null>;
  imgState: ImgState;
  onGenerateImage: () => void;
  index: number;
  onLightbox?: () => void;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [headline, setHeadline] = useState(sec.headline);
  const [editVal, setEditVal] = useState(sec.body);
  const [saved, setSaved] = useState(sec.body);
  const [regenLoading, setRegenLoading] = useState(false);

  const handleRegen = async () => {
    setRegenLoading(true);
    const result = await onRegen({ ...sec, headline, body: saved });
    if (result) { setHeadline(result.headline); setSaved(result.body); setEditVal(result.body); }
    setRegenLoading(false);
  };

  return (
    <div style={{ background: '#fff', borderRadius: 10, overflow: 'hidden', marginBottom: 12, boxShadow: '0 1px 4px rgba(0,0,0,.06)' }}>
      <div style={{ padding: '10px 16px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: '#6D4CFF', background: '#ede9fe', padding: '2px 8px', borderRadius: 20 }}>{sec.num}</span>
        <span style={{ fontSize: 12, color: '#888' }}>{sec.name}</span>
      </div>
      <ImgSlot
        sec={sec} imgState={imgState} onGenerate={onGenerateImage}
        slotStyle={{ height: 240, background: index % 2 === 0 ? '#f5f3ff' : '#faf5ff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, margin: '10px 0 0' }}
        labelColor="#6D4CFF" descColor="#a78bfa" genBg="#ede9fe"
        onLightbox={onLightbox}
      />
      <div style={{ padding: '16px 20px 14px' }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#111', lineHeight: 1.5, marginBottom: 8, whiteSpace: 'pre-line' }}>{headline}</div>
        <div style={{ fontSize: 13, color: '#666', lineHeight: 1.85, marginBottom: 12 }}>{saved}</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="bs-edit-btn" onClick={() => setEditOpen(p => !p)}>{editOpen ? '닫기' : '✏️ 수정'}</button>
          <button className="bs-regen-btn" onClick={handleRegen} disabled={regenLoading}>
            {regenLoading ? <><span style={{ display: 'inline-block', width: 12, height: 12, border: '2px solid #a78bfa', borderTopColor: '#6D4CFF', borderRadius: '50%', animation: 'spin 0.7s linear infinite', marginRight: 5, verticalAlign: 'middle' }} />생성 중...</> : '✦ 재생성'}
          </button>
        </div>
        {editOpen && (
          <div className="edit-panel open" style={{ marginTop: 12 }}>
            <textarea className="edit-inp" value={editVal} onChange={e => setEditVal(e.target.value)} />
            <div className="edit-actions">
              <button className="edit-save" onClick={() => { setSaved(editVal); setEditOpen(false); }}>저장</button>
              <button className="edit-cancel" onClick={() => { setEditVal(saved); setEditOpen(false); }}>취소</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── 이미지 전용 섹션 ─── */
export function ImageSection({ sec, imgState, onGenerateImage, index, accent, onLightbox }: {
  sec: Section;
  imgState: ImgState;
  onGenerateImage: () => void;
  index: number;
  accent: 'purple' | 'blue';
  onLightbox?: () => void;
}) {
  const accentColor = accent === 'purple' ? '#6D4CFF' : '#6D4CFF';
  const accentBg = accent === 'purple' ? '#ede9fe' : '#F4F0FF';
  const slotBg = accent === 'purple' ? (index % 2 === 0 ? '#f5f3ff' : '#faf5ff') : '#F4F0FF';

  return (
    <div style={{ background: '#fff', borderRadius: 10, overflow: 'hidden', marginBottom: 12, boxShadow: '0 1px 4px rgba(0,0,0,.06)' }}>
      <div style={{ padding: '10px 16px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: accentColor, background: accentBg, padding: '2px 8px', borderRadius: 20 }}>{sec.num}</span>
        <span style={{ fontSize: 12, color: '#888' }}>{sec.name}</span>
      </div>
      <div style={{ margin: '10px 0 12px' }}>
        <ImgSlot
          sec={sec} imgState={imgState} onGenerate={onGenerateImage}
          slotStyle={{ height: 240, background: slotBg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          labelColor={accentColor} descColor={accent === 'purple' ? '#a78bfa' : '#C4B5FD'} genBg={accentBg}
          onLightbox={onLightbox}
        />
      </div>
    </div>
  );
}

/* ─── 슬라이드 Hero (overlay 방식) ───
   배경 = Gemini(텍스트 0, 상단 ~40% 여백). 텍스트 = 진짜 폰트(Pretendard)로 상단 여백존에 얹음 → 한글 안 깨짐.
   헤드라인/서브카피 클릭 인라인 편집(onPatch→updateSection→IndexedDB D-3). 다운로드는 DOM 캡처로 배경+텍스트 합성. */
export function SlideHero({ sec, imgState, onGenerateImage, onPatch, onLightbox }: {
  sec: Section;
  imgState: ImgState;
  onGenerateImage: () => void;
  onPatch?: (patch: Partial<Section>) => void;
  onLightbox?: () => void;
}) {
  const primary    = sec.visual?.primary_color ?? DEFAULT_THEME.primary;
  const soft       = sec.visual?.soft_color    ?? DEFAULT_THEME.soft;
  const softBorder = sec.visual?.soft_border   ?? DEFAULT_THEME.softBorder;
  const { loading, url, error } = imgState;

  return (
    <div data-slide-hero style={{ background: '#fff', borderRadius: 14, overflow: 'hidden', marginBottom: 12, boxShadow: '0 1px 4px rgba(0,0,0,.06)' }}>
      <div style={{ padding: '10px 16px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: primary, background: soft, padding: '2px 8px', borderRadius: 20 }}>{sec.num}</span>
        <span style={{ fontSize: 12, color: '#888' }}>{sec.name} · Hero</span>
      </div>

      {/* 캡처 대상: 배경 + 텍스트존(상단 헤더·재생성 버튼은 제외) */}
      <div data-slide-hero-capture style={{ position: 'relative', margin: '10px 0 0', background: soft, overflow: 'hidden' }}>
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" onClick={onLightbox}
            style={{ display: 'block', width: '100%', aspectRatio: '4 / 5', objectFit: 'cover', cursor: onLightbox ? 'zoom-in' : 'default' }} />
        ) : (
          <div onClick={loading ? undefined : onGenerateImage}
            style={{ aspectRatio: '4 / 5', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: loading ? 'default' : 'pointer' }}>
            {loading
              ? <div style={{ width: 32, height: 32, border: '3px solid #cbd5e1', borderTopColor: primary, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              : <span style={{ fontSize: 13, color: primary, fontWeight: 700 }}>{error ? '재생성하려면 클릭' : '클릭해서 배경 생성'}</span>}
          </div>
        )}

        {/* 상단 텍스트존 — 좌측 정렬 + 가독성 스크림(상단→투명). Gemini가 비운 상단 ~40%에 어우러짐 */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, padding: '26px 30px 52px', textAlign: 'left',
          background: 'linear-gradient(180deg, rgba(255,255,255,.94) 0%, rgba(255,255,255,.80) 50%, rgba(255,255,255,0) 100%)',
          pointerEvents: 'none',
        }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: primary, background: soft, border: `1px solid ${softBorder}`, padding: '4px 12px', borderRadius: 20, pointerEvents: 'auto' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: primary }} /> 추천 상품
          </span>
          <div style={{ marginTop: 12, pointerEvents: 'auto' }}>
            <Editable value={sec.headline} onCommit={onPatch ? v => onPatch({ headline: v }) : undefined}
              style={{ fontSize: 'clamp(20px, 3vw, 26px)', fontWeight: 800, color: '#1a1a22', lineHeight: 1.32, letterSpacing: '-0.4px', display: 'block', wordBreak: 'keep-all', whiteSpace: 'pre-line' }} />
          </div>
          {(sec.subcopy || onPatch) && (
            <div style={{ marginTop: 10, pointerEvents: 'auto' }}>
              <Editable value={sec.subcopy ?? ''} onCommit={onPatch ? v => onPatch({ subcopy: v }) : undefined}
                style={{ fontSize: 14, fontWeight: 600, color: '#4a4a55', lineHeight: 1.5, letterSpacing: '-0.2px', display: 'block', wordBreak: 'keep-all' }} />
            </div>
          )}
        </div>
      </div>

      {/* 재생성 버튼 — 캡처 제외(bs-actions) */}
      <div className="bs-actions" style={{ padding: '12px 16px 14px', display: 'flex', justifyContent: 'center' }}>
        <button className="bs-regen-btn" onClick={onGenerateImage} disabled={loading}>
          {loading ? '생성 중…' : url ? '✦ 배경 재생성' : '✦ 배경 생성'}
        </button>
      </div>
    </div>
  );
}

/* ─── 섹션별 텍스트 모달 ─── */
function TextModal({ sections, onClose }: { sections: Section[]; onClose: () => void }) {
  const copyOne = async (sec: Section) => {
    const text = `${sec.num} · ${sec.name}\n\n[헤드라인]\n${sec.headline}\n\n[본문]\n${sec.body}`;
    try {
      await navigator.clipboard.writeText(text);
      alert(`✅ "${sec.name}" 복사 완료!`);
    } catch {
      alert('복사 실패 — 브라우저 설정을 확인해주세요');
    }
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 9999, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '40px 16px', overflowY: 'auto' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: '#fff', borderRadius: 12, width: '100%', maxWidth: 640, maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--bd)', flexShrink: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700 }}>📄 섹션별 텍스트</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--tx3)', lineHeight: 1 }}>✕</button>
        </div>
        <div style={{ overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {sections.map((sec, i) => (
            <div key={i} style={{ border: '1px solid var(--bd)', borderRadius: 8, padding: '14px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div>
                  <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--ac)', background: 'var(--al)', padding: '2px 7px', borderRadius: 20, marginRight: 8 }}>{sec.num}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--tx1)' }}>{sec.name}</span>
                </div>
                <button onClick={() => copyOne(sec)} style={{ fontSize: 11, padding: '4px 10px', background: 'var(--sf)', border: '1px solid var(--bd)', borderRadius: 6, cursor: 'pointer', color: 'var(--tx2)', fontFamily: 'var(--f)', whiteSpace: 'nowrap' }}>복사</button>
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--tx1)', marginBottom: 6, lineHeight: 1.5, whiteSpace: 'pre-line' }}>{sec.headline}</div>
              <div style={{ fontSize: 12, color: 'var(--tx2)', lineHeight: 1.8 }}>{sec.body}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── 썸네일 패널 ─── */
function ThumbnailPanel({ ch, productName, productImages }: {
  ch: string | null;
  productName: string;
  productImages: string[];
}) {
  const { generationJobKey: thumbJobKey } = useApp();   // ★결제 검증(P0 2차) — 썸네일도 결제된 생성 작업에서만
  const [selectedType, setSelectedType] = useState<ThumbTypeId | null>(null);
  const [thumbResults, setThumbResults] = useState<Partial<Record<ThumbTypeId, ImgState>>>({});
  const [refImage, setRefImage] = useState<string | null>(null);
  const refFileRef = useRef<HTMLInputElement>(null);

  const size = THUMB_SIZES[ch ?? ''] ?? '1080×1080';

  const handleRefUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      if (typeof ev.target?.result === 'string') setRefImage(ev.target.result);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const typeDef = selectedType ? THUMB_TYPES.find(t => t.id === selectedType) : null;
  const result = selectedType ? (thumbResults[selectedType] ?? null) : null;
  const isLoading = result?.loading ?? false;

  const generate = async () => {
    if (!selectedType || !typeDef) return;
    setThumbResults(p => ({ ...p, [selectedType]: { loading: true, url: null, error: false } }));
    try {
      const images = selectedType === 'ref_copy' && refImage
        ? [...productImages, refImage]
        : productImages;
      const res = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `${typeDef.prompt} 상품명: ${productName}. 판매 채널: ${ch ?? ''}. 권장 규격: ${size}.`,
          sectionNum: `thumb_${selectedType}`,
          productImages: images.length > 0 ? images : undefined,
          jobKey: thumbJobKey ?? undefined,   // ★결제 검증(P0 2차)
        }),
        signal: AbortSignal.timeout(130_000),
      });
      const data = await res.json();
      if (data.imageBase64) {
        setThumbResults(p => ({ ...p, [selectedType]: { loading: false, url: `data:${data.mimeType};base64,${data.imageBase64}`, error: false } }));
      } else {
        setThumbResults(p => ({ ...p, [selectedType]: { loading: false, url: null, error: true } }));
      }
    } catch {
      setThumbResults(p => ({ ...p, [selectedType]: { loading: false, url: null, error: true } }));
    }
  };

  const downloadThumb = (url: string, typeId: ThumbTypeId) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(productName || 'flik').replace(/[/\\?%*:|"<>]/g, '_')}_thumb_${typeId}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div>
      <div style={{ background: '#F4F0FF', border: '1px solid #bfdbfe', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#1e40af', marginBottom: 20, lineHeight: 1.7 }}>
        📐 <b>{ch ?? '기본'} 권장 규격:</b> {size}px &nbsp;·&nbsp; 썸네일은 다운로드 전용이며 상세페이지에 추가되지 않아요
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--tx)', marginBottom: 10 }}>썸네일 타입 선택</div>
        <div className="chips">
          {THUMB_TYPES.map(t => (
            <button
              key={t.id}
              className={`chip${selectedType === t.id ? ' on' : ''}`}
              onClick={() => setSelectedType(prev => prev === t.id ? null : t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
        {typeDef && (
          <div style={{ fontSize: 11, color: 'var(--tx3)', marginTop: 8 }}>{typeDef.desc}</div>
        )}
      </div>

      {selectedType === 'ref_copy' && (
        <div style={{ marginBottom: 16, background: 'var(--sf)', border: '1px dashed var(--bd2)', borderRadius: 8, padding: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 10 }}>레퍼런스 이미지 업로드</div>
          <input ref={refFileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleRefUpload} />
          {refImage ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={refImage} alt="레퍼런스" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--bd)' }} />
              <div>
                <div style={{ fontSize: 12, color: 'var(--tx2)', marginBottom: 6 }}>레퍼런스 이미지 등록됨</div>
                <button onClick={() => setRefImage(null)} style={{ fontSize: 11, color: 'var(--rd)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--f)' }}>✕ 삭제</button>
              </div>
            </div>
          ) : (
            <button onClick={() => refFileRef.current?.click()} style={{ padding: '8px 16px', background: 'var(--white)', border: '1.5px solid var(--bd)', borderRadius: 8, fontSize: 12, cursor: 'pointer', fontFamily: 'var(--f)', color: 'var(--tx2)' }}>
              📁 레퍼런스 이미지 선택
            </button>
          )}
          <div style={{ fontSize: 11, color: 'var(--tx3)', marginTop: 8, lineHeight: 1.5 }}>스타일을 참고할 경쟁사·레퍼런스 썸네일 이미지를 업로드하세요</div>
        </div>
      )}

      {selectedType && (
        <button
          onClick={generate}
          disabled={isLoading || (selectedType === 'ref_copy' && !refImage)}
          style={{
            width: '100%', padding: '12px', marginBottom: 20,
            background: isLoading ? 'var(--sf)' : 'var(--tx)', color: isLoading ? 'var(--tx3)' : '#fff',
            border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700,
            cursor: (isLoading || (selectedType === 'ref_copy' && !refImage)) ? 'not-allowed' : 'pointer',
            fontFamily: 'var(--f)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: (selectedType === 'ref_copy' && !refImage) ? 0.4 : 1,
          }}
        >
          {isLoading ? (
            <><span style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid #ccc', borderTopColor: 'var(--ac)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />생성 중...</>
          ) : `✦ ${typeDef?.label} 생성`}
        </button>
      )}

      {result?.url && (
        <div style={{ background: '#fff', border: '1px solid var(--bd)', borderRadius: 12, overflow: 'hidden', marginBottom: 16 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={result.url} alt="썸네일" style={{ width: '100%', display: 'block' }} />
          <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{typeDef?.label}</div>
              <div style={{ fontSize: 11, color: 'var(--tx3)', marginTop: 2 }}>{size}px 권장 · {ch}</div>
            </div>
            <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
              <button onClick={generate} style={{ fontSize: 12, padding: '7px 12px', background: 'var(--sf)', border: '1.5px solid var(--bd)', borderRadius: 8, cursor: 'pointer', fontFamily: 'var(--f)', color: 'var(--tx2)' }}>↻ 재생성</button>
              <button onClick={() => downloadThumb(result.url!, selectedType!)} style={{ fontSize: 12, padding: '7px 14px', background: 'var(--ac)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontFamily: 'var(--f)', fontWeight: 600 }}>⬇ 다운로드</button>
            </div>
          </div>
        </div>
      )}

      {result?.error && (
        <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: 8, padding: '12px 14px', fontSize: 13, color: '#be123c', marginBottom: 16 }}>
          ⚠️ 썸네일 생성에 실패했어요. 다시 시도해주세요.
        </div>
      )}

      {!selectedType && (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--tx3)', fontSize: 13 }}>
          위에서 썸네일 타입을 선택하고 생성해보세요
        </div>
      )}
    </div>
  );
}

/* ─── 메인 ─── */
export default function ResultScreen() {
  const isMobile = useIsMobile();
  const { cat, ch, type, out, sections, productName, productExtra, brand, brandIntro, diff, productForm, productVolume, productImages, packagingRefImage, generationJobKey, go, restoredImages, restoredBlockImages, restoredOverrides, updateLatestHistoryImages, updateLatestHistoryOverrides, setCredits } = useApp();
  const [lightboxSecNum, setLightboxSecNum] = useState<string | null>(null);
  const [textModalOpen,  setTextModalOpen]  = useState(false);
  const [sectionImages,  setSectionImages]  = useState<Record<string, ImgState>>({});
  const [blockImages,    setBlockImages]    = useState<Record<string, ImgState>>({});
  const [mergeLoading,   setMergeLoading]   = useState(false);
  const [htmlLoading,    setHtmlLoading]    = useState(false);
  const [captureLoading, setCaptureLoading] = useState(false);
  const captureRef = useRef<HTMLDivElement>(null);   // 결과물 본문(BlogSection들) — 통이미지 캡처 대상
  const [createdAt] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  });
  // 섹션 목록 조작용 로컬 state
  const [sectionOrder,     setSectionOrder]     = useState<number[]>([]);
  const [hiddenSections,   setHiddenSections]   = useState<Set<number>>(new Set());
  const [dragIdx,          setDragIdx]          = useState<number | null>(null);
  const [hoveredIdx,       setHoveredIdx]       = useState<number | null>(null);
  const [sectionOverrides, setSectionOverrides] = useState<Record<number, Partial<Section>>>({});
  const [regenLoadingSet,  setRegenLoadingSet]  = useState<Set<number>>(new Set());
  // 뷰모드 / 줌
  const [viewMode, setViewMode] = useState<'mobile' | 'pc'>('mobile');
  const [zoom,     setZoom]     = useState(100);
  const zoomOut = () => setZoom(z => Math.max(50, z - 10));
  const zoomIn  = () => setZoom(z => Math.min(150, z + 10));

  // 빠른 수정 안내용 toast + 섹션 목록 ref
  const [hint, setHint] = useState<string | null>(null);
  const [sectionListHighlight, setSectionListHighlight] = useState(false);
  const hintTimerRef = useRef<NodeJS.Timeout | null>(null);
  const highlightTimerRef = useRef<NodeJS.Timeout | null>(null);
  const sectionListRef = useRef<HTMLDivElement>(null);

  const showHint = (msg: string) => {
    setHint(msg);
    if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
    hintTimerRef.current = setTimeout(() => setHint(null), 3000);
  };

  const scrollToSectionList = () => {
    sectionListRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setSectionListHighlight(true);
    if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    highlightTimerRef.current = setTimeout(() => setSectionListHighlight(false), 1800);
  };

  useEffect(() => () => {
    if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
    if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
  }, []);
  const abortRef = useRef<AbortController | null>(null);
  const persistedKeysRef = useRef<Set<string>>(new Set());   // 이미 IndexedDB에 증분 저장된 이미지 키(섹션 num / 블록 num#idx)

  // sections 길이가 바뀌면 순서/숨김/오버라이드 초기화
  useEffect(() => {
    setSectionOrder(sections.map((_, i) => i));
    setHiddenSections(new Set());
    setSectionOverrides({});
  }, [sections.length]);

  // 최종 섹션 단일 소스: 원본 + override(headline/body 수정 + 재생성 결과)
  const getEffectiveSection = (realIdx: number): Section => ({
    ...sections[realIdx],
    ...sectionOverrides[realIdx],
  });

  // 복원: 작업기록 재방문/새로고침 시 저장된 인라인 편집(override)을 state로 복원
  useEffect(() => {
    setSectionOverrides({ ...(restoredOverrides as Record<number, Partial<Section>>) });
  }, [restoredOverrides]);

  const overridesPersistTimer = useRef<NodeJS.Timeout | null>(null);
  const updateSection = (realIdx: number, patch: Partial<Section>) => {
    setSectionOverrides(prev => {
      const next = { ...prev, [realIdx]: { ...prev[realIdx], ...patch } };
      // 편집값 IndexedDB 영속화(디바운스 600ms, AI 호출 0) — 새로고침/재방문에도 유지
      if (overridesPersistTimer.current) clearTimeout(overridesPersistTimer.current);
      overridesPersistTimer.current = setTimeout(() => updateLatestHistoryOverrides(next as Record<string, unknown>), 600);
      return next;
    });
  };

  const productImagesRef = useRef(productImages);
  useEffect(() => { productImagesRef.current = productImages; }, [productImages]);
  const packagingRefRef = useRef(packagingRefImage);
  useEffect(() => { packagingRefRef.current = packagingRefImage; }, [packagingRefImage]);
  const jobKeyRef = useRef(generationJobKey);
  useEffect(() => { jobKeyRef.current = generationJobKey; }, [generationJobKey]);

  // ★빈 결과 = 차감됐는데 산출물 0 유형 — 도착 즉시 자동 환불 시도(서버가 원장으로 이미지 0장 재검증,
  //   이미지가 나갔거나 기환불이면 서버가 거절하므로 언제 호출돼도 안전. 멱등)
  useEffect(() => {
    if (sections.length > 0 || !generationJobKey) return;
    fetch('/api/credits/refund-failed', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobKey: generationJobKey }),
    }).then(r => r.json()).then(d => {
      if (d?.status === 'refunded' && typeof d.balance === 'number') setCredits(d.balance);
    }).catch(() => {});
  }, [sections.length, generationJobKey]);   // eslint-disable-line react-hooks/exhaustive-deps

  // 빈 sections fallback ── 기존 유지
  if (sections.length === 0) {
    return (
      <div className="result-shell">
        <div style={{ textAlign: 'center', padding: '80px 20px' }}>
          <div style={{ fontSize: 44, marginBottom: 16 }}>⚠️</div>
          <div style={{ fontSize: 17, fontWeight: 700, color: '#dc2626', marginBottom: 10 }}>결과가 비어 있어요</div>
          <div style={{ fontSize: 13, color: '#666', lineHeight: 1.8, marginBottom: 32 }}>
            콘텐츠가 생성되지 않았어요. 정보를 확인하고 다시 시도해주세요.
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button className="btn-back" onClick={() => go('s5')}>← 정보 수정</button>
            {/* ★크레딧 사고 방지 — 재생성은 새 jobKey = 새 선차감. 경고 없이 진행되지 않게 confirm */}
            <button className="btn-next" onClick={() => {
              if (!window.confirm('다시 생성하면 크레딧이 새로 차감됩니다(섹션 수만큼). 계속하시겠어요?')) return;
              go('s6');
            }}>↻ 다시 생성</button>
          </div>
        </div>
      </div>
    );
  }

  const displaySections = sections;

  const effectiveOut = resolveOutputType(ch, out);
  const isSlide = effectiveOut === 'slide';
  const isHtml  = effectiveOut === 'html';
  const isBlog  = !isSlide && !isHtml;

  // ★Clean Baseline Phase B — 디렉터 플랜(페이지당 1회, 결과 캐시). 플래그 ON일 때만 호출.
  //   실패 시 null → 각 섹션이 기존 경로로 폴백(생성은 계속). 같은 jobKey면 같은 컨셉(결정적).
  const directorPlanRef = useRef<Promise<DirectorPlan | null> | null>(null);
  const ensureDirectorPlan = useCallback((): Promise<DirectorPlan | null> => {
    if (!CLEAN_IMAGE_BRIEF) return Promise.resolve(null);
    if (!directorPlanRef.current) {
      directorPlanRef.current = fetch('/api/director', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobKey: jobKeyRef.current ?? undefined, cat, ch, productName, productExtra, diff, brand,
          sections: sections.map(s => ({ name: s.name, headline: s.headline, subcopy: s.subcopy })),
          productImage: productImagesRef.current[0] ?? null,
        }),
        signal: AbortSignal.timeout(120_000),
      }).then(r => r.json()).then(d => (d?.plan ?? null) as DirectorPlan | null).catch(() => null);
    }
    return directorPlanRef.current;
  }, [cat, ch, productName, productExtra, diff, brand, sections]);

  const generateImage = useCallback(async (sec: Section, signal: AbortSignal, opts?: { slideHero?: boolean }) => {
    const aspect = aspectRatioFor(sec.name, undefined, effectiveOut);   // 슬라이드는 전 섹션 4:5 고정
    setSectionImages(p => ({ ...p, [sec.num]: { loading: true, url: null, error: false, aspectRatio: aspect } }));
    try {
      const images = productImagesRef.current;
      const secIdx = sections.findIndex(x => x.num === sec.num);
      // ★Clean Baseline(Phase C 기본 경로) — 비블로그 전 섹션: 디렉터 플랜+섹션 브리프가 promptText.
      //   디렉터 실패/플래그 OFF 시 buildSectionBrief(director:null) = 자유 브리프 폴백(구 디렉션 스택 삭제됨).
      const directorPlan = (CLEAN_IMAGE_BRIEF && effectiveOut !== 'blog') ? await ensureDirectorPlan() : null;
      const promptText = effectiveOut === 'blog'
        ? sec.imageDesc
        : buildSectionBrief({ productName, productForm, productVolume, productExtra, diff, brand, brandIntro, headline: sec.headline, subcopy: sec.subcopy, visual: sec.visual, director: directorPlan, sectionName: sec.name, sectionIndex: secIdx >= 0 ? secIdx : undefined, auxRefCount: Math.max(0, images.length - 1) });
      // ★Required Asset(포장/구성 = 증거 섹션) — GPT는 플레이트(배경판+입력 카피 타이포)만 생성,
      //   셀러 포장 원본은 클라 코드 합성으로 픽셀 보존. ★페이지당 최고점 1개 섹션만(과발동 핫픽스).
      const packRef = packagingRefRef.current;
      const raIdx = packRef && effectiveOut === 'slide'
        ? selectRequiredAssetIndex(sections.map((s, j) => ({ name: s.name, prompt: s.imageDesc, archetype: j === 0 ? 'hero' : classifyCutArchetype(s.name) })))
        : -1;
      const isPlate = raIdx >= 0 && raIdx === secIdx;
      const res = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: isPlate ? buildPlatePrompt(sec.headline, sec.subcopy, sec.visual?.accent_color) : promptText,
          sectionNum: sec.num,
          productImages: isPlate ? undefined : (images.length > 0 ? images : undefined),
          outputType: effectiveOut,
          aspectRatio: aspect,
          plateMode: isPlate || undefined,
          jobKey: jobKeyRef.current ?? undefined,   // ★결제 검증(P0 2차) — 없으면 서버가 402(과거 히스토리 차단)
        }),
        signal,
      });
      if (signal.aborted) return;
      const data = await res.json();
      if (signal.aborted) return;
      if (data.imageBase64) {
        let url = `data:${data.mimeType};base64,${data.imageBase64}`;
        if (isPlate && packRef) {
          try {
            url = await compositeRequiredAsset(url, packRef);   // 원본 자산 카드 합성(픽셀 보존)
          } catch {
            // 합성 실패 시 빈 무대 플레이트를 그대로 노출하지 않고 에러 슬롯 처리
            setSectionImages(p => ({ ...p, [sec.num]: { loading: false, url: null, error: true, errorMsg: '포장 사진 합성에 실패했어요 — 재생성해 주세요.', aspectRatio: aspect } }));
            return;
          }
        }
        persistedKeysRef.current.delete(sec.num);   // ★재생성 결과 재영속 허용 — 이미 저장된 키여도 새 이미지로 갱신되게(안 지우면 persist effect가 skip → 새로고침 시 원본 복귀)
        setSectionImages(p => ({ ...p, [sec.num]: { loading: false, url, error: false, aspectRatio: aspect } }));
      } else {
        // ★402/429 코드 분기(최소 안내) — 코드가 있으면 친화 문구, 없으면 서버 안내문 그대로
        const errorMsg = friendlyGenerationError(data) ?? (typeof data.error === 'string' ? data.error : undefined);
        setSectionImages(p => ({ ...p, [sec.num]: { loading: false, url: null, error: true, errorMsg, aspectRatio: aspect } }));
      }
    } catch (err) {
      if (signal.aborted) return;
      setSectionImages(p => ({ ...p, [sec.num]: { loading: false, url: null, error: true, aspectRatio: aspect } }));
    }
  }, [effectiveOut, productName, productExtra, cat, ch, sections]);

  const generateBlockImage = useCallback(async (sec: Section, blockIdx: number, desc: string, signal: AbortSignal) => {
    const key = `${sec.num}#${blockIdx}`;
    const blockType = sec.blocks?.[blockIdx]?.type;
    const aspect = aspectRatioFor(sec.name, blockType);
    setBlockImages(p => ({ ...p, [key]: { loading: true, url: null, error: false, aspectRatio: aspect } }));
    try {
      const images = productImagesRef.current;
      const res = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: desc,
          sectionNum: key,
          productImages: images.length > 0 ? images : undefined,
          outputType: 'blog',
          aspectRatio: aspect,
          jobKey: jobKeyRef.current ?? undefined,   // ★결제 검증(P0 2차)
        }),
        signal,
      });
      if (signal.aborted) return;
      const data = await res.json();
      if (signal.aborted) return;
      if (data.imageBase64) {
        persistedKeysRef.current.delete(key);   // ★재생성 결과 재영속 허용(위 섹션과 동일)
        setBlockImages(p => ({ ...p, [key]: { loading: false, url: `data:${data.mimeType};base64,${data.imageBase64}`, error: false, aspectRatio: aspect } }));
      } else {
        setBlockImages(p => ({ ...p, [key]: { loading: false, url: null, error: true, aspectRatio: aspect } }));
      }
    } catch (err) {
      if (signal.aborted) return;
      setBlockImages(p => ({ ...p, [key]: { loading: false, url: null, error: true, aspectRatio: aspect } }));
    }
  }, []);

  useEffect(() => {
    // ★모바일 이중 실행 차단(P0-1) — useIsMobile 첫 렌더 false 타이밍에 이 배치 effect가 먼저
    //   발화해 ResultMobile과 이미지 풀을 2번 돌리던 문제. 모바일 뷰포트에서는 여기서 시작하지
    //   않는다(모바일은 ResultMobile의 배치가 유일한 시작점 — 이미지 생성·증분 저장 1회 보장).
    if (window.innerWidth < MOBILE_BREAKPOINT) return;
    if (!displaySections.length) return;
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    // 증분 저장 추적 리셋 — 복원된(이미 IndexedDB에 있는) 이미지는 재저장 불필요하므로 미리 '저장됨'으로 시드.
    persistedKeysRef.current = new Set([
      ...Object.keys(restoredImages),
      ...Object.keys(restoredBlockImages),
    ]);

    if (Object.keys(restoredImages).length > 0) {
      const initial: Record<string, ImgState> = {};
      for (const [key, url] of Object.entries(restoredImages)) {
        initial[key] = { loading: false, url, error: false };
      }
      setSectionImages(initial);
    } else {
      setSectionImages({});
    }
    if (Object.keys(restoredBlockImages).length > 0) {
      const initialBlocks: Record<string, ImgState> = {};
      for (const [key, url] of Object.entries(restoredBlockImages)) {
        initialBlocks[key] = { loading: false, url, error: false };
      }
      setBlockImages(initialBlocks);
    } else {
      setBlockImages({});
    }

    // ★동시 3장 워커 풀 — 순차(장당 ~90s × N + 3s 간격) 병목 해소. 장당 완료 즉시 state 반영 +
    //   증분 IndexedDB 저장은 기존 구조 그대로. 실패는 장 단위 격리, 취소는 ctrl.signal이 풀·fetch에 전파.
    (async () => {
      const tasks: Array<() => Promise<void>> = [];
      displaySections.forEach((sec, i) => {
        // 섹션 대표 이미지 — 복원본 있으면 skip(재방문 과금 방지). 슬라이드 첫 섹션은 Hero 옵션.
        if (sec.imageDesc && !restoredImages[sec.num]) {
          tasks.push(() => generateImage(sec, ctrl.signal, { slideHero: isSlide && i === 0 }));
        }
        // 이미지 타입 블록(있으면) 추가 생성 — 현재 Stage3엔 없지만 호환 유지
        sec.blocks?.forEach((block, bi) => {
          if (block.type !== 'image') return;
          if (restoredBlockImages[`${sec.num}#${bi}`]) return;
          tasks.push(() => generateBlockImage(sec, bi, block.desc, ctrl.signal));
        });
      });
      await runPool(tasks, 3, ctrl.signal);
    })();

    return () => { ctrl.abort(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displaySections.length]);

  // ── 이미지 '증분 영속화' — 섹션/블록이 성공할 때마다 그 장만 즉시 IndexedDB에 병합 저장 ──
  // (과거 allDone 일괄 저장 폐기: 배치 도중 페이지 이탈 시 성공분이 state에만 남아 재방문 시 전량 재생성=재과금됐음.)
  // 새로 성공한(아직 저장 안 된) 이미지만 골라 compress→mergeImages로 누적. 실패(null)는 저장 안 함(기존과 동일).
  useEffect(() => {
    if (!displaySections.length) return;

    const newSection: Record<string, string> = {};
    for (const sec of displaySections) {
      const url = sectionImages[sec.num]?.url;
      if (url && !persistedKeysRef.current.has(sec.num)) newSection[sec.num] = url;
    }
    const newBlock: Record<string, string> = {};
    for (const sec of displaySections) {
      if (!sec.blocks?.length) continue;
      sec.blocks.forEach((b, bi) => {
        if (b.type !== 'image') return;
        const key = `${sec.num}#${bi}`;
        const url = blockImages[key]?.url;
        if (url && !persistedKeysRef.current.has(key)) newBlock[key] = url;
      });
    }

    const sKeys = Object.keys(newSection);
    const bKeys = Object.keys(newBlock);
    if (sKeys.length === 0 && bKeys.length === 0) return;

    // 선마킹: 같은 키 중복 compress/save 방지. ★저장 실패 시 아래에서 해당 키만 롤백 → 다음 effect 런에서 자동 재시도(P0).
    [...sKeys, ...bKeys].forEach(k => persistedKeysRef.current.add(k));

    (async () => {
      try {
        const [compressedSection, compressedBlock] = await Promise.all([
          compressMap(newSection),
          compressMap(newBlock),
        ]);
        const ok = await updateLatestHistoryImages(compressedSection, compressedBlock);
        if (!ok) throw new Error('persist failed');
      } catch {
        // 실패한 키만 선마킹 해제 — 유실 영구화 방지(다음 이미지 완료 시 이 키들이 다시 저장 후보가 됨)
        [...sKeys, ...bKeys].forEach(k => persistedKeysRef.current.delete(k));
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionImages, blockImages]);

  const doneCount    = Object.values(sectionImages).filter(s => !s.loading).length;
  const isGenerating = Object.values(sectionImages).some(s => s.loading);

  const regenFn = useCallback(async (sec: Section): Promise<Section | null> => {
    try {
      const res = await fetch('/api/regen-section', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cat, ch, type, out, productName, productExtra, sectionNum: sec.num, sectionName: sec.name, jobKey: generationJobKey ?? undefined }),
        signal: AbortSignal.timeout(30_000),
      });
      const data = await res.json();
      return data.section ?? null;
    } catch (err) {
      console.error('[regenFn] error:', err);
      return null;
    }
  }, [cat, ch, type, out, productName, productExtra, generationJobKey]);

  const outputTypeLabel = isBlog ? '블로그형' : isSlide ? '슬라이드형' : 'HTML형';
  const label = isSlide ? '이미지 슬라이드형' : isHtml ? 'HTML 섹션형' : '블로그형 (글+그림)';
  const meta  = [cat, ch, type, label, `${displaySections.length}섹션`].filter(Boolean).join(' · ');

  // TODO: 실제 페이지 길이 계산 (현재는 섹션 수 기반 추정)
  const totalLength = (displaySections.length * 1040).toLocaleString();

  const closeLightbox = useCallback(() => setLightboxSecNum(null), []);

  // 모바일 분기 — 모든 훅 호출 후
  if (isMobile) return <ResultMobile />;

  const lightboxItems = [
    ...displaySections
      .filter(s => !!(sectionImages[s.num]?.url))
      .map(s => ({ secNum: s.num, url: sectionImages[s.num].url as string, alt: s.imageLabel })),
    ...displaySections.flatMap(s =>
      (s.blocks ?? []).flatMap((b, idx) => {
        if (b.type !== 'image') return [];
        const k = `${s.num}#${idx}`;
        const st = blockImages[k];
        return st?.url ? [{ secNum: k, url: st.url, alt: b.label }] : [];
      }),
    ),
  ];

  const lightboxInitIdx = lightboxSecNum !== null
    ? lightboxItems.findIndex(i => i.secNum === lightboxSecNum)
    : -1;

  const handleHtmlDownload = async () => {
    // ★생성 중 이미지 가드 — 미완성분은 export에서 스킵되므로, 지금 받을지/기다릴지 확인.
    if (!confirmSkipGenerating(countGeneratingImages(finalSectionsForExport, sectionImages, blockImages))) return;
    setHtmlLoading(true);
    await new Promise(r => setTimeout(r, 50));
    // 화면에 보이는 그대로 (순서 + 숨김 + 텍스트 수정/재생성 반영). 슬라이드형은 이미지만 스택.
    const ok = await downloadHtml(finalSectionsForExport, meta, productName, sectionImages, blockImages, isSlide);
    if (!ok) alert('HTML 다운로드 중 오류가 발생했어요. 다시 시도해주세요.');
    setTimeout(() => setHtmlLoading(false), 2000);
  };

  const handleMergeDownload = async () => {
    if (mergeLoading) return;
    // ★생성 중 이미지 가드 — 완성분만 합치므로, 지금 받을지/기다릴지 확인.
    if (!confirmSkipGenerating(countGeneratingImages(finalSectionsForExport, sectionImages, blockImages))) return;
    setMergeLoading(true);
    try {
      await downloadMergedImage(finalSectionsForExport, sectionImages, blockImages, productName);
    } catch (err) {
      console.error('[handleMergeDownload]', err);
      alert('통이미지 다운로드 중 오류가 발생했어요. 다시 시도해주세요.');
    } finally {
      setMergeLoading(false);
    }
  };

  // 결과물 본문을 "섹션별 개별 PNG"로 다운로드 — 밴드/인스타용(섹션 단위라 각 장이 짧아 크게 보임 + 셀러가 원하는 섹션만 선택).
  // 섹션 1개 = PNG 1장(섹션 중간 안 잘림 자동 보장). 폭 1080. 사이드바/빠른수정/섹션목록은 captureRef 밖이라 미포함.
  // 수정/재생성 버튼·이미지 오버레이·편집패널은 캡처 시 제외. AI 재호출 0.
  const handleFullCapture = async () => {
    if (captureLoading) return;
    // ★생성 중 이미지 가드 — 캡처는 화면 그대로라 미완성 섹션이 찍히므로, 지금 받을지/기다릴지 확인.
    if (!confirmSkipGenerating(countGeneratingImages(finalSectionsForExport, sectionImages, blockImages))) return;
    const container = captureRef.current;
    if (!container) { alert('캡처할 본문이 없습니다.'); return; }
    // 직계 자식 중 실제 섹션 div만(자식 있는 것). 56px 빈 스페이서는 children 0이라 제외.
    const units = (Array.from(container.children) as HTMLElement[]).filter(el => el.offsetHeight > 0 && el.children.length > 0);
    if (units.length === 0) { alert('캡처할 섹션이 없습니다.'); return; }
    setCaptureLoading(true);
    try {
      // 캡처 엔진: modern-screenshot(getComputedStyle 기반) — Tailwind v4 oklch() 색도 처리(html2canvas 1.4.1은 throw).
      const { domToCanvas } = await import('modern-screenshot');
      // 밴드용: 출력 폭을 1080px로 고정. 방법 A — 캡처 클론에만 width 1080 적용(라이브 DOM 미변경=깜빡임 0).
      // 1080 기준으로 reflow되어 레이아웃이 1080폭으로 깔끔히 잡힘. scale 1 → PNG 폭 정확히 1080.
      const TARGET_W = 1080;
      const scale = 1;  // 폭 1080 × scale 1 = PNG 폭 정확히 1080
      const opts = {
        backgroundColor: '#ffffff', scale,
        style: { width: `${TARGET_W}px`, maxWidth: `${TARGET_W}px` },  // 캡처 클론 폭 = 1080(섹션이 1080폭으로 reflow)
        // 제외 대상(수정/재생성 버튼 행·이미지 재생성 오버레이·편집패널): filter는 false 반환 시 노드 제외
        filter: (node: Node) => {
          if (!(node instanceof Element)) return true;
          const c = (node as HTMLElement).className;
          const cls = typeof c === 'string' ? c : '';
          return !(cls.includes('bs-actions') || cls.includes('img-regen-overlay') || cls.includes('edit-panel') || cls.includes('img-slot-empty'));
        },
      };

      const safeName = (productName || '상세페이지').replace(/[\\/:*?"<>|]/g, '');
      console.log('[섹션이미지] 시작 — 섹션:', units.length);
      if (units.length > 1) {
        alert(`${units.length}장(섹션별)으로 저장됩니다. 밴드/인스타엔 원하는 섹션만 골라 올리세요.`);
      }

      // 섹션 하나씩 → PNG 1장 (섹션 중간 안 잘림 자동 보장)
      for (let idx = 0; idx < units.length; idx++) {
        const u = units[idx];
        console.log(`[섹션이미지] ${idx + 1}/${units.length} 캡처 시작 (${u.offsetWidth}x${u.offsetHeight})`);
        let canvas: HTMLCanvasElement;
        try {
          canvas = await domToCanvas(u, opts);
          console.log(`[섹션이미지] ${idx + 1} 완료: ${canvas.width}x${canvas.height}`);
        } catch (e) {
          console.error(`[섹션이미지] ⚠️섹션 ${idx + 1} 캡처 실패 — 진짜 원인:`, e);
          throw e;
        }
        const blob: Blob | null = await new Promise(res => canvas.toBlob(b => res(b), 'image/png'));
        if (!blob) continue;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${safeName}_${String(idx + 1).padStart(2, '0')}.png`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
        await new Promise(r => setTimeout(r, 350)); // 다중 다운로드 간 텀(브라우저 차단 완화)
      }
    } catch (err) {
      const e = err as Error;
      console.error('[통이미지] ❌ 최종 에러 메시지:', e?.message);
      console.error('[통이미지] ❌ 스택:', e?.stack);
      console.error('[통이미지] ❌ 원본 객체:', err);
      alert('통이미지 캡처 실패 (진짜 원인): ' + (e?.message || String(err)));
    } finally {
      setCaptureLoading(false);
    }
  };

  // ── 섹션 순서 + 숨김 적용 ──
  // sectionOrder가 비어있으면(초기 마운트 직후) sections 그대로 사용
  const effectiveOrder = sectionOrder.length === displaySections.length
    ? sectionOrder
    : displaySections.map((_, i) => i);

  const orderedVisibleSections = effectiveOrder
    .filter(realIdx => !hiddenSections.has(realIdx))
    .map(realIdx => ({
      section: getEffectiveSection(realIdx),
      realIdx,
    }));

  // 다운로드용 최종 섹션 배열 (순서 + 숨김 + override 모두 반영)
  const finalSectionsForExport = orderedVisibleSections.map(o => o.section);

  const toggleHidden = (realIdx: number) => {
    setHiddenSections(prev => {
      const next = new Set(prev);
      if (next.has(realIdx)) next.delete(realIdx);
      else next.add(realIdx);
      return next;
    });
  };

  const handleDragStart = (idx: number) => setDragIdx(idx);
  const handleDragOver = (e: React.DragEvent, overIdx: number) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === overIdx) return;
    setSectionOrder(prev => {
      const next = [...prev];
      const [moved] = next.splice(dragIdx, 1);
      next.splice(overIdx, 0, moved);
      return next;
    });
    setDragIdx(overIdx);
  };
  const handleDragEnd = () => setDragIdx(null);

  const handleRegenSection = async (realIdx: number) => {
    const targetSec = getEffectiveSection(realIdx);
    if (!targetSec) return;
    setRegenLoadingSet(prev => new Set(prev).add(realIdx));
    try {
      const result = await regenFn(targetSec);
      if (result) {
        updateSection(realIdx, { headline: result.headline, body: result.body });
      }
    } finally {
      setRegenLoadingSet(prev => { const n = new Set(prev); n.delete(realIdx); return n; });
    }
  };

  // ── 빠른 수정 메뉴 ── 클릭 시 안내 toast + 필요시 섹션 목록으로 스크롤
  const quickActions: Array<{
    icon: typeof Type; title: string; desc: string; onClick: () => void;
  }> = [
    {
      icon: Type, title: '카피(텍스트) 수정', desc: '문구, 제목, 설명을 수정할 수 있어요',
      onClick: () => showHint("미리보기의 '✏️ 수정' 버튼으로 각 섹션 텍스트를 바로 고칠 수 있어요"),
    },
    {
      icon: ImageIcon, title: '이미지 교체 / 재생성', desc: '이미지, 배경을 교체하거나 AI로 재생성',
      onClick: () => showHint("미리보기의 각 이미지 위 '✦ 재생성' 버튼으로 이미지를 새로 만들 수 있어요"),
    },
    {
      icon: ArrowUpDown, title: '섹션 순서 변경', desc: '섹션 순서를 드래그로 변경할 수 있어요',
      onClick: () => { showHint('우측 섹션 목록에서 드래그로 순서를 바꿀 수 있어요'); scrollToSectionList(); },
    },
    {
      icon: EyeOff, title: '특정 섹션 숨기기', desc: '불필요한 섹션을 숨길 수 있어요',
      onClick: () => { showHint('섹션 목록의 눈 아이콘을 클릭해서 섹션을 숨길 수 있어요'); scrollToSectionList(); },
    },
  ];

  return (
    <div style={{
      maxWidth: 1280, margin: '0 auto', padding: '32px 32px 100px', fontFamily: 'var(--f)',
    }}>
      {/* 타이틀 */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{
          fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em', color: '#111',
          display: 'flex', alignItems: 'center', gap: 8, lineHeight: 1.3,
        }}>
          <Sparkles size={24} color="#6D4CFF" />
          상세페이지가 완성되었어요!
        </h1>
        <p style={{ fontSize: 15, color: '#666', marginTop: 8, lineHeight: 1.6 }}>
          아래 결과물을 확인하고, 필요시 빠르게 수정하거나 스토어에 바로 업로드해보세요.
        </p>
      </div>

      {/* 2단 그리드 (모바일 1단) */}
      <div className="layout-grid-result">

        {/* ── 좌측: 미리보기 ── */}
        <div>
          {/* 출력형태 탭 */}
          <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid #ECECF2', marginBottom: 16 }}>
            {[
              { id: 'blog',  label: '블로그형',   active: isBlog  },
              { id: 'slide', label: '슬라이드형', active: isSlide },
              { id: 'html',  label: 'HTML형',    active: isHtml  },
            ].map(t => (
              <button
                key={t.id}
                style={{
                  padding: '10px 16px', fontSize: 14, fontWeight: 700,
                  background: 'transparent', border: 'none',
                  borderBottom: t.active ? '2px solid #6D4CFF' : '2px solid transparent',
                  color: t.active ? '#6D4CFF' : '#999',
                  cursor: 'default', fontFamily: 'var(--f)',   // ★전부 disabled(출력형태 표시용 read-only)이므로 비활성에도 pointer 금지
                }}
                disabled
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* 미리보기 컨트롤 바 */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16,
          }}>
            {/* 모바일/PC 토글 */}
            <div style={{ display: 'flex', gap: 4, padding: 4, borderRadius: 12, background: '#F4F0FF' }}>
              <button
                onClick={() => setViewMode('mobile')}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '6px 12px', borderRadius: 8,
                  background: viewMode === 'mobile' ? '#fff' : 'transparent',
                  border: 'none',
                  fontSize: 13, fontWeight: 700,
                  color: viewMode === 'mobile' ? '#6D4CFF' : '#999',
                  cursor: 'pointer', fontFamily: 'var(--f)',
                  boxShadow: viewMode === 'mobile' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                  transition: 'all .15s',
                }}
              >
                <Smartphone size={14} /> 모바일
              </button>
              <button
                onClick={() => setViewMode('pc')}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '6px 12px', borderRadius: 8,
                  background: viewMode === 'pc' ? '#fff' : 'transparent',
                  border: 'none',
                  fontSize: 13, fontWeight: 700,
                  color: viewMode === 'pc' ? '#6D4CFF' : '#999',
                  cursor: 'pointer', fontFamily: 'var(--f)',
                  boxShadow: viewMode === 'pc' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                  transition: 'all .15s',
                }}
              >
                <Monitor size={14} /> PC
              </button>
            </div>

            {/* 줌 / 전체화면 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '6px 12px', borderRadius: 10, border: '1px solid #ECECF2',
                background: '#fff', fontSize: 13, color: '#111',
              }}>
                <button
                  onClick={zoomOut}
                  disabled={zoom <= 50}
                  style={{
                    background: 'none', border: 'none',
                    cursor: zoom <= 50 ? 'default' : 'pointer',
                    fontSize: 14, color: zoom <= 50 ? '#CCC' : '#666',
                    fontFamily: 'var(--f)', padding: 0,
                  }}
                >−</button>
                <span style={{ minWidth: 36, textAlign: 'center', fontWeight: 600 }}>{zoom}%</span>
                <button
                  onClick={zoomIn}
                  disabled={zoom >= 150}
                  style={{
                    background: 'none', border: 'none',
                    cursor: zoom >= 150 ? 'default' : 'pointer',
                    fontSize: 14, color: zoom >= 150 ? '#CCC' : '#666',
                    fontFamily: 'var(--f)', padding: 0,
                  }}
                >+</button>
              </div>
            </div>
          </div>

          {/* 미리보기 캔버스 */}
          <div style={{
            borderRadius: 24, border: '1px solid #ECECF2', background: '#fff',
            padding: 16, display: 'flex', justifyContent: 'center',
            overflow: 'auto', maxWidth: '100%',
          }}>
            <div
              className="preview-canvas-wrap"
              style={{
                width: (viewMode === 'mobile' ? 400 : 800) * (zoom / 100),
                transition: 'width .2s ease',
                flexShrink: 0,
              }}
            >
            <div
              className="preview-canvas-inner"
              style={{
                width: viewMode === 'mobile' ? 400 : 800,
                transform: `scale(${zoom / 100})`,
                transformOrigin: 'top left',
              }}
            >
              {isGenerating && (
                <div style={{
                  background: '#F4F0FF', border: '1px solid #bfdbfe', borderRadius: 8,
                  padding: '10px 16px', fontSize: 12, color: '#1d4ed8',
                  marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <span style={{
                    display: 'inline-block', width: 14, height: 14,
                    border: '2px solid #C4B5FD', borderTopColor: '#6D4CFF', borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite', flexShrink: 0,
                  }} />
                  이미지 자동 생성 중 ({doneCount}/{displaySections.length})
                </div>
              )}

              {isBlog && (
                <div ref={captureRef} style={{ background: '#fff' }}>
                  {orderedVisibleSections.map(({ section: sec, realIdx }, displayIdx) => (
                    <BlogSection
                      key={realIdx}
                      sec={sec}
                      onRegen={() => handleRegenSection(realIdx)}
                      regenLoading={regenLoadingSet.has(realIdx)}
                      onPatch={patch => updateSection(realIdx, patch)}
                      imgState={sectionImages[sec.num] ?? EMPTY_IMG}
                      onGenerateImage={() => generateImage(sec, AbortSignal.timeout(130_000))}
                      isLast={displayIdx === orderedVisibleSections.length - 1}
                      isFirst={displayIdx === 0}
                      onLightbox={sectionImages[sec.num]?.url ? () => setLightboxSecNum(sec.num) : undefined}
                      blockImages={blockImages}
                      onLightboxBlock={(key: string) => setLightboxSecNum(key)}
                    />
                  ))}
                </div>
              )}

              {isHtml && orderedVisibleSections.map(({ section: sec, realIdx }, displayIdx) => (
                <ImageSection
                  key={realIdx}
                  sec={sec}
                  imgState={sectionImages[sec.num] ?? EMPTY_IMG}
                  onGenerateImage={() => generateImage(sec, AbortSignal.timeout(130_000))}
                  index={displayIdx} accent="blue"
                  onLightbox={sectionImages[sec.num]?.url ? () => setLightboxSecNum(sec.num) : undefined}
                />
              ))}

              {/* baked 채택: Hero도 텍스트가 이미지에 합성되므로 ImageSection(이미지만)으로 렌더.
                  overlay 보류 — SLIDE_HERO_OVERLAY=true로 롤백하면 Hero가 SlideHero(진짜폰트 overlay)로 돌아감. */}
              {isSlide && orderedVisibleSections.map(({ section: sec, realIdx }, displayIdx) => (
                SLIDE_HERO_OVERLAY && displayIdx === 0 ? (
                  <SlideHero
                    key={realIdx}
                    sec={sec}
                    imgState={sectionImages[sec.num] ?? EMPTY_IMG}
                    onGenerateImage={() => generateImage(sec, AbortSignal.timeout(130_000), { slideHero: true })}
                    onPatch={patch => updateSection(realIdx, patch)}
                    onLightbox={sectionImages[sec.num]?.url ? () => setLightboxSecNum(sec.num) : undefined}
                  />
                ) : (
                  <ImageSection
                    key={realIdx}
                    sec={sec}
                    imgState={sectionImages[sec.num] ?? EMPTY_IMG}
                    onGenerateImage={() => generateImage(sec, AbortSignal.timeout(130_000), { slideHero: displayIdx === 0 })}
                    index={displayIdx} accent="purple"
                    onLightbox={sectionImages[sec.num]?.url ? () => setLightboxSecNum(sec.num) : undefined}
                  />
                )
              ))}
            </div>
            </div>
          </div>
        </div>

        {/* ── 우측 패널 ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* 1. 페이지 정보 */}
          <div style={{
            borderRadius: 20, border: '1px solid #ECECF2', background: '#fff', padding: 20,
          }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, color: '#111' }}>페이지 정보</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 13 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#666' }}>생성 타입</span>
                <span style={{ fontWeight: 700, color: '#111' }}>{outputTypeLabel}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#666' }}>전체 길이</span>
                <span style={{ fontWeight: 700, color: '#111' }}>{totalLength}px (예상)</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#666' }}>생성 일시</span>
                <span style={{ fontWeight: 700, color: '#111' }}>{createdAt}</span>
              </div>
            </div>
          </div>

          {/* 2. 빠른 수정 — UI만 */}
          <div style={{
            borderRadius: 20, border: '1px solid #ECECF2', background: '#fff', padding: 20,
          }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, color: '#111' }}>빠른 수정</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {quickActions.map((item, i) => (
                <button
                  key={i}
                  onClick={item.onClick}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: 12, borderRadius: 12, border: '1px solid #ECECF2',
                    background: '#fff', textAlign: 'left', cursor: 'pointer',
                    fontFamily: 'var(--f)', transition: 'border-color .15s, background .15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#D8D2FF'; e.currentTarget.style.background = '#FBFAFF'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#ECECF2'; e.currentTarget.style.background = '#fff'; }}
                >
                  <div style={{
                    width: 36, height: 36, borderRadius: 10, background: '#F4F0FF',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <item.icon size={18} color="#6D4CFF" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: '#111' }}>{item.title}</div>
                    <div style={{ fontSize: 11.5, color: '#999', marginTop: 2 }}>{item.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 3. 섹션 목록 — 표시만 */}
          <div
            ref={sectionListRef}
            style={{
              borderRadius: 20,
              border: sectionListHighlight ? '2px solid #6D4CFF' : '1px solid #ECECF2',
              background: '#fff', padding: 20,
              boxShadow: sectionListHighlight ? '0 0 0 4px rgba(109,76,255,0.15)' : 'none',
              transition: 'all .25s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#111' }}>섹션 목록</h3>
              <span style={{ fontSize: 12, color: '#999' }}>총 {displaySections.length}개</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {effectiveOrder.map((realIdx, displayIdx) => {
                if (!sections[realIdx]) return null;
                const sec = getEffectiveSection(realIdx);
                const thumb = sectionImages[sec.num]?.url;
                const isHidden = hiddenSections.has(realIdx);
                const isHovered = hoveredIdx === realIdx;
                const isDragging = dragIdx === displayIdx;
                const isRegenerating = regenLoadingSet.has(realIdx);
                return (
                  <div
                    key={realIdx}
                    draggable
                    onDragStart={() => handleDragStart(displayIdx)}
                    onDragOver={e => handleDragOver(e, displayIdx)}
                    onDragEnd={handleDragEnd}
                    onMouseEnter={() => setHoveredIdx(realIdx)}
                    onMouseLeave={() => setHoveredIdx(p => p === realIdx ? null : p)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: 10, borderRadius: 12,
                      background: isHovered ? '#FAFAFC' : 'transparent',
                      opacity: isHidden ? 0.5 : isDragging ? 0.4 : 1,
                      transition: 'opacity .15s, background .15s',
                    }}
                  >
                    <button
                      onClick={e => { e.stopPropagation(); toggleHidden(realIdx); }}
                      aria-label={isHidden ? '표시' : '숨김'}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        width: 24, height: 24, padding: 0, background: 'none', border: 'none',
                        cursor: 'pointer', flexShrink: 0,
                      }}
                    >
                      {isHidden
                        ? <EyeOff size={16} color="#999" />
                        : <Eye size={16} color="#6D4CFF" />
                      }
                    </button>
                    <div style={{
                      width: 36, height: 36, borderRadius: 8,
                      background: '#F4F0FF', flexShrink: 0, overflow: 'hidden',
                    }}>
                      {thumb && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={thumb} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      )}
                    </div>
                    <span style={{
                      fontSize: 13, fontWeight: 500, flex: 1, color: '#111',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                      {String(displayIdx + 1).padStart(2, '0')} {sec.name?.split('—')[0]?.trim() || sec.name}
                    </span>
                    {/* 호버 시 재생성 버튼 */}
                    {(isHovered || isRegenerating) && (
                      <button
                        onClick={e => { e.stopPropagation(); handleRegenSection(realIdx); }}
                        disabled={isRegenerating}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 4,
                          fontSize: 12, fontWeight: 700, color: '#6D4CFF',
                          padding: '4px 8px', borderRadius: 8,
                          background: '#F4F0FF', border: 'none',
                          cursor: isRegenerating ? 'default' : 'pointer',
                          flexShrink: 0, fontFamily: 'var(--f)',
                          opacity: isRegenerating ? 0.6 : 1,
                        }}
                      >
                        {isRegenerating ? (
                          <>
                            <span style={{ display: 'inline-block', width: 10, height: 10, border: '2px solid #c4b5fd', borderTopColor: '#6D4CFF', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                            생성 중
                          </>
                        ) : (
                          <><Sparkles size={12} /> 재생성</>
                        )}
                      </button>
                    )}
                    <GripVertical
                      size={14}
                      color="#CCC"
                      style={{ flexShrink: 0, cursor: 'grab' }}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* 4. 액션 버튼 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* 채널 업로드 — 준비 중 (비활성) */}
            <button
              disabled
              aria-disabled
              title="준비 중인 기능입니다"
              style={{
                width: '100%', height: 48, borderRadius: 14, background: '#F4F4F7', color: '#999',
                fontWeight: 700, fontSize: 14, border: '1px solid #ECECF2', cursor: 'not-allowed', fontFamily: 'var(--f)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              <Upload size={16} /> {ch ?? '스토어'} 업로드 (준비 중)
            </button>

            {/* HTML 다운로드 — 모든 출력형태에서 노출 */}
            <button
              onClick={handleHtmlDownload}
              disabled={htmlLoading}
              style={{
                width: '100%', height: 48, borderRadius: 14, border: '1px solid #ECECF2',
                background: '#fff', fontWeight: 700, fontSize: 14, color: '#111',
                cursor: htmlLoading ? 'default' : 'pointer', fontFamily: 'var(--f)',
                opacity: htmlLoading ? 0.7 : 1,
              }}
            >
              {htmlLoading ? '저장 중...' : 'HTML 다운로드'}
            </button>
            <p style={{
              margin: '-2px 2px 0', fontSize: 11.5, color: '#666', lineHeight: 1.55,
            }}>
              자사몰은 HTML을 그대로 사용하세요. 스마트스토어는 HTML을 열어 텍스트는 복사하고 이미지는 저장해 올려주세요.
            </p>

            {/* 통이미지 다운로드 — 슬라이드/HTML형: AI 섹션 이미지 스택 */}
            {!isBlog && (
              <button
                onClick={handleMergeDownload}
                disabled={mergeLoading}
                style={{
                  width: '100%', height: 48, borderRadius: 14, border: '1px solid #ECECF2',
                  background: '#fff', fontWeight: 700, fontSize: 14, color: '#111',
                  cursor: mergeLoading ? 'default' : 'pointer', fontFamily: 'var(--f)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  opacity: mergeLoading ? 0.7 : 1,
                }}
              >
                <ImageIcon size={16} /> {mergeLoading ? '합치는 중...' : '통이미지 다운로드'}
              </button>
            )}

            {/* 섹션별 이미지(본문 캡처) — 블로그형: 각 섹션을 1080폭 PNG 1장씩(밴드/인스타용, 원하는 섹션만 선택 업로드) */}
            {isBlog && (
              <button
                onClick={handleFullCapture}
                disabled={captureLoading}
                style={{
                  width: '100%', height: 48, borderRadius: 14, border: '1px solid #ECECF2',
                  background: '#fff', fontWeight: 700, fontSize: 14, color: '#111',
                  cursor: captureLoading ? 'default' : 'pointer', fontFamily: 'var(--f)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  opacity: captureLoading ? 0.7 : 1,
                }}
              >
                <ImageIcon size={16} /> {captureLoading ? '이미지 만드는 중...' : '섹션별 이미지 다운로드 (밴드/인스타용)'}
              </button>
            )}

            {/* 다시 생성하기 — go('s6') with confirm */}
            <button
              onClick={() => {
                if (!window.confirm('전체 텍스트와 이미지를 다시 생성합니다. 크레딧과 이미지 생성 비용이 발생할 수 있어요. 계속하시겠어요?')) return;
                go('s6');
              }}
              style={{
                width: '100%', height: 48, borderRadius: 14, border: '1px solid #ECECF2',
                background: '#fff', fontWeight: 700, fontSize: 14, color: '#111',
                cursor: 'pointer', fontFamily: 'var(--f)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              <RefreshCw size={16} /> 다시 생성하기
            </button>
          </div>

          {/* 도움말 박스 */}
          <div style={{ background: '#F4F0FF', borderRadius: 16, padding: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#111', marginBottom: 6 }}>
              더 다양한 수정이 필요하신가요?
            </div>
            <div style={{ fontSize: 12, color: '#666', lineHeight: 1.6 }}>
              상단의 각 단계를 돌아가면 더 세밀한 설정과 재생성이 가능합니다.
            </div>
          </div>
        </div>
      </div>

      {/* 하단 이전 단계 */}
      <div style={{ marginTop: 24 }}>
        <button
          onClick={() => go('s6')}
          style={{
            height: 44, borderRadius: 16, border: '1px solid #ECECF2',
            background: '#fff', padding: '0 20px',
            fontSize: 14, fontWeight: 700, color: '#666',
            cursor: 'pointer', fontFamily: 'var(--f)',
          }}
        >
          ← 이전 단계로
        </button>
      </div>

      {/* 텍스트 모달 — 기존 유지 */}
      {textModalOpen && (
        <TextModal sections={displaySections} onClose={() => setTextModalOpen(false)} />
      )}

      {/* 라이트박스 — 기존 유지 */}
      {lightboxSecNum && lightboxInitIdx >= 0 && (
        <EnhancedLightbox
          items={lightboxItems}
          initialIndex={lightboxInitIdx}
          onClose={closeLightbox}
        />
      )}

      {/* 빠른 수정 안내 toast */}
      {hint && (
        <div style={{
          position: 'fixed', bottom: 32, left: '50%', transform: 'translateX(-50%)',
          zIndex: 9000, padding: '12px 20px', borderRadius: 14,
          background: '#111', color: '#fff', fontSize: 14, fontWeight: 500,
          boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
          maxWidth: '90vw', textAlign: 'center', lineHeight: 1.5,
          pointerEvents: 'none',
        }}>
          {hint}
        </div>
      )}
    </div>
  );
}
