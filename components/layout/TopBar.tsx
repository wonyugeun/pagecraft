'use client';

import { useApp } from '@/store/AppContext';

export default function TopBar() {
  const { loggedIn, chatOpen, toggleChat } = useApp();

  return (
    <div className="tb">
      <div className="tb-logo">
        <div className="tb-dot" />
        PageCraft
      </div>
      <div className="tb-right">
        <button className="ai-help-btn" onClick={toggleChat}>
          <span className="dot" />
          AI 도우미
        </button>
        {loggedIn && (
          <div className="user-badge">
            <div className="user-av">유</div>
            유근님
          </div>
        )}
      </div>
    </div>
  );
}
