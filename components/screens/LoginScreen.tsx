'use client';

import { signIn } from 'next-auth/react';
import { useState } from 'react';

export default function LoginScreen() {
  const [loading, setLoading] = useState<'kakao' | 'google' | null>(null);

  const handleSignIn = async (provider: 'kakao' | 'google') => {
    setLoading(provider);
    // callbackUrl을 '/'로 고정 — 현재 URL의 error/callbackUrl 파라미터가 중첩 인코딩되는 버그 방지
    await signIn(provider, { callbackUrl: '/' });
  };

  return (
    <div className="login-shell">
      <div className="login-card">
        <div className="l-logo">Flik ✦</div>
        <div className="l-tag">
          카테고리별 전문 AI 상세페이지<br />
          3분 완성으로 매출을 바꿉니다
        </div>
        <span className="l-free">🎁 신규 가입 시 30크레딧 무료 지급</span>

        {/* 카카오 로그인 */}
        <button
          className="soc-btn kakao"
          onClick={() => handleSignIn('kakao')}
          disabled={loading !== null}
        >
          {loading === 'kakao' ? (
            <span style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid #00000033', borderTopColor: '#000', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          ) : (
            <span>💬</span>
          )}
          카카오로 시작하기
        </button>

        {/* 구글 로그인 */}
        <button
          className="soc-btn"
          onClick={() => handleSignIn('google')}
          disabled={loading !== null}
        >
          {loading === 'google' ? (
            <span style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid #ccc', borderTopColor: '#4285F4', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
          )}
          Google로 시작하기
        </button>

        <div className="l-terms">
          시작하면 <a href="/terms" target="_blank" rel="noopener noreferrer">이용약관</a> 및 <a href="/privacy" target="_blank" rel="noopener noreferrer">개인정보처리방침</a>에 동의합니다
        </div>
      </div>
    </div>
  );
}
