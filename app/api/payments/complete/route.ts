import { NextRequest, NextResponse } from 'next/server';
import { getSessionEmail } from '@/lib/authToken';
import { getPaymentOrder, settlePaidOrder, markPaymentFailed } from '@/lib/db';
import { fetchPortOnePayment } from '@/lib/portone';

/**
 * 결제 완료 검증·크레딧 지급(2026-07-30).
 *
 * ★검증 순서(하나라도 어긋나면 지급하지 않는다):
 *   1) 로그인 사용자 == 주문자 (남의 결제로 내 크레딧을 받는 것 차단)
 *   2) 포트원 조회 status === 'PAID'
 *   3) 포트원 조회 금액 === 서버가 만든 주문 금액 (클라 금액 위조 차단)
 * ★지급은 settlePaidOrder가 멱등 처리 — 재호출·웹훅 중복에도 1회만 지급된다.
 */
export async function POST(req: NextRequest) {
  const email = await getSessionEmail(req);
  if (!email) return NextResponse.json({ error: '로그인이 필요해요.' }, { status: 401 });

  const { paymentId } = await req.json() as { paymentId?: string };
  if (!paymentId || typeof paymentId !== 'string') {
    return NextResponse.json({ error: 'paymentId가 필요해요.' }, { status: 400 });
  }

  const order = await getPaymentOrder(paymentId);
  if (!order) return NextResponse.json({ error: '주문을 찾을 수 없어요.' }, { status: 404 });
  if (order.user_email !== email) {
    // 다른 사람의 결제건으로 크레딧을 받으려는 시도
    return NextResponse.json({ error: '주문자와 로그인 정보가 일치하지 않아요.' }, { status: 403 });
  }

  let payment;
  try {
    payment = await fetchPortOnePayment(paymentId);
  } catch (err) {
    console.error('[payments/complete] 포트원 조회 실패:', err);
    return NextResponse.json({ error: '결제 확인 중 오류가 발생했어요. 잠시 후 다시 시도해주세요.' }, { status: 502 });
  }

  if (payment.status !== 'PAID') {
    await markPaymentFailed(paymentId);
    return NextResponse.json(
      { error: `결제가 완료되지 않았어요. (상태: ${payment.status ?? '알 수 없음'})`, status: payment.status },
      { status: 402 },
    );
  }

  const paidTotal = Number(payment.amount?.total ?? 0);
  if (paidTotal !== order.amount) {
    // 금액 불일치 — 지급하지 않고 기록만 남긴다(수동 확인 필요)
    console.error(`[payments/complete] ⚠️금액 불일치 paymentId=${paymentId} 주문=${order.amount} 결제=${paidTotal}`);
    return NextResponse.json({ error: '결제 금액이 주문과 일치하지 않아요. 고객센터로 문의해주세요.' }, { status: 409 });
  }

  const settled = await settlePaidOrder(paymentId);
  if (settled.status === 'not_found') {
    return NextResponse.json({ error: '주문을 찾을 수 없어요.' }, { status: 404 });
  }

  console.log(`[payments/complete] ${settled.status} paymentId=${paymentId} email=${email} plan=${order.plan_id}`);
  return NextResponse.json({
    status: settled.status,                    // granted | duplicate
    credits: order.credits,
    balance: settled.balance,
    planId: order.plan_id,
  });
}
