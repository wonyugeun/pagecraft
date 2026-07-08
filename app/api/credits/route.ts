import { NextResponse } from 'next/server';
import { getOrCreateBalance } from '@/lib/db';
import type { NextRequest } from 'next/server';
import { getSessionEmail } from '@/lib/authToken';

/**
 * GET /api/credits — 서버에서 로그인 유저의 크레딧 잔액 조회 (2단계).
 * 세션 email로 식별. row 없으면 신규 30 지급 후 반환.
 *
 * ★조회 전용 — 차감은 아직 클라(3단계에서 서버 이전). 이 라우트는 과금 0(DB만).
 * 미들웨어가 이미 /api/credits를 로그인 가드하지만, 방어적으로 세션 재확인 + email 추출.
 */
export async function GET(req: NextRequest) {
  const email = await getSessionEmail(req);
  if (!email) {
    return NextResponse.json({ error: '로그인이 필요해요.' }, { status: 401 });
  }
  try {
    const balance = await getOrCreateBalance(email);
    return NextResponse.json({ balance });
  } catch (err) {
    console.error('[credits] DB 조회 오류:', err);
    return NextResponse.json({ error: '크레딧 조회 중 오류가 발생했어요.' }, { status: 500 });
  }
}
