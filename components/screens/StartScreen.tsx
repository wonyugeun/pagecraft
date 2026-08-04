'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Sparkles, Package, Shirt, Sofa, Smartphone, Dog, Volleyball, Baby, HeartPulse, Car, Box, ChevronDown, Check } from 'lucide-react';
import { useApp, STEP_MAP } from '@/store/AppContext';
import { useIsMobile } from '@/hooks/useIsMobile';
import { calculateGenerationCost } from '@/lib/pricing';
import { guessCategory } from '@/lib/categoryGuess';
import StepHeader from '@/components/layout/StepHeader';
import SamplePreviewModal from '@/components/SamplePreviewModal';

/**
 * 시작 화면 — 카테고리·채널·형태·분량을 한 화면에서(2026-08-02).
 *
 * ★왜 합쳤나: 앞 네 화면(s1~s3b)이 전부 '고르기'만 해서, 셀러 입장에선 네 번을 눌러도
 *   "아직 아무것도 안 했다"는 느낌이었다. 단계마다 이탈도 생긴다.
 *   후커블이 빨라 보이는 건 화면 수가 적어서가 아니라 바로 타이핑을 시작하기 때문이다.
 *   → 상품명 입력을 맨 위로 올려 첫 화면부터 자기 일을 시작하게 한다.
 *
 * ★단 상품정보 폼(s5)은 합치지 않는다. 구조화된 입력이 "셀러가 말한 것만 쓴다"의 근거이고,
 *   화장품법 고지·알레르기 같은 법적 필수 항목의 누락도 폼이라야 감지한다.
 *
 * ★접어두기(2026-08-02): 형태·분량은 채널에서 따라 나오는 값이라 기본으로 접는다.
 *   추천을 그대로 쓸 사람은 아무것도 열지 않고 버튼 하나로 끝난다.
 *   ⚠️단 접힌 줄에 '고른 값'이 반드시 보여야 한다 — 안 보이면 쿠팡 셀러가 모르고 지나쳐
 *     블로그형으로 크레딧을 쓴다. 접기의 안전장치는 요약값이지 설명이 아니다.
 *
 * ⚠️이 화면에 '전환율 +32%', '신뢰도 92%', 채널 별점 같은 숫자를 넣지 말 것.
 *   실증 자료가 없어 표시광고법에 걸리고, 셀러에겐 없는 사실을 쓰지 말라면서
 *   우리 화면이 지어낸 숫자로 신뢰를 만들면 제품의 전제가 무너진다.
 *   여기 있는 건 전부 확인 가능한 것뿐이다 — 사용 비중('가장 많이 써요'), 네이버 검색 동작, 크레딧 계산값.
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

  const isMobile = useIsMobile();
  const [showAllCats, setShowAllCats] = useState(false);
  const [sample, setSample] = useState<'blog' | 'slide' | null>(null);
  /** 채널만 기본으로 연다 — 우리가 추측할 수 없는 유일한 값이고, 여기서 형태가 갈린다 */
  const [open, setOpen] = useState<Record<string, boolean>>({ ch: true });
  const toggle = (k: string) => setOpen(o => ({ ...o, [k]: !o[k] }));

  const chIdx = Math.max(0, CHANNELS.findIndex(c => c.id === ch));
  const channel = CHANNELS[chIdx];
  const effOut = (out as 'blog' | 'slide') || channel.out;
  /* ★제시한 셋 중 하나로 맞춘다(2026-08-02) — 섹션구조 화면은 실제 구성 개수를 secCnt에 쓴다.
   *  거기서 10섹션이 된 뒤 시작 화면으로 돌아오면 '10섹션·13크레딧'처럼 고를 수 없는 값이 뜬다.
   *  화면에 없는 선택지를 값으로 보여주면 셀러는 자기가 고른 적 없는 크레딧을 보게 된다.
   *  ⚠️표시만 바꾸면 버튼의 크레딧과 실제 차감이 어긋난다 — 상태까지 같이 맞춘다. */
  const depth = DEPTHS.reduce((best, d) =>
    Math.abs(d.n - secCnt) < Math.abs(best - secCnt) ? d.n : best, DEPTHS[1].n);
  useEffect(() => { if (secCnt !== depth) setSecCnt(depth); }, [secCnt, depth, setSecCnt]);
  const cost = calculateGenerationCost({ sectionCount: depth, out: effOut });

  /* ★상품명으로 카테고리를 골라둔다(2026-08-02) — 셀러는 자기 상품을 안다.
   *  분류를 고르는 건 우리 편의지 셀러의 일이 아니다.
   *  ⚠️사람이 고른 값은 절대 덮어쓰지 않는다. 우리가 넣어둔 값(autoRef)일 때만 갱신한다 —
   *    안 그러면 상품명을 고치는 순간 셀러가 직접 고른 카테고리가 사라진다. */
  const guess = useMemo(() => guessCategory(productName), [productName]);
  const autoRef = useRef<string | null>(null);
  useEffect(() => {
    if (!guess || guess === cat) return;
    if (cat && cat !== autoRef.current) return;   // 사람이 고른 값 — 건드리지 않는다
    autoRef.current = guess;
    setCat(guess);
  }, [guess, cat, setCat]);
  const autoPicked = !!cat && cat === autoRef.current;

  const pickCat = (id: string) => { autoRef.current = null; setCat(id); };

  /* 고른 카테고리가 접힌 뒤쪽(스포츠·유아·건강·자동차·기타)이면 목록에 끌어올린다 —
     추측이 맞았는데 화면에 안 보이면 셀러는 틀렸다고 여긴다 */
  const head = CATEGORIES.slice(0, 6);
  const visibleCats = showAllCats
    ? CATEGORIES
    : (cat && !head.some(c => c.id === cat)
        ? [...head.slice(0, 5), ...CATEGORIES.filter(c => c.id === cat)]
        : head);

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
    /* ★모바일 대응(2026-08-04) — 이 화면엔 모바일 변형이 없어서 폰으로 들어오면
       980px 데스크탑 레이아웃이 그대로 눌려 나왔다(기존 CategoryScreen엔 CategoryMobile이 있었다).
       별도 화면을 또 만들면 두 벌이 갈라지므로(오늘만 세 번 겪었다) 한 벌로 좁은 폭까지 받는다. */
    <div style={{ maxWidth: 980, margin: '0 auto', padding: isMobile ? '20px 16px 96px' : '46px 28px 110px', fontFamily: 'var(--f)' }}>
      <StepHeader
        step={STEP_MAP['s1'] ?? 1} label="시작"
        /* ★"상품명만 입력하면"이라고 쓰지 않는다(2026-08-02) — 다음 화면이 상품정보 폼이라
         *  거짓이 되고, 그 지점에서 배신감이 이탈을 만든다. "전환되는"도 쓰지 않는다 —
         *  실증할 수 없는 효과 주장(표시광고법)이고, 셀러에겐 날조하지 말라면서
         *  우리 카피가 근거 없는 성과를 말하면 앞뒤가 맞지 않는다. */
        title={<>이 상품, <span style={{ color: '#6D4CFF' }}>팔릴 준비</span> 되셨나요?</>}
        sub="상품 정보를 입력하면 카피와 이미지까지 한 번에 만들어드려요"
      />

      {/* 형태 예시 — 상품정보 화면 우측의 작은 미리보기를 여기로 옮겼다.
          고르기 전에 제대로 보는 게 맞고, 정보 입력 중에 곁눈질할 것은 아니다. */}
      <div style={{ textAlign: 'center', margin: '-14px 0 26px' }}>
        <button
          onClick={() => setSample(effOut)}
          style={{
            border: '1px solid #E5E5EC', background: '#fff', color: '#4E5968',
            borderRadius: 999, padding: '8px 16px', fontSize: 12.5, fontWeight: 700,
            cursor: 'pointer', fontFamily: 'inherit',
          }}
        >실제로 만든 예시 보기</button>
      </div>

      {/* 상품명 — 첫 화면에서 바로 자기 일을 시작하게 */}
      <div style={{
        border: `2px solid ${productName.trim() ? '#6D4CFF' : '#E5E5EC'}`, borderRadius: 16,
        padding: isMobile ? '15px 16px' : '19px 22px', display: 'flex', alignItems: 'center', gap: isMobile ? 10 : 13,
        background: productName.trim() ? '#FBFAFF' : '#fff', marginBottom: 10,
      }}>
        <span style={{ fontSize: 20 }}>🛍️</span>
        <input
          value={productName}
          onChange={e => setProductName(e.target.value)}
          placeholder="상품명을 입력해주세요"
          style={{
            border: 'none', outline: 'none', fontSize: isMobile ? 16 : 17.5, fontFamily: 'inherit',
            flex: 1, background: 'transparent', color: '#191F28',
          }}
        />
      </div>
      <div style={{ fontSize: 12.5, color: '#8B95A1', marginBottom: 26, paddingLeft: 3 }}>
        예) 제주 접짝뼈국 밀키트 800g · 오버핏 울 니트 가디건
      </div>

      {/* 01 카테고리 — 접지 않는다. 우리가 채워줄 수 없는 값이라 비어 있으면 시작을 못 한다 */}
      <Fold no="01" title="카테고리" value={cat || undefined} fixed>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(3, 1fr)' : 'repeat(auto-fill, minmax(135px, 1fr))', gap: isMobile ? 7 : 10, marginBottom: 11 }}>
          {visibleCats.map(c => {
            const on = cat === c.id;
            const Icon = c.icon;
            return (
              <div
                key={c.id} onClick={() => pickCat(c.id)}
                style={{
                  border: `${on ? 2 : 1.5}px solid ${on ? '#6D4CFF' : '#ECECF2'}`, borderRadius: 14,
                  padding: '16px 10px', textAlign: 'center', cursor: 'pointer',
                  background: on ? '#FBFAFF' : '#fff', transition: 'all 120ms ease',
                }}
              >
                <div style={{
                  width: 38, height: 38, borderRadius: 12, background: c.bg, color: c.fg,
                  display: 'grid', placeItems: 'center', margin: '0 auto 8px',
                }}><Icon size={19} /></div>
                <b style={{ display: 'block', fontSize: 13.5, fontWeight: 700 }}>{c.id}</b>
                <span style={{ display: 'block', fontSize: 11, color: '#8B95A1', marginTop: 3, lineHeight: 1.45 }}>{c.desc}</span>
              </div>
            );
          })}
        </div>
        {autoPicked && (
          <p style={{ fontSize: 12, color: '#8B95A1', margin: '0 0 11px', paddingLeft: 3 }}>
            상품명을 보고 <b style={{ color: '#6D4CFF', fontWeight: 700 }}>{cat}</b>으로 골라뒀어요 · 아니면 다시 눌러주세요
          </p>
        )}
        {!showAllCats && (
          <div
            onClick={() => setShowAllCats(true)}
            style={{
              textAlign: 'center', fontSize: 12.5, color: '#6D4CFF', fontWeight: 700,
              padding: 10, border: '1px dashed #D9CDFF', borderRadius: 11, cursor: 'pointer',
            }}
          >＋ 다른 카테고리 보기</div>
        )}
      </Fold>

      {/* 02 채널 — 기본으로 열어둔다 */}
      <Fold
        no="02" title="어디에 올리시나요?" value={channel.id}
        open={!!open.ch} onToggle={() => toggle('ch')}
      >
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fit, minmax(180px, 1fr))', gap: isMobile ? 8 : 10, marginBottom: 12 }}>
          {CHANNELS.map(c => {
            const on = channel.id === c.id;
            return (
              <div
                key={c.id} onClick={() => pickChannel(c)}
                style={{
                  border: `${on ? 2 : 1.5}px solid ${on ? '#6D4CFF' : '#ECECF2'}`, borderRadius: 13,
                  padding: '15px 15px 14px', cursor: 'pointer',
                  background: on ? '#FBFAFF' : '#fff', position: 'relative',
                }}
              >
                {c.popular && (
                  <span style={{
                    position: 'absolute', top: -8, right: 12, fontSize: 10.5, fontWeight: 800,
                    color: '#fff', background: '#6D4CFF', borderRadius: 999, padding: '2px 9px',
                  }}>가장 많이 써요</span>
                )}
                <b style={{ fontSize: 14 }}>{c.id}</b>
                <span style={{ display: 'block', fontSize: 11.5, color: '#8B95A1', marginTop: 3, lineHeight: 1.5 }}>{c.desc}</span>
              </div>
            );
          })}
        </div>
        <Note>{channel.why}</Note>
      </Fold>

      {/* 03 형태 — 채널에서 따라 나오는 값이라 접어둔다 */}
      <Fold
        no="03" title="어떤 형태로 보여줄까요"
        value={<>{effOut === 'blog' ? '블로그형' : '슬라이드형'}{effOut === channel.out && <Tag>추천</Tag>}</>}
        open={!!open.out} onToggle={() => toggle('out')}
      >
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(280px, 1fr))', gap: 10, marginBottom: 12 }}>
          {([
            ['blog', '블로그형', '글로 설명하고 사진을 곁들여요.\n네이버 검색에 걸립니다.'],
            ['slide', '슬라이드형', '이미지에 글자를 넣어 만들어요.\n모바일에서 눈에 잘 들어옵니다.'],
          ] as const).map(([k, name, d]) => (
            <Pick key={k} on={effOut === k} onClick={() => setOut(k)}>
              <b style={{ display: 'block', fontSize: 13.5, marginBottom: 4 }}>
                {name}{channel.out === k && <Tag>{channel.id} 추천</Tag>}
              </b>
              <small style={{ display: 'block', fontSize: 12, color: '#8B95A1', lineHeight: 1.65, whiteSpace: 'pre-line' }}>{d}</small>
              <span
                onClick={e => { e.stopPropagation(); setSample(k); }}
                style={{ display: 'inline-block', marginTop: 9, fontSize: 12, fontWeight: 700, color: '#6D4CFF', textDecoration: 'underline', cursor: 'pointer' }}
              >예시 보기</span>
            </Pick>
          ))}
        </div>
        {effOut === channel.out ? (
          <ul style={{ listStyle: 'none' }}>
            {channel.gains.map(g => (
              <li key={g} style={{ fontSize: 12.5, color: '#4E5968', padding: '3px 0 3px 20px', position: 'relative' }}>
                <Check size={13} color="#6D4CFF" style={{ position: 'absolute', left: 1, top: 5 }} />{g}
              </li>
            ))}
          </ul>
        ) : (
          <Note>{channel.id}에는 {channel.out === 'blog' ? '블로그형' : '슬라이드형'}을 추천드려요. {channel.why}</Note>
        )}
      </Fold>

      {/* 04 분량 */}
      <Fold
        no="04" title="얼마나 길게 만들까요"
        value={<>{depth}섹션 <span style={{ color: '#B0B8C1', fontWeight: 600 }}>·</span> {cost}크레딧</>}
        open={!!open.len} onToggle={() => toggle('len')}
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: isMobile ? 7 : 10, marginBottom: 12, paddingTop: 8 }}>
          {DEPTHS.map(d => {
            const on = depth === d.n;
            return (
              <Pick key={d.n} on={on} onClick={() => setSecCnt(d.n)} center>
                {d.n === 16 && (
                  <span style={{
                    position: 'absolute', top: -8, left: '50%', transform: 'translateX(-50%)',
                    fontSize: 10.5, fontWeight: 800, color: '#fff', background: '#6D4CFF',
                    borderRadius: 999, padding: '2px 10px', whiteSpace: 'nowrap',
                  }}>추천</span>
                )}
                <SheetPreview n={d.n} active={on} />
                <b style={{ display: 'block', fontSize: 14 }}>{d.n}섹션</b>
                <small style={{ display: 'block', fontSize: 11.5, color: '#8B95A1', lineHeight: 1.6 }}>
                  {d.label}<br />
                  <span style={{
                    display: 'inline-block', fontSize: 11.5, fontWeight: 800, color: '#6D4CFF',
                    background: '#F0ECFF', borderRadius: 999, padding: '2px 9px', marginTop: 4,
                  }}>{calculateGenerationCost({ sectionCount: d.n, out: effOut })}크레딧</span>
                </small>
              </Pick>
            );
          })}
        </div>
        <Note>{DEPTHS.find(d => d.n === depth)?.hint}</Note>
      </Fold>

      {/* 접힌 값이 버튼에도 한 번 더 — 여기가 크레딧을 쓰기 직전 마지막 확인 지점이다 */}
      <button
        onClick={start} disabled={!ready}
        style={{
          display: 'block', width: '100%', maxWidth: 520, margin: '30px auto 0',
          border: 'none', borderRadius: 14, padding: '17px 0',
          background: ready ? '#6D4CFF' : '#F1F1F5', color: ready ? '#fff' : '#B0B8C1',
          fontSize: 15.5, fontWeight: 700, cursor: ready ? 'pointer' : 'default', fontFamily: 'inherit',
        }}
      >
        {ready ? `이 설정으로 만들기 · ${cost}크레딧 →` : '상품명과 카테고리를 정해주세요'}
      </button>
      <p style={{ textAlign: 'center', fontSize: 12, color: '#B0B8C1', marginTop: 11 }}>
        크레딧은 만들기를 누를 때 차감돼요
      </p>

      {sample && <SamplePreviewModal tab={sample} onTab={setSample} onClose={() => setSample(null)} />}
    </div>
  );
}

/* ─── 작은 조각들 ─── */

/** 접히는 한 줄. ⚠️접힌 상태에서도 value가 보여야 한다 — 요약값이 접기의 안전장치다. */
function Fold({ no, title, value, open, onToggle, fixed, children }: {
  no: string; title: string; value?: React.ReactNode;
  open?: boolean; onToggle?: () => void; fixed?: boolean; children: React.ReactNode;
}) {
  const isOpen = fixed ? true : !!open;
  return (
    <div style={{
      border: `1.5px solid ${isOpen ? '#E6DEFF' : '#ECECF2'}`, borderRadius: 16,
      background: '#fff', marginBottom: 12, overflow: 'hidden',
    }}>
      <div
        onClick={fixed ? undefined : onToggle}
        style={{
          display: 'flex', alignItems: 'center', gap: 11, padding: '15px 16px',
          cursor: fixed ? 'default' : 'pointer', userSelect: 'none',
        }}
      >
        <span style={{ fontSize: 11.5, fontWeight: 800, color: '#C3C8D0', letterSpacing: '0.06em' }}>{no}</span>
        <b style={{ fontSize: 14.5, color: '#191F28' }}>{title}</b>
        <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          {value && (
            <span style={{ fontSize: 13.5, fontWeight: 700, color: '#6D4CFF', display: 'inline-flex', alignItems: 'center' }}>
              {value}
            </span>
          )}
          {!fixed && (
            <ChevronDown
              size={17} color="#B0B8C1"
              style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 150ms' }}
            />
          )}
        </span>
      </div>
      {isOpen && <div style={{ padding: '2px 16px 18px' }}>{children}</div>}
    </div>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      fontSize: 12.5, lineHeight: 1.75, color: '#4E5968',
      background: '#F7F6FD', borderRadius: 10, padding: '11px 14px',
    }}>{children}</p>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      fontSize: 10.5, fontWeight: 800, color: '#6D4CFF', background: '#F0ECFF',
      borderRadius: 999, padding: '2px 8px', marginLeft: 6, verticalAlign: 'middle',
    }}>{children}</span>
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
        padding: center ? '13px 11px' : 14, background: on ? '#FBFAFF' : '#fff',
        cursor: 'pointer', position: 'relative', textAlign: center ? 'center' : 'left',
      }}
    >{children}</div>
  );
}
