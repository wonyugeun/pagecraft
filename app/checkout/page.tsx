import LandingLayout from '@/components/landing/LandingLayout';
import CheckoutClient from './CheckoutClient';

/** 결제 화면 — PG·카드사 심사 대상 페이지(결제모듈 호출 구현 위치) */
export const metadata = { title: '결제 — Flik' };

export default async function Page({ searchParams }: { searchParams: Promise<{ plan?: string }> }) {
  const { plan } = await searchParams;
  return (
    <LandingLayout>
      <div style={{
        minHeight: '60vh', display: 'flex', justifyContent: 'center',
        padding: '64px 24px 120px', fontFamily: "'Pretendard','Noto Sans KR',sans-serif",
      }}>
        <CheckoutClient planId={plan ?? 'pro'} />
      </div>
    </LandingLayout>
  );
}
