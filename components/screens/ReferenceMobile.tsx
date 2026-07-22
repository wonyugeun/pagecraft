'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Zap, Sparkles, Link2, Image as ImageIcon,
  ArrowLeft, ArrowRight, Link as LinkIcon,
} from 'lucide-react';
import {
  useApp, ReferenceAnalysis, CaptureAnalysis, CH_OUT_AUTO,
} from '@/store/AppContext';
import { inferOutFromSections } from '@/lib/outputType';
import { AnalysisResult, CaptureTab, ErrorBox } from './ReferenceScreen';

type Tab = 'url' | 'capture';

// ★래퍼런스형 전용 화면(2026-07-22) — 타입(3단계)의 한 갈래라 브레드크럼도 타입 활성으로 표시.
const STEPS = [
  { num: 1, label: '카테고리' },
  { num: 2, label: '채널' },
  { num: 3, label: '타입' },
  { num: 4, label: '출력형태' },
  { num: 5, label: '상품정보' },
];

export default function ReferenceMobile() {
  const {
    go, setReferenceAnalysis, setCaptureAnalysis,
    captureAnalysis, referenceAnalysis,
    setSectionStructure, setOriginalSections, ch, setOut,
    setType, goAfterReference,
    toggleChat, credits,
  } = useApp();

  // 데스크탑 ReferenceScreen과 동일한 state — 기본 탭 = 파일 업로드(주요 채널이 URL 크롤링 차단)
  const [tab, setTab] = useState<Tab>(captureAnalysis ? 'capture' : referenceAnalysis ? 'url' : 'capture');
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ReferenceAnalysis | null>(null);
  const [error, setError] = useState('');
  const [weakRef, setWeakRef] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => { abortRef.current?.abort(); }, []);

  const reset = () => { setResult(null); setReferenceAnalysis(null); setError(''); setWeakRef(false); };
  const switchTab = (t: Tab) => { setTab(t); reset(); };

  // 참고 가치 판정 — 데스크탑과 동일 기준(섹션 4개 미만·타입 2종 이하 = 재료 부족)
  const isWeakReference = (sections: string[]) =>
    sections.length < 4 || new Set(sections).size <= 2;

  // 데스크탑 callApi 로직 그대로
  const callApi = async (body: Record<string, string>) => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    let timedOut = false;
    const tid = setTimeout(() => { timedOut = true; ctrl.abort(); }, 40_000);

    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/crawl-reference', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body), signal: ctrl.signal,
      });
      clearTimeout(tid);
      const data = await res.json();
      if (!res.ok || data.error) { setError(data.error ?? '분석 실패'); return; }
      setResult(data.analysis);
      setReferenceAnalysis(data.analysis);
      setCaptureAnalysis(null);
      const refSections: string[] = data.analysis.sections ?? [];
      setSectionStructure(refSections);
      setWeakRef(isWeakReference(refSections));
      const inferred = inferOutFromSections(refSections);
      if (inferred && !CH_OUT_AUTO[ch || '']) setOut(inferred);
    } catch (err) {
      clearTimeout(tid);
      if ((err as Error).name === 'AbortError') {
        if (timedOut) setError('40초 초과 — 다시 시도해주세요.');
        return;
      }
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      if (!ctrl.signal.aborted || timedOut) setLoading(false);
    }
  };

  const analyzeUrl = () => {
    const trimmed = url.trim();
    if (!trimmed) return;
    const normalized = trimmed.startsWith('http') ? trimmed : `https://${trimmed}`;
    try { new URL(normalized); } catch {
      setError('올바른 URL 형식이 아니에요. https://로 시작하는 주소를 확인해주세요.'); return;
    }
    callApi({ url: trimmed });
  };

  // 캡처 분석 완료 — 데스크탑과 동일
  const handleCaptureDone = (analysis: CaptureAnalysis) => {
    setCaptureAnalysis(analysis);
    setReferenceAnalysis(null);
    const capSections = analysis.섹션목록.map(s => s.타입);
    setSectionStructure(capSections);
    setWeakRef(isWeakReference(capSections));
    const inferred = inferOutFromSections(capSections);
    if (inferred && !CH_OUT_AUTO[ch || '']) setOut(inferred);
  };

  const hasAnalysis = Boolean(referenceAnalysis || captureAnalysis);

  const onPrev = () => go('s3');
  // 래퍼런스 없이 진행 — 분석 자산 정리 후 기본형 전환(데스크탑과 동일)
  const proceedWithoutReference = () => {
    setCaptureAnalysis(null);
    setReferenceAnalysis(null);
    setSectionStructure([]);
    setOriginalSections([]);
    setType('기본형');
    goAfterReference();
  };

  return (
    <div style={{
      minHeight: '100vh', background: '#FAFAFC',
      fontFamily: 'Pretendard, sans-serif',
      paddingBottom: 100,
    }}>

      {/* 1) 헤더 */}
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 20px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <img src="/images/logo-flik.png" alt="Flik" style={{ height: 30, width: "auto", objectFit: "contain", display: "block" }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button onClick={toggleChat} style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            background: '#fff', border: '1px solid #ECECF2', borderRadius: 999,
            padding: '6px 10px', fontSize: 12, fontWeight: 600, color: '#111',
            cursor: 'pointer', fontFamily: 'inherit',
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22C55E' }} />
            AI 도우미
          </button>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            background: '#FEF3C7', border: '1px solid #FDE68A', borderRadius: 999,
            padding: '6px 10px', fontSize: 12, fontWeight: 700, color: '#111',
          }}>
            <Zap size={12} color="#F59E0B" fill="#F59E0B" /> {credits}
          </div>
        </div>
      </header>

      {/* 2) 진행 단계 — 래퍼런스는 타입(3)의 갈래 */}
      <section style={{ padding: '8px 20px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'nowrap', overflowX: 'auto' }}>
          {STEPS.map((s, i) => {
            const active = s.num === 3;
            const done = s.num < 3;
            const bg = active ? '#6D4CFF' : done ? '#DDD6FE' : '#fff';
            const fg = active ? '#fff' : done ? '#6D4CFF' : '#999';
            return (
              <div key={s.num} style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                <div style={{
                  width: 24, height: 24, borderRadius: '50%',
                  background: bg,
                  border: active || done ? 'none' : '1.5px solid #ECECF2',
                  color: fg,
                  fontSize: 11, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>{s.num}</div>
                <span style={{
                  fontSize: 11, color: active ? '#111' : done ? '#6D4CFF' : '#999',
                  fontWeight: active ? 700 : 500,
                }}>{s.label}</span>
                {i < STEPS.length - 1 && (
                  <div style={{ width: 8, height: 1, background: '#ECECF2' }} />
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 3) 래퍼런스형 칩 + 타이틀 + 일러스트 */}
      <section style={{ padding: '20px 20px 0', position: 'relative' }}>
        <span style={{
          display: 'inline-block',
          background: '#F0FBF9', color: '#0B7A6E',
          fontSize: 11, fontWeight: 700,
          borderRadius: 999, padding: '4px 12px',
        }}>래퍼런스형</span>
        <h1 style={{
          margin: '12px 0 0',
          fontSize: 26, fontWeight: 800, color: '#111',
          letterSpacing: '-0.03em', lineHeight: 1.25,
        }}>
          닮고 싶은 <span style={{ color: '#6D4CFF' }}>상세페이지</span>를<br />
          보여주세요
        </h1>
        <p style={{ margin: '12px 0 0', fontSize: 13, color: '#666', lineHeight: 1.6 }}>
          구조와 카피 톤을 분석해 따라가요.<br />
          복제가 아니라 내 제품 이야기로 다시 씁니다.
        </p>
        {/* GPT 일러스트 자리 */}
        <div style={{
          position: 'absolute', right: 16, top: 16,
          width: 110, height: 130, borderRadius: 16,
          background: 'rgba(244,240,255,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 44,
        }}>📄</div>
        <div style={{
          position: 'absolute', right: 20, top: 90,
          width: 40, height: 40, borderRadius: '50%',
          background: '#6D4CFF',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(109,76,255,0.3)',
        }}>
          <LinkIcon size={18} color="#fff" />
        </div>
      </section>

      {/* 4) 2 탭 (데스크탑과 동일 — 파일 업로드 우선) */}
      <section style={{ padding: '24px 20px 0' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 }}>
          {[
            { id: 'capture' as Tab, Icon: ImageIcon, label: '파일 업로드' },
            { id: 'url' as Tab,     Icon: Link2,     label: 'URL 분석' },
          ].map(({ id, Icon, label, badge }: { id: Tab; Icon: typeof Link2; label: string; badge?: string }) => {
            const isActive = tab === id;
            return (
              <button
                key={id}
                onClick={() => switchTab(id)}
                style={{
                  position: 'relative',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                  background: isActive ? '#F4F0FF' : '#fff',
                  border: isActive ? '1.5px solid #6D4CFF' : '1px solid #ECECF2',
                  borderRadius: 12, padding: '10px 4px',
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                <Icon size={16} color={isActive ? '#6D4CFF' : '#666'} />
                <span style={{ fontSize: 11, fontWeight: 700, color: isActive ? '#6D4CFF' : '#666' }}>{label}</span>
                {badge && (
                  <span style={{
                    position: 'absolute', top: -4, right: -4,
                    background: '#EC4899', color: '#fff',
                    fontSize: 8, fontWeight: 800,
                    borderRadius: 4, padding: '2px 4px',
                  }}>{badge}</span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* 5) 탭 콘텐츠 — 데스크탑과 동일 컴포넌트 사용 */}
      <section style={{ padding: '14px 20px 0' }}>
        <div style={{
          background: '#fff', border: '1.5px solid #ECECF2',
          borderRadius: 16, padding: 16,
        }}>
          {tab === 'url' && (
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: '#111' }}>
                상세페이지 URL을 입력해주세요
              </div>
              <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
                <input
                  type="url"
                  value={url}
                  onChange={e => { setUrl(e.target.value); reset(); }}
                  onKeyDown={e => e.key === 'Enter' && !loading && analyzeUrl()}
                  disabled={loading}
                  placeholder="예) https://brand.com/product/..."
                  style={{
                    flex: 1,
                    background: '#F7F6FB', border: 'none',
                    borderRadius: 12, padding: '12px 14px',
                    fontSize: 12.5, color: '#111',
                    outline: 'none', fontFamily: 'inherit',
                  }}
                />
                <button
                  onClick={analyzeUrl}
                  disabled={loading || !url.trim()}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    background: (loading || !url.trim()) ? '#EDE8FF' : '#6D4CFF',
                    color: (loading || !url.trim()) ? '#B0A0E8' : '#fff',
                    border: 'none', fontSize: 12, fontWeight: 700,
                    borderRadius: 12, padding: '0 14px',
                    cursor: (loading || !url.trim()) ? 'not-allowed' : 'pointer',
                    fontFamily: 'inherit', flexShrink: 0,
                    boxShadow: (loading || !url.trim()) ? 'none' : '0 4px 12px rgba(109,76,255,0.3)',
                  }}
                >
                  {loading
                    ? <><span style={{ display: 'inline-block', width: 10, height: 10, border: '2px solid #c4b5fd', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /> 분석 중...</>
                    : <><Sparkles size={12} /> AI 분석하기</>}
                </button>
              </div>
              <div style={{
                marginTop: 12,
                background: '#F4F0FF', border: '1px solid #bfdbfe',
                borderRadius: 10, padding: '10px 12px',
                fontSize: 11.5, color: '#1e40af', lineHeight: 1.6,
              }}>
                💡 <b>자사몰·해외몰</b>은 URL로 바로 분석 가능해요.{' '}
                <b>스마트스토어·쿠팡·올리브영</b>은 봇 차단으로 크롤링이 제한됩니다 —{' '}
                <button onClick={() => switchTab('capture')} style={{ fontWeight: 700, color: '#6D4CFF', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 11.5, textDecoration: 'underline', padding: 0 }}>파일 업로드</button>를 이용해주세요.
              </div>
              {error && (
                <>
                  <div style={{ marginTop: 12 }}>
                    <ErrorBox msg={error} />
                  </div>
                  <div style={{
                    marginTop: 12,
                    background: '#f5f3ff', border: '1px solid #ddd6fe',
                    borderRadius: 10, padding: '14px 16px',
                  }}>
                    <div style={{ fontSize: 12.5, color: '#5b21b6', lineHeight: 1.7, marginBottom: 10 }}>
                      스마트스토어·쿠팡 같은 페이지는 크롤링이 막혀 있어요.<br />
                      캡처 이미지로 분석해보세요.
                    </div>
                    <button
                      onClick={() => switchTab('capture')}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        padding: '9px 16px',
                        background: '#6D4CFF', color: '#fff',
                        border: 'none', borderRadius: 8,
                        fontSize: 12, fontWeight: 700,
                        cursor: 'pointer', fontFamily: 'inherit',
                      }}
                    >
                      파일 업로드로 분석하기 →
                    </button>
                  </div>
                </>
              )}
              {result && <AnalysisResult result={result} onReset={reset} />}
            </div>
          )}

          {tab === 'capture' && <CaptureTab onDone={handleCaptureDone} />}
        </div>

        {/* ★품질 게이트 경고 — 분석 성공했지만 참고 가치가 낮은 페이지(데스크탑 동일) */}
        {weakRef && hasAnalysis && (
          <div style={{
            marginTop: 12, background: '#FFFBEB', border: '1px solid #FDE68A',
            borderRadius: 10, padding: '10px 14px', fontSize: 12, color: '#92400E', lineHeight: 1.7,
          }}>
            ⚠️ 이 페이지는 뽑아낼 섹션 구조가 적어요. 부족한 부분은 AI가 기본 구조로 보완해드릴게요.
          </div>
        )}

        {/* 래퍼런스 없이 진행 링크 */}
        <div style={{ textAlign: 'center', marginTop: 14 }}>
          <button
            onClick={proceedWithoutReference}
            style={{
              fontSize: 12, color: '#9CA3AF', background: 'transparent',
              border: 'none', cursor: 'pointer', fontFamily: 'inherit',
              textDecoration: 'underline', padding: '4px 8px',
            }}
          >
            래퍼런스 없이 기본형으로 진행
          </button>
        </div>
      </section>

      {/* 6) 하단 버튼 */}
      <nav style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: '#fff', borderTop: '1px solid #ECECF2',
        padding: '14px 20px',
        display: 'flex', gap: 10,
        zIndex: 100,
      }}>
        <button onClick={onPrev} style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          background: '#fff', border: '1.5px solid #ECECF2',
          color: '#111',
          fontSize: 14, fontWeight: 700,
          borderRadius: 14, padding: '14px 22px',
          cursor: 'pointer', fontFamily: 'inherit',
          flexShrink: 0,
        }}>
          <ArrowLeft size={16} /> 이전 단계
        </button>
        <button
          onClick={() => hasAnalysis && goAfterReference()}
          disabled={!hasAnalysis}
          style={{
            flex: 1,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            background: hasAnalysis ? '#6D4CFF' : '#EDE8FF',
            color: hasAnalysis ? '#fff' : '#B0A0E8',
            border: 'none',
            fontSize: 15, fontWeight: 700,
            borderRadius: 14, padding: '14px',
            cursor: hasAnalysis ? 'pointer' : 'not-allowed', fontFamily: 'inherit',
            boxShadow: hasAnalysis ? '0 8px 20px rgba(109,76,255,0.3)' : 'none',
          }}>
          {hasAnalysis ? '이 구조로 다음 단계' : '분석하면 진행할 수 있어요'} <ArrowRight size={16} />
        </button>
      </nav>

    </div>
  );
}
