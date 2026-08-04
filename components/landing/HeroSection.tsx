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
            fontSize: '13px', fontWeight: 600, color: '#6D4CFF',
            marginBottom: '32px',
          }}>
            <span>✨</span>
            AI 상세페이지 자동 생성 서비스
          </div>

          {/* 타이틀 — 2줄 */}
          <h1 style={{
            fontSize: '48px',
            fontWeight: 700,
            color: '#191F28',
            letterSpacing: '-1.2px',
            lineHeight: 1.25,
            marginBottom: '24px',
            /* ★한글은 기본 줄바꿈이 단어를 쪼갠다 — '직접 팔 / 아본'처럼 갈라졌다(2026-08-04) */
            wordBreak: 'keep-all',
          }}>
            {/* ★2026-08-04 유근님 확정 — 기능('AI가 몇 분 만에')이 아니라 만든 사람으로 시작한다.
                AI 도구는 다 몇 분 만에 만든다고 말하므로 그것만으로는 아무것도 구분되지 않는다.
                ⚠️'매출 50억'은 쇼핑몰 매출이다(상세페이지 매출 아님). 증빙 가능한 값만 쓸 것. */}
            매출 <span style={{ color: '#6D4CFF' }}>50억</span>,<br />
            직접 팔아본 사람이<br />
            만들었습니다
          </h1>

          {/* 부제 */}
          <p style={{
            fontSize: '16px',
            color: '#4E5968',
            lineHeight: 1.7,
            marginBottom: '32px',
          }}>
            {/* ★층을 나눈다 — 핵심 한 줄과 설명이 같은 크기·색이면 둘 다 안 읽힌다 */}
            <span style={{ display: 'block', fontSize: '20px', fontWeight: 700, color: '#191F28', marginBottom: '14px', letterSpacing: '-0.4px' }}>
              지어낸 문장 없이, 전환까지 계산한 상세페이지
            </span>
            <span style={{ display: 'block', fontSize: '16.5px', color: '#8B95A1', lineHeight: 1.75 }}>
              화장품이면 성분과 법적 고지, 식품이면 원산지와 보관법 — 카테고리마다 물어보는 게 다릅니다.<br />
              적어주신 것만으로 판매 채널에 맞춰 몇 분 만에 만듭니다.
            </span>
          </p>

          {/* CTA 버튼 */}
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '28px' }}>
            <button
              onClick={() => router.push('/login')}
              onMouseEnter={() => setHoverCta(true)}
              onMouseLeave={() => setHoverCta(false)}
              style={{
                background: hoverCta ? '#5447D9' : '#6D4CFF',
                border: 'none', borderRadius: '10px',
                padding: '14px 28px', fontSize: '15px', fontWeight: 700,
                color: '#fff', cursor: 'pointer', transition: 'all 150ms',
                fontFamily: 'inherit',
                boxShadow: '0 4px 16px rgba(109,76,255,0.32)',
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
                  width: '6px', height: '6px', background: '#6D4CFF',
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
