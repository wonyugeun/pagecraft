'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';

/** 대면 테스트에서 자주 쓰는 양 — 60이면 블로그형 8섹션 6장 */
const PRESETS = [20, 60, 100];

export default function CreditsGrantClient() {
  const { data: session, status } = useSession();
  const [email, setEmail] = useState('');
  const [amount, setAmount] = useState(60);
  const [note, setNote] = useState('대면테스트');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  const grant = async () => {
    if (busy) return;
    if (!email.includes('@')) { setResult({ ok: false, text: '받을 분의 이메일을 정확히 적어주세요.' }); return; }
    setBusy(true); setResult(null);
    try {
      const res = await fetch('/api/admin/grant-credits', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), amount, note: note.trim() || '수동지급' }),
      });
      const d = await res.json() as { message?: string; error?: string };
      setResult(res.ok && !d.error
        ? { ok: true, text: d.message ?? '지급했어요.' }
        : { ok: false, text: d.error ?? '지급에 실패했어요.' });
    } catch {
      setResult({ ok: false, text: '연결에 실패했어요. 잠시 후 다시 시도해주세요.' });
    } finally {
      setBusy(false);
    }
  };

  const label: React.CSSProperties = { fontSize: 13, fontWeight: 700, color: '#4E5968', marginBottom: 7, display: 'block' };
  const input: React.CSSProperties = {
    width: '100%', border: '1px solid #E5E8EB', borderRadius: 12, padding: '13px 14px',
    fontSize: 15, fontFamily: 'inherit', outline: 'none', color: '#191F28', boxSizing: 'border-box',
  };

  return (
    <div style={{
      minHeight: '100vh', background: '#FAFAFC', padding: '48px 20px',
      fontFamily: "'Pretendard','Noto Sans KR',-apple-system,sans-serif",
    }}>
      <div style={{ maxWidth: 460, margin: '0 auto', background: '#fff', border: '1px solid #F1F1F4', borderRadius: 20, padding: '30px 26px' }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: '#191F28', margin: 0, letterSpacing: '-0.02em' }}>크레딧 지급</h1>
        <p style={{ fontSize: 13.5, color: '#8B95A1', margin: '8px 0 0', lineHeight: 1.65 }}>
          테스터가 <b style={{ color: '#4E5968' }}>먼저 가입</b>한 뒤에 지급하세요 —
          미리 넣으면 가입 축하 10크레딧이 들어가지 않습니다.
        </p>

        {status === 'authenticated' && (
          <div style={{ marginTop: 14, fontSize: 12.5, color: '#8B95A1' }}>
            로그인: {session?.user?.email}
          </div>
        )}
        {status === 'unauthenticated' && (
          <div style={{
            marginTop: 16, background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: 12,
            padding: '12px 14px', fontSize: 13.5, color: '#9A3412', lineHeight: 1.6,
          }}>
            로그인이 필요해요. 관리자 계정으로 로그인한 뒤 이 페이지를 새로고침해주세요.
          </div>
        )}

        <div style={{ marginTop: 22 }}>
          <label style={label}>받을 분 이메일 (가입에 쓴 주소)</label>
          <input
            style={input} value={email} inputMode="email" autoCapitalize="none" spellCheck={false}
            onChange={e => setEmail(e.target.value)} placeholder="seller@gmail.com"
          />
        </div>

        <div style={{ marginTop: 18 }}>
          <label style={label}>지급량</label>
          <div style={{ display: 'flex', gap: 8, marginBottom: 9 }}>
            {PRESETS.map(n => (
              <button
                key={n} onClick={() => setAmount(n)}
                style={{
                  flex: 1, padding: '10px 0', borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit',
                  fontSize: 14, fontWeight: 700,
                  border: `1px solid ${amount === n ? '#6D4CFF' : '#E5E8EB'}`,
                  background: amount === n ? '#F4F0FF' : '#fff',
                  color: amount === n ? '#5B3FD6' : '#4E5968',
                }}
              >{n}</button>
            ))}
          </div>
          <input
            style={input} type="number" min={1} max={300} value={amount}
            onChange={e => setAmount(Math.max(1, Math.min(300, Number(e.target.value) || 0)))}
          />
          <div style={{ fontSize: 12, color: '#B0B8C1', marginTop: 6 }}>
            60크레딧 ≈ 블로그형 8섹션 6장 · 최대 300
          </div>
        </div>

        <div style={{ marginTop: 18 }}>
          <label style={label}>사유</label>
          <input style={input} value={note} onChange={e => setNote(e.target.value)} placeholder="대면테스트" />
          <div style={{ fontSize: 12, color: '#B0B8C1', marginTop: 6 }}>
            같은 사람·같은 양·같은 사유는 하루 한 번만 들어갑니다. 더 주려면 사유를 바꾸세요.
          </div>
        </div>

        <button
          onClick={grant} disabled={busy || status !== 'authenticated'}
          style={{
            marginTop: 24, width: '100%', border: 'none', borderRadius: 12, padding: '15px 0',
            background: busy || status !== 'authenticated' ? '#EDE8FF' : '#6D4CFF',
            color: busy || status !== 'authenticated' ? '#B0A0E8' : '#fff',
            fontSize: 15.5, fontWeight: 700, cursor: busy ? 'default' : 'pointer', fontFamily: 'inherit',
          }}
        >{busy ? '지급하는 중…' : '지급하기'}</button>

        {result && (
          <div style={{
            marginTop: 16, borderRadius: 12, padding: '13px 15px', fontSize: 14, lineHeight: 1.65,
            background: result.ok ? '#F0FDF4' : '#FEF2F2',
            border: `1px solid ${result.ok ? '#BBF7D0' : '#FECACA'}`,
            color: result.ok ? '#166534' : '#991B1B',
          }}>{result.text}</div>
        )}
      </div>
    </div>
  );
}
