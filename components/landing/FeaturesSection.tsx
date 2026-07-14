'use client';

import { useState } from 'react';
import {
  IconSparkles,
  IconLayoutGrid,
  IconPhotoSearch,
  IconDownload,
} from '@tabler/icons-react';

const FEATURES = [
  {
    icon: IconSparkles,
    title: 'AI 자동 생성',
    desc: '상품 정보를 입력하면 AI가 AIDA 구조로 최적화된 카피와 섹션 구조를 자동으로 완성합니다.',
  },
  {
    icon: IconLayoutGrid,
    title: '카테고리별 특화',
    desc: '화장품·식품·패션 등 11개 카테고리별 전문 AI가 업계 특성에 맞춘 상세페이지를 만들어줍니다.',
  },
  {
    icon: IconPhotoSearch,
    title: '캡처 분석',
    desc: '경쟁사 상세페이지를 캡처해서 올리면 AI가 구조를 분석해 더 나은 버전을 제안합니다.',
    badge: 'Flik만의 기능',
  },
  {
    icon: IconDownload,
    title: '바로 다운로드',
    desc: '완성된 상세페이지를 블로그형·슬라이드형·HTML형으로 즉시 다운로드할 수 있습니다.',
  },
];

export default function FeaturesSection() {
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <section style={{
      background: '#FAFAFA', padding: '100px 0',
      fontFamily: "'Pretendard','Noto Sans KR',sans-serif",
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 36px' }}>
        {/* 헤더 */}
        <div style={{ textAlign: 'center', marginBottom: '60px' }}>
          <div style={{
            fontSize: '12px', fontWeight: 700, color: '#6D4CFF',
            letterSpacing: '0.1em', marginBottom: '14px',
          }}>
            FEATURES
          </div>
          <h2 style={{
            fontSize: '36px', fontWeight: 700, color: '#191F28',
            letterSpacing: '-0.03em', lineHeight: 1.2, marginBottom: '14px',
          }}>
            Flik의 핵심 기능
          </h2>
          <p style={{ fontSize: '16px', color: '#4E5968', lineHeight: 1.6 }}>
            상세페이지 제작에 필요한 모든 기능을 제공해요
          </p>
        </div>

        {/* 카드 그리드 */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '20px',
        }} className="features-grid">
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            const isHov = hovered === i;
            return (
              <div
                key={f.title}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
                style={{
                  background: '#ffffff', borderRadius: '16px',
                  padding: '28px 24px',
                  border: `1px solid ${isHov ? '#E8E5FF' : '#F0EEF8'}`,
                  boxShadow: isHov
                    ? '0 8px 32px rgba(109,76,255,0.10)'
                    : '0 1px 4px rgba(0,0,0,0.04)',
                  transform: isHov ? 'translateY(-2px)' : 'none',
                  transition: 'all 150ms ease',
                  cursor: 'default',
                  position: 'relative',
                }}
              >
                {f.badge && (
                  <div style={{
                    position: 'absolute', top: '16px', right: '16px',
                    background: '#F4F2FF', color: '#6D4CFF',
                    fontSize: '10px', fontWeight: 700,
                    padding: '3px 8px', borderRadius: '100px',
                  }}>
                    {f.badge}
                  </div>
                )}
                {/* 아이콘 박스 */}
                <div style={{
                  width: '44px', height: '44px',
                  background: '#F4F2FF', borderRadius: '12px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: '16px',
                }}>
                  <Icon size={22} color="#6D4CFF" stroke={1.8} />
                </div>
                <div style={{
                  fontSize: '16px', fontWeight: 700, color: '#191F28',
                  marginBottom: '10px', letterSpacing: '-0.01em',
                }}>
                  {f.title}
                </div>
                <p style={{ fontSize: '13px', color: '#4E5968', lineHeight: 1.65 }}>
                  {f.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
