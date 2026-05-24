'use client';

import { useState } from 'react';
import { useApp } from '@/store/AppContext';

const CATS = [
  { key: '화장품',   ico: '✨', sub: '스킨케어 · 색조 · 선케어' },
  { key: '식품',     ico: '🍱', sub: '신선 · 가공 · 건기식' },
  { key: '패션',     ico: '👔', sub: '의류 · 신발 · 가방' },
  { key: '생활',     ico: '🛋️', sub: '가구 · 소품 · 청소' },
  { key: '가전',     ico: '📱', sub: '전자기기 · 주변기기' },
  { key: '반려동물', ico: '🐶', sub: '사료 · 간식 · 용품' },
  { key: '스포츠',   ico: '⚽', sub: '운동용품 · 아웃도어' },
  { key: '유아',     ico: '🧸', sub: '유아용품 · 임산부' },
  { key: '건강',     ico: '💪', sub: '건강용품 · 의료기기' },
  { key: '자동차',   ico: '🚙', sub: '차량용품 · 튜닝' },
  { key: '기타',     ico: '🎁', sub: '그 외 카테고리' },
] as const;

/* ─── 재사용 가능한 카테고리 카드 ─── */
export interface CatCardProps {
  icon: string;
  name: string;
  sub: string;
  selected: boolean;
  onClick: () => void;
}

export function CatCard({ icon, name, sub, selected, onClick }: CatCardProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        padding: '28px 20px 24px',
        width: '100%',
        background: selected ? '#F4F9FF' : '#ffffff',
        border: `${selected ? '2px' : '1px'} solid ${selected ? '#3182F6' : hovered ? '#CBD2D9' : '#E8ECF0'}`,
        boxShadow: selected
          ? '0 0 0 0px transparent'
          : hovered
          ? '0 4px 16px rgba(0,0,0,0.08)'
          : '0 1px 3px rgba(0,0,0,0.04)',
        borderRadius: '14px',
        cursor: 'pointer',
        transition: 'border-color 150ms ease, box-shadow 150ms ease, transform 150ms ease, background 150ms ease',
        transform: hovered && !selected ? 'translateY(-2px)' : 'none',
        userSelect: 'none',
        fontFamily: 'var(--f)',
      }}
    >
      {/* 선택 체크 마크 */}
      {selected && (
        <span
          style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
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
            lineHeight: 1,
            flexShrink: 0,
          }}
        >
          ✓
        </span>
      )}

      {/* 이모지 */}
      <span style={{ fontSize: '44px', lineHeight: 1, marginBottom: '14px', display: 'block' }}>
        {icon}
      </span>

      {/* 카테고리명 */}
      <span
        style={{
          fontSize: '15px',
          fontWeight: 600,
          color: selected ? '#3182F6' : '#191F28',
          letterSpacing: '-0.01em',
          marginBottom: '5px',
          display: 'block',
          transition: 'color 150ms ease',
        }}
      >
        {name}
      </span>

      {/* 설명 */}
      <span style={{ fontSize: '12px', color: '#8B95A1', lineHeight: 1.5, display: 'block' }}>
        {sub}
      </span>
    </button>
  );
}

/* ─── 메인 화면 ─── */
export default function CategoryScreen() {
  const { cat, setCat, go } = useApp();
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
      {/* ── 헤더 (가운데 정렬) ── */}
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
          어떤 상품의 상세페이지를 만드세요?
        </h1>
        <p style={{ fontSize: '16px', color: '#4E5968', lineHeight: 1.6 }}>
          카테고리를 선택하면 그에 맞는 기획 구조로 자동 설계됩니다
        </p>
      </div>

      {/* ── 카테고리 그리드 ── */}
      <div className="cat-grid-v2">
        {CATS.map(c => (
          <CatCard
            key={c.key}
            icon={c.ico}
            name={c.key}
            sub={c.sub}
            selected={cat === c.key}
            onClick={() => { if (cat !== c.key) setCat(c.key); }}
          />
        ))}
      </div>

      {/* ── CTA ── */}
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
        {/* 대시보드 버튼 */}
        <button
          onClick={() => go('s-dash')}
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
          ← 대시보드
        </button>

        {/* 우측 영역 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {/* 선택 상태 표시 */}
          {cat ? (
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
                {cat}
              </span>
            </span>
          ) : (
            <span style={{ fontSize: '13px', color: '#B0B8C1' }}>
              ← 카테고리를 선택해주세요
            </span>
          )}

          {/* 다음 버튼 */}
          <button
            disabled={!cat}
            onClick={() => cat && go('s2')}
            onMouseEnter={() => setNextHovered(true)}
            onMouseLeave={() => setNextHovered(false)}
            style={{
              background: !cat
                ? '#F2F4F6'
                : nextHovered
                ? '#1B64DA'
                : '#3182F6',
              color: !cat ? '#B0B8C1' : '#ffffff',
              boxShadow: cat ? '0 4px 12px rgba(49,130,246,0.22)' : 'none',
              border: 'none',
              borderRadius: '8px',
              padding: '11px 28px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: !cat ? 'not-allowed' : 'pointer',
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
