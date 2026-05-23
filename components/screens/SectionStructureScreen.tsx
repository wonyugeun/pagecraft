'use client';

import { useState } from 'react';
import { useApp } from '@/store/AppContext';

const CAT_DEFAULTS: Record<string, Record<string, string[]>> = {
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
    기본형:    ['히어로', '성분 안전', '영양 정보', '적합성', '사용법', '전문가 추천', '후기', 'FAQ', 'CTA'],
    프리미엄형: ['히어로', '브랜드 세계관', '성분 안전', '영양 정보', '적합성', '사용법', '전문가 추천', '감성 카피', '후기', 'FAQ', 'CTA'],
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
    기본형:    ['히어로', '핵심 효능', '성분/함량', '임상 근거', 'GMP/인증', '복용법/주의사항', '후기', 'FAQ', 'CTA'],
    프리미엄형: ['히어로', '건강 고민 공감', '핵심 효능', '성분/함량', '임상 근거', '원료 원산지', 'GMP/인증', '복용법/주의사항', '후기', 'FAQ', 'CTA'],
  },
  자동차: {
    기본형:    ['히어로', '핵심 기능/기술', '소재/내구성', '호환 차종', '설치 방법', '비교/차별점', '후기', 'FAQ', 'CTA'],
    프리미엄형: ['히어로', '핵심 기능/기술', '소재/내구성', '호환 차종', '설치 방법', '비교/차별점', 'A/S 보증', '후기', 'FAQ', 'CTA'],
  },
};

const ALL_SECTIONS = [
  '히어로', '공감', '피부고민 공감', '브랜드 세계관', '감성 카피', 'USP', '사용법',
  '비교표', '후기', 'FAQ', 'CTA', '성분 신뢰', '성분 인포그래픽', 'SNS 공유컷', '와디즈 스토리',
  '원산지 스토리', '맛/신선도', '영양 정보', '안전/인증', '레시피/보관법', '생산 과정',
  '스타일 비전', '소재/원단', '핏/실루엣', '코디 제안', '사이즈 가이드', '관리법',
  '공간 변화', '소재/품질', '사이즈/스펙', '사용 시나리오', '설치/사용',
  '핵심 기능', '스펙/성능', '기술 상세', 'A/S 보증',
  '성분 안전', '적합성', '전문가 추천',
  '핵심 기능/기술', '소재/스펙', '착용감', '활동 시나리오', '퍼포먼스 비전', '세탁/관리',
  '안전 인증', '소재/성분', '연령별 적합성', '발달 효과', '사용법/주의사항',
  '핵심 효능', '성분/함량', '임상 근거', 'GMP/인증', '복용법/주의사항', '원료 원산지',
  '소재/내구성', '호환 차종', '설치 방법', '비교/차별점',
  '건강 고민 공감', '법적 고지',
];

const BTN_SHARED: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  width: 26, height: 26, border: '1px solid var(--bd)',
  borderRadius: 6, background: 'var(--white)', cursor: 'pointer',
  fontSize: 13, color: 'var(--tx2)', fontFamily: 'var(--f)',
  flexShrink: 0,
};
const BTN_DIS: React.CSSProperties = { ...BTN_SHARED, opacity: 0.3, cursor: 'default' };

export default function SectionStructureScreen() {
  const { cat, type, go, referenceAnalysis, captureAnalysis, setSectionStructure, setSecCnt, sectionStructure } = useApp();

  const getInitial = (): string[] => {
    // Restore previously confirmed structure (user navigated back from GeneratingScreen)
    if (sectionStructure.length) return [...sectionStructure];
    if (referenceAnalysis?.sections?.length) return [...referenceAnalysis.sections];
    if (captureAnalysis?.섹션목록?.length) return captureAnalysis.섹션목록.map(s => s.타입);
    return (
      CAT_DEFAULTS[cat || '']?.[type || '기본형'] ??
      ['히어로', '공감', 'USP', '사용법', '비교표', '후기', 'FAQ', 'CTA']
    );
  };

  const [secs, setSecs] = useState<string[]>(getInitial);
  const [showAdd, setShowAdd] = useState(false);
  const [customInput, setCustomInput] = useState('');

  const moveUp = (i: number) => setSecs(s => {
    if (i === 0) return s;
    const n = [...s]; [n[i - 1], n[i]] = [n[i], n[i - 1]]; return n;
  });
  const moveDown = (i: number) => setSecs(s => {
    if (i >= s.length - 1) return s;
    const n = [...s]; [n[i], n[i + 1]] = [n[i + 1], n[i]]; return n;
  });
  const remove = (i: number) => setSecs(s => s.filter((_, idx) => idx !== i));
  const addSection = (label: string) => {
    if (label && !secs.includes(label)) setSecs(s => [...s, label]);
    setShowAdd(false);
  };
  const addCustom = () => {
    const t = customInput.trim();
    if (t && !secs.includes(t)) { setSecs(s => [...s, t]); setCustomInput(''); setShowAdd(false); }
  };

  const handleConfirm = () => {
    setSectionStructure(secs);
    setSecCnt(secs.length);
    go('s6');
  };

  const fromRef = Boolean(referenceAnalysis?.sections?.length);
  const fromCapture = !fromRef && Boolean(captureAnalysis?.섹션목록?.length);
  const available = ALL_SECTIONS.filter(s => !secs.includes(s));

  return (
    <div className="inner">
      <div className="stitle">섹션 구조를 확인해주세요</div>
      <div className="ssub">
        {fromRef ? '레퍼런스 분석 기반으로 설계됐어요' : fromCapture ? '캡처 분석 기반으로 설계됐어요' : '카테고리 맞춤 기본 구조예요'}
        {' — 순서 변경·추가·삭제가 가능해요'}
      </div>

      {fromRef && (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'var(--pl)', borderRadius: 20, padding: '4px 12px', fontSize: 11, color: 'var(--pu)', fontWeight: 700, marginBottom: 14 }}>
          ✅ 레퍼런스 기반 추천
        </div>
      )}
      {fromCapture && (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: '#f5f3ff', borderRadius: 20, padding: '4px 12px', fontSize: 11, color: '#5b21b6', fontWeight: 700, marginBottom: 14 }}>
          📸 캡처 분석 기반 추천
        </div>
      )}

      {/* 섹션 리스트 */}
      <div style={{ marginBottom: 12 }}>
        {secs.map((sec, i) => (
          <div key={`${sec}-${i}`} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: '#fff', border: '1px solid var(--bd)',
            borderRadius: 8, padding: '9px 10px', marginBottom: 6,
          }}>
            <span style={{
              minWidth: 22, height: 22, borderRadius: '50%',
              background: 'var(--pu)', color: '#fff',
              fontSize: 11, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              {i + 1}
            </span>
            <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: 'var(--tx1)' }}>{sec}</span>
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

      {/* 섹션 추가 버튼 */}
      <button
        onClick={() => setShowAdd(p => !p)}
        style={{
          width: '100%', padding: '10px 0', border: '1.5px dashed var(--bd)',
          borderRadius: 8, background: 'transparent', cursor: 'pointer',
          fontSize: 13, color: 'var(--tx2)', fontFamily: 'var(--f)',
          fontWeight: 600, marginBottom: showAdd ? 10 : 16,
        }}
      >
        {showAdd ? '✕ 닫기' : '+ 섹션 추가'}
      </button>

      {/* 추가 패널 */}
      {showAdd && (
        <div style={{
          background: '#f8fafc', border: '1px solid var(--bd)',
          borderRadius: 10, padding: '14px', marginBottom: 16,
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--tx3)', marginBottom: 10 }}>클릭해서 추가하세요</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
            {available.map(s => (
              <button
                key={s}
                onClick={() => addSection(s)}
                style={{
                  padding: '5px 10px', borderRadius: 20,
                  border: '1px solid var(--bd)', background: '#fff',
                  fontSize: 12, color: 'var(--tx1)', cursor: 'pointer',
                  fontFamily: 'var(--f)', fontWeight: 500,
                }}
              >{s}</button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <input
              className="finp"
              placeholder="직접 입력 (예: 특허 기술 소개)"
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
        </div>
      )}

      <div className="cta-row">
        <button className="btn-back" onClick={() => go('s5-5')}>← 이전</button>
        <button className="btn-next" disabled={secs.length < 2} onClick={handleConfirm}>
          <span style={{ fontSize: 11, fontWeight: 400, opacity: 0.7, marginRight: 4 }}>{secs.length}개</span>
          이 구조로 →
        </button>
      </div>
    </div>
  );
}
