import { getToken } from 'next-auth/jwt';
import type { NextRequest } from 'next/server';

/**
 * 라우트 인증 — 미들웨어와 동일한 getToken으로 세션 email을 읽는다.
 *
 * getServerSession(v4)이 App Router 라우트 핸들러에서 프로덕션 __Secure- 프리픽스
 * 세션 쿠키를 인식 못 해 401 나던 이슈 대체(진단·커밋 6ce16b1 이후에도 잔존).
 * getToken은 middleware.ts에서 프로덕션 쿠키를 실제로 통과시키는 검증된 경로라,
 * 라우트 인증을 이 함수로 통일하면 미들웨어·NextAuth 핸들러와 같은 쿠키를 읽어 일치한다.
 *
 * 반환: 로그인 email(JWT의 email 클레임). 없으면 null.
 * ⚠️인증 게이트·크레딧 로직은 불변 — email 획득 방식만 교체.
 */
export async function getSessionEmail(req: NextRequest): Promise<string | null> {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const email = token?.email;
  return typeof email === 'string' ? email : null;
}
