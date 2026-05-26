'use client';

import { useState } from 'react';
import Image from 'next/image';
import { signIn } from 'next-auth/react';

const META_ITEMS = ['회원가입 즉시 무료', '신용카드 불필요', '고퀄리티 보장'];

export default function HeroSection() {
  const [hoverCta, setHoverCta] = useState(false);
  const [hoverSample, setHoverSample] = useState(false);

  return (
    <section style={{
      background: 'linear-gradient(180deg, #F9F8FF 0%, #FFFFFF 100%)',
      paddingTop: '120px',
      paddingBottom: '100px',
      fontFamily: "'Pretendard','Noto Sans KR',sans-serif",
    }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 40px' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '40px',
          alignItems: 'start',
        }} className="hero-grid">

          {/* ── 좌: 카피 ── */}
          <div>
            {/* eyebrow 배지 */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              background: '#F4F2FF', border: '1px solid #E8E5FF',
              borderRadius: '100px', padding: '6px 14px',
              fontSize: '13px', fontWeight: 600, color: '#6E5BFB',
              marginBottom: '28px',
            }}>
              <span>✨</span>
              AI 상세페이지 자동 생성 서비스
            </div>

            {/* 타이틀 */}
            <h1 style={{
              fontSize: '48px',
              fontWeight: 700,
              color: '#191F28',
              letterSpacing: '-0.03em',
              lineHeight: 1.18,
              marginBottom: '22px',
            }}>
              AI가 만드는<br />
              고퀄리티 상세페이지,<br />
              <span style={{ color: '#6E5BFB' }}>단 3분</span> 만에
            </h1>

            {/* 부제 */}
            <p style={{
              fontSize: '16px',
              color: '#4E5968',
              lineHeight: 1.75,
              marginBottom: '36px',
            }}>
              카테고리별 전문 AI가 상품 정보를 분석해<br />
              판매 채널에 최적화된 상세페이지를 자동으로 완성합니다.
            </p>

            {/* CTA 버튼 */}
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '28px' }}>
              <button
                onClick={() => signIn('google')}
                onMouseEnter={() => setHoverCta(true)}
                onMouseLeave={() => setHoverCta(false)}
                style={{
                  background: hoverCta ? '#5447D9' : '#6E5BFB',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '15px 32px',
                  fontSize: '15px',
                  fontWeight: 700,
                  color: '#fff',
                  cursor: 'pointer',
                  transition: 'all 150ms',
                  fontFamily: 'inherit',
                  boxShadow: '0 4px 16px rgba(110,91,251,0.32)',
                  transform: hoverCta ? 'translateY(-1px)' : 'none',
                  whiteSpace: 'nowrap',
                }}
              >
                무료로 시작하기 →
              </button>
              <button
                onMouseEnter={() => setHoverSample(true)}
                onMouseLeave={() => setHoverSample(false)}
                style={{
                  background: '#fff',
                  border: `1.5px solid ${hoverSample ? '#6E5BFB' : '#E8E5FF'}`,
                  borderRadius: '10px',
                  padding: '15px 24px',
                  fontSize: '15px',
                  fontWeight: 600,
                  color: hoverSample ? '#6E5BFB' : '#4E5968',
                  cursor: 'pointer',
                  transition: 'all 150ms',
                  fontFamily: 'inherit',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  whiteSpace: 'nowrap',
                }}
              >
                <span style={{
                  width: '20px', height: '20px',
                  background: hoverSample ? '#6E5BFB' : '#F4F2FF',
                  borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '9px',
                  color: hoverSample ? '#fff' : '#6E5BFB',
                  transition: 'all 150ms',
                  flexShrink: 0,
                }}>▶</span>
                샘플 상세페이지 보기
              </button>
            </div>

            {/* 메타 */}
            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
              {META_ITEMS.map(item => (
                <div key={item} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{
                    width: '6px', height: '6px',
                    background: '#6E5BFB',
                    borderRadius: '50%',
                    display: 'inline-block',
                    flexShrink: 0,
                  }} />
                  <span style={{ fontSize: '13px', color: '#8B95A1' }}>{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── 우: 히어로 이미지 (1536×1024, 3:2) ── */}
          <div className="hero-card-wrap" style={{ lineHeight: 0, width: '100%' }}>
            <Image
              src="/images/landing/hero-preview.png"
              alt="PageCraft AI 상세페이지 미리보기"
              width={1536}
              height={1024}
              quality={95}
              priority
              style={{
                width: '100%',
                height: 'auto',
                display: 'block',
                borderRadius: '16px',
              }}
            />
          </div>

        </div>
      </div>
    </section>
  );
}
