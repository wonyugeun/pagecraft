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
          <span className="ai-txt">AI 도우미</span>
        </button>
        {loggedIn && (
          <div className="user-badge">
            <div className="user-av">유</div>
            <span className="user-name">유근님</span>
          </div>
        )}
      </div>
    </div>
  );
}
