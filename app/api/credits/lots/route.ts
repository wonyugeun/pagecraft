import { NextRequest, NextResponse } from 'next/server';
import { getSessionEmail } from '@/lib/authToken';
import { sql, ensureSchemaOnce, sweepExpiredCredits } from '@/lib/db';

/**
 * 충전 내역·유효기간 조회(2026-07-30).
 *
 * 셀러가 "언제 충전한 크레딧이 언제까지인지"를 볼 수 있게 한다.
 * ★조회 전에 만료 소멸을 먼저 수행 — 만료된 묶음이 남은 것처럼 보이지 않게.
 * ★소비는 만료 임박 묶음부터(FIFO)이므로 잔여량은 여기서 총 잔액을 만료 순서대로 배분해 추정한다.
 *   (묶음별 소비를 따로 기록하지 않는 설계 — lib/db.ts sweepExpiredCredits 주석 참고)
 */
export async function GET(req: NextRequest) {
  await ensureSchemaOnce();
  const email = await getSessionEmail(req);
  if (!email) return NextResponse.json({ error: '로그인이 필요해요.' }, { status: 401 });

  await sweepExpiredCredits(email);

  const [balRows, lotRows] = await Promise.all([
    sql`SELECT balance FROM credits WHERE user_email = ${email}`,
    sql`SELECT id, amount, kind, plan_id, expires_at, created_at
        FROM credit_lots
        WHERE user_email = ${email} AND swept_at IS NULL
          AND (expires_at IS NULL OR expires_at > now())
        ORDER BY expires_at NULLS LAST, id`,
  ]);

  const balance = Number((balRows[0] as { balance?: number } | undefined)?.balance ?? 0);

  // 만료 임박 순으로 잔액을 배분 → 묶음별 남은 수량 추정
  let left = balance;
  const lots = (lotRows as Array<Record<string, unknown>>).map(r => {
    const amount = Number(r.amount);
    const remaining = Math.max(0, Math.min(amount, left));
    left -= remaining;
    return {
      amount,
      remaining,
      kind: String(r.kind),                       // trial | purchase | refund
      planId: r.plan_id ? String(r.plan_id) : null,
      chargedAt: r.created_at ? new Date(String(r.created_at)).toISOString() : null,
      expiresAt: r.expires_at ? new Date(String(r.expires_at)).toISOString() : null,
    };
  }).filter(l => l.remaining > 0);   // 이미 다 쓴 묶음은 숨김

  // ★lot 도입(2026-07-30) 이전에 받은 크레딧은 기록이 없어 만료 대상이 아니다.
  //   잔액에서 묶음 합계를 뺀 나머지를 '기존 크레딧(무기한)'으로 따로 알려준다.
  //   (이걸 안 내리면 "잔액 77인데 내역엔 20개"처럼 보여 셀러가 혼란스럽다.)
  const unlinked = Math.max(0, left);

  return NextResponse.json({ balance, lots, unlinked });
}
