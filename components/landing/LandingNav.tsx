'use client';

import { useState } from 'react';
import Link from 'next/link';
import { signIn } from 'next-auth/react';

const NAV_LINKS = [
  { label: '서비스 소개', href: '/about' },
  { label: '기능', href: '/features' },
  { label: '템플릿', href: '/templates' },
  { label: '요금제', href: '/pricing' },
  { label: '가이드', href: '/guide' },
];

export default function LandingNav() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [hoverLogin, setHoverLogin] = useState(false);
  const [hoverCta, setHoverCta] = useState(false);

  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 500,
      background: 'rgba(255,255,255,0.96)',
      backdropFilter: 'blur(16px)',
      borderBottom: '1px solid #F0EEF8',
      padding: '0 36px',
      height: '64px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      fontFamily: "'Pretendard','Noto Sans KR',sans-serif",
    }}>
      {/* 로고 */}
      <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
        <div style={{
          width: '32px', height: '32px', background: '#6E5BFB',
          borderRadius: '8px', display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: '16px', fontWeight: 800, color: '#fff',
        }}>
          P
        </div>
        <span style={{ fontSize: '17px', fontWeight: 700, color: '#191F28', letterSpacing: '-0.02em' }}>
          PageCraft
        </span>
      </Link>

      {/* 데스크탑 메뉴 */}
      <div style={{ display: 'flex', gap: '32px', alignItems: 'center' }} className="landing-nav-menu">
        {NAV_LINKS.map(l => (
          <Link
            key={l.href}
            href={l.href}
            style={{ fontSize: '14px', color: '#4E5968', textDecoration: 'none', fontWeight: 500, transition: 'color 150ms' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#6E5BFB')}
            onMouseLeave={e => (e.currentTarget.style.color = '#4E5968')}
          >
            {l.label}
          </Link>
        ))}
      </div>

      {/* 우측 버튼 */}
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
        <button
          onClick={() => signIn('google')}
          onMouseEnter={() => setHoverLogin(true)}
          onMouseLeave={() => setHoverLogin(false)}
          style={{
            background: 'transparent',
            border: `1px solid ${hoverLogin ? '#CBD2D9' : '#E8ECF0'}`,
            borderRadius: '8px', padding: '8px 18px',
            fontSize: '14px', fontWeight: 500,
            color: hoverLogin ? '#191F28' : '#4E5968',
            cursor: 'pointer', transition: 'all 150ms',
            fontFamily: 'inherit',
          }}
        >
          로그인
        </button>
        <button
          onClick={() => signIn('google')}
          onMouseEnter={() => setHoverCta(true)}
          onMouseLeave={() => setHoverCta(false)}
          style={{
            background: hoverCta ? '#5447D9' : '#6E5BFB',
            border: 'none', borderRadius: '8px',
            padding: '8px 20px', fontSize: '14px', fontWeight: 600,
            color: '#fff', cursor: 'pointer', transition: 'background 150ms',
            fontFamily: 'inherit',
            boxShadow: '0 2px 8px rgba(110,91,251,0.25)',
          }}
        >
          무료로 시작하기
        </button>

        {/* 모바일 햄버거 */}
        <button
          onClick={() => setMobileOpen(v => !v)}
          className="landing-hamburger"
          style={{
            background: 'transparent', border: 'none',
            cursor: 'pointer', padding: '4px', display: 'none',
            flexDirection: 'column', gap: '5px',
          }}
        >
          {[0, 1, 2].map(i => (
            <span key={i} style={{ display: 'block', width: '22px', height: '2px', background: '#4E5968', borderRadius: '2px' }} />
          ))}
        </button>
      </div>

      {/* 모바일 드롭다운 */}
      {mobileOpen && (
        <div style={{
          position: 'absolute', top: '64px', left: 0, right: 0,
          background: '#fff', borderBottom: '1px solid #F0EEF8',
          padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: '16px',
          zIndex: 501,
        }}>
          {NAV_LINKS.map(l => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setMobileOpen(false)}
              style={{ fontSize: '15px', color: '#4E5968', textDecoration: 'none', fontWeight: 500 }}
            >
              {l.label}
            </Link>
          ))}
          <button
            onClick={() => signIn('google')}
            style={{
              background: '#6E5BFB', border: 'none', borderRadius: '8px',
              padding: '12px', fontSize: '15px', fontWeight: 600,
              color: '#fff', cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            무료로 시작하기
          </button>
        </div>
      )}
    </nav>
  );
}
