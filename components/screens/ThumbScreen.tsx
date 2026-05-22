'use client';

import { useState, useRef } from 'react';
import { useApp } from '@/store/AppContext';

/* ─── 카테고리 ─── */
const CATS = [
  { key: '화장품', ico: '✨' },
  { key: '식품',   ico: '🍱' },
  { key: '패션',   ico: '👔' },
  { key: '생활',   ico: '🛋️' },
  { key: '가전',   ico: '📱' },
  { key: '반려동물', ico: '🐶' },
  { key: '스포츠', ico: '⚽' },
  { key: '유아',   ico: '🧸' },
  { key: '건강',   ico: '💪' },
  { key: '자동차', ico: '🚙' },
  { key: '기타',   ico: '🎁' },
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
const THUMB_TYPES = [
  {
    key: 'white',
    label: '흰배경 단독컷',
    prompt: '순백색 배경에 제품만 중앙에 배치한 이커머스 썸네일. 제품 형태가 선명하게 보이도록 고른 조명 처리.',
  },
  {
    key: 'concept',
    label: '컨셉컷',
    prompt: '브랜드 무드와 카테고리에 어울리는 감성 배경에 제품을 자연스럽게 합성한 이커머스 썸네일. 색감과 분위기를 제품과 조화롭게 연출.',
  },
  {
    key: 'text_overlay',
    label: '텍스트오버레이컷',
    prompt: '제품 이미지 위에 한국어 핵심 카피를 굵은 폰트로 오버레이한 이커머스 썸네일. 고대비 색상과 명확한 가독성 강조.',
  },
  {
    key: 'ref_copy',
    label: '레퍼런스 카피컷',
    prompt: '레퍼런스 이미지의 레이아웃·색감·구도를 참고하여 제품에 맞게 재해석한 이커머스 썸네일.',
  },
] as const;
type ThumbTypeKey = typeof THUMB_TYPES[number]['key'];

interface ImgFile { url: string; file: File; }

export default function ThumbScreen() {
  const { go } = useApp();

  /* ─── local state ─── */
  const [productName, setProductName] = useState('');
  const [cat, setCat]                 = useState('');
  const [ch, setCh]                   = useState<Channel | ''>('');
  const [selectedType, setSelectedType] = useState<ThumbTypeKey | ''>('');

  const [productImgs, setProductImgs] = useState<ImgFile[]>([]);
  const [dragging, setDragging]       = useState(false);
  const productInputRef               = useRef<HTMLInputElement>(null);

  const [refImg, setRefImg]           = useState<ImgFile | null>(null);
  const [draggingRef, setDraggingRef] = useState(false);
  const refInputRef                   = useRef<HTMLInputElement>(null);

  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');
  const [resultUrl, setResultUrl]     = useState('');

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
    if (files.length > remaining) {
      alert(`최대 5장까지 업로드할 수 있어요. ${remaining}장만 추가됩니다.`);
    }
    const newItems: ImgFile[] = Array.from(files).slice(0, remaining).map(f => ({
      url: URL.createObjectURL(f), file: f,
    }));
    setProductImgs(p => [...p, ...newItems]);
  };

  const removeProductImg = (i: number) => {
    URL.revokeObjectURL(productImgs[i].url);
    setProductImgs(p => p.filter((_, j) => j !== i));
  };

  const setRefFile = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    if (refImg) URL.revokeObjectURL(refImg.url);
    const f = files[0];
    setRefImg({ url: URL.createObjectURL(f), file: f });
  };

  const removeRefImg = () => {
    if (refImg) URL.revokeObjectURL(refImg.url);
    setRefImg(null);
  };

  /* ─── disabled check ─── */
  const isDisabled =
    !ch ||
    !selectedType ||
    loading ||
    (selectedType === 'ref_copy' && !refImg);

  /* ─── generate ─── */
  const generate = async () => {
    if (isDisabled) return;
    setLoading(true);
    setError('');
    setResultUrl('');

    try {
      const typeDef = THUMB_TYPES.find(t => t.key === selectedType)!;
      const size    = ch ? CH_SIZE[ch as Channel] : '';
      const prompt  = `${typeDef.prompt} 카테고리: ${cat || '미지정'}. 상품명: ${productName || '미지정'}. 채널: ${ch}. 권장 규격: ${size}px.`;

      // build productImages array
      const sourceImgs = productImgs.slice(0, 5);
      const base64s: string[] = sourceImgs.length > 0
        ? await Promise.all(sourceImgs.map(img => toBase64(img.url)))
        : [];

      // ref_copy: append ref image as last
      if (selectedType === 'ref_copy' && refImg) {
        const refB64 = await toBase64(refImg.url);
        base64s.push(refB64);
      }

      const body: Record<string, unknown> = {
        prompt,
        sectionNum: `thumb_${selectedType}`,
      };
      if (base64s.length > 0) body.productImages = base64s;

      const res = await fetch('/api/generate-image', {
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

  /* ─── download ─── */
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
        {ch && (
          <div className="fhint">권장 규격: {CH_SIZE[ch as Channel]}px</div>
        )}
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
          <input
            ref={productInputRef}
            type="file"
            multiple
            accept="image/*"
            style={{ display: 'none' }}
            onChange={e => { addProductFiles(e.target.files); e.target.value = ''; }}
          />
          <div style={{ fontSize: 28, marginBottom: 10 }}>📷</div>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>상품 이미지 드래그 또는 클릭</div>
          <div style={{ fontSize: 11, color: 'var(--tx3)', lineHeight: 1.6 }}>PNG · JPG · WEBP · 최대 5장</div>
          <label
            className="up-btn"
            onClick={e => { e.stopPropagation(); productInputRef.current?.click(); }}
            style={{ cursor: 'pointer' }}
          >
            파일 선택
          </label>
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

      {/* 썸네일 타입 */}
      <div className="fg">
        <div className="fl">썸네일 타입 <span className="freq">*</span></div>
        <div className="chips">
          {THUMB_TYPES.map(t => (
            <button
              key={t.key}
              className={`chip${selectedType === t.key ? ' on' : ''}`}
              onClick={() => setSelectedType(p => p === t.key ? '' : t.key as ThumbTypeKey)}
              type="button"
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* 레퍼런스 이미지 (ref_copy 선택 시) */}
      {selectedType === 'ref_copy' && (
        <div className="fg">
          <div className="fl">레퍼런스 이미지 <span className="freq">*</span></div>
          <div
            className={`up-zone${draggingRef ? ' drag' : ''}`}
            onDragOver={e => { e.preventDefault(); setDraggingRef(true); }}
            onDragLeave={() => setDraggingRef(false)}
            onDrop={e => { e.preventDefault(); setDraggingRef(false); setRefFile(e.dataTransfer.files); }}
            onClick={() => refInputRef.current?.click()}
          >
            <input
              ref={refInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={e => { setRefFile(e.target.files); e.target.value = ''; }}
            />
            <div style={{ fontSize: 28, marginBottom: 10 }}>🖼️</div>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>레퍼런스 이미지 드래그 또는 클릭</div>
            <div style={{ fontSize: 11, color: 'var(--tx3)', lineHeight: 1.6 }}>참고할 썸네일 디자인 이미지 1장</div>
            <label
              className="up-btn"
              onClick={e => { e.stopPropagation(); refInputRef.current?.click(); }}
              style={{ cursor: 'pointer' }}
            >
              파일 선택
            </label>
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
              style={{ width: '100%', borderRadius: 'var(--rs)', display: 'block', marginBottom: 12 }}
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
                {loading ? (
                  <>
                    <span style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid #c4b5fd', borderTopColor: '#7c3aed', borderRadius: '50%', animation: 'spin 0.7s linear infinite', flexShrink: 0 }} />
                    생성 중…
                  </>
                ) : '↻ 재생성'}
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
            {loading ? (
              <>
                <span style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid rgba(255,255,255,.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite', flexShrink: 0 }} />
                생성 중…
              </>
            ) : '✦ 썸네일 생성하기'}
          </button>
        )}
      </div>
    </div>
  );
}
