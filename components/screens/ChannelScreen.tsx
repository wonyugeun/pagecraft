'use client';

import { useState } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useApp } from '@/store/AppContext';
import ChannelMobile from './ChannelMobile';
import { useIsMobile } from '@/hooks/useIsMobile';

/**
 * 채널 선택(s2) — 2026-07-18 프리미엄 리디자인 v2(유근님: "고급지게").
 * 배경 라디얼 글로우 + 채널별 컬러 아이덴티티 스쿼클 + 겹층 그림자 + 호버 리프트.
 * 클릭 즉시 이동(카테고리와 UX 통일) · 태그는 실제 제공물만(허위 금지).
 */

interface ChannelDef {
  key: string;
  emoji: string;
  badge?: string;
  sub: string;
  desc: string;
  tags: string[];
  /** 채널 아이덴티티 — 스쿼클 그라데이션 */
  tone: [string, string];
  /** 태그 필 강조색 */
  tint: string;
}

const CHANNELS: ChannelDef[] = [
  {
    key: '스마트스토어',
    emoji: '🛒',
    badge: '추천',
    sub: '네이버 쇼핑 기반',
    desc: '검색으로 들어온 고객에게 신뢰를 주는 정보 중심 구조로 설계합니다.',
    tags: ['블로그형 글+그림', '이미지 슬라이드', '검색 신뢰 구조'],
    tone: ['#EDE8FF', '#D9CCFF'],
    tint: '#6D4CFF',
  },
  {
    key: '쿠팡',
    emoji: '🚀',
    sub: '로켓배송 경쟁 환경',
    desc: '빠른 스크롤 환경에서 구매 전환을 만드는 시각 임팩트 중심 구조입니다.',
    tags: ['이미지 슬라이드', '비주얼 임팩트', '빠른 전환 구조'],
    tone: ['#FFEDF5', '#FFD3E7'],
    tint: '#E0447E',
  },
  {
    key: '자사몰',
    emoji: '🏪',
    sub: '브랜드 직접 운영',
    desc: '브랜드 스토리와 고객 경험을 강화하는 프리미엄 구조로 설계합니다.',
    tags: ['HTML 섹션형', '브랜드 스토리', '감성 카피'],
    tone: ['#FFF1E8', '#FFDCC4'],
    tint: '#D97742',
  },
  {
    key: '와디즈',
    emoji: '💡',
    sub: '펀딩 · 예약판매',
    desc: '후원자의 공감을 이끄는 긴 호흡의 스토리텔링 구조로 설계합니다.',
    tags: ['긴 스크롤 HTML', '스토리텔링 구조', '공감 서사'],
    tone: ['#FFF8E1', '#FFEDB0'],
    tint: '#C99411',
  },
];

export default function ChannelScreen() {
  const isMobile = useIsMobile();
  const { setCh, go } = useApp();

  if (isMobile) return <ChannelMobile />;

  const pick = (key: string) => {
    setCh(key);
    go('s3');   // ★선택 즉시 이동
  };

  return (
    <div style={{
      minHeight: 'calc(100vh - 106px)',
      background: 'radial-gradient(1100px 500px at 50% -140px, #F1EBFF 0%, rgba(241,235,255,0) 62%), #FDFDFF',
      fontFamily: 'var(--f)',
    }}>
      <div style={{ maxWidth: '820px', margin: '0 auto', padding: '56px 24px 90px' }}>

        {/* 헤더 */}
        <div style={{ textAlign: 'center', marginBottom: '44px' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '7px',
            background: '#fff', border: '1px solid #E8E3FA', borderRadius: '999px',
            padding: '7px 16px', marginBottom: '20px',
            boxShadow: '0 2px 10px rgba(109,76,255,0.07)',
            fontSize: '12px', fontWeight: 700, color: '#6D4CFF', letterSpacing: '0.05em',
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#6D4CFF' }} />
            STEP 2 · 판매 채널
          </div>
          <h1 style={{
            fontSize: '36px', fontWeight: 800, color: '#191F28',
            letterSpacing: '-0.035em', lineHeight: 1.22, marginBottom: '14px',
          }}>
            어디에서{' '}
            <span style={{
              background: 'linear-gradient(120deg, #6D4CFF 20%, #9C6BFF 80%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>판매</span>
            하시나요?
          </h1>
          <p style={{ fontSize: '15px', color: '#8B95A1', lineHeight: 1.7 }}>
            채널을 선택하면 바로 다음 단계로 넘어가요<br />
            <span style={{ fontSize: '13.5px', color: '#AEB6C0' }}>페이지 구조가 채널 특성에 맞게 설계됩니다</span>
          </p>
        </div>

        {/* 채널 카드 2×2 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px', marginBottom: '40px' }}>
          {CHANNELS.map(c => (
            <ChannelCard key={c.key} c={c} onClick={() => pick(c.key)} />
          ))}
        </div>

        {/* 하단 — 이전만 */}
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <button onClick={() => go('s1')} style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            background: 'none', border: 'none',
            fontSize: '13.5px', fontWeight: 600, color: '#9CA3AF',
            cursor: 'pointer', padding: '8px 14px', borderRadius: '10px',
            fontFamily: 'inherit', transition: 'color .15s',
          }}
            onMouseEnter={e => (e.currentTarget.style.color = '#6D4CFF')}
            onMouseLeave={e => (e.currentTarget.style.color = '#9CA3AF')}
          >
            <ArrowLeft size={15} /> 카테고리 다시 선택
          </button>
        </div>
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
        position: 'relative', textAlign: 'left', width: '100%',
        padding: '26px 26px 24px',
        background: hov
          ? 'linear-gradient(180deg, #FFFFFF 0%, #FCFBFF 100%)'
          : 'linear-gradient(180deg, #FFFFFF 0%, #FDFCFF 100%)',
        border: '1px solid',
        borderColor: hov ? 'rgba(109,76,255,0.35)' : '#EDEBF4',
        borderRadius: '24px', cursor: 'pointer',
        boxShadow: hov
          ? '0 2px 4px rgba(25,31,40,0.04), 0 14px 34px rgba(109,76,255,0.14), 0 30px 60px rgba(25,31,40,0.08)'
          : '0 1px 2px rgba(25,31,40,0.03), 0 6px 20px rgba(25,31,40,0.05)',
        transform: hov ? 'translateY(-5px)' : 'none',
        transition: 'all 220ms cubic-bezier(.3,.9,.4,1)',
        fontFamily: 'inherit', userSelect: 'none', overflow: 'hidden',
      }}
    >
      {/* 호버 시 상단 미세 글로우 */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: '90px',
        background: `linear-gradient(180deg, ${c.tone[0]}55 0%, rgba(255,255,255,0) 100%)`,
        opacity: hov ? 1 : 0, transition: 'opacity 220ms', pointerEvents: 'none',
      }} />

      {/* 아이콘 + 배지 행 */}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{
          width: '52px', height: '52px', borderRadius: '17px',
          background: `linear-gradient(135deg, ${c.tone[0]} 0%, ${c.tone[1]} 100%)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '25px', lineHeight: 1,
          boxShadow: `inset 0 1px 0 rgba(255,255,255,0.8), 0 4px 12px ${c.tone[1]}66`,
          transform: hov ? 'scale(1.06) rotate(-3deg)' : 'none',
          transition: 'transform 220ms cubic-bezier(.3,.9,.4,1)',
        }}>
          {c.emoji}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {c.badge && (
            <span style={{
              fontSize: '11px', fontWeight: 700, color: '#fff',
              background: 'linear-gradient(120deg, #6D4CFF, #9C6BFF)',
              borderRadius: '999px', padding: '4px 11px',
              boxShadow: '0 3px 10px rgba(109,76,255,0.35)',
            }}>
              {c.badge}
            </span>
          )}
          <span style={{
            width: '30px', height: '30px', borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: hov ? '#6D4CFF' : '#F4F2FB',
            color: hov ? '#fff' : '#B4ACD6',
            transition: 'all 220ms', transform: hov ? 'translateX(2px)' : 'none',
          }}>
            <ArrowRight size={15} />
          </span>
        </div>
      </div>

      {/* 이름 */}
      <div style={{ position: 'relative', fontSize: '18px', fontWeight: 800, color: '#191F28', letterSpacing: '-0.02em', marginBottom: '3px' }}>
        {c.key}
      </div>
      <div style={{ position: 'relative', fontSize: '12.5px', fontWeight: 600, color: c.tint, marginBottom: '10px', opacity: 0.85 }}>
        {c.sub}
      </div>

      <p style={{ position: 'relative', fontSize: '13.5px', color: '#4E5968', lineHeight: 1.7, margin: '0 0 16px', letterSpacing: '-0.01em' }}>
        {c.desc}
      </p>

      {/* 태그 — 헤어라인 필 */}
      <div style={{ position: 'relative', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
        {c.tags.map(t => (
          <span key={t} style={{
            fontSize: '11.5px', fontWeight: 600, padding: '5px 11px',
            borderRadius: '999px', background: '#fff',
            border: '1px solid #ECEAF5', color: '#6B7684',
            boxShadow: '0 1px 3px rgba(25,31,40,0.03)',
          }}>
            {t}
          </span>
        ))}
      </div>
    </button>
  );
}
