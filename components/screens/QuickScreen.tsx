'use client';

import { useState, useRef } from 'react';
import { useApp, Section } from '@/store/AppContext';

interface ImgFile { url: string; }

const QUICK_SECTIONS = [
  { id: 'hero',       name: '히어로',   desc: '메인 후킹',      ico: '🎯', num: 'SECTION 01', hint: '핵심 차별점 1~2가지\n예: 병풀 52% 고농도, 피부과 테스트 완료' },
  { id: 'empathy',    name: '공감',     desc: '고민 공감',      ico: '😔', num: 'SECTION 02', hint: '타겟이 겪는 고민\n예: 바르면 따갑고 당겨요, 환절기 트러블 반복' },
  { id: 'usp',        name: 'USP',      desc: '핵심 기능',      ico: '⭐', num: 'SECTION 03', hint: '핵심 강점 2~3가지\n예: 수분 72시간, EWG 그린등급, 비건 인증' },
  { id: 'howto',      name: '사용법',   desc: '사용 방법',      ico: '📋', num: 'SECTION 04', hint: '사용 순서 2~4단계\n예: 스킨 → 에센스 → 크림 순으로 사용' },
  { id: 'compare',    name: '비교표',   desc: '경쟁 우위',      ico: '📊', num: 'SECTION 05', hint: '비교 포인트 2~3가지\n예: 성분 순도, 용량 대비 가격, 인증 여부' },
  { id: 'review',     name: '후기',     desc: '후기 강조',      ico: '💬', num: 'SECTION 06', hint: '후기 키워드 3~5가지\n예: 촉촉함, 자극없음, 흡수빠름, 향기좋음' },
  { id: 'faq',        name: 'FAQ',      desc: '자주 묻는 질문', ico: '❓', num: 'SECTION 07', hint: '자주 받는 질문 1~2가지\n예: 민감성 피부에도 괜찮나요?' },
  { id: 'cta',        name: 'CTA',      desc: '구매 유도',      ico: '🛒', num: 'SECTION 08', hint: '특별 혜택이나 긴급성\n예: 런칭 30% 할인, 무료배송' },
  { id: 'ingredient', name: '성분신뢰', desc: '성분 근거',      ico: '🔬', num: 'SECTION 09', hint: '핵심 성분 이름 1~3가지\n예: 병풀추출물, 히알루론산, 나이아신아마이드' },
];

const CAT_CHIPS = [
  { label: '화장품✨' }, { label: '식품🍱' }, { label: '패션👔' }, { label: '생활🛋️' },
  { label: '가전📱' }, { label: '반려동물🐶' }, { label: '스포츠⚽' }, { label: '유아🧸' },
  { label: '건강💪' }, { label: '자동차🚙' }, { label: '기타🎁' },
];

const CH_CHIPS = ['스마트스토어', '쿠팡', '와디즈', '자사몰'];

type GenStatus = 'idle' | 'text' | 'image' | 'done' | 'text_err' | 'img_err';

export default function QuickScreen() {
  const { go } = useApp();

  // Step state
  const [step, setStep] = useState<1 | 2>(1);

  // Step 1 state
  const [productName, setProductName] = useState('');
  const [cat, setCat] = useState('');
  const [ch, setCh] = useState('');
  const [images, setImages] = useState<ImgFile[]>([]);
  const [dragging, setDragging] = useState(false);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);

  // Step 2 state
  const [extraInfo, setExtraInfo] = useState('');

  // Generation state
  const [genStatus, setGenStatus] = useState<GenStatus>('idle');
  const [sectionResult, setSectionResult] = useState<Section | null>(null);
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  const selectedSection = QUICK_SECTIONS.find(s => s.id === selectedSectionId) ?? null;

  const addFiles = (files: FileList | null) => {
    if (!files) return;
    const remaining = 5 - images.length;
    if (files.length > remaining) {
      alert(`최대 5장까지 업로드할 수 있어요. ${remaining > 0 ? `${remaining}장만 추가됩니다.` : '이미 5장이 업로드되었습니다.'}`);
    }
    const newItems: ImgFile[] = Array.from(files).slice(0, remaining).map(f => ({ url: URL.createObjectURL(f) }));
    setImages(p => [...p, ...newItems]);
  };

  const toBase64 = (objectUrl: string): Promise<string> =>
    fetch(objectUrl).then(r => r.blob()).then(blob => new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    }));

  const handleGenerate = async () => {
    if (!selectedSection) return;
    setGenStatus('text');
    setSectionResult(null);
    setImgUrl(null);

    let section: Section | null = null;

    // Step 1: Generate text
    try {
      const res = await fetch('/api/regen-section', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cat: cat || '기타',
          ch: ch || '스마트스토어',
          type: '기본형',
          out: 'blog',
          productName,
          productExtra: extraInfo,
          sectionNum: selectedSection.num,
          sectionName: selectedSection.name,
        }),
        signal: AbortSignal.timeout(30_000),
      });
      const data = await res.json();
      if (data && (data.headline !== undefined || data.body !== undefined)) {
        section = data as Section;
        setSectionResult(section);
        setGenStatus('image');
      } else {
        setGenStatus('text_err');
        return;
      }
    } catch {
      setGenStatus('text_err');
      return;
    }

    // Step 2: Generate image
    try {
      let base64s: string[] = [];
      if (images.length > 0) {
        base64s = await Promise.all(images.slice(0, 3).map(img => toBase64(img.url)));
      }

      const prompt = `${section!.imageDesc}. 텍스트 오버레이: "${section!.headline.replace(/\n/g, ' ')}"`;

      const res = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          sectionNum: selectedSection.num,
          ...(base64s.length > 0 ? { productImages: base64s } : {}),
        }),
        signal: AbortSignal.timeout(130_000),
      });
      const data = await res.json();
      if (data.imageBase64) {
        setImgUrl(`data:${data.mimeType};base64,${data.imageBase64}`);
        setGenStatus('done');
      } else {
        setGenStatus('img_err');
      }
    } catch {
      setGenStatus('img_err');
    }
  };

  const handleCopy = async () => {
    if (!sectionResult) return;
    const text = `헤드라인:\n${sectionResult.headline}\n\n본문:\n${sectionResult.body}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const handleDownload = () => {
    if (!imgUrl || !selectedSection) return;
    const a = document.createElement('a');
    a.href = imgUrl;
    a.download = `${(productName || 'pagecraft').replace(/[/\\?%*:|"<>]/g, '_')}_${selectedSection.name}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleBack = () => {
    if (step === 2) {
      setStep(1);
      setGenStatus('idle');
      setSectionResult(null);
      setImgUrl(null);
      setExtraInfo('');
    } else {
      go('s-dash');
    }
  };

  const progressPill = (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
      <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: step === 1 ? 'var(--tx)' : 'var(--sf)', color: step === 1 ? '#fff' : 'var(--tx3)' }}>1단계 · 섹션 선택</span>
      <span style={{ color: 'var(--tx3)', fontSize: 12 }}>→</span>
      <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: step === 2 ? 'var(--tx)' : 'var(--sf)', color: step === 2 ? '#fff' : 'var(--tx3)' }}>2단계 · 생성</span>
    </div>
  );

  return (
    <div className="inner">
      <div className="stitle">빠른 제작</div>
      <div className="ssub">필요한 섹션 1장만 골라 카피와 이미지를 즉시 생성해드려요</div>

      {progressPill}

      {/* ── STEP 1 ── */}
      {step === 1 && (
        <div>
          {/* 상품명 */}
          <div className="fg">
            <div className="fl">상품명 <span className="fopt">(선택)</span></div>
            <input
              className="finp"
              type="text"
              placeholder="예: 병풀 크림 50ml"
              value={productName}
              onChange={e => setProductName(e.target.value)}
            />
          </div>

          {/* 카테고리 */}
          <div className="fg">
            <div className="fl">카테고리 <span className="fopt">(선택)</span></div>
            <div className="chips">
              {CAT_CHIPS.map(c => (
                <button
                  key={c.label}
                  className={`chip${cat === c.label ? ' on' : ''}`}
                  onClick={() => setCat(p => p === c.label ? '' : c.label)}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* 채널 */}
          <div className="fg">
            <div className="fl">채널 <span className="fopt">(선택)</span></div>
            <div className="chips">
              {CH_CHIPS.map(c => (
                <button
                  key={c}
                  className={`chip${ch === c ? ' on' : ''}`}
                  onClick={() => setCh(p => p === c ? '' : c)}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* 이미지 업로드 */}
          <div className="fg">
            <div className="fl">상품 이미지 업로드 <span className="fopt">(선택)</span></div>
            <div
              className={`up-zone${dragging ? ' drag' : ''}`}
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={e => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); }}
              onClick={() => inputRef.current?.click()}
            >
              <input
                ref={inputRef}
                type="file"
                multiple
                accept="image/*"
                style={{ display: 'none' }}
                onChange={e => addFiles(e.target.files)}
              />
              <div style={{ fontSize: 28, marginBottom: 10 }}>📷</div>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>이미지 드래그 또는 클릭해서 업로드</div>
              <div style={{ fontSize: 11, color: 'var(--tx3)', lineHeight: 1.6 }}>PNG · JPG · WEBP · 최대 5장</div>
              <label
                className="up-btn"
                onClick={e => { e.stopPropagation(); inputRef.current?.click(); }}
                style={{ cursor: 'pointer' }}
              >
                파일 선택
              </label>
            </div>
            {images.length > 0 && (
              <div className="img-grid">
                {images.map((img, i) => (
                  <div className="img-th" key={i}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.url} alt={`상품이미지 ${i + 1}`} />
                    <div className="img-lbl">{i + 1}</div>
                    <button
                      className="img-th-rm"
                      onClick={() => { URL.revokeObjectURL(img.url); setImages(p => p.filter((_, j) => j !== i)); }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 섹션 그리드 */}
          <div className="fg">
            <div className="fl" style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>어떤 섹션이 필요하세요?</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              {QUICK_SECTIONS.map(s => (
                <div
                  key={s.id}
                  className={`cc${selectedSectionId === s.id ? ' on' : ''}`}
                  onClick={() => setSelectedSectionId(p => p === s.id ? null : s.id)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="cc-ck">✓</div>
                  <div className="cc-ico">{s.ico}</div>
                  <div className="cc-name">{s.name}</div>
                  <div className="cc-sub">{s.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Navigation */}
          <div className="cta-row">
            <button className="btn-back" onClick={() => go('s-dash')}>← 뒤로</button>
            <button
              className="btn-next"
              disabled={!selectedSectionId}
              onClick={() => { if (selectedSectionId) setStep(2); }}
            >
              다음 →
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 2 ── */}
      {step === 2 && selectedSection && (
        <div>
          {/* Summary chips */}
          <div className="chips" style={{ marginBottom: 20 }}>
            <span className="chip on">{selectedSection.name}</span>
            {cat && <span className="chip on">{cat}</span>}
            {ch && <span className="chip on">{ch}</span>}
            {productName && <span className="chip on">{productName}</span>}
          </div>

          {/* Extra info */}
          <div className="fg">
            <div className="fl">
              {selectedSection.name} 관련 정보
              {' '}<span className="fopt">(선택)</span>
            </div>
            <textarea
              className="finp"
              rows={4}
              placeholder={selectedSection.hint}
              value={extraInfo}
              onChange={e => setExtraInfo(e.target.value)}
              style={{ resize: 'vertical' }}
            />
            <div className="fhint">입력할수록 카피 퀄리티가 올라가요. 비워두셔도 됩니다.</div>
          </div>

          {/* Generate button */}
          <div className="cta-row">
            <button className="btn-back" onClick={handleBack}>← 이전</button>
            <button
              className="btn-next"
              disabled={genStatus === 'text' || genStatus === 'image'}
              onClick={handleGenerate}
            >
              ✦ {selectedSection.name} 생성하기
            </button>
          </div>

          {/* Result area */}
          {genStatus === 'idle' && (
            <div style={{ marginTop: 24, padding: '20px 16px', background: 'var(--sf)', borderRadius: 'var(--r)', textAlign: 'center', color: 'var(--tx3)', fontSize: 13 }}>
              아래 버튼을 눌러 생성을 시작하세요
            </div>
          )}

          {genStatus !== 'idle' && (
            <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Text card */}
              {genStatus !== 'text_err' && (
                <div style={{ background: 'var(--white)', border: '1.5px solid var(--bd)', borderRadius: 'var(--r)', overflow: 'hidden' }}>
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--bd)', fontWeight: 700, fontSize: 13 }}>
                    📝 카피 결과
                  </div>
                  <div style={{ padding: '16px' }}>
                    {genStatus === 'text' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--tx3)', fontSize: 13 }}>
                        <span style={{ display: 'inline-block', width: 16, height: 16, border: '2px solid #c4b5fd', borderTopColor: '#7c3aed', borderRadius: '50%', animation: 'spin 0.7s linear infinite', flexShrink: 0 }} />
                        카피 생성 중...
                      </div>
                    )}
                    {sectionResult && (
                      <div>
                        <div style={{ fontSize: 18, fontWeight: 800, lineHeight: 1.4, marginBottom: 12, color: 'var(--tx)', whiteSpace: 'pre-line' }}>
                          {sectionResult.headline}
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--tx2)', lineHeight: 1.8, whiteSpace: 'pre-line', marginBottom: 14 }}>
                          {sectionResult.body}
                        </div>
                        <button
                          onClick={handleCopy}
                          style={{ padding: '7px 14px', fontSize: 12, fontWeight: 600, background: 'transparent', border: '1.5px solid var(--bd)', borderRadius: 'var(--rs)', cursor: 'pointer', color: 'var(--tx2)', fontFamily: 'var(--f)' }}
                        >
                          {copied ? '✅ 복사됨!' : '📋 텍스트 복사'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {genStatus === 'text_err' && (
                <div style={{ padding: '14px 16px', background: '#fff1f2', borderRadius: 'var(--r)', color: '#dc2626', fontSize: 13 }}>
                  ⚠️ 카피 생성에 실패했어요. 다시 시도해주세요.
                </div>
              )}

              {/* Image card */}
              {(genStatus === 'image' || genStatus === 'done' || genStatus === 'img_err') && (
                <div style={{ background: 'var(--white)', border: '1.5px solid var(--bd)', borderRadius: 'var(--r)', overflow: 'hidden' }}>
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--bd)', fontWeight: 700, fontSize: 13 }}>
                    🖼️ 이미지 결과
                  </div>
                  <div style={{ padding: '16px' }}>
                    {genStatus === 'image' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--tx3)', fontSize: 13 }}>
                        <span style={{ display: 'inline-block', width: 16, height: 16, border: '2px solid #c4b5fd', borderTopColor: '#7c3aed', borderRadius: '50%', animation: 'spin 0.7s linear infinite', flexShrink: 0 }} />
                        이미지 생성 중...
                      </div>
                    )}
                    {imgUrl && (
                      <div>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={imgUrl}
                          alt={`${selectedSection.name} 이미지`}
                          style={{ width: '100%', borderRadius: 'var(--rs)', display: 'block', marginBottom: 12 }}
                        />
                        <button
                          onClick={handleDownload}
                          style={{ padding: '7px 14px', fontSize: 12, fontWeight: 600, background: 'transparent', border: '1.5px solid var(--bd)', borderRadius: 'var(--rs)', cursor: 'pointer', color: 'var(--tx2)', fontFamily: 'var(--f)' }}
                        >
                          ⬇ 이미지 다운로드
                        </button>
                      </div>
                    )}
                    {genStatus === 'img_err' && (
                      <div style={{ color: '#dc2626', fontSize: 13 }}>
                        ⚠️ 이미지 생성에 실패했어요. 재생성을 눌러 다시 시도해주세요.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Done actions */}
              {genStatus === 'done' && (
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <button
                    onClick={handleGenerate}
                    style={{ padding: '9px 18px', fontSize: 13, fontWeight: 600, background: 'var(--ac)', color: '#fff', border: 'none', borderRadius: 'var(--r)', cursor: 'pointer', fontFamily: 'var(--f)' }}
                  >
                    ↻ 재생성
                  </button>
                  <button
                    onClick={() => {
                      setStep(1);
                      setGenStatus('idle');
                      setSectionResult(null);
                      setImgUrl(null);
                      setExtraInfo('');
                      setSelectedSectionId(null);
                    }}
                    style={{ padding: '9px 18px', fontSize: 13, fontWeight: 600, background: 'transparent', color: 'var(--tx2)', border: '1.5px solid var(--bd)', borderRadius: 'var(--r)', cursor: 'pointer', fontFamily: 'var(--f)' }}
                  >
                    ← 다른 섹션 선택
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
