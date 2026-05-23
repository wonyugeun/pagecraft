'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useApp, Section } from '@/store/AppContext';

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
  productName: string,
): Promise<void> {
  const urls = sections.map(s => imgMap[s.num]?.url).filter((u): u is string => !!u);
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

/* ─── HTML 다운로드 ─── */
function downloadHtml(
  sections: Section[],
  meta: string,
  productName: string,
  imgMap: Record<string, ImgState>,
): boolean {
  try {
    const sectionsHtml = sections.map(sec => {
      const imgUrl = imgMap[sec.num]?.url;
      const imgBlock = imgUrl
        ? `<img src="${imgUrl}" alt="${escHtml(sec.imageLabel)}" style="width:100%;display:block;margin-bottom:32px;" />`
        : `<div class="img-slot"><div class="img-icon">📸</div><div class="img-label">${escHtml(sec.imageLabel)}</div><div class="img-desc">${escHtml(sec.imageDesc)}</div></div>`;
      return `\n    <section class="sec">\n      <h2>${escHtml(sec.headline).replace(/\n/g, '<br>')}</h2>\n      ${imgBlock}\n      <p>${escHtml(sec.body)}</p>\n    </section>`;
    }).join('\n');
    const html = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escHtml(productName || '상세페이지')} — PageCraft</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif; background: #fff; color: #111; max-width: 860px; margin: 0 auto; }
    .meta { background: #f8f9fa; padding: 12px 20px; font-size: 12px; color: #888; border-bottom: 1px solid #eee; }
    .sec { padding: 60px 40px; border-bottom: 1px solid #f0f0f0; }
    h2 { font-size: 28px; font-weight: 800; text-align: center; line-height: 1.45; margin-bottom: 32px; letter-spacing: -0.5px; }
    .img-slot { width: 100%; height: 340px; background: #f1f5f9; border: 2px dashed #cbd5e1; border-radius: 8px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; margin-bottom: 32px; }
    .img-icon { font-size: 36px; }
    .img-label { font-size: 14px; font-weight: 700; color: #64748b; }
    .img-desc { font-size: 12px; color: #94a3b8; text-align: center; max-width: 320px; line-height: 1.6; }
    p { font-size: 16px; line-height: 2; text-align: center; color: #444; max-width: 640px; margin: 0 auto; }
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
          <div style={{ fontSize: 11, color: descColor, textAlign: 'center', maxWidth: 260, lineHeight: 1.6 }}>{sec.imageDesc}</div>
          {!error && <div style={{ marginTop: 8, fontSize: 11, padding: '4px 12px', background: genBg, color: '#3b82f6', borderRadius: 20, fontWeight: 600 }}>✦ 클릭하여 재생성</div>}
          {error && <div style={{ fontSize: 11, color: '#ef4444', marginTop: 4 }}>생성 실패 — 클릭하여 재시도</div>}
        </>
      )}
    </div>
  );
}

/* ─── 블로그형 섹션 ─── */
function BlogSection({ sec, onRegen, imgState, onGenerateImage, isLast, onLightbox }: {
  sec: Section;
  onRegen: (s: Section) => Promise<Section | null>;
  imgState: ImgState;
  onGenerateImage: () => void;
  isLast: boolean;
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
    <>
      <div style={{ background: '#fff' }}>
        <div style={{ paddingTop: 48, textAlign: 'center', fontSize: 9, fontWeight: 700, color: '#ddd', letterSpacing: '0.2em' }}>{sec.num}</div>
        <div style={{ padding: '14px 36px 0', textAlign: 'center', fontSize: 23, fontWeight: 800, color: '#111', lineHeight: 1.55, letterSpacing: '-0.4px', whiteSpace: 'pre-line' }}>{headline}</div>
        <div style={{ marginTop: 28 }}>
          <ImgSlot
            sec={sec} imgState={imgState} onGenerate={onGenerateImage}
            slotStyle={{ width: '100%', height: 300, background: '#f4f6f8', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            onLightbox={onLightbox}
          />
        </div>
        <div style={{ padding: '26px 36px 0', textAlign: 'center', fontSize: 14.5, color: '#555', lineHeight: 2.1, maxWidth: 580, margin: '0 auto' }}>{saved}</div>
        <div style={{ padding: '18px 36px 40px', display: 'flex', justifyContent: 'center', gap: 8 }}>
          <button className="bs-edit-btn" onClick={() => setEditOpen(p => !p)}>{editOpen ? '닫기' : '✏️ 수정'}</button>
          <button className="bs-regen-btn" onClick={handleRegen} disabled={regenLoading}>
            {regenLoading ? <><span style={{ display: 'inline-block', width: 11, height: 11, border: '2px solid #a78bfa', borderTopColor: '#7c3aed', borderRadius: '50%', animation: 'spin 0.7s linear infinite', marginRight: 4, verticalAlign: 'middle' }} />생성 중</> : '✦ 재생성'}
          </button>
        </div>
        {editOpen && (
          <div className="edit-panel open" style={{ margin: '-24px 36px 32px', maxWidth: 580, marginLeft: 'auto', marginRight: 'auto' }}>
            <textarea className="edit-inp" value={editVal} onChange={e => setEditVal(e.target.value)} />
            <div className="edit-actions">
              <button className="edit-save" onClick={() => { setSaved(editVal); setEditOpen(false); }}>저장</button>
              <button className="edit-cancel" onClick={() => { setEditVal(saved); setEditOpen(false); }}>취소</button>
            </div>
          </div>
        )}
      </div>
      {!isLast && <div style={{ height: 1, background: '#efefef' }} />}
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
      {/* 채널 규격 안내 */}
      <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#1e40af', marginBottom: 20, lineHeight: 1.7 }}>
        📐 <b>{ch ?? '기본'} 권장 규격:</b> {size}px &nbsp;·&nbsp; 썸네일은 다운로드 전용이며 상세페이지에 추가되지 않아요
      </div>

      {/* 타입 선택 */}
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

      {/* 레퍼런스 이미지 업로드 (ref_copy 전용) */}
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

      {/* 생성 버튼 */}
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

      {/* 결과 */}
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
  const { cat, ch, type, out, sections, productName, productExtra, productImages, go, restoredImages, updateLatestHistoryImages } = useApp();
  const [activeTab,      setActiveTab]      = useState<'detail' | 'thumb'>('detail');
  const [lightboxSecNum, setLightboxSecNum] = useState<string | null>(null);
  const [textModalOpen,  setTextModalOpen]  = useState(false);
  const [sectionImages,  setSectionImages]  = useState<Record<string, ImgState>>({});
  const [mergeLoading,   setMergeLoading]   = useState(false);
  const [htmlLoading,    setHtmlLoading]    = useState(false);
  const cancelRef = useRef(false);
  const savedImagesRef = useRef(false);

  const productImagesRef = useRef(productImages);
  useEffect(() => { productImagesRef.current = productImages; }, [productImages]);

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

  const effectiveOut =
    ch === '쿠팡'                       ? 'slide' :
    (ch === '자사몰' || ch === '와디즈') ? 'html'  :
    (out ?? 'blog');
  const isSlide = effectiveOut === 'slide';
  const isHtml  = effectiveOut === 'html';
  const isBlog  = !isSlide && !isHtml;

  const generateImage = useCallback(async (sec: Section) => {
    setSectionImages(p => ({ ...p, [sec.num]: { loading: true, url: null, error: false } }));
    try {
      const images = productImagesRef.current;
      const res = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `${sec.imageDesc}. 텍스트 오버레이: "${sec.headline.replace(/\n/g, ' ')}"`,
          sectionNum: sec.num,
          productImages: images.length > 0 ? images : undefined,
        }),
        signal: AbortSignal.timeout(130_000),
      });
      const data = await res.json();
      if (data.imageBase64) {
        setSectionImages(p => ({ ...p, [sec.num]: { loading: false, url: `data:${data.mimeType};base64,${data.imageBase64}`, error: false } }));
      } else {
        setSectionImages(p => ({ ...p, [sec.num]: { loading: false, url: null, error: true } }));
      }
    } catch {
      setSectionImages(p => ({ ...p, [sec.num]: { loading: false, url: null, error: true } }));
    }
  }, []);

  useEffect(() => {
    if (!displaySections.length) return;
    cancelRef.current = false;
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

    (async () => {
      for (let i = 0; i < displaySections.length; i++) {
        if (cancelRef.current) break;
        const sec = displaySections[i];
        if (restoredImages[sec.num]) continue;
        if (i > 0) await new Promise(r => setTimeout(r, 3_000));
        if (cancelRef.current) break;
        await generateImage(sec);
      }
    })();

    return () => { cancelRef.current = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displaySections.length]);

  useEffect(() => {
    if (!displaySections.length || savedImagesRef.current) return;
    const allDone = displaySections.every(sec => {
      const img = sectionImages[sec.num];
      return img && !img.loading;
    });
    if (!allDone) return;
    const urls: Record<string, string> = {};
    for (const sec of displaySections) {
      const url = sectionImages[sec.num]?.url;
      if (url) urls[sec.num] = url;
    }
    if (Object.keys(urls).length > 0) {
      savedImagesRef.current = true;
      updateLatestHistoryImages(urls);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionImages]);

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

  const label = isSlide ? '이미지 슬라이드형' : isHtml ? 'HTML 섹션형' : '블로그형 (글+그림)';
  const meta  = [cat, ch, type, label, `${displaySections.length}섹션`].filter(Boolean).join(' · ');

  const closeLightbox = useCallback(() => setLightboxSecNum(null), []);

  const lightboxItems = displaySections
    .filter(s => !!(sectionImages[s.num]?.url))
    .map(s => ({ secNum: s.num, url: sectionImages[s.num].url as string, alt: s.imageLabel }));

  const lightboxInitIdx = lightboxSecNum !== null
    ? lightboxItems.findIndex(i => i.secNum === lightboxSecNum)
    : -1;

  return (
    <div className="result-shell">

      {/* 상단 */}
      <div className="result-top">
        <div>
          <div className="result-title">상세페이지 완성 🎉</div>
          <div className="result-meta">{meta}</div>
        </div>
        <div className="result-top-btns">
          <button className="btn-outline" onClick={() => go('s5')}>← 정보 수정</button>
          <button className="btn-outline" onClick={() => go('s6')}>← 이미지 수정</button>
        </div>
      </div>

      {/* 탭 */}
      <div className="rtabs" style={{ marginTop: 16 }}>
        <button className={`rtab${activeTab === 'detail' ? ' active' : ''}`} onClick={() => setActiveTab('detail')}>📝 상세페이지</button>
        <button className={`rtab${activeTab === 'thumb' ? ' active' : ''}`} onClick={() => setActiveTab('thumb')}>🖼️ 썸네일</button>
      </div>

      {/* ── 상세페이지 탭 ── */}
      {activeTab === 'detail' && (
        <>
          <div style={{ padding: '4px 0 4px', fontSize: 13, fontWeight: 600, color: 'var(--tx2)' }}>
            {isSlide ? '🖼️ 이미지 슬라이드 결과' : isHtml ? '🌐 HTML 섹션형 결과' : '📝 블로그형 (글+그림) 결과'}
          </div>

          {isGenerating && (
            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '10px 16px', fontSize: 12, color: '#1d4ed8', marginTop: 12, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid #93c5fd', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 0.8s linear infinite', flexShrink: 0 }} />
              이미지 자동 생성 중 ({doneCount}/{displaySections.length}) — 순서대로 생성됩니다
            </div>
          )}

          {isBlog && (
            <div style={{ marginTop: 16, background: '#fff', border: '1px solid #e8e8e8', borderRadius: 8, overflow: 'hidden' }}>
              {displaySections.map((sec, i) => (
                <BlogSection
                  key={i} sec={sec} onRegen={regenFn}
                  imgState={sectionImages[sec.num] ?? EMPTY_IMG}
                  onGenerateImage={() => generateImage(sec)}
                  isLast={i === displaySections.length - 1}
                  onLightbox={sectionImages[sec.num]?.url ? () => setLightboxSecNum(sec.num) : undefined}
                />
              ))}
            </div>
          )}

          {isHtml && (
            <div style={{ marginTop: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span style={{ fontSize: 10, fontWeight: 700, background: '#eff6ff', color: '#2563eb', padding: '3px 9px', borderRadius: 20 }}>🌐 HTML 섹션형 — {ch} 최적화</span>
                <span style={{ fontSize: 11, color: '#a8a59d' }}>각 섹션을 HTML로 내보낼 수 있어요</span>
              </div>
              <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '8px 14px', fontSize: 12, color: '#1d4ed8', marginBottom: 12 }}>
                💡 텍스트 카피는 아래 &apos;섹션별 텍스트 보기&apos;에서 확인하세요
              </div>
              {displaySections.map((sec, i) => (
                <ImageSection
                  key={i} sec={sec}
                  imgState={sectionImages[sec.num] ?? EMPTY_IMG}
                  onGenerateImage={() => generateImage(sec)}
                  index={i} accent="blue"
                  onLightbox={sectionImages[sec.num]?.url ? () => setLightboxSecNum(sec.num) : undefined}
                />
              ))}
            </div>
          )}

          {isSlide && (
            <div style={{ marginTop: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span style={{ fontSize: 10, fontWeight: 700, background: '#e8f3ff', color: '#2563eb', padding: '3px 9px', borderRadius: 20 }}>🖼️ 이미지 슬라이드형 — {ch} 최적화</span>
                <span style={{ fontSize: 11, color: '#a8a59d' }}>각 카드가 슬라이드 1장 기준이에요</span>
              </div>
              <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '8px 14px', fontSize: 12, color: '#1d4ed8', marginBottom: 12 }}>
                💡 텍스트 카피는 아래 &apos;섹션별 텍스트 보기&apos;에서 확인하세요
              </div>
              {displaySections.map((sec, i) => (
                <ImageSection
                  key={i} sec={sec}
                  imgState={sectionImages[sec.num] ?? EMPTY_IMG}
                  onGenerateImage={() => generateImage(sec)}
                  index={i} accent="purple"
                  onLightbox={sectionImages[sec.num]?.url ? () => setLightboxSecNum(sec.num) : undefined}
                />
              ))}
            </div>
          )}

          {/* 다운로드 배너 */}
          <div className="dl-banner" style={{ marginTop: 24 }}>
            <div className="dl-left">
              <div className="dl-lbl">전체 다운로드</div>
              <div className="dl-title">생성된 상세페이지를 복사하거나 HTML 파일로 받아가세요</div>
              <div className="dl-sub">헤드카피 · 이미지 가이드 · 본문 전체 포함</div>
            </div>
            <div className="dl-btns" style={{ flexDirection: 'column', gap: 8 }}>
              {isHtml && (
                <button
                  className="dl-main-btn"
                  style={{ fontSize: 13, opacity: htmlLoading ? 0.7 : 1, cursor: htmlLoading ? 'default' : 'pointer' }}
                  disabled={htmlLoading}
                  onClick={async () => {
                    setHtmlLoading(true);
                    await new Promise(r => setTimeout(r, 50));
                    const ok = downloadHtml(displaySections, meta, productName, sectionImages);
                    if (!ok) alert('HTML 다운로드 중 오류가 발생했어요. 다시 시도해주세요.');
                    setTimeout(() => setHtmlLoading(false), 2000);
                  }}
                >
                  {htmlLoading ? <><span style={{ display: 'inline-block', width: 12, height: 12, border: '2px solid #a0b9d9', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite', marginRight: 6, verticalAlign: 'middle' }} />저장 중...</> : '💾 HTML 다운로드'}
                </button>
              )}
              <button
                className="dl-main-btn"
                style={{ background: 'var(--white)', color: 'var(--ac)', border: '1.5px solid var(--ac)', fontSize: 13 }}
                onClick={() => setTextModalOpen(true)}
              >
                📄 섹션별 텍스트 보기
              </button>
              <button
                className="dl-main-btn"
                style={{ fontSize: 13, background: 'var(--white)', color: '#111', border: '1.5px solid #d1d5db', opacity: mergeLoading ? 0.7 : 1, cursor: mergeLoading ? 'default' : 'pointer' }}
                disabled={mergeLoading}
                onClick={async () => {
                  setMergeLoading(true);
                  try { await downloadMergedImage(displaySections, sectionImages, productName); }
                  finally { setMergeLoading(false); }
                }}
              >
                {mergeLoading ? <><span style={{ display: 'inline-block', width: 12, height: 12, border: '2px solid #ccc', borderTopColor: '#555', borderRadius: '50%', animation: 'spin 0.8s linear infinite', marginRight: 6, verticalAlign: 'middle' }} />합성 중...</> : '🖼️ 통이미지 다운로드'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── 썸네일 탭 ── */}
      {activeTab === 'thumb' && (
        <ThumbnailPanel ch={ch} productName={productName} productImages={productImages} />
      )}

      {/* 텍스트 모달 */}
      {textModalOpen && (
        <TextModal sections={displaySections} onClose={() => setTextModalOpen(false)} />
      )}

      {/* 라이트박스 */}
      {lightboxSecNum && lightboxInitIdx >= 0 && (
        <EnhancedLightbox
          items={lightboxItems}
          initialIndex={lightboxInitIdx}
          onClose={closeLightbox}
        />
      )}

    </div>
  );
}
