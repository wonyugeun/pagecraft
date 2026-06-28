'use client';

import { useState } from 'react';
import { Star, Zap, Check, ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { useApp } from '@/store/AppContext';

/* ── 블로그형 미리보기 ── */
function BlogPreview() {
  return (
    <div style={{
      background: '#fff', border: '1px solid #E8E4F4', borderRadius: '12px',
      overflow: 'hidden', userSelect: 'none', maxHeight: '500px', overflowY: 'auto',
    }}>
      <div style={{
        background: '#fff', padding: '8px 12px', borderBottom: '1px solid #F0F0F0',
        display: 'flex', alignItems: 'center', gap: '6px', position: 'sticky', top: 0, zIndex: 1,
      }}>
        <span style={{ fontSize: '15px', fontWeight: 900, color: '#03C75A', fontFamily: 'sans-serif', lineHeight: 1 }}>N</span>
        <span style={{ fontSize: '10px', color: '#999' }}>블로그</span>
      </div>

      <div style={{ padding: '14px 14px 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div>
          <div style={{ fontSize: '13px', fontWeight: 800, color: '#111', letterSpacing: '-0.03em', lineHeight: 1.4, marginBottom: '6px' }}>
            프리미엄 키친세트로<br />우리 집 주방을 특별하게 ✨
          </div>
          <div style={{ fontSize: '10px', color: '#888', lineHeight: 1.7 }}>
            매일 사용하는 주방용품, 소재와 디자인 하나하나에<br />
            정성을 담았습니다. 좋은 도구가 일상을 바꿔요.
          </div>
        </div>

        <img
          src="https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=200&fit=crop&auto=format"
          alt="kitchen1"
          style={{ width: '100%', height: '110px', objectFit: 'cover', borderRadius: '8px', display: 'block' }}
        />

        <div>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#111', marginBottom: '5px' }}>🍳 왜 소재가 중요할까요?</div>
          <div style={{ fontSize: '10px', color: '#555', lineHeight: 1.75 }}>
            저렴한 소재는 열을 받으면 유해물질이 나올 수 있어요.<br />
            스테인리스 18-8 규격은 안전하고 오래 쓸 수 있죠.<br />
            한 번 잘 구입하면 10년은 쓸 수 있습니다.
          </div>
        </div>

        <img
          src="https://images.unsplash.com/photo-1584568694244-14fbdf83bd30?w=400&h=160&fit=crop&auto=format"
          alt="kitchen2"
          style={{ width: '100%', height: '90px', objectFit: 'cover', borderRadius: '8px', display: 'block' }}
        />

        <div>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#111', marginBottom: '5px' }}>✅ 제품 주요 특징</div>
          {['고급 스테인리스 18-8 소재', '인체공학적 손잡이 설계', '식기세척기 사용 가능', '세련된 무광 마감'].map(f => (
            <div key={f} style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '4px' }}>
              <Check size={9} color="#6D4CFF" strokeWidth={3} />
              <span style={{ fontSize: '9.5px', color: '#444' }}>{f}</span>
            </div>
          ))}
        </div>

        <img
          src="https://images.unsplash.com/photo-1590794056226-79ef3a8147e1?w=400&h=160&fit=crop&auto=format"
          alt="kitchen3"
          style={{ width: '100%', height: '90px', objectFit: 'cover', borderRadius: '8px', display: 'block' }}
        />

        <div style={{
          background: '#F7F5FF', borderRadius: '8px', padding: '10px 12px',
          fontSize: '10px', color: '#6D4CFF', lineHeight: 1.7, fontWeight: 500,
        }}>
          💜 지금 구매하시면 전용 수세미 증정!<br />
          오늘 하루만 10% 할인 + 무료배송 제공합니다.
        </div>
      </div>
    </div>
  );
}

const SLIDE_SRCS = [
  '/images/slide1.png',
  '/images/slide2.png',
  '/images/slide3.png',
];

function SlidePreview() {
  const [idx, setIdx] = useState(0);
  const total = SLIDE_SRCS.length;

  return (
    <div style={{
      border: '1px solid #E8E4F4', borderRadius: '12px',
      overflow: 'hidden', userSelect: 'none', position: 'relative',
    }}>
      <img
        src={SLIDE_SRCS[idx]}
        alt={`slide${idx + 1}`}
        style={{ width: '100%', display: 'block' }}
      />

      {[
        { side: 'left', icon: ChevronLeft, action: () => setIdx(i => (i - 1 + total) % total) },
        { side: 'right', icon: ChevronRight, action: () => setIdx(i => (i + 1) % total) },
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

      <div style={{
        position: 'absolute', bottom: '10px', left: '50%', transform: 'translateX(-50%)',
        display: 'flex', gap: '4px', zIndex: 2,
      }}>
        {Array.from({ length: total }).map((_, i) => (
          <div key={i} onClick={e => { e.stopPropagation(); setIdx(i); }} style={{
            width: i === idx ? '16px' : '6px', height: '6px', borderRadius: '3px',
            background: i === idx ? '#6D4CFF' : 'rgba(255,255,255,0.7)',
            cursor: 'pointer', transition: 'all 200ms ease',
            boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
          }} />
        ))}
      </div>
    </div>
  );
}

/* ── 메인 ── */
export default function OutputScreen() {
  const { ch, type, out, setOut, go } = useApp();

  const OUTPUTS = [
    {
      key: 'blog',
      title: '블로그형 (글 + 그림)',
      accent: '#6D4CFF',
      tagLabel: '스토리텔링에 강함',
      tagStyle: { background: '#D1FAE5', color: '#065F46' },
      aiRec: ch === '스마트스토어',
      desc: '텍스트와 이미지를 조합해\n스토리처럼 자연스럽게 전달해요.\n네이버 블로그 스타일로 신뢰도가 높아요.',
      Preview: BlogPreview,
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
      Preview: SlidePreview,
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

              <o.Preview />

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
