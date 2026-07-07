import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { deductCreditsAtomic, GENERATION_COST } from '@/lib/db';

/**
 * POST /api/credits/deduct — ★서버 원자적 차감 (3단계). 생성 성공 후 클라가 1회 호출.
 *
 * - 금액은 ★서버 고정(GENERATION_COST). 클라가 보낸 금액은 무시 = 조작 방지.
 * - 유저는 세션 email로 식별(미들웨어 가드 + 여기서 재확인).
 * - 멱등키(idempotencyKey)로 이중차감 방지. 같은 키 재호출 → 차감 안 하고 현재 잔액 반환(200).
 * - 잔액 부족 → 402, 차감 0.
 *
 * 입력: { idempotencyKey: string }   (amount는 받지 않음 — 서버가 정함)
 * 출력: { balance, status }          status: deducted | duplicate | insufficient
 */
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: '로그인이 필요해요.' }, { status: 401 });

  let idempotencyKey: string | undefined;
  try {
    ({ idempotencyKey } = await req.json() as { idempotencyKey?: string });
  } catch { /* 빈 본문 등 */ }
  if (!idempotencyKey || typeof idempotencyKey !== 'string') {
    return NextResponse.json({ error: 'idempotencyKey가 필요해요.' }, { status: 400 });
  }

  try {
    const r = await deductCreditsAtomic(email, GENERATION_COST, idempotencyKey, 'generation');
    if (r.status === 'insufficient') {
      return NextResponse.json({ error: '크레딧이 부족해요.', code: 'insufficient_credits', balance: r.balance, status: r.status }, { status: 402 });
    }
    // deducted | duplicate 모두 200 — 멱등(같은 생성 재호출은 추가 차감 없이 현재 잔액)
    return NextResponse.json({ balance: r.balance, status: r.status });
  } catch (err) {
    console.error('[credits/deduct] DB 오류:', err);
    return NextResponse.json({ error: '크레딧 차감 중 오류가 발생했어요.' }, { status: 500 });
  }
}
