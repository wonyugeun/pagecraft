'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Check, ShieldCheck, CreditCard } from 'lucide-react';
import { PLANS, currentPrice, planHighlights, PROMO } from '@/data/plans';

/**
 * 결제 화면(2026-07-30) — 포트원 V2 인증결제 호출.
 *
 * ★PG·카드사 심사 요건: 결제 페이지와 결제모듈 호출이 실제로 구현되어 있어야 한다.
 *   테스트/실연동 전환은 코드가 아니라 포트원 콘솔의 채널 설정에서 이뤄진다.
 * ★금액은 화면에 표시만 하고, 실제 결제 금액은 서버(/api/payments/prepare)가 정한 값을 쓴다.
 */
export default function CheckoutClient({ planId }: { planId: string }) {
  const plan = PLANS.find(p => p.id === planId) ?? PLANS[0];
  // ★로그인 상태·현재 잔액 표시(2026-07-30) — 결제 화면에서 로그아웃된 것처럼 보이던 문제.
  const { data: session, status } = useSession();
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [done, setDone] = useState<{ credits: number; balance: number } | null>(null);

  useEffect(() => {
    if (status !== 'authenticated') return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/credits');
        if (!res.ok) return;
        const d = await res.json() as { balance?: number };
        if (!cancelled && typeof d.balance === 'number') setBalance(d.balance);
      } catch { /* 표시용이라 실패해도 무시 */ }
    })();
    return () => { cancelled = true; };
  }, [status]);

  const pay = async () => {
    if (loading) return;
    setLoading(true); setMsg('');
    try {
      // 1) 서버가 주문 확정(금액·크레딧 결정)
      const prepRes = await fetch('/api/payments/prepare', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: plan.id }),
      });
      const prep = await prepRes.json() as {
        paymentId?: string; storeId?: string; channelKey?: string; orderName?: string;
        totalAmount?: number; currency?: string; payMethod?: string; error?: string;
      };
      if (!prepRes.ok || !prep.paymentId) throw new Error(prep.error ?? '결제 준비에 실패했어요.');

      // 2) 결제창 호출 — SDK는 브라우저에서만 로드
      const PortOne = await import('@portone/browser-sdk/v2');
      const result = await PortOne.requestPayment({
        storeId: prep.storeId!,
        channelKey: prep.channelKey!,
        paymentId: prep.paymentId,
        orderName: prep.orderName!,
        totalAmount: prep.totalAmount!,
        currency: prep.currency as never,
        payMethod: prep.payMethod as never,
        // 모바일은 리다이렉트 방식이 필수 — 결제 후 이 주소로 돌아온다
        redirectUrl: `${window.location.origin}/checkout/redirect?paymentId=${prep.paymentId}`,
      });

      if (result?.code) throw new Error(result.message ?? '결제가 취소되었어요.');

      // 3) 서버 검증 후 크레딧 지급
      const cmpRes = await fetch('/api/payments/complete', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId: prep.paymentId }),
      });
      const cmp = await cmpRes.json() as { status?: string; credits?: number; balance?: number; error?: string };
      if (!cmpRes.ok) throw new Error(cmp.error ?? '결제 확인에 실패했어요.');

      setDone({ credits: cmp.credits ?? plan.credits, balance: cmp.balance ?? 0 });
    } catch (e) {
      setMsg(e instanceof Error ? e.message : '결제 중 오류가 발생했어요.');
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div style={{ ...card, textAlign: 'center' }}>
        <div style={{
          width: 52, height: 52, borderRadius: '50%', background: '#F0FDF4',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16,
        }}>
          <Check size={26} color="#16A34A" strokeWidth={2.6} />
        </div>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: '#191F28', margin: '0 0 8px', letterSpacing: '-0.02em' }}>
          결제가 완료됐어요
        </h2>
        <p style={{ fontSize: 15, color: '#4E5968', margin: '0 0 6px' }}>
          크레딧 <b style={{ fontWeight: 700, color: '#191F28' }}>{done.credits}개</b>가 지급됐어요.
        </p>
        <p style={{ fontSize: 14, color: '#8B95A1', margin: '0 0 24px' }}>
          현재 잔액 {done.balance}크레딧
        </p>
        <Link href="/" style={ctaStyle(true)}>상세페이지 만들러 가기</Link>
      </div>
    );
  }

  return (
    <div style={card}>
      {/* 로그인 상태 — 누구 계정으로 충전되는지 명확히 */}
      {status === 'authenticated' ? (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
          background: '#FAFAFC', border: '1px solid #ECECF2', borderRadius: 10,
          padding: '10px 13px', marginBottom: 18, flexWrap: 'wrap',
        }}>
          <span style={{ fontSize: 12.5, color: '#8B95A1', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {session?.user?.email ?? '로그인됨'}
          </span>
          {balance !== null && (
            <span style={{ fontSize: 12.5, fontWeight: 700, color: '#4E5968', whiteSpace: 'nowrap' }}>
              보유 {balance}크레딧
            </span>
          )}
        </div>
      ) : status === 'unauthenticated' ? (
        <div style={{
          background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 10,
          padding: '11px 13px', marginBottom: 18, fontSize: 12.5, color: '#92400E', lineHeight: 1.6,
        }}>
          로그인 후 결제할 수 있어요. <Link href="/login" style={{ color: '#92400E', fontWeight: 700 }}>로그인하기</Link>
        </div>
      ) : null}

      <div style={{ fontSize: 13, fontWeight: 700, color: '#6D4CFF', marginBottom: 6 }}>{plan.nameEn}</div>
      <h1 style={{ fontSize: 24, fontWeight: 800, color: '#191F28', margin: '0 0 4px', letterSpacing: '-0.02em' }}>
        크레딧 {plan.credits}개 충전
      </h1>
      <p style={{ fontSize: 14, color: '#8B95A1', margin: '0 0 22px' }}>{plan.tagline}</p>

      {/* 결제 금액 */}
      <div style={{
        background: '#FAFAFC', border: '1px solid #ECECF2', borderRadius: 14,
        padding: '18px 20px', marginBottom: 18,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <span style={{ fontSize: 14, color: '#4E5968' }}>결제 금액</span>
          <span style={{ fontSize: 24, fontWeight: 800, color: '#191F28', letterSpacing: '-0.03em' }}>
            {currentPrice(plan).toLocaleString('ko-KR')}원
          </span>
        </div>
        {PROMO.active && (
          <div style={{ fontSize: 12.5, color: '#6D4CFF', fontWeight: 600 }}>
            {PROMO.label} 적용가 · {PROMO.changesOn}부터 {plan.listPrice.toLocaleString('ko-KR')}원
          </div>
        )}
        <div style={{ fontSize: 12, color: '#8B95A1', marginTop: 8 }}>부가세 포함 · 신용·체크카드</div>
      </div>

      {/* 받는 내용 */}
      <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 22px', display: 'grid', gap: 10 }}>
        {planHighlights(plan).map((h, i) => (
          <li key={i} style={{ display: 'flex', gap: 8, fontSize: 14, color: '#4E5968', lineHeight: 1.6 }}>
            <Check size={16} color="#6D4CFF" strokeWidth={2.6} style={{ flexShrink: 0, marginTop: 3 }} />
            <span>{h.pre}<b style={{ fontWeight: 700, color: '#191F28' }}>{h.bold}</b>{h.post}</span>
          </li>
        ))}
      </ul>

      {msg && (
        <div style={{
          background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10,
          padding: '11px 14px', marginBottom: 14, fontSize: 13, color: '#B91C1C', lineHeight: 1.6,
        }}>{msg}</div>
      )}

      <button onClick={pay} disabled={loading} style={ctaStyle(!loading)}>
        <CreditCard size={17} strokeWidth={2.2} />
        {loading ? '결제창을 여는 중…' : `${currentPrice(plan).toLocaleString('ko-KR')}원 결제하기`}
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center', marginTop: 14, fontSize: 12, color: '#8B95A1' }}>
        <ShieldCheck size={14} />
        포트원(PortOne) 결제 · 카드 정보는 Flik에 저장되지 않아요
      </div>

      <div style={{ textAlign: 'center', marginTop: 18 }}>
        <Link href="/pricing" style={{ fontSize: 13, color: '#8B95A1', textDecoration: 'none' }}>
          다른 플랜 보기
        </Link>
      </div>
    </div>
  );
}

const card: React.CSSProperties = {
  width: 'min(460px, 100%)', background: '#fff',
  border: '1px solid #ECECF2', borderRadius: 20, padding: '32px 28px',
  boxShadow: '0 1px 3px rgba(17,17,26,0.04)',
};

function ctaStyle(active: boolean): React.CSSProperties {
  return {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
    width: '100%', border: 'none', borderRadius: 12, padding: '16px 0',
    background: active ? '#6D4CFF' : '#EDE8FF', color: active ? '#fff' : '#B0A0E8',
    fontSize: 15.5, fontWeight: 700, letterSpacing: '-0.01em',
    cursor: active ? 'pointer' : 'default', fontFamily: 'inherit', textDecoration: 'none',
  };
}
