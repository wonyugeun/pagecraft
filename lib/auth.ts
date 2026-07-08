import type { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import KakaoProvider from 'next-auth/providers/kakao';

// ★세션 쿠키 이름 명시(프로덕션 __Secure- 프리픽스 미인식 401 수정) —
//   getServerSession(라우트)·getToken(미들웨어)·NextAuth 핸들러가 전부 같은 쿠키 이름을 읽게 고정.
//   dev(http): 프리픽스 없음 → 로컬 로그인 유지 / prod(https): __Secure- → 기존 로그인 쿠키와 동일 이름이라 재로그인 불필요.
const useSecureCookies = process.env.NODE_ENV === 'production';
const cookiePrefix = useSecureCookies ? '__Secure-' : '';

export const authOptions: NextAuthOptions = {
  debug: process.env.NODE_ENV === 'development',

  useSecureCookies,
  cookies: {
    sessionToken: {
      name: `${cookiePrefix}next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: useSecureCookies,
      },
    },
  },

  providers: [
    GoogleProvider({
      clientId:     process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    KakaoProvider({
      clientId:     process.env.KAKAO_CLIENT_ID!,
      clientSecret: process.env.KAKAO_CLIENT_SECRET ?? '',
    }),
  ],

  secret: process.env.NEXTAUTH_SECRET,

  pages: {
    signIn: '/login',
  },

  callbacks: {
    async redirect({ url, baseUrl }) {
      // 로그인 성공/실패 후 항상 baseUrl(/)로 리다이렉트 — 중첩 callbackUrl 방지
      if (url.startsWith(baseUrl)) return url;
      return baseUrl;
    },
    async jwt({ token, user }) {
      if (user?.id) token.uid = user.id;
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string }).id = token.uid as string | undefined;
      }
      return session;
    },
  },
};
