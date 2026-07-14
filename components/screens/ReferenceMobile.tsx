'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Zap, Sparkles, Link2, Image as ImageIcon, Plus,
  ArrowLeft, ArrowRight, Link as LinkIcon,
} from 'lucide-react';
import {
  useApp, ReferenceAnalysis, CaptureAnalysis, CH_OUT_AUTO,
} from '@/store/AppContext';
import { inferOutFromSections } from '@/lib/outputType';
import { AnalysisResult, CaptureTab, ErrorBox } from './ReferenceScreen';

type Tab = 'url' | 'capture' | 'skip';

const STEPS = [
  { num: 1, label: '카테고리' },
  { num: 2, label: '채널' },
  { num: 3, label: '타입' },
  { num: 4, label: '출력형태' },
  { num: 5, label: '상품정보' },
  { num: 6, label: '레퍼런스' },
  { num: 7, label: '섹션구조' },
  { num: 8, label: '이미지' },
  { num: 9, label: '생성' },
  { num: 10, label: '결과물' },
];

export default function ReferenceMobile() {
  const {
    go, setReferenceAnalysis, setCaptureAnalysis,
    captureAnalysis, referenceAnalysis,
    setSectionStructure, ch, setOut,
    toggleChat, credits,
  } = useApp();

  // 데스크탑 ReferenceScreen과 동일한 state
  const [tab, setTab] = useState<Tab>(captureAnalysis ? 'capture' : referenceAnalysis ? 'url' : 'url');
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ReferenceAnalysis | null>(null);
  const [error, setError] = useState('');
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => { abortRef.current?.abort(); }, []);

  const reset = () => { setResult(null); setReferenceAnalysis(null); setError(''); };
  const switchTab = (t: Tab) => { setTab(t); reset(); };

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
    const inferred = inferOutFromSections(capSections);
    if (inferred && !CH_OUT_AUTO[ch || '']) setOut(inferred);
  };

  const onPrev = () => go('s5');
  const onNextSkip = () => {
    if (tab === 'capture') { setCaptureAnalysis(null); setReferenceAnalysis(null); }
    else setReferenceAnalysis(null);
    go('s5b');
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

      {/* 2) 진행 단계 1~10 */}
      <section style={{ padding: '8px 20px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'nowrap', overflowX: 'auto' }}>
          {STEPS.map((s, i) => {
            const active = s.num === 6;
            const done = s.num < 6;
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

      {/* 3) STEP 6/10 + 타이틀 + 일러스트 */}
      <section style={{ padding: '20px 20px 0', position: 'relative' }}>
        <span style={{
          display: 'inline-block',
          background: '#F4F0FF', color: '#6D4CFF',
          fontSize: 11, fontWeight: 700,
          borderRadius: 999, padding: '4px 12px',
        }}>STEP 6 / 10</span>
        <h1 style={{
          margin: '12px 0 0',
          fontSize: 26, fontWeight: 800, color: '#111',
          letterSpacing: '-0.03em', lineHeight: 1.25,
        }}>
          참고할 <span style={{ color: '#6D4CFF' }}>상세페이지</span>가<br />
          있나요?
        </h1>
        <p style={{ margin: '12px 0 0', fontSize: 13, color: '#666', lineHeight: 1.6 }}>
          레퍼런스를 분석하면 AI가 더 정확한<br />
          구조와 디자인을 제안해드려요.
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

      {/* 4) 3 탭 (데스크탑과 동일) */}
      <section style={{ padding: '24px 20px 0' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
          {[
            { id: 'url' as Tab,     Icon: Link2,     label: 'URL 분석' },
            { id: 'capture' as Tab, Icon: ImageIcon, label: '파일 업로드', badge: 'NEW' },
            { id: 'skip' as Tab,    Icon: Plus,      label: '직접 만들기' },
          ].map(({ id, Icon, label, badge }) => {
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

          {tab === 'skip' && (
            <div style={{ textAlign: 'center', padding: '20px 0 10px' }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>⚡</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#111', marginBottom: 6 }}>
                레퍼런스 없이 바로 생성할게요
              </div>
              <div style={{ fontSize: 12, color: '#666', lineHeight: 1.7, marginBottom: 18 }}>
                카테고리·채널·상품 정보를 기반으로<br />
                전문 카피라이터 AI가 최적의 구조로 설계해드려요.
              </div>
              <button
                onClick={() => { setReferenceAnalysis(null); go('s5b'); }}
                style={{
                  background: '#6D4CFF', color: '#fff',
                  border: 'none', fontSize: 13, fontWeight: 700,
                  borderRadius: 12, padding: '11px 22px',
                  cursor: 'pointer', fontFamily: 'inherit',
                  boxShadow: '0 8px 20px rgba(109,76,255,0.3)',
                }}
              >
                바로 생성하기 →
              </button>
            </div>
          )}
        </div>
      </section>

      {/* 6) 하단 버튼 (skip 탭은 자체 버튼이 있으므로 동일하게 노출) */}
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
        <button onClick={onNextSkip} style={{
          flex: 1,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          background: '#6D4CFF', color: '#fff',
          border: 'none',
          fontSize: 15, fontWeight: 700,
          borderRadius: 14, padding: '14px',
          cursor: 'pointer', fontFamily: 'inherit',
          boxShadow: '0 8px 20px rgba(109,76,255,0.3)',
        }}>
          다음 단계로 <ArrowRight size={16} />
        </button>
      </nav>

    </div>
  );
}
