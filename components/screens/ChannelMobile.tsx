'use client';

import {
  Sparkles, Rocket, Store, Lightbulb,
  Check, ChevronUp, ArrowLeft, ArrowRight,
  Zap, ChevronDown, MoreHorizontal,
  FileText, ShoppingBag, ImageIcon,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useApp } from '@/store/AppContext';

type ChannelKey = '스마트스토어' | '쿠팡' | '자사몰' | '와디즈';

interface ChannelDef {
  key: ChannelKey;
  iconBg: string;
  iconColor: string;
  iconNode: 'N' | LucideIcon;
  sub: string;
  chip1: string;
  chip2: string;
}

const CHANNELS: ChannelDef[] = [
  { key: '스마트스토어', iconBg: '#22C55E', iconColor: '#fff',    iconNode: 'N',        sub: '네이버 쇼핑 기반', chip1: '블로그형 구조',  chip2: '구매전환에 최적화' },
  { key: '쿠팡',         iconBg: '#FFE4F0', iconColor: '#FF4D8D', iconNode: Rocket,     sub: '로켓배송 환경',     chip1: '이미지 중심 구조', chip2: '빠른 구매 전환' },
  { key: '자사몰',       iconBg: '#EDE8FF', iconColor: '#6D4CFF', iconNode: Store,      sub: '브랜드 직접 운영',  chip1: '스토리텔링 중심',  chip2: '브랜드 경험 강화' },
  { key: '와디즈',       iconBg: '#FFF4DD', iconColor: '#F59E0B', iconNode: Lightbulb,  sub: '펀딩 · 예약판매',   chip1: '설득형 긴 스토리', chip2: '후원 전환에 최적' },
];

const STEPS = [
  { num: 1, label: '카테고리' },
  { num: 2, label: '채널' },
  { num: 3, label: '타입' },
  { num: 4, label: '출력형태' },
  { num: 5, label: '상품정보' },
];

const SECTION_COUNT_MAP: Record<ChannelKey, string> = {
  '스마트스토어': '12 ~ 16개',
  '쿠팡': '8 ~ 12개',
  '자사몰': '10 ~ 14개',
  '와디즈': '14 ~ 20개',
};

export default function ChannelMobile() {
  const { ch, setCh, go, toggleChat, credits } = useApp();
  const activeCh = (ch as ChannelKey | null) ?? '스마트스토어';
  const activeDef = CHANNELS.find(c => c.key === activeCh) ?? CHANNELS[0];

  const onPick = (key: ChannelKey) => setCh(key);
  const onNext = () => { if (!ch) setCh('스마트스토어'); go('s3'); };

  const renderIcon = (def: ChannelDef, size = 26) => {
    if (def.iconNode === 'N') {
      return (
        <div style={{
          width: 44, height: 44, borderRadius: 10,
          background: def.iconBg, color: def.iconColor,
          fontSize: 22, fontWeight: 900,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>N</div>
      );
    }
    const Icon = def.iconNode;
    return (
      <div style={{
        width: 44, height: 44, borderRadius: 10,
        background: def.iconBg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={size - 4} color={def.iconColor} fill={def.iconNode === Lightbulb ? def.iconColor : 'none'} />
      </div>
    );
  };

  return (
    <div style={{
      minHeight: '100vh', background: '#FAFAFC',
      fontFamily: 'Pretendard, sans-serif',
      paddingBottom: 100,
    }}>

      {/* 1) 헤더 */}
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 20px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: '#6D4CFF', color: '#fff',
            fontSize: 18, fontWeight: 800,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>P</div>
          <span style={{ fontSize: 18, fontWeight: 700, color: '#111' }}>PageCraft</span>
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
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            background: '#6D4CFF', color: '#fff',
            borderRadius: 999, width: 36, height: 36,
          }}>
            <ChevronDown size={12} color="#fff" />
          </div>
        </div>
      </header>

      {/* 2) 진행 단계 */}
      <section style={{ padding: '8px 20px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'nowrap', overflowX: 'auto' }}>
          {STEPS.map((s, i) => {
            const active = s.num === 2;
            return (
              <div key={s.num} style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                <div style={{
                  width: 26, height: 26, borderRadius: '50%',
                  background: active ? '#6D4CFF' : '#fff',
                  border: active ? 'none' : '1.5px solid #ECECF2',
                  color: active ? '#fff' : '#999',
                  fontSize: 12, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>{s.num}</div>
                <span style={{
                  fontSize: 12, color: active ? '#111' : '#999',
                  fontWeight: active ? 700 : 500,
                }}>{s.label}</span>
                {i < STEPS.length - 1 && (
                  <div style={{ width: 12, height: 1, background: '#ECECF2' }} />
                )}
              </div>
            );
          })}
          <div style={{
            width: 26, height: 26, borderRadius: '50%',
            background: '#fff', border: '1.5px solid #ECECF2',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <MoreHorizontal size={12} color="#999" />
          </div>
        </div>
      </section>

      {/* 3) STEP 2/10 + 타이틀 */}
      <section style={{ padding: '20px 20px 0', textAlign: 'center' }}>
        <span style={{
          display: 'inline-block',
          background: '#fff', border: '1px solid #ECECF2',
          color: '#666',
          fontSize: 11, fontWeight: 700,
          borderRadius: 999, padding: '4px 14px',
        }}>STEP 2 / 10</span>
        <h1 style={{
          margin: '14px 0 0',
          fontSize: 24, fontWeight: 800, color: '#111',
          letterSpacing: '-0.03em',
        }}>어디에서 판매하시나요?</h1>
        <p style={{ margin: '10px 0 0', fontSize: 13, color: '#666' }}>
          채널에 맞게 상세페이지 구조가 자동 변경됩니다.
        </p>
      </section>

      {/* 4) AI 추천 카드 */}
      <section style={{ padding: '20px 20px 0' }}>
        <div style={{
          background: 'linear-gradient(135deg, #F4F0FF, #EFEBFF)',
          borderRadius: 20, padding: 20,
          position: 'relative', overflow: 'hidden',
        }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            fontSize: 12, fontWeight: 700, color: '#6D4CFF',
          }}>
            <Sparkles size={12} /> AI 추천
          </span>
          <div style={{ marginTop: 14, fontSize: 18, fontWeight: 700, color: '#111', lineHeight: 1.4 }}>
            입력하신 상품은<br />
            <span style={{ color: '#6D4CFF', fontWeight: 800 }}>스마트스토어</span>에<br />
            가장 적합해요
          </div>
          <button
            onClick={() => { onPick('스마트스토어'); go('s3'); }}
            style={{
              marginTop: 16,
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: '#6D4CFF', color: '#fff',
              border: 'none', borderRadius: 14,
              padding: '12px 18px',
              fontSize: 13, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'inherit',
              boxShadow: '0 8px 20px rgba(109,76,255,0.3)',
            }}
          >스마트스토어로 진행하기 <ArrowRight size={14} /></button>
          {/* GPT 쇼핑백 일러스트 자리 */}
          <div style={{
            position: 'absolute', right: 14, top: 32,
            width: 110, height: 110, borderRadius: 16,
            background: 'rgba(255,255,255,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 56,
          }}>🛍️</div>
          <div style={{
            position: 'absolute', right: 10, bottom: 56,
            width: 24, height: 24, borderRadius: '50%',
            background: '#22C55E',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '2px solid #fff',
          }}>
            <Check size={12} color="#fff" strokeWidth={3} />
          </div>
        </div>
      </section>

      {/* 5) 판매 채널 선택 */}
      <section style={{ padding: '24px 20px 0' }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#111', marginBottom: 12 }}>
          판매 채널 선택
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {CHANNELS.map(c => {
            const selected = activeCh === c.key;
            return (
              <div
                key={c.key}
                onClick={() => onPick(c.key)}
                style={{
                  background: '#fff',
                  border: selected ? '2px solid #6D4CFF' : '1.5px solid #ECECF2',
                  borderRadius: 16, padding: 14,
                  display: 'flex', alignItems: 'center', gap: 12,
                  cursor: 'pointer',
                }}
              >
                {renderIcon(c)}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#111' }}>{c.key}</div>
                  <div style={{ marginTop: 2, fontSize: 11.5, color: '#999' }}>{c.sub}</div>
                </div>
                <div style={{
                  display: 'flex', flexDirection: 'column', gap: 4,
                  alignItems: 'flex-end',
                  flexShrink: 0,
                }}>
                  <span style={{
                    fontSize: 10.5, fontWeight: 600, color: '#666',
                    background: '#F4F4F7',
                    borderRadius: 999, padding: '3px 8px',
                    whiteSpace: 'nowrap',
                  }}>{c.chip1}</span>
                  <span style={{
                    fontSize: 10.5, fontWeight: 600, color: '#666',
                    background: '#F4F4F7',
                    borderRadius: 999, padding: '3px 8px',
                    whiteSpace: 'nowrap',
                  }}>{c.chip2}</span>
                </div>
                <div style={{
                  width: 22, height: 22, borderRadius: '50%',
                  background: selected ? '#6D4CFF' : '#fff',
                  border: selected ? 'none' : '1.5px solid #D9D9E3',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  {selected && <Check size={12} color="#fff" strokeWidth={3} />}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 6) 확장 상세 박스 */}
      <section style={{ padding: '14px 20px 0' }}>
        <div style={{
          background: '#F7F6FB', borderRadius: 16, padding: 16,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            {renderIcon(activeDef, 20)}
            <div style={{ flex: 1, fontSize: 13.5, fontWeight: 700, color: '#111' }}>
              {activeDef.key}에서 이렇게 제작됩니다
            </div>
            <ChevronUp size={16} color="#999" />
          </div>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8,
          }}>
            {[
              { Icon: FileText,    title: '블로그형 구조',   desc: '정보 전달에 최적화' },
              { Icon: ShoppingBag, title: '구매전환형 카피', desc: '구매를 유도하는 구성' },
              { Icon: ImageIcon,   title: '썸네일 자동 생성', desc: '3종 썸네일 제공' },
            ].map(({ Icon, title, desc }) => (
              <div key={title} style={{
                display: 'flex', flexDirection: 'column', gap: 6,
              }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: '#EDE8FF',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon size={16} color="#6D4CFF" />
                </div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#111' }}>{title}</div>
                <div style={{ fontSize: 9.5, color: '#666', lineHeight: 1.4 }}>{desc}</div>
              </div>
            ))}
          </div>
          <div style={{
            marginTop: 14, paddingTop: 12,
            borderTop: '1px solid #ECE9F5',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span style={{ fontSize: 12, color: '#666' }}>예상 섹션 수</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#6D4CFF' }}>
              {SECTION_COUNT_MAP[activeCh]}
            </span>
          </div>
        </div>
      </section>

      {/* 7) 하단 버튼 */}
      <nav style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: '#fff', borderTop: '1px solid #ECECF2',
        padding: '14px 20px',
        display: 'flex', gap: 10,
        zIndex: 100,
      }}>
        <button onClick={() => go('s1')} style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          background: '#fff', border: '1.5px solid #ECECF2',
          color: '#111',
          fontSize: 14, fontWeight: 700,
          borderRadius: 14, padding: '14px 22px',
          cursor: 'pointer', fontFamily: 'inherit',
          flexShrink: 0,
        }}>
          <ArrowLeft size={16} /> 이전 단계
        </button>
        <button onClick={onNext} style={{
          flex: 1,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          background: '#6D4CFF', color: '#fff',
          border: 'none',
          fontSize: 15, fontWeight: 700,
          borderRadius: 14, padding: '14px',
          cursor: 'pointer', fontFamily: 'inherit',
          boxShadow: '0 8px 20px rgba(109,76,255,0.3)',
        }}>
          다음 단계 <ArrowRight size={16} />
        </button>
      </nav>

    </div>
  );
}
