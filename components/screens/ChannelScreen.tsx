'use client';

import { useApp } from '@/store/AppContext';

const CHANNELS = [
  {
    key: '스마트스토어',
    ico: '🛒', bg: '#fff9c4',
    tagClass: 'tg', tag: '셀러 1순위 추천',
    why: '검색 유입 = 비교하고 온 고객. 블로그형 글+그림 구성이 SEO와 전환율 모두 잡는 핵심.',
    pills: ['블로그형 글+그림', '이미지 슬라이드', '썸네일 3종'],
    note: { text: '출력형태 선택 가능: 블로그형 또는 이미지 슬라이드형', style: { color: 'var(--gn)', background: 'var(--gl)' } },
    tl: '네이버 쇼핑 기반',
  },
  {
    key: '쿠팡',
    ico: '🚀', bg: '#e8f3ff',
    tagClass: 'ta', tag: '이미지 중심',
    why: '가격·배송이 먼저 보이는 환경. 첫 3초 안에 구매 이유를 줘야 함.',
    pills: ['이미지 슬라이드', '흰 배경 누끼컷', '썸네일 2종'],
    note: { text: '출력형태 자동 적용: 이미지 슬라이드형', style: { color: 'var(--ac)', background: 'var(--al)' } },
    tl: '로켓배송 경쟁 환경',
  },
  {
    key: '자사몰',
    ico: '🏪', bg: '#f5f0eb',
    tagClass: 'tw', tag: '브랜드 스토리',
    why: '브랜드에 관심 있어서 온 고객. 세계관·스토리·감성 카피가 충성 고객 전환의 핵심.',
    pills: ['HTML 섹션', '감성 카피', '컨셉컷'],
    note: { text: '출력형태 자동 적용: HTML 섹션형', style: { color: 'var(--ac)', background: 'var(--al)' } },
    tl: '브랜드 직접 운영',
  },
  {
    key: '와디즈',
    ico: '💡', bg: '#f5f3ff',
    tagClass: 'tp', tag: '스토리텔링',
    why: '처음 보는 제품을 납득시켜야 함. 창업 스토리+개발 과정+긴박감이 핵심.',
    pills: ['긴 스크롤 HTML', '50장+', 'GIF 포함'],
    note: { text: '출력형태 자동 적용: HTML 긴 스크롤형', style: { color: 'var(--ac)', background: 'var(--al)' } },
    tl: '펀딩·예약판매',
  },
];

export default function ChannelScreen() {
  const { ch, setCh, go } = useApp();

  return (
    <div className="inner">
      <div className="stitle">어디서 판매하고 계세요?</div>
      <div className="ssub">채널마다 구매자 심리가 달라요 — 최적 구조로 자동 분기됩니다</div>
      <div className="ch-grid">
        {CHANNELS.map(c => (
          <div key={c.key} className={`chc${ch === c.key ? ' on' : ''}`} onClick={() => setCh(c.key)}>
            <div className="chc-ck">✓</div>
            <div className="chc-top">
              <div className="chc-ico" style={{ background: c.bg }}>{c.ico}</div>
              <div>
                <div className="chc-name">{c.key}</div>
                <div className="chc-tl">{c.tl}</div>
              </div>
            </div>
            <div className={`chc-tag ${c.tagClass}`}>{c.tag}</div>
            <div className="chc-why">{c.why}</div>
            <div className="chc-out">
              {c.pills.map(p => <span key={p} className="chc-pill">{p}</span>)}
            </div>
            <div style={{ marginTop: 8, fontSize: 10, borderRadius: 6, padding: '4px 8px', display: 'inline-block', ...c.note.style }}>
              {c.note.text}
            </div>
          </div>
        ))}
      </div>
      <div className="cta-row">
        <button className="btn-back" onClick={() => go('s1')}>← 이전</button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="sel-hint" style={{ visibility: ch ? 'visible' : 'hidden' }}>
            선택: <span className="hint-tag">{ch}</span>
          </div>
          <button className="btn-next" disabled={!ch} onClick={() => go('s3')}>다음 →</button>
        </div>
      </div>
    </div>
  );
}
