'use client';

import { useEffect, useRef, useState } from 'react';
import { useApp, Section } from '@/store/AppContext';

const GEN_STEPS = [
  '레퍼런스 URL 구조 분석 중...',
  '카테고리 기획 IP 적용 중...',
  '섹션별 카피 생성 중...',
  '이미지 배치 최적화 중...',
  '출력 형태 조립 중...',
  '최종 검수...',
];

const STEP_PCTS = [12, 28, 50, 70, 87, 100];

const MIN_ANIM_MS = (GEN_STEPS.length - 1) * 900 + 600;

const GENERATION_COST = 10;

export default function GeneratingScreen() {
  const { cat, ch, type, out, secCnt, productName, productExtra, referenceAnalysis, captureAnalysis, sectionStructure, go, setSections, credits, deductCredits, setCreditModalOpen, saveHistory } = useApp();
  const [stepIdx,          setStepIdx]          = useState(-1);
  const [pct,              setPct]              = useState(0);
  const [apiError,         setApiError]         = useState('');
  const [retryKey,         setRetryKey]         = useState(0);
  const [creditInsufficient, setCreditInsufficient] = useState(false);
  const timerRef    = useRef<NodeJS.Timeout[]>([]);
  const abortRef    = useRef<AbortController | null>(null);
  const cancelledRef = useRef(false);

  const isDev = process.env.NODE_ENV === 'development';

  useEffect(() => {
    if (!isDev && credits < GENERATION_COST) {
      setCreditInsufficient(true);
      return;
    }
    setCreditInsufficient(false);
    cancelledRef.current = false;
    abortRef.current = new AbortController();
    const start  = Date.now();
    const timers: NodeJS.Timeout[] = [];
    // closure flag: true only when our setTimeout fires — never stale from re-mount cleanup
    let timedOut = false;

    // ── 애니메이션 타이머 ──
    GEN_STEPS.forEach((_, i) => {
      const t = setTimeout(() => {
        setStepIdx(i);
        setPct(STEP_PCTS[i]);
      }, i === 0 ? 0 : i * 900);
      timers.push(t);
    });

    // ── API 호출 ──
    // 로컬 개발: 300초, 프로덕션(Vercel maxDuration=300 적용): 280초
    const TIMEOUT_MS = process.env.NODE_ENV === 'development' ? 300_000 : 280_000;
    const timeoutId = setTimeout(() => {
      timedOut = true;
      abortRef.current?.abort();
    }, TIMEOUT_MS);
    fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cat, ch, type, out, secCnt, productName, productExtra, referenceAnalysis, captureAnalysis, sectionStructure }),
      signal: abortRef.current.signal,
    })
      .then(async r => {
        clearTimeout(timeoutId);
        const data = await r.json() as { sections?: Section[]; error?: string };
        if (cancelledRef.current) return;

        if (!r.ok || data.error) {
          timers.forEach(clearTimeout);
          setApiError(data.error ?? `생성 실패 (${r.status}). 다시 시도해주세요.`);
          return;
        }

        if (data.sections?.length) {
          setSections(data.sections);
          saveHistory({
            productName,
            cat: cat ?? '',
            ch: ch ?? '',
            type: type ?? '',
            out: out ?? '',
            secCnt,
            sections: data.sections,
          });
        }

        const elapsed = Date.now() - start;
        const wait    = Math.max(0, MIN_ANIM_MS - elapsed);
        const done    = setTimeout(() => {
          if (!cancelledRef.current) {
            if (!isDev) deductCredits(GENERATION_COST);
            go('s8');
          }
        }, wait);
        timers.push(done);
      })
      .catch(err => {
        clearTimeout(timeoutId);
        // cancelledRef가 true이면 사용자가 직접 취소 — 무시
        if (cancelledRef.current) return;
        // timedOut closure flag으로 진짜 타임아웃 여부 판단 (Strict Mode 이중마운트 cleanup abort와 구분)
        if (err.name === 'AbortError') {
          if (timedOut) {
            timers.forEach(clearTimeout);
            setApiError('요청 시간이 초과되었어요. 다시 시도해주세요.');
          }
          return;
        }
        console.error('[GeneratingScreen] API 오류:', err);
        timers.forEach(clearTimeout);
        setApiError('네트워크 오류가 발생했어요. 인터넷 연결을 확인 후 다시 시도해주세요.');
      });

    timerRef.current = timers;

    return () => {
      clearTimeout(timeoutId);
      timers.forEach(clearTimeout);
      cancelledRef.current = true;
      abortRef.current?.abort();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retryKey]);

  const cancel = () => {
    cancelledRef.current = true;
    timerRef.current.forEach(clearTimeout);
    abortRef.current?.abort();
    go('s6');
  };

  const retry = () => {
    setApiError('');
    setStepIdx(-1);
    setPct(0);
    setRetryKey(k => k + 1);
  };

  const label = out === 'blog' ? '블로그형' : out === 'slide' ? '슬라이드형' : 'HTML형';

  // ── 크레딧 부족 화면 ──
  if (creditInsufficient) {
    return (
      <div className="gen-shell">
        <div style={{ fontSize: 44, marginBottom: 16 }}>⚡</div>
        <div style={{ fontSize: 17, fontWeight: 700, color: '#7c3aed', marginBottom: 10 }}>크레딧이 부족해요</div>
        <div style={{ fontSize: 13, color: '#666', lineHeight: 1.8, marginBottom: 8, textAlign: 'center' }}>
          현재 잔액 <b style={{ color: '#dc2626' }}>{credits} 크레딧</b>
        </div>
        <div style={{ fontSize: 13, color: '#666', lineHeight: 1.8, marginBottom: 32, textAlign: 'center' }}>
          상세페이지 생성에 <b>{GENERATION_COST} 크레딧</b>이 필요해요
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button className="btn-back" onClick={() => cancel()}>← 이전으로</button>
          <button
            className="btn-next"
            onClick={() => { cancel(); setCreditModalOpen(true); }}
          >
            ⚡ 크레딧 충전하기
          </button>
        </div>
      </div>
    );
  }

  // ── 에러 화면 ──
  if (apiError) {
    return (
      <div className="gen-shell">
        <div style={{ fontSize: 44, marginBottom: 16 }}>⚠️</div>
        <div style={{ fontSize: 17, fontWeight: 700, color: '#dc2626', marginBottom: 10 }}>생성 중 오류가 발생했어요</div>
        <div style={{ fontSize: 13, color: '#666', lineHeight: 1.8, marginBottom: 32, textAlign: 'center', maxWidth: 320 }}>
          {apiError}
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button className="btn-back" onClick={cancel}>← 이전으로</button>
          <button className="btn-next" onClick={retry}>↻ 다시 시도</button>
        </div>
      </div>
    );
  }

  // ── 생성 중 화면 ──
  return (
    <div className="gen-shell">
      <div className="gen-ico">✦</div>
      <div className="gen-title">생성 중이에요</div>
      <div className="gen-sub">
        {cat} · {ch} · {type} · {label}<br />
        카테고리 기획 구조를 적용하고 있어요
      </div>
      <div className="gen-bar-bg">
        <div className="gen-bar" style={{ width: `${pct}%` }} />
      </div>
      <div className="gen-pct">{pct}%</div>
      <div className="gen-steps">
        {GEN_STEPS.map((s, i) => {
          const status = i < stepIdx ? 'done' : i === stepIdx ? 'active' : '';
          return (
            <div key={i} className={`gen-step ${status}`}>
              <div className="gen-dot" />
              {s}
            </div>
          );
        })}
      </div>
      <button className="gen-back" onClick={cancel}>← 정보 수정하기</button>
    </div>
  );
}
