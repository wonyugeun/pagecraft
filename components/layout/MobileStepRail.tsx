'use client';

import { FLOW_STEPS, STEP_MAP } from '@/store/AppContext';

/* ★모바일 진행 레일(2026-08-04) — 화면 9개가 각자 갖고 있던 9단계 배열을 하나로 합쳤다.
 *  단계 이름·개수는 FLOW_STEPS가 유일한 소스다(데스크톱 진행바와 같은 소스).
 *  ⚠️화면 파일에 STEPS 배열을 다시 만들지 말 것 — 흐름이 바뀔 때마다 그 화면만 옛 단계에 남는다. */
export default function MobileStepRail({ screen }: { screen: string }) {
  const current = STEP_MAP[screen] ?? 0;
  if (!current) return null;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'nowrap', overflowX: 'auto' }}>
      {FLOW_STEPS.map((s, i) => {
        const num = i + 1;
        const active = num === current;
        const done = num < current;
        return (
          <div key={s.screen} style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
            <div style={{
              width: 24, height: 24, borderRadius: '50%',
              background: active ? '#6D4CFF' : done ? '#DDD6FE' : '#fff',
              border: active || done ? 'none' : '1.5px solid #ECECF2',
              color: active ? '#fff' : done ? '#6D4CFF' : '#999',
              fontSize: 11, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>{num}</div>
            <span style={{
              fontSize: 11, color: active ? '#111' : done ? '#6D4CFF' : '#999',
              fontWeight: active ? 700 : 500, whiteSpace: 'nowrap',
            }}>{s.label}</span>
            {i < FLOW_STEPS.length - 1 && (
              <div style={{ width: 8, height: 1, background: '#ECECF2' }} />
            )}
          </div>
        );
      })}
    </div>
  );
}
