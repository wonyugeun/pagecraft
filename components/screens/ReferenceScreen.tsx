'use client';

import { useState, useRef, useEffect } from 'react';
import { useApp, ReferenceAnalysis } from '@/store/AppContext';

type Tab = 'url' | 'text' | 'skip';

/* ─── 분석 결과 카드 ─── */
function AnalysisResult({ result, onReset }: { result: ReferenceAnalysis; onReset: () => void }) {
  return (
    <div className="ref-result" style={{ margin: '4px 0 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div className="ref-ok">✅ 구조 분석 완료 — 이 스타일로 참고해서 생성할게요</div>
        <button
          onClick={onReset}
          style={{ fontSize: 11, color: 'var(--tx3)', background: 'transparent', border: '1px solid var(--bd)', borderRadius: 6, padding: '3px 8px', cursor: 'pointer', fontFamily: 'var(--f)', flexShrink: 0 }}
        >
          초기화
        </button>
      </div>

      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--tx3)', marginBottom: 6, letterSpacing: '0.05em' }}>섹션 구조</div>
        <div className="ref-sps">
          {result.sections.map((s, i) => <span key={i} className="ref-sp">{s}</span>)}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
        <div className="ref-tone"><b>카피 톤:</b> {result.tone}</div>
        <div className="ref-tone"><b>헤드라인 패턴:</b> {result.headlinePattern}</div>
      </div>

      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--tx3)', marginBottom: 6, letterSpacing: '0.05em' }}>주요 강조 포인트</div>
        <ul style={{ margin: 0, paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {result.emphasisPoints.map((p, i) => (
            <li key={i} style={{ fontSize: 12, color: 'var(--tx2)', lineHeight: 1.6 }}>{p}</li>
          ))}
        </ul>
      </div>

      <div style={{ background: 'var(--pl)', borderRadius: 6, padding: '8px 12px', fontSize: 12, color: 'var(--pu)', fontWeight: 600 }}>
        💡 {result.summary}
      </div>
    </div>
  );
}

/* ─── 공통 에러 박스 ─── */
function ErrorBox({ msg }: { msg: string }) {
  return (
    <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: 8, padding: '12px 14px', fontSize: 13, color: '#be123c', lineHeight: 1.6 }}>
      ⚠️ {msg}
    </div>
  );
}

/* ─── 분석 버튼 ─── */
function AnalyzeBtn({ loading, disabled, onClick }: { loading: boolean; disabled: boolean; onClick: () => void }) {
  return (
    <button
      className="ref-analyze"
      onClick={onClick}
      disabled={loading || disabled}
      style={{ whiteSpace: 'nowrap', flexShrink: 0 }}
    >
      {loading
        ? <><span style={{ display: 'inline-block', width: 12, height: 12, border: '2px solid #c4b5fd', borderTopColor: '#7c3aed', borderRadius: '50%', animation: 'spin 0.7s linear infinite', marginRight: 6, verticalAlign: 'middle' }} />분석 중...</>
        : '🔍 분석하기'}
    </button>
  );
}

/* ─── 메인 ─── */
export default function ReferenceScreen() {
  const { go, setReferenceAnalysis } = useApp();

  const [tab,     setTab]     = useState<Tab>('url');
  const [url,     setUrl]     = useState('');
  const [text,    setText]    = useState('');
  const [loading, setLoading] = useState(false);
  const [result,  setResult]  = useState<ReferenceAnalysis | null>(null);
  const [error,   setError]   = useState('');
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => { abortRef.current?.abort(); }, []);

  const reset = () => { setResult(null); setReferenceAnalysis(null); setError(''); };

  const switchTab = (t: Tab) => { setTab(t); reset(); };

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
      const res  = await fetch('/api/crawl-reference', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
        signal:  ctrl.signal,
      });
      clearTimeout(tid);
      const data = await res.json();
      if (!res.ok || data.error) { setError(data.error ?? '분석 실패'); return; }
      setResult(data.analysis);
      setReferenceAnalysis(data.analysis);
    } catch (err) {
      clearTimeout(tid);
      if ((err as Error).name === 'AbortError') {
        if (timedOut) setError('40초 초과 — 다시 시도해주세요.');
        return; // 언마운트로 인한 abort는 상태 업데이트 스킵
      }
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      if (!ctrl.signal.aborted || timedOut) setLoading(false);
    }
  };

  const analyzeUrl = () => {
    const trimmed = url.trim();
    if (!trimmed) return;
    const normalized = trimmed.startsWith('http') ? trimmed : `https://${trimmed}`;
    try { new URL(normalized); } catch {
      setError('올바른 URL 형식이 아니에요. https://로 시작하는 주소를 확인해주세요.');
      return;
    }
    callApi({ url: trimmed });
  };
  const analyzeText = () => {
    if (!text.trim()) { setError('텍스트를 입력해주세요.'); return; }
    callApi({ text: text.trim() });
  };

  const tabStyle = (t: Tab): React.CSSProperties => ({
    flex: 1, padding: '10px 0', fontSize: 13, fontWeight: tab === t ? 700 : 400,
    color: tab === t ? 'var(--pu)' : 'var(--tx3)',
    background: tab === t ? 'var(--white)' : 'transparent',
    border: 'none', borderBottom: tab === t ? '2px solid var(--pu)' : '2px solid transparent',
    cursor: 'pointer', fontFamily: 'var(--f)', transition: 'all .15s',
  });

  return (
    <div className="inner">
      <div className="stitle">참고할 상세페이지가 있나요?</div>
      <div className="ssub">비슷한 스타일로 만들고 싶은 페이지를 분석하거나, 건너뛰고 바로 생성할 수 있어요</div>

      {/* ── 탭 ── */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--bd)', marginBottom: 20, marginTop: 4 }}>
        <button style={tabStyle('url')}  onClick={() => switchTab('url')}>🔗 URL 분석</button>
        <button style={tabStyle('text')} onClick={() => switchTab('text')}>📋 텍스트 붙여넣기</button>
        <button style={tabStyle('skip')} onClick={() => switchTab('skip')}>⏭️ 건너뛰기</button>
      </div>

      {/* ── URL 탭 ── */}
      {tab === 'url' && (
        <div className="fb">
          <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#1e40af', lineHeight: 1.7, marginBottom: 16 }}>
            💡 <b>자사몰·해외몰</b>은 URL로 바로 분석 가능해요.<br />
            <b>스마트스토어·쿠팡·올리브영</b>은 봇 차단으로 크롤링이 제한됩니다 — <button onClick={() => switchTab('text')} style={{ fontWeight: 700, color: '#1d4ed8', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--f)', fontSize: 12, textDecoration: 'underline', padding: 0 }}>텍스트 탭</button>을 이용해주세요.
          </div>

          <div className="fg">
            <div className="fl">상세페이지 URL <span className="fopt">선택</span></div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                className="finp"
                type="url"
                placeholder="https://brand.com/product/..."
                value={url}
                onChange={e => { setUrl(e.target.value); reset(); }}
                onKeyDown={e => e.key === 'Enter' && !loading && analyzeUrl()}
                style={{ flex: 1 }}
                disabled={loading}
              />
              <AnalyzeBtn loading={loading} disabled={!url.trim()} onClick={analyzeUrl} />
            </div>
            <div className="fhint">sokoglam, yesstyle, 브랜드 직영몰 등 일반 웹사이트 권장</div>
          </div>

          {error  && <ErrorBox msg={error} />}
          {result && <AnalysisResult result={result} onReset={reset} />}
        </div>
      )}

      {/* ── 텍스트 탭 ── */}
      {tab === 'text' && (
        <div className="fb">
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#166534', lineHeight: 1.7, marginBottom: 16 }}>
            💡 스마트스토어·쿠팡 상세페이지를 열고, <b>Ctrl+A → Ctrl+C</b>로 전체 복사한 뒤 아래에 붙여넣으세요.<br />
            헤드라인·본문·성분 등 텍스트가 많을수록 분석 정확도가 올라가요.
          </div>

          <div className="fg">
            <div className="fl">상세페이지 텍스트 <span className="fopt">선택</span></div>
            <textarea
              className="finp"
              placeholder={"상세페이지에서 복사한 텍스트를 여기에 붙여넣으세요.\n\n예시:\n제주 병풀 진정 토너 200ml\n피부과 테스트 완료 · 비건 인증\n병풀 추출물 52% 고농도...\n히어로 섹션: 예민한 피부를 위한 솔루션\n성분 섹션: EWG 그린등급 98%..."}
              value={text}
              onChange={e => { setText(e.target.value); reset(); }}
              disabled={loading}
              style={{ minHeight: 200, resize: 'vertical', lineHeight: 1.7 }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
              <div className="fhint">{text.length.toLocaleString()}자 입력 · 분석에 최적화된 분량: 500자 이상</div>
              <AnalyzeBtn loading={loading} disabled={text.trim().length < 30} onClick={analyzeText} />
            </div>
          </div>

          {error  && <ErrorBox msg={error} />}
          {result && <AnalysisResult result={result} onReset={reset} />}
        </div>
      )}

      {/* ── 건너뛰기 탭 ── */}
      {tab === 'skip' && (
        <div style={{ textAlign: 'center', padding: '32px 0 20px' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>⚡</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--tx1)', marginBottom: 8 }}>레퍼런스 없이 바로 생성할게요</div>
          <div style={{ fontSize: 13, color: 'var(--tx2)', lineHeight: 1.8, marginBottom: 24 }}>
            카테고리·채널·상품 정보를 기반으로<br />
            전문 카피라이터 AI가 최적의 구조로 설계해드려요.
          </div>
          <div className="cta-row" style={{ justifyContent: 'center', gap: 12 }}>
            <button className="btn-back" onClick={() => go('s5')}>← 이전</button>
            <button className="btn-next" onClick={() => { setReferenceAnalysis(null); go('s5b'); }}>바로 생성하기 →</button>
          </div>
        </div>
      )}

      {/* ── 하단 네비 ── */}
      {tab !== 'skip' && (
        <div className="cta-row" style={{ marginTop: 24 }}>
          <button className="btn-back" onClick={() => go('s5')}>← 이전</button>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
            {!result && (
              <button
                style={{ fontSize: 12, color: 'var(--tx3)', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'var(--f)', textDecoration: 'underline', padding: '4px 0' }}
                onClick={() => { setReferenceAnalysis(null); go('s5b'); }}
              >
                건너뛰고 바로 생성 →
              </button>
            )}
            <button className="btn-next" onClick={() => go('s5b')}>
              {result ? '이 스타일로 생성하기 →' : '다음 →'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
