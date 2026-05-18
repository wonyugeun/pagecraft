'use client';

import { useApp, CH_CFG } from '@/store/AppContext';

export default function TypeScreen() {
  const { ch, type, setType, go, goAfterType } = useApp();
  const cfg = CH_CFG[ch || '스마트스토어'] || CH_CFG['스마트스토어'];

  const TYPES = [
    {
      key: '기본형',
      ico: '📄', bg: 'var(--al)',
      badge: { label: '가장 많이 사용', style: { background: 'var(--al)', color: 'var(--ac)' } },
      desc: '카테고리에 맞게 설계된 10~12섹션 완성형. 스마트스토어는 블로그형 글+그림 선택 가능',
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
                <div className="tc-sps">
                  {t.secs.map(s => <span key={s} className="ssp">{s}</span>)}
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
