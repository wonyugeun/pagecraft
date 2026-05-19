import type { NextAuthOptions, Profile } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';

/* ── Kakao 프로필 타입 ── */
interface KakaoProfile extends Profile {
  id: number;
  kakao_account?: {
    email?: string;
    profile?: {
      nickname?: string;
      profile_image_url?: string;
    };
  };
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId:     process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    {
      id:   'kakao',
      name: '카카오',
      type: 'oauth',
      authorization: {
        url:    'https://kauth.kakao.com/oauth/authorize',
        params: { scope: 'profile_nickname profile_image account_email' },
      },
      token:    'https://kauth.kakao.com/oauth/token',
      userinfo: 'https://kapi.kakao.com/v2/user/me',
      clientId:     process.env.KAKAO_CLIENT_ID,
      clientSecret: process.env.KAKAO_CLIENT_SECRET ?? '',
      profile(profile: KakaoProfile) {
        return {
          id:    String(profile.id),
          name:  profile.kakao_account?.profile?.nickname ?? '카카오 사용자',
          email: profile.kakao_account?.email ?? null,
          image: profile.kakao_account?.profile?.profile_image_url ?? null,
        };
      },
    },
  ],

  secret: process.env.NEXTAUTH_SECRET,

  pages: {
    signIn: '/',   // 우리 앱 루트가 로그인 화면
  },

  callbacks: {
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
