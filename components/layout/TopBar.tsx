'use client';

import { useSession, signOut } from 'next-auth/react';
import { useApp } from '@/store/AppContext';

export default function TopBar() {
  const { chatOpen, toggleChat } = useApp();
  const { data: session } = useSession();

  const name     = session?.user?.name ?? '';
  const initial  = name.slice(0, 1) || '?';
  const label    = name ? (name.length > 4 ? name.slice(0, 4) + '님' : name + '님') : '';

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
          <div
            className="user-badge"
            title="클릭하여 로그아웃"
            onClick={() => signOut({ callbackUrl: '/' })}
            style={{ cursor: 'pointer' }}
          >
            <div className="user-av">{initial}</div>
            <span className="user-name">{label}</span>
          </div>
        )}
      </div>
    </div>
  );
}
