import LandingLayout from '@/components/landing/LandingLayout';
import RedirectClient from './RedirectClient';

/** 모바일 결제 복귀 지점 — requestPayment(redirectUrl)이 이 주소로 돌아온다 */
export const metadata = { title: '결제 확인 — Flik' };

export default async function Page({
  searchParams,
}: { searchParams: Promise<{ paymentId?: string; code?: string; message?: string }> }) {
  const sp = await searchParams;
  // 포트원은 실패 시 code·message를 쿼리로 붙여 돌려보낸다
  const fail = sp.code ? (sp.message ?? '결제가 취소되었거나 실패했어요.') : undefined;
  return (
    <LandingLayout>
      <div style={{
        minHeight: '60vh', display: 'flex', justifyContent: 'center',
        padding: '64px 24px 120px', fontFamily: "'Pretendard','Noto Sans KR',sans-serif",
      }}>
        <RedirectClient paymentId={sp.paymentId} failMessage={fail} />
      </div>
    </LandingLayout>
  );
}
