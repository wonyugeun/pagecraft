'use client';

import { useState } from 'react';
import { useApp } from '@/store/AppContext';

const CHANNELS = [
  {
    key: '스마트스토어',
    ico: '🛒',
    tag: '셀러 1순위 추천',
    tagStyle: { background: '#FFF4E6', color: '#D4691C' },
    tl: '네이버 쇼핑 기반',
    why: '검색 유입 = 비교하고 온 고객. 블로그형 글+그림 구성이 SEO와 전환율 모두 잡는 핵심.',
    pills: ['블로그형 글+그림', '이미지 슬라이드', '썸네일 3종'],
    note: '출력형태 선택 가능: 블로그형 또는 이미지 슬라이드형',
    noteAuto: false,
  },
  {
    key: '쿠팡',
    ico: '🚀',
    tag: '이미지 중심',
    tagStyle: { background: '#E8F2FE', color: '#3182F6' },
    tl: '로켓배송 경쟁 환경',
    why: '가격·배송이 먼저 보이는 환경. 첫 3초 안에 구매 이유를 줘야 함.',
    pills: ['이미지 슬라이드', '흰 배경 누끼컷', '썸네일 2종'],
    note: '출력형태 자동 적용: 이미지 슬라이드형',
    noteAuto: true,
  },
  {
    key: '자사몰',
    ico: '🏪',
    tag: '브랜드 스토리',
    tagStyle: { background: '#FCE7F3', color: '#BE185D' },
    tl: '브랜드 직접 운영',
    why: '브랜드에 관심 있어서 온 고객. 세계관·스토리·감성 카피가 충성 고객 전환의 핵심.',
    pills: ['HTML 섹션', '감성 카피', '컨셉컷'],
    note: '출력형태 자동 적용: HTML 섹션형',
    noteAuto: true,
  },
  {
    key: '와디즈',
    ico: '💡',
    tag: '스토리텔링',
    tagStyle: { background: '#F3E8FF', color: '#7C3AED' },
    tl: '펀딩·예약판매',
    why: '처음 보는 제품을 납득시켜야 함. 창업 스토리+개발 과정+긴박감이 핵심.',
    pills: ['긴 스크롤 HTML', '50장+', 'GIF 포함'],
    note: '출력형태 자동 적용: HTML 긴 스크롤형',
    noteAuto: true,
  },
];

function ChannelCard({
  c,
  selected,
  onClick,
}: {
  c: (typeof CHANNELS)[number];
  selected: boolean;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        background: selected ? '#F4F9FF' : '#ffffff',
        border: `${selected ? '2px' : '1px'} solid ${selected ? '#3182F6' : hovered ? '#CBD2D9' : '#E8ECF0'}`,
        boxShadow: selected
          ? 'none'
          : hovered
          ? '0 4px 16px rgba(0,0,0,0.08)'
          : '0 1px 3px rgba(0,0,0,0.04)',
        borderRadius: '14px',
        padding: '28px 24px',
        cursor: 'pointer',
        transition: 'border-color 150ms ease, box-shadow 150ms ease, transform 150ms ease, background 150ms ease',
        transform: hovered && !selected ? 'translateY(-2px)' : 'none',
        userSelect: 'none',
        fontFamily: 'var(--f)',
        display: 'flex',
        flexDirection: 'column',
        gap: '0px',
      }}
    >
      {/* 선택 체크 */}
      {selected && (
        <span
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            width: '20px',
            height: '20px',
            background: '#3182F6',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '11px',
            color: '#ffffff',
            fontWeight: 700,
          }}
        >
          ✓
        </span>
      )}

      {/* 헤더: 이모지 + 채널명 + tl */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '12px' }}>
        <span style={{ fontSize: '44px', lineHeight: 1, flexShrink: 0 }}>{c.ico}</span>
        <div>
          <div
            style={{
              fontSize: '17px',
              fontWeight: 600,
              color: selected ? '#3182F6' : '#191F28',
              letterSpacing: '-0.02em',
              marginBottom: '3px',
              transition: 'color 150ms ease',
            }}
          >
            {c.key}
          </div>
          <div style={{ fontSize: '12px', color: '#8B95A1' }}>{c.tl}</div>
        </div>
      </div>

      {/* 배지 */}
      <span
        style={{
          display: 'inline-block',
          fontSize: '12px',
          fontWeight: 600,
          padding: '4px 10px',
          borderRadius: '100px',
          marginBottom: '14px',
          width: 'fit-content',
          ...c.tagStyle,
        }}
      >
        {c.tag}
      </span>

      {/* 설명 텍스트 */}
      <p
        style={{
          fontSize: '13px',
          color: '#4E5968',
          lineHeight: 1.65,
          marginBottom: '14px',
        }}
      >
        {c.why}
      </p>

      {/* 출력형태 칩 */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
        {c.pills.map(p => (
          <span
            key={p}
            style={{
              fontSize: '12px',
              fontWeight: 500,
              padding: '5px 11px',
              borderRadius: '8px',
              background: '#F2F4F6',
              color: '#4E5968',
            }}
          >
            {p}
          </span>
        ))}
      </div>

      {/* 출력형태 자동 안내 */}
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '5px',
          fontSize: '12px',
          fontWeight: 500,
          padding: '6px 10px',
          borderRadius: '8px',
          background: c.noteAuto ? '#F4F9FF' : '#F2F4F6',
          color: c.noteAuto ? '#3182F6' : '#8B95A1',
          width: 'fit-content',
        }}
      >
        {c.noteAuto && <span>⚡</span>}
        {c.note}
      </div>
    </div>
  );
}

export default function ChannelScreen() {
  const { ch, setCh, go } = useApp();
  const [backHovered, setBackHovered] = useState(false);
  const [nextHovered, setNextHovered] = useState(false);

  return (
    <div
      style={{
        maxWidth: '960px',
        margin: '0 auto',
        padding: '56px 24px 120px',
        fontFamily: 'var(--f)',
      }}
    >
      {/* 헤더 */}
      <div style={{ marginBottom: '64px', textAlign: 'center' }}>
        <h1
          style={{
            fontSize: '36px',
            fontWeight: 700,
            color: '#191F28',
            letterSpacing: '-0.03em',
            lineHeight: 1.2,
            marginBottom: '12px',
          }}
        >
          어디서 판매하고 계세요?
        </h1>
        <p style={{ fontSize: '16px', color: '#4E5968', lineHeight: 1.6 }}>
          채널마다 구매자 심리가 달라요 — 최적 구조로 자동 분기됩니다
        </p>
      </div>

      {/* 채널 그리드 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '16px',
          marginBottom: '0',
        }}
      >
        {CHANNELS.map(c => (
          <ChannelCard
            key={c.key}
            c={c}
            selected={ch === c.key}
            onClick={() => setCh(c.key)}
          />
        ))}
      </div>

      {/* 하단 CTA */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: '48px',
          paddingTop: '28px',
          borderTop: '1px solid #E8ECF0',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <button
          onClick={() => go('s1')}
          onMouseEnter={() => setBackHovered(true)}
          onMouseLeave={() => setBackHovered(false)}
          style={{
            background: 'transparent',
            border: `1px solid ${backHovered ? '#CBD2D9' : '#E8ECF0'}`,
            borderRadius: '8px',
            padding: '10px 20px',
            fontSize: '14px',
            color: backHovered ? '#191F28' : '#4E5968',
            cursor: 'pointer',
            fontFamily: 'var(--f)',
            transition: 'all 150ms ease',
          }}
        >
          ← 이전
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {ch ? (
            <span style={{ fontSize: '13px', color: '#8B95A1' }}>
              선택됨:{' '}
              <span
                style={{
                  background: '#E8F2FE',
                  color: '#3182F6',
                  padding: '3px 10px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                }}
              >
                {ch}
              </span>
            </span>
          ) : (
            <span style={{ fontSize: '13px', color: '#B0B8C1' }}>
              ← 채널을 선택해주세요
            </span>
          )}

          <button
            disabled={!ch}
            onClick={() => ch && go('s3')}
            onMouseEnter={() => setNextHovered(true)}
            onMouseLeave={() => setNextHovered(false)}
            style={{
              background: !ch ? '#F2F4F6' : nextHovered ? '#1B64DA' : '#3182F6',
              color: !ch ? '#B0B8C1' : '#ffffff',
              boxShadow: ch ? '0 4px 12px rgba(49,130,246,0.22)' : 'none',
              border: 'none',
              borderRadius: '8px',
              padding: '11px 28px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: !ch ? 'not-allowed' : 'pointer',
              fontFamily: 'var(--f)',
              transition: 'all 150ms ease',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              letterSpacing: '-0.01em',
            }}
          >
            다음 →
          </button>
        </div>
      </div>
    </div>
  );
}
