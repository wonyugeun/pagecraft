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
 * 반환: 로그인 계정 식별자. 이메일 있으면 email 그대로, 없으면(카카오 선택동의 거절 등)
 *   provider+sub 합성 키(예: "kakao:123456") 폴백. 둘 다 없으면 null.
 *   ★이메일 우선이라 기존 이메일 유저(구글·이메일 있는 카카오)는 키 불변 = 마이그레이션 0.
 *   합성 키는 신규 계정(충돌 없음)이라 credits.user_email(TEXT)에 그대로 쓰여 30 지급됨.
 * ⚠️인증 게이트·크레딧 로직은 불변 — 계정 식별자 획득 방식만 확장.
 */
export async function getSessionEmail(req: NextRequest): Promise<string | null> {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return null;
  const email = token.email;
  if (typeof email === 'string' && email) return email;   // 이메일 우선(기존 유저 키 불변)
  // 이메일 미제공 폴백 — provider+sub 합성 키(안정: sub=프로바이더 계정 id, 로그인마다 동일).
  const provider = typeof token.provider === 'string' ? token.provider : null;
  const sub = typeof token.sub === 'string' ? token.sub
            : typeof token.uid === 'string' ? token.uid
            : null;
  return provider && sub ? `${provider}:${sub}` : null;
}
