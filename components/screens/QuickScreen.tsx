'use client';

import { useState, useRef, useEffect } from 'react';
import { useApp, Section } from '@/store/AppContext';

interface ImgFile { url: string; }

interface FieldDef {
  id: string;
  label: string;
  placeholder: string;
  type: 'input' | 'textarea';
  rows?: number;
}

const SECTION_FIELDS: Record<string, FieldDef[]> = {
  hero: [
    { id: 'hook',   label: '핵심 후킹 포인트', type: 'input',    placeholder: '예: 병풀 52% 고농도, 피부과 테스트 완료 — 이 제품만의 가장 강한 차별점' },
    { id: 'target', label: '타겟 고객',         type: 'input',    placeholder: '예: 환절기 트러블 걱정되는 20~30대 민감성 피부' },
  ],
  empathy: [
    { id: 'pain', label: '타겟이 겪는 고민', type: 'textarea', rows: 3, placeholder: '예: 바르면 따갑고 당겨요, 환절기마다 트러블 반복, 진정 제품은 효과가 없었어요' },
  ],
  usp: [
    { id: 'diff',    label: '경쟁사 대비 차별점 3가지', type: 'textarea', rows: 4, placeholder: '예: 1. 병풀 52% 고농도\n2. EWG 그린등급 98%\n3. 피부과 테스트 완료' },
    { id: 'feature', label: '핵심 기능',                type: 'input',    placeholder: '예: 수분 72시간 지속, 즉각 진정, 장벽 강화' },
  ],
  howto: [
    { id: 'steps',  label: '사용 단계', type: 'textarea', rows: 4, placeholder: '예: 1. 세안 후 스킨으로 기초 정돈\n2. 에센스 3~4방울 덜어 흡수\n3. 크림으로 마무리' },
    { id: 'timing', label: '사용 시점', type: 'input',    placeholder: '예: 아침·저녁 세안 후, 피부 예민할 때' },
  ],
  compare: [
    { id: 'rival',     label: '비교 대상 (브랜드/제품)', type: 'input',    placeholder: '예: A브랜드 진정토너, B브랜드 수분크림' },
    { id: 'advantage', label: '우리 우위 포인트',        type: 'textarea', rows: 3, placeholder: '예: 용량 2배, 성분 순도 3배 높음, 인증 보유' },
  ],
  review: [
    { id: 'keywords', label: '실제 후기 키워드', type: 'textarea', rows: 3, placeholder: '예: 촉촉함, 자극없음, 흡수빠름, 향기좋음, 다음날 피부결' },
    { id: 'rating',   label: '평균 별점',        type: 'input',    placeholder: '예: 4.8점 (리뷰 1,200개)' },
  ],
  faq: [
    { id: 'questions', label: '자주 묻는 질문 3가지', type: 'textarea', rows: 5, placeholder: '예: Q. 민감성 피부에도 괜찮나요?\nQ. 임산부도 사용 가능한가요?\nQ. 향이 강한가요?' },
  ],
  cta: [
    { id: 'benefit',   label: '혜택/할인', type: 'input', placeholder: '예: 런칭 기념 30% 할인, 3만원 이상 무료배송' },
    { id: 'shipping',  label: '배송 정보', type: 'input', placeholder: '예: 오늘 오후 2시 전 주문 시 내일 도착' },
    { id: 'guarantee', label: '보장 정책', type: 'input', placeholder: '예: 30일 무조건 환불 보장' },
  ],
  ingredient: [
    { id: 'ingredients', label: '핵심 성분/원료', type: 'textarea', rows: 3, placeholder: '예: 병풀추출물 52%, 히알루론산 3종, 나이아신아마이드' },
    { id: 'cert',        label: '인증/특허',      type: 'input',    placeholder: '예: EWG 그린등급, 비건 인증, 피부과 테스트 완료, 특허 성분 복합체' },
  ],
  brand: [
    { id: 'origin', label: '브랜드 탄생 배경', type: 'textarea', rows: 3, placeholder: '예: 창업자 본인이 아토피로 고생하다 성분 연구 끝에 만든 브랜드' },
    { id: 'value',  label: '핵심 가치',        type: 'input',    placeholder: '예: 자연 유래 성분 고집, 동물 실험 반대, 환경 친화 포장' },
  ],
  delivery: [
    { id: 'method',  label: '배송 방식', type: 'input', placeholder: '예: 로켓배송, 새벽배송, 직배송 · 냉장 배송' },
    { id: 'pack',    label: '포장 특징', type: 'input', placeholder: '예: 보냉 파우치, 친환경 완충재, 선물 박스 옵션' },
    { id: 'safety',  label: '안전성',   type: 'input', placeholder: '예: 낱개 봉인 실링, 파손 보상, 식약처 기준 준수' },
  ],
  as: [
    { id: 'warranty', label: '보증 기간',  type: 'input', placeholder: '예: 구매일로부터 1년 무상 A/S' },
    { id: 'refund',   label: '환불 정책', type: 'input', placeholder: '예: 수령 후 7일 이내 단순 변심 환불 가능' },
    { id: 'support',  label: '고객 응대', type: 'input', placeholder: '예: 카카오 채널 평일 09~18시, 평균 응답 1시간' },
  ],
  certification: [
    { id: 'certs',   label: '보유 인증',  type: 'textarea', rows: 3, placeholder: '예: 식약처 기능성 화장품, KC 안전인증, ISO 9001, COSMOS ORGANIC' },
    { id: 'patent',  label: '특허 번호', type: 'input',    placeholder: '예: 특허 제10-2345678호 (복합 진정 성분 배합 공법)' },
    { id: 'test',    label: '시험 결과', type: 'input',    placeholder: '예: 피부 자극 테스트 완료, 알레르기 유발 성분 0%' },
  ],
  process: [
    { id: 'method',  label: '제조 방식', type: 'textarea', rows: 3, placeholder: '예: 저온 압착 추출, GMP 인증 시설, 국내 제조' },
    { id: 'raw',     label: '원료 수급', type: 'input',    placeholder: '예: 제주 직계약 농장, 유기농 인증 원료만 사용' },
    { id: 'quality', label: '품질 관리', type: 'input',    placeholder: '예: 출고 전 전수 검사, 유통기한 18개월' },
  ],
  gift: [
    { id: 'option',   label: '선물 옵션',    type: 'textarea', rows: 3, placeholder: '예: 리본 포장 추가, 쇼핑백 동봉, 세트 구성 가능' },
    { id: 'message',  label: '메시지 카드', type: 'input',    placeholder: '예: 손편지 카드 무료 동봉, 원하는 문구 인쇄 가능' },
    { id: 'design',   label: '포장 디자인', type: 'input',    placeholder: '예: 시즌별 기념 박스, 브랜드 시그니처 패키지' },
  ],
};

const QUICK_SECTIONS = [
  { id: 'hero',          name: '히어로',      desc: '메인 후킹',      ico: '🎯', num: 'SECTION 01' },
  { id: 'empathy',       name: '공감',        desc: '고민 공감',      ico: '😔', num: 'SECTION 02' },
  { id: 'usp',           name: 'USP',         desc: '핵심 기능',      ico: '⭐', num: 'SECTION 03' },
  { id: 'howto',         name: '사용법',      desc: '사용 방법',      ico: '📋', num: 'SECTION 04' },
  { id: 'compare',       name: '비교표',      desc: '경쟁 우위',      ico: '📊', num: 'SECTION 05' },
  { id: 'review',        name: '후기',        desc: '후기 강조',      ico: '💬', num: 'SECTION 06' },
  { id: 'faq',           name: 'FAQ',         desc: '자주 묻는 질문', ico: '❓', num: 'SECTION 07' },
  { id: 'cta',           name: 'CTA',         desc: '구매 유도',      ico: '🛒', num: 'SECTION 08' },
  { id: 'ingredient',    name: '성분신뢰',    desc: '성분 근거',      ico: '🔬', num: 'SECTION 09' },
  { id: 'brand',         name: '브랜드 스토리', desc: '브랜드 철학',  ico: '🏷️', num: 'SECTION 10' },
  { id: 'delivery',      name: '배송/포장',   desc: '배송·패키지',   ico: '📦', num: 'SECTION 11' },
  { id: 'as',            name: 'A/S·환불',   desc: '사후 보장',      ico: '🔧', num: 'SECTION 12' },
  { id: 'certification', name: '인증/특허',   desc: '공식 인증',      ico: '🏅', num: 'SECTION 13' },
  { id: 'process',       name: '제조 공정',   desc: '생산 품질',      ico: '🏭', num: 'SECTION 14' },
  { id: 'gift',          name: '선물 포장',   desc: '기프팅 옵션',   ico: '🎁', num: 'SECTION 15' },
];

const CAT_CHIPS = [
  { label: '화장품✨' }, { label: '식품🍱' }, { label: '패션👔' }, { label: '생활🛋️' },
  { label: '가전📱' }, { label: '반려동물🐶' }, { label: '스포츠⚽' }, { label: '유아🧸' },
  { label: '건강💪' }, { label: '자동차🚙' }, { label: '기타🎁' },
];

const CH_CHIPS = ['스마트스토어', '쿠팡', '와디즈', '자사몰'];

type GenStatus = 'idle' | 'text' | 'image' | 'done' | 'text_err' | 'img_err';

/* ─── 라이트박스 ─── */
function QuickLightbox({ url, alt, onClose }: { url: string; alt: string; onClose: () => void }) {
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
        alt={alt}
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

export default function QuickScreen() {
  const { go } = useApp();

  const [step, setStep] = useState<1 | 2>(1);

  // Step 1
  const [productName, setProductName] = useState('');
  const [cat, setCat] = useState('');
  const [ch, setCh] = useState('');
  const [images, setImages] = useState<ImgFile[]>([]);
  const [dragging, setDragging] = useState(false);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);

  // Step 2 — 섹션별 필드값
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});

  // Generation
  const [genStatus, setGenStatus] = useState<GenStatus>('idle');
  const [sectionResult, setSectionResult] = useState<Section | null>(null);
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  // Auto-close lightbox when result is cleared
  useEffect(() => { if (!sectionResult) setLightboxOpen(false); }, [sectionResult]);

  const inputRef = useRef<HTMLInputElement>(null);

  const selectedSection = QUICK_SECTIONS.find(s => s.id === selectedSectionId) ?? null;

  // 스마트스토어만 블로그형(글+그림), 나머지는 슬라이드형
  const outType = (!ch || ch === '스마트스토어') ? 'blog' : 'slide';

  const setField = (id: string, value: string) =>
    setFieldValues(prev => ({ ...prev, [id]: value }));

  const buildProductExtra = (): string => {
    if (!selectedSection) return '';
    const fields = SECTION_FIELDS[selectedSection.id] ?? [];
    return fields
      .filter(f => fieldValues[f.id]?.trim())
      .map(f => `${f.label}: ${fieldValues[f.id].trim()}`)
      .join('\n');
  };

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
    setLightboxOpen(false);

    let section: Section | null = null;

    try {
      const res = await fetch('/api/regen-section', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cat: cat || '기타',
          ch: ch || '스마트스토어',
          type: '기본형',
          out: outType,
          productName,
          productExtra: buildProductExtra(),
          sectionNum: selectedSection.num,
          sectionName: selectedSection.name,
        }),
        signal: AbortSignal.timeout(30_000),
      });
      const data = await res.json();
      const parsed: Section | null = data?.section ?? null;
      if (parsed?.headline !== undefined || parsed?.body !== undefined) {
        section = parsed;
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

  const goToStep2 = () => {
    setFieldValues({});
    setGenStatus('idle');
    setSectionResult(null);
    setImgUrl(null);
    setLightboxOpen(false);
    setStep(2);
  };

  const handleBack = () => {
    if (step === 2) {
      setStep(1);
      setGenStatus('idle');
      setSectionResult(null);
      setImgUrl(null);
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
            {ch && ch !== '스마트스토어' && (
              <div className="fhint">💡 {ch}는 이미지 슬라이드형으로 생성됩니다 (스마트스토어만 블로그형)</div>
            )}
          </div>

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

          <div className="cta-row">
            <button className="btn-back" onClick={() => go('s-dash')}>← 뒤로</button>
            <button
              className="btn-next"
              disabled={!selectedSectionId}
              onClick={() => { if (selectedSectionId) goToStep2(); }}
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

          {/* 섹션별 동적 필드 */}
          {(SECTION_FIELDS[selectedSection.id] ?? []).map(field => (
            <div className="fg" key={field.id}>
              <div className="fl">
                {field.label} <span className="fopt">(선택)</span>
              </div>
              {field.type === 'textarea' ? (
                <textarea
                  className="finp"
                  rows={field.rows ?? 3}
                  placeholder={field.placeholder}
                  value={fieldValues[field.id] ?? ''}
                  onChange={e => setField(field.id, e.target.value)}
                  style={{ resize: 'vertical' }}
                />
              ) : (
                <input
                  className="finp"
                  type="text"
                  placeholder={field.placeholder}
                  value={fieldValues[field.id] ?? ''}
                  onChange={e => setField(field.id, e.target.value)}
                />
              )}
            </div>
          ))}
          <div className="fhint" style={{ marginBottom: 20 }}>입력할수록 카피 퀄리티가 올라가요. 비워두셔도 됩니다.</div>

          <div className="cta-row">
            <button className="btn-back" onClick={handleBack}>← 이전</button>
            <button
              className="btn-next"
              disabled={genStatus === 'text' || genStatus === 'image' || !ch}
              onClick={handleGenerate}
              title={!ch ? '채널을 선택해주세요' : undefined}
            >
              ✦ {selectedSection.name} 생성하기
            </button>
          </div>
          {!ch && genStatus === 'idle' && (
            <div style={{ fontSize: 12, color: '#b45309', textAlign: 'right', marginTop: -12, marginBottom: 8 }}>
              💡 1단계로 돌아가 채널을 선택해주세요
            </div>
          )}

          {/* Result area */}
          {genStatus === 'idle' && (
            <div style={{ marginTop: 24, padding: '20px 16px', background: 'var(--sf)', borderRadius: 'var(--r)', textAlign: 'center', color: 'var(--tx3)', fontSize: 13 }}>
              위 버튼을 눌러 생성을 시작하세요
            </div>
          )}

          {genStatus !== 'idle' && (
            <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>

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
                          onClick={() => setLightboxOpen(true)}
                          style={{ width: '100%', borderRadius: 'var(--rs)', display: 'block', marginBottom: 12, cursor: 'zoom-in' }}
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
                      setFieldValues({});
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

      {/* 라이트박스 */}
      {lightboxOpen && imgUrl && selectedSection && (
        <QuickLightbox
          url={imgUrl}
          alt={`${selectedSection.name} 이미지`}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </div>
  );
}
