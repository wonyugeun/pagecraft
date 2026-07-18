'use client';

import { useState, useRef, useEffect } from 'react';
import { useApp, CHAT_A } from '@/store/AppContext';

interface Msg { text: string; who: 'bot' | 'user'; }

export default function ChatPanel() {
  const { chatOpen, toggleChat } = useApp();
  const [msgs, setMsgs] = useState<Msg[]>([
    { text: '안녕하세요! Flik 이용 중 궁금한 점을 물어보세요 😊 크레딧·생성·사진 업로드·다운로드까지 바로 답해드려요.', who: 'bot' },
  ]);
  const [inp, setInp] = useState('');
  const [waiting, setWaiting] = useState(false);   // LLM 응답 대기(중복 전송 방지 + 타이핑 표시)
  const msgsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (msgsRef.current) msgsRef.current.scrollTop = msgsRef.current.scrollHeight;
  }, [msgs, waiting]);

  const addMsg = (text: string, who: 'bot' | 'user') => setMsgs(p => [...p, { text, who }]);

  // 빠른 질문 버튼 — 로컬 확정 답변(API 비용 0, 즉답)
  const handleQ = (q: string) => {
    if (waiting) return;
    addMsg(q, 'user');
    setTimeout(() => addMsg(CHAT_A[q] || '', 'bot'), 400);
  };

  // 자유 질문 — 서버 LLM 도우미(/api/assistant). 대화 맥락(최근 12턴) 동봉.
  const send = async () => {
    const t = inp.trim();
    if (!t || waiting) return;
    addMsg(t, 'user');
    setInp('');
    setWaiting(true);
    try {
      const history = [...msgs, { text: t, who: 'user' as const }]
        .slice(-12)
        .map(m => ({ role: m.who === 'user' ? 'user' as const : 'assistant' as const, content: m.text }));
      const res = await fetch('/api/assistant', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history }),
      });
      const data = await res.json() as { reply?: string; error?: string };
      addMsg(data.reply || data.error || '지금은 답변이 어려워요. 잠시 후 다시 시도하거나 FAQ 페이지를 확인해 주세요.', 'bot');
    } catch {
      addMsg('지금은 답변이 어려워요. 잠시 후 다시 시도하거나 FAQ 페이지를 확인해 주세요.', 'bot');
    } finally {
      setWaiting(false);
    }
  };

  const QUICK = ['카테고리 차이가 뭐예요?', '블로그형이 뭐예요?', '이미지를 왜 여러 장 올려야 해요?', '크레딧은 어떻게 써요?'];

  return (
    <div className={`chat-panel${chatOpen ? ' open' : ''}`}>
      <div className="cp-hd">
        <div className="cp-av">✦</div>
        <div>
          <div className="cp-name">Flik AI 도우미</div>
          <div className="cp-status"><span className="cp-dot" /> AI 자동응답</div>
        </div>
        <button className="cp-close" onClick={toggleChat}>✕</button>
      </div>
      <div className="chat-msgs" ref={msgsRef}>
        {msgs.map((m, i) => (
          <div key={i} className={`cm cm-${m.who}`}>{m.text}</div>
        ))}
        {waiting && <div className="cm cm-bot" style={{ opacity: 0.6 }}>답변 작성 중…</div>}
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
          disabled={waiting}
        />
        <button className="chat-send" onClick={send} disabled={waiting}>↑</button>
      </div>
    </div>
  );
}
