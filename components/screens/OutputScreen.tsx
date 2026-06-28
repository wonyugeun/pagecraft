'use client';

import { Star, Zap, ArrowLeft, Check } from 'lucide-react';
import { useApp } from '@/store/AppContext';
import { CatBlogPreview, CatSlidePreview } from './CategoryPreview';

/* ── 메인 ── */
export default function OutputScreen() {
  const { cat, ch, type, out, setOut, go, productName } = useApp();

  const OUTPUTS = [
    {
      key: 'blog',
      title: '블로그형 (글 + 그림)',
      accent: '#6D4CFF',
      tagLabel: '스토리텔링에 강함',
      tagStyle: { background: '#D1FAE5', color: '#065F46' },
      aiRec: ch === '스마트스토어',
      desc: '텍스트와 이미지를 조합해\n스토리처럼 자연스럽게 전달해요.\n네이버 블로그 스타일로 신뢰도가 높아요.',
      Preview: CatBlogPreview,
      feats: ['텍스트 중심', '이미지 + 본문 조합', '스토리텔링 최적화'],
    },
    {
      key: 'slide',
      title: '이미지 슬라이드형',
      accent: '#6B7280',
      tagLabel: '시각적 임팩트에 강함',
      tagStyle: { background: '#F3F4F6', color: '#374151' },
      aiRec: false,
      desc: '이미지 위로 핵심 내용을\n슬라이드 형태로 보여줘요.\n빠르게 정보를 전달하고 쿠팡에 적합해요.',
      Preview: CatSlidePreview,
      feats: ['+ 이미지 중심', '+ 슬라이드 구성', '+ 빠른 정보 전달'],
    },
  ];

  return (
    <div style={{ maxWidth: '880px', margin: '0 auto', padding: '40px 24px 100px', fontFamily: 'var(--f)' }}>

      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <span style={{
          display: 'inline-block', padding: '4px 13px', marginBottom: '16px',
          border: '1.5px solid #D8CFFF', borderRadius: '100px',
          fontSize: '11.5px', fontWeight: 700, color: '#6D4CFF', letterSpacing: '0.04em',
        }}>STEP 4 / 10</span>
        <h1 style={{
          fontSize: '28px', fontWeight: 800, color: '#111',
          letterSpacing: '-0.04em', lineHeight: 1.3, marginBottom: '10px',
        }}>
          어떤 형태로 <span style={{ color: '#6D4CFF' }}>출력</span>할까요?
        </h1>
        <p style={{ fontSize: '14px', color: '#9CA3AF', marginBottom: '8px' }}>
          {ch} · {type} — 출력 형태를 선택해주세요
        </p>
        <p style={{ fontSize: '12.5px', color: '#A89DD4', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
          ✦ 나중에 변경도 가능합니다. ✏️
        </p>
      </div>

      <div className="cards-2col" style={{ marginBottom: '16px' }}>
        {OUTPUTS.map(o => {
          const selected = out === o.key;
          return (
            <div
              key={o.key}
              onClick={() => setOut(o.key)}
              style={{
                position: 'relative', cursor: 'pointer',
                background: selected ? '#F7F5FF' : '#fff',
                border: `${selected ? 2 : 1.5}px solid ${selected ? '#6D4CFF' : '#E5E7EB'}`,
                borderRadius: '16px', padding: '20px',
                boxShadow: selected ? '0 0 0 3px rgba(109,76,255,0.10)' : '0 1px 4px rgba(0,0,0,0.05)',
                transition: 'all 150ms ease',
                display: 'flex', flexDirection: 'column', gap: '14px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                {o.aiRec ? (
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: '4px',
                    fontSize: '11px', fontWeight: 700, color: '#6D4CFF',
                    background: '#F0ECFF', padding: '4px 10px', borderRadius: '100px',
                  }}>
                    <Star size={10} fill="#6D4CFF" /> AI 추천
                  </span>
                ) : <div />}
                <div style={{
                  width: '22px', height: '22px', borderRadius: '50%',
                  background: selected ? '#6D4CFF' : 'transparent',
                  border: `2px solid ${selected ? '#6D4CFF' : '#D1D5DB'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 150ms ease', flexShrink: 0,
                }}>
                  {selected && <Check size={12} color="#fff" strokeWidth={3} />}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <span style={{ fontSize: '16px', fontWeight: 800, color: '#111', letterSpacing: '-0.03em' }}>{o.title}</span>
                <span style={{ fontSize: '11px', fontWeight: 600, padding: '3px 9px', borderRadius: '100px', ...o.tagStyle }}>{o.tagLabel}</span>
              </div>

              <p style={{ fontSize: '12.5px', color: '#6B7280', lineHeight: 1.7, whiteSpace: 'pre-line', letterSpacing: '-0.01em', margin: 0 }}>
                {o.desc}
              </p>

              <o.Preview cat={cat} productName={productName} />

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {o.feats.map(f => (
                  <span key={f} style={{
                    fontSize: '11.5px', fontWeight: 500, padding: '4px 11px', borderRadius: '6px',
                    background: selected ? '#EDE8FF' : '#F3F4F6',
                    color: selected ? '#6D4CFF' : '#6B7280',
                    transition: 'all 150ms ease',
                  }}>{f}</span>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: '#FAFAFA', border: '1px solid #EBEBEB', borderRadius: '12px',
        padding: '14px 20px', marginBottom: '32px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '32px', height: '32px', borderRadius: '8px',
            background: '#EDE8FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Zap size={15} color="#6D4CFF" />
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#333', letterSpacing: '-0.01em' }}>언제든 변경할 수 있어요</div>
            <div style={{ fontSize: '11.5px', color: '#9CA3AF' }}>선택하신 출력 형태는 상품 정보 입력 후에도 자유롭게 변경 가능합니다.</div>
          </div>
        </div>
        {/* '자세히 보기'(onClick 없는 죽은 버튼) 제거 — 안내 텍스트·아이콘만 유지 */}
      </div>

      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        paddingTop: '24px', borderTop: '1px solid #EBEBEB',
      }}>
        <button onClick={() => go('s3')} style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          background: 'none', border: 'none',
          fontSize: '13.5px', fontWeight: 600, color: '#9CA3AF', cursor: 'pointer',
        }}>
          <ArrowLeft size={15} /> 이전 단계
        </button>
        <button
          disabled={!out}
          onClick={() => out && go('s5')}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '12px 26px',
            background: out ? '#6D4CFF' : '#EDE8FF',
            color: out ? '#fff' : '#B0A0E8',
            border: 'none', borderRadius: '10px',
            fontSize: '14px', fontWeight: 700,
            cursor: out ? 'pointer' : 'not-allowed',
            letterSpacing: '-0.01em',
            boxShadow: out ? '0 4px 14px rgba(109,76,255,0.30)' : 'none',
            transition: 'all 150ms ease',
          }}
        >
          상품 정보 입력 →
        </button>
      </div>
    </div>
  );
}
