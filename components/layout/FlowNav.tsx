'use client';

import type { ReactNode } from 'react';

/**
 * 플로우 공용 하단 네비(2026-07-27 폴리시 스프린트) — 이전/다음 버튼 규격을 하나로.
 * 규칙: 이전 = "← 이전" 고스트(좌) · 다음 = 보라 필 버튼(우) · 가운데 힌트(선택).
 * onNext 없으면(클릭 즉시 진행 화면) 이전 버튼만 렌더.
 */
export default function FlowNav({ onBack, onNext, nextLabel = '다음 단계로', nextDisabled, hint }: {
  onBack: () => void;
  onNext?: () => void;
  nextLabel?: ReactNode;
  nextDisabled?: boolean;
  hint?: ReactNode;
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      paddingTop: 24, marginTop: 8, borderTop: '1px solid #EBEBEB', gap: 12,
    }}>
      <button
        onClick={onBack}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: 'none', border: 'none', padding: '8px 10px',
          fontSize: 13.5, fontWeight: 600, color: '#9CA3AF',
          cursor: 'pointer', fontFamily: 'var(--f)', transition: 'color .15s',
        }}
        onMouseEnter={e => (e.currentTarget.style.color = '#6D4CFF')}
        onMouseLeave={e => (e.currentTarget.style.color = '#9CA3AF')}
      >
        ← 이전
      </button>
      {hint && <span style={{ fontSize: 12, color: '#C4C4C4', textAlign: 'center' }}>{hint}</span>}
      {onNext ? (
        <button
          disabled={nextDisabled}
          onClick={onNext}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '12px 26px',
            background: nextDisabled ? '#EDE8FF' : '#6D4CFF',
            color: nextDisabled ? '#B0A0E8' : '#fff',
            border: 'none', borderRadius: 10,
            fontSize: 14, fontWeight: 700, fontFamily: 'var(--f)',
            cursor: nextDisabled ? 'not-allowed' : 'pointer',
            letterSpacing: '-0.01em',
            boxShadow: nextDisabled ? 'none' : '0 4px 14px rgba(109,76,255,0.30)',
            transition: 'all 150ms ease',
          }}
        >
          {nextLabel} →
        </button>
      ) : <span />}
    </div>
  );
}
