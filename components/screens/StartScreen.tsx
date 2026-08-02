'use client';

import { useState } from 'react';
import { Sparkles, Package, Shirt, Sofa, Smartphone, Dog, Volleyball, Baby, HeartPulse, Car, Box, ChevronDown } from 'lucide-react';
import { useApp, STEP_MAP } from '@/store/AppContext';
import { calculateGenerationCost } from '@/lib/pricing';
import StepHeader from '@/components/layout/StepHeader';

/**
 * 시작 화면 — 카테고리·채널·분량·형태를 한 화면에서(2026-08-02).
 *
 * ★왜 합쳤나: 앞 네 화면(s1~s3b)이 전부 '고르기'만 해서, 셀러 입장에선 네 번을 눌러도
 *   "아직 아무것도 안 했다"는 느낌이었다. 단계마다 이탈도 생긴다.
 *   후커블이 빨라 보이는 건 화면 수가 적어서가 아니라 바로 타이핑을 시작하기 때문이다.
 *   → 상품명 입력을 맨 위로 올려 첫 화면부터 자기 일을 시작하게 한다.
 *
 * ★단 상품정보 폼(s5)은 합치지 않는다. 구조화된 입력이 "셀러가 말한 것만 쓴다"의 근거이고,
 *   화장품법 고지·알레르기 같은 법적 필수 항목의 누락도 폼이라야 감지한다.
 *
 * ★형태(블로그/슬라이드)는 '고르라고 묻지 않고' 채널에 맞춰 정해서 보여준다.
 *   셀러는 우리 용어를 모른다 — 이유와 실제 예시를 함께 보여줘야 납득하고 필요할 때만 바꾼다.
 */

const CATEGORIES = [
  { id: '화장품',   desc: '스킨케어·색조·선케어',  icon: Sparkles,   bg: '#F4F0FF', fg: '#6D4CFF' },
  { id: '식품',     desc: '신선·가공식품·간편식',  icon: Package,    bg: '#FFF0F5', fg: '#FF4D8D' },
  { id: '패션',     desc: '의류·신발·가방',       icon: Shirt,      bg: '#E6F1FB', fg: '#378ADD' },
  { id: '생활',     desc: '가구·소품·청소',       icon: Sofa,       bg: '#FFF4DD', fg: '#F59E0B' },
  { id: '가전',     desc: '전자기기·주변기기',     icon: Smartphone, bg: '#E0F7F1', fg: '#1D9E75' },
  { id: '반려동물', desc: '사료·간식·용품',        icon: Dog,        bg: '#FFFBEA', fg: '#EAB308' },
  { id: '스포츠',   desc: '운동용품·아웃도어',     icon: Volleyball, bg: '#EAF3DE', fg: '#639922' },
  { id: '유아',     desc: '유아동·출산용품',      icon: Baby,       bg: '#FFF1F2', fg: '#F43F5E' },
  { id: '건강',     desc: '건기식·의료기기',      icon: HeartPulse, bg: '#EEF2FF', fg: '#4F46E5' },
  { id: '자동차',   desc: '차량용품·부품',        icon: Car,        bg: '#F1F5F9', fg: '#475569' },
  { id: '기타',     desc: '그 외 모든 상품',      icon: Box,        bg: '#F4F4F8', fg: '#64748B' },
];

/** 채널별 추천 형태와 '왜' — 용어만 던지면 셀러가 이해 못 하고 대충 고른다 */
const CHANNELS = [
  {
    id: '스마트스토어', desc: '네이버 · 검색 유입이 많아요', popular: true,
    out: 'blog' as const, tag: 'SEO 검색노출 최적화',
    why: '네이버는 이미지 속 글자를 읽지 못합니다. 카피가 본문 텍스트로 있어야 검색에 걸려요.',
    gains: ['상품명·키워드가 본문에 노출', '네이버 쇼핑검색에 유리', '글이 길어도 이탈이 적음'],
  },
  {
    id: '쿠팡', desc: '빠른 정보 전달이 중요해요',
    out: 'slide' as const, tag: '모바일 가독성 우선',
    why: '쿠팡은 모바일에서 빠르게 훑는 구매가 대부분입니다. 이미지에 핵심만 담아 한눈에 읽히게 해요.',
    gains: ['스크롤 몇 번에 핵심 전달', '작은 화면에서도 글자가 큼', '비교·전환에 강함'],
  },
  {
    id: '자사몰', desc: '브랜드 톤을 살릴 수 있어요',
    out: 'slide' as const, tag: '브랜드 무드 강조',
    why: '자사몰은 이미 브랜드를 보고 온 손님이 많습니다. 검색보다 분위기와 완성도가 중요해요.',
    gains: ['디자인 톤을 일관되게', '브랜드 감성 전달에 유리', '이미지 중심 구성'],
  },
  {
    id: '와디즈', desc: '스토리로 설득하는 곳이에요',
    out: 'blog' as const, tag: '스토리텔링 설득',
    why: '와디즈는 아직 없는 물건을 설득하는 곳입니다. 왜 만들었는지 긴 호흡의 글이 필요해요.',
    gains: ['만든 이유·과정을 길게 서술', '신뢰 근거를 차곡차곡', '서포터 설득에 유리'],
  },
];

/** ★분량 3단계(2026-08-02) — 카테고리별 제각각(12·14·16·22·28·32)이던 것을 고정한다.
 *  셀러가 기억하기 쉽고, 체험 크레딧 10개로 8섹션 블로그형 한 장이 정확히 맞아떨어진다. */
const DEPTHS = [
  { n: 8,  label: '간단하게',      hint: '상품이 단순하거나 빠르게 올려야 할 땐 8섹션으로 시작해도 충분해요.' },
  { n: 16, label: '대부분의 상품에', hint: '고민되면 이걸 고르세요. 대부분의 상품이 이 분량에서 가장 잘 나옵니다.' },
  { n: 32, label: '설명할 게 많을 때', hint: '성분·스펙·후기처럼 보여줄 게 많은 상품에 어울려요. 만드는 시간도 두 배입니다.' },
];

/** 분량 미리보기 — 종이 위에 섹션을 실제 개수만큼 쌓고, 넘치면 아래가 흐려지며 이어진다.
 *  막대 그래프는 '몇 개'만 말하지 '어떤 페이지가 나오는지'를 못 말한다. */
function SheetPreview({ n, active }: { n: number; active: boolean }) {
  const h = n <= 8 ? 13 : n <= 16 ? 9 : 6;
  return (
    <div style={{
      height: 76, background: '#fff', border: `1px solid ${active ? '#D9CDFF' : '#E9E9F0'}`,
      borderRadius: 7, padding: '6px 7px', overflow: 'hidden', marginBottom: 10,
      WebkitMaskImage: 'linear-gradient(#000 62%, transparent 100%)',
      maskImage: 'linear-gradient(#000 62%, transparent 100%)',
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {Array.from({ length: n }, (_, i) => (
          <div key={i}>
            <div style={{ height: h, background: active ? '#C4B5FD' : '#DCD4F7', borderRadius: 3 }} />
            <div style={{ height: 3, background: '#E9E9F0', borderRadius: 2, marginTop: 3 }} />
            <div style={{ height: 3, width: '62%', background: '#E9E9F0', borderRadius: 2, marginTop: 3 }} />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function StartScreen() {
  const { cat, setCat, ch, setCh, out, setOut, secCnt, setSecCnt, setType, productName, setProductName, go } = useApp();

  const [showAllCats, setShowAllCats] = useState(false);
  const [advOpen, setAdvOpen] = useState(false);

  const chIdx = Math.max(0, CHANNELS.findIndex(c => c.id === ch));
  const channel = CHANNELS[chIdx];
  const effOut = (out as 'blog' | 'slide') || channel.out;
  const depth = secCnt || 16;

  const visibleCats = showAllCats ? CATEGORIES : CATEGORIES.slice(0, 6);
  const ready = productName.trim().length > 0 && !!cat;

  /** 채널을 고르면 추천 형태도 함께 따라간다 — 셀러가 형태를 직접 건드리기 전까지는 추천을 따른다 */
  const pickChannel = (c: typeof CHANNELS[number]) => {
    setCh(c.id);
    setOut(c.out);
  };

  const start = () => {
    if (!ready) return;
    setSecCnt(depth);
    // ★type은 하위 호환용 — 분량으로 대체됐지만 기존 분기(래퍼런스형 등)가 값을 참조한다
    setType(depth >= 32 ? '프리미엄형' : '기본형');
    if (!out) setOut(channel.out);
    go('s5');
  };

  return (
    /* ★폭 1040(2026-08-02) — 760은 데스크탑에서 가운데 좁은 띠처럼 보였다.
     *  넓히기만 하면 카드가 늘어져 오히려 허전하므로, 남는 가로를 '채널↔추천'을
     *  나란히 놓는 데 쓴다. 세로 스크롤이 줄고 고른 결과를 바로 옆에서 확인하게 된다.
     *  ⚠️미디어쿼리 대신 auto-fit/minmax로 접는다 — 인라인 스타일이라 @media를 못 쓰고,
     *    창을 줄이면 한 줄로 무너지며 원래 읽는 순서(채널→추천)가 그대로 유지된다. */
    <div style={{ maxWidth: 1040, margin: '0 auto', padding: '48px 28px 110px', fontFamily: 'var(--f)' }}>
      <StepHeader
        step={STEP_MAP['s1'] ?? 1} label="시작"
        /* ★"상품명만 입력하면"이라고 쓰지 않는다(2026-08-02) — 다음 화면이 상품정보 폼이라
         *  거짓이 되고, 그 지점에서 배신감이 이탈을 만든다. "전환되는"도 쓰지 않는다 —
         *  실증할 수 없는 효과 주장(표시광고법)이고, 셀러에겐 날조하지 말라면서
         *  우리 카피가 근거 없는 성과를 말하면 앞뒤가 맞지 않는다. */
        title={<>이 상품, <span style={{ color: '#6D4CFF' }}>팔릴 준비</span> 되셨나요?</>}
        sub="상품 정보를 입력하면 카피와 이미지까지 한 번에 만들어드려요"
      />

      {/* 상품명 — 첫 화면에서 바로 자기 일을 시작하게 */}
      <div style={{
        border: `2px solid ${productName.trim() ? '#6D4CFF' : '#E5E5EC'}`, borderRadius: 16,
        padding: '19px 22px', display: 'flex', alignItems: 'center', gap: 13,
        background: productName.trim() ? '#FBFAFF' : '#fff', marginBottom: 10,
      }}>
        <span style={{ fontSize: 20 }}>🛍️</span>
        <input
          value={productName}
          onChange={e => setProductName(e.target.value)}
          placeholder="상품명을 입력해주세요"
          style={{
            border: 'none', outline: 'none', fontSize: 17.5, fontFamily: 'inherit',
            flex: 1, background: 'transparent', color: '#191F28',
          }}
        />
      </div>
      <div style={{ fontSize: 12.5, color: '#8B95A1', marginBottom: 32, paddingLeft: 3 }}>
        예) 제주 접짝뼈국 밀키트 800g · 오버핏 울 니트 가디건
      </div>

      {/* 카테고리 */}
      <Label>카테고리</Label>
      {/* minmax(150px) — 1040 폭에서 기본 6개가 정확히 한 줄, 창을 줄이면 알아서 접힌다 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10, marginBottom: showAllCats ? 28 : 11 }}>
        {visibleCats.map(c => {
          const on = cat === c.id;
          const Icon = c.icon;
          return (
            <div
              key={c.id} onClick={() => setCat(c.id)}
              style={{
                border: `${on ? 2 : 1.5}px solid ${on ? '#6D4CFF' : '#ECECF2'}`, borderRadius: 14,
                padding: '17px 11px', textAlign: 'center', cursor: 'pointer',
                background: on ? '#FBFAFF' : '#fff', transition: 'all 120ms ease',
              }}
            >
              <div style={{
                width: 40, height: 40, borderRadius: 12, background: c.bg, color: c.fg,
                display: 'grid', placeItems: 'center', margin: '0 auto 9px',
              }}><Icon size={20} /></div>
              <b style={{ display: 'block', fontSize: 14, fontWeight: 700 }}>{c.id}</b>
              <span style={{ display: 'block', fontSize: 11.5, color: '#8B95A1', marginTop: 3, lineHeight: 1.45 }}>{c.desc}</span>
            </div>
          );
        })}
      </div>
      {!showAllCats && (
        <div
          onClick={() => setShowAllCats(true)}
          style={{
            textAlign: 'center', fontSize: 13, color: '#6D4CFF', fontWeight: 700,
            padding: 11, border: '1px dashed #D9CDFF', borderRadius: 11, marginBottom: 28, cursor: 'pointer',
          }}
        >＋ 다른 카테고리 보기</div>
      )}

      {/* 채널 ↔ 추천을 나란히 — 고른 즉시 옆에서 결과가 바뀌는 게 보인다 */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(370px, 1fr))',
        gap: 20, alignItems: 'start', marginBottom: 30,
      }}>
        <div>
          <Label hint="채널에 맞는 형태를 추천해드려요">어디에 올리시나요?</Label>
          {/* 세로 한 줄 — 오른쪽 추천 카드와 높이가 맞고, 채널 설명도 잘려 보이지 않는다 */}
          <div style={{ display: 'grid', gap: 9 }}>
            {CHANNELS.map(c => {
              const on = ch === c.id;
              return (
                <div
                  key={c.id} onClick={() => pickChannel(c)}
                  style={{
                    border: `${on ? 2 : 1.5}px solid ${on ? '#6D4CFF' : '#ECECF2'}`, borderRadius: 13,
                    padding: '15px 17px', cursor: 'pointer', background: on ? '#FBFAFF' : '#fff', position: 'relative',
                  }}
                >
                  {c.popular && (
                    <span style={{
                      position: 'absolute', top: 13, right: 14, fontSize: 10.5, fontWeight: 800,
                      color: '#6D4CFF', background: '#F0ECFF', borderRadius: 999, padding: '3px 8px',
                    }}>가장 많이 써요</span>
                  )}
                  <b style={{ fontSize: 14.5 }}>{c.id}</b>
                  <span style={{ display: 'block', fontSize: 12, color: '#8B95A1', marginTop: 3 }}>{c.desc}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* 추천 — 고르라고 묻지 않고 정해서 보여준다 */}
        <div style={{ border: '1.5px solid #E6DEFF', background: '#FBFAFF', borderRadius: 16, padding: '18px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, gap: 10 }}>
          <b style={{ fontSize: 13.5, color: '#5B3FD6' }}>
            {channel.id}엔 {effOut === 'blog' ? '블로그형' : '슬라이드형'}을 추천해요
          </b>
          <span style={{
            fontSize: 11, fontWeight: 800, color: '#6D4CFF', background: '#F0ECFF',
            borderRadius: 999, padding: '3px 9px', whiteSpace: 'nowrap',
          }}>{channel.tag}</span>
        </div>
        <p style={{ fontSize: 13, lineHeight: 1.8, color: '#34343c', marginBottom: 10 }}>{channel.why}</p>
        <ul style={{ listStyle: 'none', marginBottom: 13 }}>
          {channel.gains.map(g => (
            <li key={g} style={{ fontSize: 12.5, color: '#4E5968', padding: '3px 0 3px 18px', position: 'relative' }}>
              <span style={{ position: 'absolute', left: 2, color: '#6D4CFF', fontWeight: 800 }}>✓</span>{g}
            </li>
          ))}
        </ul>
        <button
          onClick={() => setAdvOpen(v => !v)}
          style={{
            width: '100%', border: '1px solid #D9CDFF', background: '#fff', color: '#6D4CFF',
            borderRadius: 9, padding: '10px 0', fontSize: 12.5, fontWeight: 700,
            cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex',
            alignItems: 'center', justifyContent: 'center', gap: 5,
          }}
        >
          형태·분량 직접 고르기
          <ChevronDown size={14} style={{ transform: advOpen ? 'rotate(180deg)' : 'none', transition: 'transform 150ms' }} />
        </button>

        {advOpen && (
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px dashed #D9CDFF' }}>
            <Label>어떤 형태로 보여줄까요</Label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9, marginBottom: 18 }}>
              {([
                ['blog', '블로그형', '글로 설명하고 사진을 곁들여요.\n네이버 검색에 걸립니다.'],
                ['slide', '슬라이드형', '이미지에 글자를 넣어 만들어요.\n모바일에서 눈에 잘 들어옵니다.'],
              ] as const).map(([k, name, d]) => (
                <Pick key={k} on={effOut === k} onClick={() => setOut(k)}>
                  <b style={{ display: 'block', fontSize: 13, marginBottom: 3 }}>{name}</b>
                  <small style={{ display: 'block', fontSize: 11.5, color: '#8B95A1', lineHeight: 1.6, whiteSpace: 'pre-line' }}>{d}</small>
                </Pick>
              ))}
            </div>

            <Label hint={`${effOut === 'blog' ? '블로그형' : '슬라이드형'} 기준`}>얼마나 길게 만들까요</Label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 10 }}>
              {DEPTHS.map(d => {
                const on = depth === d.n;
                return (
                  <Pick key={d.n} on={on} onClick={() => setSecCnt(d.n)} center>
                    {d.n === 16 && (
                      <span style={{
                        position: 'absolute', top: -8, left: '50%', transform: 'translateX(-50%)',
                        fontSize: 10, fontWeight: 800, color: '#fff', background: '#6D4CFF',
                        borderRadius: 999, padding: '2px 9px', whiteSpace: 'nowrap',
                      }}>추천</span>
                    )}
                    <SheetPreview n={d.n} active={on} />
                    <b style={{ display: 'block', fontSize: 13.5 }}>{d.n}섹션</b>
                    <small style={{ display: 'block', fontSize: 11.5, color: '#8B95A1', lineHeight: 1.6 }}>
                      {d.label}<br />
                      <span style={{
                        display: 'inline-block', fontSize: 11.5, fontWeight: 800, color: '#6D4CFF',
                        background: '#F0ECFF', borderRadius: 999, padding: '2px 8px', marginTop: 3,
                      }}>{calculateGenerationCost({ sectionCount: d.n, out: effOut })}크레딧</span>
                    </small>
                  </Pick>
                );
              })}
            </div>
            <p style={{ fontSize: 11.5, color: '#8B95A1', lineHeight: 1.7 }}>
              {DEPTHS.find(d => d.n === depth)?.hint}
            </p>
          </div>
        )}
        </div>
      </div>

      {/* 폭이 넓어져도 버튼은 늘리지 않는다 — 1040을 가로지르는 막대는 버튼으로 안 읽힌다 */}
      <button
        onClick={start} disabled={!ready}
        style={{
          display: 'block', width: '100%', maxWidth: 460, margin: '0 auto',
          border: 'none', borderRadius: 14, padding: '17px 0',
          background: ready ? '#6D4CFF' : '#F1F1F5', color: ready ? '#fff' : '#B0B8C1',
          fontSize: 15.5, fontWeight: 700, cursor: ready ? 'pointer' : 'default', fontFamily: 'inherit',
        }}
      >
        {ready ? '상품정보 입력하러 가기 →' : '상품명과 카테고리를 정해주세요'}
      </button>
    </div>
  );
}

/* ─── 작은 조각들 ─── */
function Label({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div style={{ fontSize: 12.5, fontWeight: 800, color: '#4E5968', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
      {children}
      {hint && <span style={{ fontSize: 11, fontWeight: 600, color: '#B0B8C1' }}>{hint}</span>}
    </div>
  );
}

function Pick({ on, onClick, center, children }: {
  on: boolean; onClick: () => void; center?: boolean; children: React.ReactNode;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        border: `${on ? 2 : 1.5}px solid ${on ? '#6D4CFF' : '#ECECF2'}`, borderRadius: 13,
        padding: center ? '12px 10px' : 13, background: on ? '#FBFAFF' : '#fff',
        cursor: 'pointer', position: 'relative', textAlign: center ? 'center' : 'left',
      }}
    >{children}</div>
  );
}
