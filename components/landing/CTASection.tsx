'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { IconRobot } from '@tabler/icons-react';

export default function CTASection() {
  const [hovered, setHovered] = useState(false);

  return (
    <section style={{
      padding: '80px 36px',
      fontFamily: "'Pretendard','Noto Sans KR',sans-serif",
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{
          background: 'linear-gradient(135deg, #6E5BFB 0%, #5447D9 100%)',
          borderRadius: '24px',
          padding: '64px 72px',
          display: 'grid',
          gridTemplateColumns: '1fr auto',
          gap: '48px',
          alignItems: 'center',
          position: 'relative',
          overflow: 'hidden',
        }} className="cta-grid">
          {/* 배경 데코 원 */}
          <div style={{
            position: 'absolute', right: '-40px', bottom: '-60px',
            width: '240px', height: '240px',
            background: 'rgba(255,255,255,0.06)',
            borderRadius: '50%',
          }} />
          <div style={{
            position: 'absolute', right: '120px', top: '-80px',
            width: '160px', height: '160px',
            background: 'rgba(255,255,255,0.04)',
            borderRadius: '50%',
          }} />

          {/* 좌: 카피 */}
          <div style={{ position: 'relative', zIndex: 1 }}>
            <h2 style={{
              fontSize: '36px', fontWeight: 700, color: '#ffffff',
              letterSpacing: '-0.03em', lineHeight: 1.25, marginBottom: '14px',
            }}>
              지금 바로 AI 상세페이지를<br />경험해 보세요
            </h2>
            <p style={{ fontSize: '16px', color: 'rgba(255,255,255,0.75)', lineHeight: 1.65 }}>
              카드 등록 없이 무료로 시작하세요.<br />
              처음 30 크레딧을 무료로 드립니다.
            </p>
          </div>

          {/* 우: 버튼 + 아이콘 */}
          <div style={{
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', gap: '16px',
            position: 'relative', zIndex: 1,
          }}>
            {/* 로봇 아이콘 박스 */}
            <div style={{
              width: '60px', height: '60px',
              background: 'rgba(255,255,255,0.15)',
              borderRadius: '16px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <IconRobot size={30} color="rgba(255,255,255,0.9)" stroke={1.5} />
            </div>
            <button
              onClick={() => signIn('google')}
              onMouseEnter={() => setHovered(true)}
              onMouseLeave={() => setHovered(false)}
              style={{
                background: hovered ? '#F4F2FF' : '#ffffff',
                border: 'none', borderRadius: '10px',
                padding: '14px 32px', fontSize: '15px', fontWeight: 700,
                color: '#6E5BFB', cursor: 'pointer', transition: 'all 150ms',
                fontFamily: 'inherit', whiteSpace: 'nowrap',
                boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                transform: hovered ? 'translateY(-1px)' : 'none',
              }}
            >
              무료로 시작하기 →
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
