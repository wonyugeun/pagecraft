import type { Metadata } from 'next';
import './globals.css';
import NextAuthProvider from '@/components/providers/NextAuthProvider';

export const metadata: Metadata = {
  title: 'PageCraft — AI 상세페이지 메이커',
  description: '카테고리별 전문 AI 상세페이지 3분 완성',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <NextAuthProvider>{children}</NextAuthProvider>
      </body>
    </html>
  );
}
