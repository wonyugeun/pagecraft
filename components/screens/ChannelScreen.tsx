'use client';

import { useState } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useApp } from '@/store/AppContext';
import ChannelMobile from './ChannelMobile';
import { useIsMobile } from '@/hooks/useIsMobile';

/**
 * 채널 선택(s2) — 2026-07-18 리디자인(유근님: "세련된 느낌이 없다"):
 * 가짜 일러스트 배너·이모지 원형 그라데이션·다음 버튼 제거 → 랜딩/갤러리와 같은
 * 미니멀 카드 + 클릭 즉시 이동(카테고리 화면과 UX 통일). 태그는 실제 제공물만(허위 금지).
 */

interface ChannelDef {
  key: string;
  emoji: string;
  badge?: string;
  sub: string;
  desc: string;
  tags: string[];
}

const CHANNELS: ChannelDef[] = [
  {
    key: '스마트스토어',
    emoji: '🛒',
    badge: '추천',
    sub: '네이버 쇼핑 기반',
    desc: '검색으로 들어온 고객에게 신뢰를 주는 정보 중심 구조로 설계합니다.',
    tags: ['블로그형 글+그림', '이미지 슬라이드', '검색 신뢰 구조'],
  },
  {
    key: '쿠팡',
    emoji: '🚀',
    sub: '로켓배송 경쟁 환경',
    desc: '빠른 스크롤 환경에서 구매 전환을 만드는 시각 임팩트 중심 구조입니다.',
    tags: ['이미지 슬라이드', '비주얼 임팩트', '빠른 전환 구조'],
  },
  {
    key: '자사몰',
    emoji: '🏪',
    sub: '브랜드 직접 운영',
    desc: '브랜드 스토리와 고객 경험을 강화하는 프리미엄 구조로 설계합니다.',
    tags: ['HTML 섹션형', '브랜드 스토리', '감성 카피'],
  },
  {
    key: '와디즈',
    emoji: '💡',
    sub: '펀딩 · 예약판매',
    desc: '후원자의 공감을 이끄는 긴 호흡의 스토리텔링 구조로 설계합니다.',
    tags: ['긴 스크롤 HTML', '스토리텔링 구조', '공감 서사'],
  },
];

export default function ChannelScreen() {
  const isMobile = useIsMobile();
  const { setCh, go } = useApp();

  if (isMobile) return <ChannelMobile />;

  const pick = (key: string) => {
    setCh(key);
    go('s3');   // ★선택 즉시 이동 — 카테고리 화면과 동일 UX
  };

  return (
    <div style={{ maxWidth: '760px', margin: '0 auto', padding: '52px 24px 100px', fontFamily: 'var(--f)' }}>

      {/* 헤더 */}
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <div style={{
          fontSize: '12px', fontWeight: 700, color: '#6D4CFF',
          letterSpacing: '0.08em', marginBottom: '14px',
        }}>
          STEP 2 · 판매 채널
        </div>
        <h1 style={{
          fontSize: '32px', fontWeight: 800, color: '#191F28',
          letterSpacing: '-0.03em', lineHeight: 1.25, marginBottom: '12px',
        }}>
          어디에서 판매하시나요?
        </h1>
        <p style={{ fontSize: '14.5px', color: '#8B95A1', lineHeight: 1.6 }}>
          채널을 선택하면 바로 다음 단계로 넘어가요 — 페이지 구조가 채널 특성에 맞게 설계됩니다
        </p>
      </div>

      {/* 채널 카드 2×2 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '36px' }}>
        {CHANNELS.map(c => (
          <ChannelCard key={c.key} c={c} onClick={() => pick(c.key)} />
        ))}
      </div>

      {/* 하단 — 이전만(다음은 즉시 이동으로 대체) */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <button onClick={() => go('s1')} style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          background: 'none', border: 'none',
          fontSize: '13.5px', fontWeight: 600, color: '#8B95A1',
          cursor: 'pointer', padding: '8px 14px', borderRadius: '10px',
          fontFamily: 'inherit', transition: 'color .15s',
        }}
          onMouseEnter={e => (e.currentTarget.style.color = '#6D4CFF')}
          onMouseLeave={e => (e.currentTarget.style.color = '#8B95A1')}
        >
          <ArrowLeft size={15} /> 카테고리 다시 선택
        </button>
      </div>
    </div>
  );
}

function ChannelCard({ c, onClick }: { c: ChannelDef; onClick: () => void }) {
  const [hov, setHov] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        textAlign: 'left', width: '100%',
        padding: '24px 24px 22px',
        background: '#fff',
        border: `1px solid ${hov ? '#C9BAFF' : '#ECECF2'}`,
        borderRadius: '20px', cursor: 'pointer',
        boxShadow: hov ? '0 14px 36px rgba(25,31,40,0.10)' : '0 2px 8px rgba(25,31,40,0.03)',
        transform: hov ? 'translateY(-3px)' : 'none',
        transition: 'all 180ms ease',
        fontFamily: 'inherit', userSelect: 'none',
      }}
    >
      {/* 이름 행 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
        <span style={{ fontSize: '22px', lineHeight: 1 }}>{c.emoji}</span>
        <span style={{ fontSize: '17px', fontWeight: 800, color: '#191F28', letterSpacing: '-0.02em' }}>
          {c.key}
        </span>
        {c.badge && (
          <span style={{
            fontSize: '10.5px', fontWeight: 700, color: '#6D4CFF',
            border: '1px solid #DDD4FF', background: '#F8F6FF',
            borderRadius: '999px', padding: '2px 8px',
          }}>
            {c.badge}
          </span>
        )}
        <span style={{
          marginLeft: 'auto', display: 'flex', alignItems: 'center',
          color: hov ? '#6D4CFF' : '#D6D0EA', transition: 'all 180ms ease',
          transform: hov ? 'translateX(2px)' : 'none',
        }}>
          <ArrowRight size={16} />
        </span>
      </div>

      <div style={{ fontSize: '12.5px', color: '#8B95A1', marginBottom: '12px' }}>{c.sub}</div>

      <p style={{ fontSize: '13.5px', color: '#4E5968', lineHeight: 1.65, margin: '0 0 14px', letterSpacing: '-0.01em' }}>
        {c.desc}
      </p>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
        {c.tags.map(t => (
          <span key={t} style={{
            fontSize: '11.5px', fontWeight: 500, padding: '4px 10px',
            borderRadius: '999px', background: '#F7F6FB', color: '#6B7684',
          }}>
            {t}
          </span>
        ))}
      </div>
    </button>
  );
}
