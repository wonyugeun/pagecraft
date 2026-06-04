'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useApp, Section, Block } from '@/store/AppContext';
import { resolveOutputType } from '@/lib/outputType';
import { compressMap } from '@/lib/imageCompress';
import BlockRenderer from '@/components/result/BlockRenderer';
import {
  Sparkles, Smartphone, Monitor, Maximize, Eye, GripVertical, Upload, RefreshCw,
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

/* ─── 통이미지 다운로드 ─── */
async function downloadMergedImage(
  sections: Section[],
  imgMap: Record<string, ImgState>,
  blockImgMap: Record<string, ImgState>,
  productName: string,
): Promise<void> {
  const urls: string[] = [];
  for (const sec of sections) {
    if (sec.blocks?.length) {
      sec.blocks.forEach((b, i) => {
        if (b.type !== 'image') return;
        const url = blockImgMap[`${sec.num}#${i}`]?.url;
        if (url) urls.push(url);
      });
    } else {
      const url = imgMap[sec.num]?.url;
      if (url) urls.push(url);
    }
  }
  if (urls.length === 0) {
    alert('다운로드할 이미지가 없습니다. 섹션 이미지를 먼저 생성해주세요.');
    return;
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
      a.download = `${productName || 'pagecraft'}_detail.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      resolve();
    }, 'image/png');
  });
}

/* ─── 블록 → HTML 변환 (블로그형 blocks 모드) ─── */
function blocksToHtml(blocks: Block[], sectionNum: string, blockImageUrls: Record<string, string>): string {
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
      case 'compare':
        return `<table class="compare">
  <thead><tr>${b.headers.map((h, idx) => `<th class="${idx === 1 ? 'hilite' : ''}">${escHtml(h)}</th>`).join('')}</tr></thead>
  <tbody>${b.rows.map(row => `<tr>${row.map((cell, idx) => `<td class="${idx === 1 ? 'hilite' : idx === 0 ? 'firstcol' : ''}">${idx === 1 ? '<span class="check">✓</span>' : ''}${escHtml(cell)}</td>`).join('')}</tr>`).join('')}</tbody>
</table>`;
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
        const url = blockImageUrls[`${sectionNum}#${i}`];
        return url
          ? `<figure class="image"><img src="${url}" alt="${escHtml(b.label)}" /></figure>`
          : `<div class="image-slot">📸 ${escHtml(b.label)}</div>`;
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

const HTML_BLOCKS_CSS = `
:root { color-scheme: light; }
.hero { margin-bottom: 32px; }
.hero h1 { font-size: 34px; font-weight: 900; line-height: 1.35; letter-spacing: -0.04em; color: #111; }
.hero-sub { margin-top: 20px; font-size: 16px; line-height: 1.9; color: #666; white-space: pre-line; }
.heading { margin: 40px 0 16px; border-left: 4px solid #6D4CFF; padding-left: 12px; font-size: 21px; font-weight: 700; line-height: 1.45; letter-spacing: -0.03em; color: #111; }
.paragraph { margin-bottom: 24px; font-size: 16px; line-height: 1.9; color: #666; white-space: pre-line; }

.checklist { list-style: none; margin-bottom: 32px; border-radius: 24px; border: 1px solid #ECECF2; background: #fff; padding: 20px; }
.checklist li { display: flex; gap: 12px; font-size: 15px; line-height: 1.7; color: #333; padding: 6px 0; }
.checklist li::before { content: '\\2713'; color: #6D4CFF; font-weight: 700; flex-shrink: 0; }

.steps { list-style: none; margin-bottom: 32px; display: flex; flex-direction: column; gap: 12px; }
.steps li { display: flex; gap: 16px; border-radius: 24px; border: 1px solid #ECECF2; background: #fff; padding: 20px; }
.step-num { width: 32px; height: 32px; flex-shrink: 0; display: inline-flex; align-items: center; justify-content: center; border-radius: 50%; background: #6D4CFF; color: #fff; font-size: 14px; font-weight: 700; }
.steps li strong { display: block; font-size: 16px; font-weight: 700; color: #111; }
.steps li p { margin-top: 4px; font-size: 14px; line-height: 1.7; color: #666; }

.iconcards { margin-bottom: 32px; display: grid; gap: 12px; }
.iconcard { border-radius: 24px; border: 1px solid #ECECF2; background: #fff; padding: 20px; text-align: center; box-shadow: 0 8px 24px rgba(0,0,0,0.04); }
.iconcard-icon { margin: 0 auto 12px; width: 48px; height: 48px; display: flex; align-items: center; justify-content: center; border-radius: 50%; background: #F4F0FF; color: #6D4CFF; font-size: 22px; }
.iconcard strong { display: block; font-size: 14px; font-weight: 700; color: #111; }
.iconcard p { margin-top: 4px; font-size: 13px; line-height: 1.5; color: #666; }

.stats { margin-bottom: 32px; display: grid; overflow: hidden; border-radius: 24px; border: 1px solid #E6DEFF; background: #F4F0FF; }
.stat { padding: 20px; text-align: center; border-right: 1px solid #E6DEFF; }
.stat:last-child { border-right: none; }
.stat strong { display: block; font-size: 30px; font-weight: 900; letter-spacing: -0.04em; color: #6D4CFF; }
.stat small { margin-top: 4px; display: block; font-size: 13px; color: #666; }

.compare { width: 100%; border-collapse: collapse; margin-bottom: 32px; border: 1px solid #ECECF2; border-radius: 24px; overflow: hidden; font-size: 14px; }
.compare th, .compare td { padding: 16px; text-align: center; }
.compare th { background: #FAFAFC; font-weight: 700; color: #111; }
.compare th.hilite { background: #6D4CFF; color: #fff; }
.compare td { border-top: 1px solid #ECECF2; }
.compare td.firstcol { font-weight: 500; color: #111; }
.compare td.hilite { background: #FBFAFF; font-weight: 700; color: #6D4CFF; }
.compare .check { display: block; margin: 0 auto 4px; color: #6D4CFF; font-weight: 900; }

.quote { margin-bottom: 32px; border-radius: 24px; border: 1px solid #E6DEFF; background: #F4F0FF; padding: 24px; }
.quote-icon { font-size: 36px; line-height: 1; color: #6D4CFF; font-family: Georgia, serif; margin-bottom: 8px; }
.quote p { font-size: 16px; line-height: 1.85; color: #333; white-space: pre-line; }
.quote footer { margin-top: 16px; display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.quote .stars { color: #6D4CFF; font-size: 14px; letter-spacing: 2px; }
.quote .author { font-size: 13px; color: #666; }

.faq { margin-bottom: 32px; border-radius: 24px; border: 1px solid #ECECF2; background: #fff; overflow: hidden; }
.faq dt { padding: 20px 20px 8px; font-size: 15px; font-weight: 700; color: #111; }
.faq dd { padding: 0 20px 20px; font-size: 14px; line-height: 1.7; color: #666; border-bottom: 1px solid #ECECF2; }
.faq dd:last-child { border-bottom: none; }

.image { margin: 0 0 32px; overflow: hidden; border-radius: 24px; border: 1px solid #ECECF2; }
.image img { width: 100%; aspect-ratio: 4/3; object-fit: cover; display: block; }
.image-slot { margin-bottom: 32px; width: 100%; aspect-ratio: 4/3; background: linear-gradient(135deg,#F4F0FF,#fff,#FAFAFC); border-radius: 24px; border: 1px solid #ECECF2; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700; color: #6D4CFF; }

.cta { border-radius: 24px; border: 1px solid #E6DEFF; background: #F4F0FF; padding: 32px; text-align: center; margin-bottom: 32px; }
.cta h2 { font-size: 24px; font-weight: 900; line-height: 1.45; letter-spacing: -0.04em; color: #111; }
.cta-btn { display: inline-flex; align-items: center; justify-content: center; margin-top: 24px; height: 48px; padding: 0 24px; border-radius: 16px; background: #6D4CFF; color: #fff; font-size: 15px; font-weight: 700; text-decoration: none; }
`;

/* ─── HTML 다운로드 ─── */
async function downloadHtml(
  sections: Section[],
  meta: string,
  productName: string,
  imgMap: Record<string, ImgState>,
  blockImgMap: Record<string, ImgState>,
): Promise<boolean> {
  try {
    // 블록 이미지 압축본으로 추출 (800px / JPEG 0.7)
    const rawBlockUrls: Record<string, string> = {};
    for (const [k, st] of Object.entries(blockImgMap)) {
      if (st?.url) rawBlockUrls[k] = st.url;
    }
    const compressedBlockUrls = await compressMap(rawBlockUrls);

    const sectionsHtml = sections.map(sec => {
      if (sec.blocks?.length) {
        return `\n    <section class="sec sec-blocks">\n${blocksToHtml(sec.blocks, sec.num, compressedBlockUrls)}\n    </section>`;
      }
      // 기존 폴백 (blocks 없는 섹션)
      const imgUrl = imgMap[sec.num]?.url;
      const imgBlock = imgUrl
        ? `<img src="${imgUrl}" alt="${escHtml(sec.imageLabel)}" style="width:100%;display:block;margin-bottom:32px;" />`
        : `<div class="img-slot"><div class="img-icon">📸</div><div class="img-label">${escHtml(sec.imageLabel)}</div></div>`;
      return `\n    <section class="sec">\n      <h2>${escHtml(sec.headline).replace(/\n/g, '<br>')}</h2>\n      ${imgBlock}\n      <p>${escHtml(sec.body)}</p>\n    </section>`;
    }).join('\n');
    const html = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escHtml(productName || '상세페이지')} — PageCraft</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Pretendard', 'Apple SD Gothic Neo', 'Noto Sans KR', system-ui, -apple-system, sans-serif; background: #fff; color: #111; max-width: 800px; margin: 0 auto; padding: 0 0 80px; }
    .meta { background: #f8f9fa; padding: 12px 20px; font-size: 12px; color: #888; border-bottom: 1px solid #eee; }
    .sec { padding: 48px 48px 0; }
    .sec-blocks { padding-top: 0; padding-bottom: 0; }
    .sec h2 { font-size: 24px; font-weight: 700; text-align: left; line-height: 1.55; margin-bottom: 20px; letter-spacing: -0.4px; }
    .sec p { font-size: 15px; line-height: 2.1; text-align: left; color: #555; white-space: pre-line; }
    .img-slot { width: 100%; aspect-ratio: 4/3; background: #f1f5f9; border: 2px dashed #cbd5e1; border-radius: 8px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; margin-bottom: 20px; }
    .img-slot img { width: 100%; border-radius: 8px; display: block; margin-bottom: 20px; }
    .img-icon { font-size: 36px; }
    .img-label { font-size: 14px; font-weight: 700; color: #64748b; }
    ${HTML_BLOCKS_CSS}
  </style>
</head>
<body>
  <div class="meta">PageCraft 생성 · ${escHtml(meta)}</div>
${sectionsHtml}
</body>
</html>`;
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(productName || 'pagecraft').replace(/[/\\?%*:|"<>]/g, '_')}_detail.html`;
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
type ImgState = { loading: boolean; url: string | null; error: boolean };
const EMPTY_IMG: ImgState = { loading: false, url: null, error: false };

/* ─── 향상된 라이트박스 (prev/next + keyboard) ─── */
function EnhancedLightbox({ items, initialIndex, onClose }: {
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
      <div style={{ ...slotStyle, height: 'auto', padding: 0, position: 'relative', display: 'flex', justifyContent: 'center', background: '#f8fafc' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url} alt={sec.imageLabel}
          style={{ width: '100%', maxWidth: 860, height: 'auto', objectFit: 'contain', display: 'block', cursor: onLightbox ? 'zoom-in' : 'default' }}
          onClick={onLightbox}
        />
        <button
          onClick={onGenerate}
          style={{ position: 'absolute', bottom: 10, right: 10, fontSize: 11, padding: '4px 10px', background: 'rgba(0,0,0,.55)', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontFamily: 'var(--f)' }}
        >✦ 재생성</button>
      </div>
    );
  }

  return (
    <div
      onClick={loading ? undefined : onGenerate}
      style={{ ...slotStyle, cursor: loading ? 'default' : 'pointer', transition: 'background .15s' }}
      title={loading ? '생성 중...' : '클릭하면 AI 이미지 재생성'}
    >
      {loading ? (
        <>
          <div style={{ width: 32, height: 32, border: '3px solid #cbd5e1', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <div style={{ fontSize: 12, color: labelColor, marginTop: 6 }}>이미지 생성 중...</div>
        </>
      ) : (
        <>
          <div style={{ fontSize: 28 }}>📸</div>
          <div style={{ fontSize: 12, fontWeight: 700, color: labelColor }}>{sec.imageLabel}</div>
          {!error && <div style={{ marginTop: 8, fontSize: 11, padding: '4px 12px', background: genBg, color: '#3b82f6', borderRadius: 20, fontWeight: 600 }}>✦ 클릭하여 재생성</div>}
          {error && <div style={{ fontSize: 11, color: '#ef4444', marginTop: 4 }}>생성 실패 — 클릭하여 재시도</div>}
        </>
      )}
    </div>
  );
}

/* ─── 블로그형 섹션 ─── (controlled: sec 표시 + body 수정/재생성은 외부 위임) */
function BlogSection({ sec, onRegen, regenLoading, onSaveBody, imgState, onGenerateImage, isLast, onLightbox, blockImages, onLightboxBlock }: {
  sec: Section;
  onRegen: () => void;
  regenLoading: boolean;
  onSaveBody: (body: string) => void;
  imgState: ImgState;
  onGenerateImage: () => void;
  isLast: boolean;
  onLightbox?: () => void;
  blockImages?: Record<string, ImgState>;
  onLightboxBlock?: (key: string) => void;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [editVal, setEditVal] = useState(sec.body);

  // 외부에서 sec.body가 바뀌면(재생성/override) 편집 중이 아닐 때만 동기화
  useEffect(() => {
    if (!editOpen) setEditVal(sec.body);
  }, [sec.body, editOpen]);

  const hasBlocks = !!sec.blocks?.length;

  return (
    <>
      <div style={{ background: '#fff' }}>
        {hasBlocks ? (
          <>
            <BlockRenderer blocks={sec.blocks!} sectionNum={sec.num} blockImages={blockImages} onLightboxBlock={onLightboxBlock} />
            <div style={{ padding: '0 36px 40px', display: 'flex', justifyContent: 'center', gap: 8 }}>
              <button className="bs-regen-btn" onClick={onRegen} disabled={regenLoading}>
                {regenLoading ? <><span style={{ display: 'inline-block', width: 11, height: 11, border: '2px solid #a78bfa', borderTopColor: '#7c3aed', borderRadius: '50%', animation: 'spin 0.7s linear infinite', marginRight: 4, verticalAlign: 'middle' }} />생성 중</> : '✦ 재생성'}
              </button>
            </div>
          </>
        ) : (
          <>
            <div style={{ padding: '48px 36px 0', textAlign: 'left', fontSize: 21, fontWeight: 700, color: '#111', lineHeight: 1.55, letterSpacing: '-0.4px', whiteSpace: 'pre-line' }}>{sec.headline}</div>
            <div style={{ marginTop: 20 }}>
              <ImgSlot
                sec={sec} imgState={imgState} onGenerate={onGenerateImage}
                slotStyle={{ width: '100%', aspectRatio: '4/3', background: '#f4f6f8', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 8 }}
                onLightbox={onLightbox}
              />
            </div>
            <div style={{ padding: '20px 36px 0', textAlign: 'left', fontSize: 14.5, color: '#555', lineHeight: 2.1, whiteSpace: 'pre-line' }}>{sec.body}</div>
            <div style={{ padding: '18px 36px 40px', display: 'flex', justifyContent: 'center', gap: 8 }}>
              <button className="bs-edit-btn" onClick={() => setEditOpen(p => !p)}>{editOpen ? '닫기' : '✏️ 수정'}</button>
              <button className="bs-regen-btn" onClick={onRegen} disabled={regenLoading}>
                {regenLoading ? <><span style={{ display: 'inline-block', width: 11, height: 11, border: '2px solid #a78bfa', borderTopColor: '#7c3aed', borderRadius: '50%', animation: 'spin 0.7s linear infinite', marginRight: 4, verticalAlign: 'middle' }} />생성 중</> : '✦ 재생성'}
              </button>
            </div>
            {editOpen && (
              <div className="edit-panel open" style={{ margin: '-24px 36px 32px', maxWidth: 580, marginLeft: 'auto', marginRight: 'auto' }}>
                <textarea className="edit-inp" value={editVal} onChange={e => setEditVal(e.target.value)} />
                <div className="edit-actions">
                  <button className="edit-save" onClick={() => { onSaveBody(editVal); setEditOpen(false); }}>저장</button>
                  <button className="edit-cancel" onClick={() => { setEditVal(sec.body); setEditOpen(false); }}>취소</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
      {!isLast && <div style={{ height: 56 }} />}
    </>
  );
}

/* ─── 슬라이드형 카드 ─── */
function SlideCard({ sec, onRegen, imgState, onGenerateImage, index, onLightbox }: {
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
        <span style={{ fontSize: 10, fontWeight: 700, color: '#7c3aed', background: '#ede9fe', padding: '2px 8px', borderRadius: 20 }}>{sec.num}</span>
        <span style={{ fontSize: 12, color: '#888' }}>{sec.name}</span>
      </div>
      <ImgSlot
        sec={sec} imgState={imgState} onGenerate={onGenerateImage}
        slotStyle={{ height: 240, background: index % 2 === 0 ? '#f5f3ff' : '#faf5ff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, margin: '10px 0 0' }}
        labelColor="#7c3aed" descColor="#a78bfa" genBg="#ede9fe"
        onLightbox={onLightbox}
      />
      <div style={{ padding: '16px 20px 14px' }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#111', lineHeight: 1.5, marginBottom: 8, whiteSpace: 'pre-line' }}>{headline}</div>
        <div style={{ fontSize: 13, color: '#666', lineHeight: 1.85, marginBottom: 12 }}>{saved}</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="bs-edit-btn" onClick={() => setEditOpen(p => !p)}>{editOpen ? '닫기' : '✏️ 수정'}</button>
          <button className="bs-regen-btn" onClick={handleRegen} disabled={regenLoading}>
            {regenLoading ? <><span style={{ display: 'inline-block', width: 12, height: 12, border: '2px solid #a78bfa', borderTopColor: '#7c3aed', borderRadius: '50%', animation: 'spin 0.7s linear infinite', marginRight: 5, verticalAlign: 'middle' }} />생성 중...</> : '✦ 재생성'}
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
function ImageSection({ sec, imgState, onGenerateImage, index, accent, onLightbox }: {
  sec: Section;
  imgState: ImgState;
  onGenerateImage: () => void;
  index: number;
  accent: 'purple' | 'blue';
  onLightbox?: () => void;
}) {
  const accentColor = accent === 'purple' ? '#7c3aed' : '#2563eb';
  const accentBg = accent === 'purple' ? '#ede9fe' : '#eff6ff';
  const slotBg = accent === 'purple' ? (index % 2 === 0 ? '#f5f3ff' : '#faf5ff') : '#f0f6ff';

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
          labelColor={accentColor} descColor={accent === 'purple' ? '#a78bfa' : '#93c5fd'} genBg={accentBg}
          onLightbox={onLightbox}
        />
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
    a.download = `${(productName || 'pagecraft').replace(/[/\\?%*:|"<>]/g, '_')}_thumb_${typeId}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div>
      <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#1e40af', marginBottom: 20, lineHeight: 1.7 }}>
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
  const { cat, ch, type, out, sections, productName, productExtra, productImages, go, restoredImages, restoredBlockImages, updateLatestHistoryImages } = useApp();
  const [lightboxSecNum, setLightboxSecNum] = useState<string | null>(null);
  const [textModalOpen,  setTextModalOpen]  = useState(false);
  const [sectionImages,  setSectionImages]  = useState<Record<string, ImgState>>({});
  const [blockImages,    setBlockImages]    = useState<Record<string, ImgState>>({});
  const [mergeLoading,   setMergeLoading]   = useState(false);
  const [htmlLoading,    setHtmlLoading]    = useState(false);
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
  const savedImagesRef = useRef(false);

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

  const updateSection = (realIdx: number, patch: Partial<Section>) => {
    setSectionOverrides(prev => ({
      ...prev,
      [realIdx]: { ...prev[realIdx], ...patch },
    }));
  };

  const productImagesRef = useRef(productImages);
  useEffect(() => { productImagesRef.current = productImages; }, [productImages]);

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
            <button className="btn-next" onClick={() => go('s6')}>↻ 다시 생성</button>
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

  const generateImage = useCallback(async (sec: Section, signal: AbortSignal) => {
    setSectionImages(p => ({ ...p, [sec.num]: { loading: true, url: null, error: false } }));
    try {
      const images = productImagesRef.current;
      const promptText = effectiveOut === 'blog'
        ? sec.imageDesc
        : `${sec.imageDesc}. 텍스트 오버레이: "${sec.headline.replace(/\n/g, ' ')}"`;
      const res = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptText,
          sectionNum: sec.num,
          productImages: images.length > 0 ? images : undefined,
          outputType: effectiveOut,
        }),
        signal,
      });
      if (signal.aborted) return;
      const data = await res.json();
      if (signal.aborted) return;
      if (data.imageBase64) {
        setSectionImages(p => ({ ...p, [sec.num]: { loading: false, url: `data:${data.mimeType};base64,${data.imageBase64}`, error: false } }));
      } else {
        setSectionImages(p => ({ ...p, [sec.num]: { loading: false, url: null, error: true } }));
      }
    } catch (err) {
      if (signal.aborted) return;
      setSectionImages(p => ({ ...p, [sec.num]: { loading: false, url: null, error: true } }));
    }
  }, [effectiveOut]);

  const generateBlockImage = useCallback(async (sec: Section, blockIdx: number, desc: string, signal: AbortSignal) => {
    const key = `${sec.num}#${blockIdx}`;
    setBlockImages(p => ({ ...p, [key]: { loading: true, url: null, error: false } }));
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
        }),
        signal,
      });
      if (signal.aborted) return;
      const data = await res.json();
      if (signal.aborted) return;
      if (data.imageBase64) {
        setBlockImages(p => ({ ...p, [key]: { loading: false, url: `data:${data.mimeType};base64,${data.imageBase64}`, error: false } }));
      } else {
        setBlockImages(p => ({ ...p, [key]: { loading: false, url: null, error: true } }));
      }
    } catch (err) {
      if (signal.aborted) return;
      setBlockImages(p => ({ ...p, [key]: { loading: false, url: null, error: true } }));
    }
  }, []);

  useEffect(() => {
    if (!displaySections.length) return;
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    savedImagesRef.current = false;

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

    const sleep = (ms: number) => new Promise<void>(r => {
      const id = setTimeout(r, ms);
      ctrl.signal.addEventListener('abort', () => { clearTimeout(id); r(); }, { once: true });
    });

    (async () => {
      let count = 0;
      for (let i = 0; i < displaySections.length; i++) {
        if (ctrl.signal.aborted) break;
        const sec = displaySections[i];
        const hasBlocks = !!sec.blocks?.length;

        if (hasBlocks) {
          // 블록 모드: image 블록만 따로 생성 (섹션 대표 이미지 skip)
          for (let bi = 0; bi < sec.blocks!.length; bi++) {
            if (ctrl.signal.aborted) break;
            const block = sec.blocks![bi];
            if (block.type !== 'image') continue;
            if (restoredBlockImages[`${sec.num}#${bi}`]) continue;
            if (count > 0) await sleep(3_000);
            if (ctrl.signal.aborted) break;
            await generateBlockImage(sec, bi, block.desc, ctrl.signal);
            count++;
          }
        } else {
          // 기존 경로: 섹션 대표 이미지
          if (restoredImages[sec.num]) continue;
          if (count > 0) await sleep(3_000);
          if (ctrl.signal.aborted) break;
          await generateImage(sec, ctrl.signal);
          count++;
        }
      }
    })();

    return () => { ctrl.abort(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displaySections.length]);

  useEffect(() => {
    if (!displaySections.length || savedImagesRef.current) return;
    const allDone = displaySections.every(sec => {
      if (sec.blocks?.length) {
        return sec.blocks.every((b, bi) => {
          if (b.type !== 'image') return true;
          const img = blockImages[`${sec.num}#${bi}`];
          return img && !img.loading;
        });
      }
      const img = sectionImages[sec.num];
      return img && !img.loading;
    });
    if (!allDone) return;

    const sectionUrls: Record<string, string> = {};
    for (const sec of displaySections) {
      const url = sectionImages[sec.num]?.url;
      if (url) sectionUrls[sec.num] = url;
    }
    const blockUrls: Record<string, string> = {};
    for (const sec of displaySections) {
      if (!sec.blocks?.length) continue;
      sec.blocks.forEach((b, bi) => {
        if (b.type !== 'image') return;
        const url = blockImages[`${sec.num}#${bi}`]?.url;
        if (url) blockUrls[`${sec.num}#${bi}`] = url;
      });
    }
    if (Object.keys(sectionUrls).length === 0 && Object.keys(blockUrls).length === 0) return;

    savedImagesRef.current = true;
    (async () => {
      const [compressedSection, compressedBlock] = await Promise.all([
        compressMap(sectionUrls),
        compressMap(blockUrls),
      ]);
      updateLatestHistoryImages(compressedSection, compressedBlock);
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
        body: JSON.stringify({ cat, ch, type, out, productName, productExtra, sectionNum: sec.num, sectionName: sec.name }),
        signal: AbortSignal.timeout(30_000),
      });
      const data = await res.json();
      return data.section ?? null;
    } catch (err) {
      console.error('[regenFn] error:', err);
      return null;
    }
  }, [cat, ch, type, out, productName, productExtra]);

  const outputTypeLabel = isBlog ? '블로그형' : isSlide ? '슬라이드형' : 'HTML형';
  const label = isSlide ? '이미지 슬라이드형' : isHtml ? 'HTML 섹션형' : '블로그형 (글+그림)';
  const meta  = [cat, ch, type, label, `${displaySections.length}섹션`].filter(Boolean).join(' · ');

  // TODO: 실제 페이지 길이 계산 (현재는 섹션 수 기반 추정)
  const totalLength = (displaySections.length * 1040).toLocaleString();

  const closeLightbox = useCallback(() => setLightboxSecNum(null), []);

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
    setHtmlLoading(true);
    await new Promise(r => setTimeout(r, 50));
    // 화면에 보이는 그대로 (순서 + 숨김 + 텍스트 수정/재생성 반영)
    const ok = await downloadHtml(finalSectionsForExport, meta, productName, sectionImages, blockImages);
    if (!ok) alert('HTML 다운로드 중 오류가 발생했어요. 다시 시도해주세요.');
    setTimeout(() => setHtmlLoading(false), 2000);
  };

  const handleMergeDownload = async () => {
    if (mergeLoading) return;
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
                  cursor: t.active ? 'default' : 'pointer', fontFamily: 'var(--f)',
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
              <button style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 12px', borderRadius: 10, border: '1px solid #ECECF2',
                background: '#fff', fontSize: 13, fontFamily: 'var(--f)',
                cursor: 'pointer', color: '#666',
              }}>
                <Maximize size={14} /> 전체화면
              </button>
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
                  background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8,
                  padding: '10px 16px', fontSize: 12, color: '#1d4ed8',
                  marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <span style={{
                    display: 'inline-block', width: 14, height: 14,
                    border: '2px solid #93c5fd', borderTopColor: '#3b82f6', borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite', flexShrink: 0,
                  }} />
                  이미지 자동 생성 중 ({doneCount}/{displaySections.length})
                </div>
              )}

              {isBlog && (
                <div style={{ background: '#fff' }}>
                  {orderedVisibleSections.map(({ section: sec, realIdx }, displayIdx) => (
                    <BlogSection
                      key={realIdx}
                      sec={sec}
                      onRegen={() => handleRegenSection(realIdx)}
                      regenLoading={regenLoadingSet.has(realIdx)}
                      onSaveBody={body => updateSection(realIdx, { body })}
                      imgState={sectionImages[sec.num] ?? EMPTY_IMG}
                      onGenerateImage={() => generateImage(sec, AbortSignal.timeout(130_000))}
                      isLast={displayIdx === orderedVisibleSections.length - 1}
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

              {isSlide && orderedVisibleSections.map(({ section: sec, realIdx }, displayIdx) => (
                <ImageSection
                  key={realIdx}
                  sec={sec}
                  imgState={sectionImages[sec.num] ?? EMPTY_IMG}
                  onGenerateImage={() => generateImage(sec, AbortSignal.timeout(130_000))}
                  index={displayIdx} accent="purple"
                  onLightbox={sectionImages[sec.num]?.url ? () => setLightboxSecNum(sec.num) : undefined}
                />
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

            {/* 통이미지 다운로드 — 블로그형 제외 (텍스트가 빠지므로) */}
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
