'use client';

import { useState } from 'react';
import {
  Zap, Sparkles, ChevronUp, ChevronDown,
  ArrowLeft, ArrowRight,
} from 'lucide-react';
import { useApp, STEP_MAP, TOTAL_STEPS } from '@/store/AppContext';
import MobileStepRail from '@/components/layout/MobileStepRail';
import { pickTestPreset } from '@/lib/testPresets';
import { PRODUCT_FORM_OPTIONS, PRODUCT_VOLUME_SUGGESTIONS, PRODUCT_SHAPE_OPTIONS } from '@/lib/productPhysicalSize';
import {
  CQ, SECTION_MAP, SECTION_DEFS, QuestionField,
} from './ProductScreen';

function CompletionRing({ pct }: { pct: number }) {
  const R = 36, C = 2 * Math.PI * R;
  const off = C - (C * pct) / 100;
  return (
    <svg width={84} height={84} viewBox="0 0 84 84">
      <circle cx={42} cy={42} r={R} stroke="#F4F0FF" strokeWidth={8} fill="none" />
      <circle cx={42} cy={42} r={R} stroke="#6D4CFF" strokeWidth={8} fill="none"
        strokeLinecap="round"
        strokeDasharray={C} strokeDashoffset={off}
        transform="rotate(-90 42 42)" />
      <text x={42} y={47} textAnchor="middle"
        fontSize={20} fontWeight={800} fill="#6D4CFF" fontFamily="Pretendard">
        {pct}<tspan fontSize={11}>%</tspan>
      </text>
    </svg>
  );
}

export default function ProductMobile() {
  const {
    cat, ch, out, secCnt, go,
    productName, setProductName, setProductExtra,
    regularPrice, salePrice, showPrice,
    setRegularPrice, setSalePrice, setShowPrice,
    productOptions, setProductOptions,
    brand, setBrand, diff, setDiff, extraNote, setExtraNote,
    brandIntro, setBrandIntro, reviews, setReviews,
    productForm, setProductForm, productVolume, setProductVolume, productShapeProfile, setProductShapeProfile,
    answers, setAnswers,
    toggleChat, credits,
  } = useApp();

  // 폼 입력값은 store로 승격(useApp) — 데스크탑과 같은 store 공유, 화면 전환 시에도 유지
  // UI 일시 상태만 로컬 유지
  const [openSecs, setOpenSecs] = useState<Set<string>>(new Set(['s1']));
  const [agreed, setAgreed] = useState(false);   // ①실측·검증 동의(생성 전 법적 방어선)

  // 데스크탑과 동일 헬퍼
  const qs = CQ[cat ?? '기타'] ?? CQ['기타'];
  const isGaejeon = cat === '가전';
  const getSectionQs = (sectionId: string) => {
    const catMap = SECTION_MAP[cat ?? '기타'] ?? {};
    const qIds = (catMap[sectionId] ?? []) as string[];
    return qs.filter(q => qIds.includes(q.id));
  };
  const countSection = (sectionId: string): string => {
    const sectionQs = getSectionQs(sectionId);
    const total = sectionQs.reduce((s, q) => s + (q.opts?.length ?? 0), 0);
    const sel = sectionQs.reduce((s, q) => {
      const v = answers[q.id];
      return s + (Array.isArray(v) ? v.length : v ? 1 : 0);
    }, 0);
    return total > 0 ? `선택 ${sel}/${total}` : '선택';
  };
  const setAnswer = (qid: string, val: string | string[]) =>
    setAnswers(prev => ({ ...prev, [qid]: val }));
  const toggleSec = (id: string) =>
    setOpenSecs(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });

  // 완성도 계산 — 데스크탑과 동일 패턴
  const requiredQs = qs.filter(q => q.req);
  const filledReq = requiredQs.filter(q => {
    const v = answers[q.id];
    return Array.isArray(v) ? v.length > 0 : !!v;
  });
  const missingReq = requiredQs.filter(q => !filledReq.includes(q));
  const pct = requiredQs.length > 0
    ? Math.round(((filledReq.length + (productName.trim() ? 1 : 0)) / (requiredQs.length + 1)) * 100)
    : productName.trim() ? 100 : 0;
  const pctColor = pct >= 80 ? '#16A34A' : pct >= 40 ? '#6D4CFF' : '#9CA3AF';
  const pctMsg = pct >= 80 ? '거의 다 됐어요!' : pct >= 40 ? '잘 하고 있어요!' : '조금 더 입력해 주세요';

  // visibleSections — s4는 항상 표시, 나머지는 질문이 있을 때만
  const visibleSections = SECTION_DEFS.filter(sec => {
    const sQs = getSectionQs(sec.id);
    return sQs.length > 0 || sec.id === 's4';
  });

  // ── 개발용 테스트 데이터 채우기 (dev 전용 — 버튼도 dev 게이트로만 렌더) ──
  const isDev = process.env.NODE_ENV === 'development';
  const fillTestData = () => {
    const p = pickTestPreset(cat);
    setProductName(p.productName);
    setBrand(p.brand);
    setDiff(p.diff);
    setBrandIntro(p.brandIntro);
    setExtraNote(p.extraNote);
    setReviews(p.reviews);
    setProductForm(p.productForm ?? '');           // Physical Size Engine 입력(프리셋에 없으면 미지정)
    setProductVolume(p.productVolume ?? '');
    setProductShapeProfile(p.productShapeProfile ?? '');
    setRegularPrice(p.regularPrice);
    setSalePrice(p.salePrice);
    setShowPrice(p.showPrice);
    setProductOptions(p.productOptions);
    setAnswers(p.answers);
    setAgreed(true);
  };

  // handleNext — 데스크탑과 동일 로직
  const handleNext = () => {
    if (!productName.trim()) {
      alert('상품명을 입력해주세요.');
      return;
    }
    if (!agreed) {
      alert('입력 정보가 실측·검증된 사실임을 확인(동의)해 주세요.');
      return;
    }
    // ★법적/안전 게이트(데스크탑과 동일): block=하드 차단, warn=확인 후 진행
    const gateFilled = (q: typeof qs[number]) => {
      const v = answers[q.id];
      if (q.mode === 'legal') {
        return typeof v === 'string' && v.split(' / ').some(p => (p.split(': ')[1] ?? '').trim().length > 0);
      }
      return Array.isArray(v) ? v.length > 0 : !!(v && String(v).trim());
    };
    const missBlock = qs.filter(q => q.gate === 'block' && !gateFilled(q));
    if (missBlock.length) {
      alert(`법적 필수 정보를 입력해 주세요(미입력 시 진행 불가):\n· ${missBlock.map(q => q.label).join('\n· ')}`);
      return;
    }
    const missWarn = qs.filter(q => q.gate === 'warn' && !gateFilled(q));
    if (missWarn.length) {
      const ok = window.confirm(`다음 안전·법적 관련 정보를 입력하지 않았습니다:\n· ${missWarn.map(q => q.label).join('\n· ')}\n\n표시광고법·안전 관련 정보입니다. 그래도 진행할까요?`);
      if (!ok) return;
    }
    const lines: string[] = [];
    if (brand.trim()) lines.push(`브랜드명: ${brand.trim()}`);
    if (regularPrice || salePrice) {
      if (regularPrice) lines.push(`정가: ${Number(regularPrice).toLocaleString()}원`);
      if (salePrice)    lines.push(`판매가: ${Number(salePrice).toLocaleString()}원`);
      if (regularPrice && salePrice && Number(regularPrice) > Number(salePrice)) {
        const discount = Math.round((1 - Number(salePrice) / Number(regularPrice)) * 100);
        lines.push(`할인율: ${discount}%`);
      }
      lines.push(`가격 표시 여부: ${showPrice ? '상세페이지에 표시' : '표시 안 함'}`);
    }
    qs.forEach(q => {
      const val = answers[q.id];
      if (!val || (Array.isArray(val) && val.length === 0) || val === '') return;
      const str = Array.isArray(val) ? val.join(', ') : String(val).trim();
      if (str) lines.push(`[${q.label}]: ${str}`);
    });
    const validOptions = productOptions.filter(o => o.name.trim() && o.values.trim());
    if (validOptions.length) {
      lines.push(`옵션: ${validOptions.map(o => `${o.name.trim()}(${o.values.trim()})`).join(' / ')}`);
    }
    if (!isGaejeon && diff.trim()) lines.push(`경쟁 차별점: ${diff.trim()}`);
    if (extraNote.trim())          lines.push(`기타 요청사항: ${extraNote.trim()}`);
    if (brandIntro.trim())         lines.push(`브랜드 소개: ${brandIntro.trim()}`);
    // 고객 후기 — "고객 후기:" 라벨로 넣어 factScrub sellerHasReviews 확실히 true + 후기 섹션 재료
    if (reviews.trim())            lines.push(`고객 후기: ${reviews.trim()}`);
    setProductExtra(lines.join('\n'));
    // ★래퍼런스 독립 단계 폐지(2026-07-22) — 상품정보 다음은 곧장 섹션구조(데스크탑 동일)
    go('s5b');
  };

  const prevScreen = ch === '스마트스토어' ? 's3b' : 's3';

  return (
    <div style={{
      minHeight: '100vh', background: '#FAFAFC',
      fontFamily: 'Pretendard, sans-serif',
      paddingBottom: 100,
    }}>

      {/* 1) 헤더 */}
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 20px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <img src="/images/logo-flik.png" alt="Flik" style={{ height: 30, width: "auto", objectFit: "contain", display: "block" }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button onClick={toggleChat} style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            background: '#fff', border: '1px solid #ECECF2', borderRadius: 999,
            padding: '6px 10px', fontSize: 12, fontWeight: 600, color: '#111',
            cursor: 'pointer', fontFamily: 'inherit',
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22C55E' }} />
            AI 도우미
          </button>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            background: '#FEF3C7', border: '1px solid #FDE68A', borderRadius: 999,
            padding: '6px 10px', fontSize: 12, fontWeight: 700, color: '#111',
          }}>
            <Zap size={12} color="#F59E0B" fill="#F59E0B" /> {credits}
          </div>
        </div>
      </header>

      {/* 2) 진행 단계 */}
      <section style={{ padding: '8px 20px 0' }}>
        <MobileStepRail screen="s5" />
      </section>

      {/* 3) STEP 배지 + 타이틀 */}
      <section style={{ padding: '20px 20px 0', position: 'relative' }}>
        <span style={{
          display: 'inline-block',
          background: '#F4F0FF', color: '#6D4CFF',
          fontSize: 11, fontWeight: 700,
          borderRadius: 999, padding: '4px 12px',
        }}>STEP {STEP_MAP['s5'] ?? 5} / {TOTAL_STEPS}</span>
        <h1 style={{
          margin: '12px 0 0',
          fontSize: 26, fontWeight: 800, color: '#111',
          letterSpacing: '-0.03em', lineHeight: 1.25,
        /* ★데스크탑과 같은 문구로 맞춘다(2026-08-04) — 같은 화면인데 기기마다 다른 말을 하면
           같은 제품으로 안 읽힌다. 지어내지 않는다는 건 셀러에겐 제약이기 전에 보호다. */
        }}>적어주신 만큼<br />좋아집니다</h1>
        <p style={{ margin: '12px 0 0', fontSize: 13, color: '#666', lineHeight: 1.6 }}>
          Flik은 있는 사실로만 씁니다. 지어낸 수치나 후기를<br />
          만들어 넣지 않으니 안심하고 쓰실 수 있고,<br />
          대신 적어주신 정보가 곧 페이지의 재료가 돼요.
        </p>
        <div style={{
          position: 'absolute', right: 16, top: 16,
          width: 120, height: 110, borderRadius: 16,
          background: 'rgba(244,240,255,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 44,
        }}>📝</div>
      </section>

      {/* ★개발 전용 — 테스트 데이터 채우기 (프로덕션 빌드에선 NODE_ENV 게이트로 렌더 안 됨) */}
      {isDev && (
        <section style={{ padding: '16px 20px 0' }}>
          <button
            type="button"
            onClick={fillTestData}
            style={{
              width: '100%', padding: '11px 14px', borderRadius: 10,
              border: '1px dashed #F59E0B', background: '#FFFBEB', color: '#92400E',
              fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            🧪 [DEV] 테스트 데이터 채우기 — {pickTestPreset(cat).label}
          </button>
        </section>
      )}

      {/* ⚠️ 법적 경고 — 입력 정보는 그대로 반영, 책임은 판매자 (안내 UI만, 입력 처리 불변) */}
      <section style={{ padding: '16px 20px 0' }}>
        <div style={{
          display: 'flex', gap: 9, alignItems: 'flex-start',
          background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 10, padding: '12px 13px',
        }}>
          <span style={{ fontSize: 14, lineHeight: 1.5, flexShrink: 0 }}>⚠️</span>
          <div style={{ fontSize: 12, lineHeight: 1.6, color: '#92400E' }}>
            <b style={{ fontWeight: 700 }}>검증된 정보만 입력해 주세요.</b><br />
            입력하신 수치·효능·인증은 그대로 페이지에 반영됩니다. 근거 없는 표현은 표시광고법 위반이 될 수 있으니,
            시험성적서나 실측값으로 확인 가능한 내용만 적어주세요. 이에 대한 책임은 판매자에게 있습니다.
          </div>
        </div>
      </section>

      {/* 빠른 생성 모드 토글 제거 — 기능 0인 죽은 토글이었음 */}

      {/* 5) 완성도 카드 — 원형 + 가로 진행바(진행에 따라 색 변화). 경고와 간격 확보(top 24) */}
      <section style={{ padding: '24px 20px 0' }}>
        {/* ★카드는 세로, 링+요약만 가로(2026-08-04) — 전엔 카드 자체가 가로 flex라
            아래에 블록을 하나 더 넣자 그게 같은 줄의 flex 아이템이 되어 폭이 0에 가깝게 눌렸다
            ('상세페이지 완성도'가 한 글자씩 세로로 쪼개졌다). */}
        <div style={{
          background: '#fff', border: '1.5px solid #ECECF2',
          borderRadius: 18, padding: 16,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <CompletionRing pct={pct} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: '#111' }}>상세페이지 완성도</span>
              <span style={{ fontSize: 17, fontWeight: 800, color: pctColor, letterSpacing: '-0.02em' }}>{pct}%</span>
            </div>
            <div style={{ marginTop: 3, fontSize: 11.5, color: '#9CA3AF' }}>{pctMsg}</div>
            {/* ★시작 화면에서 정한 값(2026-08-04) — 카테고리는 질문 구성을 통째로 바꾸는데 흔적이 없었다 */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 8 }}>
              {[cat, ch, out === 'blog' ? '블로그형' : '슬라이드형', `${secCnt}섹션`].filter(Boolean).map((v, i) => (
                <span key={i} style={{
                  fontSize: 10.5, fontWeight: 700, color: '#6B7684', background: '#fff',
                  border: '1px solid #E9E7F3', borderRadius: 999, padding: '2px 8px',
                }}>{v}</span>
              ))}
            </div>
            <div style={{ marginTop: 9, height: 7, borderRadius: 999, background: '#EEEDF5', overflow: 'hidden' }}>
              <div style={{ width: `${pct}%`, height: '100%', borderRadius: 999, background: pctColor, transition: 'width .3s ease, background .3s ease' }} />
            </div>
          </div>
          </div>
          {/* ★비워둔 칸이 결과에서 무엇이 되는지 지금 보여준다(2026-08-04, 데스크탑과 동일).
            *  퍼센트는 '얼마나 남았나'만 말하지 '무엇이 빠지나'를 말하지 못한다.
            *  ⚠️'더 좋아집니다'류로 바꾸지 말 것 — 근거를 댈 수 없는 성과 약속이 된다. */}
          {missingReq.length > 0 && (
            <div style={{ marginTop: 12, paddingTop: 11, borderTop: '1px dashed #E2DDF3' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#191F28', marginBottom: 7 }}>
                지금 이대로 만들면 <span style={{ color: '#D97706' }}>{missingReq.length}가지</span>가 빠집니다
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 7 }}>
                {missingReq.slice(0, 6).map(q => (
                  <span key={q.id} style={{
                    fontSize: 11, fontWeight: 600, color: '#92400E', background: '#FFFBEB',
                    border: '1px solid #FDE68A', borderRadius: 999, padding: '3px 9px',
                  }}>{q.label}</span>
                ))}
                {missingReq.length > 6 && (
                  <span style={{ fontSize: 11, color: '#9CA3AF', padding: '3px 2px' }}>외 {missingReq.length - 6}가지</span>
                )}
              </div>
              <p style={{ fontSize: 11, lineHeight: 1.6, color: '#8B95A1' }}>
                빈 칸은 지어내지 않고 그대로 뺍니다. 적게 적을수록 어느 상품에나 해당되는 뻔한 페이지가 나와요.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* 6) 섹션 1: 기본 정보 (상품명 + 브랜드명) */}
      <section style={{ padding: '14px 20px 0' }}>
        <div style={{
          background: '#fff', border: '1.5px solid #ECECF2',
          borderRadius: 18, padding: 16,
        }}>
          <div
            onClick={() => toggleSec('s1')}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
            }}
          >
            <div style={{
              width: 24, height: 24, borderRadius: '50%',
              background: '#6D4CFF', color: '#fff',
              fontSize: 12, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>1</div>
            <span style={{ flex: 1, fontSize: 14.5, fontWeight: 700, color: '#111' }}>
              기본 정보
            </span>
            <span style={{
              fontSize: 10, fontWeight: 700, color: '#EC4899',
              background: '#FCE7F3', borderRadius: 999, padding: '2px 8px',
            }}>필수</span>
            {openSecs.has('s1')
              ? <ChevronUp size={16} color="#999" />
              : <ChevronDown size={16} color="#999" />}
          </div>
          {openSecs.has('s1') && (
            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#111' }}>
                상품명 <span style={{ color: '#EC4899' }}>*</span>
              </div>
              <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                <div style={{ flex: 1, position: 'relative' }}>
                  <input
                    value={productName}
                    onChange={e => setProductName(e.target.value)}
                    placeholder="하루 균형 종합 비타민 200ml"
                    style={{
                      width: '100%',
                      background: '#F7F6FB', border: 'none',
                      borderRadius: 12, padding: '12px 56px 12px 14px',
                      fontSize: 13, color: '#111',
                      outline: 'none', fontFamily: 'inherit',
                    }}
                  />
                  <span style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    fontSize: 10.5, color: '#999',
                  }}>{productName.length} / 100자</span>
                </div>
                <button style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  background: '#F4F0FF', border: 'none',
                  color: '#6D4CFF',
                  fontSize: 11, fontWeight: 700,
                  borderRadius: 12, padding: '0 12px',
                  cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0,
                }}>
                  <Sparkles size={11} /> AI 추천
                </button>
              </div>
              <div style={{ marginTop: 14, fontSize: 12, fontWeight: 700, color: '#111' }}>
                브랜드명
              </div>
              <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                <div style={{ flex: 1, position: 'relative' }}>
                  <input
                    value={brand}
                    onChange={e => setBrand(e.target.value)}
                    placeholder="데일리바이"
                    style={{
                      width: '100%',
                      background: '#F7F6FB', border: 'none',
                      borderRadius: 12, padding: '12px 50px 12px 14px',
                      fontSize: 13, color: '#111',
                      outline: 'none', fontFamily: 'inherit',
                    }}
                  />
                  <span style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    fontSize: 10.5, color: '#999',
                  }}>{brand.length} / 50자</span>
                </div>
                <button style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  background: '#F4F0FF', border: 'none',
                  color: '#6D4CFF',
                  fontSize: 11, fontWeight: 700,
                  borderRadius: 12, padding: '0 12px',
                  cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0,
                }}>
                  <Sparkles size={11} /> AI 추천
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 7) 섹션 s2~s8 — 데스크탑 QuestionField 그대로 사용 */}
      <section style={{ padding: '10px 20px 0' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {visibleSections.map((sec, idx) => {
            const num = idx + 2;
            const sectionQs = getSectionQs(sec.id);
            const hasChips = sectionQs.some(q => q.opts && q.opts.length > 0);
            const badge = hasChips ? countSection(sec.id) : '선택';
            const isOpen = openSecs.has(sec.id);
            const isS4 = sec.id === 's4';

            return (
              <div
                key={sec.id}
                style={{
                  background: '#fff', border: '1.5px solid #ECECF2',
                  borderRadius: 14, padding: '14px 16px',
                  overflow: 'hidden',
                }}
              >
                <div
                  onClick={() => toggleSec(sec.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
                  }}
                >
                  <div style={{
                    width: 22, height: 22, borderRadius: '50%',
                    background: '#D9D9E3', color: '#fff',
                    fontSize: 11, fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>{num}</div>
                  <span style={{ flex: 1, fontSize: 13.5, fontWeight: 700, color: '#111' }}>
                    {sec.title}
                  </span>
                  <span style={{ fontSize: 11, color: '#999' }}>{badge}</span>
                  {isOpen
                    ? <ChevronUp size={16} color="#999" />
                    : <ChevronDown size={16} color="#999" />}
                </div>

                {isOpen && (
                  <div style={{
                    marginTop: 14, paddingTop: 14,
                    borderTop: '1px solid #F4F4F7',
                  }}>
                    {sectionQs.length > 0
                      ? sectionQs.map(q => (
                          <QuestionField
                            key={q.id}
                            q={q}
                            answer={answers[q.id] ?? (q.mode === 'single' || q.mode === 'multi' ? [] : '')}
                            onAnswer={val => setAnswer(q.id, val)}
                          />
                        ))
                      : isS4 && (
                          <div className="fg">
                            <div className="fl">브랜드/제품 한 줄 소개 <span className="fopt">선택</span></div>
                            <textarea
                              className="finp"
                              value={brandIntro}
                              onChange={e => setBrandIntro(e.target.value)}
                              placeholder="브랜드/제품을 한 줄로 소개해 주세요 (선택)"
                              rows={2}
                            />
                          </div>
                        )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 제품 형태·용량 (선택) — Physical Size Engine 입력(이미지 실물 크기 정확도) */}
      <section style={{ padding: '20px 20px 0' }}>
        <div style={{ display: 'flex', gap: 10 }}>
          <div className="fg" style={{ flex: 1 }}>
            <div className="fl">제품 형태 <span className="fopt">선택</span></div>
            <select className="finp" value={productForm} onChange={e => setProductForm(e.target.value)} style={{ height: 44 }}>
              <option value="">선택 안 함</option>
              {PRODUCT_FORM_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div className="fg" style={{ flex: 1 }}>
            <div className="fl">제품 용량 <span className="fopt">선택</span></div>
            {/* 자유 입력 + 제안 — ml/L 외 정·캡슐·포·g 단위 입력 가능(데스크톱과 동일) */}
            <input className="finp" list="volume-suggestions-m" value={productVolume}
              onChange={e => setProductVolume(e.target.value)}
              placeholder="예: 250ml, 90정, 400g" style={{ height: 44 }} />
            <datalist id="volume-suggestions-m">
              {PRODUCT_VOLUME_SUGGESTIONS.map(v => <option key={v} value={v} />)}
            </datalist>
          </div>
        </div>
        <div className="fg" style={{ marginTop: 10 }}>
          <div className="fl">제품 형태 프로필 <span className="fopt">선택</span></div>
          <select className="finp" value={productShapeProfile} onChange={e => setProductShapeProfile(e.target.value)} style={{ height: 44 }}>
            <option value="">자동 (형태 기준)</option>
            {PRODUCT_SHAPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div className="fhint" style={{ marginTop: 6, fontSize: 11.5, color: '#666' }}>
          형태·용량을 알려주면 AI가 제품을 실물 크기 비율로 그립니다. 프로필은 실루엣(길쭉/넓적/단지형)을 보정합니다.
        </div>
      </section>

      {/* 고객 후기 (선택) — 실제 후기만. 있으면 후기 섹션에 표시, 없으면 미래형 시나리오로 대체 */}
      <section style={{ padding: '20px 20px 0' }}>
        <div className="fg">
          <div className="fl">고객 후기 <span className="fopt">선택</span></div>
          <textarea
            className="finp"
            value={reviews}
            onChange={e => setReviews(e.target.value)}
            placeholder={'스토어의 실제 고객 후기를 붙여넣으세요 (여러 개 가능)'}
            rows={3}
          />
          <div className="fhint" style={{ marginTop: 6, fontSize: 11.5, color: '#666', lineHeight: 1.5 }}>
            실제 후기만 입력하세요 — 가짜 후기·별점은 표시광고법 위반. 비워두면 미래형 기대 시나리오로 자동 대체됩니다.
          </div>
        </div>
      </section>

      {/* ①실측·검증 동의 — 생성 전 법적 방어선(체크 안 하면 진행 불가) */}
      <section style={{ padding: '20px 20px 0' }}>
        <label style={{
          display: 'flex', alignItems: 'flex-start', gap: 9,
          padding: '13px 14px', borderRadius: 14,
          background: agreed ? '#F0FDF4' : '#FFFBEB',
          border: `1px solid ${agreed ? '#BBF7D0' : '#FDE68A'}`,
        }}>
          <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)}
            style={{ width: 18, height: 18, marginTop: 1, accentColor: '#6D4CFF', flexShrink: 0 }} />
          <span style={{ fontSize: 12, lineHeight: 1.6, color: agreed ? '#166534' : '#92400E' }}>
            입력한 정보가 <b>실제 제품과 일치하는 정확한 정보</b>임을 확인합니다. <span style={{ color: '#9CA3AF', fontWeight: 600 }}>(필수)</span>
          </span>
        </label>
      </section>

      {/* 8) 하단 버튼 */}
      <nav style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: '#fff', borderTop: '1px solid #ECECF2',
        padding: '14px 20px',
        display: 'flex', gap: 10,
        zIndex: 100,
      }}>
        <button onClick={() => go(prevScreen as 's3' | 's3b')} style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          background: '#fff', border: '1.5px solid #ECECF2',
          color: '#111',
          fontSize: 14, fontWeight: 700,
          borderRadius: 14, padding: '14px 22px',
          cursor: 'pointer', fontFamily: 'inherit',
          flexShrink: 0,
        }}>
          <ArrowLeft size={16} /> 이전 단계
        </button>
        <button
          onClick={handleNext}
          disabled={!productName.trim() || !agreed}
          style={{
            flex: 1,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            background: (productName.trim() && agreed) ? '#6D4CFF' : '#D9D9E3',
            color: '#fff', border: 'none',
            fontSize: 15, fontWeight: 700,
            borderRadius: 14, padding: '14px',
            cursor: (productName.trim() && agreed) ? 'pointer' : 'not-allowed',
            fontFamily: 'inherit',
            boxShadow: (productName.trim() && agreed) ? '0 8px 20px rgba(109,76,255,0.3)' : 'none',
          }}
        >
          다음 단계로 <ArrowRight size={16} />
        </button>
      </nav>

    </div>
  );
}
