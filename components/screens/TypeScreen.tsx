'use client';

import { useState, useEffect } from 'react';
import {
  Sparkles, FileText, Star, Heart, ShieldCheck, Zap, BookOpen,
  LayoutGrid, MessageSquare, HelpCircle, MousePointer, Globe,
  Feather, BarChart2, Share2, ScrollText, Clock, RefreshCw,
  Check, ArrowLeft, ArrowRight, ThumbsUp,
} from 'lucide-react';
import { useApp, CH_CFG } from '@/store/AppContext';

const SEC_TIPS: Record<string, { desc: string; eg: string }> = {
  '히어로':          { desc: '첫 화면, 시선 잡는 메인 카피',      eg: '민감한 피부, 이제 걱정 끝' },
  '공감':            { desc: '고객 고민에 공감하는 섹션',          eg: '혹시 이런 피부 고민 있으신가요?' },
  '성분신뢰':        { desc: '성분으로 신뢰 쌓기',                 eg: 'EWG 그린등급, 피부과 테스트 완료' },
  'USP':             { desc: '우리 제품만의 특별한 점',             eg: '병풀 52%, 타사 대비 2배 농도' },
  '사용법':          { desc: '어떻게 쓰는지 보여주기',             eg: '1단계: 세안 후 적당량 덜어' },
  '비교표':          { desc: '경쟁사 대비 우위 보여주기',          eg: '일반 토너 vs 우리 토너 비교' },
  '후기':            { desc: '실제 사용자 리뷰',                   eg: '피부과 다니던 분이 이걸로 해결' },
  'FAQ':             { desc: '자주 묻는 질문',                     eg: '임산부도 사용 가능한가요?' },
  'CTA':             { desc: '구매 유도 마무리',                   eg: '지금 바로 경험해보세요' },
  '브랜드 세계관':   { desc: '브랜드 스토리와 철학',              eg: '10년 연구, 성분 하나의 고집' },
  '감성 카피':       { desc: '감성을 자극하는 카피',              eg: '당신의 피부가 쉬는 시간' },
  '성분 인포그래픽': { desc: '성분 정보를 시각적으로 표현',       eg: '히알루론산 5중 복합체 도식' },
  'SNS 공유컷':      { desc: '소셜 공유용 임팩트 이미지',         eg: 'Before/After 공유 포맷' },
  '와디즈 스토리':   { desc: '와디즈 전용 긴 서사 구조',          eg: '창업 스토리부터 제품 탄생까지' },
};

const SEC_ICONS: Record<string, React.ElementType> = {
  '히어로': Star, '공감': Heart, '성분신뢰': ShieldCheck,
  'USP': Zap, '사용법': BookOpen, '비교표': LayoutGrid,
  '후기': MessageSquare, 'FAQ': HelpCircle, 'CTA': MousePointer,
  '브랜드 세계관': Globe, '감성 카피': Feather,
  '성분 인포그래픽': BarChart2, 'SNS 공유컷': Share2, '와디즈 스토리': ScrollText,
};

function SecIcon({ label, accent }: { label: string; accent: string }) {
  const Icon = SEC_ICONS[label] ?? HelpCircle;
  const tip = SEC_TIPS[label];
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!show) return;
    const h = () => setShow(false);
    document.addEventListener('click', h);
    return () => document.removeEventListener('click', h);
  }, [show]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px', position: 'relative' }}>
      <button
        onClick={e => { e.stopPropagation(); setShow(p => !p); }}
        style={{
          width: '40px', height: '40px', borderRadius: '10px',
          background: `${accent}18`, border: `1px solid ${accent}30`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', transition: 'all 120ms ease',
        }}
      >
        <Icon size={16} color={accent} strokeWidth={1.8} />
      </button>
      <span style={{ fontSize: '10px', color: '#6B7280', fontWeight: 500, textAlign: 'center', lineHeight: 1.2 }}>
        {label}
      </span>
      {show && tip && (
        <div style={{
          position: 'absolute', bottom: 'calc(100% + 8px)', left: '50%', transform: 'translateX(-50%)',
          background: '#1e293b', color: '#f1f5f9', borderRadius: '8px',
          padding: '8px 11px', fontSize: '11px', lineHeight: 1.65,
          whiteSpace: 'nowrap', zIndex: 300,
          boxShadow: '0 6px 20px rgba(0,0,0,.28)', pointerEvents: 'none',
        }}>
          <div style={{ fontWeight: 700, marginBottom: '2px' }}>{tip.desc}</div>
          <div style={{ color: '#94a3b8' }}>예: "{tip.eg}"</div>
          <div style={{
            position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)',
            width: 0, height: 0,
            borderLeft: '5px solid transparent', borderRight: '5px solid transparent',
            borderTop: '5px solid #1e293b',
          }} />
        </div>
      )}
    </div>
  );
}

export default function TypeScreen() {
  const { ch, type, setType, go, goAfterType } = useApp();
  const cfg = CH_CFG[ch || '스마트스토어'] || CH_CFG['스마트스토어'];

  const TYPES = [
    {
      key: '기본형',
      accent: '#6D4CFF',
      cardBg: '#F7F5FF',
      iconBg: 'linear-gradient(135deg,#EDE8FF,#D8CFFF)',
      Icon: FileText,
      topBadge: '가장 많이 선택',
      topBadgeBg: '#6D4CFF',
      tagLabel: '가장 많이 사용',
      tagStyle: { background: '#F0ECFF', color: '#6D4CFF' },
      desc: ch === '스마트스토어'
        ? '카테고리에 맞게 설계된 10~12섹션 완성형.\n스마트스토어는 블로그형 글+그림 선택 가능'
        : '카테고리에 맞게 설계된 10~12섹션 완성형.\n이미지 최적 구성으로 즉시 업로드 가능',
      feats: ['10~12섹션', '누끼컷 3장', '컨셉컷 2장', '썸네일 2종'],
      featStyle: { background: '#EDE8FF', color: '#6D4CFF' },
      secLabel: '섹션 예시 (화장품 기준)',
      secLabelColor: '#6D4CFF',
      secs: ['히어로', '공감', '성분신뢰', 'USP', '사용법', '비교표', '후기', 'FAQ', 'CTA'],
      btnLabel: '이 구성으로 선택하기',
      btnStyle: { background: '#6D4CFF', color: '#fff' },
    },
    {
      key: '프리미엄형',
      accent: '#B45309',
      cardBg: '#FFFBEB',
      iconBg: 'linear-gradient(135deg,#FEF3C7,#FDE68A)',
      Icon: Sparkles,
      topBadge: null,
      topBadgeBg: null,
      tagLabel: '고급 브랜딩',
      tagStyle: { background: '#FEF3C7', color: '#92400E' },
      desc: '바이오더마·닥터지 수준 기획.\n브랜드 스토리부터 감성 카피까지 — 와디즈 50장+ 대응 포함',
      feats: ['15~50장+', '누끼컷 5장', '컨셉컷 4장', '썸네일 3종', 'GIF 포함', '브랜드 스토리'],
      featStyle: { background: '#FEF9EC', color: '#92400E' },
      secLabel: '추가 포함',
      secLabelColor: '#B45309',
      secs: ['브랜드 세계관', '감성 카피', '성분 인포그래픽', 'SNS 공유컷', '와디즈 스토리'],
      btnLabel: '이 구성으로 선택하기',
      btnStyle: { background: '#fff', color: '#B45309', border: '1.5px solid #D97706' },
    },
  ];

  return (
    <div style={{ maxWidth: '820px', margin: '0 auto', padding: '40px 24px 100px', fontFamily: 'var(--f)' }}>

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
            어떤 <span style={{ color: '#6D4CFF' }}>형태로</span><br />
            상세페이지를 만들까요?
          </h1>
          <p style={{ fontSize: '14px', color: '#9CA3AF' }}>
            {ch || '선택한 채널'}에 가장 적합한 구성을 선택해보세요
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
              대부분의 판매자가 <span style={{ color: '#6D4CFF' }}>'기본형'</span>으로 충분히 만족하고 있어요!
            </div>
            <div style={{ fontSize: '12px', color: '#9B8EC4' }}>빠르게 시작하고 성과를 만들어보세요.</div>
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

      {/* 타입 카드 2열 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
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
                borderRadius: '16px', padding: '20px',
                boxShadow: selected ? `0 0 0 3px ${t.accent}14` : '0 1px 4px rgba(0,0,0,0.05)',
                transition: 'all 150ms ease',
                display: 'flex', flexDirection: 'column', gap: '14px',
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
                  width: '54px', height: '54px', borderRadius: '50%',
                  background: t.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <t.Icon size={24} color={t.accent} strokeWidth={1.8} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <span style={{ fontSize: '17px', fontWeight: 800, color: '#111', letterSpacing: '-0.03em' }}>{t.key}</span>
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

              {/* 섹션 아이콘 그리드 */}
              <div>
                <div style={{ fontSize: '11.5px', fontWeight: 700, color: t.secLabelColor, marginBottom: '10px', letterSpacing: '-0.01em' }}>
                  {t.secLabel}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px' }}>
                  {t.secs.map(s => <SecIcon key={s} label={s} accent={t.accent} />)}
                </div>
              </div>

              {/* 선택 버튼 */}
              <button
                onClick={e => { e.stopPropagation(); setType(t.key); }}
                style={{
                  width: '100%', padding: '12px',
                  borderRadius: '10px', border: 'none',
                  fontSize: '13.5px', fontWeight: 700,
                  cursor: 'pointer', letterSpacing: '-0.01em',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                  transition: 'all 150ms ease',
                  ...t.btnStyle,
                  ...(selected && t.key === '프리미엄형' ? { background: '#D97706', color: '#fff', border: 'none' } : {}),
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
