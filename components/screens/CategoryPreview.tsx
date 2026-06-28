'use client';

import { useState } from 'react';
import { Check, ChevronLeft, ChevronRight } from 'lucide-react';

/* ───────────────────────────────────────────────────────────
   카테고리별 미리보기 데이터 — 출력형태(s3b)·상품정보(s5) 두 화면에서 공유.
   외부 이미지 의존(깨짐 위험) 대신 카테고리 색·이모지·샘플 카피로 구성(항상 안정).
─────────────────────────────────────────────────────────── */
type CatPv = {
  emoji: string;
  grad: [string, string];   // 히어로 그라데이션
  accent: string;
  hero: string;             // 대표 헤드라인(상품명 미입력 시)
  body: string;             // 본문 샘플
  feats: string[];          // 특징 체크리스트
  cta: string;              // 하단 CTA 카피
};

const CAT_PV: Record<string, CatPv> = {
  화장품:   { emoji: '🧴', grad: ['#FDF2F8', '#FBCFE8'], accent: '#DB2777', hero: '맑고 건강한 피부 위로', body: '순한 성분으로 매일 안심하고 쓰는\n데일리 스킨케어 루틴을 완성하세요.', feats: ['핵심 성분 · 효능 강조', '피부 고민 맞춤 카피', '화장품 법적 고지 자동'], cta: '지금 피부에 진심을 더해보세요 💕' },
  식품:     { emoji: '🍲', grad: ['#FEF3C7', '#FDE68A'], accent: '#D97706', hero: '신선함을 그대로 식탁까지', body: '엄선한 원산지에서 정성껏 골라\n가장 신선한 상태로 배송해 드려요.', feats: ['원산지 · 신선도 강조', '영양 · 보관 정보 안내', '알레르기 표시 자동'], cta: '오늘 식탁을 더 특별하게 🍽️' },
  패션:     { emoji: '👗', grad: ['#EEF2FF', '#C7D2FE'], accent: '#4F46E5', hero: '데일리룩의 완성', body: '편안한 핏과 좋은 소재로\n어디서나 잘 어울리는 한 벌이에요.', feats: ['소재 · 핏 상세 안내', '스타일링 제안', '사이즈 가이드 포함'], cta: '오늘의 코디를 완성하세요 ✨' },
  생활:     { emoji: '🛋️', grad: ['#F0FDF4', '#BBF7D0'], accent: '#16A34A', hero: '공간을 바꾸는 한 끗', body: '좋은 소재와 디테일로\n매일의 공간을 더 멋지게 채워요.', feats: ['소재 · 품질 강조', '공간 활용 시나리오', '설치 · 사용 안내'], cta: '우리 집을 더 특별하게 🏡' },
  가전:     { emoji: '📱', grad: ['#EFF6FF', '#BFDBFE'], accent: '#2563EB', hero: '더 똑똑해진 일상', body: '핵심 기술을 생활 언어로 풀어\n쓰는 즐거움이 달라지는 가전이에요.', feats: ['핵심 스펙 · 기능 정리', '안전 · 인증 배지', 'A/S · 보증 안내'], cta: '일상을 업그레이드하세요 ⚡' },
  반려동물: { emoji: '🐾', grad: ['#FEF9EE', '#FEF08A'], accent: '#CA8A04', hero: '우리 아이를 위한 건강한 선택', body: '안전한 원료와 균형 잡힌 영양으로\n오래오래 건강하게.', feats: ['원료 · 성분 안전 강조', '영양 균형 · 급여 안내', '수의사 신뢰 요소'], cta: '우리 아이 건강을 챙겨주세요 🐶' },
  스포츠:   { emoji: '🏃', grad: ['#FFF7ED', '#FED7AA'], accent: '#EA580C', hero: '퍼포먼스를 높이다', body: '기능성 소재와 설계로\n운동의 한계를 한 단계 끌어올려요.', feats: ['기능성 소재 · 기술', '착용감 · 핏', '사이즈 · 인증'], cta: '오늘의 기록을 경신하세요 🔥' },
  유아:     { emoji: '🍼', grad: ['#EEF2FF', '#C7D2FE'], accent: '#6366F1', hero: '안심하고 쓰는 아이 제품', body: '깐깐한 안전 기준과 순한 소재로\n부모의 마음까지 챙겼어요.', feats: ['안전 인증 최상단 배치', '발달 · 연령 적합성', '순한 소재 강조'], cta: '아이에게 안심을 선물하세요 👶' },
  건강:     { emoji: '💊', grad: ['#FCEBEB', '#FECACA'], accent: '#DC2626', hero: '매일의 건강 루틴', body: '검증된 성분과 함량으로\n꾸준한 건강 관리를 도와드려요.', feats: ['성분 · 함량 명시', '임상 · 인증 근거', '섭취 방법 안내'], cta: '건강한 하루를 시작하세요 🌿' },
  자동차:   { emoji: '🚗', grad: ['#DBEAFE', '#BFDBFE'], accent: '#1D4ED8', hero: '드라이브가 즐거워지는', body: '내 차에 딱 맞는 호환성과\n간편한 설치로 만족도를 높여요.', feats: ['차종 호환 안내', '설치 간편함', '인증 · 내구성'], cta: '드라이브를 더 편하게 🚙' },
  기타:     { emoji: '📦', grad: ['#F4F0FF', '#DDD6FE'], accent: '#7C3AED', hero: '당신의 상품을 특별하게', body: '상품의 핵심 강점을 살려\n구매로 이어지는 상세페이지를 만들어요.', feats: ['핵심 강점 강조', '상세 정보 정리', '신뢰 요소 배치'], cta: '지금 바로 시작하세요 ✨' },
};

function pv(cat: string | null): CatPv {
  const key = cat?.split('/')[0]?.trim() ?? '';
  return CAT_PV[key] ?? CAT_PV['기타'];
}

/* ── 블로그형 미리보기 (네이버 블로그 카드 톤) ── */
export function CatBlogPreview({ cat, productName }: { cat: string | null; productName?: string }) {
  const d = pv(cat);
  const title = productName?.trim() || d.hero;
  return (
    <div style={{
      background: '#fff', border: '1px solid #E8E4F4', borderRadius: '12px',
      overflow: 'hidden', userSelect: 'none', maxHeight: '440px', overflowY: 'auto',
    }}>
      {/* N블로그 헤더 */}
      <div style={{
        background: '#fff', padding: '8px 12px', borderBottom: '1px solid #F0F0F0',
        display: 'flex', alignItems: 'center', gap: '6px', position: 'sticky', top: 0, zIndex: 1,
      }}>
        <span style={{ fontSize: '15px', fontWeight: 900, color: '#03C75A', fontFamily: 'sans-serif', lineHeight: 1 }}>N</span>
        <span style={{ fontSize: '10px', color: '#999' }}>블로그</span>
      </div>

      <div style={{ padding: '14px 14px 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* 제목 */}
        <div style={{ fontSize: '13px', fontWeight: 800, color: '#111', letterSpacing: '-0.03em', lineHeight: 1.4 }}>
          {title}
        </div>

        {/* 히어로(카테고리 그라데이션 + 이모지) */}
        <div style={{
          width: '100%', height: '120px', borderRadius: '8px',
          background: `linear-gradient(135deg, ${d.grad[0]} 0%, ${d.grad[1]} 100%)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative',
        }}>
          <span style={{ fontSize: '46px', filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.12))' }}>{d.emoji}</span>
          <span style={{ position: 'absolute', bottom: '8px', right: '10px', fontSize: '9px', fontWeight: 700, color: d.accent, background: 'rgba(255,255,255,0.8)', padding: '2px 7px', borderRadius: '20px' }}>{(cat ?? '추천')} 예시</span>
        </div>

        {/* 본문 */}
        <div style={{ fontSize: '10px', color: '#555', lineHeight: 1.75, whiteSpace: 'pre-line' }}>{d.body}</div>

        {/* 특징 체크 */}
        <div>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#111', marginBottom: '5px' }}>✅ 이렇게 구성돼요</div>
          {d.feats.map(f => (
            <div key={f} style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '4px' }}>
              <Check size={9} color={d.accent} strokeWidth={3} />
              <span style={{ fontSize: '9.5px', color: '#444' }}>{f}</span>
            </div>
          ))}
        </div>

        {/* CTA 틴트 */}
        <div style={{
          background: `${d.accent}10`, borderRadius: '8px', padding: '10px 12px',
          fontSize: '10px', color: d.accent, lineHeight: 1.7, fontWeight: 600,
        }}>{d.cta}</div>
      </div>
    </div>
  );
}

/* ── 슬라이드형 미리보기 (카드 슬라이드 톤, 화살표·점 작동) ── */
export function CatSlidePreview({ cat, productName }: { cat: string | null; productName?: string }) {
  const d = pv(cat);
  const title = productName?.trim() || d.hero;
  // 3장: 히어로 / 특징 / CTA
  const slides = [
    { kind: 'hero' as const },
    { kind: 'feats' as const },
    { kind: 'cta' as const },
  ];
  const [idx, setIdx] = useState(0);
  const total = slides.length;
  const s = slides[idx];

  return (
    <div style={{ border: '1px solid #E8E4F4', borderRadius: '12px', overflow: 'hidden', userSelect: 'none', position: 'relative' }}>
      <div style={{
        width: '100%', height: '240px',
        background: `linear-gradient(150deg, ${d.grad[0]} 0%, ${d.grad[1]} 100%)`,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '20px', textAlign: 'center', gap: '12px',
      }}>
        <span style={{ fontSize: '40px', filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.12))' }}>{d.emoji}</span>
        {s.kind === 'hero' && (
          <div style={{ fontSize: '15px', fontWeight: 800, color: '#1A1A1A', letterSpacing: '-0.02em', lineHeight: 1.4 }}>{title}</div>
        )}
        {s.kind === 'feats' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '7px', alignItems: 'center' }}>
            {d.feats.map(f => (
              <span key={f} style={{ fontSize: '11.5px', fontWeight: 700, color: d.accent, background: 'rgba(255,255,255,0.75)', borderRadius: '20px', padding: '4px 12px' }}>{f}</span>
            ))}
          </div>
        )}
        {s.kind === 'cta' && (
          <div style={{ fontSize: '14px', fontWeight: 800, color: d.accent, lineHeight: 1.5 }}>{d.cta}</div>
        )}
        <span style={{ position: 'absolute', top: '10px', left: '12px', fontSize: '9px', fontWeight: 700, color: d.accent, background: 'rgba(255,255,255,0.8)', padding: '2px 7px', borderRadius: '20px' }}>{(cat ?? '추천')} 예시</span>
      </div>

      {[
        { side: 'left' as const, icon: ChevronLeft, action: () => setIdx(i => (i - 1 + total) % total) },
        { side: 'right' as const, icon: ChevronRight, action: () => setIdx(i => (i + 1) % total) },
      ].map(({ side, icon: Icon, action }) => (
        <button key={side}
          onClick={e => { e.stopPropagation(); action(); }}
          style={{
            position: 'absolute', [side]: '8px', top: '50%', transform: 'translateY(-50%)',
            width: '28px', height: '28px', borderRadius: '50%',
            background: 'rgba(255,255,255,0.92)', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 1px 6px rgba(0,0,0,0.18)', zIndex: 2,
          }}
        ><Icon size={13} color="#333" /></button>
      ))}

      <div style={{ position: 'absolute', bottom: '10px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '4px', zIndex: 2 }}>
        {Array.from({ length: total }).map((_, i) => (
          <div key={i} onClick={e => { e.stopPropagation(); setIdx(i); }} style={{
            width: i === idx ? '16px' : '6px', height: '6px', borderRadius: '3px',
            background: i === idx ? d.accent : 'rgba(255,255,255,0.8)',
            cursor: 'pointer', transition: 'all 200ms ease', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
          }} />
        ))}
      </div>
    </div>
  );
}
