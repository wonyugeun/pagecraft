'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRef, useState, useEffect } from 'react';
import { useApp } from '@/store/AppContext';

export default function TopBar() {
  const { chatOpen, toggleChat, go } = useApp();
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const name    = session?.user?.name ?? '';
  const email   = session?.user?.email ?? '';
  const initial = name.slice(0, 1) || '?';
  const label   = name ? (name.length > 4 ? name.slice(0, 4) + '님' : name + '님') : '';

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div className="tb">
      <div className="tb-logo">
        <div className="tb-dot" />
        PageCraft
      </div>
      <div className="tb-right">
        <button className="ai-help-btn" onClick={toggleChat}>
          <span className="dot" />
          <span className="ai-txt">AI 도우미</span>
        </button>

        {session && (
          <div className="user-wrap" ref={ref}>
            <div
              className="user-badge"
              onClick={() => setOpen(v => !v)}
              style={{ cursor: 'pointer' }}
            >
              <div className="user-av">{initial}</div>
              <span className="user-name">{label}</span>
            </div>

            {open && (
              <div className="user-drop">
                <div className="ud-profile">
                  <div className="ud-av">{initial}</div>
                  <div className="ud-info">
                    <div className="ud-name">{name}</div>
                    {email && <div className="ud-email">{email}</div>}
                  </div>
                </div>
                <div className="ud-divider" />
                <button className="ud-item" onClick={() => { setOpen(false); go('s-dash'); }}>
                  내 상세페이지
                </button>
                <div className="ud-divider" />
                <button
                  className="ud-item ud-logout"
                  onClick={() => signOut({ callbackUrl: '/' })}
                >
                  로그아웃
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
