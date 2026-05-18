'use client';

import { useState, useRef, useEffect } from 'react';
import { useApp, CHAT_A } from '@/store/AppContext';

interface Msg { text: string; who: 'bot' | 'user'; }

export default function ChatPanel() {
  const { chatOpen, toggleChat } = useApp();
  const [msgs, setMsgs] = useState<Msg[]>([
    { text: '안녕하세요! 상세페이지 제작에 대해 궁금한 게 있으면 뭐든 물어보세요 😊', who: 'bot' },
  ]);
  const [inp, setInp] = useState('');
  const msgsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (msgsRef.current) msgsRef.current.scrollTop = msgsRef.current.scrollHeight;
  }, [msgs]);

  const addMsg = (text: string, who: 'bot' | 'user') => setMsgs(p => [...p, { text, who }]);

  const handleQ = (q: string) => {
    addMsg(q, 'user');
    setTimeout(() => addMsg(CHAT_A[q] || '조금 더 구체적으로 말씀해주시면 도와드릴게요!', 'bot'), 600);
  };

  const send = () => {
    const t = inp.trim();
    if (!t) return;
    addMsg(t, 'user');
    setInp('');
    setTimeout(() => addMsg('확인해드릴게요! 언제든 질문하세요 ✦', 'bot'), 700);
  };

  const QUICK = ['카테고리 차이가 뭐예요?', '블로그형이 뭐예요?', '이미지를 왜 여러 장 올려야 해요?', '크레딧은 어떻게 써요?'];

  return (
    <div className={`chat-panel${chatOpen ? ' open' : ''}`}>
      <div className="cp-hd">
        <div className="cp-av">✦</div>
        <div>
          <div className="cp-name">PageCraft AI 도우미</div>
          <div className="cp-status"><span className="cp-dot" /> 온라인</div>
        </div>
        <button className="cp-close" onClick={toggleChat}>✕</button>
      </div>
      <div className="chat-msgs" ref={msgsRef}>
        {msgs.map((m, i) => (
          <div key={i} className={`cm cm-${m.who}`}>{m.text}</div>
        ))}
      </div>
      <div className="chat-quick">
        {QUICK.map(q => <div key={q} className="cq" onClick={() => handleQ(q)}>{q}</div>)}
      </div>
      <div className="chat-inp-row">
        <input
          className="chat-inp"
          placeholder="질문을 입력하세요..."
          value={inp}
          onChange={e => setInp(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
        />
        <button className="chat-send" onClick={send}>↑</button>
      </div>
    </div>
  );
}
