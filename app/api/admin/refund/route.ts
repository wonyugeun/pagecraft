import { NextRequest, NextResponse } from 'next/server';
import { getSessionEmail } from '@/lib/authToken';
import { ensureSchemaOnce, evaluateRefund, revokeRefundedCredits, sql } from '@/lib/db';
import { cancelPortOnePayment, isAdminEmail } from '@/lib/portone';

/**
 * 관리자 환불(2026-07-30) — ADMIN_EMAILS에 등록된 계정만 사용 가능.
 *
 * ★정책: 결제 후 7일 이내 + 충전분 미사용 + 결제 이후 다운로드 없음 → 전액 환불.
 *   (후커블 정책을 참고하되 '할인가 구매 시 환불 불가'는 채택하지 않았다 — 할인이라는 이유만으로
 *    청약철회를 배제하는 조항은 전자상거래법상 무효 소지가 있고, 현재 전 플랜이 특가라 사실상
 *    모든 결제를 환불 불가로 만든다.)
 *
 * ★GET  = 미리보기(판정만, 아무것도 바꾸지 않음) — 돈이 걸린 작업이라 반드시 먼저 확인한다.
 * ★POST = 실행: 포트원 결제 취소 → 성공 시에만 크레딧 회수.
 *   순서가 중요하다. 크레딧을 먼저 회수하면 취소 실패 시 고객은 돈도 크레딧도 없는 상태가 된다.
 */
export const maxDuration = 60;

async function guard(req: NextRequest) {
  await ensureSchemaOnce();
  const email = await getSessionEmail(req);
  if (!email) return { error: NextResponse.json({ error: '로그인이 필요해요.' }, { status: 401 }) };
  if (!isAdminEmail(email)) return { error: NextResponse.json({ error: '권한이 없어요.' }, { status: 403 }) };
  return { email };
}

/** 미리보기 — /api/admin/refund?paymentId=... 또는 ?email=... (최근 결제 목록) */
export async function GET(req: NextRequest) {
  const g = await guard(req);
  if (g.error) return g.error;

  const paymentId = req.nextUrl.searchParams.get('paymentId');
  const email = req.nextUrl.searchParams.get('email');

  if (paymentId) {
    const ev = await evaluateRefund(paymentId);
    if (!ev) return NextResponse.json({ error: '주문을 찾을 수 없어요.' }, { status: 404 });
    return NextResponse.json({ paymentId, ...ev });
  }

  // 결제 목록(관리자 조회) — 최근 30건, email 지정 시 해당 계정만
  const rows = email
    ? await sql`SELECT payment_id, user_email, plan_id, amount, credits, status, paid_at, created_at
                FROM payment_orders WHERE user_email = ${email} ORDER BY created_at DESC LIMIT 30`
    : await sql`SELECT payment_id, user_email, plan_id, amount, credits, status, paid_at, created_at
                FROM payment_orders ORDER BY created_at DESC LIMIT 30`;
  return NextResponse.json({ orders: rows });
}

/** 실행 — { paymentId, reason } */
export async function POST(req: NextRequest) {
  const g = await guard(req);
  if (g.error) return g.error;

  const { paymentId, reason, force } = await req.json() as
    { paymentId?: string; reason?: string; force?: boolean };
  if (!paymentId) return NextResponse.json({ error: 'paymentId가 필요해요.' }, { status: 400 });

  const ev = await evaluateRefund(paymentId);
  if (!ev) return NextResponse.json({ error: '주문을 찾을 수 없어요.' }, { status: 404 });

  // force는 정책 예외(고객 응대상 재량) — 사용 시 로그에 남긴다.
  if (!ev.eligible && !force) {
    return NextResponse.json({ error: `환불 조건 미충족: ${ev.reason}`, evaluation: ev }, { status: 409 });
  }
  if (!ev.eligible && force) {
    console.warn(`[admin/refund] ⚠️정책 예외 환불 paymentId=${paymentId} 사유=${ev.reason} 관리자=${g.email}`);
  }

  // 1) 포트원 결제 취소 — 실패하면 크레딧은 건드리지 않는다
  try {
    await cancelPortOnePayment(paymentId, reason?.slice(0, 100) || '고객 요청 환불');
  } catch (err) {
    console.error('[admin/refund] 포트원 취소 실패:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : '결제 취소에 실패했어요.', stage: 'portone' },
      { status: 502 },
    );
  }

  // 2) 크레딧 회수(멱등)
  try {
    const { balance } = await revokeRefundedCredits(paymentId);
    console.log(`[admin/refund] 완료 paymentId=${paymentId} 금액=${ev.amount} 크레딧회수=${ev.credits} 잔액=${balance}`);
    return NextResponse.json({ status: 'refunded', amount: ev.amount, credits: ev.credits, balance });
  } catch (err) {
    // 돈은 취소됐는데 크레딧 회수만 실패 — 수동 확인이 필요하므로 명확히 알린다
    console.error(`[admin/refund] ⚠️결제는 취소됐으나 크레딧 회수 실패 paymentId=${paymentId}:`, err);
    return NextResponse.json(
      { error: '결제는 취소됐지만 크레딧 회수에 실패했어요. 수동 확인이 필요합니다.', stage: 'revoke' },
      { status: 500 },
    );
  }
}
