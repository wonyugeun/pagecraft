'use client';

import {
  Sparkles, FileText, Clock, RefreshCw,
  Check, ArrowLeft, ArrowRight, ThumbsUp,
} from 'lucide-react';
import { useApp, CH_CFG } from '@/store/AppContext';
import { CAT_DEFAULTS } from './SectionStructureScreen';
import { baseSectionCount } from '@/lib/sectionDepth';
import { iconFor } from '@/lib/sectionIcons';
import TypeMobile from './TypeMobile';
import { useIsMobile } from '@/hooks/useIsMobile';

// 예시 칩을 실제 섹션 개수(count)만큼 채움 — CAT_DEFAULTS 섹션명을 순환 사용해 부족분 보강.
// 목적: 칩 '양'으로 기본형 vs 프리미엄형 차이(약 2배)를 한눈에 보여주기.
function fillChips(secs: string[], count: number): string[] {
  if (!secs.length) return [];
  return Array.from({ length: count }, (_, i) => secs[i % secs.length]);
}

export default function TypeScreen() {
  const isMobile = useIsMobile();
  const { cat, ch, type, setType, go, goAfterType } = useApp();

  if (isMobile) return <TypeMobile />;

  const cfg = CH_CFG[ch || '스마트스토어'] || CH_CFG['스마트스토어'];

  // ★예시 섹션 = 실제 생성에 쓰는 카테고리 템플릿(CAT_DEFAULTS[cat])에서 가져옴 → 화장품 고정 해제.
  //   선택 카테고리가 템플릿에 있으면 그 카테고리, 없으면(기타 등) 범용 폴백. 예시 = 실제 나올 섹션과 일치.
  const catKey = cat && CAT_DEFAULTS[cat] ? cat : null;
  const catLabel = cat || '추천';
  const FB_BASIC = ['히어로', '핵심 강점', '상세 정보', '사용법', '비교표', '후기', 'FAQ', 'CTA'];
  const FB_PREMIUM = ['히어로', '브랜드 세계관', '핵심 강점', '상세 정보', '근거/신뢰', '사용법', '비교표', '감성 카피', '후기', 'FAQ', 'CTA'];
  const basicSecs = catKey ? CAT_DEFAULTS[catKey]['기본형'] : FB_BASIC;
  const premiumSecs = catKey ? CAT_DEFAULTS[catKey]['프리미엄형'] : FB_PREMIUM;
  // ★실제 생성 섹션 수(DEPTH_BASE 단일 소스). 칩은 대표 맛보기, 개수는 이 값 기준 → 기본형 vs 프리미엄형 ~2배가 한눈에.
  const basicCount = baseSectionCount(cat, false);
  const premiumCount = baseSectionCount(cat, true);
  // ★칩을 실제 개수만큼 전부 — 칩 양으로 차이가 보이게. (CAT_DEFAULTS 섹션명을 개수만큼 순환 보강)
  const basicChips = fillChips(basicSecs, basicCount);
  const premiumChips = fillChips(premiumSecs, premiumCount);

  const TYPES = [
    {
      key: '기본형',
      accent: '#9B8FD4',
      cardBg: '#F7F5FF',
      iconBg: 'linear-gradient(135deg,#EDE8FF,#D8D0F0)',
      Icon: FileText,
      topBadge: null,
      topBadgeBg: null,
      tagLabel: '구매 전환 집중',
      tagStyle: { background: '#EDE8FF', color: '#7B6FB4' },
      desc: '핵심만 빠르게, 구매 전환에 집중해요.\n스크롤을 짧게 — 임팩트 있는 메시지로 바로 행동을 유도합니다.',
      feats: ['핵심만 추림', '짧은 스크롤', '구매 전환 우선', '이미지 임팩트'],
      featStyle: { background: '#F4F0FF', color: '#7B6FB4' },
      secLabel: `예시 섹션 (${catLabel} 기준)`,
      secLabelColor: '#9B8FD4',
      secCount: basicCount,
      chips: basicChips,
      btnLabel: '기본형으로 만들기',
      btnStyle: { background: '#fff', color: '#7B6FB4', border: '1.5px solid #C9BFE8' },
    },
    {
      key: '프리미엄형',
      accent: '#B45309',
      cardBg: '#FFFBEB',
      iconBg: 'linear-gradient(135deg,#FEF3C7,#FDE68A)',
      Icon: Sparkles,
      topBadge: 'AI 추천',
      topBadgeBg: '#B45309',
      tagLabel: '신뢰·브랜딩 강화',
      tagStyle: { background: '#FEF3C7', color: '#92400E' },
      desc: '정보를 충분히 담아 신뢰도와 브랜딩을 강화해요.\n브랜드 세계관·감성 카피·시각 요소까지 풍부하게 구성합니다.',
      feats: ['브랜드 스토리', '감성 카피', '성분/근거 풍부', '시각 요소 풍부'],
      featStyle: { background: '#FEF9EC', color: '#92400E' },
      secLabel: `예시 섹션 (${catLabel} 기준)`,
      secLabelColor: '#B45309',
      secCount: premiumCount,
      chips: premiumChips,
      btnLabel: '프리미엄형으로 만들기',
      btnStyle: { background: '#B45309', color: '#fff' },
    },
  ];

  return (
    <div style={{ maxWidth: '880px', margin: '0 auto', padding: '40px 24px 100px', fontFamily: 'var(--f)' }}>

      {/* 상단 헤더 — 텍스트 + 일러스트 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px', gap: '24px' }}>
        <div style={{ flex: 1 }}>
          <span style={{
            display: 'inline-block', padding: '4px 13px', marginBottom: '14px',
            border: '1.5px solid #D8CFFF', borderRadius: '100px',
            fontSize: '11.5px', fontWeight: 700, color: '#6D4CFF', letterSpacing: '0.04em',
          }}>STEP 3 / 10</span>
          <h1 style={{
            fontSize: '28px', fontWeight: 800, color: '#111',
            letterSpacing: '-0.04em', lineHeight: 1.3, marginBottom: '10px',
          }}>
            어떤 <span style={{ color: '#6D4CFF' }}>방향으로</span><br />
            상세페이지를 만들까요?
          </h1>
          <p style={{ fontSize: '14px', color: '#666', lineHeight: 1.6 }}>
            AI가 카테고리·채널·상품을 분석해 적정 섹션 수를 자동 추천해요.<br />
            <span style={{ color: '#6D4CFF', fontWeight: 600 }}>기본형 / 프리미엄형</span>으로 방향만 정하면 됩니다.
          </p>
        </div>

        {/* 우측 일러스트 */}
        <div style={{ flexShrink: 0, position: 'relative', width: '160px', height: '130px' }}>
          {/* 메인 카드 */}
          <div style={{
            position: 'absolute', top: '10px', left: '20px',
            width: '100px', background: '#fff', borderRadius: '12px',
            border: '1px solid #E4DCFF', padding: '10px',
            boxShadow: '0 4px 16px rgba(109,76,255,0.12)',
          }}>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#C4B5FD', marginBottom: '6px', letterSpacing: '-0.02em' }}>Aa</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ height: '6px', background: '#EDE9FE', borderRadius: '3px', width: '100%' }} />
              <div style={{ height: '6px', background: '#EDE9FE', borderRadius: '3px', width: '75%' }} />
              <div style={{ height: '22px', background: 'linear-gradient(135deg,#EDE8FF,#D8CFFF)', borderRadius: '5px', marginTop: '3px' }} />
              <div style={{ height: '5px', background: '#F3F0FF', borderRadius: '3px', width: '90%', marginTop: '2px' }} />
              <div style={{ height: '5px', background: '#F3F0FF', borderRadius: '3px', width: '60%' }} />
            </div>
          </div>
          {/* 마법봉 원 */}
          <div style={{
            position: 'absolute', bottom: '0px', right: '0px',
            width: '52px', height: '52px', borderRadius: '50%',
            background: 'linear-gradient(135deg,#6D4CFF,#9B6DFF)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 14px rgba(109,76,255,0.35)',
          }}>
            <Sparkles size={22} color="#fff" />
          </div>
          {/* 장식 스파클 */}
          <div style={{ position: 'absolute', top: '4px', right: '10px', fontSize: '12px', color: '#C4B5FD' }}>✦</div>
          <div style={{ position: 'absolute', bottom: '14px', left: '8px', fontSize: '9px', color: '#DDD6FE' }}>✦</div>
        </div>
      </div>

      {/* AI 추천 배너 */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: '#F7F5FF', border: '1px solid #E4DCFF', borderRadius: '14px',
        padding: '16px 20px', marginBottom: '20px', gap: '16px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '44px', height: '44px', borderRadius: '50%', flexShrink: 0,
            background: 'linear-gradient(135deg,#6D4CFF,#9B6DFF)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Sparkles size={20} color="#fff" />
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#6D4CFF', marginBottom: '3px', letterSpacing: '0.02em' }}>AI 추천</div>
            <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#1A1A1A', letterSpacing: '-0.02em', marginBottom: '2px' }}>
              <span style={{ color: '#6D4CFF' }}>프리미엄형</span>이 가장 많이 선택돼요!
            </div>
            <div style={{ fontSize: '12px', color: '#9B8EC4' }}>섹션 수는 다음 단계에서 AI가 구성해드려요.</div>
          </div>
        </div>
        <div style={{
          flexShrink: 0, textAlign: 'center',
          background: '#fff', border: '1px solid #E4DCFF', borderRadius: '10px',
          padding: '10px 16px',
        }}>
          <div style={{ fontSize: '10px', color: '#9B8EC4', marginBottom: '2px', fontWeight: 600 }}>선택 비율</div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#6D4CFF', letterSpacing: '-0.03em' }}>78%</div>
        </div>
      </div>

      {/* 타입 카드 2열 (모바일 1열) */}
      <div className="cards-2col" style={{ marginBottom: '16px' }}>
        {TYPES.map(t => {
          const selected = type === t.key;
          return (
            <div
              key={t.key}
              onClick={() => setType(t.key)}
              style={{
                position: 'relative', cursor: 'pointer',
                background: selected ? t.cardBg : '#fff',
                border: `${selected ? 2 : 1.5}px solid ${selected ? t.accent : '#E5E7EB'}`,
                borderRadius: '16px', padding: '28px 26px',
                boxShadow: selected ? `0 0 0 3px ${t.accent}14` : '0 1px 4px rgba(0,0,0,0.05)',
                transition: 'all 150ms ease',
                display: 'flex', flexDirection: 'column', gap: '18px',
              }}
            >
              {/* 상단 뱃지 + 선택 마크 */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                {t.topBadge ? (
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: '4px',
                    fontSize: '11px', fontWeight: 700, padding: '4px 10px',
                    borderRadius: '100px', background: t.topBadgeBg!, color: '#fff',
                  }}>
                    <ThumbsUp size={10} /> {t.topBadge}
                  </span>
                ) : <div />}
                <div style={{
                  width: '22px', height: '22px', borderRadius: '50%',
                  background: selected ? t.accent : 'transparent',
                  border: `2px solid ${selected ? t.accent : '#D1D5DB'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 150ms ease',
                }}>
                  {selected && <Check size={12} color="#fff" strokeWidth={3} />}
                </div>
              </div>

              {/* 아이콘 + 이름 */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '10px' }}>
                <div style={{
                  width: '62px', height: '62px', borderRadius: '50%',
                  background: t.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <t.Icon size={28} color={t.accent} strokeWidth={1.8} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <span style={{ fontSize: '19px', fontWeight: 800, color: '#111', letterSpacing: '-0.03em' }}>{t.key}</span>
                    <span style={{ fontSize: '11px', fontWeight: 600, padding: '3px 9px', borderRadius: '100px', ...t.tagStyle }}>{t.tagLabel}</span>
                  </div>
                  <p style={{ fontSize: '12.5px', color: '#555', lineHeight: 1.65, whiteSpace: 'pre-line', letterSpacing: '-0.01em' }}>{t.desc}</p>
                </div>
              </div>

              {/* 피처 태그 */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {t.feats.map(f => (
                  <span key={f} style={{ fontSize: '11.5px', fontWeight: 500, padding: '4px 10px', borderRadius: '6px', ...t.featStyle }}>{f}</span>
                ))}
              </div>

              {/* 예시 섹션: ★실제 개수만큼 칩 전부 — 칩 양(빽빽함)으로 프리미엄형이 약 2배 많은 게 한눈에 */}
              <div>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '10px', gap: '8px' }}>
                  <span style={{ fontSize: '11.5px', fontWeight: 700, color: t.secLabelColor, letterSpacing: '-0.01em' }}>
                    {t.secLabel}
                  </span>
                  <span style={{ fontSize: '11px', color: '#9CA3AF', fontWeight: 600, whiteSpace: 'nowrap' }}>
                    <span style={{ fontSize: '17px', fontWeight: 800, color: t.accent, letterSpacing: '-0.02em' }}>{t.secCount}</span>개 섹션
                  </span>
                </div>
                {/* 원래 스타일: 박스(소프트 배경) 안 큰 아이콘 + 아래 섹션명, 5열 격자. 박스 개수=실제 섹션수. */}
                <div className="cards-5col">
                  {t.chips.map((s, i) => {
                    const Ic = iconFor(s);
                    return (
                      <div key={`${s}-${i}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
                        <div style={{
                          width: '40px', height: '40px', borderRadius: '10px',
                          background: `${t.accent}18`, border: `1px solid ${t.accent}30`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <Ic size={16} color={t.accent} strokeWidth={1.8} />
                        </div>
                        <span style={{ fontSize: '10px', color: '#6B7280', fontWeight: 500, textAlign: 'center', lineHeight: 1.2 }}>{s}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 선택 버튼 (카드 하단 고정) */}
              <button
                onClick={e => { e.stopPropagation(); setType(t.key); }}
                style={{
                  marginTop: 'auto',
                  width: '100%', padding: '12px',
                  borderRadius: '10px', border: 'none',
                  fontSize: '13.5px', fontWeight: 700,
                  cursor: 'pointer', letterSpacing: '-0.01em',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                  transition: 'all 150ms ease',
                  ...t.btnStyle,
                  ...(selected && t.key === '기본형' ? { background: '#9B8FD4', color: '#fff', border: 'none' } : {}),
                }}
              >
                {selected && <Check size={14} />} {t.btnLabel}
              </button>
            </div>
          );
        })}
      </div>

      {/* 하단 안내 바 */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: '#FAFAFA', border: '1px solid #EBEBEB', borderRadius: '12px',
        padding: '14px 20px', marginBottom: '32px', gap: '16px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <RefreshCw size={18} color="#9CA3AF" />
          <div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#333', letterSpacing: '-0.01em' }}>
              어떤 구성이든 언제든 변경할 수 있어요
            </div>
            <div style={{ fontSize: '11.5px', color: '#9CA3AF', marginTop: '1px' }}>
              선택 후에도 자유롭게 변경 가능하니 부담없이 시작하세요.
            </div>
          </div>
        </div>
        <div style={{
          flexShrink: 0, display: 'flex', alignItems: 'center', gap: '6px',
          background: '#fff', border: '1px solid #EBEBEB', borderRadius: '8px', padding: '8px 14px',
        }}>
          <Clock size={14} color="#9CA3AF" />
          <div>
            <div style={{ fontSize: '10px', color: '#9CA3AF', fontWeight: 500 }}>예상 소요 시간</div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#333', letterSpacing: '-0.02em' }}>약 2~5분</div>
          </div>
        </div>
      </div>

      {/* 네비 */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        paddingTop: '24px', borderTop: '1px solid #EBEBEB',
      }}>
        <button onClick={() => go('s2')} style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          background: 'none', border: 'none',
          fontSize: '13.5px', fontWeight: 600, color: '#9CA3AF', cursor: 'pointer',
        }}>
          <ArrowLeft size={15} /> 이전 단계
        </button>
        <span style={{ fontSize: '12px', color: '#C4C4C4' }}>
          {type ? `${type} 선택됨` : '구성을 선택하면 다음 단계로 이동합니다'}
        </span>
        <button
          disabled={!type}
          onClick={goAfterType}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '12px 26px',
            background: type ? '#6D4CFF' : '#EDE8FF',
            color: type ? '#fff' : '#B0A0E8',
            border: 'none', borderRadius: '10px',
            fontSize: '14px', fontWeight: 700,
            cursor: type ? 'pointer' : 'not-allowed',
            letterSpacing: '-0.01em',
            boxShadow: type ? '0 4px 14px rgba(109,76,255,0.30)' : 'none',
            transition: 'all 150ms ease',
          }}
        >
          다음 단계로 <ArrowRight size={15} />
        </button>
      </div>
    </div>
  );
}
