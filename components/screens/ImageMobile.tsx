'use client';

import { useState, useRef, useEffect } from 'react';
import { classifyCutArchetype } from '@/lib/sectionArchetype';
import {
  Zap, UploadCloud, Sparkles, ChevronDown, Lightbulb,
  Image as ImageIcon, Sun, Palette, FileText, X,
  ArrowLeft, ArrowRight,
} from 'lucide-react';
import { compressUpload } from '@/lib/imageCompress';
import { useApp, STEP_MAP, TOTAL_STEPS } from '@/store/AppContext';
import MobileStepRail from '@/components/layout/MobileStepRail';

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

/** 컷 종류 라벨 — 데스크탑(ImageScreen)과 같은 분류·같은 말 */
const CUT_LABEL_M: Record<string, string> = {
  hero: '대표컷', empathy: '상황컷', in_use: '사용·착용컷', ingredient_macro: '원료 클로즈업',
  texture: '제형·사용 장면', clinical: '근거·비교컷', editorial: '브랜드 무드컷',
  product_only: '제품 단독컷', cta: '마무리 구매컷', open: '상품에 맞춰',
};

export default function ImageMobile() {
  /* ★다운로드 정책 사전 고지(2026-08-01) — 데스크탑(ImageScreen)과 동일. 이탈은 '속았다'에서 온다. */
  const [showDownloadNote, setShowDownloadNote] = useState(false);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch('/api/entitlements');
        if (!res.ok) return;
        const d = await res.json() as { canDownload?: boolean };
        if (!cancelled) setShowDownloadNote(d.canDownload === false);
      } catch { /* 조회 실패 시 표시하지 않는다 */ }
    })();
    return () => { cancelled = true; };
  }, []);

  const {
    setProductImages, go,
    sectionStructure,
    toggleChat, credits,
    packagingRefImage, setPackagingRefImage,
  } = useApp();

  // 데스크탑과 동일 state
  const [preview, setPreview] = useState<string | null>(null);
  // 보조컷(선택, 최대 2) — 내용물·질감 실물 레퍼런스(데스크탑과 동일 패턴)
  const [auxPreviews, setAuxPreviews] = useState<string[]>([]);
  const [briefOpen, setBriefOpen] = useState(false);
  const [dropHover, setDropHover] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const auxFileRef = useRef<HTMLInputElement>(null);
  const packFileRef = useRef<HTMLInputElement>(null);

  const MAX_AUX = 3;   // ★데스크탑과 동일(2026-08-04) — 서버 상한 4장(대표1+보조3)
  const syncImages = (main: string | null, aux: string[]) =>
    setProductImages(main ? [main, ...aux] : []);

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
      const dataUrl = await compressUpload(await fileToBase64(file));   // ★413 방지: 업로드 즉시 압축(1280px/0.82)
      setPreview(dataUrl);
      syncImages(dataUrl, auxPreviews);
    } catch (err) {
      console.error('[ImageMobile] 이미지 업로드 실패:', err);
    }
  };

  /* ★한 번에 여러 장(2026-08-04) — 한 장씩 눌러 올리게 하면 3장에 클릭이 여섯 번이다.
     남은 자리만큼만 받고, 넘치면 앞에서부터 채운 뒤 몇 장이 남았는지 알린다. */
  const handleAuxUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? []);
    e.target.value = '';
    const room = MAX_AUX - auxPreviews.length;
    if (!picked.length || room <= 0) return;

    const tooBig = picked.filter(f => f.size > 10 * 1024 * 1024);
    const usable = picked.filter(f => f.size <= 10 * 1024 * 1024).slice(0, room);
    try {
      const added: string[] = [];
      for (const f of usable) added.push(await compressUpload(await fileToBase64(f)));
      const next = [...auxPreviews, ...added];
      setAuxPreviews(next);
      syncImages(preview, next);

      const dropped = picked.length - usable.length - tooBig.length;
      const msg = [
        tooBig.length ? `${tooBig.length}장은 10MB를 넘어 빼놨어요.` : '',
        dropped > 0 ? `보조컷은 최대 ${MAX_AUX}장이라 ${dropped}장은 담지 못했어요.` : '',
      ].filter(Boolean).join('\n');
      if (msg) alert(msg);
    } catch (err) {
      console.error('[ImageScreen] 보조컷 업로드 실패:', err);
    }
  };

  // 포장컷 — 실제 포장·구성 사진 1장(픽셀 보존 플레이트 합성 입력, 데스크톱과 동일)
  const handlePackUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { alert('이미지 크기는 10MB 이하여야 합니다.'); return; }
    try {
      setPackagingRefImage(await compressUpload(await fileToBase64(file)));
    } catch (err) {
      console.error('[ImageMobile] 포장컷 업로드 실패:', err);
    }
  };

  const removeAux = (idx: number) => {
    const next = auxPreviews.filter((_, i) => i !== idx);
    setAuxPreviews(next);
    syncImages(preview, next);
  };

  const removePreview = () => { setPreview(null); setAuxPreviews([]); setProductImages([]); };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDropHover(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { alert('이미지 크기는 10MB 이하여야 합니다.'); return; }
    try {
      const dataUrl = await compressUpload(await fileToBase64(file));   // ★413 방지: 업로드 즉시 압축(1280px/0.82)
      setPreview(dataUrl);
      syncImages(dataUrl, auxPreviews);
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
        </div>
      </header>

      {/* 2) 진행 단계 */}
      <section style={{ padding: '8px 20px 0' }}>
        <MobileStepRail screen="s6" />
      </section>

      {/* 3) STEP 배지 + 타이틀 */}
      <section style={{ padding: '20px 20px 0' }}>
        <span style={{
          display: 'inline-block',
          background: '#F4F0FF', color: '#6D4CFF',
          fontSize: 11, fontWeight: 700,
          borderRadius: 999, padding: '4px 12px',
        }}>STEP {STEP_MAP['s6'] ?? 7} / {TOTAL_STEPS}</span>
        <h1 style={{
          margin: '12px 0 0',
          fontSize: 24, fontWeight: 800, color: '#111',
          letterSpacing: '-0.03em', lineHeight: 1.25,
        }}>제품 사진 한 장만 주세요</h1>
        <p style={{ margin: '12px 0 0', fontSize: 13, color: '#666', lineHeight: 1.6 }}>
          제품이 잘 보이는 사진이면 충분해요 —<br />
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

      {/* 4b) 추가 사진(선택) — 보조컷(내용물·질감) + 포장컷(실제 포장·구성, 원본 그대로) */}
      <section style={{ padding: '14px 20px 0' }}>
        <div style={{ background: '#fff', border: '1.5px solid #ECECF2', borderRadius: 18, padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span style={{ fontSize: 13.5, fontWeight: 700, color: '#111' }}>추가 사진</span>
            <span style={{ fontSize: 11, color: '#999' }}>선택 — 올릴수록 정확해져요</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10 }}>
            <span style={{ fontSize: 10.5, fontWeight: 700, color: '#6D4CFF', background: '#F4F0FF', borderRadius: 6, padding: '2px 7px' }}>보조컷</span>
            <span style={{ fontSize: 10.5, color: '#B8B8C7' }}>최대 {MAX_AUX}장 · 알약·제형·조리컷 등 포장 밖 실물</span>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            {auxPreviews.map((src, i) => (
              <div key={i} style={{
                position: 'relative', width: 76, height: 76, borderRadius: 12,
                border: '1px solid #DDD6FE', overflow: 'hidden', background: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt={`보조컷 ${i + 1}`} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                <button onClick={() => removeAux(i)} aria-label={`보조컷 ${i + 1} 제거`} style={{
                  position: 'absolute', top: 3, right: 3, width: 20, height: 20, borderRadius: '50%',
                  background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                }}><X size={11} /></button>
              </div>
            ))}
            {auxPreviews.length < MAX_AUX && (
              <button type="button"
                onClick={() => {
                  if (!preview) { alert('대표컷을 먼저 올려주세요 — 보조컷은 대표컷과 함께 전달돼요.'); return; }
                  auxFileRef.current?.click();
                }}
                style={{
                  width: 76, height: 76, borderRadius: 12,
                  border: `2px dashed ${preview ? '#DDD6FE' : '#ECECF2'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: preview ? '#6D4CFF' : '#C4C4CC', background: '#FDFCFF',
                  cursor: 'pointer', fontFamily: 'inherit',
                }}>
                <UploadCloud size={20} />
              </button>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 14 }}>
            <span style={{ fontSize: 10.5, fontWeight: 700, color: '#D97706', background: '#FFF7E6', borderRadius: 6, padding: '2px 7px' }}>포장컷</span>
            <span style={{ fontSize: 10.5, color: '#B8B8C7' }}>1장 · 배송박스·구성품 등 원본 그대로 실려요 (본인 상품만)</span>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            {packagingRefImage ? (
              <div style={{
                position: 'relative', width: 76, height: 76, borderRadius: 12,
                border: '1px solid #FDE1B5', overflow: 'hidden', background: '#fff',
              }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={packagingRefImage} alt="포장컷" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <button onClick={() => setPackagingRefImage(null)} aria-label="포장컷 제거" style={{
                  position: 'absolute', top: 3, right: 3, width: 20, height: 20, borderRadius: '50%',
                  background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                }}><X size={11} /></button>
              </div>
            ) : (
              <button type="button" onClick={() => packFileRef.current?.click()} style={{
                width: 76, height: 76, borderRadius: 12,
                border: '2px dashed #FDE1B5',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#D97706', background: '#FFFDF7',
                cursor: 'pointer', fontFamily: 'inherit',
              }}>
                <UploadCloud size={20} />
              </button>
            )}
          </div>
          {/* 숨은 파일 입력 — 명시적 ref 클릭 방식 */}
          <input ref={auxFileRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleAuxUpload} />
          <input ref={packFileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePackUpload} />
        </div>
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
              {/* ★내 섹션으로 보여준다(2026-08-04) — 예시 나열('성분 클로즈업, 사용 장면…')은
                  내 상품과 무관하다. 컷 종류는 실제 이미지 생성이 쓰는 분류를 그대로 쓴다. */}
              {sectionStructure.length === 0
                ? '제공해주신 대표컷을 기준으로 AI가 섹션마다 필요한 이미지를 만듭니다.'
                : sectionStructure.map((name, i) => {
                    const a = i === 0 ? 'hero' : classifyCutArchetype(name);
                    return (
                      <div key={i} style={{ display: 'flex', gap: 8, padding: '5px 0', borderTop: i ? '1px solid #F7F7FA' : 'none' }}>
                        <span style={{ fontSize: 11.5, fontWeight: 700, color: '#6D4CFF', width: 22, flexShrink: 0 }}>{i + 1}</span>
                        <span style={{ flex: 1, minWidth: 0, fontSize: 12, color: '#111', fontWeight: 600 }}>{name}</span>
                        <span style={{ fontSize: 11.5, color: '#8B95A1', flexShrink: 0 }}>{CUT_LABEL_M[a] ?? '상품에 맞춰'}</span>
                      </div>
                    );
                  })}
            </div>
          )}
        </div>
      </section>

      {showDownloadNote && (
        <div style={{
          margin: '0 0 16px', background: '#F4F0FF', border: '1px solid #E6DEFF', borderRadius: 12,
          padding: '13px 15px', fontSize: 12.5, color: '#5B3FD6', lineHeight: 1.75,
        }}>
          <b style={{ fontWeight: 700 }}>체험으로 만드는 페이지입니다</b> — 완성된 결과를 화면에서 전부 확인하고
          카피·이미지를 수정할 수 있어요. <b style={{ fontWeight: 700 }}>파일 다운로드는 크레딧을 충전하면 열립니다.</b>
        </div>
      )}

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
