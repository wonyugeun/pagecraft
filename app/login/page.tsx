'use client';

import { useState } from 'react';
import Link from 'next/link';
import { signIn } from 'next-auth/react';

export default function LoginPage() {
  const [loading, setLoading] = useState<'google' | 'kakao' | null>(null);

  const handleSignIn = async (provider: 'google' | 'kakao') => {
    if (loading) return;
    setLoading(provider);
    await signIn(provider, { callbackUrl: '/' });
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #F4F0FF 0%, #FAFAFC 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      fontFamily: "'Pretendard', 'Noto Sans KR', sans-serif",
    }}>
      <div style={{
        background: '#FFFFFF',
        width: '100%',
        maxWidth: '440px',
        padding: 'clamp(32px, 5vw, 48px) clamp(24px, 5vw, 40px)',
        borderRadius: '24px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.04)',
      }}>

        {/* 로고 */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '32px' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
            <div style={{
              width: '36px', height: '36px', background: '#6E5BFB',
              borderRadius: '9px', display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: '18px', fontWeight: 800, color: '#fff',
            }}>
              P
            </div>
            <span style={{ fontSize: '18px', fontWeight: 700, color: '#191F28', letterSpacing: '-0.02em' }}>
              PageCraft
            </span>
          </Link>
        </div>

        {/* 타이틀 */}
        <h1 style={{
          fontSize: '24px', fontWeight: 700, color: '#111111',
          textAlign: 'center', marginBottom: '8px', letterSpacing: '-0.02em',
        }}>
          PageCraft 시작하기
        </h1>

        {/* 부제 */}
        <p style={{
          fontSize: '14px', color: '#666666', textAlign: 'center',
          lineHeight: 1.6, marginBottom: '32px',
        }}>
          AI가 만드는 고퀄리티 상세페이지, 단 3분 만에
        </p>

        {/* 구글 버튼 */}
        <button
          onClick={() => handleSignIn('google')}
          disabled={loading !== null}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: '10px', width: '100%',
            background: loading === 'google' ? '#F5F5F5' : '#FFFFFF',
            border: '1px solid #ECECF2', borderRadius: '16px',
            padding: '14px 20px', fontSize: '15px', fontWeight: 500,
            color: '#111111', cursor: loading ? 'default' : 'pointer',
            transition: 'background 150ms',
            marginBottom: '12px', fontFamily: 'inherit',
            opacity: loading === 'kakao' ? 0.5 : 1,
          }}
          onMouseEnter={e => { if (!loading) e.currentTarget.style.background = '#FAFAFC'; }}
          onMouseLeave={e => { if (!loading) e.currentTarget.style.background = '#FFFFFF'; }}
        >
          {loading === 'google' ? (
            <span style={{
              width: '18px', height: '18px', flexShrink: 0,
              border: '2px solid #ccc', borderTopColor: '#4285F4',
              borderRadius: '50%', display: 'inline-block',
              animation: 'spin 0.8s linear infinite',
            }} />
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
          )}
          {loading === 'google' ? '로그인 중...' : '구글로 계속하기'}
        </button>

        {/* 카카오 버튼 */}
        <button
          onClick={() => handleSignIn('kakao')}
          disabled={loading !== null}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: '10px', width: '100%',
            background: loading === 'kakao' ? '#F4D900' : '#FEE500',
            border: 'none', borderRadius: '16px',
            padding: '14px 20px', fontSize: '15px', fontWeight: 500,
            color: '#000000', cursor: loading ? 'default' : 'pointer',
            transition: 'background 150ms',
            fontFamily: 'inherit',
            opacity: loading === 'google' ? 0.5 : 1,
          }}
          onMouseEnter={e => { if (!loading) e.currentTarget.style.background = '#F4D900'; }}
          onMouseLeave={e => { if (!loading) e.currentTarget.style.background = '#FEE500'; }}
        >
          {loading === 'kakao' ? (
            <span style={{
              width: '18px', height: '18px', flexShrink: 0,
              border: '2px solid #00000033', borderTopColor: '#000',
              borderRadius: '50%', display: 'inline-block',
              animation: 'spin 0.8s linear infinite',
            }} />
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
              <path fillRule="evenodd" clipRule="evenodd"
                d="M12 3C6.477 3 2 6.582 2 11c0 2.83 1.674 5.316 4.2 6.84l-.87 3.24a.3.3 0 0 0 .452.327L9.72 18.9A11.84 11.84 0 0 0 12 19c5.523 0 10-3.582 10-8s-4.477-8-10-8z"
                fill="#000000"
              />
            </svg>
          )}
          {loading === 'kakao' ? '로그인 중...' : '카카오로 계속하기'}
        </button>

        {/* 약관 */}
        <p style={{
          marginTop: '24px', fontSize: '12px', color: '#888888',
          textAlign: 'center', lineHeight: 1.6,
        }}>
          로그인 시{' '}
          <Link href="/terms" style={{ color: '#6E5BFB', textDecoration: 'none' }}>이용약관</Link>
          {' '}및{' '}
          <Link href="/privacy" style={{ color: '#6E5BFB', textDecoration: 'none' }}>개인정보처리방침</Link>
          에 동의하게 됩니다
        </p>
      </div>

      <style>{`
        @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.css');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
