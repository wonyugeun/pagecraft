'use client';

import { useApp } from '@/store/AppContext';

const CATS = [
  { key: '화장품',      ico: '✨', sub: '스킨케어, 색조, 선케어',    bg: '#fff0f5' },
  { key: '식품',        ico: '🍱', sub: '신선, 가공, 건기식',        bg: '#f0fdf4' },
  { key: '패션',        ico: '👔', sub: '의류, 신발, 가방',           bg: '#f5f3ff' },
  { key: '생활',        ico: '🛋️', sub: '가구, 소품, 청소',          bg: '#eff6ff' },
  { key: '가전',        ico: '📱', sub: '전자기기, 주변기기',          bg: '#fffbeb' },
  { key: '반려동물',    ico: '🐶', sub: '사료, 간식, 용품',           bg: '#fff7ed' },
  { key: '스포츠',      ico: '⚽', sub: '운동용품, 아웃도어',         bg: '#f0fdfa' },
  { key: '유아',        ico: '🧸', sub: '유아용품, 임산부',           bg: '#fefce8' },
  { key: '건강',        ico: '💪', sub: '건강용품, 의료기기',         bg: '#f0fdf4' },
  { key: '자동차',      ico: '🚙', sub: '차량용품, 튜닝',             bg: '#f8fafc' },
  { key: '기타',        ico: '🎁', sub: '위 카테고리 외',             bg: '#f8f7f4' },
];

export default function CategoryScreen() {
  const { cat, setCat, go } = useApp();

  return (
    <div className="inner">
      <div className="stitle">어떤 상품의 상세페이지를 만드세요?</div>
      <div className="ssub">카테고리를 선택하면 그에 맞는 기획 구조로 자동 설계됩니다</div>
      <div className="cat-grid">
        {CATS.map(c => (
          <div
            key={c.key}
            className={`cc${cat === c.key ? ' on' : ''}`}
            onClick={() => setCat(c.key)}
          >
            <div className="cc-ck">✓</div>
            <div className="cc-ico" style={{ background: c.bg }}>{c.ico}</div>
            <div className="cc-name">{c.key}</div>
            <div className="cc-sub">{c.sub}</div>
          </div>
        ))}
      </div>
      <div className="cta-row">
        <button className="btn-back" onClick={() => go('s-dash')}>← 대시보드</button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="sel-hint" style={{ visibility: cat ? 'visible' : 'hidden' }}>
            선택: <span className="hint-tag">{cat}</span>
          </div>
          <button className="btn-next" disabled={!cat} onClick={() => go('s2')}>다음 →</button>
        </div>
      </div>
    </div>
  );
}
