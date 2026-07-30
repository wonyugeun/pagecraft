import { NextRequest, NextResponse } from 'next/server';
import { getSessionEmail } from '@/lib/authToken';
import { createPaymentOrder, checkRateLimit, clientIp, ensureSchemaOnce } from '@/lib/db';
import { PLANS, currentPrice } from '@/data/plans';
import { newPaymentId, PORTONE_STORE_ID, PORTONE_CHANNEL_KEY, portoneConfigured } from '@/lib/portone';

/**
 * 결제 준비(2026-07-30) — 결제창을 띄우기 '전에' 서버가 주문을 확정한다.
 *
 * ★핵심: 금액·크레딧을 서버가 정한다. 클라이언트가 보내는 건 planId뿐이다.
 *   (클라 금액을 믿으면 1원 결제로 350크레딧을 받는 사고가 난다.)
 * ★응답의 storeId·channelKey는 클라이언트 노출이 정상인 값이다. API 시크릿은 내리지 않는다.
 */
export async function POST(req: NextRequest) {
  await ensureSchemaOnce();
  const email = await getSessionEmail(req);
  if (!email) return NextResponse.json({ error: '로그인이 필요해요.' }, { status: 401 });

  if (!portoneConfigured()) {
    return NextResponse.json(
      { error: '결제 설정이 아직 완료되지 않았어요. 잠시 후 다시 시도해주세요.', code: 'not_configured' },
      { status: 503 },
    );
  }

  // 주문 생성 남용 방지(결제창 스팸) — prep 등급
  const rl = await checkRateLimit('prep', email, clientIp(req));
  if (!rl.allowed) {
    return NextResponse.json({ error: '요청이 많아요. 잠시 후 다시 시도해주세요.' }, { status: 429 });
  }

  const { planId } = await req.json() as { planId?: string };
  const plan = PLANS.find(p => p.id === planId);
  if (!plan) return NextResponse.json({ error: '알 수 없는 플랜이에요.' }, { status: 400 });

  const amount = currentPrice(plan);          // ★서버 가격 — 프로모션 여부까지 서버가 판단
  const paymentId = newPaymentId();

  try {
    await createPaymentOrder({
      paymentId, email, planId: plan.id,
      amount, credits: plan.credits, validMonths: plan.validMonths,
    });
  } catch (err) {
    console.error('[payments/prepare] 주문 생성 실패:', err);
    return NextResponse.json({ error: '결제 준비 중 오류가 발생했어요.' }, { status: 500 });
  }

  return NextResponse.json({
    paymentId,
    storeId: PORTONE_STORE_ID,
    channelKey: PORTONE_CHANNEL_KEY,
    orderName: `Flik 크레딧 ${plan.credits}개 (${plan.nameEn})`,
    totalAmount: amount,
    currency: 'CURRENCY_KRW',
    payMethod: 'CARD',
  });
}
