'use client';

import React from 'react';
import { useApp, STEP_MAP } from '@/store/AppContext';

const STEPS = [
  { id: 'ps1',  label: '카테고리' },
  { id: 'ps2',  label: '채널' },
  { id: 'ps3',  label: '타입' },
  { id: 'ps3b', label: '출력형태' },
  { id: 'ps5',  label: '상품정보' },
  { id: 'ps55', label: '레퍼런스' },
  { id: 'ps5b', label: '섹션구조' },
  { id: 'ps6',  label: '이미지' },
  { id: 'ps7',  label: '생성' },
  { id: 'ps8',  label: '결과물' },
];

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
          <React.Fragment key={step.id}>
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
