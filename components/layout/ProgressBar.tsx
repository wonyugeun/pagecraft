'use client';

import React from 'react';
import { useApp, STEP_MAP, FLOW_STEPS } from '@/store/AppContext';

// ★래퍼런스 독립 단계 폐지(2026-07-22) — 래퍼런스형(타입의 한 갈래)일 때만 s5-5를 거치며, 진행바에선 타입에 묶임.
// 단계 목록은 FLOW_STEPS가 유일한 소스(2026-08-04) — 모바일 레일도 같은 것을 본다.
const STEPS = FLOW_STEPS;

function stepStatus(idx: number, current: number) {
  if (idx + 1 < current) return 'done';
  if (idx + 1 === current) return 'active';
  return 'idle';
}

export default function ProgressBar() {
  const { screen } = useApp();
  const current = STEP_MAP[screen] ?? 0;

  if (!current) return null;

  return (
    <div className="prog">
      <div className="prog-inner">
        {STEPS.map((step, i) => (
          <React.Fragment key={step.screen}>
            <div className={`ps ${stepStatus(i, current)}`}>
              <div className="ps-n">{i + 1}</div>
              <div className="ps-l">{step.label}</div>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`pl ${i + 1 < current ? 'done' : ''}`} />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
