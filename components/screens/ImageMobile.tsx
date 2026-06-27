'use client';

import { useState, useRef } from 'react';
import {
  Menu, Zap, UploadCloud, Sparkles, ChevronDown, Lightbulb,
  Image as ImageIcon, Sun, Palette, FileText, X,
  ArrowLeft, ArrowRight,
} from 'lucide-react';
import { useApp } from '@/store/AppContext';

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

const GUIDES = [
  { Icon: ImageIcon, title: '고해상도 사용',    desc: '가로 2000px 이상 권장' },
  { Icon: Sun,       title: '배경은 깔끔하게',  desc: '흰색·단색 배경이 좋아요' },
  { Icon: Palette,   title: '일관된 톤 유지',   desc: '제품과 어울리는 톤으로' },
  { Icon: FileText,  title: '파일 형식',        desc: 'PNG·JPG, 10MB 이하' },
];

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

export default function ImageMobile() {
  const {
    setProductImages, go,
    sectionStructure,
    toggleChat, credits,
  } = useApp();

  // 데스크탑과 동일 state
  const [preview, setPreview] = useState<string | null>(null);
  const [briefOpen, setBriefOpen] = useState(false);
  const [dropHover, setDropHover] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const nukkiRef = useRef<HTMLInputElement>(null);

  const secCount = sectionStructure.length > 0 ? sectionStructure.length : 9;

  const goPrev = () => go('s5b');
  const goNext = () => go('s7');

  // 데스크탑과 동일 핸들러
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      alert('이미지 크기는 10MB 이하여야 합니다.');
      return;
    }
    try {
      const dataUrl = await fileToBase64(file);
      setPreview(dataUrl);
      setProductImages([dataUrl]);
    } catch (err) {
      console.error('[ImageMobile] 이미지 업로드 실패:', err);
    }
  };

  const handleNukkiUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    console.log('[handleNukkiUpload] 누끼 처리 대상 파일:', file.name);
    alert('누끼컷 생성 기능은 곧 추가됩니다.');
  };

  const removePreview = () => { setPreview(null); setProductImages([]); };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDropHover(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { alert('이미지 크기는 10MB 이하여야 합니다.'); return; }
    try {
      const dataUrl = await fileToBase64(file);
      setPreview(dataUrl);
      setProductImages([dataUrl]);
    } catch (err) {
      console.error('[ImageMobile] drop 실패:', err);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', background: '#FAFAFC',
      fontFamily: 'Pretendard, sans-serif',
      paddingBottom: 124,
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
            const active = s.num === 8;
            const done = s.num < 8;
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

      {/* 3) STEP 8/10 + 타이틀 */}
      <section style={{ padding: '20px 20px 0' }}>
        <span style={{
          display: 'inline-block',
          background: '#F4F0FF', color: '#6D4CFF',
          fontSize: 11, fontWeight: 700,
          borderRadius: 999, padding: '4px 12px',
        }}>STEP 8 / 10</span>
        <h1 style={{
          margin: '12px 0 0',
          fontSize: 24, fontWeight: 800, color: '#111',
          letterSpacing: '-0.03em', lineHeight: 1.25,
        }}>제품 사진 한 장만 주세요</h1>
        <p style={{ margin: '12px 0 0', fontSize: 13, color: '#666', lineHeight: 1.6 }}>
          누끼컷(흰 배경 정면)을 기준으로<br />
          AI가 <span style={{ color: '#6D4CFF', fontWeight: 700 }}>{secCount}개 섹션</span>에 필요한 이미지를 전부 만들어요.
        </p>
      </section>

      {/* 4) 업로드 드롭존 */}
      <section style={{ padding: '20px 20px 0' }}>
        {preview ? (
          <div style={{ position: 'relative' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="업로드 미리보기"
              style={{
                width: '100%', borderRadius: 20,
                aspectRatio: '4/3', objectFit: 'cover',
                background: '#fff', border: '1px solid #ECECF2',
              }}
            />
            <button onClick={removePreview} style={{
              position: 'absolute', top: 10, right: 10,
              background: 'rgba(0,0,0,0.6)', color: '#fff',
              border: 'none', borderRadius: '50%',
              width: 28, height: 28,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
            }}><X size={14} /></button>
          </div>
        ) : (
          <div
            onClick={() => fileRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDropHover(true); }}
            onDragLeave={() => setDropHover(false)}
            onDrop={handleDrop}
            style={{
              background: dropHover ? '#F4F0FF' : '#fff',
              border: `2px dashed ${dropHover ? '#6D4CFF' : '#DDD6FE'}`,
              borderRadius: 20,
              padding: '50px 20px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18,
              cursor: 'pointer',
              transition: 'background .15s, border-color .15s',
            }}
          >
            <div style={{
              width: 60, height: 60, borderRadius: '50%',
              background: '#F4F0FF',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <UploadCloud size={28} color="#6D4CFF" />
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#111' }}>
                클릭하거나 드래그해서 업로드
              </div>
              <div style={{ marginTop: 6, fontSize: 12, color: '#999' }}>
                PNG, JPG · 최대 10MB
              </div>
            </div>
          </div>
        )}
        <input ref={fileRef} type="file" accept="image/*" onChange={handleUpload}
          style={{ display: 'none' }} />
      </section>

      {/* 5) 이미지 가이드 */}
      <section style={{ padding: '20px 20px 0' }}>
        <div style={{
          background: '#fff', border: '1.5px solid #ECECF2',
          borderRadius: 18, padding: 16,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14 }}>
            <Lightbulb size={16} color="#6D4CFF" />
            <span style={{ fontSize: 14, fontWeight: 700, color: '#111' }}>이미지 가이드</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {GUIDES.map(({ Icon, title, desc }) => (
              <div key={title} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: '#F4F0FF', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon size={18} color="#6D4CFF" />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: '#111' }}>{title}</div>
                  <div style={{ marginTop: 2, fontSize: 11.5, color: '#666' }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6) 누끼컷 만들기 안내 */}
      <section style={{ padding: '12px 20px 0' }}>
        <div style={{
          background: '#fff', border: '1.5px solid #ECECF2',
          borderRadius: 18, padding: 16,
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: '#F4F0FF', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Sparkles size={20} color="#6D4CFF" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#111' }}>누끼컷이 없으세요?</div>
            <div style={{ marginTop: 4, fontSize: 11.5, color: '#666', lineHeight: 1.4 }}>
              배경 있는 제품 사진을 올리면 AI가<br />누끼를 따드려요
            </div>
          </div>
          <button
            onClick={() => nukkiRef.current?.click()}
            style={{
              flexShrink: 0,
              background: '#fff', border: '1.5px solid #6D4CFF',
              color: '#6D4CFF',
              fontSize: 12, fontWeight: 700,
              borderRadius: 10, padding: '10px 14px',
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            누끼컷 만들기
          </button>
          <input ref={nukkiRef} type="file" accept="image/*" onChange={handleNukkiUpload}
            style={{ display: 'none' }} />
        </div>
      </section>

      {/* 7) 어떤 이미지가 만들어지나요? 토글 */}
      <section style={{ padding: '12px 20px 0' }}>
        <div style={{
          background: '#fff', border: '1.5px solid #ECECF2',
          borderRadius: 18, padding: '14px 16px',
          overflow: 'hidden',
        }}>
          <div
            onClick={() => setBriefOpen(p => !p)}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              cursor: 'pointer',
            }}
          >
            <span style={{ fontSize: 13.5, fontWeight: 700, color: '#111' }}>
              어떤 이미지가 만들어지나요?
            </span>
            <ChevronDown size={16} color="#999"
              style={{
                transform: briefOpen ? 'rotate(180deg)' : 'none',
                transition: 'transform .2s',
              }}
            />
          </div>
          {briefOpen && (
            <div style={{
              marginTop: 12, paddingTop: 12,
              borderTop: '1px solid #F4F4F7',
              fontSize: 12, color: '#666', lineHeight: 1.7,
            }}>
              제공해주신 한 장의 누끼컷을 기준으로 AI가 섹션별로 필요한 이미지를 자동 생성합니다. 메인 후킹, 성분 클로즈업, 사용 장면, 비교, 후기 등 결과물 단계에서 각 섹션 옆에 함께 만들어져요.
            </div>
          )}
        </div>
      </section>

      {/* 8) 하단 버튼 */}
      <nav style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: '#fff', borderTop: '1px solid #ECECF2',
        padding: '14px 20px 18px',
        display: 'flex', flexDirection: 'column', gap: 6,
        zIndex: 100,
      }}>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={goPrev} style={{
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
          <button onClick={goNext} style={{
            flex: 1,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            background: '#6D4CFF', color: '#fff',
            border: 'none',
            fontSize: 15, fontWeight: 700,
            borderRadius: 14, padding: '14px',
            cursor: 'pointer', fontFamily: 'inherit',
            boxShadow: '0 8px 20px rgba(109,76,255,0.3)',
          }}>
            다음 단계로 <ArrowRight size={16} />
          </button>
        </div>
        <div style={{
          textAlign: 'center', fontSize: 11, color: '#999', marginTop: 2,
        }}>
          사진이 없어도 괜찮아요 — AI가 제품 정보로 알아서 생성해요
        </div>
      </nav>

    </div>
  );
}
