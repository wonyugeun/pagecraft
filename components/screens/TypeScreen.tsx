'use client';

import { useState, useEffect } from 'react';
import { useApp, CH_CFG } from '@/store/AppContext';

/* ─── 섹션별 툴팁 데이터 ─── */
const SEC_TIPS: Record<string, { desc: string; eg: string }> = {
  '히어로':           { desc: '첫 화면, 시선 잡는 메인 카피',       eg: '민감한 피부, 이제 걱정 끝' },
  '공감':             { desc: '고객 고민에 공감하는 섹션',           eg: '혹시 이런 피부 고민 있으신가요?' },
  '성분신뢰':         { desc: '성분으로 신뢰 쌓기',                  eg: 'EWG 그린등급, 피부과 테스트 완료' },
  'USP':              { desc: '우리 제품만의 특별한 점',              eg: '병풀 52%, 타사 대비 2배 농도' },
  '사용법':           { desc: '어떻게 쓰는지 보여주기',              eg: '1단계: 세안 후 적당량 덜어' },
  '비교표':           { desc: '경쟁사 대비 우위 보여주기',           eg: '일반 토너 vs 우리 토너 비교' },
  '후기':             { desc: '실제 사용자 리뷰',                    eg: '피부과 다니던 분이 이걸로 해결' },
  'FAQ':              { desc: '자주 묻는 질문',                      eg: '임산부도 사용 가능한가요?' },
  'CTA':              { desc: '구매 유도 마무리',                    eg: '지금 바로 경험해보세요' },
  '브랜드 세계관':    { desc: '브랜드 스토리와 철학',               eg: '10년 연구, 성분 하나의 고집' },
  '감성 카피':        { desc: '감성을 자극하는 카피',               eg: '당신의 피부가 쉬는 시간' },
  '성분 인포그래픽':  { desc: '성분 정보를 시각적으로 표현',        eg: '히알루론산 5중 복합체 도식' },
  'SNS 공유컷':       { desc: '소셜 공유용 임팩트 이미지',          eg: 'Before/After 공유 포맷' },
  '와디즈 스토리':    { desc: '와디즈 전용 긴 서사 구조',           eg: '창업 스토리부터 제품 탄생까지' },
};

/* ─── 섹션 칩 + 툴팁 ─── */
function SectionChip({ label }: { label: string }) {
  const tip = SEC_TIPS[label];
  const [show, setShow] = useState(false);

  // 툴팁 열린 동안 외부 클릭 시 닫기
  useEffect(() => {
    if (!show) return;
    const close = () => setShow(false);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [show]);

  if (!tip) return <span className="ssp">{label}</span>;

  return (
    <span
      className="ssp"
      style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 3 }}
      onMouseLeave={() => setShow(false)}
    >
      {label}

      {/* ? 아이콘 */}
      <span
        role="button"
        tabIndex={0}
        aria-label={`${label} 설명 보기`}
        style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: 13, height: 13, borderRadius: '50%',
          background: 'rgba(100,116,139,.18)', color: '#64748b',
          fontSize: 8, fontWeight: 700, flexShrink: 0,
          cursor: 'pointer', userSelect: 'none', lineHeight: 1,
        }}
        onMouseEnter={() => setShow(true)}
        onClick={e => { e.stopPropagation(); setShow(p => !p); }}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            e.stopPropagation();
            setShow(p => !p);
          }
        }}
      >?</span>

      {/* 툴팁 */}
      {show && (
        <span
          role="tooltip"
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 8px)',
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#1e293b',
            color: '#f1f5f9',
            borderRadius: 8,
            padding: '8px 11px',
            fontSize: 11,
            lineHeight: 1.65,
            whiteSpace: 'nowrap',
            zIndex: 200,
            boxShadow: '0 6px 20px rgba(0,0,0,.28)',
            pointerEvents: 'none',
          }}
        >
          <span style={{ display: 'block', fontWeight: 700, marginBottom: 3 }}>{tip.desc}</span>
          <span style={{ display: 'block', color: '#94a3b8' }}>예: &ldquo;{tip.eg}&rdquo;</span>
          {/* 아래 화살표 */}
          <span style={{
            position: 'absolute',
            top: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 0, height: 0,
            borderLeft: '5px solid transparent',
            borderRight: '5px solid transparent',
            borderTop: '5px solid #1e293b',
          }} />
        </span>
      )}
    </span>
  );
}

/* ─── 메인 ─── */
export default function TypeScreen() {
  const { ch, type, setType, go, goAfterType } = useApp();
  const cfg = CH_CFG[ch || '스마트스토어'] || CH_CFG['스마트스토어'];

  const TYPES = [
    {
      key: '기본형',
      ico: '📄', bg: 'var(--al)',
      badge: { label: '가장 많이 사용', style: { background: 'var(--al)', color: 'var(--ac)' } },
      desc: ch === '스마트스토어'
        ? '카테고리에 맞게 설계된 10~12섹션 완성형. 스마트스토어는 블로그형 글+그림 선택 가능'
        : '카테고리에 맞게 설계된 10~12섹션 완성형. 이미지 최적 구성으로 즉시 업로드 가능',
      feats: ['10~12섹션', '누끼컷 3장', '컨셉컷 2장', '썸네일 2종'],
      secLabel: '섹션 예시 (화장품 기준)',
      secs: ['히어로', '공감', '성분신뢰', 'USP', '사용법', '비교표', '후기', 'FAQ', 'CTA'],
    },
    {
      key: '프리미엄형',
      ico: '✨', bg: 'var(--pl)',
      badge: { label: '고급 브랜딩', style: { background: 'var(--pl)', color: 'var(--pu)' } },
      desc: '바이오더마·닥터지 수준 기획. 브랜드 스토리부터 감성 카피까지 — 와디즈 50장+ 대응 포함',
      feats: ['15~50장+', '누끼컷 5장', '컨셉컷 4장', '썸네일 3종', 'GIF 프레임', '브랜드 스토리'],
      secLabel: '추가 포함',
      secs: ['브랜드 세계관', '감성 카피', '성분 인포그래픽', 'SNS 공유컷', '와디즈 스토리'],
    },
  ];

  return (
    <div className="inner">
      <div className="stitle">어떤 형태로 만들까요?</div>
      <div className="ssub">{ch || '선택한 채널'}에 맞는 구성을 안내드려요</div>
      <div style={{ background: 'var(--al)', border: '1px solid rgba(37,99,235,.15)', borderRadius: 'var(--rs)', padding: '10px 14px', marginBottom: 16, fontSize: 12, color: 'var(--ac)' }}>
        {cfg.note}
      </div>
      <div className="type-list">
        {TYPES.map(t => (
          <div
            key={t.key}
            className={`tc${type === t.key ? ' on' : ''}${cfg.rec === t.key ? ' rec' : ''}`}
            onClick={() => setType(t.key)}
          >
            <div className="tc-ck">✓</div>
            <div className="tc-ico" style={{ background: t.bg }}>{t.ico}</div>
            <div style={{ flex: 1 }}>
              <div className="tc-name">
                {t.key}
                <span className="tc-badge" style={t.badge.style}>{t.badge.label}</span>
              </div>
              <div className="tc-desc">{t.desc}</div>
              <div className="tc-feats">
                {t.feats.map(f => <span key={f} className="feat">{f}</span>)}
              </div>
              <div className="tc-secs">
                <div className="tc-sl">{t.secLabel}</div>
                <div className="tc-sps" style={{ overflow: 'visible' }}>
                  {t.secs.map(s => <SectionChip key={s} label={s} />)}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="cta-row">
        <button className="btn-back" onClick={() => go('s2')}>← 이전</button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="sel-hint" style={{ visibility: type ? 'visible' : 'hidden' }}>
            선택: <span className="hint-tag">{type}</span>
          </div>
          <button className="btn-next" disabled={!type} onClick={goAfterType}>다음 →</button>
        </div>
      </div>
    </div>
  );
}
