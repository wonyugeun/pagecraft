'use client';

import { useState } from 'react';
import { useApp, STEP_MAP } from '@/store/AppContext';
import { calculateGenerationCost } from '@/lib/pricing';
import SectionStructureMobile from './SectionStructureMobile';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useInitialSections } from '@/hooks/useInitialSections';
import { sectionDescription } from '@/lib/sectionGlossary';
import { materialNeedFor } from '@/lib/sectionMaterials';
import { Ruler, CheckCircle2, Camera, Sparkles, Plus, RotateCcw, GripVertical } from 'lucide-react';
import { ICON } from '@/lib/designTokens';
import StepHeader from '@/components/layout/StepHeader';

export const CAT_DEFAULTS: Record<string, Record<string, string[]>> = {
  화장품: {
    기본형:    ['히어로', '피부고민 공감', '성분 신뢰', 'USP', '사용법', '비교표', '후기', 'FAQ', 'CTA'],
    프리미엄형: ['히어로', '브랜드 세계관', '피부고민 공감', '성분 신뢰', '성분 인포그래픽', 'USP', '사용법', '비교표', '감성 카피', '후기', 'SNS 공유컷', 'FAQ', 'CTA'],
  },
  식품: {
    기본형:    ['히어로', '원산지 스토리', '맛/신선도', '영양 정보', '안전/인증', '레시피/보관법', '후기', 'FAQ', 'CTA'],
    프리미엄형: ['히어로', '브랜드 세계관', '원산지 스토리', '맛/신선도', '영양 정보', '생산 과정', '안전/인증', '레시피/보관법', '감성 카피', '후기', 'FAQ', 'CTA'],
  },
  패션: {
    기본형:    ['히어로', '스타일 비전', '소재/원단', '핏/실루엣', '코디 제안', '사이즈 가이드', '후기', 'FAQ', 'CTA'],
    프리미엄형: ['히어로', '브랜드 세계관', '스타일 비전', '소재/원단', '핏/실루엣', '코디 제안', '사이즈 가이드', '관리법', '감성 카피', '후기', 'SNS 공유컷', 'FAQ', 'CTA'],
  },
  생활: {
    기본형:    ['히어로', '공간 변화', '소재/품질', '사이즈/스펙', '사용 시나리오', '설치/사용', '후기', 'FAQ', 'CTA'],
    프리미엄형: ['히어로', '브랜드 세계관', '공간 변화', '소재/품질', '사이즈/스펙', '사용 시나리오', '설치/사용', '감성 카피', '후기', 'FAQ', 'CTA'],
  },
  가전: {
    기본형:    ['히어로', '핵심 기능', '스펙/성능', '비교표', '안전/인증', 'A/S 보증', '후기', 'FAQ', 'CTA'],
    프리미엄형: ['히어로', '핵심 기능', '스펙/성능', '기술 상세', '비교표', '안전/인증', 'A/S 보증', '후기', 'FAQ', 'CTA'],
  },
  반려동물: {
    기본형:    ['히어로', '성분 안전', '영양 정보', '적합성', '사용법', '급여 가이드', '후기', 'FAQ', 'CTA'],
    프리미엄형: ['히어로', '브랜드 세계관', '성분 안전', '영양 정보', '적합성', '사용법', '급여 가이드', '감성 카피', '후기', 'FAQ', 'CTA'],
  },
  스포츠: {
    기본형:    ['히어로', '핵심 기능/기술', '소재/스펙', '착용감', '사이즈 가이드', '세탁/관리', '후기', 'FAQ', 'CTA'],
    프리미엄형: ['히어로', '퍼포먼스 비전', '핵심 기능/기술', '소재/스펙', '착용감', '활동 시나리오', '사이즈 가이드', '세탁/관리', '후기', 'FAQ', 'CTA'],
  },
  유아: {
    기본형:    ['히어로', '안전 인증', '소재/성분', '연령별 적합성', '발달 효과', '사용법/주의사항', '후기', 'FAQ', 'CTA'],
    프리미엄형: ['히어로', '안전 인증', '소재/성분', '연령별 적합성', '발달 효과', '사용법/주의사항', '감성 카피', '후기', 'FAQ', 'CTA'],
  },
  건강: {
    기본형:    ['히어로', '핵심 기능성', '성분/함량', '식약처 기능성', 'GMP/인증', '복용법/주의사항', '후기', 'FAQ', 'CTA'],
    프리미엄형: ['히어로', '건강 고민 공감', '핵심 기능성', '성분/함량', '식약처 기능성', '원료 원산지', 'GMP/인증', '복용법/주의사항', '후기', 'FAQ', 'CTA'],
  },
  자동차: {
    기본형:    ['히어로', '핵심 기능/기술', '소재/내구성', '호환 차종', '설치 방법', '비교/차별점', '후기', 'FAQ', 'CTA'],
    프리미엄형: ['히어로', '핵심 기능/기술', '소재/내구성', '호환 차종', '설치 방법', '비교/차별점', 'A/S 보증', '후기', 'FAQ', 'CTA'],
  },
};

export const ALL_SECTIONS = [
  '히어로', '공감', '피부고민 공감', '브랜드 세계관', '감성 카피', 'USP', '사용법',
  '비교표', '후기', 'FAQ', 'CTA', '성분 신뢰', '성분 인포그래픽', 'SNS 공유컷', '와디즈 스토리',
  '원산지 스토리', '맛/신선도', '영양 정보', '안전/인증', '레시피/보관법', '생산 과정',
  '스타일 비전', '소재/원단', '핏/실루엣', '코디 제안', '사이즈 가이드', '관리법',
  '공간 변화', '소재/품질', '사이즈/스펙', '사용 시나리오', '설치/사용',
  '핵심 기능', '스펙/성능', '기술 상세', 'A/S 보증',
  '성분 안전', '적합성', '전문가 추천',
  '핵심 기능/기술', '소재/스펙', '착용감', '활동 시나리오', '퍼포먼스 비전', '세탁/관리',
  '안전 인증', '소재/성분', '연령별 적합성', '발달 효과', '사용법/주의사항',
  '핵심 기능성', '성분/함량', '임상 근거', 'GMP/인증', '복용법/주의사항', '원료 원산지',
  '소재/내구성', '호환 차종', '설치 방법', '비교/차별점',
  '건강 고민 공감', '법적 고지',
];

const BTN_SHARED: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  width: 26, height: 26, border: '1px solid var(--bd)',
  borderRadius: 8, background: 'var(--white)', cursor: 'pointer',
  fontSize: 13, color: 'var(--tx2)', fontFamily: 'var(--f)',
  flexShrink: 0,
};
const BTN_DIS: React.CSSProperties = { ...BTN_SHARED, opacity: 0.3, cursor: 'default' };

export default function SectionStructureScreen() {
  const isMobile = useIsMobile();
  const { go, out, secCnt, setSectionDescs, productExtra, productName, sectionDescs, structureForCount, sectionSuggestions, setSectionSuggestions, referenceAnalysis, captureAnalysis, setSectionStructure, setSecCnt, setStructureForCount } = useApp();

  // ★이 데스크탑 인스턴스가 실제로 보이는 경우에만 훅 부수효과 동작(모바일이면 <SectionStructureMobile/>가 대신 보임).
  //   useIsMobile은 초기값 false라 깜빡임 → effect 게이트는 동기 window 판정(렌더 출력엔 영향 없음)으로 첫 렌더부터 정확.
  const active = typeof window === 'undefined' || window.innerWidth >= 768;
  const { secs, setSecs, recommendLoading, original } = useInitialSections(active);
  const [customInput, setCustomInput] = useState('');
  /* ★칸을 끌어서 옮기기(2026-08-02) — 화살표만으로는 16·32섹션에서 한 칸씩 눌러 올려야 했다.
   *  화살표도 남긴다: 드래그가 어려운 환경(트랙패드·접근성)에서 유일한 수단이 된다. */
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);
  const dropTo = (to: number) => {
    setSecs(s => {
      if (dragFrom === null || dragFrom === to) return s;
      const n = [...s];
      const [moved] = n.splice(dragFrom, 1);
      n.splice(to, 0, moved);
      return n;
    });
    setDragFrom(null); setDragOver(null);
  };

  if (isMobile) return <SectionStructureMobile />;

  const moveUp = (i: number) => setSecs(s => {
    if (i === 0) return s;
    const n = [...s]; [n[i - 1], n[i]] = [n[i], n[i - 1]]; return n;
  });
  const moveDown = (i: number) => setSecs(s => {
    if (i >= s.length - 1) return s;
    const n = [...s]; [n[i], n[i + 1]] = [n[i + 1], n[i]]; return n;
  });
  const remove = (i: number) => setSecs(s => s.filter((_, idx) => idx !== i));

  /* ★제안 섹션은 '지정된 자리'에 꽂는다(2026-08-03) — 맨 아래 붙으면 흐름이 깨져서 아무도 안 쓴다.
     after는 AI가 구조를 설계하며 정한 순번이고, 마음에 안 들면 끌어서 옮기면 된다. */
  const addSuggestion = (sg: { name: string; desc?: string; after?: number }) => {
    if (secs.includes(sg.name)) return;
    const at = Math.min(Math.max(Number(sg.after) || secs.length, 1), secs.length);
    setSecs(prev => [...prev.slice(0, at), sg.name, ...prev.slice(at)]);
    if (sg.desc) setSectionDescs({ ...sectionDescs, [sg.name]: sg.desc });
    setSectionSuggestions(sectionSuggestions.filter(x => x.name !== sg.name));
  };

  const addCustom = () => {
    const t = customInput.trim();
    if (t && !secs.includes(t)) { setSecs(s => [...s, t]); setCustomInput(''); }
  };

  const handleConfirm = () => {
    setSectionStructure(secs);
    setSecCnt(secs.length);
    /* ★셀러가 직접 더하고 뺀 결과도 '이 분량으로 만든 목록'으로 기록한다(2026-08-03) —
       안 하면 다음에 이 화면에 올 때 분량이 바뀐 것으로 보여 편집이 통째로 날아간다. */
    setStructureForCount(secs.length);
    go('s6');
  };

  // ★AI 추천 구조로 되돌리기 — 보관된 원본 값으로 즉시 복원(AI 재호출 X = 무료·즉시).
  const canReset = original.length > 0;
  const resetToOriginal = () => {
    if (!canReset) return;
    if (typeof window !== 'undefined' &&
      !window.confirm('현재 수정한 구조가 사라지고 AI 추천 구조로 돌아갑니다. 계속할까요?')) return;
    setSecs([...original]);
  };

  const fromRef = Boolean(referenceAnalysis?.sections?.length);
  const fromCapture = !fromRef && Boolean(captureAnalysis?.섹션목록?.length);

  /* ★재료가 있어야 성립하는 섹션 알림(2026-08-02) — 막지 않고 알린다.
   *  실제 실행에서 확인된 문제다: 재료가 없으면 모델이 추천 주체·교환 규정·개발 서사를 지어낸다.
   *  진짜 인증을 받은 셀러를 막아버리면 그게 더 답답하므로, 무엇을 적어야 하는지만 알려준다. */
  const facts = `${productName ?? ''}\n${productExtra ?? ''}`;
  const needs = secs.map(n => materialNeedFor(n, facts));
  const needCount = needs.filter(Boolean).length;

  return (
    <div className="inner">
      <StepHeader
        step={STEP_MAP['s5b'] ?? 6} label="섹션 구조"
        title="이 순서가 잘 팔려요"
        sub={`${fromRef ? '레퍼런스 분석을 반영했어요. ' : fromCapture ? '캡처 분석을 반영했어요. ' : ''}고객이 상품을 이해하고 결정하는 순서예요. 빼거나 더하고 싶은 섹션은 편하게 조정하세요.`}
        marginBottom={28}
      />
      {(fromRef || fromCapture) && (
        <div style={{ marginBottom: 16, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '9px 14px', fontSize: 12.5, color: '#166534', fontWeight: 600 }}>
          <Ruler size={ICON.sm} style={{ verticalAlign: -2, marginRight: 5 }} />참고 페이지 구조가 자동 반영됐어요. 아래에서 자유롭게 수정하세요.
        </div>
      )}

      {fromRef && (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'var(--pl)', borderRadius: 20, padding: '4px 12px', fontSize: 11, color: 'var(--pu)', fontWeight: 700, marginBottom: 14 }}>
          <CheckCircle2 size={ICON.sm} style={{ verticalAlign: -2, marginRight: 4 }} />레퍼런스 기반 추천
        </div>
      )}
      {fromCapture && (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: '#f5f3ff', borderRadius: 20, padding: '4px 12px', fontSize: 11, color: '#5b21b6', fontWeight: 700, marginBottom: 14 }}>
          <Camera size={ICON.sm} style={{ verticalAlign: -2, marginRight: 4 }} />캡처 분석 기반 추천
        </div>
      )}

      {/* AI 추천 로딩 표시 */}
      {recommendLoading && (
        <div style={{
          marginBottom: 12,
          background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: 12,
          padding: '14px 16px',
          display: 'flex', alignItems: 'center', gap: 10,
          fontSize: 13, color: '#5b21b6', fontWeight: 600,
        }}>
          <span style={{
            display: 'inline-block', width: 14, height: 14,
            border: '2px solid #c4b5fd', borderTopColor: '#6D4CFF',
            borderRadius: '50%', animation: 'spin 0.7s linear infinite',
            flexShrink: 0,
          }} />
          <Sparkles size={ICON.sm} style={{ verticalAlign: -2, marginRight: 5 }} />AI가 카테고리·채널·상품을 분석해 섹션을 구성하는 중...
        </div>
      )}

      {/* ★섹션을 더하고 빼면 크레딧이 바뀐다(2026-08-02) — 여기서 secCnt가 갱신되는데
          화면엔 개수도 크레딧도 없었다. 시작 화면에서 본 값과 달라졌으면 그 자리에서 알려준다. */}
      {!recommendLoading && secs.length > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
          border: '1px solid #E6DEFF', background: '#FBFAFF', borderRadius: 12,
          padding: '12px 15px', marginBottom: 14,
        }}>
          <b style={{ fontSize: 13.5, color: '#191F28' }}>{secs.length}섹션</b>
          <span style={{ color: '#D8DCE3' }}>·</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#6D4CFF' }}>
            {calculateGenerationCost({ sectionCount: secs.length, baseSectionCount: structureForCount, out })}크레딧
          </span>
          {secCnt > 0 && secs.length !== secCnt && (
            <span style={{ fontSize: 12, color: '#92400E', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 999, padding: '3px 10px' }}>
              처음 고른 {secCnt}섹션에서 바뀌었어요
            </span>
          )}
        </div>
      )}

      {needCount > 0 && (
        <div style={{
          border: '1px solid #FDE68A', background: '#FFFBEB', borderRadius: 12,
          padding: '12px 15px', marginBottom: 14, fontSize: 12.5, lineHeight: 1.7, color: '#92400E',
        }}>
          <b style={{ fontWeight: 700 }}>{needCount}개 섹션은 상품정보에 내용을 적어주셔야 제대로 나와요.</b><br />
          Flik은 없는 사실을 만들지 않기 때문에, 재료가 없으면 그 섹션은 두루뭉술해집니다. 아래 표시된 섹션을 확인해주세요.
        </div>
      )}

      {/* ★62개를 늘어놓는 대신 '지금 비어 있는 것'만 짚어준다(2026-08-03).
          ⚠️섹션을 더하면 크레딧이 더 나간다 — 증가분을 숨기지 않는다.
            숨기면 결제 화면에서 "왜 늘었지"가 되고, 그때 추천 영역 전체가 신뢰를 잃는다. */}
      {/* 섹션 리스트 */}
      <div style={{ marginBottom: 12 }}>
        {secs.map((sec, i) => (
          <div
            key={`${sec}-${i}`}
            draggable
            onDragStart={() => setDragFrom(i)}
            onDragOver={e => { e.preventDefault(); if (dragOver !== i) setDragOver(i); }}
            onDrop={e => { e.preventDefault(); dropTo(i); }}
            onDragEnd={() => { setDragFrom(null); setDragOver(null); }}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: dragFrom === i ? '#F7F4FF' : '#fff',
              border: `1px solid ${dragOver === i && dragFrom !== null && dragFrom !== i ? 'var(--pu)' : 'var(--bd)'}`,
              borderRadius: 8, padding: '9px 10px', marginBottom: 6,
              opacity: dragFrom === i ? 0.5 : 1,
              cursor: 'grab', transition: 'border-color 120ms, opacity 120ms',
            }}
          >
            <GripVertical size={15} color="#C3C8D0" style={{ flexShrink: 0 }} />
            <span style={{
              minWidth: 22, height: 22, borderRadius: '50%',
              background: 'var(--pu)', color: '#fff',
              fontSize: 11, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              {i + 1}
            </span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--tx1)' }}>{sec}</span>
              {/* ★AI가 준 설명이 우선(2026-08-03) — 이름을 AI가 새로 지으므로 용어집은 절반도 못 덮는다.
                  실측: 32섹션 중 16개가 설명 없음, 3개는 같은 설명이 중복이었다. */}
              {(sectionDescs[sec] || sectionDescription(sec)) && (
                <span style={{ display: 'block', fontSize: 11.5, color: 'var(--tx3)', marginTop: 2, lineHeight: 1.45 }}>
                  {sectionDescs[sec] || sectionDescription(sec)}
                </span>
              )}
              {needs[i] && (
                <span style={{ display: 'block', fontSize: 11.5, color: '#92400E', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 8, padding: '5px 9px', marginTop: 5, lineHeight: 1.5 }}>
                  <b style={{ fontWeight: 700 }}>{needs[i]!.need}</b>를 상품정보에 적어주세요 · {needs[i]!.risk}
                </span>
              )}
            </span>
            <div style={{ display: 'flex', gap: 4 }}>
              <button
                style={i === 0 ? BTN_DIS : BTN_SHARED}
                onClick={() => moveUp(i)}
                disabled={i === 0}
                aria-label="위로 이동"
              >↑</button>
              <button
                style={i === secs.length - 1 ? BTN_DIS : BTN_SHARED}
                onClick={() => moveDown(i)}
                disabled={i === secs.length - 1}
                aria-label="아래로 이동"
              >↓</button>
              <button
                style={{ ...BTN_SHARED, color: '#ef4444', borderColor: '#fecaca' }}
                onClick={() => remove(i)}
                aria-label="삭제"
              >×</button>
            </div>
          </div>
        ))}
      </div>

      {/* 0개일 때도 침묵하지 않는다 — 셀러는 '추천이 없는 것'과 '아직 안 나온 것'을 구분 못 한다 */}
      {!recommendLoading && secs.length > 0 && sectionSuggestions.length === 0 && (
        <div style={{
          border: '1px solid #ECECF2', background: '#FAFAFC', borderRadius: 12,
          padding: '11px 15px', marginBottom: 14, fontSize: 12.5, color: '#6B7684', lineHeight: 1.7,
        }}>
          적어주신 정보가 지금 구성에 다 담겨 있어요 — 더 넣을 만한 섹션이 보이지 않습니다.
          직접 넣고 싶은 게 있으면 아래 &lsquo;섹션 추가&rsquo;에서 고르시면 돼요.
        </div>
      )}

      {/* ★목록이 준비된 뒤에만 띄운다(2026-08-03) — 구성하는 중에 지난 실행의 추천이 남아 보였고,
          목록이 비어 있어 '0번 다음에 들어갑니다 · +0크레딧'처럼 값이 무너져 나왔다.
          추천은 '지금 이 구성'을 근거로 하는 말이라, 구성이 없으면 할 말도 없다. */}
      {!recommendLoading && secs.length > 0 && sectionSuggestions.length > 0 && (
        <div style={{ border: '1.5px solid #E6DEFF', background: '#FBFAFF', borderRadius: 14, padding: '15px 17px', marginBottom: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#5B3FD6', marginBottom: 4 }}>
            이 상품에 더하면 좋아요
          </div>
          <div style={{ fontSize: 11.5, color: '#8B95A1', marginBottom: 11 }}>
            지금 구성에서 비어 있는 것만 골랐어요 · 넣지 않으셔도 됩니다
          </div>
          <div style={{ display: 'grid', gap: 8 }}>
            {sectionSuggestions.map(sg => {
              const delta = calculateGenerationCost({ sectionCount: secs.length + 1, baseSectionCount: structureForCount, out })
                - calculateGenerationCost({ sectionCount: secs.length, baseSectionCount: structureForCount, out });
              const at = Math.min(Math.max(Number(sg.after) || secs.length, 1), secs.length);
              return (
                <div key={sg.name} style={{ background: '#fff', border: '1px solid #E9E7F3', borderRadius: 11, padding: '12px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <b style={{ fontSize: 13 }}>{sg.name}</b>
                    <span style={{ fontSize: 11, fontWeight: 800, color: '#6D4CFF', background: '#F0ECFF', borderRadius: 999, padding: '2px 8px' }}>
                      +{delta}크레딧
                    </span>
                  </div>
                  {sg.why && <p style={{ fontSize: 12, color: '#4E5968', lineHeight: 1.65, marginBottom: 8 }}>{sg.why}</p>}
                  {sg.grounded === false && (
                    <p style={{ fontSize: 11.5, color: '#92400E', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 8, padding: '6px 10px', marginBottom: 8, lineHeight: 1.55 }}>
                      이 섹션 내용은 아직 안 적어주셨어요 — 넣으시려면 상품정보에 관련 내용을 더해주세요.
                    </p>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                    <span style={{ fontSize: 11.5, color: '#8B95A1' }}>
                      {at}번 &lsquo;{secs[at - 1] ?? ''}&rsquo; 다음에 들어갑니다
                    </span>
                    <button
                      onClick={() => addSuggestion(sg)}
                      style={{
                        marginLeft: 'auto', border: '1px solid #D9CDFF', background: '#fff', color: '#6D4CFF',
                        borderRadius: 8, padding: '5px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--f)',
                      }}
                    >여기에 추가</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ★62개 칩 목록 폐기(2026-08-03 유근님) — 재료는 상품정보에서 받고 구조는 재료를 보고 만든다.
          인증서를 가진 셀러가 상품정보에 안 적었다면, 섹션만 추가해봤자 쓸 재료가 없어 빈 섹션이거나
          날조가 된다. 넣을 자리를 만들어 줄 게 아니라 상품정보로 돌려보내는 것이 맞다. */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <button
          onClick={() => go('s5')}
          style={{
            flex: 1, minWidth: 200, height: 42, border: '1.5px dashed var(--bd)',
            borderRadius: 10, background: 'transparent', cursor: 'pointer',
            fontSize: 13, color: 'var(--tx2)', fontFamily: 'var(--f)', fontWeight: 600,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5,
          }}
        ><Plus size={ICON.sm} />상품정보에 더 적기</button>
        {canReset && (
          <button
            onClick={resetToOriginal}
            title="처음 추천받은 구조로 되돌려요 (무료·즉시)"
            style={{
              flexShrink: 0, height: 42, padding: '0 16px', border: '1.5px solid var(--pl)',
              borderRadius: 10, background: 'var(--pl)', cursor: 'pointer',
              fontSize: 13, color: 'var(--pu)', fontFamily: 'var(--f)', fontWeight: 700,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5,
            }}
          ><RotateCcw size={ICON.sm} />AI 추천 구조로 되돌리기</button>
        )}
      </div>

      {/* 직접 입력 — 상품정보에 적었는데 AI가 그 섹션을 안 만든 경우의 통로 */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
        <input
          className="finp"
          placeholder="직접 넣을 섹션 이름 (예: 특허 기술 소개)"
          value={customInput}
          onChange={e => setCustomInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addCustom()}
          style={{ flex: 1, marginBottom: 0 }}
        />
        <button
          className="btn-next"
          onClick={addCustom}
          disabled={!customInput.trim()}
          style={{ flexShrink: 0, padding: '0 14px' }}
        >추가</button>
      </div>
      <p style={{ fontSize: 11.5, color: 'var(--tx3)', lineHeight: 1.6, marginBottom: 16 }}>
        상품정보에 없는 내용은 지어내지 않아요 — 담고 싶은 내용이 있으면 상품정보에 먼저 적어주세요.
      </p>

      <div className="cta-row">
        <button className="btn-back" onClick={() => go('s5')}>← 이전</button>
        <button className="btn-next" disabled={secs.length < 2} onClick={handleConfirm}>
          <span style={{ fontSize: 11, fontWeight: 400, opacity: 0.7, marginRight: 4 }}>{secs.length}개</span>
          이 구조로 →
        </button>
      </div>
    </div>
  );
}
