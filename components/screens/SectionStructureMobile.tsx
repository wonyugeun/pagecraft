'use client';

import { useState } from 'react';
import {
  Menu, Zap, X, Lightbulb, GripVertical, ChevronUp, ChevronDown,
  Plus, ArrowLeft, ArrowRight, Trash2,
} from 'lucide-react';
import { useApp } from '@/store/AppContext';
import { CAT_DEFAULTS, ALL_SECTIONS } from './SectionStructureScreen';

const STEPS = [
  { num: 1, label: '카테고리' },
  { num: 2, label: '채널' },
  { num: 3, label: '타입' },
  { num: 4, label: '출력형태' },
  { num: 5, label: '상품정보' },
  { num: 6, label: '레퍼런스' },
  { num: 7, label: '섹션구조' },
  { num: 8, label: '이미지' },
  { num: 9, label: '생성' },
  { num: 10, label: '결과물' },
];

export default function SectionStructureMobile() {
  const {
    cat, type, go,
    referenceAnalysis, captureAnalysis,
    setSectionStructure, setSecCnt, sectionStructure,
    toggleChat, credits,
  } = useApp();

  // 데스크탑 getInitial 로직 그대로
  const getInitial = (): string[] => {
    if (sectionStructure.length) return [...sectionStructure];
    if (referenceAnalysis?.sections?.length) return [...referenceAnalysis.sections];
    if (captureAnalysis?.섹션목록?.length) return captureAnalysis.섹션목록.map(s => s.타입);
    return (
      CAT_DEFAULTS[cat || '']?.[type || '기본형'] ??
      ['히어로', '공감', 'USP', '사용법', '비교표', '후기', 'FAQ', 'CTA']
    );
  };

  const [secs, setSecs] = useState<string[]>(getInitial);
  const [showAdd, setShowAdd] = useState(false);
  const [customInput, setCustomInput] = useState('');
  const [showTip, setShowTip] = useState(true);
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  // 데스크탑과 동일 함수
  const moveUp = (i: number) => setSecs(s => {
    if (i === 0) return s;
    const n = [...s]; [n[i - 1], n[i]] = [n[i], n[i - 1]]; return n;
  });
  const moveDown = (i: number) => setSecs(s => {
    if (i >= s.length - 1) return s;
    const n = [...s]; [n[i], n[i + 1]] = [n[i + 1], n[i]]; return n;
  });
  const remove = (i: number) => setSecs(s => s.filter((_, idx) => idx !== i));
  const addSection = (label: string) => {
    if (label && !secs.includes(label)) setSecs(s => [...s, label]);
    setShowAdd(false);
  };
  const addCustom = () => {
    const t = customInput.trim();
    if (t && !secs.includes(t)) { setSecs(s => [...s, t]); setCustomInput(''); setShowAdd(false); }
  };
  const handleConfirm = () => {
    setSectionStructure(secs);
    setSecCnt(secs.length);
    go('s6');
  };

  const fromRef = Boolean(referenceAnalysis?.sections?.length);
  const fromCapture = !fromRef && Boolean(captureAnalysis?.섹션목록?.length);
  const available = ALL_SECTIONS.filter(s => !secs.includes(s));

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
          <Menu size={24} color="#111" />
        </div>
      </header>

      {/* 2) 진행 단계 1~10 */}
      <section style={{ padding: '8px 20px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'nowrap', overflowX: 'auto' }}>
          {STEPS.map((s, i) => {
            const active = s.num === 7;
            const done = s.num < 7;
            const bg = active ? '#6D4CFF' : done ? '#DDD6FE' : '#fff';
            const fg = active ? '#fff' : done ? '#6D4CFF' : '#999';
            return (
              <div key={s.num} style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                <div style={{
                  width: 24, height: 24, borderRadius: '50%',
                  background: bg,
                  border: active || done ? 'none' : '1.5px solid #ECECF2',
                  color: fg,
                  fontSize: 11, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>{s.num}</div>
                <span style={{
                  fontSize: 11, color: active ? '#111' : done ? '#6D4CFF' : '#999',
                  fontWeight: active ? 700 : 500,
                }}>{s.label}</span>
                {i < STEPS.length - 1 && (
                  <div style={{ width: 8, height: 1, background: '#ECECF2' }} />
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 3) STEP 7/10 + 타이틀 + 일러스트 */}
      <section style={{ padding: '20px 20px 0', position: 'relative' }}>
        <span style={{
          display: 'inline-block',
          background: '#F4F0FF', color: '#6D4CFF',
          fontSize: 11, fontWeight: 700,
          borderRadius: 999, padding: '4px 12px',
        }}>STEP 7 / 10</span>
        <h1 style={{
          margin: '12px 0 0',
          fontSize: 26, fontWeight: 800, color: '#111',
          letterSpacing: '-0.03em', lineHeight: 1.25,
        }}>섹션 구조를<br />확인해주세요</h1>
        <p style={{ margin: '12px 0 0', fontSize: 13, color: '#666', lineHeight: 1.6 }}>
          {fromRef ? '레퍼런스 분석 기반으로 설계됐어요' : fromCapture ? '캡처 분석 기반으로 설계됐어요' : '카테고리 맞춤 기본 구조예요'}<br />
          순서 변경 · 추가 · 삭제가 가능해요
        </p>
        <div style={{
          position: 'absolute', right: 16, top: 16,
          width: 110, height: 130, borderRadius: 16,
          background: 'rgba(244,240,255,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 44,
        }}>📋</div>
        <div style={{
          position: 'absolute', right: 24, top: 110,
          width: 28, height: 28, borderRadius: '50%',
          background: '#6D4CFF',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ color: '#fff', fontSize: 14, fontWeight: 800 }}>✓</span>
        </div>
      </section>

      {/* 4) 안내 박스 */}
      {showTip && (
        <section style={{ padding: '20px 20px 0' }}>
          <div style={{
            background: '#F7F6FB', borderRadius: 14,
            padding: '12px 14px',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <Lightbulb size={16} color="#6D4CFF" />
            <span style={{ flex: 1, fontSize: 12.5, color: '#111' }}>
              화살표로 순서를 변경할 수 있어요
            </span>
            <button onClick={() => setShowTip(false)} style={{
              background: 'none', border: 'none',
              cursor: 'pointer', padding: 0, color: '#999',
            }}>
              <X size={16} />
            </button>
          </div>
        </section>
      )}

      {/* 5) 섹션 리스트 */}
      <section style={{ padding: '14px 20px 0' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {secs.map((sec, i) => {
            const isActive = activeIdx === i;
            return (
              <div key={`${sec}-${i}`} style={{
                background: '#fff', border: '1px solid #ECECF2',
                borderRadius: 14, padding: '14px 16px',
                display: 'flex', alignItems: 'center', gap: 12,
              }}>
                <div style={{
                  width: 24, height: 24, borderRadius: '50%',
                  background: '#6D4CFF', color: '#fff',
                  fontSize: 12, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>{i + 1}</div>
                <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: '#111' }}>
                  {sec}
                </span>
                {isActive ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <button
                      onClick={() => moveUp(i)}
                      disabled={i === 0}
                      style={{
                        width: 26, height: 26, borderRadius: 6,
                        background: '#F4F0FF', border: 'none',
                        cursor: i === 0 ? 'not-allowed' : 'pointer',
                        opacity: i === 0 ? 0.3 : 1,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      <ChevronUp size={14} color="#6D4CFF" />
                    </button>
                    <button
                      onClick={() => moveDown(i)}
                      disabled={i === secs.length - 1}
                      style={{
                        width: 26, height: 26, borderRadius: 6,
                        background: '#F4F0FF', border: 'none',
                        cursor: i === secs.length - 1 ? 'not-allowed' : 'pointer',
                        opacity: i === secs.length - 1 ? 0.3 : 1,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      <ChevronDown size={14} color="#6D4CFF" />
                    </button>
                    <button
                      onClick={() => { remove(i); setActiveIdx(null); }}
                      style={{
                        width: 26, height: 26, borderRadius: 6,
                        background: '#FEE2E2', border: 'none',
                        cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      <Trash2 size={13} color="#EF4444" />
                    </button>
                    <button
                      onClick={() => setActiveIdx(null)}
                      style={{
                        width: 26, height: 26, borderRadius: 6,
                        background: 'none', border: 'none',
                        cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      <X size={14} color="#999" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setActiveIdx(i)}
                    style={{
                      background: 'none', border: 'none',
                      cursor: 'pointer', padding: 0,
                    }}
                  >
                    <GripVertical size={18} color="#D9D9E3" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 6) + 섹션 추가 */}
      <section style={{ padding: '12px 20px 0' }}>
        <button
          onClick={() => setShowAdd(p => !p)}
          style={{
            width: '100%',
            background: '#fff',
            border: '1.5px dashed #D9D9E3',
            borderRadius: 14, padding: '14px',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            cursor: 'pointer', fontFamily: 'inherit',
            color: '#6D4CFF',
            fontSize: 13, fontWeight: 700,
          }}
        >
          {showAdd ? <><X size={14} /> 닫기</> : <><Plus size={14} /> 섹션 추가</>}
        </button>
      </section>

      {/* 7) 섹션 추가 패널 — 데스크탑과 동일 데이터 ALL_SECTIONS */}
      {showAdd && (
        <section style={{ padding: '10px 20px 0' }}>
          <div style={{
            background: '#fff', border: '1px solid #ECECF2',
            borderRadius: 14, padding: 14,
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#999', marginBottom: 10 }}>
              클릭해서 추가하세요
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
              {available.map(s => (
                <button
                  key={s}
                  onClick={() => addSection(s)}
                  style={{
                    padding: '5px 10px', borderRadius: 999,
                    border: '1px solid #ECECF2', background: '#fff',
                    fontSize: 11.5, color: '#111', cursor: 'pointer',
                    fontFamily: 'inherit', fontWeight: 500,
                  }}
                >{s}</button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <input
                value={customInput}
                onChange={e => setCustomInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addCustom()}
                placeholder="직접 입력 (예: 특허 기술 소개)"
                style={{
                  flex: 1,
                  background: '#F7F6FB', border: 'none',
                  borderRadius: 10, padding: '10px 12px',
                  fontSize: 12.5, color: '#111',
                  outline: 'none', fontFamily: 'inherit',
                }}
              />
              <button
                onClick={addCustom}
                disabled={!customInput.trim()}
                style={{
                  background: customInput.trim() ? '#6D4CFF' : '#D9D9E3',
                  color: '#fff', border: 'none',
                  fontSize: 12, fontWeight: 700,
                  borderRadius: 10, padding: '0 14px',
                  cursor: customInput.trim() ? 'pointer' : 'not-allowed',
                  fontFamily: 'inherit', flexShrink: 0,
                }}
              >추가</button>
            </div>
          </div>
        </section>
      )}

      {/* 8) 하단 버튼 */}
      <nav style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: '#fff', borderTop: '1px solid #ECECF2',
        padding: '14px 20px',
        display: 'flex', gap: 10,
        zIndex: 100,
      }}>
        <button onClick={() => go('s5-5')} style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          background: '#fff', border: '1.5px solid #ECECF2',
          color: '#111',
          fontSize: 14, fontWeight: 700,
          borderRadius: 14, padding: '14px 22px',
          cursor: 'pointer', fontFamily: 'inherit',
          flexShrink: 0,
        }}>
          <ArrowLeft size={16} /> 이전
        </button>
        <button
          onClick={handleConfirm}
          disabled={secs.length < 2}
          style={{
            flex: 1,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            background: secs.length < 2 ? '#D9D9E3' : '#6D4CFF',
            color: '#fff', border: 'none',
            fontSize: 15, fontWeight: 700,
            borderRadius: 14, padding: '14px',
            cursor: secs.length < 2 ? 'not-allowed' : 'pointer',
            fontFamily: 'inherit',
            boxShadow: secs.length < 2 ? 'none' : '0 8px 20px rgba(109,76,255,0.3)',
          }}
        >
          이 구조로 다음 단계로 <ArrowRight size={16} />
        </button>
      </nav>

    </div>
  );
}
