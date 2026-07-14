'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

const META_ITEMS = ['가입 시 무료 크레딧', '신용카드 불필요', '카테고리별 특화'];

export default function HeroSection() {
  const [hoverCta, setHoverCta] = useState(false);
  const router = useRouter();

  return (
    <section style={{
      background: '#F4F0FF',
      padding: '100px 48px',
      fontFamily: "'Pretendard','Noto Sans KR',sans-serif",
    }}>
      <div style={{
        maxWidth: '1360px',
        margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: '1fr 1.3fr',
        gap: '48px',
        alignItems: 'start',
      }} className="hero-grid">

        {/* ── 좌: 카피 ── */}
        <div className="hero-copy" style={{ paddingLeft: '60px' }}>
          {/* eyebrow 배지 */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            background: '#EDE8FF', border: '1px solid #D9D2FF',
            borderRadius: '100px', padding: '8px 16px',
            fontSize: '13px', fontWeight: 600, color: '#6E5BFB',
            marginBottom: '32px',
          }}>
            <span>✨</span>
            AI 상세페이지 자동 생성 서비스
          </div>

          {/* 타이틀 — 2줄 */}
          <h1 style={{
            fontSize: '56px',
            fontWeight: 700,
            color: '#191F28',
            letterSpacing: '-1.2px',
            lineHeight: 1.2,
            marginBottom: '24px',
          }}>
            AI가 만드는<br />
            상세페이지, <span style={{ color: '#6E5BFB' }}>몇 분</span> 만에
          </h1>

          {/* 부제 */}
          <p style={{
            fontSize: '16px',
            color: '#4E5968',
            lineHeight: 1.7,
            marginBottom: '32px',
          }}>
            카테고리별 전문 AI가 상품 정보를 분석해<br />
            판매 채널에 최적화된 상세페이지를 자동으로 완성합니다.
          </p>

          {/* CTA 버튼 */}
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '28px' }}>
            <button
              onClick={() => router.push('/login')}
              onMouseEnter={() => setHoverCta(true)}
              onMouseLeave={() => setHoverCta(false)}
              style={{
                background: hoverCta ? '#5447D9' : '#6E5BFB',
                border: 'none', borderRadius: '10px',
                padding: '14px 28px', fontSize: '15px', fontWeight: 700,
                color: '#fff', cursor: 'pointer', transition: 'all 150ms',
                fontFamily: 'inherit',
                boxShadow: '0 4px 16px rgba(110,91,251,0.32)',
                transform: hoverCta ? 'translateY(-1px)' : 'none',
                whiteSpace: 'nowrap',
              }}
            >
              무료로 시작하기 →
            </button>
          </div>

          {/* 메타 */}
          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
            {META_ITEMS.map(item => (
              <div key={item} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{
                  width: '6px', height: '6px', background: '#6E5BFB',
                  borderRadius: '50%', display: 'inline-block', flexShrink: 0,
                }} />
                <span style={{ fontSize: '13px', color: '#8B95A1' }}>{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── 우: 이미지 ── */}
        <div className="hero-card-wrap" style={{ lineHeight: 0, width: '100%' }}>
          <Image
            src="/images/landing/hero-preview.png"
            alt="Flik AI 상세페이지 미리보기"
            width={1536}
            height={1024}
            quality={95}
            priority
            style={{
              width: '100%',
              height: 'auto',
              display: 'block',
              borderRadius: '12px',
              boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
            }}
          />
        </div>

      </div>
    </section>
  );
}
