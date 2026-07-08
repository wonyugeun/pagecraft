'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Menu, Zap, Sparkles, ArrowLeft,
} from 'lucide-react';
import { useApp, Section } from '@/store/AppContext';
import {
  GEN_STEPS, STEP_PCTS, MIN_ANIM_MS,
  UI_STEPS, TOTAL_UI_STEPS, StepCard, StepStatus, EngineSteps,
} from './GeneratingScreen';
import { USE_NEW_ENGINE } from '@/lib/engineFlag';
import { runClientPipeline } from '@/lib/runClientPipeline';
import { calculateGenerationCost } from '@/lib/pricing';
import { consumeResumeIntent, clearActiveJobId } from '@/lib/activeJob';

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

export default function GeneratingMobile() {
  const {
    cat, ch, type, out, secCnt, productName, productExtra,
    referenceAnalysis, captureAnalysis, sectionStructure,
    go, setSections, credits, setCredits, setCreditModalOpen, saveHistory, setGenerationJobKey,
    setOut, setCat, setCh, setType, setProductName, setProductExtra,
    toggleChat, productForm, productVolume, productShapeProfile,
  } = useApp();

  // 데스크탑과 동일 state
  const [stepIdx, setStepIdx] = useState(-1);
  const [pct, setPct] = useState(0);
  const [engineLabel, setEngineLabel] = useState('');
  const [apiError, setApiError] = useState('');
  const [retryKey, setRetryKey] = useState(0);
  const [creditInsufficient, setCreditInsufficient] = useState(false);
  const timerRef = useRef<NodeJS.Timeout[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const cancelledRef = useRef(false);
  const jobKeyRef = useRef<string>('');   // ★멱등키 — 생성 1회당 1개(이중차감 방지)

  const isDev = process.env.NODE_ENV === 'development';

  const creditsRef = useRef(credits);
  useEffect(() => { creditsRef.current = credits; }, [credits]);

  // 데스크탑 useEffect 그대로 복제
  useEffect(() => {
    const generationCost = calculateGenerationCost({ sectionCount: secCnt });   // 1섹션=1크레딧(서버와 동일 함수)
    if (!isDev && creditsRef.current < generationCost) {
      setCreditInsufficient(true);
      return;
    }
    setCreditInsufficient(false);
    // ★멱등키 — 생성 1회 1키. 재시도는 같은 키 유지(서버 선차감 duplicate 멱등), 새 생성은 재마운트로 새 키.
    if (!jobKeyRef.current) jobKeyRef.current = crypto.randomUUID();

    // ── 새 엔진(분할 호출 + 중간상태 저장/재개) ── (플래그 OFF 시 아래 기존 generate 경로 사용)
    if (USE_NEW_ENGINE) {
      cancelledRef.current = false;
      const resume = consumeResumeIntent();
      setPct(8);
      setEngineLabel('전략 분석 중…');
      runClientPipeline(
        { jobKey: jobKeyRef.current, cat: cat ?? undefined, ch: ch ?? undefined, out, depth: '간결', sectionCount: secCnt, sectionStructure: sectionStructure?.length ? sectionStructure : undefined, productName, productExtra, type: type ?? undefined, generateImages: false, productForm, productVolume, productShapeProfile },
        {
          resume,
          isCancelled: () => cancelledRef.current,
          onProgress: ({ pct: p, label }) => { if (!cancelledRef.current) { setPct(p); setEngineLabel(label); } },
          onCredit: (balance) => { if (!cancelledRef.current) setCredits(balance); },   // strategy 선차감 후 헤더 실시간 갱신
        },
      )
        .then(({ sections, jobInput }) => {
          if (cancelledRef.current) return;
          // ★resume 렌더 정합 — ResultScreen은 AppContext(out·ch·cat…)를 읽는데 재개 세션엔 비어 있어
          //   slide가 blog로 뒤바뀌던 문제. job.input을 컨텍스트에 복원(resume일 때만; fresh는 이미 정확).
          if (resume) {
            if (jobInput.out) setOut(jobInput.out);
            if (jobInput.cat) setCat(jobInput.cat);
            if (jobInput.ch) setCh(jobInput.ch);
            if (jobInput.type) setType(jobInput.type);
            if (jobInput.productName) setProductName(jobInput.productName);
            if (jobInput.productExtra) setProductExtra(jobInput.productExtra);
          }
          if (sections.length) {
            setSections(sections);
            setGenerationJobKey(jobInput.jobKey ?? jobKeyRef.current);   // ★이미지·재생성 결제 검증용(P0 2차)
            saveHistory({
              productName: jobInput.productName ?? '',
              cat: jobInput.cat ?? '',
              ch: jobInput.ch ?? '',
              type: jobInput.type ?? '',
              out: jobInput.out ?? '',
              secCnt: jobInput.sectionCount ?? secCnt,
              sections,
              jobKey: jobInput.jobKey ?? jobKeyRef.current,
            });
          }
          setPct(100);
          go('s8');
        })
        .catch(err => {
          if (cancelledRef.current) return;
          console.error('[GeneratingMobile] 새 엔진 오류:', err);
          setApiError(err?.message || '생성 중 오류가 발생했어요. 다시 시도해주세요.');
        });

      return () => { cancelledRef.current = true; };
    }

    cancelledRef.current = false;
    abortRef.current = new AbortController();
    const start = Date.now();
    const timers: NodeJS.Timeout[] = [];
    let timedOut = false;

    GEN_STEPS.forEach((_, i) => {
      const t = setTimeout(() => {
        setStepIdx(i);
        setPct(STEP_PCTS[i]);
      }, i === 0 ? 0 : i * 900);
      timers.push(t);
    });

    // TODO 로컬 임시 600초 — 배포는 Vercel 300초 천장이라 SSE/청크 근본해결 필요
    const TIMEOUT_MS = process.env.NODE_ENV === 'development' ? 600_000 : 280_000;
    const timeoutId = setTimeout(() => {
      timedOut = true;
      abortRef.current?.abort();
    }, TIMEOUT_MS);
    fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cat, ch, type, out, secCnt, productName, productExtra, referenceAnalysis, captureAnalysis, sectionStructure, jobKey: jobKeyRef.current }),
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
          setGenerationJobKey(jobKeyRef.current);   // ★이미지·재생성 결제 검증용(P0 2차)
          saveHistory({
            productName,
            cat: cat ?? '',
            ch: ch ?? '',
            type: type ?? '',
            out: out ?? '',
            secCnt,
            sections: data.sections,
            jobKey: jobKeyRef.current,
          });
        }

        const elapsed = Date.now() - start;
        const wait = Math.max(0, MIN_ANIM_MS - elapsed);
        const done = setTimeout(() => {
          if (!cancelledRef.current) {
              go('s8');
          }
        }, wait);
        timers.push(done);
      })
      .catch(err => {
        clearTimeout(timeoutId);
        if (cancelledRef.current) return;
        if (err.name === 'AbortError') {
          if (timedOut) {
            timers.forEach(clearTimeout);
            setApiError('요청 시간이 초과되었어요. 다시 시도해주세요.');
          }
          return;
        }
        console.error('[GeneratingMobile] API 오류:', err);
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
    if (USE_NEW_ENGINE) clearActiveJobId();
    go('s6');
  };
  const retry = () => {
    setApiError('');
    setStepIdx(-1);
    setPct(0);
    setRetryKey(k => k + 1);
  };

  // 진행률 기반 상태 — 데스크탑 동일
  const currentUIStep = Math.min(Math.floor((pct / 100) * TOTAL_UI_STEPS), TOTAL_UI_STEPS - 1);
  const getStatus = (idx: number): StepStatus => {
    if (pct >= 100) return 'done';
    if (idx < currentUIStep) return 'done';
    if (idx === currentUIStep) return 'active';
    return 'wait';
  };

  // ── 크레딧 부족 화면 ──
  if (creditInsufficient) {
    return (
      <div style={{
        minHeight: '100vh', background: '#FAFAFC',
        fontFamily: 'Pretendard, sans-serif',
        padding: '60px 20px',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 44, marginBottom: 16 }}>⚡</div>
        <div style={{ fontSize: 17, fontWeight: 700, color: '#7c3aed', marginBottom: 10 }}>크레딧이 부족해요</div>
        <div style={{ fontSize: 13, color: '#666', lineHeight: 1.8, marginBottom: 24 }}>
          상세페이지 생성에는 {calculateGenerationCost({ sectionCount: secCnt })} 크레딧이 필요해요.<br />
          현재 보유 크레딧: <b>{credits}</b>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button onClick={() => setCreditModalOpen(true)} style={{
            background: '#6D4CFF', color: '#fff', border: 'none',
            fontSize: 14, fontWeight: 700, padding: '14px 20px',
            borderRadius: 14, cursor: 'pointer', fontFamily: 'inherit',
            boxShadow: '0 8px 20px rgba(109,76,255,0.3)',
          }}>크레딧 충전하기</button>
          <button onClick={() => go('s6')} style={{
            background: '#fff', color: '#111', border: '1.5px solid #ECECF2',
            fontSize: 14, fontWeight: 700, padding: '14px 20px',
            borderRadius: 14, cursor: 'pointer', fontFamily: 'inherit',
          }}>이전 단계로</button>
        </div>
      </div>
    );
  }

  // ── 에러 화면 ──
  if (apiError) {
    return (
      <div style={{
        minHeight: '100vh', background: '#FAFAFC',
        fontFamily: 'Pretendard, sans-serif',
        padding: '60px 20px',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 44, marginBottom: 16 }}>⚠️</div>
        <div style={{ fontSize: 17, fontWeight: 700, color: '#dc2626', marginBottom: 10 }}>생성에 실패했어요</div>
        <div style={{ fontSize: 13, color: '#666', lineHeight: 1.8, marginBottom: 24 }}>{apiError}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button onClick={retry} style={{
            background: '#6D4CFF', color: '#fff', border: 'none',
            fontSize: 14, fontWeight: 700, padding: '14px 20px',
            borderRadius: 14, cursor: 'pointer', fontFamily: 'inherit',
            boxShadow: '0 8px 20px rgba(109,76,255,0.3)',
          }}>↻ 다시 시도</button>
          <button onClick={cancel} style={{
            background: '#fff', color: '#111', border: '1.5px solid #ECECF2',
            fontSize: 14, fontWeight: 700, padding: '14px 20px',
            borderRadius: 14, cursor: 'pointer', fontFamily: 'inherit',
          }}>이전 단계로</button>
        </div>
      </div>
    );
  }

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
          <Menu size={24} color="#111" />
        </div>
      </header>

      {/* 2) 진행 단계 1~10 */}
      <section style={{ padding: '8px 20px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'nowrap', overflowX: 'auto' }}>
          {STEPS.map((s, i) => {
            const active = s.num === 9;
            const done = s.num < 9;
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

      {/* 3) 큰 보라 원 + ✦ */}
      <section style={{ padding: '32px 20px 0', textAlign: 'center' }}>
        <div style={{
          width: 100, height: 100, borderRadius: '50%',
          background: '#F4F0FF',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Sparkles size={44} color="#6D4CFF" fill="#6D4CFF" />
        </div>
      </section>

      {/* 4) 타이틀 + 안내 */}
      <section style={{ padding: '20px 20px 0', textAlign: 'center' }}>
        <h1 style={{
          margin: 0, fontSize: 22, fontWeight: 800, color: '#111',
          letterSpacing: '-0.03em',
        }}>
          상세페이지를 생성하고 있어요 ✨
        </h1>
        <p style={{ margin: '12px 0 0', fontSize: 13, color: '#666', lineHeight: 1.7 }}>
          선택하신 정보와 이미지를 바탕으로<br />
          AI가 최적의 상세페이지를 만들고 있어요.<br />
          잠시만 기다려주세요!
        </p>
        {USE_NEW_ENGINE && engineLabel && (
          <div style={{ marginTop: 12, fontSize: 14, fontWeight: 800, color: '#6D4CFF' }}>{engineLabel}</div>
        )}
      </section>

      {/* 5) 진행률 바 */}
      <section style={{ padding: '24px 20px 0' }}>
        <div style={{ position: 'relative' }}>
          <div style={{
            width: '100%', height: 8,
            background: '#E5E7EB', borderRadius: 999,
            overflow: 'hidden',
          }}>
            <div style={{
              width: `${pct}%`, height: '100%',
              background: '#6D4CFF',
              borderRadius: 999,
              transition: 'width .4s ease',
            }} />
          </div>
          <span style={{
            position: 'absolute', right: 0, top: 14,
            fontSize: 12, fontWeight: 700, color: '#6D4CFF',
          }}>{pct}%</span>
        </div>
      </section>

      {/* 6) 진행 카드 — 새 엔진은 실제 4스테이지, 기존 generate는 7단계 시안 */}
      <section style={{ padding: '36px 20px 0' }}>
        {USE_NEW_ENGINE ? (
          <EngineSteps pct={pct} label={engineLabel} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {UI_STEPS.map((step, idx) => (
              <StepCard key={idx} step={step} status={getStatus(idx)} />
            ))}
          </div>
        )}
      </section>

      {/* 7) 안내 박스 */}
      <section style={{ padding: '20px 20px 0' }}>
        <div style={{
          background: '#F7F6FB', borderRadius: 14,
          padding: '14px',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{ fontSize: 22 }}>💡</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: '#111' }}>
              더 좋은 결과를 위해 잠시 기다려주세요!
            </div>
            <div style={{ marginTop: 4, fontSize: 11, color: '#666', lineHeight: 1.5 }}>
              AI가 고객의 시선을 사로잡는 최고의<br />상세페이지를 만들어 드릴게요.
            </div>
          </div>
          <button onClick={cancel} style={{
            background: '#fff', border: '1.5px solid #ECECF2',
            color: '#111',
            fontSize: 12, fontWeight: 700,
            borderRadius: 10, padding: '10px 14px',
            cursor: 'pointer', fontFamily: 'inherit',
            flexShrink: 0,
          }}>
            작업 취소
          </button>
        </div>
      </section>

      {/* 8) 하단 버튼 */}
      <nav style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: '#fff', borderTop: '1px solid #ECECF2',
        padding: '14px 20px',
        display: 'flex', gap: 10,
        zIndex: 100,
      }}>
        <button onClick={cancel} style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          background: '#fff', border: '1.5px solid #ECECF2',
          color: '#111',
          fontSize: 14, fontWeight: 700,
          borderRadius: 14, padding: '14px 22px',
          cursor: 'pointer', fontFamily: 'inherit',
          flexShrink: 0,
        }}>
          <ArrowLeft size={16} /> 이전
        </button>
        <button
          disabled={pct < 100}
          onClick={() => go('s8')}
          style={{
            flex: 1,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            background: pct < 100 ? '#A8A8B6' : '#6D4CFF',
            color: '#fff',
            border: 'none',
            fontSize: 15, fontWeight: 700,
            borderRadius: 14, padding: '14px',
            cursor: pct < 100 ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
            boxShadow: pct < 100 ? 'none' : '0 8px 20px rgba(109,76,255,0.3)',
          }}
        >
          결과물 미리보기 ›
        </button>
      </nav>

    </div>
  );
}
