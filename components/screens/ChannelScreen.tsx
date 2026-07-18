'use client';

import { useState } from 'react';
import { ChevronRight, ArrowLeft, ArrowRight } from 'lucide-react';
import { useApp } from '@/store/AppContext';
import ChannelMobile from './ChannelMobile';
import { useIsMobile } from '@/hooks/useIsMobile';

const TOP_CHANNELS = [
  {
    key: '스마트스토어',
    emoji: '🛒',
    iconBg: 'linear-gradient(135deg, #EDE8FF 0%, #D8CFFF 100%)',
    badge: '추천 채널',
    sub: '네이버 쇼핑 기반',
    desc: '검색 유입을 기반으로 한 고객에게 신뢰도 높은 상세페이지를 제작합니다.',
    tags: ['블로그형 글+그림', '이미지 슬라이드', '검색 신뢰 구조'],
  },
  {
    key: '쿠팡',
    emoji: '🚀',
    iconBg: 'linear-gradient(135deg, #FFECF4 0%, #FFD6E9 100%)',
    badge: null,
    sub: '로켓배송 경쟁 환경',
    desc: '빠른 스크롤과 구매 전환을 고려한 시각적 임팩트 중심으로 제작합니다.',
    tags: ['이미지 슬라이드', '비주얼 임팩트', '빠른 전환 구조'],
  },
];

const BOTTOM_CHANNELS = [
  {
    key: '자사몰',
    emoji: '🏪',
    iconBg: 'linear-gradient(135deg, #FFEEE8 0%, #FFD9CC 100%)',
    sub: '브랜드 직접 운영',
    desc: '브랜드의 스토리와 고객 경험을 강화하는 프리미엄 상세페이지 제작',
    tags: ['HTML 섹션형', '브랜드 스토리', '감성 카피'],
  },
  {
    key: '와디즈',
    emoji: '💡',
    iconBg: 'linear-gradient(135deg, #FFFBEA 0%, #FFF3B8 100%)',
    sub: '펀딩·예약판매',
    desc: '창의적인 스토리텔링으로 후원자의 공감을 이끌어내는 페이지 제작',
    tags: ['긴 스크롤 HTML', '스토리텔링 구조', '공감 서사'],
  },
];

const TAG_STYLE = {
  fontSize: '11.5px', fontWeight: 500,
  padding: '4px 10px', borderRadius: '6px',
  background: '#F2F4F6', color: '#4E5968',
} as const;

// 4개 채널을 동일 카드(2×2 균등 그리드)로 통일. 데이터·디자인은 그대로, badge만 선택 필드로 통합.
type ChannelDef = { key: string; emoji: string; iconBg: string; badge?: string | null; sub: string; desc: string; tags: string[] };
const ALL_CHANNELS: ChannelDef[] = [...TOP_CHANNELS, ...BOTTOM_CHANNELS];

export default function ChannelScreen() {
  const isMobile = useIsMobile();
  const { ch, setCh, go } = useApp();

  if (isMobile) return <ChannelMobile />;

  return (
    <div style={{ maxWidth: '820px', margin: '0 auto', padding: '44px 24px 100px', fontFamily: 'var(--f)' }}>

      {/* STEP pill */}
      <div style={{ textAlign: 'center', marginBottom: '18px' }}>
        <span style={{
          display: 'inline-block', padding: '5px 14px',
          border: '1.5px solid #D8CFFF', borderRadius: '100px',
          fontSize: '12px', fontWeight: 700, color: '#6D4CFF', letterSpacing: '0.04em',
        }}>
          STEP 2 / 10
        </span>
      </div>

      {/* 타이틀 */}
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <h1 style={{
          fontSize: '30px', fontWeight: 800, color: '#111',
          letterSpacing: '-0.04em', lineHeight: 1.3, marginBottom: '10px',
        }}>
          어떤 <span style={{ color: '#6D4CFF' }}>채널</span>에서 <span style={{ color: '#6D4CFF' }}>판매</span>하시나요? 🤔
        </h1>
        <p style={{ fontSize: '14px', color: '#9CA3AF', lineHeight: 1.6 }}>
          각 채널의 특성에 맞게 최적의 상세페이지 구조로 자동 분기됩니다
        </p>
      </div>

      {/* AI 배너 */}
      <div style={{
        background: '#F8F7FF',
        border: '1px solid #EAE4FF', borderRadius: '16px',
        padding: '28px 32px', marginBottom: '14px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        overflow: 'hidden', position: 'relative',
      }}>
        {/* 텍스트 */}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '14px', color: '#A89DD4', marginBottom: '10px', letterSpacing: '0.08em' }}>✦ ✦</div>
          <p style={{ fontSize: '19px', fontWeight: 700, color: '#1A1A1A', letterSpacing: '-0.03em', lineHeight: 1.5, margin: 0 }}>
            AI가 채널 특성에 맞게<br />
            <span style={{ color: '#6D4CFF' }}>최적의</span> 상세페이지를 설계해드려요
          </p>
        </div>

        {/* 우측 일러스트 — 페이지 레이아웃 미리보기 스타일 */}
        <div style={{ flexShrink: 0, display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
          {/* 미니 페이지 카드 */}
          <div style={{
            width: '88px', background: '#fff', borderRadius: '10px',
            border: '1px solid #E4DCFF', padding: '10px 10px 8px',
            display: 'flex', flexDirection: 'column', gap: '5px',
            boxShadow: '0 2px 12px rgba(109,76,255,0.08)',
          }}>
            <div style={{ width: '100%', height: '36px', borderRadius: '6px', background: 'linear-gradient(135deg,#EDE8FF,#D8CFFF)' }} />
            <div style={{ width: '80%', height: '5px', borderRadius: '3px', background: '#E4DCFF' }} />
            <div style={{ width: '60%', height: '5px', borderRadius: '3px', background: '#EDE9FE' }} />
            <div style={{ width: '70%', height: '5px', borderRadius: '3px', background: '#EDE9FE' }} />
            <div style={{ width: '100%', height: '20px', borderRadius: '5px', background: '#8B5CF6', marginTop: '2px' }} />
          </div>

          {/* 도넛 차트 */}
          <div style={{ position: 'relative', width: '64px', height: '64px', flexShrink: 0 }}>
            <div style={{
              width: '64px', height: '64px', borderRadius: '50%',
              background: 'conic-gradient(#6D4CFF 0deg 190deg, #A78BFA 190deg 270deg, #DDD6FE 270deg 360deg)',
            }} />
            <div style={{
              position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
              width: '28px', height: '28px', borderRadius: '50%', background: '#F8F7FF',
            }} />
          </div>

          {/* 아이콘 2개 세로 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '9px',
              background: '#fff', border: '1px solid #DDD6FE',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 1px 6px rgba(109,76,255,0.07)',
            }}>
              <div style={{ width: '18px', height: '14px', borderRadius: '3px', background: 'linear-gradient(135deg,#C4B5FD,#A78BFA)' }} />
            </div>
            <div style={{
              width: '36px', height: '36px', borderRadius: '9px',
              background: '#fff', border: '1px solid #DDD6FE',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 1px 6px rgba(109,76,255,0.07)',
            }}>
              <div style={{
                width: '16px', height: '16px', borderRadius: '50%',
                border: '2.5px solid #A78BFA', borderTopColor: 'transparent',
                transform: 'rotate(45deg)',
              }} />
            </div>
          </div>
        </div>
      </div>

      {/* 채널 4개 - 2×2 균등 그리드 (모바일 1열). 위계 통일, 추천은 배지로만 강조. */}
      <div className="cards-2col" style={{ marginBottom: '24px' }}>
        {ALL_CHANNELS.map(c => (
          <BottomCard key={c.key} c={c} selected={ch === c.key} onClick={() => setCh(c.key)} />
        ))}
      </div>

      {/* '직접 설정하기'(미구현 죽은 버튼) 박스 제거 — 채널 4개가 한국 이커머스 커버, 커스텀 불필요. */}

      {/* 하단 네비 */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        paddingTop: '24px', borderTop: '1px solid #EBEBEB',
      }}>
        <button onClick={() => go('s1')} style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          background: 'none', border: 'none',
          fontSize: '13.5px', fontWeight: 600, color: '#9CA3AF',
          cursor: 'pointer', padding: '8px 0',
        }}>
          <ArrowLeft size={15} /> 이전 단계
        </button>

        <span style={{ fontSize: '12px', color: '#C4C4C4', letterSpacing: '-0.01em' }}>
          {ch ? `${ch} 선택됨` : '채널을 선택하면 다음 단계로 이동합니다'}
        </span>

        <button
          disabled={!ch}
          onClick={() => ch && go('s3')}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '12px 26px',
            background: ch ? '#6D4CFF' : '#EDE8FF',
            color: ch ? '#fff' : '#B0A0E8',
            border: 'none', borderRadius: '10px',
            fontSize: '14px', fontWeight: 700,
            cursor: ch ? 'pointer' : 'not-allowed',
            letterSpacing: '-0.01em',
            transition: 'all 150ms ease',
            boxShadow: ch ? '0 4px 14px rgba(109,76,255,0.30)' : 'none',
          }}
        >
          다음 단계로 <ArrowRight size={15} />
        </button>
      </div>
    </div>
  );
}

/* ─── 채널 카드 (2×2 그리드 공통) ─── */
function BottomCard({ c, selected, onClick }: { c: ChannelDef; selected: boolean; onClick: () => void }) {
  const [hov, setHov] = useState(false);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        padding: '20px 20px 18px',
        background: selected ? '#F7F5FF' : '#fff',
        border: `${selected ? 2 : 1.5}px solid ${selected ? '#6D4CFF' : hov ? '#C4B5FD' : '#E5E7EB'}`,
        borderRadius: '14px', cursor: 'pointer',
        boxShadow: selected ? '0 0 0 3px rgba(109,76,255,0.08)' : hov ? '0 4px 16px rgba(0,0,0,0.06)' : 'none',
        transition: 'all 140ms ease', userSelect: 'none',
      }}
    >
      {/* 아이콘 + 화살표 */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '14px' }}>
        <div style={{
          width: '54px', height: '54px', borderRadius: '50%',
          background: c.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '26px', lineHeight: 1,
        }}>
          {c.emoji}
        </div>
        {/* 우측: 추천 배지(있을 때만) + 화살표. 같은 행이라 카드 높이 안 늘어남(4개 동일 크기). */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {c.badge && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', fontSize: '11px', fontWeight: 700,
              padding: '3px 9px', borderRadius: '100px', background: '#6D4CFF', color: '#fff', whiteSpace: 'nowrap',
            }}>
              {c.badge}
            </span>
          )}
          <div style={{
            width: '28px', height: '28px', borderRadius: '50%',
            background: selected ? '#6D4CFF' : '#F0ECFF',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 140ms ease', flexShrink: 0,
          }}>
            <ChevronRight size={14} color={selected ? '#fff' : '#6D4CFF'} />
          </div>
        </div>
      </div>

      {/* 채널명 */}
      <div style={{ fontSize: '16px', fontWeight: 800, color: selected ? '#6D4CFF' : '#111', letterSpacing: '-0.03em', marginBottom: '3px' }}>
        {c.key}
      </div>
      <div style={{ fontSize: '12px', color: '#B0B8C1', marginBottom: '12px' }}>{c.sub}</div>

      {/* 설명 */}
      <p style={{ fontSize: '13px', color: '#555', lineHeight: 1.65, marginBottom: '14px', letterSpacing: '-0.01em' }}>
        {c.desc}
      </p>

      {/* 태그 */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
        {c.tags.map(t => <span key={t} style={{ ...TAG_STYLE, fontSize: '11px', padding: '3px 9px' }}>{t}</span>)}
      </div>
    </div>
  );
}
