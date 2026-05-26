'use client';

import Image from 'next/image';

const STEPS = [
  {
    num: '01',
    title: '상품 정보 입력',
    desc: '카테고리, 채널, 상품명, 주요 특징을 간단히 입력하세요. 레퍼런스 캡처를 올리면 더 정교해집니다.',
  },
  {
    num: '02',
    title: 'AI 자동 생성',
    desc: 'AI가 카테고리 특성과 채널 알고리즘을 분석해 최적화된 상세페이지 구조와 카피를 생성합니다.',
  },
  {
    num: '03',
    title: '다운로드 & 적용',
    desc: '블로그형 · 이미지 슬라이드 · HTML 섹션 중 원하는 형태로 바로 다운로드해 판매 채널에 적용하세요.',
  },
];

export default function HowItWorksSection() {
  return (
    <section style={{
      padding: '100px 0',
      background: '#FFFFFF',
      fontFamily: "'Pretendard','Noto Sans KR',sans-serif",
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 36px' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '80px',
          alignItems: 'center',
        }} className="hiw-grid">

          {/* 좌: 단계 설명 */}
          <div>
            <div style={{
              fontSize: '12px', fontWeight: 700, color: '#6E5BFB',
              letterSpacing: '0.1em', marginBottom: '14px',
            }}>
              HOW IT WORKS
            </div>
            <h2 style={{
              fontSize: '36px', fontWeight: 700, color: '#191F28',
              letterSpacing: '-0.03em', lineHeight: 1.2, marginBottom: '14px',
            }}>
              단 3단계로 완성되는<br />상세페이지
            </h2>
            <p style={{
              fontSize: '15px', color: '#4E5968', lineHeight: 1.7, marginBottom: '48px',
            }}>
              복잡한 기획 없이도 AI가 처음부터 끝까지 완성해줍니다.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
              {STEPS.map(step => (
                <div key={step.num} style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
                  <div style={{
                    width: '40px', height: '40px', flexShrink: 0,
                    background: '#F4F2FF', borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '13px', fontWeight: 800, color: '#6E5BFB',
                  }}>
                    {step.num}
                  </div>
                  <div>
                    <div style={{
                      fontSize: '16px', fontWeight: 700, color: '#191F28',
                      marginBottom: '6px', letterSpacing: '-0.01em',
                    }}>
                      {step.title}
                    </div>
                    <p style={{ fontSize: '13px', color: '#4E5968', lineHeight: 1.65 }}>
                      {step.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 우: 결과물 이미지 */}
          <div className="hiw-img-wrap" style={{
            borderRadius: '24px',
            overflow: 'hidden',
            boxShadow: '0 8px 24px rgba(0,0,0,0.06)',
            lineHeight: 0,
          }}>
            <Image
              src="/images/landing/samples-grid.png"
              alt="PageCraft 결과물 예시"
              width={600}
              height={480}
              style={{ width: '100%', height: 'auto', display: 'block' }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
