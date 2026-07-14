'use client';

import Link from 'next/link';
import { IconBrandKakoTalk } from '@tabler/icons-react';

// ★문의 이메일(베타 운영). 법적 페이지·mailto 공통.
const CONTACT_EMAIL = 'flik.support@gmail.com';

// 실제 페이지 있는 것만(약관·개인정보) + 문의(mailto). 빈 페이지로 가던 죽은 링크(서비스소개·기능안내·
// 템플릿·가이드·FAQ·회사소개)는 제거 — 페이지 생기면 다시 추가.
const FOOTER_COLS: { title: string; links: { label: string; href: string; external?: boolean }[] }[] = [
  {
    title: '고객 지원',
    links: [
      { label: '자주 묻는 질문', href: '/faq' },   // 콘텐츠 있는 /faq 라우트 연결(고아 페이지 해소)
      { label: '문의하기', href: `mailto:${CONTACT_EMAIL}`, external: true },
    ],
  },
  {
    title: '약관·정책',
    links: [
      { label: '이용약관', href: '/terms' },
      { label: '개인정보 처리방침', href: '/privacy' },
    ],
  },
];

export default function LandingFooter() {

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
          gridTemplateColumns: '1.5fr 1fr 1fr 1.5fr',
          gap: '40px',
          marginBottom: '56px',
        }} className="footer-grid">
          {/* 로고 + 설명 */}
          <div>
            <Link href="/" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/logo-flik.png" alt="Flik" style={{ height: '26px', width: 'auto', objectFit: 'contain', display: 'block' }} />
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
                {col.links.map(link => {
                  const linkStyle = { fontSize: '13px', color: '#8B95A1', textDecoration: 'none', transition: 'color 150ms' } as const;
                  // mailto 등 외부 링크는 next/link 대신 <a>
                  return link.external ? (
                    <a
                      key={link.href}
                      href={link.href}
                      style={linkStyle}
                      onMouseEnter={e => (e.currentTarget.style.color = '#6D4CFF')}
                      onMouseLeave={e => (e.currentTarget.style.color = '#8B95A1')}
                    >
                      {link.label}
                    </a>
                  ) : (
                    <Link
                      key={link.href}
                      href={link.href}
                      style={linkStyle}
                      onMouseEnter={e => (e.currentTarget.style.color = '#6D4CFF')}
                      onMouseLeave={e => (e.currentTarget.style.color = '#8B95A1')}
                    >
                      {link.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}

          {/* 카카오 채널 */}
          <div>
            <div style={{
              fontSize: '13px', fontWeight: 700, color: '#191F28', marginBottom: '10px',
            }}>
              Flik 카카오톡 채널
            </div>
            <p style={{ fontSize: '12px', color: '#8B95A1', lineHeight: 1.6, marginBottom: '14px' }}>
              업데이트 소식과 셀러 인사이트를<br />받아보세요
            </p>
            {/* 실제 카카오 채널 미개설 — 죽은 '#' 링크 대신 '준비 중' 비활성 표기. 채널 개설 시 href 연결. */}
            <span
              title="카카오톡 채널은 준비 중이에요"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '8px',
                background: '#F2F4F6',
                border: 'none', borderRadius: '8px',
                padding: '10px 16px', fontSize: '13px', fontWeight: 700,
                color: '#8B95A1', cursor: 'default', textDecoration: 'none',
                fontFamily: 'inherit',
              }}
            >
              <IconBrandKakoTalk size={18} color="#8B95A1" stroke={1.8} />
              채널 준비 중
            </span>
          </div>
        </div>

        {/* 하단 카피라이트 */}
        <div style={{
          borderTop: '1px solid #EBEBEB', paddingTop: '28px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: '12px',
        }}>
          <span style={{ fontSize: '12px', color: '#B0B8C1' }}>
            © 2026 Flik. All rights reserved.
          </span>
          <div style={{ display: 'flex', gap: '20px' }}>
            {[
              { label: '이용약관', href: '/terms' },
              { label: '개인정보처리방침', href: '/privacy' },
            ].map(t => (
              <Link
                key={t.href}
                href={t.href}
                style={{ fontSize: '12px', color: '#B0B8C1', textDecoration: 'none' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#6D4CFF')}
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
