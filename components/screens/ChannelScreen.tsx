'use client';

import { useState } from 'react';
import { ChevronRight, ArrowLeft, ArrowRight, Sparkles } from 'lucide-react';
import { useApp } from '@/store/AppContext';
import ChannelMobile from './ChannelMobile';
import { useIsMobile } from '@/hooks/useIsMobile';

// 4개 채널 — 시안(channel-design.png) 디자인. 채널별 accent 색·영문명 추가, 기존 데이터(이름·설명·칩) 유지.
type ChannelDef = { key: string; iconKey: 'naver' | 'coupang' | 'store' | 'wadiz'; en: string; accent: string; badge?: string | null; sub: string; desc: string; tags: string[] };
const ALL_CHANNELS: ChannelDef[] = [
  {
    key: '스마트스토어', iconKey: 'naver', en: 'Naver Shopping', accent: '#03C75A', badge: '추천 채널',
    sub: '네이버 쇼핑 기반',
    desc: '검색 유입을 기반으로 한 고객에게 신뢰도 높은 상세페이지를 제작합니다.',
    tags: ['블로그형 글+그림', '이미지 슬라이드', '썸네일 3종'],
  },
  {
    key: '쿠팡', iconKey: 'coupang', en: 'Coupang', accent: '#FF6A2B',
    sub: '로켓배송 경쟁 환경',
    desc: '빠른 스크롤과 구매 전환을 고려한 시각적 임팩트 중심으로 제작합니다.',
    tags: ['이미지 슬라이드', '흰 배경 누끼컷', '썸네일 2종'],
  },
  {
    key: '자사몰', iconKey: 'store', en: 'Own Mall', accent: '#8B5CF6',
    sub: '브랜드 직접 운영',
    desc: '브랜드의 스토리와 고객 경험을 강화하는 프리미엄 상세페이지 제작',
    tags: ['HTML 섹션형', '감성 카피', '전셀 맞춤'],
  },
  {
    key: '와디즈', iconKey: 'wadiz', en: 'Wadiz', accent: '#14B8A6',
    sub: '펀딩·예약판매',
    desc: '창의적인 스토리텔링으로 후원자의 공감을 이끌어내는 페이지 제작',
    tags: ['긴 스크롤 HTML', '50장+ 이미지', 'GIF 포함'],
  },
];

export default function ChannelScreen() {
  const isMobile = useIsMobile();
  const { ch, setCh, go } = useApp();

  if (isMobile) return <ChannelMobile />;

  return (
    <div style={{ maxWidth: '1060px', margin: '0 auto', padding: '44px 24px 100px', fontFamily: 'var(--f)' }}>

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
              background: 'conic-gradient(#7C3AED 0deg 190deg, #A78BFA 190deg 270deg, #DDD6FE 270deg 360deg)',
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

/* ─── 채널 아이콘 (소프트 틴트 스퀘어클 + 컬러풀 이모지 / 네이버는 초록 N) ─── */
const ICON_EMOJI: Record<ChannelDef['iconKey'], string | null> = { naver: null, coupang: '🚀', store: '🏪', wadiz: '💡' };
function ChannelIcon({ iconKey, accent, size = 54 }: { iconKey: ChannelDef['iconKey']; accent: string; size?: number }) {
  const emoji = ICON_EMOJI[iconKey];
  return (
    <div style={{
      width: size, height: size, borderRadius: 16, flexShrink: 0,
      background: `linear-gradient(140deg, ${accent}24, ${accent}0D)`,
      border: `1px solid ${accent}2B`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: Math.round(size * 0.46), lineHeight: 1,
    }}>
      {emoji ?? (
        <span style={{ color: accent, fontWeight: 900, fontSize: Math.round(size * 0.5), fontFamily: 'Arial, Helvetica, sans-serif', letterSpacing: '-0.02em', lineHeight: 1 }}>N</span>
      )}
    </div>
  );
}

/* ─── 채널별 미니 목업 (미니 상세페이지: 헤더 검색바 + 히어로 + 텍스트 + 썸네일 2장) ─── */
function MiniMockup({ accent }: { accent: string }) {
  return (
    <div style={{
      width: 122, flexShrink: 0, alignSelf: 'stretch', minHeight: 176,
      borderRadius: 14, border: '1px solid #EFEFF3', background: '#fff',
      padding: 11, display: 'flex', flexDirection: 'column', gap: 9, overflow: 'hidden',
      boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
    }}>
      {/* 헤더: 브랜드 닷 + 검색바 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{ width: 14, height: 14, borderRadius: 5, background: accent, flexShrink: 0 }} />
        <div style={{ flex: 1, height: 11, borderRadius: 6, background: '#F3F4F7' }} />
      </div>
      {/* 히어로 이미지(중앙 마크) */}
      <div style={{
        height: 50, borderRadius: 10, background: `linear-gradient(140deg, ${accent}22, ${accent}0C)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{ width: 22, height: 22, borderRadius: 8, background: `${accent}38` }} />
      </div>
      {/* 텍스트 라인 */}
      <div style={{ height: 6, borderRadius: 3, background: '#EEEFF3', width: '88%' }} />
      <div style={{ height: 6, borderRadius: 3, background: '#EEEFF3', width: '58%' }} />
      {/* 썸네일 2장 */}
      <div style={{ display: 'flex', gap: 6, marginTop: 'auto' }}>
        <div style={{ flex: 1, height: 26, borderRadius: 8, background: `${accent}1A` }} />
        <div style={{ flex: 1, height: 26, borderRadius: 8, background: '#F3F4F7' }} />
      </div>
    </div>
  );
}

/* ─── 채널 카드 (2×2 그리드 공통, 시안 디자인) ─── */
function BottomCard({ c, selected, onClick }: { c: ChannelDef; selected: boolean; onClick: () => void }) {
  const [hov, setHov] = useState(false);
  const a = c.accent;

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        position: 'relative',
        padding: '34px 26px 32px',
        background: '#fff',
        border: `${selected ? 2 : 1.5}px solid ${selected ? a : hov ? `${a}66` : '#ECECF2'}`,
        borderRadius: '18px', cursor: 'pointer',
        boxShadow: selected ? `0 0 0 3px ${a}1F` : hov ? '0 6px 18px rgba(0,0,0,0.07)' : '0 1px 3px rgba(0,0,0,0.04)',
        transition: 'all 140ms ease', userSelect: 'none',
      }}
    >
      {/* 추천 배지 — 우상단 (스마트스토어만). 시안대로 퍼플 + 반짝이. 카드 높이 영향 없게 absolute */}
      {c.badge && (
        <span style={{
          position: 'absolute', top: 16, right: 16,
          display: 'inline-flex', alignItems: 'center', gap: 4,
          fontSize: '11px', fontWeight: 700, padding: '4px 11px', borderRadius: '100px',
          background: 'linear-gradient(135deg, #7C5CFF, #6D4CFF)', color: '#fff', whiteSpace: 'nowrap',
          boxShadow: '0 3px 10px rgba(109,76,255,0.35)',
        }}><Sparkles size={11} /> {c.badge}</span>
      )}

      {/* 좌측 콘텐츠 + 우측 미니 목업 */}
      <div style={{ display: 'flex', gap: 16 }}>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          {/* 아이콘(브랜드 마크) + 채널명/영문 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
            <ChannelIcon iconKey={c.iconKey} accent={a} size={54} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 17, fontWeight: 800, color: '#111', letterSpacing: '-0.03em', lineHeight: 1.2 }}>{c.key}</div>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#B0B8C1', letterSpacing: '0.02em', marginTop: 2 }}>{c.en}</div>
            </div>
          </div>

          {/* 태그라인(채널 색) */}
          <div style={{ fontSize: 12.5, fontWeight: 700, color: a, marginBottom: 9 }}>{c.sub}</div>
          {/* 설명 */}
          <p style={{ fontSize: 12.5, color: '#6B7280', lineHeight: 1.75, margin: '0 0 18px', letterSpacing: '-0.01em' }}>{c.desc}</p>

          {/* 칩 (아이콘 + 텍스트, 채널 색 톤) */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 'auto' }}>
            {c.tags.map(t => (
              <span key={t} style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                fontSize: '10.5px', fontWeight: 600, padding: '3px 9px', borderRadius: '7px',
                background: `${a}12`, color: a,
              }}>
                <span style={{ width: 4, height: 4, borderRadius: '50%', background: a, flexShrink: 0 }} />
                {t}
              </span>
            ))}
          </div>
        </div>

        {/* 우측: 미니 목업 + 화살표(채널 색) */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
          <MiniMockup accent={a} />
          <div style={{
            width: 28, height: 28, borderRadius: '50%',
            background: selected ? a : `${a}14`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 140ms ease',
          }}>
            <ChevronRight size={15} color={selected ? '#fff' : a} />
          </div>
        </div>
      </div>
    </div>
  );
}
