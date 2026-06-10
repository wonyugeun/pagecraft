'use client';

import {
  Sparkles, FileText, Check, ChevronDown, Lightbulb,
  ArrowLeft, ArrowRight, MoreHorizontal,
  Zap, Clock, BarChart3, TrendingUp, Star,
} from 'lucide-react';
import { useApp } from '@/store/AppContext';

const STEPS = [
  { num: 1, label: '카테고리' },
  { num: 2, label: '채널' },
  { num: 3, label: '타입' },
  { num: 4, label: '출력형태' },
  { num: 5, label: '상품정보' },
];

function PowerRow({ icon, label, basicLevel, premiumLevel }: {
  icon: React.ReactNode; label: string; basicLevel: number; premiumLevel: number;
}) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '1.1fr 1fr 1fr',
      alignItems: 'center', padding: '10px 0',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {icon}
        <span style={{ fontSize: 13, color: '#111', fontWeight: 500 }}>{label}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 2 }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <Zap key={i} size={14}
            color={i < basicLevel ? '#B45309' : '#E5E5EC'}
            fill={i < basicLevel ? '#B45309' : '#E5E5EC'}
          />
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 2 }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <Zap key={i} size={14}
            color={i < premiumLevel ? '#9B8FD4' : '#E5E5EC'}
            fill={i < premiumLevel ? '#9B8FD4' : '#E5E5EC'}
          />
        ))}
      </div>
    </div>
  );
}

function StarRow({ icon, label, basicStars, premiumStars }: {
  icon: React.ReactNode; label: string; basicStars: number; premiumStars: number;
}) {
  const render = (n: number, color: string) =>
    Array.from({ length: 5 }).map((_, i) => {
      const full = i < Math.floor(n);
      const half = !full && i < n;
      return (
        <Star key={i} size={14}
          color={full || half ? color : '#E5E5EC'}
          fill={full ? color : half ? `url(#half-${color})` : '#E5E5EC'}
        />
      );
    });
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '1.1fr 1fr 1fr',
      alignItems: 'center', padding: '10px 0',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {icon}
        <span style={{ fontSize: 13, color: '#111', fontWeight: 500 }}>{label}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 2 }}>
        {render(basicStars, '#B45309')}
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 2 }}>
        {render(premiumStars, '#9B8FD4')}
      </div>
    </div>
  );
}

export default function TypeMobile() {
  const { ch, type, setType, go, goAfterType, toggleChat, credits } = useApp();
  const channelLabel = ch ?? '스마트스토어';
  const activeType = type ?? '풍부';

  const onPick = (key: '풍부' | '간결') => setType(key);
  const onNext = () => { if (!type) setType('풍부'); goAfterType(); };

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
            const active = s.num === 3;
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

      {/* 3) STEP 3/10 + 타이틀 */}
      <section style={{ padding: '20px 20px 0' }}>
        <span style={{
          display: 'inline-block',
          background: '#F4F0FF', color: '#6D4CFF',
          fontSize: 11, fontWeight: 700,
          borderRadius: 999, padding: '4px 12px',
        }}>STEP 3 / 10</span>
        <h1 style={{
          margin: '14px 0 0',
          fontSize: 26, fontWeight: 800, color: '#111',
          letterSpacing: '-0.03em', lineHeight: 1.25,
        }}>어떤 형태로<br />상세페이지를 만들까요?</h1>
        <p style={{ margin: '12px 0 0', fontSize: 13, color: '#666' }}>
          {channelLabel}에 가장 적합한 구성을 선택해보세요.
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
          <div style={{ marginTop: 12, fontSize: 16, fontWeight: 700, color: '#111', lineHeight: 1.45 }}>
            대부분 판매자는<br />
            <span style={{ fontWeight: 800 }}>풍부하게를 선택해요!</span>
          </div>
          <p style={{ margin: '10px 0 0', fontSize: 12.5, color: '#666' }}>
            섹션 수는 AI가 카테고리·채널·상품을 보고 자동 추천해요.
          </p>
          <button style={{
            marginTop: 14,
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: '#fff', border: '1px solid #DDD6FE',
            color: '#111',
            fontSize: 12, fontWeight: 700,
            borderRadius: 999, padding: '8px 14px',
            cursor: 'pointer', fontFamily: 'inherit',
          }}>
            <Lightbulb size={12} color="#6D4CFF" /> 추천 이유 보기 <ChevronDown size={12} color="#999" />
          </button>
          {/* GPT 문서 + 방패 일러스트 자리 */}
          <div style={{
            position: 'absolute', right: 10, top: 32,
            width: 120, height: 110, borderRadius: 16,
            background: 'rgba(255,255,255,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 48,
          }}>📄</div>
        </div>
      </section>

      {/* 5) 풍부 카드 */}
      <section style={{ padding: '20px 20px 0' }}>
        <div
          onClick={() => onPick('풍부')}
          style={{
            background: '#fff',
            border: activeType === '풍부' ? '2px solid #B45309' : '1.5px solid #ECECF2',
            borderRadius: 18, padding: 16,
            cursor: 'pointer',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            <div style={{
              width: 56, height: 56, borderRadius: '50%',
              background: '#FEF3C7', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Sparkles size={26} color="#B45309" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 17, fontWeight: 800, color: '#111' }}>풍부하게</span>
                <span style={{
                  fontSize: 10, fontWeight: 700, color: '#92400E',
                  background: '#FEF3C7', borderRadius: 999, padding: '2px 8px',
                }}>AI 추천</span>
              </div>
              <div style={{ marginTop: 4, fontSize: 13, fontWeight: 700, color: '#B45309' }}>
                신뢰·브랜딩 강화
              </div>
              <p style={{ margin: '8px 0 0', fontSize: 12.5, color: '#666', lineHeight: 1.55 }}>
                정보를 충분히 담아 신뢰도와 브랜딩을 강화해요.<br />브랜드 세계관·감성 카피까지 풍부하게.
              </p>
              <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {['브랜드 톤', '풍부한 정보', '감성 카피', '시각 요소'].map(c => (
                  <span key={c} style={{
                    fontSize: 10.5, fontWeight: 600, color: '#92400E',
                    background: '#FEF9EC', borderRadius: 999, padding: '3px 10px',
                  }}>{c}</span>
                ))}
              </div>
            </div>
            <div style={{
              width: 24, height: 24, borderRadius: '50%',
              background: activeType === '풍부' ? '#B45309' : '#fff',
              border: activeType === '풍부' ? 'none' : '1.5px solid #D9D9E3',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              {activeType === '풍부' && <Check size={14} color="#fff" strokeWidth={3} />}
            </div>
          </div>
        </div>
      </section>

      {/* 6) 간결 카드 */}
      <section style={{ padding: '12px 20px 0' }}>
        <div
          onClick={() => onPick('간결')}
          style={{
            background: '#fff',
            border: activeType === '간결' ? '2px solid #9B8FD4' : '1.5px solid #ECECF2',
            borderRadius: 18, padding: 16,
            cursor: 'pointer',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            <div style={{
              width: 56, height: 56, borderRadius: '50%',
              background: '#EDE8FF', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <FileText size={26} color="#9B8FD4" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 17, fontWeight: 800, color: '#111' }}>간결하게</span>
                <span style={{
                  fontSize: 10, fontWeight: 700, color: '#7B6FB4',
                  background: '#EDE8FF', borderRadius: 999, padding: '2px 8px',
                }}>구매 전환</span>
              </div>
              <div style={{ marginTop: 4, fontSize: 13, fontWeight: 700, color: '#7B6FB4' }}>
                구매 전환 집중
              </div>
              <p style={{ margin: '8px 0 0', fontSize: 12.5, color: '#666', lineHeight: 1.55 }}>
                핵심만 빠르게, 구매 전환에 집중해요.<br />스크롤 짧고 임팩트 있게.
              </p>
              <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {['핵심만 추림', '짧은 스크롤', '빠른 전환', '이미지 임팩트'].map(c => (
                  <span key={c} style={{
                    fontSize: 10.5, fontWeight: 600, color: '#7B6FB4',
                    background: '#F4F0FF', borderRadius: 999, padding: '3px 10px',
                  }}>{c}</span>
                ))}
              </div>
            </div>
            <div style={{
              width: 24, height: 24, borderRadius: '50%',
              background: activeType === '간결' ? '#9B8FD4' : '#fff',
              border: activeType === '간결' ? 'none' : '1.5px solid #D9D9E3',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              {activeType === '간결' && <Check size={14} color="#fff" strokeWidth={3} />}
            </div>
          </div>
        </div>
      </section>

      {/* 7) 비교 박스 */}
      <section style={{ padding: '20px 20px 0' }}>
        <div style={{
          background: '#fff', border: '1.5px solid #ECECF2',
          borderRadius: 18, padding: 16,
        }}>
          <div style={{
            display: 'grid', gridTemplateColumns: '1.1fr 1fr 1fr',
            alignItems: 'center', marginBottom: 6,
          }}>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: '#111' }}>한눈에 비교해보세요</div>
            <div style={{ textAlign: 'center' }}>
              <span style={{
                fontSize: 11, fontWeight: 700, color: '#92400E',
                background: '#FEF3C7', borderRadius: 6, padding: '3px 10px',
              }}>풍부</span>
            </div>
            <div style={{ textAlign: 'center' }}>
              <span style={{
                fontSize: 11, fontWeight: 700, color: '#7B6FB4',
                background: '#EDE8FF', borderRadius: 6, padding: '3px 10px',
              }}>간결</span>
            </div>
          </div>
          <PowerRow
            icon={<Clock size={16} color="#666" />}
            label="제작 속도"
            basicLevel={3}
            premiumLevel={4}
          />
          <StarRow
            icon={<BarChart3 size={16} color="#666" />}
            label="브랜딩 효과"
            basicStars={5}
            premiumStars={3}
          />
          <StarRow
            icon={<TrendingUp size={16} color="#666" />}
            label="구매 전환 효과"
            basicStars={3.5}
            premiumStars={5}
          />
        </div>
      </section>

      {/* 8) 하단 버튼 */}
      <nav style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: '#fff', borderTop: '1px solid #ECECF2',
        padding: '14px 20px',
        display: 'flex', gap: 10,
        zIndex: 100,
      }}>
        <button onClick={() => go('s2')} style={{
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
          다음 단계로 <ArrowRight size={16} />
        </button>
      </nav>

    </div>
  );
}
