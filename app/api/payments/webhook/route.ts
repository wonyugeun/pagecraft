import { NextRequest, NextResponse } from 'next/server';
import {
  ensureSchemaOnce, getPaymentOrder, settlePaidOrder,
  markPaymentFailed, revokeRefundedCredits,
} from '@/lib/db';
import { fetchPortOnePayment, verifyPortOneWebhook } from '@/lib/portone';

/**
 * 포트원 웹훅 수신(2026-07-31) — 우리가 모르는 사이에 결제 상태가 바뀌는 경로를 막는다.
 *
 * ★왜 필요한가:
 *  기존에는 /api/payments/complete(브라우저가 부르는 경로)만 있었다. 그래서
 *   - 포트원 콘솔에서 직접 취소 / 카드사 강제 취소 / 고객 이의제기(chargeback)로 취소되면
 *     돈은 돌아가는데 크레딧은 그대로 남았고,
 *   - 반대로 결제 직후 브라우저를 닫으면 돈은 빠졌는데 크레딧이 안 들어갔다.
 *  웹훅은 두 구멍을 모두 메운다.
 *
 * ★신뢰 모델 — 웹훅 본문은 '알림'일 뿐 근거가 아니다.
 *  paymentId만 꺼내 쓰고 실제 상태·금액은 항상 포트원 API를 다시 조회해서 판단한다.
 *  따라서 본문이 위조돼도 우리 DB가 포트원의 진실과 어긋날 수 없다(최악이라도 불필요한 조회 1회).
 *
 * ★서명 검증(PORTONE_WEBHOOK_SECRET):
 *  설정돼 있으면 검증에 실패한 요청은 거부한다. 아직 미설정이면 위 신뢰 모델 덕에 처리 자체는
 *  안전하므로 경고만 남기고 진행한다 — 시크릿을 안 넣었다는 이유로 '진짜 취소'를 놓치는 쪽이
 *  훨씬 위험하기 때문이다. 콘솔에서 시크릿을 발급하면 자동으로 엄격 모드가 된다.
 *
 * ★응답은 웬만하면 200. 포트원은 2xx가 아니면 재시도하는데, 우리 쪽 판단 실패로 무한 재시도를
 *  부르지 않기 위해서다. 단 '조회 실패'처럼 재시도가 의미 있는 경우엔 500을 준다.
 *
 * ⚠️이 라우트는 미들웨어의 로그인 가드에서 제외돼 있다(서버 간 호출이라 세션 쿠키가 없다).
 *  그래서 아래 검사 순서가 중요하다 — 우리 주문이 맞는지(DB 조회)를 먼저 확인하고 나서야
 *  포트원 API를 부른다. 모르는 paymentId로는 외부 호출이 절대 일어나지 않으므로,
 *  공개 엔드포인트를 외부 API 증폭기로 쓰는 것을 막는다. 순서를 바꾸지 말 것.
 */
export const maxDuration = 30;

/** 결제 상태를 바꾸는 이벤트만 처리한다. 그 외(가상계좌 발급 등)는 확인만 하고 넘어간다. */
type Action = 'paid' | 'cancelled' | 'failed' | 'ignore';

function actionOf(type: string): Action {
  if (type.endsWith('.Paid')) return 'paid';
  if (type.endsWith('.Cancelled') || type.endsWith('.PartialCancelled')) return 'cancelled';
  if (type.endsWith('.Failed')) return 'failed';
  return 'ignore';
}

export async function POST(req: NextRequest) {
  // ⚠️서명은 파싱 전 원문에 대해 계산된다 — req.json()을 먼저 부르면 검증이 깨진다.
  const raw = await req.text();

  const verdict = verifyPortOneWebhook(raw, req.headers);
  if (verdict.ok === false) {
    console.error(`[payments/webhook] 서명 검증 실패 — ${verdict.reason}`);
    return NextResponse.json({ error: 'invalid signature' }, { status: 401 });
  }
  if (verdict.ok === 'unconfigured') {
    console.warn('[payments/webhook] ⚠️PORTONE_WEBHOOK_SECRET 미설정 — 서명 검증 없이 처리합니다.');
  }

  const body = JSON.parse(raw) as { type?: string; data?: { paymentId?: string } } | null;
  const type = body?.type ?? '';
  const paymentId = body?.data?.paymentId;
  if (!paymentId) {
    // 결제와 무관한 이벤트(예: 빌링키) — 정상 수신으로 응답해 재시도를 막는다
    console.log(`[payments/webhook] paymentId 없음 type=${type} — 무시`);
    return NextResponse.json({ ok: true, skipped: 'no paymentId' });
  }

  const action = actionOf(type);
  if (action === 'ignore') {
    console.log(`[payments/webhook] 처리 대상 아님 type=${type} paymentId=${paymentId}`);
    return NextResponse.json({ ok: true, skipped: type });
  }

  await ensureSchemaOnce();

  const order = await getPaymentOrder(paymentId);
  if (!order) {
    // 우리가 만들지 않은 주문 — 다른 서비스의 웹훅이 잘못 온 것일 수 있다. 재시도 무의미.
    console.warn(`[payments/webhook] 주문 없음 paymentId=${paymentId} type=${type}`);
    return NextResponse.json({ ok: true, skipped: 'unknown order' });
  }

  // ★진실은 포트원 조회 결과뿐 — 웹훅 본문의 상태는 쓰지 않는다.
  let payment;
  try {
    payment = await fetchPortOnePayment(paymentId);
  } catch (err) {
    console.error(`[payments/webhook] 포트원 조회 실패 paymentId=${paymentId}:`, err);
    return NextResponse.json({ error: 'lookup failed' }, { status: 500 });   // 재시도 유도
  }

  const status = payment.status ?? '';
  const total = Number(payment.amount?.total ?? 0);
  const cancelled = Number(payment.amount?.cancelled ?? 0);

  try {
    if (status === 'CANCELLED' || cancelled > 0) {
      return await handleCancel(paymentId, order.status, total, cancelled);
    }
    if (status === 'PAID') {
      return await handlePaid(paymentId, order.amount, total);
    }
    if (status === 'FAILED') {
      await markPaymentFailed(paymentId);
      console.log(`[payments/webhook] 실패 처리 paymentId=${paymentId}`);
      return NextResponse.json({ ok: true, handled: 'failed' });
    }
    console.log(`[payments/webhook] 상태 변화 없음 paymentId=${paymentId} status=${status}`);
    return NextResponse.json({ ok: true, handled: 'noop', status });
  } catch (err) {
    console.error(`[payments/webhook] 처리 실패 paymentId=${paymentId} type=${type}:`, err);
    return NextResponse.json({ error: 'handler failed' }, { status: 500 });
  }
}

/** 취소 — 크레딧 회수. 부분취소는 자동 처리하지 않고 사람이 보게 남긴다. */
async function handleCancel(
  paymentId: string, orderStatus: string, total: number, cancelled: number,
): Promise<NextResponse> {
  if (cancelled > 0 && total > 0 && cancelled < total) {
    // 우리 상품엔 부분환불 개념이 없다(플랜 단위 충전). 자동으로 얼마를 뺄지 정할 근거가 없어
    // 임의 처리하지 않고 경고만 남긴다 — 잘못 빼는 것보다 알리고 손대는 편이 안전하다.
    console.warn(
      `[payments/webhook] ⚠️부분취소 감지 — 수동 확인 필요 paymentId=${paymentId} ` +
      `취소=${cancelled}/${total}`,
    );
    return NextResponse.json({ ok: true, handled: 'partial-cancel-manual' });
  }

  if (orderStatus === 'refunded') {
    return NextResponse.json({ ok: true, handled: 'already-refunded' });
  }
  if (orderStatus !== 'paid') {
    // 지급된 적 없는 주문의 취소 — 회수할 것이 없다(revoke도 같은 이유로 막지만 로그를 남긴다)
    console.log(`[payments/webhook] 미지급 주문 취소 paymentId=${paymentId} status=${orderStatus}`);
    await markPaymentFailed(paymentId);
    return NextResponse.json({ ok: true, handled: 'cancel-unsettled' });
  }

  const { balance, revoked } = await revokeRefundedCredits(paymentId);
  console.log(
    `[payments/webhook] ${revoked ? '크레딧 회수 완료' : '이미 회수됨'} ` +
    `paymentId=${paymentId} 잔액=${balance}`,
  );
  return NextResponse.json({ ok: true, handled: 'refunded', revoked, balance });
}

/** 결제 완료 — complete를 못 부른 경우(브라우저 종료 등)의 안전망. 지급은 멱등. */
async function handlePaid(paymentId: string, orderAmount: number, total: number): Promise<NextResponse> {
  if (total !== orderAmount) {
    // 금액 불일치는 절대 자동 지급하지 않는다(위조·설정 오류 가능성)
    console.error(
      `[payments/webhook] ⚠️금액 불일치 — 지급 보류 paymentId=${paymentId} ` +
      `주문=${orderAmount} 결제=${total}`,
    );
    return NextResponse.json({ ok: true, handled: 'amount-mismatch' });
  }
  const settled = await settlePaidOrder(paymentId);
  console.log(`[payments/webhook] 지급 ${settled.status} paymentId=${paymentId}`);
  return NextResponse.json({ ok: true, handled: settled.status });
}
