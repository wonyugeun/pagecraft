'use client';

import { useEffect, useState } from 'react';
import { getUnseenUpdate, markUpdateSeen, type UpdateEntry } from '@/lib/updatesFeed';

/**
 * 새 업데이트 팝업 — 대시보드 진입 시 안 본 업데이트가 있으면 1회 표시.
 * '확인'을 눌러야 seen 처리(오버레이 클릭·이탈은 미기록 → 다음 방문에 다시 보여줌).
 */
export default function UpdateNoticeModal() {
  const [update, setUpdate] = useState<UpdateEntry | null>(null);

  // localStorage는 클라이언트 전용 — 마운트 후 판정(SSR 하이드레이션 불일치 방지)
  useEffect(() => { setUpdate(getUnseenUpdate()); }, []);

  if (!update) return null;

  const close = () => { markUpdateSeen(); setUpdate(null); };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(17, 17, 26, 0.45)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20,
    }}>
      <div style={{
        width: 'min(460px, 100%)', maxHeight: '80vh', overflowY: 'auto',
        background: '#fff', borderRadius: 20, padding: '28px 26px 22px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
        fontFamily: 'var(--f, inherit)',
      }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#6D4CFF', marginBottom: 8 }}>
          ✨ 새로운 업데이트 · {update.date}
        </div>
        <h2 style={{ margin: '0 0 14px', fontSize: 19, fontWeight: 800, color: '#191F28', letterSpacing: '-0.3px', lineHeight: 1.4 }}>
          {update.title}
        </h2>
        <ul style={{ margin: '0 0 20px', paddingLeft: 18 }}>
          {update.items.map(it => (
            <li key={it} style={{ fontSize: 13.5, lineHeight: 1.7, color: '#4E5968', marginBottom: 7 }}>{it}</li>
          ))}
        </ul>
        <div style={{ display: 'flex', gap: 8 }}>
          <a
            href="/updates"
            onClick={markUpdateSeen}
            style={{
              flex: 1, textAlign: 'center', padding: '12px 0', borderRadius: 10,
              border: '1.5px solid #ECECF2', background: '#fff', color: '#4E5968',
              fontSize: 13.5, fontWeight: 700, textDecoration: 'none',
            }}
          >
            지난 소식 보기
          </a>
          <button
            onClick={close}
            style={{
              flex: 1.4, padding: '12px 0', borderRadius: 10, border: 'none',
              background: '#6D4CFF', color: '#fff', fontSize: 13.5, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            확인했어요
          </button>
        </div>
      </div>
    </div>
  );
}
