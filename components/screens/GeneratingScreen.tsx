'use client';

import { useEffect, useRef, useState } from 'react';
import { useApp, Section } from '@/store/AppContext';
import GeneratingMobile from './GeneratingMobile';
import { useIsMobile, MOBILE_BREAKPOINT } from '@/hooks/useIsMobile';
import { USE_NEW_ENGINE } from '@/lib/engineFlag';
import { runClientPipeline } from '@/lib/runClientPipeline';
import { calculateGenerationCost } from '@/lib/pricing';
import { consumeResumeIntent, clearActiveJobId } from '@/lib/activeJob';
import {
  Sparkles, Check, Loader2, Clock, Lightbulb,
  FolderOpen, Users, Target, Layers, Palette, LayoutGrid, CheckCircle,
} from 'lucide-react';

// ── 기존 진행 로직(API/타이머)용 6단계 ──
export const GEN_STEPS = [
  '레퍼런스 URL 구조 분석 중...',
  '카테고리 기획 IP 적용 중...',
  '섹션별 카피 생성 중...',
  '이미지 배치 최적화 중...',
  '출력 형태 조립 중...',
  '최종 검수...',
];
export const STEP_PCTS = [12, 28, 50, 70, 87, 100];
export const MIN_ANIM_MS = (GEN_STEPS.length - 1) * 900 + 600;
// ★가격은 lib/pricing.ts(1섹션=1크레딧)로 이전 — 컴포넌트 안에서 calculateGenerationCost({sectionCount: secCnt})로 계산

// ── UI 표시용 시안 7단계 ──
export interface UIStep {
  title: string;
  icon: typeof FolderOpen;
  desc: string;
  activeDesc: string;
  waitDesc: string;
  time: string;
}

export const UI_STEPS: UIStep[] = [
  { title: '상품 정보 분석', icon: FolderOpen, desc: '상품명, 카테고리, 핵심 키워드를 분석했어요.', activeDesc: '상품명, 카테고리, 핵심 키워드를 분석하고 있어요.', waitDesc: '상품 정보를 분석할 예정이에요.', time: '00:03' },
  { title: '타겟 고객 분석', icon: Users, desc: '고객 관심사와 니즈를 파악했어요.', activeDesc: '고객 관심사와 니즈를 파악하고 있어요.', waitDesc: '타겟 고객을 분석할 예정이에요.', time: '00:02' },
  { title: '핵심 메시지 도출', icon: Target, desc: '제품의 강점과 차별점을 정리했어요.', activeDesc: '제품의 강점과 차별점을 정리하고 있어요.', waitDesc: '핵심 메시지를 도출할 예정이에요.', time: '00:02' },
  { title: '섹션 구조 설계', icon: Layers, desc: '최적의 흐름과 섹션 구성을 설계했어요.', activeDesc: '최적의 흐름과 섹션 구성을 설계하고 있어요.', waitDesc: '섹션 구조를 설계할 예정이에요.', time: '00:04' },
  { title: '디자인 레이아웃 생성', icon: Palette, desc: '브랜드 톤앤매너에 맞는 레이아웃을 만들었어요.', activeDesc: '브랜드 톤앤매너에 맞는 레이아웃을 만들고 있어요.', waitDesc: '디자인 레이아웃을 생성할 예정이에요.', time: '00:05' },
  { title: '콘텐츠 및 이미지 배치', icon: LayoutGrid, desc: '텍스트 작성과 이미지 배치를 완료했어요.', activeDesc: '텍스트 작성과 이미지 배치를 진행하고 있어요.', waitDesc: '콘텐츠와 이미지를 배치할 예정이에요.', time: '00:06' },
  { title: '최종 검토 및 최적화', icon: CheckCircle, desc: '모든 요소를 검토하고 최종 최적화했어요.', activeDesc: '모든 요소를 검토하고 최종 최적화하고 있어요.', waitDesc: '최종 검토 및 최적화할 예정이에요.', time: '00:03' },
];
export const TOTAL_UI_STEPS = UI_STEPS.length;

export type StepStatus = 'done' | 'active' | 'wait';

export function StepCard({ step, status }: { step: UIStep; status: StepStatus }) {
  if (status === 'done') {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 16,
        borderRadius: 16, background: '#F0FAF4', border: '1px solid #D9F0E3', padding: 16,
      }}>
        <div style={{
          width: 28, height: 28, borderRadius: '50%', background: '#22C55E',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <Check size={16} color="#fff" strokeWidth={3} />
        </div>
        <div style={{
          width: 44, height: 44, borderRadius: '50%', background: '#E0F5E9',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <step.icon size={20} color="#22C55E" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#15803D' }}>{step.title} 완료</div>
          <div style={{ fontSize: 13, color: '#666', marginTop: 2 }}>{step.desc}</div>
        </div>
        <span style={{ fontSize: 13, color: '#999', flexShrink: 0 }}>{step.time}</span>
      </div>
    );
  }

  if (status === 'active') {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 16,
        borderRadius: 16, background: '#F4F0FF', border: '1px solid #D8D2FF', padding: 16,
      }}>
        <div style={{
          width: 28, height: 28, borderRadius: '50%',
          border: '2px solid #6D4CFF', background: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <Check size={14} color="#6D4CFF" strokeWidth={3} />
        </div>
        <div style={{
          width: 44, height: 44, borderRadius: '50%', background: '#E8E2FF',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <Loader2 size={20} color="#6D4CFF" style={{ animation: 'spin 0.8s linear infinite' }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#6D4CFF' }}>{step.title} 중</div>
          <div style={{ fontSize: 13, color: '#666', marginTop: 2 }}>{step.activeDesc}</div>
        </div>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#6D4CFF', flexShrink: 0 }}>진행 중</span>
      </div>
    );
  }

  // wait
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 16,
      borderRadius: 16, background: '#fff', border: '1px solid #ECECF2', padding: 16,
    }}>
      <div style={{
        width: 28, height: 28, borderRadius: '50%', background: '#ECECF2', flexShrink: 0,
      }} />
      <div style={{
        width: 44, height: 44, borderRadius: '50%', background: '#F4F4F8',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <Clock size={20} color="#999" />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#999' }}>{step.title} 중</div>
        <div style={{ fontSize: 13, color: '#BBB', marginTop: 2 }}>{step.waitDesc}</div>
      </div>
      <span style={{ fontSize: 13, color: '#BBB', flexShrink: 0 }}>대기 중</span>
    </div>
  );
}

// ── 새 엔진(분할 호출) 전용 진행표시 — 실제 4스테이지 기준, 가짜 고정시간 없음 ──
const ENGINE_STAGES = [
  { title: '전략 분석',          icon: Target,     start: 0,  done: 22 },
  { title: '구조 설계',          icon: Layers,     start: 22, done: 35 },
  { title: '카피 생성',          icon: LayoutGrid, start: 35, done: 92 },
  { title: '이미지 브리프 생성', icon: CheckCircle, start: 92, done: 100 },
];

export function EngineSteps({ pct, label }: { pct: number; label: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {ENGINE_STAGES.map((s, i) => {
        const status: StepStatus = pct >= s.done ? 'done' : pct >= s.start ? 'active' : 'wait';
        const Icon = s.icon;
        const isCopy = s.title === '카피 생성';
        const bg = status === 'done' ? '#F0FAF4' : status === 'active' ? '#F4F0FF' : '#fff';
        const bd = status === 'done' ? '#D9F0E3' : status === 'active' ? '#D8D2FF' : '#ECECF2';
        const titleColor = status === 'done' ? '#15803D' : status === 'active' ? '#6D4CFF' : '#999';
        const desc = status === 'done'
          ? `${s.title} 완료`
          : status === 'active'
            ? (isCopy && label ? label : `${s.title} 중`)
            : '대기 중';
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 16, borderRadius: 16, background: bg, border: `1px solid ${bd}`, padding: 16 }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: status === 'done' ? '#E0F5E9' : status === 'active' ? '#E8E2FF' : '#F4F4F8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {status === 'done'
                ? <Check size={20} color="#22C55E" strokeWidth={3} />
                : status === 'active'
                  ? <Loader2 size={20} color="#6D4CFF" style={{ animation: 'spin 0.8s linear infinite' }} />
                  : <Clock size={20} color="#999" />}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: titleColor }}>{s.title}</div>
              <div style={{ fontSize: 13, color: status === 'wait' ? '#BBB' : '#666', marginTop: 2 }}>{desc}</div>
            </div>
            <Icon size={20} color={status === 'active' ? '#6D4CFF' : status === 'done' ? '#22C55E' : '#BBB'} style={{ flexShrink: 0 }} />
          </div>
        );
      })}
    </div>
  );
}

export default function GeneratingScreen() {
  const isMobile = useIsMobile();
  const { cat, ch, type, out, secCnt, productName, productExtra, referenceAnalysis, captureAnalysis, sectionStructure, go, setSections, credits, creditsLoaded, setCredits, setCreditModalOpen, saveHistory, setGenerationJobKey, setOut, setCat, setCh, setType, setProductName, setProductExtra, productForm, productVolume, productShapeProfile } = useApp();
  const [stepIdx,          setStepIdx]          = useState(-1);
  const [pct,              setPct]              = useState(0);
  const [engineLabel,      setEngineLabel]      = useState('');
  const [apiError,         setApiError]         = useState('');
  const [refunded,         setRefunded]         = useState(false);   // ★자동 환불 발생 여부 — 에러 화면 문구 조건부
  const [retryKey,         setRetryKey]         = useState(0);
  const [creditInsufficient, setCreditInsufficient] = useState(false);
  const timerRef    = useRef<NodeJS.Timeout[]>([]);
  const abortRef    = useRef<AbortController | null>(null);
  const cancelledRef = useRef(false);
  const jobKeyRef   = useRef<string>('');   // ★멱등키 — 생성 1회당 1개(이중차감 방지)
  const refundedRef = useRef(false);        // ★이 jobKey가 환불됐는가 — 환불된 키는 서버가 미결제 취급하므로 재시도 시 새 키 필요

  const isDev = process.env.NODE_ENV === 'development';

  // Use a ref so the effect always reads the latest credits without re-triggering on credit changes
  const creditsRef = useRef(credits);
  useEffect(() => { creditsRef.current = credits; }, [credits]);
  const creditsLoadedRef = useRef(creditsLoaded);
  useEffect(() => { creditsLoadedRef.current = creditsLoaded; }, [creditsLoaded]);

  useEffect(() => {
    // ★모바일 이중 실행 차단(P0-1) — useIsMobile은 첫 렌더에 false라 이 effect가 모바일 분기
    //   재렌더보다 먼저 발화한다. 뷰포트를 직접 확인해 모바일이면 여기서는 시작하지 않는다
    //   (모바일은 GeneratingMobile이 유일한 시작점 — 파이프라인·멱등키·차감·히스토리 1회 보장).
    if (window.innerWidth < MOBILE_BREAKPOINT) return;
    // ★재개 의도는 크레딧 체크보다 먼저 소비 — 재개는 이미 선차감된 job(같은 jobKey=서버 duplicate)이라
    //   크레딧 체크 대상이 아니다(2026-07-18: 새로고침 재개가 로드 전 기본값 30<32로 "부족" 오탐하던 사고).
    const resume = USE_NEW_ENGINE ? consumeResumeIntent() : false;
    const generationCost = calculateGenerationCost({ sectionCount: secCnt });   // 1섹션=1크레딧(서버와 동일 함수)
    // ★클라 체크는 UX용 사전 안내일 뿐(실집행은 서버 선차감) — 서버 잔액 로드 전(creditsLoaded=false)에는
    //   기본값으로 오탐하지 않도록 판정을 건너뛰고 진행(부족이면 서버가 402로 막음).
    if (!isDev && !resume && creditsLoadedRef.current && creditsRef.current < generationCost) {
      setCreditInsufficient(true);
      return;
    }
    setCreditInsufficient(false);
    // ★멱등키 — 생성 1회 1키. 재시도(retryKey)는 같은 키 유지(서버 선차감이 duplicate로 멱등),
    //   새 상품/새 설정 생성은 화면 재마운트로 ref가 초기화돼 자연히 새 키.
    if (!jobKeyRef.current) jobKeyRef.current = crypto.randomUUID();

    // ── 새 엔진(분할 호출 + 중간상태 저장/재개) ── (플래그 OFF 시 아래 기존 generate 경로 사용)
    if (USE_NEW_ENGINE) {
      cancelledRef.current = false;
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
          //   slide가 blog로 뒤바뀌던 문제. job.input을 컨텍스트에 복원해 job 기준으로 렌더되게 한다.
          //   (fresh 생성은 컨텍스트가 이미 정확 → resume일 때만 복원. productImages는 job에 없어 세션 스냅샷에 의존)
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
          // ★사후차감 제거(resume 이중과금 수정) — 차감은 서버 선차감(strategy/generate의 deductCreditsAtomic)이 유일 소스.
          setPct(100);
          go('s8');
        })
        .catch(err => {
          if (cancelledRef.current) return;
          console.error('[GeneratingScreen] 새 엔진 오류:', err);
          setApiError(err?.message || '생성 중 오류가 발생했어요. 다시 시도해주세요.');
          // ★실패 job 마커 정리 — 안 지우면 새로고침마다 자동 재개(s7 강제 이동) 무한 루프
          //   (2026-07-18: 실패 job이 남아 모든 화면 새로고침이 생성 화면으로 튀던 사고)
          clearActiveJobId();
          // ★산출물 0장 자동 환불 — 선차감 후 실패 시 크레딧 증발 방지(서버가 이미지 0장을 원장으로 재검증).
          //   이미지가 나간 부분 실패는 서버가 not_eligible로 거절 — 호출 자체는 언제나 안전.
          if (jobKeyRef.current) {
            fetch('/api/credits/refund-failed', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ jobKey: jobKeyRef.current }),
            }).then(r => r.json()).then(d => {
              if (d?.status === 'refunded' && typeof d.balance === 'number') {
                setCredits(d.balance);
                refundedRef.current = true;   // 환불된 키는 죽은 키 — retry가 새 키를 만들게 표시
                setRefunded(true);
              }
            }).catch(() => {});
          }
        });

      return () => { cancelledRef.current = true; };
    }

    cancelledRef.current = false;
    abortRef.current = new AbortController();
    const start  = Date.now();
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
        const wait    = Math.max(0, MIN_ANIM_MS - elapsed);
        const done    = setTimeout(() => {
          if (!cancelledRef.current) {
            // ★사후차감 제거(resume 이중과금 수정) — 차감은 서버 선차감(strategy/generate의 deductCreditsAtomic)이 유일 소스.
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
    // ★실수 클릭 방어 — 진행 중 취소는 카피 생성 시간(수 분)이 날아감. 크레딧은 자동 환불되지만 시간은 못 돌려줌.
    if (pct > 0 && pct < 100 && !window.confirm('생성을 취소할까요? 사용한 크레딧은 자동 환불되지만, 진행된 작업은 사라져요.')) return;
    cancelledRef.current = true;
    timerRef.current.forEach(clearTimeout);
    abortRef.current?.abort();
    if (USE_NEW_ENGINE) clearActiveJobId();
    // ★취소 = 산출물 0장 이탈 — 선차감 크레딧 자동 환불 시도(이미지가 나갔으면 서버가 거절)
    if (jobKeyRef.current) {
      fetch('/api/credits/refund-failed', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobKey: jobKeyRef.current }),
      }).then(r => r.json()).then(d => {
        if (d?.status === 'refunded' && typeof d.balance === 'number') setCredits(d.balance);
      }).catch(() => {});
    }
    go('s6');
  };

  const retry = () => {
    // ★환불된 jobKey는 서버가 미결제 취급(402) — 같은 키 재시도는 영구 실패하므로 새 키로 재차감.
    //   환불이 안 된 실패(네트워크 순단 등)는 기존대로 같은 키 = 무료 재시도(strategy duplicate).
    if (refundedRef.current) {
      jobKeyRef.current = '';
      refundedRef.current = false;
    }
    setRefunded(false);
    setApiError('');
    setStepIdx(-1);
    setPct(0);
    setRetryKey(k => k + 1);
  };

  // 진행률(pct) 기반으로 시안 7단계 상태 판정
  const currentUIStep = Math.min(Math.floor((pct / 100) * TOTAL_UI_STEPS), TOTAL_UI_STEPS - 1);
  const getStatus = (idx: number): StepStatus => {
    if (pct >= 100) return 'done';
    if (idx < currentUIStep) return 'done';
    if (idx === currentUIStep) return 'active';
    return 'wait';
  };

  // 모바일 분기 — 모든 훅 호출 후
  if (isMobile) return <GeneratingMobile />;

  // ── 크레딧 부족 화면 ── (기존 분기 유지)
  if (creditInsufficient) {
    return (
      <div className="gen-shell">
        <div style={{ fontSize: 44, marginBottom: 16 }}>⚡</div>
        <div style={{ fontSize: 17, fontWeight: 700, color: '#6D4CFF', marginBottom: 10 }}>크레딧이 부족해요</div>
        <div style={{ fontSize: 13, color: '#666', lineHeight: 1.8, marginBottom: 8, textAlign: 'center' }}>
          현재 잔액 <b style={{ color: '#dc2626' }}>{credits} 크레딧</b>
        </div>
        <div style={{ fontSize: 13, color: '#666', lineHeight: 1.8, marginBottom: 32, textAlign: 'center' }}>
          상세페이지 생성에 <b>{calculateGenerationCost({ sectionCount: secCnt })} 크레딧</b>이 필요해요
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button className="btn-back" onClick={() => cancel()}>← 이전으로</button>
          <button
            className="btn-next"
            onClick={() => { cancel(); setCreditModalOpen(true); }}
          >
            ⚡ 크레딧 안내 보기
          </button>
        </div>
      </div>
    );
  }

  // ── 에러 화면 ── (기존 분기 유지)
  if (apiError) {
    return (
      <div className="gen-shell">
        <div style={{ fontSize: 44, marginBottom: 16 }}>⚠️</div>
        <div style={{ fontSize: 17, fontWeight: 700, color: '#dc2626', marginBottom: 10 }}>생성 중 오류가 발생했어요</div>
        <div style={{ fontSize: 13, color: '#666', lineHeight: 1.8, marginBottom: 32, textAlign: 'center', maxWidth: 320 }}>
          {apiError}
        </div>
        <div style={{ fontSize: 12.5, color: '#16a34a', fontWeight: 600, marginBottom: 16 }}>
          {refunded ? '사용한 크레딧은 자동 환불됐어요 — 다시 시도하면 새로 차감돼요' : '추가 차감 없이 다시 시도할 수 있어요'}
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button className="btn-back" onClick={cancel}>← 이전으로</button>
          <button className="btn-next" onClick={retry}>↻ 다시 시도</button>
        </div>
      </div>
    );
  }

  // ── 생성 중 화면 (시안 기준) ──
  return (
    <div style={{
      maxWidth: 820, margin: '0 auto', padding: '48px 40px 100px', fontFamily: 'var(--f)',
    }}>
      {/* 상단 아이콘 + 타이틀 */}
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: 32,
      }}>
        <div style={{
          width: 120, height: 120, borderRadius: '50%', background: '#F4F0FF',
          display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24,
        }}>
          <Sparkles size={48} color="#6D4CFF" />
        </div>
        <h1 style={{
          fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em', color: '#111',
          display: 'flex', alignItems: 'center', gap: 8, lineHeight: 1.3,
        }}>
          상세페이지를 생성하고 있어요
          <Sparkles size={22} color="#6D4CFF" />
        </h1>
        <p style={{
          fontSize: 15, color: '#666', marginTop: 12, lineHeight: 1.7,
        }}>
          선택하신 정보와 이미지를 바탕으로 AI가 최적의 상세페이지를 만들고 있어요.<br />
          잠시만 기다려주세요!
        </p>
        {USE_NEW_ENGINE && engineLabel && (
          <div style={{ marginTop: 14, fontSize: 15, fontWeight: 800, color: '#6D4CFF' }}>{engineLabel}</div>
        )}
      </div>

      {/* 진행바 + 퍼센트 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <div style={{
          flex: 1, height: 10, borderRadius: 999, background: '#ECECF2', overflow: 'hidden',
        }}>
          <div style={{
            height: '100%', background: '#6D4CFF', borderRadius: 999,
            width: `${pct}%`, transition: 'width .5s ease',
          }} />
        </div>
        <span style={{
          fontSize: 14, fontWeight: 700, color: '#666', width: 44, textAlign: 'right',
        }}>{pct}%</span>
      </div>

      {/* 단계 카드 리스트 — 새 엔진은 실제 4스테이지, 기존 generate는 7단계 시안 */}
      {USE_NEW_ENGINE ? (
        <EngineSteps pct={pct} label={engineLabel} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {UI_STEPS.map((step, idx) => (
            <StepCard key={idx} step={step} status={getStatus(idx)} />
          ))}
        </div>
      )}

      {/* 하단 안내 + 작업 취소 */}
      <div style={{
        marginTop: 24, borderRadius: 20, background: '#F4F0FF', padding: 20,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
          <Lightbulb size={22} color="#FBBF24" style={{ flexShrink: 0 }} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#111' }}>카피 완성까지 약 4~5분 걸려요</div>
            <div style={{ fontSize: 13, color: '#666', marginTop: 4, lineHeight: 1.6 }}>
              완료되면 결과 화면으로 이동하고, 이미지는 거기서 섹션별로 이어서 생성돼요. 새로고침해도 진행 상황은 유지됩니다.
            </div>
          </div>
        </div>
        <button
          onClick={cancel}
          style={{
            height: 44, borderRadius: 14, border: '1px solid #ECECF2', background: '#fff',
            padding: '0 20px', fontSize: 14, fontWeight: 700, color: '#666',
            whiteSpace: 'nowrap', cursor: 'pointer', flexShrink: 0, fontFamily: 'var(--f)',
          }}
        >
          작업 취소
        </button>
      </div>
    </div>
  );
}
