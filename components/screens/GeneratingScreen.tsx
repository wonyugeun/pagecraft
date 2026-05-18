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

// 애니메이션 최소 대기 시간 (마지막 스텝 완료 + 여유)
const MIN_ANIM_MS = (GEN_STEPS.length - 1) * 900 + 600;

export default function GeneratingScreen() {
  const { cat, ch, type, out, secCnt, productName, productExtra, referenceAnalysis, go, setSections } = useApp();
  const [stepIdx, setStepIdx] = useState(-1);
  const [pct, setPct]         = useState(0);
  const timerRef  = useRef<NodeJS.Timeout[]>([]);
  const abortRef  = useRef<AbortController | null>(null);
  const cancelledRef = useRef(false); // 수동 취소 여부

  useEffect(() => {
    cancelledRef.current = false;
    abortRef.current = new AbortController();
    const start  = Date.now();
    const timers: NodeJS.Timeout[] = [];

    // ── 애니메이션 타이머 (API와 독립적으로 실행) ──
    GEN_STEPS.forEach((_, i) => {
      const t = setTimeout(() => {
        setStepIdx(i);
        setPct(STEP_PCTS[i]);
      }, i === 0 ? 0 : i * 900);
      timers.push(t);
    });

    // ── API 호출 ──
    fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cat, ch, type, out, secCnt, productName, productExtra, referenceAnalysis }),
      signal: abortRef.current.signal,
    })
      .then(r => r.json())
      .then((data: { sections?: Section[] }) => {
        if (cancelledRef.current) return;

        // sections 저장 (go 이전에 반드시 실행)
        if (data.sections?.length) {
          setSections(data.sections);
          console.log(`[GeneratingScreen] setSections: ${data.sections.length}개 저장`);
        }

        // 애니메이션 최소 시간 보장 후 navigate
        const elapsed = Date.now() - start;
        const wait    = Math.max(0, MIN_ANIM_MS - elapsed);
        const done    = setTimeout(() => {
          if (!cancelledRef.current) go('s7');
        }, wait);
        timers.push(done);
      })
      .catch(err => {
        if (err.name === 'AbortError' || cancelledRef.current) return;
        // API 실패 시에도 결과 화면으로 이동 (DEFAULT_SECTIONS로 표시)
        console.error('[GeneratingScreen] API 오류:', err);
        const elapsed = Date.now() - start;
        const wait    = Math.max(0, MIN_ANIM_MS - elapsed);
        const done    = setTimeout(() => {
          if (!cancelledRef.current) go('s7');
        }, wait);
        timers.push(done);
      });

    timerRef.current = timers;

    return () => {
      timers.forEach(clearTimeout);
      cancelledRef.current = true;
      abortRef.current?.abort();
    };
  }, []);

  const cancel = () => {
    cancelledRef.current = true;
    timerRef.current.forEach(clearTimeout);
    abortRef.current?.abort();
    go('s5');
  };

  const label = out === 'blog' ? '블로그형' : out === 'slide' ? '슬라이드형' : 'HTML형';

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
