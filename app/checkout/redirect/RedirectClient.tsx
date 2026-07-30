'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Check, AlertCircle } from 'lucide-react';

/**
 * 모바일 결제 리다이렉트 처리(2026-07-30).
 *
 * 모바일 결제창은 앱 전환 후 이 주소로 돌아온다(requestPayment의 redirectUrl).
 * 돌아온 시점엔 requestPayment의 반환값을 받을 수 없으므로, paymentId로 서버 검증만 수행한다.
 */
export default function RedirectClient({ paymentId, failMessage }: { paymentId?: string; failMessage?: string }) {
  const [state, setState] = useState<'loading' | 'ok' | 'fail'>(failMessage ? 'fail' : 'loading');
  const [msg, setMsg] = useState(failMessage ?? '');
  const [info, setInfo] = useState<{ credits: number; balance: number } | null>(null);

  useEffect(() => {
    if (failMessage) return;
    if (!paymentId) { setState('fail'); setMsg('결제 정보를 찾을 수 없어요.'); return; }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/payments/complete', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paymentId }),
        });
        const d = await res.json() as { credits?: number; balance?: number; error?: string };
        if (cancelled) return;
        if (!res.ok) { setState('fail'); setMsg(d.error ?? '결제 확인에 실패했어요.'); return; }
        setInfo({ credits: d.credits ?? 0, balance: d.balance ?? 0 });
        setState('ok');
      } catch {
        if (!cancelled) { setState('fail'); setMsg('결제 확인 중 오류가 발생했어요.'); }
      }
    })();
    return () => { cancelled = true; };
  }, [paymentId, failMessage]);

  return (
    <div style={{
      width: 'min(440px, 100%)', background: '#fff', border: '1px solid #ECECF2',
      borderRadius: 20, padding: '36px 28px', textAlign: 'center',
    }}>
      {state === 'loading' && (
        <>
          <div style={{
            width: 34, height: 34, margin: '0 auto 16px',
            border: '3px solid #E6DEFF', borderTopColor: '#6D4CFF', borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }} />
          <div style={{ fontSize: 16, fontWeight: 700, color: '#191F28' }}>결제를 확인하는 중이에요</div>
          <div style={{ fontSize: 13.5, color: '#8B95A1', marginTop: 6 }}>창을 닫지 말고 잠시만 기다려주세요.</div>
        </>
      )}

      {state === 'ok' && (
        <>
          <div style={{
            width: 52, height: 52, borderRadius: '50%', background: '#F0FDF4',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16,
          }}>
            <Check size={26} color="#16A34A" strokeWidth={2.6} />
          </div>
          <div style={{ fontSize: 21, fontWeight: 800, color: '#191F28', letterSpacing: '-0.02em' }}>결제가 완료됐어요</div>
          <div style={{ fontSize: 14.5, color: '#4E5968', marginTop: 8 }}>
            크레딧 <b style={{ fontWeight: 700, color: '#191F28' }}>{info?.credits}개</b> 지급 · 현재 잔액 {info?.balance}
          </div>
          <Link href="/" style={link(true)}>상세페이지 만들러 가기</Link>
        </>
      )}

      {state === 'fail' && (
        <>
          <div style={{
            width: 52, height: 52, borderRadius: '50%', background: '#FEF2F2',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16,
          }}>
            <AlertCircle size={26} color="#DC2626" strokeWidth={2.2} />
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#191F28', letterSpacing: '-0.02em' }}>결제가 완료되지 않았어요</div>
          <div style={{ fontSize: 14, color: '#8B95A1', marginTop: 8, lineHeight: 1.6 }}>{msg}</div>
          <Link href="/pricing" style={link(false)}>요금제로 돌아가기</Link>
        </>
      )}
    </div>
  );
}

function link(primary: boolean): React.CSSProperties {
  return {
    display: 'block', marginTop: 24, textDecoration: 'none', borderRadius: 12, padding: '14px 0',
    background: primary ? '#6D4CFF' : '#F4F4F8', color: primary ? '#fff' : '#4E5968',
    fontSize: 15, fontWeight: 700,
  };
}
