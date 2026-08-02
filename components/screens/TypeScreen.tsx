'use client';

import {
  Sparkles, FileText, Clock, RefreshCw,
  Check, ArrowLeft, ArrowRight, ThumbsUp, ScanSearch, Eye, X,
} from 'lucide-react';
import { useState } from 'react';
import { calculateGenerationCost } from '@/lib/pricing';
import { useApp, CH_CFG, STEP_MAP } from '@/store/AppContext';
import StepHeader from '@/components/layout/StepHeader';
import FlowNav from '@/components/layout/FlowNav';
import TypeExampleModal from '@/components/modals/TypeExampleModal';
import { ENABLE_REFERENCE_TYPE } from '@/lib/engineFlag';
import { CAT_DEFAULTS } from './SectionStructureScreen';
import { baseSectionCount } from '@/lib/sectionDepth';
import { sectionDescription } from '@/lib/sectionGlossary';
import TypeMobile from './TypeMobile';
import { useIsMobile } from '@/hooks/useIsMobile';

// 예시 칩을 실제 섹션 개수(count)만큼 채움 — CAT_DEFAULTS 섹션명을 순환 사용해 부족분 보강.
// 목적: 칩 '양'으로 기본형 vs 프리미엄형 차이(약 2배)를 한눈에 보여주기.

export default function TypeScreen() {
  const isMobile = useIsMobile();
  const { cat, ch, type, setType, go, goAfterType } = useApp();
  const [exampleOpen, setExampleOpen] = useState(false);   // 실제 생성 예시 모달 — 훅은 모바일 분기보다 먼저

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

  const TYPES: Array<{
    key: string; accent: string; cardBg: string; iconBg: string;
    Icon: typeof FileText;
    topBadge: string | null; topBadgeBg: string | null;
    tagLabel: string; tagStyle: React.CSSProperties;
    desc: string; feats: string[]; featStyle: React.CSSProperties;
    secLabel: string; secLabelColor: string;
    secCount: number | null;          // null = 래퍼런스형(분석 결과에 따라 달라짐 — 전용 설명 블록 렌더)
    chips: string[];
    btnLabel: string; btnStyle: React.CSSProperties;
  }> = [
    // ★폴리시 스프린트 2단계(2026-07-27): 3색(연보라/갈색/청록) → 브랜드 보라 단일 톤.
    //   차이는 색이 아니라 내용(섹션 수·흐름)으로 보여준다.
    {
      key: '기본형',
      accent: '#6D4CFF',
      cardBg: '#F8F6FF',
      iconBg: '#F1EDFF',
      Icon: FileText,
      topBadge: null,
      topBadgeBg: null,
      tagLabel: '구매 전환 집중',
      tagStyle: { background: '#F1EDFF', color: '#6D4CFF' },
      desc: '핵심만 빠르게, 구매 전환에 집중해요.\n스크롤을 짧게 — 임팩트 있는 메시지로 바로 행동을 유도합니다.',
      feats: ['핵심만 추림', '짧은 스크롤', '구매 전환 우선', '이미지 임팩트'],
      featStyle: { background: '#F6F4FC', color: '#6B6490' },
      secLabel: `섹션 흐름 (${catLabel} 기준)`,
      secLabelColor: '#8B95A1',
      secCount: basicCount,
      chips: basicSecs,
      btnLabel: '기본형으로 만들기',
      btnStyle: { background: '#fff', color: '#6D4CFF', border: '1.5px solid #D8CFFF' },
    },
    {
      key: '프리미엄형',
      accent: '#6D4CFF',
      cardBg: '#F8F6FF',
      iconBg: '#F1EDFF',
      Icon: Sparkles,
      topBadge: 'AI 추천',
      topBadgeBg: '#6D4CFF',
      tagLabel: '신뢰·브랜딩 강화',
      tagStyle: { background: '#F1EDFF', color: '#6D4CFF' },
      desc: '정보를 충분히 담아 신뢰도와 브랜딩을 강화해요.\n브랜드 세계관·감성 카피·시각 요소까지 풍부하게 구성합니다.',
      feats: ['브랜드 스토리', '감성 카피', '성분/근거 풍부', '시각 요소 풍부'],
      featStyle: { background: '#F6F4FC', color: '#6B6490' },
      secLabel: `섹션 흐름 (${catLabel} 기준)`,
      secLabelColor: '#8B95A1',
      secCount: premiumCount,
      chips: premiumSecs,
      btnLabel: '프리미엄형으로 만들기',
      btnStyle: { background: '#fff', color: '#6D4CFF', border: '1.5px solid #D8CFFF' },
    },
    // ★래퍼런스형(2026-07-22) — 세 번째 갈래. 닮고 싶은 페이지 캡처를 분석해 구조·톤을 따라감.
    //   섹션 수·구성은 분석한 페이지를 따라가므로 고정 개수 대신 예시 흐름을 보여준다.
    {
      key: '래퍼런스형',
      accent: '#6D4CFF',
      cardBg: '#F8F6FF',
      iconBg: '#F1EDFF',
      Icon: ScanSearch,
      topBadge: null,
      topBadgeBg: null,
      tagLabel: '닮고 싶은 페이지',
      tagStyle: { background: '#F1EDFF', color: '#6D4CFF' },
      desc: '잘나가는 페이지의 "팔리는 흐름"을 내 제품으로 재현해요.\n예) 1위 페이지가 공감 → 성분 → 비교표 → 후기 순서라면, 내 페이지도 같은 흐름으로.',
      feats: ['스마트스토어·쿠팡 캡처 OK', '섹션 순서 분석', '카피 톤 분석'],
      featStyle: { background: '#F6F4FC', color: '#6B6490' },
      secLabel: '',                    // 래퍼런스형은 칩 대신 전용 설명 블록 렌더
      secLabelColor: '#8B95A1',
      secCount: null,
      chips: [],
      btnLabel: '래퍼런스로 만들기',
      btnStyle: { background: '#fff', color: '#6D4CFF', border: '1.5px solid #D8CFFF' },
    },
  ];

  return (
    <div style={{ maxWidth: '1240px', margin: '0 auto', padding: '40px 24px 100px', fontFamily: 'var(--f)' }}>

      <StepHeader
        step={STEP_MAP['s3'] ?? 3} label="타입"
        title={<>어떤 <span style={{ color: '#6D4CFF' }}>방향으로</span> 만들까요?</>}
        sub={<>AI가 카테고리·채널·상품을 분석해 적정 섹션 수를 자동 추천해요 — <b style={{ color: '#6D4CFF', fontWeight: 600 }}>방향만 정하면 됩니다</b></>}
      />

      {/* AI 추천 배너 */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: '#F7F5FF', border: '1px solid #E4DCFF', borderRadius: '16px',
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
              정보가 풍부한 상품엔 <span style={{ color: '#6D4CFF' }}>프리미엄형</span>을 추천해요
            </div>
            <div style={{ fontSize: '12px', color: '#9B8EC4' }}>섹션 수는 다음 단계에서 AI가 구성해드려요.</div>
          </div>
        </div>
        {/* 근거 없는 '선택 비율 78%' 통계 제거 — 표시광고 리스크 */}
      </div>

      {/* 타입 카드 3열 — 래퍼런스형은 플래그 OFF 시 '준비 중' 비활성(코드·디자인 보존, 켜면 즉시 활성) */}
      <div className="cards-3col" style={{ marginBottom: '16px' }}>
        {TYPES.map(t => {
          const comingSoon = t.key === '래퍼런스형' && !ENABLE_REFERENCE_TYPE;
          const selected = type === t.key && !comingSoon;
          return (
            <div
              key={t.key}
              onClick={() => { if (!comingSoon) setType(t.key); }}
              style={{
                position: 'relative', cursor: comingSoon ? 'default' : 'pointer',
                background: selected ? t.cardBg : '#fff',
                border: `${selected ? 2 : 1.5}px solid ${selected ? t.accent : '#E5E7EB'}`,
                borderRadius: '16px', padding: '28px 26px',
                boxShadow: selected ? `0 0 0 3px ${t.accent}14` : '0 1px 4px rgba(0,0,0,0.05)',
                transition: 'all 150ms ease',
                display: 'flex', flexDirection: 'column', gap: '18px',
                opacity: comingSoon ? 0.62 : 1,
              }}
            >
              {/* 상단 뱃지 + 선택 마크 */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                {comingSoon ? (
                  <span style={{
                    display: 'inline-flex', alignItems: 'center',
                    fontSize: '11px', fontWeight: 700, padding: '4px 10px',
                    borderRadius: '999px', background: '#F3F4F6', color: '#6B7280',
                  }}>
                    준비 중
                  </span>
                ) : t.topBadge ? (
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: '4px',
                    fontSize: '11px', fontWeight: 700, padding: '4px 10px',
                    borderRadius: '999px', background: t.topBadgeBg!, color: '#fff',
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
                    <span style={{ fontSize: '11px', fontWeight: 600, padding: '3px 9px', borderRadius: '999px', ...t.tagStyle }}>{t.tagLabel}</span>
                  </div>
                  <p style={{ fontSize: '12.5px', color: '#555', lineHeight: 1.65, whiteSpace: 'pre-line', letterSpacing: '-0.01em' }}>{t.desc}</p>
                </div>
              </div>

              {/* 피처 태그 */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {t.feats.map(f => (
                  <span key={f} style={{ fontSize: '11.5px', fontWeight: 500, padding: '4px 10px', borderRadius: '8px', ...t.featStyle }}>{f}</span>
                ))}
              </div>

              {t.key === '래퍼런스형' ? (
                /* ★래퍼런스형 전용 설명 블록 — 아이콘 칩은 다른 카드와 구분이 안 돼 무의미.
                   대신 "어떻게 진행되나(3단계)" + "따라가는 것 vs 복제 안 하는 것"을 구체적으로. */
                <div>
                  <div style={{ fontSize: '11.5px', fontWeight: 700, color: t.accent, letterSpacing: '-0.01em', marginBottom: '10px' }}>
                    이렇게 만들어져요
                  </div>
                  {[
                    '닮고 싶은 페이지를 캡처해서 올려요',
                    'AI가 섹션 순서·카피 톤·강조 패턴을 분석해요',
                    '같은 흐름으로, 내 제품 정보로만 다시 써요',
                  ].map((step, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '9px', padding: '5px 0' }}>
                      <span style={{
                        width: '18px', height: '18px', borderRadius: '50%', flexShrink: 0,
                        background: '#F1EDFF', color: '#6D4CFF',
                        fontSize: '10.5px', fontWeight: 800,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '1px',
                      }}>{i + 1}</span>
                      <span style={{ fontSize: '12px', color: '#444', lineHeight: 1.5, letterSpacing: '-0.01em' }}>{step}</span>
                    </div>
                  ))}

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '7px', marginTop: '10px' }}>
                    <div style={{ background: '#F0FDF4', border: '1px solid #DCFCE7', borderRadius: '12px', padding: '9px 12px' }}>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: '#166534', marginBottom: '3px' }}><Check size={11} style={{ verticalAlign: -1, marginRight: 3 }} />따라가요</div>
                      <div style={{ fontSize: '11.5px', color: '#3F6B4F', lineHeight: 1.55 }}>섹션 구조·순서 · 카피 톤 · 강조 방식</div>
                    </div>
                    <div style={{ background: '#FEF6F6', border: '1px solid #FBDCDC', borderRadius: '12px', padding: '9px 12px' }}>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: '#B54545', marginBottom: '3px' }}><X size={11} style={{ verticalAlign: -1, marginRight: 3 }} />복제 안 해요</div>
                      <div style={{ fontSize: '11.5px', color: '#8A5A5A', lineHeight: 1.55 }}>남의 문구·이미지 · 후기·수치·브랜드명</div>
                    </div>
                  </div>

                  <div style={{ marginTop: '10px', fontSize: '11px', color: '#9CA3AF', lineHeight: 1.5 }}>
                    섹션 수·크레딧은 분석한 페이지 구조를 따라 정해져요
                  </div>
                </div>
              ) : (
                /* ★섹션 흐름 미리보기(2026-07-27): 아이콘 격자 대신 이름 흐름 + 분량 바 —
                   "무엇이 어떤 순서로 나오나"가 읽히고, 기본↔프리미엄 차이는 개수·바 길이로 전달 */
                <div>
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '10px', gap: '8px' }}>
                    <span style={{ fontSize: '11.5px', fontWeight: 700, color: t.secLabelColor, letterSpacing: '-0.01em' }}>
                      {t.secLabel}
                    </span>
                    <span style={{ fontSize: '11px', color: '#9CA3AF', fontWeight: 600, whiteSpace: 'nowrap' }}>
                      {/* ★크레딧은 출력형태(다음 화면)에 따라 갈린다 — 블로그 1.25/섹션, 슬라이드 1.0/섹션.
                          여기서 한 값만 적으면 다음 화면에서 숫자가 바뀌어 불신을 부르므로 범위로 표기한다. */}
                      <span style={{ fontSize: '17px', fontWeight: 800, color: t.accent, letterSpacing: '-0.02em' }}>{t.secCount}</span>개 섹션 · {calculateGenerationCost({ sectionCount: t.secCount ?? 0, out: 'slide' })}~{calculateGenerationCost({ sectionCount: t.secCount ?? 0, out: 'blog' })}크레딧
                    </span>
                  </div>
                  {/* 분량 바 — 프리미엄형(최대) 대비 상대 길이 */}
                  <div style={{ height: 6, borderRadius: 8, background: '#EFEDF7', marginBottom: 12, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', borderRadius: 8, background: 'linear-gradient(90deg,#8E75FF,#6D4CFF)',
                      width: `${Math.round(((t.secCount ?? 0) / Math.max(premiumCount, 1)) * 100)}%`,
                    }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    {t.chips.slice(0, 5).map((sname, i) => (
                      <div key={`${sname}-${i}`} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '4px 0' }}>
                        <span style={{
                          width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                          background: '#F1EDFF', color: '#6D4CFF',
                          fontSize: '10.5px', fontWeight: 800,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>{i + 1}</span>
                        <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#4E5968', letterSpacing: '-0.01em', whiteSpace: 'nowrap', flexShrink: 0 }}>{sname}</span>
                        {sectionDescription(sname) && (
                          <span style={{ fontSize: '11px', color: '#B4AECB', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>
                            {sectionDescription(sname)?.split(' — ')[0]}
                          </span>
                        )}
                      </div>
                    ))}
                    {(t.secCount ?? 0) > 5 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '4px 0' }}>
                        <span style={{ width: 18, textAlign: 'center', color: '#C2BBDB', fontSize: 12, flexShrink: 0 }}>⋮</span>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: t.accent }}>
                          후기·FAQ·CTA까지 +{(t.secCount ?? 0) - 5}개 더
                        </span>
                      </div>
                    )}
                    {/* ★실제 생성 예시(2026-07-27) — 흐름 텍스트만으론 감이 안 와서 실물로 보여줌 */}
                    <button
                      onClick={e => { e.stopPropagation(); setExampleOpen(true); }}
                      style={{
                        marginTop: 10, alignSelf: 'flex-start',
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        padding: '7px 12px', borderRadius: 8,
                        background: '#fff', border: '1px dashed #C9BFF5', color: '#6D4CFF',
                        fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                      }}
                    >
                      <Eye size={13} style={{ marginRight: 2 }} />실제 생성 예시 보기
                    </button>
                  </div>
                </div>
              )}

              {/* '만들기' 버튼 = 해당 타입 선택 + 바로 다음 단계(중복 클릭 제거). 카드 클릭은 선택만 유지. */}
              <button
                onClick={e => { e.stopPropagation(); if (comingSoon) return; setType(t.key); goAfterType(t.key); }}
                disabled={comingSoon}
                style={{
                  marginTop: 'auto',
                  width: '100%', padding: '12px',
                  borderRadius: '12px', border: 'none',
                  fontSize: '13.5px', fontWeight: 700,
                  cursor: comingSoon ? 'not-allowed' : 'pointer', letterSpacing: '-0.01em',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                  transition: 'all 150ms ease',
                  ...t.btnStyle,
                  ...(selected ? { background: '#6D4CFF', color: '#fff', border: 'none', boxShadow: '0 4px 14px rgba(109,76,255,0.30)' } : {}),
                  ...(comingSoon ? { background: '#F3F4F6', color: '#9CA3AF', border: '1.5px solid #E5E7EB' } : {}),
                }}
              >
                {selected && <Check size={14} />} {comingSoon ? '준비 중이에요' : t.btnLabel}
              </button>
            </div>
          );
        })}
      </div>

      {/* 하단 안내 바 — 마법사 퍼플 톤 틴트 + 아이콘 강조(기존 radius·톤 유지) */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: '#F8F7FF', border: '1px solid #E4DCFF', borderRadius: '12px',
        padding: '16px 20px', marginBottom: '32px', gap: '16px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '13px' }}>
          <div style={{
            width: '38px', height: '38px', borderRadius: '12px', flexShrink: 0,
            background: '#EDE8FF', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <RefreshCw size={18} color="#6D4CFF" />
          </div>
          <div>
            <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#1A1A1A', letterSpacing: '-0.01em' }}>
              섹션 구성은 다음 단계에서 조정할 수 있어요
            </div>
            <div style={{ fontSize: '11.5px', color: '#7B6EA8', marginTop: '2px' }}>
              생성 전까지는 타입·섹션을 자유롭게 바꿀 수 있어요.
            </div>
          </div>
        </div>
        <div style={{
          flexShrink: 0, display: 'flex', alignItems: 'center', gap: '7px',
          background: '#fff', border: '1px solid #E4DCFF', borderRadius: '8px', padding: '8px 14px',
        }}>
          <Clock size={14} color="#6D4CFF" />
          <div>
            <div style={{ fontSize: '10px', color: '#9B8EC4', fontWeight: 600 }}>예상 소요 시간</div>
            {/* 실측 기준(카피+이미지 완료까지): 16섹션 ≈ 10분, 32섹션 ≈ 17분 — 과소 표기는 이탈 유발 */}
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#1A1A1A', letterSpacing: '-0.02em' }}>약 10~15분</div>
          </div>
        </div>
      </div>

      <FlowNav
        onBack={() => go('s2')}
        onNext={() => goAfterType()}
        nextDisabled={!type}
        hint={type ? `${type} 선택됨` : '구성을 선택하면 다음 단계로 이동합니다'}
      />

      <TypeExampleModal open={exampleOpen} onClose={() => setExampleOpen(false)} />
    </div>
  );
}
