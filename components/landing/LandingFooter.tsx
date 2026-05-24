'use client';

import { useState } from 'react';

const FOOTER_COLS = [
  {
    title: '서비스',
    links: ['서비스 소개', '기능 안내', '템플릿 갤러리'],
  },
  {
    title: '고객 지원',
    links: ['사용 가이드', 'FAQ', '문의하기'],
  },
  {
    title: '회사 정보',
    links: ['회사 소개', '이용 약관', '개인정보 처리방침'],
  },
];

export default function LandingFooter() {
  const [email, setEmail] = useState('');
  const [subHov, setSubHov] = useState(false);

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
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
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
            </div>
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
                  <a
                    key={link}
                    href="#"
                    style={{ fontSize: '13px', color: '#8B95A1', textDecoration: 'none', transition: 'color 150ms' }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#6E5BFB')}
                    onMouseLeave={e => (e.currentTarget.style.color = '#8B95A1')}
                  >
                    {link}
                  </a>
                ))}
              </div>
            </div>
          ))}

          {/* 뉴스레터 */}
          <div>
            <div style={{
              fontSize: '13px', fontWeight: 700, color: '#191F28',
              marginBottom: '10px',
            }}>
              뉴스레터
            </div>
            <p style={{ fontSize: '12px', color: '#8B95A1', lineHeight: 1.6, marginBottom: '14px' }}>
              AI 마케팅 트렌드와 PageCraft 업데이트를 받아보세요
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="이메일 주소 입력"
                style={{
                  width: '100%', padding: '9px 12px',
                  border: '1.5px solid #E8E5FF', borderRadius: '8px',
                  fontSize: '13px', color: '#191F28', background: '#fff',
                  outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
                }}
              />
              <button
                onMouseEnter={() => setSubHov(true)}
                onMouseLeave={() => setSubHov(false)}
                style={{
                  width: '100%', padding: '9px',
                  background: subHov ? '#5447D9' : '#6E5BFB',
                  border: 'none', borderRadius: '8px',
                  fontSize: '13px', fontWeight: 600, color: '#fff',
                  cursor: 'pointer', transition: 'background 150ms', fontFamily: 'inherit',
                }}
              >
                구독하기
              </button>
            </div>
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
            {['이용약관', '개인정보처리방침', '사업자정보'].map(t => (
              <a
                key={t}
                href="#"
                style={{ fontSize: '12px', color: '#B0B8C1', textDecoration: 'none' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#6E5BFB')}
                onMouseLeave={e => (e.currentTarget.style.color = '#B0B8C1')}
              >
                {t}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
