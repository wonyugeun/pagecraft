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

/* ─── HTML 다운로드 ─── */
function downloadHtml(sections: Section[], meta: string, productName: string) {
  const sectionsHtml = sections.map(sec => `
  <section class="sec">
    <h2>${sec.headline.replace(/\n/g, '<br>')}</h2>
    <div class="img-slot">
      <div class="img-icon">📸</div>
      <div class="img-label">${sec.imageLabel}</div>
      <div class="img-desc">${sec.imageDesc}</div>
    </div>
    <p>${sec.body}</p>
  </section>`).join('\n');

  const html = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${productName || '상세페이지'} — PageCraft</title>
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
  <div class="meta">PageCraft 생성 · ${meta}</div>
${sectionsHtml}
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = 'pagecraft_detail.html';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* ─── 이미지 상태 타입 ─── */
type ImgState = { loading: boolean; url: string | null; error: boolean };
const EMPTY_IMG: ImgState = { loading: false, url: null, error: false };

/* ─── 라이트박스 ─── */
function Lightbox({ url, alt, onClose }: { url: string; alt: string; onClose: () => void }) {
  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.88)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={onClose}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url} alt={alt}
        style={{ maxWidth: '100%', maxHeight: '90vh', borderRadius: 8, boxShadow: '0 8px 48px rgba(0,0,0,.6)', display: 'block' }}
        onClick={e => e.stopPropagation()}
      />
      <button
        onClick={onClose}
        style={{ position: 'absolute', top: 16, right: 20, fontSize: 30, color: '#fff', background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1, fontFamily: 'var(--f)' }}
      >✕</button>
    </div>
  );
}

/* ─── 이미지 슬롯 — 외부에서 상태·콜백 수신 ─── */
function ImgSlot({
  sec, imgState, onGenerate,
  slotStyle, labelColor = '#64748b', descColor = '#94a3b8', genBg = '#e0f2fe',
}: {
  sec: Section;
  imgState: ImgState;
  onGenerate: () => void;
  slotStyle: React.CSSProperties;
  labelColor?: string;
  descColor?: string;
  genBg?: string;
}) {
  const { loading, url, error } = imgState;
  const [lightbox, setLightbox] = useState(false);

  if (url) {
    return (
      <>
        <div style={{ ...slotStyle, height: 'auto', padding: 0, position: 'relative', display: 'flex', justifyContent: 'center', background: '#f8fafc' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url} alt={sec.imageLabel}
            style={{ width: '100%', maxWidth: 860, height: 'auto', objectFit: 'contain', display: 'block', cursor: 'zoom-in' }}
            onClick={() => setLightbox(true)}
          />
          <button
            onClick={onGenerate}
            style={{ position: 'absolute', bottom: 10, right: 10, fontSize: 11, padding: '4px 10px', background: 'rgba(0,0,0,.55)', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontFamily: 'var(--f)' }}
          >
            ✦ 재생성
          </button>
        </div>
        {lightbox && <Lightbox url={url} alt={sec.imageLabel} onClose={() => setLightbox(false)} />}
      </>
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
          {!error && (
            <div style={{ marginTop: 8, fontSize: 11, padding: '4px 12px', background: genBg, color: '#3b82f6', borderRadius: 20, fontWeight: 600 }}>
              ✦ 클릭하여 재생성
            </div>
          )}
          {error && <div style={{ fontSize: 11, color: '#ef4444', marginTop: 4 }}>생성 실패 — 클릭하여 재시도</div>}
        </>
      )}
    </div>
  );
}

/* ─── 블로그형 섹션 (실제 상세페이지 스타일) ─── */
function BlogSection({ sec, onRegen, imgState, onGenerateImage }: {
  sec: Section;
  onRegen: (s: Section) => Promise<Section | null>;
  imgState: ImgState;
  onGenerateImage: () => void;
}) {
  const [editOpen,     setEditOpen]     = useState(false);
  const [headline,     setHeadline]     = useState(sec.headline);
  const [editVal,      setEditVal]      = useState(sec.body);
  const [saved,        setSaved]        = useState(sec.body);
  const [regenLoading, setRegenLoading] = useState(false);

  const handleRegen = async () => {
    setRegenLoading(true);
    const result = await onRegen({ ...sec, headline, body: saved });
    if (result) {
      setHeadline(result.headline);
      setSaved(result.body);
      setEditVal(result.body);
    }
    setRegenLoading(false);
  };

  return (
    <div style={{ padding: '40px 0 32px' }}>

      {/* 섹션 번호 — 왼쪽 상단, 아주 작게 */}
      <div style={{ fontSize: 10, fontWeight: 600, color: '#bbb', letterSpacing: '0.12em', marginBottom: 16 }}>
        {sec.num}
      </div>

      {/* ① 헤드라인 */}
      <div style={{ textAlign: 'center', fontSize: 22, fontWeight: 800, color: '#111', lineHeight: 1.5, letterSpacing: '-0.3px', marginBottom: 28, whiteSpace: 'pre-line' }}>
        {headline}
      </div>

      {/* ② 이미지 슬롯 */}
      <ImgSlot
        sec={sec}
        imgState={imgState}
        onGenerate={onGenerateImage}
        slotStyle={{
          margin: '0 -24px', width: 'calc(100% + 48px)',
          height: 300, background: '#f1f5f9',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: 8, marginBottom: 28,
        }}
      />

      {/* ③ 본문 */}
      <div style={{ textAlign: 'center', fontSize: 14, color: '#555', lineHeight: 2, marginBottom: 18 }}>
        {saved}
      </div>

      {/* 버튼 */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 8 }}>
        <button className="bs-edit-btn" onClick={() => setEditOpen(p => !p)}>
          {editOpen ? '✏️ 닫기' : '✏️ 수정하기'}
        </button>
        <button className="bs-regen-btn" onClick={handleRegen} disabled={regenLoading}>
          {regenLoading
            ? <><span style={{ display: 'inline-block', width: 12, height: 12, border: '2px solid #a78bfa', borderTopColor: '#7c3aed', borderRadius: '50%', animation: 'spin 0.7s linear infinite', marginRight: 5, verticalAlign: 'middle' }} />생성 중...</>
            : '✦ AI 재생성'}
        </button>
      </div>

      {editOpen && (
        <div className="edit-panel open" style={{ marginTop: 14 }}>
          <textarea className="edit-inp" value={editVal} onChange={e => setEditVal(e.target.value)} />
          <div className="edit-actions">
            <button className="edit-save" onClick={() => { setSaved(editVal); setEditOpen(false); }}>저장</button>
            <button className="edit-cancel" onClick={() => { setEditVal(saved); setEditOpen(false); }}>취소</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── 슬라이드형 카드 ─── */
function SlideCard({ sec, onRegen, imgState, onGenerateImage }: {
  sec: Section;
  onRegen: (s: Section) => Promise<Section | null>;
  imgState: ImgState;
  onGenerateImage: () => void;
}) {
  const [editOpen,     setEditOpen]     = useState(false);
  const [headline,     setHeadline]     = useState(sec.headline);
  const [editVal,      setEditVal]      = useState(sec.body);
  const [saved,        setSaved]        = useState(sec.body);
  const [regenLoading, setRegenLoading] = useState(false);

  const handleRegen = async () => {
    setRegenLoading(true);
    const result = await onRegen({ ...sec, headline, body: saved });
    if (result) {
      setHeadline(result.headline);
      setSaved(result.body);
      setEditVal(result.body);
    }
    setRegenLoading(false);
  };

  return (
    <div style={{ background: 'var(--white)', border: '1px solid var(--bd)', borderRadius: 'var(--r)', overflow: 'hidden', marginBottom: 20 }}>
      <div style={{ background: 'var(--sf)', borderBottom: '1px solid var(--bd)', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--pu)', background: 'var(--pl)', padding: '2px 8px', borderRadius: 20 }}>{sec.num}</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--tx1)' }}>{sec.name}</span>
      </div>
      <ImgSlot
        sec={sec}
        imgState={imgState}
        onGenerate={onGenerateImage}
        slotStyle={{ height: 220, background: '#f5f3ff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, borderBottom: '1px solid var(--bd)' }}
        labelColor="#7c3aed"
        descColor="#a78bfa"
        genBg="#ede9fe"
      />
      <div style={{ padding: '18px 20px 16px' }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--tx1)', lineHeight: 1.5, marginBottom: 10, whiteSpace: 'pre-line' }}>{headline}</div>
        <div style={{ fontSize: 13, color: 'var(--tx2)', lineHeight: 1.8, marginBottom: 14 }}>{saved}</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="bs-edit-btn" onClick={() => setEditOpen(p => !p)}>{editOpen ? '✏️ 닫기' : '✏️ 수정하기'}</button>
          <button className="bs-regen-btn" onClick={handleRegen} disabled={regenLoading}>
            {regenLoading
              ? <><span style={{ display: 'inline-block', width: 12, height: 12, border: '2px solid #a78bfa', borderTopColor: '#7c3aed', borderRadius: '50%', animation: 'spin 0.7s linear infinite', marginRight: 5, verticalAlign: 'middle' }} />생성 중...</>
              : '✦ AI 재생성'}
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
        {/* 모달 헤더 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--bd)', flexShrink: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700 }}>📄 섹션별 텍스트</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--tx3)', lineHeight: 1 }}>✕</button>
        </div>
        {/* 모달 바디 */}
        <div style={{ overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {sections.map((sec, i) => (
            <div key={i} style={{ border: '1px solid var(--bd)', borderRadius: 8, padding: '14px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div>
                  <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--ac)', background: 'var(--al)', padding: '2px 7px', borderRadius: 20, marginRight: 8 }}>{sec.num}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--tx1)' }}>{sec.name}</span>
                </div>
                <button
                  onClick={() => copyOne(sec)}
                  style={{ fontSize: 11, padding: '4px 10px', background: 'var(--sf)', border: '1px solid var(--bd)', borderRadius: 6, cursor: 'pointer', color: 'var(--tx2)', fontFamily: 'var(--f)', whiteSpace: 'nowrap' }}
                >
                  복사
                </button>
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

/* ─── 메인 ─── */
export default function ResultScreen() {
  const { cat, ch, type, out, secCnt, sections, productName, productExtra, productImages, go } = useApp();
  const [textModalOpen,  setTextModalOpen]  = useState(false);
  const [sectionImages,  setSectionImages]  = useState<Record<string, ImgState>>({});
  const cancelRef = useRef(false);

  const displaySections = sections.length > 0 ? sections : DEFAULT_SECTIONS;
  const isSlide = out === 'slide';
  const isHtml  = out === 'html';

  // 이미지 단건 생성
  const generateImage = useCallback(async (sec: Section) => {
    setSectionImages(p => ({ ...p, [sec.num]: { loading: true, url: null, error: false } }));
    try {
      const res  = await fetch('/api/generate-image', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          prompt: `${sec.imageDesc}. 텍스트 오버레이: "${sec.headline.replace(/\n/g, ' ')}"`,
          sectionNum: sec.num,
          productImages: productImages.length > 0 ? productImages : undefined,
        }),
        signal:  AbortSignal.timeout(130_000), // 서버 120초 + 여유 10초
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

  // ResultScreen 진입 시 순차 자동 생성
  useEffect(() => {
    if (!displaySections.length) return;
    cancelRef.current = false;
    setSectionImages({});

    (async () => {
      for (let i = 0; i < displaySections.length; i++) {
        if (cancelRef.current) break;
        if (i > 0) await new Promise(r => setTimeout(r, 3_000)); // 레이트리밋 방지
        if (cancelRef.current) break;
        await generateImage(displaySections[i]);
      }
    })();

    return () => { cancelRef.current = true; };
  // displaySections.length 변화 시(섹션 세트 교체)에만 재실행
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displaySections.length]);

  // 진행 상황 계산
  const doneCount     = Object.values(sectionImages).filter(s => !s.loading).length;
  const isGenerating  = Object.values(sectionImages).some(s => s.loading);

  // 섹션 단건 재생성
  const regenFn = async (sec: Section): Promise<Section | null> => {
    try {
      const res = await fetch('/api/regen-section', {
        method:  'POST',
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
  };
  const label   = isSlide ? '이미지 슬라이드형' : isHtml ? 'HTML 섹션형' : '블로그형 (글+그림)';
  const meta    = [cat, ch, type, label, `${secCnt}섹션`].filter(Boolean).join(' · ');

  return (
    <div className="result-shell">

      {/* 상단 */}
      <div className="result-top">
        <div>
          <div className="result-title">상세페이지 완성 🎉</div>
          <div className="result-meta">{meta}</div>
        </div>
        <div className="result-top-btns">
          <button className="btn-outline" onClick={() => go('s4')}>← 정보 수정</button>
          <button className="btn-outline" onClick={() => go('s5')}>← 이미지 수정</button>
        </div>
      </div>

      {/* 레이블 */}
      <div style={{ padding: '10px 0 4px', fontSize: 13, fontWeight: 600, color: 'var(--tx2)' }}>
        {isSlide ? '🖼️ 이미지 슬라이드 결과' : isHtml ? '🌐 HTML 섹션형 결과' : '📝 블로그형 (글+그림) 결과'}
      </div>

      {/* 이미지 자동 생성 진행 배너 */}
      {isGenerating && (
        <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '10px 16px', fontSize: 12, color: '#1d4ed8', marginTop: 12, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid #93c5fd', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 0.8s linear infinite', flexShrink: 0 }} />
          이미지 자동 생성 중 ({doneCount}/{displaySections.length}) — 순서대로 생성됩니다
        </div>
      )}

      {/* 블로그형 — 상세페이지 스타일 */}
      {!isSlide && (
        <div style={{ background: '#fff', padding: '0 24px', marginTop: 12 }}>
          {displaySections.map((sec, i) => (
            <BlogSection
              key={i} sec={sec} onRegen={regenFn}
              imgState={sectionImages[sec.num] ?? EMPTY_IMG}
              onGenerateImage={() => generateImage(sec)}
            />
          ))}
        </div>
      )}

      {/* 슬라이드형 */}
      {isSlide && (
        <div style={{ marginTop: 12 }}>
          {displaySections.map((sec, i) => (
            <SlideCard
              key={i} sec={sec} onRegen={regenFn}
              imgState={sectionImages[sec.num] ?? EMPTY_IMG}
              onGenerateImage={() => generateImage(sec)}
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
          {/* HTML 다운로드 */}
          <button
            className="dl-main-btn"
            style={{ fontSize: 13 }}
            onClick={() => downloadHtml(displaySections, meta, productName)}
          >
            💾 HTML 다운로드
          </button>
          {/* 섹션별 텍스트 보기 */}
          <button
            className="dl-main-btn"
            style={{ background: 'var(--white)', color: 'var(--ac)', border: '1.5px solid var(--ac)', fontSize: 13 }}
            onClick={() => setTextModalOpen(true)}
          >
            📄 섹션별 텍스트 보기
          </button>
          {/* 통이미지 다운로드 (비활성) */}
          <button
            disabled
            title="이미지 생성 연동 후 활성화"
            style={{
              fontSize: 13, padding: '10px 18px', borderRadius: 'var(--rs)',
              background: '#f1f5f9', color: '#94a3b8', border: '1.5px solid #e2e8f0',
              cursor: 'not-allowed', fontFamily: 'var(--f)', fontWeight: 500,
            }}
          >
            🖼️ 통이미지 다운로드
          </button>
        </div>
      </div>

      {/* 섹션별 텍스트 모달 */}
      {textModalOpen && (
        <TextModal sections={displaySections} onClose={() => setTextModalOpen(false)} />
      )}

    </div>
  );
}
