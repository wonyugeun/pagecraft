'use client';

import { useState, useRef, useEffect } from 'react';
import { useApp } from '@/store/AppContext';

/* ─── 카테고리 ─── */
const CATS = [
  { key: '화장품', ico: '✨' }, { key: '식품',   ico: '🍱' }, { key: '패션', ico: '👔' },
  { key: '생활',   ico: '🛋️' }, { key: '가전',   ico: '📱' }, { key: '반려동물', ico: '🐶' },
  { key: '스포츠', ico: '⚽' }, { key: '유아',   ico: '🧸' }, { key: '건강', ico: '💪' },
  { key: '자동차', ico: '🚙' }, { key: '기타',   ico: '🎁' },
];

/* ─── 채널 ─── */
const CHANNELS = ['스마트스토어', '쿠팡', '와디즈', '자사몰'] as const;
type Channel = typeof CHANNELS[number];

const CH_SIZE: Record<Channel, string> = {
  스마트스토어: '1000×1000',
  쿠팡:         '1000×1000',
  와디즈:       '1200×675',
  자사몰:       '1200×630',
};

/* ─── 썸네일 타입 ─── */
interface ThumbType {
  key: string;
  label: string;
  desc: string;
  prompt: string;
  needsRef: boolean;
  disabled: boolean;
}

const THUMB_TYPES: ThumbType[] = [
  {
    key: 'white', label: '흰배경 단독컷', needsRef: false, disabled: false,
    desc: '제품만 깔끔하게, 메인 썸네일용',
    prompt: '순백색 배경에 제품만 중앙에 배치한 이커머스 썸네일. 제품 형태가 선명하게 보이도록 고른 조명 처리.',
  },
  {
    key: 'concept', label: '컨셉컷', needsRef: false, disabled: false,
    desc: '라이프스타일 연출, 브랜드 무드',
    prompt: '브랜드 무드와 카테고리에 어울리는 감성 배경에 제품을 자연스럽게 합성한 이커머스 썸네일. 색감과 분위기를 제품과 조화롭게 연출.',
  },
  {
    key: 'text_overlay', label: '텍스트오버레이컷', needsRef: false, disabled: false,
    desc: '혜택/USP 텍스트 강조',
    prompt: '제품 이미지 위에 한국어 핵심 카피를 굵은 폰트로 오버레이한 이커머스 썸네일. 고대비 색상과 명확한 가독성 강조.',
  },
  {
    key: 'ref_copy', label: '레퍼런스 이미지 카피컷', needsRef: true, disabled: false,
    desc: '구도 그대로, 제품만 우리 걸로',
    prompt: '레퍼런스 이미지의 구도, 배경, 소품 배치를 최대한 유지하고 제품만 교체한 이커머스 썸네일. 레이아웃과 배경은 레퍼런스 그대로.',
  },
  {
    key: 'ref_vibe', label: '레퍼런스 느낌 카피컷', needsRef: true, disabled: false,
    desc: '분위기/색감만 따라, 새로 연출',
    prompt: '레퍼런스 이미지의 색감, 분위기, 무드만 분석하여 새로운 구도로 제품을 연출한 이커머스 썸네일. 분위기는 레퍼런스를 따르되 구도는 새롭게.',
  },
  {
    key: 'sale', label: '세일/이벤트컷', needsRef: false, disabled: false,
    desc: '할인율/이벤트 강조, 빨간 배경',
    prompt: '강렬한 빨간색 또는 채도 높은 배경에 할인율·이벤트 텍스트를 크게 오버레이한 이커머스 썸네일. 높은 시각적 주목도와 구매 긴박감 강조.',
  },
  {
    key: 'model', label: '모델 사용컷', needsRef: false, disabled: true,
    desc: 'AI 모델이 제품 사용/착용 (추후 활성화)',
    prompt: '',
  },
];

/* ─── 라이트박스 ─── */
function ThumbLightbox({ url, onClose }: { url: string; onClose: () => void }) {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => { document.body.style.overflow = ''; window.removeEventListener('keydown', handler); };
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.88)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt="썸네일 확대"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: '100%', maxHeight: '88vh', borderRadius: 8, boxShadow: '0 8px 48px rgba(0,0,0,.6)', display: 'block' }}
      />
      <button
        onClick={onClose}
        aria-label="닫기"
        style={{ position: 'absolute', top: 16, right: 20, fontSize: 28, color: '#fff', background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1, fontFamily: 'var(--f)' }}
      >
        ✕
      </button>
    </div>
  );
}

interface ImgFile { url: string; file: File; }

export default function ThumbScreen() {
  const { go } = useApp();

  const [productName, setProductName]   = useState('');
  const [cat, setCat]                   = useState('');
  const [ch, setCh]                     = useState<Channel | ''>('');
  const [selectedType, setSelectedType] = useState('');

  const [productImgs, setProductImgs]   = useState<ImgFile[]>([]);
  const [dragging, setDragging]         = useState(false);
  const productInputRef                 = useRef<HTMLInputElement>(null);

  const [refImg, setRefImg]             = useState<ImgFile | null>(null);
  const [draggingRef, setDraggingRef]   = useState(false);
  const refInputRef                     = useRef<HTMLInputElement>(null);

  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState('');
  const [resultUrl, setResultUrl]       = useState('');
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const currentTypeDef = THUMB_TYPES.find(t => t.key === selectedType) ?? null;
  const needsRef = currentTypeDef?.needsRef ?? false;
  const isDisabled = !ch || !selectedType || loading || (needsRef && !refImg);

  /* ─── helpers ─── */
  const toBase64 = (objectUrl: string): Promise<string> =>
    fetch(objectUrl).then(r => r.blob()).then(blob => new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload  = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    }));

  const addProductFiles = (files: FileList | null) => {
    if (!files) return;
    const remaining = 5 - productImgs.length;
    if (remaining <= 0) { alert('최대 5장까지 업로드할 수 있어요.'); return; }
    if (files.length > remaining) alert(`최대 5장까지 업로드할 수 있어요. ${remaining}장만 추가됩니다.`);
    const newItems: ImgFile[] = Array.from(files).slice(0, remaining).map(f => ({ url: URL.createObjectURL(f), file: f }));
    setProductImgs(p => [...p, ...newItems]);
  };

  const removeProductImg = (i: number) => {
    URL.revokeObjectURL(productImgs[i].url);
    setProductImgs(p => p.filter((_, j) => j !== i));
  };

  const setRefFile = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    if (refImg) URL.revokeObjectURL(refImg.url);
    setRefImg({ url: URL.createObjectURL(files[0]), file: files[0] });
  };

  const removeRefImg = () => {
    if (refImg) URL.revokeObjectURL(refImg.url);
    setRefImg(null);
  };

  /* ─── generate ─── */
  const generate = async () => {
    if (isDisabled || !currentTypeDef) return;
    setLoading(true);
    setError('');
    setResultUrl('');
    setLightboxOpen(false);

    try {
      const size   = ch ? CH_SIZE[ch as Channel] : '';
      const prompt = `${currentTypeDef.prompt} 카테고리: ${cat || '미지정'}. 상품명: ${productName || '미지정'}. 채널: ${ch}. 권장 규격: ${size}px.`;

      const sourceImgs = productImgs.slice(0, 5);
      const base64s: string[] = sourceImgs.length > 0
        ? await Promise.all(sourceImgs.map(img => toBase64(img.url)))
        : [];

      if (needsRef && refImg) {
        base64s.push(await toBase64(refImg.url));
      }

      const body: Record<string, unknown> = { prompt, sectionNum: `thumb_${selectedType}` };
      if (base64s.length > 0) body.productImages = base64s;

      const res  = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(130_000),
      });
      const data = await res.json();
      if (data.imageBase64) {
        setResultUrl(`data:${data.mimeType};base64,${data.imageBase64}`);
      } else {
        setError(data.error || '이미지 생성에 실패했어요. 다시 시도해주세요.');
      }
    } catch (e) {
      console.error('[ThumbScreen] generate error:', e);
      setError('생성 중 오류가 발생했어요. 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  const download = () => {
    if (!resultUrl) return;
    const a = document.createElement('a');
    a.href     = resultUrl;
    a.download = `${productName || 'pagecraft'}_thumb_${selectedType}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  /* ─── render ─── */
  return (
    <div className="inner">
      <div className="stitle">썸네일 생성</div>
      <div className="ssub">채널별 최적 규격으로 이커머스 썸네일을 AI로 만들어드려요</div>

      {/* 상품명 */}
      <div className="fg">
        <div className="fl">상품명 <span className="fopt">선택</span></div>
        <input
          className="finp"
          type="text"
          placeholder="예: 제주 병풀 토너 200ml"
          value={productName}
          onChange={e => setProductName(e.target.value)}
        />
      </div>

      {/* 카테고리 */}
      <div className="fg">
        <div className="fl">카테고리 <span className="fopt">선택</span></div>
        <div className="chips">
          {CATS.map(c => (
            <button
              key={c.key}
              className={`chip${cat === c.key ? ' on' : ''}`}
              onClick={() => setCat(p => p === c.key ? '' : c.key)}
              type="button"
            >
              {c.ico} {c.key}
            </button>
          ))}
        </div>
      </div>

      {/* 채널 */}
      <div className="fg">
        <div className="fl">채널 <span className="freq">*</span></div>
        <div className="chips">
          {CHANNELS.map(c => (
            <button
              key={c}
              className={`chip${ch === c ? ' on' : ''}`}
              onClick={() => setCh(p => p === c ? '' : c)}
              type="button"
            >
              {c}
            </button>
          ))}
        </div>
        {ch && <div className="fhint">권장 규격: {CH_SIZE[ch as Channel]}px</div>}
      </div>

      {/* 상품 이미지 업로드 */}
      <div className="fg">
        <div className="fl">상품 이미지 <span className="fopt">선택</span></div>
        <div
          className={`up-zone${dragging ? ' drag' : ''}`}
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => { e.preventDefault(); setDragging(false); addProductFiles(e.dataTransfer.files); }}
          onClick={() => productInputRef.current?.click()}
        >
          <input ref={productInputRef} type="file" multiple accept="image/*" style={{ display: 'none' }}
            onChange={e => { addProductFiles(e.target.files); e.target.value = ''; }}
          />
          <div style={{ fontSize: 28, marginBottom: 10 }}>📷</div>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>상품 이미지 드래그 또는 클릭</div>
          <div style={{ fontSize: 11, color: 'var(--tx3)', lineHeight: 1.6 }}>PNG · JPG · WEBP · 최대 5장</div>
          <label className="up-btn" onClick={e => { e.stopPropagation(); productInputRef.current?.click(); }} style={{ cursor: 'pointer' }}>파일 선택</label>
        </div>
        {productImgs.length > 0 && (
          <div className="img-grid">
            {productImgs.map((img, i) => (
              <div className="img-th" key={i}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.url} alt={`상품이미지 ${i + 1}`} />
                <div className="img-lbl">이미지 {i + 1}</div>
                <button className="img-th-rm" onClick={() => removeProductImg(i)}>✕</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 썸네일 타입 — 2열 카드 그리드 */}
      <div className="fg">
        <div className="fl">썸네일 타입 <span className="freq">*</span></div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
          {THUMB_TYPES.filter(t => !t.disabled).map(t => {
            const isOn = selectedType === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setSelectedType(p => p === t.key ? '' : t.key)}
                style={{
                  textAlign: 'left',
                  padding: '10px 12px',
                  border: `1.5px solid ${isOn ? 'var(--ac)' : 'var(--bd)'}`,
                  borderRadius: 'var(--r)',
                  background: isOn ? 'var(--al)' : 'var(--white)',
                  cursor: 'pointer',
                  fontFamily: 'var(--f)',
                  transition: 'border-color .15s, background .15s',
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 700, color: isOn ? 'var(--ac)' : 'var(--tx)', marginBottom: 3 }}>{t.label}</div>
                <div style={{ fontSize: 11, color: isOn ? 'var(--ac)' : 'var(--tx3)', lineHeight: 1.4 }}>{t.desc}</div>
              </button>
            );
          })}
        </div>
        {THUMB_TYPES.some(t => t.disabled) && (
          <div style={{ marginTop: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <div style={{ flex: 1, height: 1, background: 'var(--bd)' }} />
              <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--tx3)', letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>준비 중</span>
              <div style={{ flex: 1, height: 1, background: 'var(--bd)' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, opacity: 0.45 }}>
              {THUMB_TYPES.filter(t => t.disabled).map(t => (
                <div
                  key={t.key}
                  style={{
                    textAlign: 'left', padding: '10px 12px',
                    border: '1.5px solid var(--bd)', borderRadius: 'var(--r)',
                    background: 'var(--sf)', cursor: 'default',
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--tx)', marginBottom: 3 }}>
                    {t.label}
                    <span style={{ fontSize: 10, fontWeight: 400, color: 'var(--tx3)', marginLeft: 5 }}>Coming Soon</span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--tx3)', lineHeight: 1.4 }}>{t.desc}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 레퍼런스 이미지 (ref_copy / ref_vibe) */}
      {needsRef && (
        <div className="fg">
          <div className="fl">레퍼런스 이미지 <span className="freq">*</span></div>
          <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#1e40af', lineHeight: 1.6, marginBottom: 12 }}>
            {selectedType === 'ref_copy'
              ? '💡 구도·배경·소품을 그대로 유지하고 제품만 교체할 레퍼런스 이미지를 업로드하세요.'
              : '💡 색감·무드·분위기를 분석할 레퍼런스 이미지를 업로드하세요. 구도는 새롭게 연출돼요.'}
          </div>
          <div
            className={`up-zone${draggingRef ? ' drag' : ''}`}
            onDragOver={e => { e.preventDefault(); setDraggingRef(true); }}
            onDragLeave={() => setDraggingRef(false)}
            onDrop={e => { e.preventDefault(); setDraggingRef(false); setRefFile(e.dataTransfer.files); }}
            onClick={() => refInputRef.current?.click()}
          >
            <input ref={refInputRef} type="file" accept="image/*" style={{ display: 'none' }}
              onChange={e => { setRefFile(e.target.files); e.target.value = ''; }}
            />
            <div style={{ fontSize: 28, marginBottom: 10 }}>🖼️</div>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>레퍼런스 이미지 드래그 또는 클릭</div>
            <div style={{ fontSize: 11, color: 'var(--tx3)', lineHeight: 1.6 }}>참고할 썸네일 디자인 이미지 1장</div>
            <label className="up-btn" onClick={e => { e.stopPropagation(); refInputRef.current?.click(); }} style={{ cursor: 'pointer' }}>파일 선택</label>
          </div>
          {refImg && (
            <div className="img-grid">
              <div className="img-th">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={refImg.url} alt="레퍼런스 이미지" />
                <div className="img-lbl">레퍼런스</div>
                <button className="img-th-rm" onClick={removeRefImg}>✕</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 에러 */}
      {error && (
        <div style={{ background: '#fff1f2', border: '1.5px solid #fecaca', borderRadius: 'var(--r)', padding: '10px 14px', fontSize: 13, color: '#dc2626', marginBottom: 8 }}>
          ⚠️ {error}
        </div>
      )}

      {/* 생성 결과 */}
      {resultUrl && (
        <div style={{ marginBottom: 16, background: 'var(--white)', border: '1.5px solid rgba(22,163,74,.3)', borderRadius: 'var(--r)', overflow: 'hidden' }}>
          <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--bd)', fontSize: 13, fontWeight: 600 }}>
            ✅ 썸네일 생성 완료
          </div>
          <div style={{ padding: 16 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={resultUrl}
              alt="생성된 썸네일"
              onClick={() => setLightboxOpen(true)}
              style={{ width: '100%', borderRadius: 'var(--rs)', display: 'block', marginBottom: 12, cursor: 'zoom-in' }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={generate}
                disabled={loading}
                style={{
                  flex: 1, padding: '10px 0', fontSize: 13, fontWeight: 600,
                  background: 'transparent', border: '1.5px solid var(--ac)', color: 'var(--ac)',
                  borderRadius: 'var(--r)', cursor: loading ? 'default' : 'pointer',
                  opacity: loading ? 0.5 : 1, fontFamily: 'var(--f)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}
              >
                {loading
                  ? <><span style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid #c4b5fd', borderTopColor: '#7c3aed', borderRadius: '50%', animation: 'spin 0.7s linear infinite', flexShrink: 0 }} />생성 중…</>
                  : '↻ 재생성'}
              </button>
              <button
                onClick={download}
                style={{
                  flex: 1, padding: '10px 0', fontSize: 13, fontWeight: 600,
                  background: 'var(--ac)', border: 'none', color: '#fff',
                  borderRadius: 'var(--r)', cursor: 'pointer', fontFamily: 'var(--f)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}
              >
                ⬇ 다운로드
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CTA */}
      <div className="cta-row">
        <button className="btn-back" onClick={() => go('s-dash')}>← 뒤로</button>
        {!resultUrl && (
          <button
            className="btn-next"
            disabled={isDisabled}
            onClick={generate}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            {loading
              ? <><span style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid rgba(255,255,255,.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite', flexShrink: 0 }} />생성 중…</>
              : '✦ 썸네일 생성하기'}
          </button>
        )}
      </div>

      {/* 라이트박스 */}
      {lightboxOpen && resultUrl && (
        <ThumbLightbox url={resultUrl} onClose={() => setLightboxOpen(false)} />
      )}
    </div>
  );
}
