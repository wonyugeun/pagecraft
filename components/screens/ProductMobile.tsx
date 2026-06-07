'use client';

import { useState } from 'react';
import {
  Menu, Zap, Sparkles, ChevronUp, ChevronDown,
  ShieldCheck, TrendingUp, Search,
  ArrowLeft, ArrowRight,
} from 'lucide-react';
import { useApp } from '@/store/AppContext';
import {
  CQ, SECTION_MAP, SECTION_DEFS, QuestionField,
} from './ProductScreen';

const STEPS = [
  { num: 1, label: '카테고리' },
  { num: 2, label: '채널' },
  { num: 3, label: '타입' },
  { num: 4, label: '출력형태' },
  { num: 5, label: '상품정보' },
  { num: 6, label: '' },
];

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
    cat, ch, go,
    productName, setProductName, setProductExtra,
    regularPrice, salePrice, showPrice,
    productOptions,
    toggleChat, credits,
  } = useApp();

  // 데스크탑과 동일 state
  const [brand, setBrand] = useState('');
  const [diff, setDiff] = useState('');
  const [extraNote, setExtraNote] = useState('');
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [openSecs, setOpenSecs] = useState<Set<string>>(new Set(['s1']));
  const [brandIntro, setBrandIntro] = useState('');
  const [aiSelections] = useState<string[]>([]);
  const [fastMode, setFastMode] = useState(false);

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
  const pct = requiredQs.length > 0
    ? Math.round(((filledReq.length + (productName.trim() ? 1 : 0)) / (requiredQs.length + 1)) * 100)
    : productName.trim() ? 100 : 0;

  // visibleSections — s4는 항상 표시, 나머지는 질문이 있을 때만
  const visibleSections = SECTION_DEFS.filter(sec => {
    const sQs = getSectionQs(sec.id);
    return sQs.length > 0 || sec.id === 's4';
  });

  // handleNext — 데스크탑과 동일 로직
  const handleNext = () => {
    if (!productName.trim()) {
      alert('상품명을 입력해주세요.');
      return;
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
    if (aiSelections.length)       lines.push(`AI 추천 키워드: ${aiSelections.join(', ')}`);
    setProductExtra(lines.join('\n'));
    go('s5-5');
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
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: '#6D4CFF', color: '#fff',
            fontSize: 18, fontWeight: 800,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>P</div>
          <span style={{ fontSize: 18, fontWeight: 700, color: '#111' }}>PageCraft</span>
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
          <Menu size={24} color="#111" />
        </div>
      </header>

      {/* 2) 진행 단계 */}
      <section style={{ padding: '8px 20px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'nowrap', overflowX: 'auto' }}>
          {STEPS.map((s, i) => {
            const active = s.num === 5;
            const done = s.num < 5;
            const bg = active ? '#6D4CFF' : done ? '#DDD6FE' : '#fff';
            const fg = active ? '#fff' : done ? '#6D4CFF' : '#999';
            return (
              <div key={s.num} style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                <div style={{
                  width: 26, height: 26, borderRadius: '50%',
                  background: bg,
                  border: active || done ? 'none' : '1.5px solid #ECECF2',
                  color: fg,
                  fontSize: 12, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>{s.num}</div>
                {s.label && (
                  <span style={{
                    fontSize: 12, color: active ? '#111' : done ? '#6D4CFF' : '#999',
                    fontWeight: active ? 700 : 500,
                  }}>{s.label}</span>
                )}
                {i < STEPS.length - 1 && (
                  <div style={{ width: 12, height: 1, background: '#ECECF2' }} />
                )}
              </div>
            );
          })}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            <div style={{
              width: 26, height: 26, borderRadius: '50%',
              background: '#fff', border: '1.5px solid #ECECF2',
              color: '#999', fontSize: 12, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>10</div>
            <span style={{ fontSize: 12, color: '#999', fontWeight: 500 }}>결과물</span>
          </div>
        </div>
      </section>

      {/* 3) STEP 5/10 + 타이틀 */}
      <section style={{ padding: '20px 20px 0', position: 'relative' }}>
        <span style={{
          display: 'inline-block',
          background: '#F4F0FF', color: '#6D4CFF',
          fontSize: 11, fontWeight: 700,
          borderRadius: 999, padding: '4px 12px',
        }}>STEP 5 / 10</span>
        <h1 style={{
          margin: '12px 0 0',
          fontSize: 26, fontWeight: 800, color: '#111',
          letterSpacing: '-0.03em', lineHeight: 1.25,
        }}>상품 정보를<br />입력해 주세요</h1>
        <p style={{ margin: '12px 0 0', fontSize: 13, color: '#666', lineHeight: 1.6 }}>
          입력하신 정보를 바탕으로<br />AI가 최적의 상세페이지를 제작합니다.
        </p>
        <div style={{
          position: 'absolute', right: 16, top: 16,
          width: 120, height: 110, borderRadius: 16,
          background: 'rgba(244,240,255,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 44,
        }}>📝</div>
      </section>

      {/* 4) 빠른 생성 모드 */}
      <section style={{ padding: '24px 20px 0' }}>
        <div style={{
          background: '#FFFBEB',
          borderRadius: 16, padding: 16,
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: '#FEF3C7', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Zap size={18} color="#F59E0B" fill="#F59E0B" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: '#111' }}>빠른 생성 모드</div>
            <div style={{ marginTop: 2, fontSize: 11.5, color: '#666' }}>
              상품명만 입력하면 AI가 추천 정보를 채워드려요.
            </div>
          </div>
          <button onClick={() => setFastMode(p => !p)} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: '#fff', border: '1px solid #ECECF2',
            fontSize: 12, fontWeight: 700, color: '#111',
            borderRadius: 999, padding: '6px 10px',
            cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0,
          }}>
            사용하기
            <div style={{
              width: 28, height: 16, borderRadius: 999,
              background: fastMode ? '#6D4CFF' : '#D9D9E3',
              position: 'relative', transition: 'background .15s',
            }}>
              <div style={{
                position: 'absolute', top: 2,
                left: fastMode ? 14 : 2,
                width: 12, height: 12, borderRadius: '50%',
                background: '#fff', transition: 'left .15s',
              }} />
            </div>
          </button>
        </div>
      </section>

      {/* 5) 완성도 카드 */}
      <section style={{ padding: '14px 20px 0' }}>
        <div style={{
          background: '#fff', border: '1.5px solid #ECECF2',
          borderRadius: 18, padding: 16,
          display: 'flex', alignItems: 'center', gap: 14,
        }}>
          <CompletionRing pct={pct} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, color: '#666' }}>상세페이지 완성도</div>
            <div style={{ marginTop: 2, fontSize: 16, fontWeight: 800, color: '#6D4CFF' }}>
              {pct >= 80 ? '매우 좋아요!' : pct >= 50 ? '좋아요!' : '조금 더 입력해 주세요'}
            </div>
            <div style={{ marginTop: 6, display: 'flex', gap: 10 }}>
              {[
                { Icon: ShieldCheck, label: '신뢰도\n향상', val: '+23%' },
                { Icon: TrendingUp,  label: '전환율\n향상', val: '+18%' },
                { Icon: Search,      label: '검색 노출\n향상', val: '+15%' },
              ].map(({ Icon, label, val }) => (
                <div key={label} style={{
                  flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                }}>
                  <Icon size={16} color="#6D4CFF" />
                  <div style={{ fontSize: 9.5, color: '#666', textAlign: 'center', whiteSpace: 'pre-line', lineHeight: 1.3 }}>{label}</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#6D4CFF' }}>{val}</div>
                </div>
              ))}
            </div>
          </div>
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
          disabled={!productName.trim()}
          style={{
            flex: 1,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            background: productName.trim() ? '#6D4CFF' : '#D9D9E3',
            color: '#fff', border: 'none',
            fontSize: 15, fontWeight: 700,
            borderRadius: 14, padding: '14px',
            cursor: productName.trim() ? 'pointer' : 'not-allowed',
            fontFamily: 'inherit',
            boxShadow: productName.trim() ? '0 8px 20px rgba(109,76,255,0.3)' : 'none',
          }}
        >
          다음 단계로 <ArrowRight size={16} />
        </button>
      </nav>

    </div>
  );
}
