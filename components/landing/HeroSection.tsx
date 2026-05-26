'use client';

import { useState } from 'react';
import Image from 'next/image';
import { signIn } from 'next-auth/react';

const META_ITEMS = ['회원가입 즉시 무료', '신용카드 불필요', '고퀄리티 보장'];
const CATEGORY_OPTIONS = ['화장품', '식품', '패션', '가전', '생활', '기타'];

function HeroCard() {
  const [selectedCat, setSelectedCat] = useState('화장품');
  const chips = ['자연 성분', '저자극', '수분 공급', '비건 인증'];

  return (
    <div style={{
      background: 'linear-gradient(145deg, #F4F2FF 0%, #E8E5FF 100%)',
      borderRadius: '24px', padding: '24px',
      boxShadow: '0 20px 60px rgba(110,91,251,0.15)',
    }}>
      {/* 흰 카드 */}
      <div style={{
        background: '#ffffff', borderRadius: '16px',
        padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
      }}>
        {/* 헤더 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
          <div style={{
            width: '28px', height: '28px', background: '#6E5BFB',
            borderRadius: '7px', display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: '13px', fontWeight: 800, color: '#fff',
          }}>P</div>
          <span style={{ fontSize: '13px', fontWeight: 700, color: '#191F28' }}>상세페이지 생성하기</span>
        </div>

        {/* 상품명 */}
        <div style={{ marginBottom: '14px' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#8B95A1', marginBottom: '6px', letterSpacing: '0.02em' }}>상품명</div>
          <div style={{
            border: '1.5px solid #E8E5FF', borderRadius: '8px',
            padding: '9px 12px', fontSize: '13px', color: '#191F28', background: '#FDFCFF',
          }}>
            수분 광채 앰플 세럼
          </div>
        </div>

        {/* 카테고리 */}
        <div style={{ marginBottom: '14px' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#8B95A1', marginBottom: '6px', letterSpacing: '0.02em' }}>카테고리</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {CATEGORY_OPTIONS.map(c => (
              <button
                key={c}
                onClick={() => setSelectedCat(c)}
                style={{
                  padding: '5px 12px', borderRadius: '100px', fontSize: '12px',
                  fontWeight: 500, cursor: 'pointer', border: 'none', transition: 'all 120ms',
                  background: selectedCat === c ? '#6E5BFB' : '#F4F2FF',
                  color: selectedCat === c ? '#fff' : '#6E5BFB',
                  fontFamily: 'inherit',
                }}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* 주요 특징 */}
        <div style={{ marginBottom: '18px' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#8B95A1', marginBottom: '6px', letterSpacing: '0.02em' }}>주요 특징</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {chips.map(chip => (
              <span key={chip} style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 500, background: '#F4F2FF', color: '#6E5BFB' }}>
                {chip}
              </span>
            ))}
          </div>
        </div>

        {/* CTA */}
        <button style={{
          width: '100%', padding: '12px', background: '#6E5BFB',
          border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: 700,
          color: '#fff', cursor: 'pointer', fontFamily: 'inherit',
          boxShadow: '0 4px 16px rgba(110,91,251,0.30)',
        }}>
          ✨ AI로 상세페이지 생성하기
        </button>
      </div>
    </div>
  );
}

export default function HeroSection() {
  const [hoverCta, setHoverCta] = useState(false);
  const [hoverSample, setHoverSample] = useState(false);

  return (
    <section style={{
      background: 'linear-gradient(180deg, #F9F8FF 0%, #FFFFFF 100%)',
      paddingTop: '120px', paddingBottom: '100px',
      fontFamily: "'Pretendard','Noto Sans KR',sans-serif",
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 36px' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '80px',
          alignItems: 'center',
        }} className="hero-grid">

          {/* 좌: 카피 */}
          <div>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              background: '#F4F2FF', border: '1px solid #E8E5FF',
              borderRadius: '100px', padding: '6px 14px',
              fontSize: '13px', fontWeight: 600, color: '#6E5BFB', marginBottom: '24px',
            }}>
              <span>✨</span>
              AI 상세페이지 자동 생성 서비스
            </div>

            <h1 style={{
              fontSize: '46px', fontWeight: 700, color: '#191F28',
              letterSpacing: '-0.03em', lineHeight: 1.2, marginBottom: '20px',
            }}>
              AI가 만드는<br />
              고퀄리티 상세페이지,<br />
              <span style={{ color: '#6E5BFB' }}>단 3분</span> 만에
            </h1>

            <p style={{ fontSize: '16px', color: '#4E5968', lineHeight: 1.7, marginBottom: '36px' }}>
              카테고리별 전문 AI가 상품 정보를 분석해<br />
              판매 채널에 최적화된 상세페이지를 자동으로 완성합니다.
            </p>

            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '28px' }}>
              <button
                onClick={() => signIn('google')}
                onMouseEnter={() => setHoverCta(true)}
                onMouseLeave={() => setHoverCta(false)}
                style={{
                  background: hoverCta ? '#5447D9' : '#6E5BFB',
                  border: 'none', borderRadius: '10px',
                  padding: '14px 28px', fontSize: '15px', fontWeight: 700,
                  color: '#fff', cursor: 'pointer', transition: 'all 150ms',
                  fontFamily: 'inherit',
                  boxShadow: '0 4px 16px rgba(110,91,251,0.30)',
                  transform: hoverCta ? 'translateY(-1px)' : 'none',
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
                  borderRadius: '10px', padding: '14px 24px',
                  fontSize: '15px', fontWeight: 600,
                  color: hoverSample ? '#6E5BFB' : '#4E5968',
                  cursor: 'pointer', transition: 'all 150ms',
                  fontFamily: 'inherit',
                  display: 'flex', alignItems: 'center', gap: '8px',
                }}
              >
                <span style={{
                  width: '20px', height: '20px',
                  background: hoverSample ? '#6E5BFB' : '#F4F2FF',
                  borderRadius: '50%', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  fontSize: '9px', color: hoverSample ? '#fff' : '#6E5BFB',
                  transition: 'all 150ms', flexShrink: 0,
                }}>▶</span>
                샘플 상세페이지 보기
              </button>
            </div>

            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
              {META_ITEMS.map(item => (
                <div key={item} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '6px', height: '6px', background: '#6E5BFB', borderRadius: '50%', display: 'inline-block' }} />
                  <span style={{ fontSize: '13px', color: '#8B95A1' }}>{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 우: 폼 카드 + 미리보기 이미지 오버레이 */}
          <div className="hero-card-wrap" style={{ position: 'relative' }}>
            {/* 폼 카드 — 우측에 이미지 공간 확보를 위해 오른쪽 여백 */}
            <div style={{ marginRight: '72px' }}>
              <HeroCard />
            </div>

            {/* 상세페이지 미리보기 이미지 — 우측에서 겹침 */}
            <div style={{
              position: 'absolute',
              top: '20px',
              right: '-12px',
              width: '200px',
              borderRadius: '16px',
              overflow: 'hidden',
              boxShadow: '0 12px 40px rgba(0,0,0,0.14)',
              zIndex: 10,
            }}>
              <Image
                src="/images/landing/hero-preview.png"
                alt="상세페이지 미리보기"
                width={200}
                height={320}
                style={{ display: 'block', width: '100%', height: 'auto', objectFit: 'cover' }}
                priority
              />
            </div>

            {/* 말풍선 */}
            <div style={{
              marginTop: '16px',
              background: '#fff',
              borderRadius: '12px', padding: '10px 16px',
              boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
              display: 'flex', alignItems: 'center', gap: '10px',
              width: 'fit-content', marginLeft: 'auto',
              marginRight: '0',
              position: 'relative', zIndex: 1,
            }}>
              <span style={{ fontSize: '20px' }}>🤖</span>
              <div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#191F28' }}>AI가 알아서 상세페이지 완성!</div>
                <div style={{ fontSize: '11px', color: '#8B95A1', marginTop: '2px' }}>평균 생성 시간 3분</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
