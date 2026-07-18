'use client';

/**
 * 실제 결과물 쇼케이스 — Flik이 생성한 완성 상세페이지 2종(화장품·건강기능식품)을
 * 카드 프레임 안에서 자동 스크롤로 보여준다(호버 시 정지, 이어서 재생).
 *
 * 자산: public/images/landing/showcase-*.jpg — 실제 생성 런에서 우수 섹션만 큐레이션해
 * 이어붙인 무편집 결과물(표시광고 리스크 섹션 제외). 아래 폴드라 lazy 로딩.
 */

const SHOWCASES = [
  {
    src: '/images/landing/showcase-leafgreen.jpg',
    alt: '리프그린 시카 카밍 토너 상세페이지 — Flik 생성 결과물',
    name: '리프그린 시카 카밍 토너',
    cat: '화장품',
  },
  {
    src: '/images/landing/showcase-vitamin.jpg',
    alt: '밸런스랩 멀티비타민 상세페이지 — Flik 생성 결과물',
    name: '밸런스랩 멀티비타민',
    cat: '건강기능식품',
  },
];

export default function ShowcaseSection() {
  return (
    <section style={{
      padding: '100px 0',
      background: '#FAFAFC',
      fontFamily: "'Pretendard','Noto Sans KR',sans-serif",
    }}>
      <style>{`
        @keyframes showcaseScroll {
          0%   { transform: translateY(0); }
          100% { transform: translateY(calc(-100% + 640px)); }
        }
        .showcase-frame img {
          animation: showcaseScroll 55s linear infinite alternate;
        }
        .showcase-frame:hover img { animation-play-state: paused; }
        @media (max-width: 768px) {
          .showcase-grid { grid-template-columns: 1fr !important; }
          .showcase-frame { height: 480px !important; }
          @keyframes showcaseScroll {
            0%   { transform: translateY(0); }
            100% { transform: translateY(calc(-100% + 480px)); }
          }
        }
      `}</style>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 36px' }}>
        {/* 헤더 */}
        <div style={{ textAlign: 'center', marginBottom: '56px' }}>
          <div style={{
            fontSize: '12px', fontWeight: 700, color: '#6D4CFF',
            letterSpacing: '0.1em', marginBottom: '14px',
          }}>
            SHOWCASE
          </div>
          <h2 style={{
            fontSize: '36px', fontWeight: 700, color: '#191F28',
            letterSpacing: '-0.03em', lineHeight: 1.25, marginBottom: '14px',
          }}>
            Flik이 실제로 만든 페이지
          </h2>
          <p style={{ fontSize: '15px', color: '#4E5968', lineHeight: 1.7 }}>
            상품 정보와 제품 사진 한 장으로 생성된 무편집 결과물입니다.<br />
            섹션마다 다른 구성 — 템플릿을 채운 게 아니라, AI가 페이지를 설계했습니다.
          </p>
        </div>

        {/* 쇼케이스 카드 2종 */}
        <div className="showcase-grid" style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '36px',
          maxWidth: '960px', margin: '0 auto',
        }}>
          {SHOWCASES.map(s => (
            <div key={s.name}>
              <div className="showcase-frame" style={{
                position: 'relative', height: '640px', overflow: 'hidden',
                borderRadius: '24px', border: '1px solid #ECECF2',
                boxShadow: '0 12px 32px rgba(25,31,40,0.08)',
                background: '#fff',
              }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={s.src}
                  alt={s.alt}
                  loading="lazy"
                  style={{ width: '100%', display: 'block', willChange: 'transform' }}
                />
                {/* 상단 라벨 칩 */}
                <div style={{
                  position: 'absolute', top: '14px', left: '14px',
                  display: 'flex', alignItems: 'center', gap: '8px',
                  background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(8px)',
                  border: '1px solid #ECECF2', borderRadius: '999px',
                  padding: '7px 14px',
                }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#191F28' }}>{s.name}</span>
                  <span style={{
                    fontSize: '11px', fontWeight: 700, color: '#6D4CFF',
                    background: '#F4F2FF', borderRadius: '999px', padding: '3px 8px',
                  }}>{s.cat}</span>
                </div>
                {/* 하단 페이드 — 프레임이 잘린 게 아니라 이어진다는 힌트 */}
                <div style={{
                  position: 'absolute', left: 0, right: 0, bottom: 0, height: '56px',
                  background: 'linear-gradient(to bottom, rgba(255,255,255,0), rgba(255,255,255,0.9))',
                  pointerEvents: 'none',
                }} />
              </div>
              <p style={{
                textAlign: 'center', fontSize: '12.5px', color: '#8B95A1', marginTop: '12px',
              }}>
                마우스를 올리면 멈춰요 · 전 섹션 AI 생성
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
