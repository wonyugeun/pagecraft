'use client';

import { useState } from 'react';
import {
  Sparkles, Package, Shirt, Sofa, Smartphone, Dog,
  Volleyball, Baby, Car, Dumbbell, Gift, Search,
  Zap, ChevronDown, MessageCircle, MoreHorizontal,
  ArrowRight,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useApp } from '@/store/AppContext';

interface CategoryItem {
  id: string;
  name: string;
  desc: string;
  Icon: LucideIcon;
  bg: string;
  color: string;
}

const CATEGORIES: CategoryItem[] = [
  { id: '화장품',   name: '화장품',   desc: '스킨케어 · 색조 · 선케어',  Icon: Sparkles,   bg: '#F4F0FF', color: '#6D4CFF' },
  { id: '식품',     name: '식품',     desc: '신선 · 가공 · 건강식',       Icon: Package,    bg: '#FFF0F5', color: '#FF4D8D' },
  { id: '패션',     name: '패션',     desc: '의류 · 신발 · 가방',         Icon: Shirt,      bg: '#E6F1FB', color: '#378ADD' },
  { id: '생활',     name: '생활',     desc: '가구 · 소품 · 청소',         Icon: Sofa,       bg: '#FFF4DD', color: '#F59E0B' },
  { id: '가전',     name: '가전',     desc: '전자기기 · 주방기기',        Icon: Smartphone, bg: '#E0F7F1', color: '#1D9E75' },
  { id: '반려동물', name: '반려동물', desc: '사료 · 간식 · 용품',          Icon: Dog,        bg: '#FFFBEA', color: '#EAB308' },
  { id: '스포츠',   name: '스포츠',   desc: '운동용품 · 아웃도어',        Icon: Volleyball, bg: '#EAF3DE', color: '#639922' },
  { id: '유아',     name: '유아',     desc: '유아용품 · 임산부',           Icon: Baby,       bg: '#EEEDFE', color: '#7F77DD' },
  { id: '자동차',   name: '자동차',   desc: '차량용품 · 튜닝',             Icon: Car,        bg: '#DBEAFE', color: '#185FA5' },
  { id: '건강',     name: '건강',     desc: '건강용품 · 의료기기',        Icon: Dumbbell,   bg: '#FCEBEB', color: '#E24B4A' },
];

const ETC: CategoryItem = {
  id: '기타', name: '기타', desc: '그 외 카테고리', Icon: Gift, bg: '#FFF0F5', color: '#FF4D8D',
};

const STEPS = [
  { num: 1, label: '카테고리' },
  { num: 2, label: '채널' },
  { num: 3, label: '타입' },
  { num: 4, label: '출력형태' },
  { num: 5, label: '상품정보' },
];

export default function CategoryMobile() {
  const { setCat, go, toggleChat, credits } = useApp();
  const [query, setQuery] = useState('');

  const onPick = (id: string) => {
    setCat(id);
    go('s2');
  };

  const renderCard = (c: CategoryItem) => (
    <div
      key={c.id}
      onClick={() => onPick(c.id)}
      style={{
        background: '#fff', borderRadius: 16,
        border: '1px solid #F0F0F4',
        padding: 16,
        cursor: 'pointer',
      }}
    >
      <div style={{
        width: 44, height: 44, borderRadius: '50%',
        background: c.bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 14,
      }}>
        <c.Icon size={22} color={c.color} />
      </div>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4,
      }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#111' }}>{c.name}</div>
        <ArrowRight size={16} color="#999" />
      </div>
      <div style={{ marginTop: 4, fontSize: 11.5, color: '#999' }}>{c.desc}</div>
    </div>
  );

  return (
    <div style={{
      minHeight: '100vh', background: '#FAFAFC',
      fontFamily: 'Pretendard, sans-serif',
      paddingBottom: 32,
    }}>

      {/* 1) 상단 헤더 */}
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 20px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <img src="/images/logo-flik.png" alt="Flik" style={{ height: 30, width: "auto", objectFit: "contain", display: "block" }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button onClick={toggleChat} style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            background: '#fff', border: '1px solid #ECECF2', borderRadius: 999,
            padding: '6px 10px', fontSize: 12, fontWeight: 600, color: '#111',
            cursor: 'pointer', fontFamily: 'inherit',
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22C55E' }} />
            AI 도우미
          </button>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            background: '#fff', border: '1px solid #ECECF2', borderRadius: 999,
            padding: '6px 10px', fontSize: 12, fontWeight: 700, color: '#111',
          }}>
            <Zap size={12} color="#F59E0B" fill="#F59E0B" /> {credits}
          </div>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 2,
            background: '#6D4CFF', color: '#fff',
            border: 'none', borderRadius: 999,
            width: 36, height: 36,
            justifyContent: 'center',
          }}>
            <ChevronDown size={12} color="#fff" />
          </div>
        </div>
      </header>

      {/* 2) 진행 단계 1~5 + 더보기 */}
      <section style={{ padding: '12px 20px 0' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 4 }}>
          {STEPS.map((s, i) => {
            const active = s.num === 1;
            return (
              <div key={s.num} style={{
                flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
                position: 'relative',
              }}>
                <div style={{
                  width: 30, height: 30, borderRadius: '50%',
                  background: active ? '#6D4CFF' : '#fff',
                  border: active ? 'none' : '1.5px solid #ECECF2',
                  color: active ? '#fff' : '#999',
                  fontSize: 13, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  zIndex: 1,
                }}>{s.num}</div>
                <span style={{
                  marginTop: 6, fontSize: 11,
                  color: active ? '#111' : '#999',
                  fontWeight: active ? 700 : 500,
                }}>{s.label}</span>
                {/* 연결선 */}
                {i < STEPS.length - 1 && (
                  <div style={{
                    position: 'absolute', top: 15, left: 'calc(50% + 18px)', right: 'calc(-50% + 18px)',
                    height: 1, background: '#ECECF2',
                  }} />
                )}
              </div>
            );
          })}
          {/* 더보기 ... */}
          <div style={{
            width: 30, height: 30, borderRadius: '50%',
            background: '#fff', border: '1.5px solid #ECECF2',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <MoreHorizontal size={14} color="#999" />
          </div>
        </div>
      </section>

      {/* 3) 1/10 배지 */}
      <section style={{ padding: '24px 20px 0' }}>
        <span style={{
          display: 'inline-block',
          background: '#F4F0FF', color: '#6D4CFF',
          fontSize: 11, fontWeight: 700,
          borderRadius: 999, padding: '4px 12px',
        }}>
          1 / 10
        </span>
      </section>

      {/* 4) 타이틀 */}
      <section style={{ padding: '14px 20px 0' }}>
        <h1 style={{
          margin: 0, fontSize: 28, fontWeight: 800, color: '#111',
          lineHeight: 1.3, letterSpacing: '-0.03em',
          position: 'relative',
        }}>
          어떤{' '}
          <span style={{ color: '#6D4CFF', position: 'relative' }}>
            카테고리
            <Sparkles size={12} color="#6D4CFF" style={{
              position: 'absolute', top: -10, right: -2,
            }} />
          </span>
          의<br />
          상세페이지를 만들까요?
        </h1>
        <p style={{ margin: '14px 0 0', fontSize: 13, color: '#666' }}>
          카테고리를 선택하면 그에 맞는 기획 구조로 자동 설계됩니다
        </p>
      </section>

      {/* 5) 검색 박스 */}
      <section style={{ padding: '20px 20px 0' }}>
        <div style={{
          background: '#fff', border: '1px solid #ECECF2',
          borderRadius: 16, padding: '12px 14px',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <Search size={18} color="#999" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="예) 수분크림, 한우 선물세트, 원목 의자"
            style={{
              flex: 1, border: 'none', outline: 'none',
              fontSize: 13, color: '#111',
              background: 'transparent',
              fontFamily: 'inherit',
            }}
          />
          <button onClick={toggleChat} style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 12, fontWeight: 700, color: '#6D4CFF',
            fontFamily: 'inherit', padding: 0,
            whiteSpace: 'nowrap',
          }}>
            <Sparkles size={12} /> AI 추천
          </button>
        </div>
      </section>

      {/* 6) 카테고리 그리드 3×3 + 기타 */}
      <section style={{ padding: '20px 20px 0' }}>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10,
        }}>
          {CATEGORIES.map(renderCard)}
        </div>
        {/* 기타 (단독 행) */}
        <div style={{ marginTop: 10 }}>
          <div
            onClick={() => onPick(ETC.id)}
            style={{
              background: '#fff', borderRadius: 16,
              border: '1px solid #F0F0F4',
              padding: 16,
              display: 'flex', alignItems: 'center', gap: 14,
              cursor: 'pointer',
              width: 'calc((100% - 20px) / 3)',
            }}
          >
            <div style={{
              width: 44, height: 44, borderRadius: '50%',
              background: ETC.bg,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <ETC.Icon size={22} color={ETC.color} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#111' }}>{ETC.name}</div>
              <div style={{ marginTop: 2, fontSize: 11.5, color: '#999' }}>{ETC.desc}</div>
            </div>
            <ArrowRight size={16} color="#999" />
          </div>
        </div>
      </section>

      {/* 7) AI 추천 배너 */}
      <section style={{ padding: '24px 20px 0' }}>
        <div style={{
          background: '#F4F0FF', borderRadius: 20,
          padding: 16,
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: '50%',
            background: '#DDD6FE', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <MessageCircle size={20} color="#6D4CFF" fill="#6D4CFF" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: '#111' }}>
              카테고리를 잘 모르겠나요?
            </div>
            <div style={{ marginTop: 2, fontSize: 11.5, color: '#666' }}>
              AI가 추천 카테고리를 제안해드릴 수 있어요
            </div>
          </div>
          <button onClick={toggleChat} style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            background: '#fff', border: '1px solid #DDD6FE',
            color: '#6D4CFF',
            fontSize: 12, fontWeight: 700,
            borderRadius: 999, padding: '8px 12px',
            cursor: 'pointer', fontFamily: 'inherit',
            flexShrink: 0,
          }}>
            AI 추천 받기 <Sparkles size={10} />
          </button>
        </div>
      </section>

    </div>
  );
}
