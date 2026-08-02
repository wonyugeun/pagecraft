'use client';

import type { ReactNode } from 'react';
import { TOTAL_STEPS } from '@/store/AppContext';

/**
 * 플로우 공용 헤더(2026-07-27 폴리시 스프린트) — 모든 생성 단계 화면의 타이틀 규격을 하나로.
 * 규칙: 가운데 정렬 · STEP 필 · 28px/800 타이틀 · 14.5px 서브 1~2줄.
 * 화면별 커스텀 헤더(정렬·배지 유무 제각각)를 이걸로 대체한다 — 새 화면도 반드시 이걸 사용.
 */
export default function StepHeader({ step, label, title, sub, marginBottom = 36 }: {
  step: number;
  label: string;
  title: ReactNode;
  sub?: ReactNode;
  marginBottom?: number;
}) {
  return (
    <div style={{ textAlign: 'center', marginBottom }}>
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 7,
        background: '#fff', border: '1px solid #E8E3FA', borderRadius: 999,
        padding: '6px 14px', marginBottom: 16,
        boxShadow: '0 2px 10px rgba(109,76,255,0.07)',
        fontSize: 12, fontWeight: 700, color: '#6D4CFF', letterSpacing: '0.05em',
      }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#6D4CFF' }} />
        {/* ★총 단계는 하드코딩하지 않는다 — 플로우가 9→6으로 줄었을 때 여기만 남아 'STEP 1/9'를 보여줬다 */}
        STEP {step}/{TOTAL_STEPS} · {label}
      </div>
      <h1 style={{
        fontSize: 28, fontWeight: 800, color: '#191F28',
        letterSpacing: '-0.035em', lineHeight: 1.3, marginBottom: 10,
        wordBreak: 'keep-all',
      }}>
        {title}
      </h1>
      {sub && (
        <p style={{ fontSize: 14.5, color: '#8B95A1', lineHeight: 1.7, margin: 0, wordBreak: 'keep-all' }}>
          {sub}
        </p>
      )}
    </div>
  );
}
