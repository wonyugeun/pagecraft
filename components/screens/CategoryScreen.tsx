'use client';

import { useState } from 'react';
import {
  Bot, Sparkles, Package, Shirt, Sofa, Smartphone, Dog, Volleyball, Baby, Car, Dumbbell,
  Gift, ChevronRight,
} from 'lucide-react';
import { useApp } from '@/store/AppContext';
import CategoryMobile from './CategoryMobile';
import { useIsMobile } from '@/hooks/useIsMobile';

const CATEGORIES = [
  { id: '화장품',   name: '화장품',   desc: '스킨케어·색조·선케어',  icon: Sparkles,   bgColor: '#F4F0FF', bgColorDark: '#E5DEFF', iconColor: '#6D4CFF' },
  { id: '식품',     name: '식품',     desc: '신선·가공·건강식',       icon: Package,    bgColor: '#FFF0F5', bgColorDark: '#FFD9E5', iconColor: '#FF4D8D' },
  { id: '패션',     name: '패션',     desc: '의류·신발·가방',         icon: Shirt,      bgColor: '#E6F1FB', bgColorDark: '#C7E0F5', iconColor: '#378ADD' },
  { id: '생활',     name: '생활',     desc: '가구·소품·청소',         icon: Sofa,       bgColor: '#FFF4DD', bgColorDark: '#FFE5B5', iconColor: '#F59E0B' },
  { id: '가전',     name: '가전',     desc: '전자기기·주변기기',      icon: Smartphone, bgColor: '#E0F7F1', bgColorDark: '#B8EBDA', iconColor: '#1D9E75' },
  { id: '반려동물', name: '반려동물', desc: '사료·간식·용품',          icon: Dog,        bgColor: '#FFFBEA', bgColorDark: '#FFF3B8', iconColor: '#EAB308' },
  { id: '스포츠',   name: '스포츠',   desc: '운동용품·아웃도어',      icon: Volleyball, bgColor: '#EAF3DE', bgColorDark: '#D0E5B8', iconColor: '#639922' },
  { id: '유아',     name: '유아',     desc: '유아용품·임산부',        icon: Baby,       bgColor: '#EEEDFE', bgColorDark: '#D8D5F5', iconColor: '#7F77DD' },
  { id: '자동차',   name: '자동차',   desc: '차량용품·튜닝',          icon: Car,        bgColor: '#E6F1FB', bgColorDark: '#B8D4F5', iconColor: '#185FA5' },
  { id: '건강',     name: '건강',     desc: '건강용품·의료기기',      icon: Dumbbell,   bgColor: '#FCEBEB', bgColorDark: '#FAD0D0', iconColor: '#E24B4A' },
  { id: '기타',     name: '기타',     desc: '그 외 카테고리',         icon: Gift,       bgColor: '#F1EFE8', bgColorDark: '#DDD9D0', iconColor: '#888780' },
];

export default function CategoryScreen() {
  const isMobile = useIsMobile();
  const { cat, setCat, go, toggleChat } = useApp();

  if (isMobile) return <CategoryMobile />;

  const handleCatClick = (id: string) => {
    setCat(id);
    go('s2');
  };

  return (
    <div style={{ height: '100vh', overflowY: 'auto', fontFamily: 'var(--f)', background: '#F8F9FA' }}>
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '36px 48px 60px' }}>

          {/* 타이틀 — 가운데 정렬 */}
          <div style={{ marginBottom: '36px', textAlign: 'center' }}>
            <h1 style={{
              fontSize: '28px', fontWeight: 800, color: '#1A1A1A',
              letterSpacing: '-0.04em', lineHeight: 1.2, marginBottom: '10px',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0', flexWrap: 'wrap',
            }}>
              어떤&nbsp;
              <span style={{ color: '#6D4CFF', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                카테고리
                <Sparkles size={22} style={{ color: '#6D4CFF', flexShrink: 0 }} />
              </span>
              &nbsp;의 상세페이지를 만들까요?
            </h1>
            <p style={{ fontSize: '14px', color: '#888', lineHeight: 1.6 }}>
              카테고리를 선택하면 최적화된 기획 구조로 자동 설계됩니다
            </p>
          </div>

          {/* 카테고리 그리드 (데스크톱 4열 / 태블릿 3열 / 모바일 2열) */}
          <div
            className="cat-grid-responsive"
            style={{ marginBottom: '28px' }}
          >
            {CATEGORIES.map(c => (
              <CategoryCard
                key={c.id}
                category={c}
                selected={cat === c.id}
                onClick={() => handleCatClick(c.id)}
              />
            ))}
          </div>

          {/* AI 추천 박스 */}
          <div style={{
            background: 'linear-gradient(135deg, #F4F0FF 0%, #EDE8FF 100%)',
            border: '1px solid #DDD4FF',
            borderRadius: '14px',
            padding: '20px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{
                width: '42px', height: '42px', borderRadius: '12px',
                background: '#6D4CFF', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Bot size={20} color="#fff" />
              </div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#1A1A1A', marginBottom: '3px', letterSpacing: '-0.02em' }}>
                  AI가 카테고리를 추천해 드릴까요?
                </div>
                <div style={{ fontSize: '12.5px', color: '#7B6EA8', letterSpacing: '-0.01em' }}>
                  판매하는 상품을 간단히 설명하면 최적 카테고리를 추천드립니다
                </div>
              </div>
            </div>
            <button
              onClick={() => toggleChat()}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '10px 18px', background: '#6D4CFF', color: '#fff',
                border: 'none', borderRadius: '9px', fontSize: '13px', fontWeight: 600,
                cursor: 'pointer', letterSpacing: '-0.01em', flexShrink: 0,
              }}
            >
              AI 추천 받기 <ChevronRight size={14} />
            </button>
          </div>

      </div>
    </div>
  );
}

type Category = typeof CATEGORIES[number];

function CategoryCard({ category, selected, onClick }: { category: Category; selected: boolean; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  const Icon = category.icon;

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
        padding: '20px 18px 18px', width: '100%', textAlign: 'left',
        background: selected ? '#F4F0FF' : '#ffffff',
        border: `${selected ? '2px' : '1.5px'} solid ${selected ? '#6D4CFF' : hovered ? '#C4B5FD' : '#EBEBEB'}`,
        borderRadius: '16px', cursor: 'pointer',
        boxShadow: selected ? '0 0 0 3px rgba(109,76,255,0.10)' : hovered ? '0 4px 14px rgba(0,0,0,0.07)' : '0 1px 3px rgba(0,0,0,0.04)',
        transition: 'all 150ms ease',
        transform: hovered && !selected ? 'translateY(-2px)' : 'none',
        userSelect: 'none', fontFamily: 'var(--f)',
      }}
    >
      {/* 원형 그라데이션 아이콘 배경 */}
      <div style={{
        width: '64px', height: '64px', borderRadius: '50%',
        background: `linear-gradient(135deg, ${category.bgColor} 0%, ${category.bgColorDark} 100%)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: '16px', flexShrink: 0,
      }}>
        <Icon size={30} color={category.iconColor} strokeWidth={2} />
      </div>

      {/* 카테고리명 */}
      <span style={{
        fontSize: '15px', fontWeight: 700,
        color: selected ? '#6D4CFF' : '#1A1A1A',
        letterSpacing: '-0.02em', marginBottom: '4px', display: 'block',
      }}>
        {category.name}
      </span>

      {/* 설명 */}
      <span style={{ fontSize: '12px', color: '#999', lineHeight: 1.4, display: 'block' }}>
        {category.desc}
      </span>

      {/* 화살표 */}
      <div style={{
        position: 'absolute', right: '14px', bottom: '16px',
        color: selected ? '#6D4CFF' : '#CCC',
        display: 'flex', alignItems: 'center',
        transition: 'color 150ms ease',
      }}>
        <ChevronRight size={16} />
      </div>

      {/* 선택 표시 */}
      {selected && (
        <div style={{
          position: 'absolute', top: '10px', right: '10px',
          width: '18px', height: '18px', borderRadius: '50%',
          background: '#6D4CFF', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontSize: '10px', color: '#fff', fontWeight: 700 }}>✓</span>
        </div>
      )}
    </button>
  );
}
