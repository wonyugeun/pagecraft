'use client';

import { useState, useRef, useEffect } from 'react';
import { useApp, CHAT_A } from '@/store/AppContext';

interface Msg { text: string; who: 'bot' | 'user'; }

export default function ChatPanel() {
  const { chatOpen, toggleChat } = useApp();
  const [msgs, setMsgs] = useState<Msg[]>([
    { text: '안녕하세요! 카테고리·블로그형·이미지·크레딧 등 자주 묻는 질문을 도와드려요 😊 아래 버튼을 누르거나 키워드로 물어보세요.', who: 'bot' },
  ]);
  const [inp, setInp] = useState('');
  const msgsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (msgsRef.current) msgsRef.current.scrollTop = msgsRef.current.scrollHeight;
  }, [msgs]);

  const addMsg = (text: string, who: 'bot' | 'user') => setMsgs(p => [...p, { text, who }]);

  // 자유 질문 → 키워드로 실제 답변(CHAT_A) 매칭. 못 찾으면 정직하게 안내(가짜 응답 금지).
  // (실제 LLM 챗 연결은 별도 기능 — 현재는 '자주 묻는 질문 도우미'로 정직하게 동작.)
  const findAnswer = (q: string): string | null => {
    const t = q.toLowerCase();
    if (t.includes('카테고리')) return CHAT_A['카테고리 차이가 뭐예요?'];
    if (t.includes('블로그')) return CHAT_A['블로그형이 뭐예요?'];
    if (t.includes('이미지') || t.includes('사진') || t.includes('여러')) return CHAT_A['이미지를 왜 여러 장 올려야 해요?'];
    if (t.includes('크레딧') || t.includes('요금') || t.includes('비용') || t.includes('가격') || t.includes('무료')) return CHAT_A['크레딧은 어떻게 써요?'];
    return null;
  };
  const FALLBACK = '아직 자유 질문 자동 답변은 준비 중이에요. 아래 자주 묻는 질문을 눌러보시거나, 더 자세한 내용은 FAQ 페이지를 확인해 주세요 😊';

  const handleQ = (q: string) => {
    addMsg(q, 'user');
    setTimeout(() => addMsg(CHAT_A[q] || findAnswer(q) || FALLBACK, 'bot'), 500);
  };

  const send = () => {
    const t = inp.trim();
    if (!t) return;
    addMsg(t, 'user');
    setInp('');
    setTimeout(() => addMsg(findAnswer(t) || FALLBACK, 'bot'), 500);
  };

  const QUICK = ['카테고리 차이가 뭐예요?', '블로그형이 뭐예요?', '이미지를 왜 여러 장 올려야 해요?', '크레딧은 어떻게 써요?'];

  return (
    <div className={`chat-panel${chatOpen ? ' open' : ''}`}>
      <div className="cp-hd">
        <div className="cp-av">✦</div>
        <div>
          <div className="cp-name">Flik AI 도우미</div>
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
