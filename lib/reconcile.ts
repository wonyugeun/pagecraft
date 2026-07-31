import { sql, settlePaidOrder, markPaymentFailed, revokeRefundedCredits } from '@/lib/db';
import { fetchPortOnePayment } from '@/lib/portone';

/**
 * 결제 대사(對査) — 우리 DB와 포트원 원장을 맞춰본다(2026-07-31).
 *
 * ★웹훅이 있는데 왜 또 필요한가:
 *  웹훅은 유실될 수 있다(배포 중 다운타임, 시크릿 교체, 콘솔 설정 실수, 포트원 장애).
 *  '실시간 반영은 웹훅, 최종 정합성은 대사'가 결제 시스템의 기본 이중화다.
 *  돈이 걸린 곳에서 단일 경로만 믿지 않는다.
 *
 * ★진단(diagnose)과 교정(apply)을 완전히 분리했다. 무엇을 바꿀지 먼저 눈으로 보고 나서 실행한다.
 * ★모든 교정은 웹훅과 같은 멱등 함수를 쓰므로 중복 실행해도 안전하다.
 * ★API 라우트(app/api/admin/reconcile)와 점검 스크립트가 이 모듈을 공유한다 — 판정 규칙이
 *   두 벌 존재하면 반드시 어긋나므로, 규칙은 여기 한 곳에만 둔다.
 */

/* 미완료 주문을 '포기'로 볼 시간 — 결제 수단에 따라 성격이 완전히 다르다.
 *  READY(결제창은 띄웠으나 승인 전): 카드·간편결제는 길어야 몇 분이다. 1시간이면 이탈이 확실하다.
 *  입금 대기(가상계좌 등): 고객이 며칠 뒤 입금할 수 있으므로 함부로 정리하면 안 된다. */
const ABANDON_READY_HOURS = 1;
const ABANDON_DEPOSIT_HOURS = 24 * 7;

/** 고객의 입금을 기다리는 상태 — 오래 열어둬야 하는 것들 */
const AWAITING_DEPOSIT = ['VIRTUAL_ACCOUNT_ISSUED', 'PAY_PENDING'];

export interface OrderRow {
  payment_id: string; user_email: string; plan_id: string;
  amount: number; credits: number; status: string; created_at: string;
}

export type ReconcilePlan =
  | 'ok'                  // 일치 — 할 일 없음
  | 'settle'              // 포트원은 결제완료인데 우리는 미지급 → 지급
  | 'revoke'              // 포트원에서 취소됐는데 크레딧이 남음 → 회수
  | 'mark-failed'         // 결제 실패 확정 → 상태 정리
  | 'mark-abandoned'      // 결제창만 열고 이탈 → 상태 정리
  | 'amount-mismatch'     // 금액 불일치 → 자동 처리 금지(사람이 확인)
  | 'partial-cancel'      // 부분취소 → 자동 처리 금지(사람이 확인)
  | 'lookup-failed'       // 포트원 조회 실패
  | 'pending-recent';     // 아직 진행 중일 수 있음 → 대기

/** 자동 교정 대상이 아닌 판정 — 사람이 봐야 하거나, 그냥 두면 되는 것들 */
const NO_AUTO: ReconcilePlan[] = [
  'ok', 'pending-recent', 'amount-mismatch', 'partial-cancel', 'lookup-failed',
];

export interface Diff {
  paymentId: string; email: string; planId: string;
  ours: string; portone: string; amount: number; paidTotal: number;
  plan: ReconcilePlan; note: string;
  applied?: string;
}

/** 주문 1건을 포트원과 대조해 '무엇을 해야 하는지'만 판정한다(부작용 없음). */
export async function diagnose(o: OrderRow): Promise<Diff> {
  const base = {
    paymentId: o.payment_id, email: o.user_email, planId: o.plan_id,
    ours: o.status, amount: o.amount,
  };

  let payment;
  try {
    payment = await fetchPortOnePayment(o.payment_id);
  } catch (err) {
    return {
      ...base, portone: '?', paidTotal: 0, plan: 'lookup-failed',
      note: err instanceof Error ? err.message : '조회 실패',
    };
  }

  const status = payment.status ?? '?';
  const total = Number(payment.amount?.total ?? 0);
  const cancelled = Number(payment.amount?.cancelled ?? 0);
  const b = { ...base, portone: status, paidTotal: total };

  // 부분취소 — 플랜 단위 충전이라 자동으로 얼마를 뺄지 정할 근거가 없다
  if (cancelled > 0 && total > 0 && cancelled < total) {
    return { ...b, plan: 'partial-cancel', note: `부분취소 ${cancelled}/${total}원 — 수동 확인 필요` };
  }

  if (status === 'CANCELLED' || (cancelled > 0 && cancelled >= total)) {
    if (o.status === 'paid') return { ...b, plan: 'revoke', note: '포트원에서 취소됨 — 크레딧 회수 필요' };
    if (o.status === 'refunded') return { ...b, plan: 'ok', note: '취소 반영 완료' };
    return { ...b, plan: 'mark-failed', note: '미지급 주문의 취소' };
  }

  if (status === 'PAID') {
    if (total !== o.amount) {
      return { ...b, plan: 'amount-mismatch', note: `주문 ${o.amount}원 ≠ 결제 ${total}원 — 수동 확인 필요` };
    }
    if (o.status === 'paid') return { ...b, plan: 'ok', note: '정상' };
    if (o.status === 'refunded') {
      return { ...b, plan: 'amount-mismatch', note: '우리는 환불 처리했는데 포트원은 결제완료 — 수동 확인 필요' };
    }
    return { ...b, plan: 'settle', note: '결제됐는데 크레딧 미지급 — 지급 필요' };
  }

  if (status === 'FAILED') {
    return o.status === 'pending'
      ? { ...b, plan: 'mark-failed', note: '결제 실패 확정' }
      : { ...b, plan: 'ok', note: '정리됨' };
  }

  // READY / PAY_PENDING / VIRTUAL_ACCOUNT_ISSUED 등 — 아직 끝나지 않은 결제
  if (o.status === 'pending') {
    const ageHours = (Date.now() - new Date(o.created_at).getTime()) / 3_600_000;
    const waiting = AWAITING_DEPOSIT.includes(status);
    const limit = waiting ? ABANDON_DEPOSIT_HOURS : ABANDON_READY_HOURS;
    if (ageHours <= limit) {
      return { ...b, plan: 'pending-recent', note: waiting ? '입금 대기 중' : '결제 진행 중일 수 있어 대기' };
    }
    return {
      ...b, plan: 'mark-abandoned',
      note: waiting
        ? `${Math.floor(ageHours / 24)}일간 미입금 — 만료로 판단`
        : `${Math.floor(ageHours)}시간 경과 — 결제창 이탈로 판단`,
    };
  }
  return { ...b, plan: 'ok', note: '' };
}

/** 판정에 따라 실제로 고친다. 모든 교정은 멱등 함수를 통해서만 수행한다. */
export async function applyDiff(d: Diff): Promise<string> {
  switch (d.plan) {
    case 'settle': {
      const r = await settlePaidOrder(d.paymentId);
      return `지급 ${r.status}`;
    }
    case 'revoke': {
      const r = await revokeRefundedCredits(d.paymentId);
      return r.revoked ? `크레딧 회수 완료(잔액 ${r.balance})` : '이미 회수됨';
    }
    case 'mark-failed':
    case 'mark-abandoned':
      await markPaymentFailed(d.paymentId);
      return '상태 정리';
    default:
      return '건너뜀';
  }
}

export interface ReconcileResult {
  mode: 'dry-run' | 'applied';
  checked: number;
  summary: Record<string, number>;
  problems: Diff[];
  all?: Diff[];
}

/** 대사 실행 — doApply=false면 아무것도 바꾸지 않고 진단만 한다. */
export async function reconcilePayments(
  { doApply = false, includeAll = false, limit = 200 } = {},
): Promise<ReconcileResult> {
  // 기본은 '아직 움직일 수 있는' 주문만 본다. 종료된 건까지 매번 조회하면 포트원 API가 낭비된다.
  const orders = (includeAll
    ? await sql`SELECT payment_id, user_email, plan_id, amount, credits, status, created_at
                FROM payment_orders ORDER BY created_at DESC LIMIT ${limit}`
    : await sql`SELECT payment_id, user_email, plan_id, amount, credits, status, created_at
                FROM payment_orders WHERE status IN ('pending', 'paid')
                ORDER BY created_at DESC LIMIT ${limit}`) as unknown as OrderRow[];

  const diffs: Diff[] = [];
  for (const o of orders) {
    const d = await diagnose(o);
    if (doApply && !NO_AUTO.includes(d.plan)) {
      try {
        d.applied = await applyDiff(d);
      } catch (err) {
        d.applied = `실패: ${err instanceof Error ? err.message : '알 수 없음'}`;
        console.error(`[reconcile] 교정 실패 paymentId=${d.paymentId}:`, err);
      }
    }
    diffs.push(d);
  }

  const summary = diffs.reduce<Record<string, number>>((acc, d) => {
    acc[d.plan] = (acc[d.plan] ?? 0) + 1;
    return acc;
  }, {});

  console.log(`[reconcile] ${doApply ? '교정' : '진단'} ${orders.length}건 — ${JSON.stringify(summary)}`);
  return {
    mode: doApply ? 'applied' : 'dry-run',
    checked: orders.length,
    summary,
    problems: diffs.filter(d => d.plan !== 'ok' && d.plan !== 'pending-recent'),
    all: includeAll ? diffs : undefined,
  };
}
