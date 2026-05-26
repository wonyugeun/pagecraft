'use client';

import { useState } from 'react';
import Link from 'next/link';
import { IconBrandKakoTalk } from '@tabler/icons-react';

const FOOTER_COLS = [
  {
    title: '서비스',
    links: [
      { label: '서비스 소개', href: '/about' },
      { label: '기능 안내', href: '/features' },
      { label: '템플릿 갤러리', href: '/templates' },
    ],
  },
  {
    title: '고객 지원',
    links: [
      { label: '사용 가이드', href: '/guide' },
      { label: 'FAQ', href: '/faq' },
      { label: '문의하기', href: '/contact' },
    ],
  },
  {
    title: '회사 정보',
    links: [
      { label: '회사 소개', href: '/company' },
      { label: '이용 약관', href: '/terms' },
      { label: '개인정보 처리방침', href: '/privacy' },
    ],
  },
];

export default function LandingFooter() {
  const [kakaoHov, setKakaoHov] = useState(false);

  return (
    <footer style={{
      background: '#FAFAFA',
      borderTop: '1px solid #F0EEF8',
      padding: '64px 0 40px',
      fontFamily: "'Pretendard','Noto Sans KR',sans-serif",
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 36px' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1.5fr 1fr 1fr 1fr 1.5fr',
          gap: '40px',
          marginBottom: '56px',
        }} className="footer-grid">
          {/* 로고 + 설명 */}
          <div>
            <Link href="/" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <div style={{
                width: '28px', height: '28px', background: '#6E5BFB',
                borderRadius: '7px', display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: '14px', fontWeight: 800, color: '#fff',
              }}>
                P
              </div>
              <span style={{ fontSize: '16px', fontWeight: 700, color: '#191F28', letterSpacing: '-0.02em' }}>
                PageCraft
              </span>
            </Link>
            <p style={{ fontSize: '13px', color: '#8B95A1', lineHeight: 1.7 }}>
              AI가 만드는 카테고리 맞춤<br />
              상세페이지 자동 완성 서비스
            </p>
          </div>

          {/* 링크 컬럼들 */}
          {FOOTER_COLS.map(col => (
            <div key={col.title}>
              <div style={{
                fontSize: '13px', fontWeight: 700, color: '#191F28',
                marginBottom: '16px', letterSpacing: '-0.01em',
              }}>
                {col.title}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {col.links.map(link => (
                  <Link
                    key={link.href}
                    href={link.href}
                    style={{ fontSize: '13px', color: '#8B95A1', textDecoration: 'none', transition: 'color 150ms' }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#6E5BFB')}
                    onMouseLeave={e => (e.currentTarget.style.color = '#8B95A1')}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}

          {/* 카카오 채널 */}
          <div>
            <div style={{
              fontSize: '13px', fontWeight: 700, color: '#191F28', marginBottom: '10px',
            }}>
              PageCraft 카카오톡 채널
            </div>
            <p style={{ fontSize: '12px', color: '#8B95A1', lineHeight: 1.6, marginBottom: '14px' }}>
              업데이트 소식과 셀러 인사이트를<br />받아보세요
            </p>
            <a
              href="#"
              onMouseEnter={() => setKakaoHov(true)}
              onMouseLeave={() => setKakaoHov(false)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '8px',
                background: kakaoHov ? '#F4D900' : '#FEE500',
                border: 'none', borderRadius: '8px',
                padding: '10px 16px', fontSize: '13px', fontWeight: 700,
                color: '#191F28', cursor: 'pointer', textDecoration: 'none',
                transition: 'background 150ms',
                fontFamily: 'inherit',
              }}
            >
              <IconBrandKakoTalk size={18} color="#191F28" stroke={1.8} />
              채널 추가하기
            </a>
          </div>
        </div>

        {/* 하단 카피라이트 */}
        <div style={{
          borderTop: '1px solid #EBEBEB', paddingTop: '28px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: '12px',
        }}>
          <span style={{ fontSize: '12px', color: '#B0B8C1' }}>
            © 2026 PageCraft. All rights reserved.
          </span>
          <div style={{ display: 'flex', gap: '20px' }}>
            {[
              { label: '이용약관', href: '/terms' },
              { label: '개인정보처리방침', href: '/privacy' },
              { label: '회사 소개', href: '/company' },
            ].map(t => (
              <Link
                key={t.href}
                href={t.href}
                style={{ fontSize: '12px', color: '#B0B8C1', textDecoration: 'none' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#6E5BFB')}
                onMouseLeave={e => (e.currentTarget.style.color = '#B0B8C1')}
              >
                {t.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
