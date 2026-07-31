import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import type { NextRequest } from 'next/server';

/**
 * API 로그인 가드 — 돈 새는 구멍 차단.
 *
 * 과금(Claude/OpenAI/Gemini) API를 "로그인한 사용자만" 호출하게 한다.
 * - /api/* 전부 보호. 단 아래 둘만 제외한다.
 *   1) /api/auth/*          NextAuth 로그인 자체(여기가 막히면 아무도 로그인 못 함)
 *   2) /api/payments/webhook 포트원 → 우리 서버로 오는 서버 간 호출. 브라우저가 아니라
 *      세션 쿠키가 존재할 수 없다. 여기를 막으면 결제 취소·누락 알림이 전부 401로 튕겨
 *      "돈은 돌려줬는데 크레딧은 남는" 상태가 그대로 방치된다.
 *      ⚠️대신 무인증이 아니다 — 라우트가 HMAC 서명(PORTONE_WEBHOOK_SECRET)을 직접 검증하고,
 *        상태 판단은 본문이 아니라 포트원 API 재조회로만 한다.
 * - 공개 페이지(랜딩 / /login / 마케팅)는 매처에 없으므로 0접촉 — 그대로 열린다.
 * - 세션(JWT 쿠키)이 없으면 생성 로직이 돌기 전에 401 JSON으로 차단(과금 발생 안 함).
 *
 * 재사용: NextAuth jwt 세션 전략(lib/auth.ts, adapter 없음) + 같은 NEXTAUTH_SECRET.
 * 라우트 코드·크레딧 로직·블로그 생성 흐름은 한 줄도 안 건드림(인증 게이트만 앞단에 추가).
 *
 * 왜 미들웨어인가(라우트별 대신):
 *  - 한 파일에서 모든 /api를 덮어 "새 라우트 추가 시 가드 빼먹는 사고"를 원천 차단.
 *  - withAuth(리다이렉트)가 아니라 직접 401 JSON 반환 → API 클라이언트에 올바른 응답.
 */
export async function middleware(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) {
    return NextResponse.json(
      { error: '로그인이 필요해요. 로그인 후 다시 시도해 주세요.' },
      { status: 401 },
    );
  }
  return NextResponse.next();
}

export const config = {
  // /api/* 전부 보호하되 NextAuth와 포트원 웹훅만 제외. 공개 페이지는 매처에 없어 미접촉.
  // ⚠️여기에 경로를 추가한다는 것은 '로그인 없이 호출 가능해진다'는 뜻이다.
  //   그 라우트는 반드시 자체 인증(서명 검증 등)을 갖고 있어야 한다.
  matcher: ['/api/((?!auth|payments/webhook).*)'],
};
