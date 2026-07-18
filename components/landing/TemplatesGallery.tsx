'use client';

import { useEffect, useState } from 'react';
import LandingLayout from './LandingLayout';

/**
 * 템플릿 갤러리(/templates) — 실제 생성 결과물을 카드 그리드로 전시하고,
 * 카드를 클릭하면 전체 페이지를 끝까지 스크롤로 보는 풀 뷰어를 연다.
 * (랜딩 ShowcaseSection의 자동 스크롤과 달리, 여기선 셀러가 직접 정독하는 형태)
 *
 * 자산: 랜딩과 공유 — public/images/landing/showcase-*.jpg (우수 섹션 큐레이션 스티칭).
 */

interface GalleryItem {
  src: string;
  name: string;
  cat: string;
  desc: string;
  sections: string;
}

const ITEMS: GalleryItem[] = [
  {
    src: '/images/landing/showcase-leafgreen.jpg',
    name: '리프그린 시카 카밍 토너',
    cat: '화장품',
    desc: '창업자 스토리 타임라인 · 성분 정보그래픽 · 사용법 스텝컷까지 — 감성 카피와 정보 섹션이 한 세계관으로 이어집니다.',
    sections: '히어로 · 스토리 · 성분 · 사용법 · FAQ · 가격',
  },
  {
    src: '/images/landing/showcase-vitamin.jpg',
    name: '밸런스랩 멀티비타민',
    cat: '건강기능식품',
    desc: '식약처 고시형 문구만 사용한 신뢰 설계 — 정제 크기 체감컷, 90정 달력 도식 등 제품에 맞는 시각 단위가 자동으로 구성됩니다.',
    sections: '히어로 · 공감 · 근거 · 복용법 · 후기 · 가격',
  },
];

export default function TemplatesGallery() {
  const [viewer, setViewer] = useState<GalleryItem | null>(null);

  // 뷰어 열림 시 배경 스크롤 잠금 + ESC 닫기
  useEffect(() => {
    if (!viewer) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setViewer(null); };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey); };
  }, [viewer]);

  return (
    <LandingLayout>
      <style>{`
        .tpl-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; }
        @media (max-width: 768px) { .tpl-grid { grid-template-columns: 1fr; } }
        .tpl-card { cursor: pointer; transition: transform .18s, box-shadow .18s; }
        .tpl-card:hover { transform: translateY(-4px); box-shadow: 0 16px 40px rgba(25,31,40,0.12); }
      `}</style>

      <div style={{
        maxWidth: '1000px', margin: '0 auto', padding: '72px 36px 120px',
        fontFamily: "'Pretendard','Noto Sans KR',sans-serif",
      }}>
        {/* 헤더 */}
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <div style={{
            fontSize: '12px', fontWeight: 700, color: '#6D4CFF',
            letterSpacing: '0.1em', marginBottom: '14px',
          }}>
            GALLERY
          </div>
          <h1 style={{
            fontSize: '38px', fontWeight: 700, color: '#191F28',
            letterSpacing: '-0.03em', lineHeight: 1.25, marginBottom: '14px',
          }}>
            카테고리별 실제 결과물
          </h1>
          <p style={{ fontSize: '15px', color: '#4E5968', lineHeight: 1.7 }}>
            고정 템플릿이 아닙니다 — 상품 정보를 읽고 AI가 페이지 구조부터 설계한 무편집 결과물입니다.<br />
            카드를 누르면 전체 페이지를 끝까지 볼 수 있어요.
          </p>
        </div>

        {/* 카드 그리드 */}
        <div className="tpl-grid">
          {ITEMS.map(item => (
            <div
              key={item.name}
              className="tpl-card"
              onClick={() => setViewer(item)}
              role="button"
              aria-label={`${item.name} 전체 페이지 보기`}
              style={{
                borderRadius: '20px', overflow: 'hidden', background: '#fff',
                border: '1px solid #ECECF2', boxShadow: '0 8px 24px rgba(25,31,40,0.07)',
              }}
            >
              {/* 커버 — 페이지 상단부 크롭 */}
              <div style={{ position: 'relative', height: '340px', overflow: 'hidden' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.src}
                  alt={`${item.name} 상세페이지`}
                  loading="lazy"
                  style={{ width: '100%', display: 'block', objectFit: 'cover', objectPosition: 'top' }}
                />
                <div style={{
                  position: 'absolute', left: 0, right: 0, bottom: 0, height: '80px',
                  background: 'linear-gradient(to bottom, rgba(255,255,255,0), #fff)',
                }} />
                <span style={{
                  position: 'absolute', top: '12px', left: '12px',
                  fontSize: '11px', fontWeight: 700, color: '#6D4CFF',
                  background: 'rgba(244,242,255,0.95)', borderRadius: '999px', padding: '4px 10px',
                }}>{item.cat}</span>
              </div>
              {/* 카드 본문 */}
              <div style={{ padding: '18px 22px 22px' }}>
                <div style={{ fontSize: '17px', fontWeight: 700, color: '#191F28', letterSpacing: '-0.01em' }}>
                  {item.name}
                </div>
                <p style={{ fontSize: '13px', color: '#4E5968', lineHeight: 1.65, marginTop: '8px' }}>
                  {item.desc}
                </p>
                <div style={{
                  marginTop: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <span style={{ fontSize: '11.5px', color: '#8B95A1' }}>{item.sections}</span>
                  <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#6D4CFF' }}>전체 보기 →</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 안내 */}
        <p style={{ textAlign: 'center', fontSize: '12.5px', color: '#8B95A1', marginTop: '40px' }}>
          모든 페이지는 상품명·특징·제품 사진 한 장만으로 생성된 결과물입니다 · 카테고리는 계속 추가돼요
        </p>
      </div>

      {/* 풀 페이지 뷰어 — 클릭한 결과물을 끝까지 스크롤로 정독 */}
      {viewer && (
        <div
          onClick={() => setViewer(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(17,17,24,0.72)', backdropFilter: 'blur(4px)',
            overflowY: 'auto', padding: '40px 16px',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ maxWidth: '640px', margin: '0 auto', position: 'relative' }}
          >
            {/* 상단 바 */}
            <div style={{
              position: 'sticky', top: 0, zIndex: 2,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: 'rgba(255,255,255,0.96)', backdropFilter: 'blur(8px)',
              borderRadius: '14px 14px 0 0', padding: '12px 18px',
              borderBottom: '1px solid #ECECF2',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#191F28' }}>{viewer.name}</span>
                <span style={{
                  fontSize: '11px', fontWeight: 700, color: '#6D4CFF',
                  background: '#F4F2FF', borderRadius: '999px', padding: '3px 8px',
                }}>{viewer.cat}</span>
              </div>
              <button
                onClick={() => setViewer(null)}
                aria-label="닫기"
                style={{
                  border: 'none', background: '#F2F4F6', color: '#4E5968',
                  width: '30px', height: '30px', borderRadius: '50%',
                  fontSize: '15px', fontWeight: 700, cursor: 'pointer', lineHeight: 1,
                }}
              >✕</button>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={viewer.src}
              alt={`${viewer.name} 전체 상세페이지`}
              style={{ width: '100%', display: 'block', borderRadius: '0 0 14px 14px' }}
            />
          </div>
        </div>
      )}
    </LandingLayout>
  );
}
