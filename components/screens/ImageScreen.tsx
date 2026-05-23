'use client';

import { useState, useRef, useEffect } from 'react';
import { useApp, IMG_CL, TYPE_CUTS, CutItem } from '@/store/AppContext';

interface ImgFile { url: string; label: string; }

const READY_LABELS = ['정면','45도','디테일','포장','성분','컷1','컷2','컷3'];
const MAKE_LABELS  = ['정면','측면','디테일','포장','컷1','컷2','컷3','컷4'];

/* ─── 컷 타입별 비주얼 ─── */
const CUT_VISUAL: Record<string, { bg: string; ico: string; preview: string }> = {
  nukki:     { bg: 'linear-gradient(135deg,#f8fafc,#e2e8f0)', ico: '⬜', preview: '흰 배경에 제품만' },
  concept:   { bg: 'linear-gradient(135deg,#e0f2fe,#fce7f3)', ico: '🌸', preview: '감성 배경 연출' },
  detail:    { bg: 'linear-gradient(135deg,#f0fdf4,#dcfce7)', ico: '🔍', preview: '텍스처 클로즈업' },
  lifestyle: { bg: 'linear-gradient(135deg,#fef9c3,#fed7aa)', ico: '☀️', preview: '라이프스타일 사용' },
};

function UploadZone({
  title, sub, dragging, onDragOver, onDragLeave, onDrop, onFiles, inputRef,
}: {
  title: string; sub: string | React.ReactNode;
  dragging: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
  onFiles: (f: FileList | null) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
}) {
  return (
    <div className={`up-zone${dragging ? ' drag' : ''}`} onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop} onClick={() => inputRef.current?.click()}>
      <input ref={inputRef} type="file" multiple accept="image/*" style={{ display: 'none' }} onChange={e => onFiles(e.target.files)} />
      <div style={{ fontSize: 28, marginBottom: 10 }}>📷</div>
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 11, color: 'var(--tx3)', lineHeight: 1.6 }}>{sub}</div>
      <label className="up-btn" onClick={e => { e.stopPropagation(); inputRef.current?.click(); }} style={{ cursor: 'pointer' }}>파일 선택</label>
    </div>
  );
}

/* ─── 라이트박스 ─── */
function GenLightbox({ url, alt, onClose, onPrev, onNext, index, total }: {
  url: string; alt: string; onClose: () => void;
  onPrev?: () => void; onNext?: () => void; index: number; total: number;
}) {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') onPrev?.();
      if (e.key === 'ArrowRight') onNext?.();
    };
    window.addEventListener('keydown', handler);
    return () => { document.body.style.overflow = ''; window.removeEventListener('keydown', handler); };
  }, [onClose, onPrev, onNext]);

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.88)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      {onPrev && <button onClick={e => { e.stopPropagation(); onPrev(); }} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', width: 44, height: 44, borderRadius: '50%', background: 'rgba(255,255,255,.15)', border: 'none', color: '#fff', fontSize: 24, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--f)' }}>‹</button>}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt={alt} onClick={e => e.stopPropagation()} style={{ maxWidth: '100%', maxHeight: '86vh', borderRadius: 8, boxShadow: '0 8px 48px rgba(0,0,0,.6)', display: 'block' }} />
      {onNext && <button onClick={e => { e.stopPropagation(); onNext(); }} style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', width: 44, height: 44, borderRadius: '50%', background: 'rgba(255,255,255,.15)', border: 'none', color: '#fff', fontSize: 24, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--f)' }}>›</button>}
      <button onClick={onClose} aria-label="닫기" style={{ position: 'absolute', top: 16, right: 20, fontSize: 28, color: '#fff', background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1, fontFamily: 'var(--f)' }}>✕</button>
      {total > 1 && (
        <div style={{ position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)', color: '#fff', fontSize: 12, background: 'rgba(0,0,0,.45)', padding: '4px 12px', borderRadius: 20, whiteSpace: 'nowrap' }}>
          {index + 1} / {total}
        </div>
      )}
    </div>
  );
}

/* ─── 컷 선택 카드 ─── */
function CutSelectCard({ c, selected, onToggle }: { c: CutItem; selected: boolean; onToggle: () => void }) {
  const vis = CUT_VISUAL[c.id] ?? { bg: 'var(--sf)', ico: c.ico, preview: c.desc };
  return (
    <div
      onClick={() => !c.disabled && onToggle()}
      style={{
        position: 'relative', borderRadius: 'var(--r)', overflow: 'hidden',
        border: `2px solid ${selected ? 'var(--ac)' : 'var(--bd)'}`,
        background: selected ? 'var(--al)' : 'var(--white)',
        cursor: c.disabled ? 'default' : 'pointer',
        opacity: c.disabled ? 0.4 : 1,
        transition: 'border-color .15s, background .15s',
        display: 'flex', flexDirection: 'column',
      }}
    >
      {/* 선택 배지 */}
      {selected && (
        <div style={{ position: 'absolute', top: 8, right: 8, width: 22, height: 22, borderRadius: '50%', background: 'var(--ac)', color: '#fff', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, zIndex: 1 }}>✓</div>
      )}
      {/* 비주얼 미리보기 */}
      <div style={{ height: 72, background: vis.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
        <span style={{ fontSize: 26 }}>{vis.ico}</span>
        <span style={{ fontSize: 9, color: 'var(--tx3)', fontWeight: 500 }}>{vis.preview}</span>
      </div>
      {/* 정보 */}
      <div style={{ padding: '8px 10px 10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: selected ? 'var(--ac)' : 'var(--tx)' }}>{c.ico} {c.name}</span>
          <span className={`cut-tag ${c.tagClass}`}>{c.tag}</span>
          {!c.disabled && <span style={{ fontSize: 10, color: 'var(--tx3)', marginLeft: 'auto' }}>{c.count}장</span>}
        </div>
        <div style={{ fontSize: 11, color: 'var(--tx2)', lineHeight: 1.5 }}>{c.desc}</div>
        {c.why && <div style={{ fontSize: 10, color: 'var(--tx3)', marginTop: 5, lineHeight: 1.4 }}>💡 {c.why}</div>}
      </div>
    </div>
  );
}

/* ─── 결과 이미지 카드 ─── */
function GenImageCard({
  c, i, imgUrl, isGen, isFail, isSel, isRegenActive,
  editPrompt, onToggleSelect, onRegen, onLightbox, onEditChange,
}: {
  c: CutItem; i: number;
  imgUrl?: string; isGen: boolean; isFail: boolean; isSel: boolean; isRegenActive: boolean;
  editPrompt: string;
  onToggleSelect: () => void;
  onRegen: (ep?: string) => void;
  onLightbox: () => void;
  onEditChange: (v: string) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const hasImg = !!imgUrl;

  return (
    <div style={{
      background: 'var(--white)',
      border: `2px solid ${isSel ? 'var(--ac)' : 'var(--bd)'}`,
      borderRadius: 'var(--r)', overflow: 'hidden',
      transition: 'border-color .15s, box-shadow .15s',
      boxShadow: hovered ? '0 4px 16px rgba(0,0,0,.1)' : 'none',
      position: 'relative',
    }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* 선택 배지 */}
      {isSel && (
        <div style={{ position: 'absolute', top: 8, left: 8, background: 'var(--ac)', color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, zIndex: 3 }}>✓ 선택됨</div>
      )}

      {/* 이미지 영역 */}
      <div style={{ position: 'relative', aspectRatio: '1/1', overflow: 'hidden' }}>
        {hasImg ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imgUrl}
              alt={`${c.name} ${i + 1}`}
              style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#f8fafc', display: 'block', cursor: isGen ? 'default' : 'zoom-in', transition: 'transform .2s', transform: (!isGen && hovered) ? 'scale(1.03)' : 'scale(1)' }}
              onClick={isGen ? undefined : onLightbox}
            />
            {/* 재생성 중 로딩 오버레이 */}
            {isGen && (
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,.75)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <span style={{ display: 'inline-block', width: 24, height: 24, border: '2.5px solid #c4b5fd', borderTopColor: '#7c3aed', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                <span style={{ fontSize: 11, color: '#7c3aed', fontWeight: 700 }}>{editPrompt ? '수정 중...' : '재생성 중...'}</span>
              </div>
            )}
            {/* 호버 오버레이 (재생성 중엔 숨김) */}
            {!isGen && hovered && (
              <div onClick={onLightbox} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.28)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-in', transition: 'opacity .15s' }}>
                <div style={{ background: 'rgba(255,255,255,.92)', borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: 700, color: 'var(--tx)', display: 'flex', alignItems: 'center', gap: 5 }}>
                  🔍 확대
                </div>
              </div>
            )}
          </>
        ) : isGen ? (
          <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg,var(--al),rgba(37,99,235,.03))', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <span style={{ display: 'inline-block', width: 24, height: 24, border: '2.5px solid #c4b5fd', borderTopColor: '#7c3aed', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
            <span style={{ fontSize: 11, color: '#7c3aed', fontWeight: 600 }}>생성 중...</span>
          </div>
        ) : isFail ? (
          <div style={{ width: '100%', height: '100%', background: '#fff1f2', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <span style={{ fontSize: 28 }}>⚠️</span>
            <span style={{ fontSize: 11, color: '#dc2626' }}>생성 실패</span>
          </div>
        ) : (
          <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg,var(--al),rgba(37,99,235,.03))', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.25, fontSize: 32 }}>{c.ico}</div>
        )}
      </div>

      {/* 카드 하단 */}
      <div style={{ padding: '10px 10px 12px' }}>
        {/* 컷 라벨 */}
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--tx)', marginBottom: 8 }}>{c.ico} {c.name} {i + 1}</div>

        {/* 버튼 영역 */}
        {hasImg ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {/* Primary: 이 이미지 사용 */}
            <button
              onClick={isGen ? undefined : onToggleSelect}
              disabled={isGen}
              style={{
                width: '100%', padding: '7px 0', fontSize: 11, fontWeight: 700,
                background: isSel ? 'var(--ac)' : 'var(--white)',
                color: isSel ? '#fff' : 'var(--ac)',
                border: `1.5px solid var(--ac)`, borderRadius: 'var(--rs)',
                cursor: isGen ? 'default' : 'pointer', fontFamily: 'var(--f)', transition: 'all .15s',
                opacity: isGen ? 0.4 : 1,
              }}
            >
              {isSel ? '✓ 선택됨' : '이 이미지 사용'}
            </button>
            {/* Secondary: 재생성 + 다운로드 */}
            <div style={{ display: 'flex', gap: 5 }}>
              <button
                onClick={() => onRegen(editPrompt || undefined)}
                disabled={isRegenActive}
                style={{ flex: 1, padding: '5px 0', fontSize: 10, background: editPrompt ? 'var(--al)' : 'transparent', border: `1px solid ${editPrompt ? 'var(--ac)' : 'var(--bd)'}`, borderRadius: 'var(--rs)', cursor: isRegenActive ? 'default' : 'pointer', color: editPrompt ? 'var(--ac)' : 'var(--tx2)', fontFamily: 'var(--f)', fontWeight: editPrompt ? 700 : 400, opacity: isRegenActive ? 0.4 : 1, transition: 'all .15s' }}
              >
                {editPrompt ? '✨ 수정 반영' : '↻ 새로 생성'}
              </button>
              <a
                href={imgUrl}
                download={`${c.id}_${i + 1}.png`}
                style={{ padding: '5px 10px', fontSize: 10, background: 'transparent', border: '1px solid var(--bd)', borderRadius: 'var(--rs)', color: 'var(--tx2)', textDecoration: 'none', display: 'flex', alignItems: 'center' }}
              >
                ⬇
              </a>
            </div>
            {/* 수정 프롬프트 입력 */}
            <input
              type="text"
              placeholder='수정 요청 (선택) — 예: "배경을 더 밝게"'
              value={editPrompt}
              disabled={isGen}
              onChange={e => onEditChange(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !isRegenActive) { e.preventDefault(); onRegen(editPrompt || undefined); } }}
              style={{
                width: '100%', padding: '5px 8px', fontSize: 10, border: `1px solid ${editPrompt ? 'var(--ac)' : 'var(--bd)'}`,
                borderRadius: 'var(--rs)', fontFamily: 'var(--f)', color: 'var(--tx)',
                background: isGen ? '#f1f5f9' : 'var(--sf)', outline: 'none', boxSizing: 'border-box',
                opacity: isGen ? 0.5 : 1, transition: 'border-color .15s',
              }}
            />
          </div>
        ) : (isFail || (!hasImg && !isGen)) ? (
          <button
            onClick={() => onRegen()}
            disabled={isRegenActive}
            style={{ width: '100%', padding: '6px 0', fontSize: 10, background: 'transparent', border: '1px solid var(--bd)', borderRadius: 'var(--rs)', cursor: isRegenActive ? 'default' : 'pointer', color: 'var(--tx3)', fontFamily: 'var(--f)', opacity: isRegenActive ? 0.4 : 1 }}
          >
            ↻ 재생성
          </button>
        ) : null}
      </div>
    </div>
  );
}

export default function ImageScreen() {
  const { cat, ch, type, imgMode, setImgMode, setProductImages, go } = useApp();
  const safeCh   = ch   || '스마트스토어';
  const safeType = type || '기본형';
  const guide = (IMG_CL[safeCh] ?? IMG_CL['스마트스토어'])[safeType] ?? IMG_CL['스마트스토어']['기본형'];
  const cuts: CutItem[] = (TYPE_CUTS[safeType] ?? TYPE_CUTS['기본형']).filter(c => c.id !== 'thumb');

  const [imgs,             setImgs]             = useState<ImgFile[]>([]);
  const [makeImgs,         setMakeImgs]         = useState<ImgFile[]>([]);
  const [selectedCuts,     setSelectedCuts]     = useState<string[]>(cuts.filter(c => c.checked).map(c => c.id));
  const [makeResult,       setMakeResult]       = useState(false);
  const [making,           setMaking]           = useState(false);
  const [makeGenImages,    setMakeGenImages]    = useState<Record<string, string>>({});
  const [generatingKey,    setGeneratingKey]    = useState<string>('');
  const [failedKeys,       setFailedKeys]       = useState<Set<string>>(new Set());
  const [dragging,         setDragging]         = useState(false);
  const [draggingMake,     setDraggingMake]     = useState(false);
  const [selectedImageKeys, setSelectedImageKeys] = useState<Set<string>>(new Set());
  const [confirmOpen,      setConfirmOpen]      = useState(false);
  const [lightboxKey,      setLightboxKey]      = useState<string | null>(null);
  const [editPrompts,      setEditPrompts]      = useState<Record<string, string>>({});

  const readyInputRef = useRef<HTMLInputElement>(null);
  const makeInputRef  = useRef<HTMLInputElement>(null);
  const base64sRef    = useRef<string[]>([]);

  const addFiles = (files: FileList | null, which: 'ready' | 'make') => {
    if (!files) return;
    const labels   = which === 'ready' ? READY_LABELS : MAKE_LABELS;
    const current  = which === 'ready' ? imgs : makeImgs;
    const setter   = which === 'ready' ? setImgs : setMakeImgs;
    const remaining = 8 - current.length;
    if (files.length > remaining) {
      alert(`최대 8장까지 업로드할 수 있어요. ${remaining > 0 ? `${remaining}장만 추가됩니다.` : '이미 8장이 업로드되었습니다.'}`);
    }
    const newItems: ImgFile[] = [];
    Array.from(files).slice(0, remaining).forEach(f => {
      newItems.push({ url: URL.createObjectURL(f), label: labels[current.length + newItems.length] ?? '추가' });
    });
    setter(p => [...p, ...newItems]);
  };

  const toBase64 = (objectUrl: string): Promise<string> =>
    fetch(objectUrl).then(r => r.blob()).then(blob => new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload  = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    }));

  const goGenerate = async (sources: { url: string }[]) => {
    const base64s = await Promise.all(sources.slice(0, 3).map(s => toBase64(s.url)));
    setProductImages(base64s);
    go('s7');
  };

  const useSelectedImages = () => {
    const urls = Array.from(selectedImageKeys).map(k => makeGenImages[k]).filter(Boolean);
    setProductImages(urls);
    go('s7');
  };

  const CAT_CTX: Record<string, { product: string }> = {
    화장품:   { product: 'Korean skincare/beauty product' },
    식품:     { product: 'Korean food or beverage product' },
    패션:     { product: 'fashion clothing or accessory item' },
    생활:     { product: 'home living or interior decor product' },
    가전:     { product: 'consumer electronics or home appliance' },
    반려동물: { product: 'pet care product' },
    스포츠:   { product: 'sports or outdoor gear product' },
    유아:     { product: 'baby or toddler product' },
    건강:     { product: 'health supplement or wellness product' },
    자동차:   { product: 'automotive accessory or car care product' },
    기타:     { product: 'retail consumer product' },
  };

  const buildPrompt = (cutId: string, idx: number, category: string, channel: string): string => {
    const prod = (CAT_CTX[category] ?? CAT_CTX['기타']).product;
    switch (cutId) {
      case 'nukki':
        return `Isolated product photography. The ${prod} on a perfectly pure white (#FFFFFF) background. Centered composition, all edges cleanly visible. ${idx === 0 ? 'Even fill lighting, no shadows.' : 'Soft directional light, minimal shadow.'} Professional e-commerce shot optimized for Korean online shopping (${channel}). Photorealistic, high resolution.`;
      case 'concept':
        return `Korean brand lifestyle concept photography. The ${prod} artfully styled in a curated scene. ${idx === 0 ? 'Bright airy atmosphere, soft natural light, fresh premium mood.' : 'Moody dramatic lighting, rich warm tones, luxurious atmosphere.'} Soft bokeh background, magazine-quality brand aesthetic. Professional studio photography.`;
      case 'detail':
        return `Professional macro detail photography of the ${prod}. ${idx === 0 ? 'Extreme close-up revealing surface texture and craftsmanship.' : 'Close-up of key functional features, label, branding, or ingredient detail.'} Shallow depth of field, razor-sharp focal plane. Studio macro lighting emphasizing premium quality. Photorealistic, ultra-high detail.`;
      case 'lifestyle':
        return `Authentic lifestyle photography. The ${prod} in natural use context. ${idx === 0 ? 'Bright daytime natural light, airy fresh morning atmosphere.' : 'Warm soft indoor evening light, cozy inviting atmosphere.'} Product shown in genuine use, candid and relatable. Warm color grading, commercial lifestyle photography quality.`;
      default:
        return `Professional commercial product photography of ${prod}, clean studio setup, shot ${idx + 1}.`;
    }
  };

  const startMakeGen = async () => {
    if (!makeImgs.length) { alert('먼저 원본 사진을 업로드해주세요'); return; }
    setMaking(true);
    setMakeResult(true);
    setMakeGenImages({});
    setFailedKeys(new Set());
    setGeneratingKey('');
    setSelectedImageKeys(new Set());
    setEditPrompts({});

    let base64s: string[] = [];
    try {
      base64s = await Promise.all(makeImgs.slice(0, 3).map(s => toBase64(s.url)));
    } catch (err) {
      console.error('[startMakeGen] base64 변환 오류:', err);
    }
    base64sRef.current = base64s;

    const activeCuts = cuts.filter(c => selectedCuts.includes(c.id) && !c.disabled);
    for (const cut of activeCuts) {
      for (let i = 0; i < Math.min(cut.count, 2); i++) {
        const key = `${cut.id}-${i}`;
        setGeneratingKey(key);
        try {
          const res = await fetch('/api/generate-image', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              prompt: buildPrompt(cut.id, i, cat ?? '기타', ch ?? '스마트스토어'),
              sectionNum: key,
              productImages: base64s.length > 0 ? base64s : undefined,
            }),
            signal: AbortSignal.timeout(130_000),
          });
          const data = await res.json();
          if (data.imageBase64) setMakeGenImages(p => ({ ...p, [key]: `data:${data.mimeType};base64,${data.imageBase64}` }));
          else setFailedKeys(p => new Set([...p, key]));
        } catch { setFailedKeys(p => new Set([...p, key])); }
      }
    }
    setGeneratingKey('');
    setMaking(false);
  };

  const regenImage = async (cutId: string, idx: number, editPrompt?: string) => {
    const key = `${cutId}-${idx}`;
    const currentImg = makeGenImages[key];
    setGeneratingKey(key);
    setFailedKeys(p => { const n = new Set(p); n.delete(key); return n; });

    try {
      const basePrompt = buildPrompt(cutId, idx, cat ?? '기타', ch ?? '스마트스토어');
      const finalPrompt = editPrompt ? `${basePrompt} 수정 요청: ${editPrompt}` : basePrompt;

      // 수정 요청 있으면 현재 생성 이미지를 첫 번째 레퍼런스로 전달
      const refImages: string[] = editPrompt && currentImg
        ? [currentImg, ...base64sRef.current].slice(0, 3)
        : base64sRef.current;

      const res = await fetch('/api/generate-image', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: finalPrompt,
          sectionNum: key,
          productImages: refImages.length > 0 ? refImages : undefined,
        }),
        signal: AbortSignal.timeout(130_000),
      });
      const data = await res.json();
      if (data.imageBase64) {
        setMakeGenImages(p => ({ ...p, [key]: `data:${data.mimeType};base64,${data.imageBase64}` }));
        // 수정 후 편집 프롬프트 초기화
        if (editPrompt) setEditPrompts(p => ({ ...p, [key]: '' }));
      } else {
        setFailedKeys(p => new Set([...p, key]));
      }
    } catch { setFailedKeys(p => new Set([...p, key])); }
    finally { setGeneratingKey(''); }
  };

  const toggleCut = (id: string) => setSelectedCuts(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  const toggleSelectImage = (key: string) => setSelectedImageKeys(p => {
    const n = new Set(p); n.has(key) ? n.delete(key) : n.add(key); return n;
  });

  const activeCutsForResult = cuts.filter(c => selectedCuts.includes(c.id) && !c.disabled);
  const lightboxItems = activeCutsForResult
    .flatMap(c => Array.from({ length: Math.min(c.count, 2) }, (_, i) => `${c.id}-${i}`))
    .filter(k => makeGenImages[k]);
  const lightboxIdx = lightboxKey ? lightboxItems.indexOf(lightboxKey) : -1;

  return (
    <div className="inner">
      <div className="stitle">이미지를 준비해주세요</div>
      <div className="ssub">{safeCh} · {safeType} 기준 — 필요한 이미지와 이유를 안내드려요</div>

      {/* ① 체크리스트 */}
      <div className="img-guide-card">
        <div className="igc-header">
          <div className="igc-title">📸 {safeCh} · {safeType} 이미지 체크리스트</div>
          <div className="igc-sub">각 이미지가 왜 필요한지 이유와 함께 안내해드려요 — 이미지 퀄리티가 상세페이지 완성도를 결정합니다</div>
        </div>
        <div className="img-check-list">
          {guide.map(item => (
            <div className="icl-item" key={item.name}>
              <div className="icl-img">
                <div style={{ fontSize: 20 }}>{item.img}</div>
                <div className="icl-img-lbl">예시</div>
              </div>
              <div className="icl-body">
                <div className="icl-name">{item.name}<span className={`icl-req-tag ${item.req ? 'req-tag' : 'opt-tag'}`}>{item.req ? '필수' : '선택'}</span></div>
                <div className="icl-reason">{item.reason}</div>
                <div className="icl-why">💡 {item.why}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ② 준비 상태 선택 */}
      {!imgMode && (
        <div className="cta-row" style={{ marginBottom: 8 }}>
          <button className="btn-back" onClick={() => go('s5b')}>← 이전</button>
        </div>
      )}
      <div className="fdiv" style={{ marginBottom: 16 }}>
        <div className="fdiv-line" /><span className="fdiv-lbl">이미지 준비 상태</span><div className="fdiv-line" />
      </div>
      <div className="img-mode-grid">
        {[
          { mode: 'ready', ico: '✅', title: '이미지가 준비되어 있어요', desc: '위 체크리스트대로 이미지를 준비했어요.\n바로 업로드하고 상세페이지 진행합니다.' },
          { mode: 'make',  ico: '📷', title: '제품 원본사진만 있어요',   desc: '원본사진으로 필요한 컷을 AI가 만들어드려요.\n확인 후 상세페이지 진행합니다.' },
        ].map(({ mode, ico, title, desc }) => (
          <div
            key={mode}
            className={`imc${imgMode === mode ? ' on' : ''}`}
            onClick={() => {
              if (imgMode === mode) return;
              imgs.forEach(img => URL.revokeObjectURL(img.url));
              makeImgs.forEach(img => URL.revokeObjectURL(img.url));
              setImgs([]); setMakeImgs([]); setMakeResult(false); setMakeGenImages({}); setSelectedImageKeys(new Set());
              setImgMode(mode);
            }}
          >
            <div className="imc-ck">✓</div>
            <div className="imc-ico">{ico}</div>
            <div className="imc-title">{title}</div>
            <div className="imc-desc">{desc.split('\n').map((l, i) => <span key={i}>{l}{i === 0 && <br />}</span>)}</div>
          </div>
        ))}
      </div>

      {/* A. 이미지 준비된 경우 */}
      {imgMode === 'ready' && (
        <div>
          <div className="fg">
            <div className="fl">이미지 업로드 <span className="freq">*</span></div>
            <UploadZone title="이미지 드래그 또는 클릭해서 업로드" sub="PNG · JPG · WEBP · 최대 8장" dragging={dragging}
              onDragOver={e => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)}
              onDrop={e => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files, 'ready'); }}
              onFiles={f => addFiles(f, 'ready')} inputRef={readyInputRef}
            />
            {imgs.length > 0 && (
              <div className="img-grid">
                {imgs.map((img, i) => (
                  <div className="img-th" key={i}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.url} alt={img.label} />
                    <div className="img-lbl">{img.label}</div>
                    <button className="img-th-rm" onClick={() => { URL.revokeObjectURL(img.url); setImgs(p => p.filter((_, j) => j !== i)); }}>✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="cta-row">
            <button className="btn-back" onClick={() => go('s5b')}>← 이전</button>
            <button className="btn-next" style={{ display: imgs.length > 0 ? 'flex' : 'none' }} onClick={() => goGenerate(imgs)}>생성하기 →</button>
          </div>
        </div>
      )}

      {/* B. 원본사진 AI 컷 생성 — 업로드 + 컷 선택 */}
      {imgMode === 'make' && !makeResult && (
        <div>
          <div className="fg">
            <div className="fl">원본 상품 사진 업로드 <span className="freq">*</span></div>
            <UploadZone
              title="원본 사진을 업로드해주세요"
              sub={<>누끼 작업 전 원본 · PNG · JPG · WEBP<br />여러 각도 사진일수록 AI 품질이 올라가요</>}
              dragging={draggingMake}
              onDragOver={e => { e.preventDefault(); setDraggingMake(true); }} onDragLeave={() => setDraggingMake(false)}
              onDrop={e => { e.preventDefault(); setDraggingMake(false); addFiles(e.dataTransfer.files, 'make'); }}
              onFiles={f => addFiles(f, 'make')} inputRef={makeInputRef}
            />
            {makeImgs.length > 0 && (
              <div className="img-grid">
                {makeImgs.map((img, i) => (
                  <div className="img-th" key={i}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.url} alt={img.label} />
                    <div className="img-lbl">{img.label}</div>
                    <button className="img-th-rm" onClick={() => { URL.revokeObjectURL(img.url); setMakeImgs(p => p.filter((_, j) => j !== i)); }}>✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 컷 선택 — 2열 카드 그리드 */}
          <div className="fb">
            <div className="fdiv"><div className="fdiv-line" /><span className="fdiv-lbl">생성할 컷 선택</span><div className="fdiv-line" /></div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
              {cuts.map(c => (
                <CutSelectCard
                  key={c.id}
                  c={c}
                  selected={selectedCuts.includes(c.id)}
                  onToggle={() => toggleCut(c.id)}
                />
              ))}
            </div>
            <div className="fhint" style={{ marginTop: 12 }}>💡 썸네일은 결과 화면 → 썸네일 탭에서 생성할 수 있어요. 모델컷·GIF 모션컷은 추후 업데이트 예정이에요</div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 12, gap: 12 }}>
            <button className="btn-back" onClick={() => go('s5b')}>← 이전</button>
            <button className="btn-next" onClick={startMakeGen} disabled={making}>✦ AI로 컷 생성하기</button>
          </div>
        </div>
      )}

      {/* B-3. AI 생성 결과 */}
      {imgMode === 'make' && makeResult && (() => {
        const activeCuts = cuts.filter(c => selectedCuts.includes(c.id) && !c.disabled);
        const totalCells = activeCuts.reduce((s, c) => s + Math.min(c.count, 2), 0);
        const doneCells  = Object.keys(makeGenImages).length + failedKeys.size;
        return (
          <div style={{ marginTop: 20 }}>
            <div style={{ background: 'var(--white)', border: `1.5px solid ${making ? 'rgba(124,58,237,.25)' : 'rgba(22,163,74,.3)'}`, borderRadius: 'var(--r)', overflow: 'hidden' }}>
              {/* 헤더 */}
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--bd)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                {making ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600 }}>
                    <span style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid #c4b5fd', borderTopColor: '#7c3aed', borderRadius: '50%', animation: 'spin 0.7s linear infinite', flexShrink: 0 }} />
                    AI 이미지 생성 중… ({doneCells}/{totalCells})
                  </div>
                ) : (
                  <div style={{ fontSize: 13, fontWeight: 600 }}>✅ 생성 완료 — 사용할 이미지를 선택하거나 수정해주세요</div>
                )}
                <button
                  onClick={() => { setMakeResult(false); setMakeGenImages({}); setFailedKeys(new Set()); setGeneratingKey(''); setSelectedImageKeys(new Set()); setEditPrompts({}); }}
                  disabled={making}
                  style={{ fontSize: 11, color: 'var(--tx2)', background: 'transparent', border: '1.5px solid var(--bd)', borderRadius: 'var(--rs)', padding: '5px 10px', cursor: making ? 'default' : 'pointer', opacity: making ? 0.4 : 1, fontFamily: 'var(--f)', flexShrink: 0 }}
                >다시 설정</button>
              </div>

              {/* 결과 그리드 — 2열 */}
              <div style={{ padding: 16 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12, marginBottom: 16 }}>
                  {activeCuts.flatMap(c =>
                    Array.from({ length: Math.min(c.count, 2) }, (_, i) => {
                      const key = `${c.id}-${i}`;
                      return (
                        <GenImageCard
                          key={key}
                          c={c} i={i}
                          imgUrl={makeGenImages[key]}
                          isGen={generatingKey === key}
                          isFail={failedKeys.has(key)}
                          isSel={selectedImageKeys.has(key)}
                          isRegenActive={!!generatingKey}
                          editPrompt={editPrompts[key] ?? ''}
                          onToggleSelect={() => toggleSelectImage(key)}
                          onRegen={ep => regenImage(c.id, i, ep)}
                          onLightbox={() => setLightboxKey(key)}
                          onEditChange={v => setEditPrompts(p => ({ ...p, [key]: v }))}
                        />
                      );
                    })
                  )}
                </div>

                {/* 하단 진행 */}
                {!making && (
                  <div style={{ background: 'var(--sf)', borderRadius: 'var(--rs)', padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                    <div style={{ fontSize: 12, color: 'var(--tx2)', lineHeight: 1.6 }}>
                      {selectedImageKeys.size > 0
                        ? <><b style={{ color: 'var(--ac)' }}>✓ {selectedImageKeys.size}장 선택됨</b> — 선택 이미지로 상세페이지를 만들어요</>
                        : '이미지를 선택하거나, 원본 사진으로 바로 진행할 수 있어요'}
                    </div>
                    <button
                      className="btn-next"
                      style={{ padding: '10px 20px', fontSize: 13, whiteSpace: 'nowrap' }}
                      onClick={() => selectedImageKeys.size > 0 ? setConfirmOpen(true) : goGenerate(makeImgs)}
                    >
                      {selectedImageKeys.size > 0 ? `선택한 ${selectedImageKeys.size}장으로 →` : '원본으로 상세페이지 만들기 →'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* 라이트박스 */}
      {lightboxKey && makeGenImages[lightboxKey] && (
        <GenLightbox
          url={makeGenImages[lightboxKey]} alt={lightboxKey}
          onClose={() => setLightboxKey(null)}
          onPrev={lightboxIdx > 0 ? () => setLightboxKey(lightboxItems[lightboxIdx - 1]) : undefined}
          onNext={lightboxIdx < lightboxItems.length - 1 ? () => setLightboxKey(lightboxItems[lightboxIdx + 1]) : undefined}
          index={lightboxIdx} total={lightboxItems.length}
        />
      )}

      {/* 이미지 교체 확인 모달 */}
      {confirmOpen && (
        <div onClick={() => setConfirmOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 12, padding: 28, maxWidth: 340, width: '100%' }}>
            <div style={{ fontSize: 18, marginBottom: 10 }}>✅</div>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>선택한 이미지로 교체할까요?</div>
            <div style={{ fontSize: 13, color: 'var(--tx2)', lineHeight: 1.7, marginBottom: 24 }}>
              선택한 <b>{selectedImageKeys.size}장</b> AI 생성 이미지를 상세페이지 생성에 사용해요.<br />기존 업로드 이미지는 교체됩니다.
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setConfirmOpen(false)} style={{ flex: 1, padding: '10px 0', border: '1.5px solid var(--bd)', borderRadius: 'var(--r)', background: 'transparent', cursor: 'pointer', fontSize: 13, fontFamily: 'var(--f)', color: 'var(--tx2)' }}>취소</button>
              <button onClick={() => { setConfirmOpen(false); useSelectedImages(); }} style={{ flex: 1, padding: '10px 0', border: 'none', borderRadius: 'var(--r)', background: 'var(--ac)', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'var(--f)' }}>교체 후 생성하기</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
