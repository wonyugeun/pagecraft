'use client';

import { useState, useRef } from 'react';
import { compressUpload } from '@/lib/imageCompress';
import { useApp } from '@/store/AppContext';
import ImageMobile from './ImageMobile';
import { useIsMobile } from '@/hooks/useIsMobile';
import {
  UploadCloud, Sparkles, ChevronDown, Lightbulb,
  Image as ImageIcon, Sun, Palette, FileText, X, Plus,
} from 'lucide-react';

// 아래는 "어떤 이미지가 만들어지나요" 드롭다운의 예시(컷 종류 안내)용. 실제 섹션 수는 sectionStructure로 동적 표시.
const sectionImageMap = [
  { name: '히어로', cut: '정면 누끼컷', why: '첫인상·썸네일' },
  { name: '피부고민 공감', cut: '사용 장면컷', why: '공감 유도' },
  { name: '성분 신뢰', cut: '성분/원료컷', why: '신뢰 강화' },
  { name: 'USP', cut: '텍스처/제형컷', why: '강점 표현' },
  { name: '사용법', cut: '사용 단계컷', why: '사용감 전달' },
  { name: '비교표', cut: '제품 비교컷', why: '차별점 강조' },
  { name: '후기', cut: '전후 비교컷', why: '효과 증명' },
  { name: 'FAQ', cut: '디테일 클로즈업', why: '정보 보강' },
  { name: 'CTA', cut: '패키지 상세컷', why: '구매 전환' },
];

const guides = [
  { icon: ImageIcon, t: '고해상도 사용', d: '가로 2000px 이상 권장' },
  { icon: Sun, t: '배경은 깔끔하게', d: '흰색·단색 배경이 좋아요' },
  { icon: Palette, t: '일관된 톤 유지', d: '제품과 어울리는 톤으로' },
  { icon: FileText, t: '파일 형식', d: 'PNG·JPG, 10MB 이하' },
];

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

/* ── 추가 사진 슬롯 공용(보조컷·포장컷) — 채워진 상태 ── */
function PhotoSlot({ src, alt, onRemove }: { src: string; alt: string; onRemove: () => void }) {
  return (
    <div style={{
      position: 'relative', width: 84, height: 84, borderRadius: 14,
      border: '1.5px solid #D8D2FF', overflow: 'hidden', background: '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: '0 2px 8px rgba(109,76,255,0.08)',
    }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      <button onClick={onRemove} aria-label={`${alt} 제거`} style={{
        position: 'absolute', top: 4, right: 4, width: 20, height: 20, borderRadius: '50%',
        background: 'rgba(17,17,17,0.62)', color: '#fff', border: 'none',
        display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
      }}>
        <X size={11} />
      </button>
    </div>
  );
}

/* ── 빈 슬롯 — + 아이콘과 슬롯 안 라벨(용도가 한눈에) ── */
function EmptySlot({ enabled, hint, label, children }: {
  enabled: boolean; hint: string; label: string; children: React.ReactNode;
}) {
  return (
    <label title={hint} style={{
      width: 84, height: 84, borderRadius: 14,
      border: `1.5px dashed ${enabled ? '#C9BAFF' : '#ECECF2'}`,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
      cursor: enabled ? 'pointer' : 'not-allowed',
      color: enabled ? '#6D4CFF' : '#C4C4CC', background: enabled ? '#FBFAFF' : '#FAFAFA',
      transition: 'border-color .15s, background .15s',
    }}>
      <Plus size={18} />
      <span style={{ fontSize: 10, fontWeight: 600 }}>{label}</span>
      {children}
    </label>
  );
}

export default function ImageScreen() {
  const isMobile = useIsMobile();
  const { setProductImages, go, sectionStructure, packagingRefImage, setPackagingRefImage } = useApp();
  const [preview, setPreview] = useState<string | null>(null);
  // 보조컷(선택, 최대 2) — 내용물·질감 실물. 대표컷만으로는 병 속 알약 등 내용물 모양을
  // 모델이 매 섹션 지어내므로, 실물 컷을 레퍼런스로 함께 전달해 일관성을 잡는다.
  const [auxPreviews, setAuxPreviews] = useState<string[]>([]);
  const [briefOpen, setBriefOpen] = useState(false);
  const [dropHover, setDropHover] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const auxFileRef = useRef<HTMLInputElement>(null);

  const MAX_AUX = 2;
  const syncImages = (main: string | null, aux: string[]) =>
    setProductImages(main ? [main, ...aux] : []);

  if (isMobile) return <ImageMobile />;

  // ★섹션 수 동적: 섹션구조(STEP 7)에서 정한 실제 개수. 없으면 예시 개수로 폴백.
  const secCount = sectionStructure.length > 0 ? sectionStructure.length : sectionImageMap.length;

  const goPrev = () => go('s5b');
  const goNext = () => go('s7');

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
      console.error('[ImageScreen] 이미지 업로드 실패:', err);
    }
  };

  const handleAuxUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || auxPreviews.length >= MAX_AUX) return;
    if (file.size > 10 * 1024 * 1024) { alert('이미지 크기는 10MB 이하여야 합니다.'); return; }
    try {
      const dataUrl = await compressUpload(await fileToBase64(file));
      const next = [...auxPreviews, dataUrl];
      setAuxPreviews(next);
      syncImages(preview, next);
    } catch (err) {
      console.error('[ImageScreen] 보조컷 업로드 실패:', err);
    }
  };

  // 포장컷 — 실제 포장·구성 사진 1장. 픽셀 보존 플레이트 합성(Required Asset) 입력.
  const handlePackUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { alert('이미지 크기는 10MB 이하여야 합니다.'); return; }
    try {
      setPackagingRefImage(await compressUpload(await fileToBase64(file)));
    } catch (err) {
      console.error('[ImageScreen] 포장컷 업로드 실패:', err);
    }
  };

  const removeAux = (idx: number) => {
    const next = auxPreviews.filter((_, i) => i !== idx);
    setAuxPreviews(next);
    syncImages(preview, next);
  };

  // 드래그&드롭 업로드 (모바일과 동일 패턴)
  const handleDrop = async (e: React.DragEvent<HTMLLabelElement>) => {
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
      console.error('[ImageScreen] drop 실패:', err);
    }
  };

  const removePreview = () => {
    setPreview(null);
    setAuxPreviews([]);
    setProductImages([]);
  };

  return (
    <div style={{
      maxWidth: 1100, margin: '0 auto', padding: '40px 40px 100px',
      fontFamily: 'var(--f)',
    }}>
      {/* 타이틀 */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em', color: '#111', lineHeight: 1.3 }}>
          제품 사진 한 장만 주세요
        </h1>
        <p style={{ fontSize: 15, color: '#666', marginTop: 8, lineHeight: 1.6 }}>
          누끼컷(흰 배경 정면)을 기준으로 AI가{' '}
          <span style={{ color: '#6D4CFF', fontWeight: 700 }}>{secCount}개 섹션</span>에 필요한 이미지를 전부 만들어요
        </p>
      </div>

      {/* 2단 그리드 (모바일 1단) */}
      <div className="layout-grid-image">
        {/* ── 좌측 ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* 드롭존 / 미리보기 */}
          {!preview ? (
            <label
              onMouseEnter={() => setDropHover(true)}
              onMouseLeave={() => setDropHover(false)}
              onDragOver={e => { e.preventDefault(); setDropHover(true); }}
              onDragLeave={() => setDropHover(false)}
              onDrop={handleDrop}
              style={{
                border: `2px dashed ${dropHover ? '#6D4CFF' : '#D8D2FF'}`,
                borderRadius: 16,
                background: dropHover ? '#FBFAFF' : '#fff',
                height: 300,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', transition: 'all .15s',
              }}
            >
              <div style={{
                width: 64, height: 64, borderRadius: '50%', background: '#F4F0FF',
                display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14,
              }}>
                <UploadCloud size={32} color="#6D4CFF" />
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#111' }}>클릭하거나 드래그해서 업로드</div>
              <div style={{ fontSize: 13, color: '#999', marginTop: 6 }}>PNG, JPG · 최대 10MB</div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleUpload}
              />
            </label>
          ) : (
            <div style={{
              position: 'relative', border: '2px solid #D8D2FF', borderRadius: 16,
              background: '#fff', height: 300, overflow: 'hidden',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="제품 사진" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
              <button
                onClick={removePreview}
                aria-label="이미지 제거"
                style={{
                  position: 'absolute', top: 12, right: 12, width: 32, height: 32, borderRadius: '50%',
                  background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                }}
              >
                <X size={16} />
              </button>
            </div>
          )}

          {/* 추가 사진(선택) — ①보조컷: 내용물·질감(AI가 모양을 지어내지 않게) ②포장컷: 실제
              포장·구성(픽셀 보존 플레이트 합성 — packagingRefImage, 2026-07-19 입구 신설·역할 분리) */}
          <div style={{
            border: '1px solid #ECECF2', borderRadius: 16, background: '#fff', padding: '18px 20px',
          }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 14 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#111' }}>추가 사진</span>
              <span style={{ fontSize: 12, color: '#999' }}>선택 — 올릴수록 결과가 정확해져요</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
              {/* ── 보조컷 그룹 ── */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <span style={{
                    fontSize: 11, fontWeight: 700, color: '#6D4CFF',
                    background: '#F4F0FF', borderRadius: 6, padding: '2px 7px',
                  }}>보조컷</span>
                  <span style={{ fontSize: 11, color: '#B8B8C7' }}>최대 {MAX_AUX}장</span>
                </div>
                <div style={{ fontSize: 11.5, color: '#8B8B99', lineHeight: 1.5, marginBottom: 10, minHeight: 34 }}>
                  알약·내용물·질감 실물 — AI가 모양을 지어내지 않게 잡아줘요
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {auxPreviews.map((src, i) => (
                    <PhotoSlot key={i} src={src} alt={`보조컷 ${i + 1}`} onRemove={() => removeAux(i)} />
                  ))}
                  {auxPreviews.length < MAX_AUX && (
                    <EmptySlot
                      enabled={!!preview}
                      hint={preview ? '보조컷 업로드' : '대표컷을 먼저 올려주세요'}
                      label="내용물"
                    >
                      <input ref={auxFileRef} type="file" accept="image/*" style={{ display: 'none' }}
                        disabled={!preview} onChange={handleAuxUpload} />
                    </EmptySlot>
                  )}
                </div>
              </div>

              {/* ── 포장컷 그룹 ── */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <span style={{
                    fontSize: 11, fontWeight: 700, color: '#D97706',
                    background: '#FFF7E6', borderRadius: 6, padding: '2px 7px',
                  }}>포장컷</span>
                  <span style={{ fontSize: 11, color: '#B8B8C7' }}>1장</span>
                </div>
                <div style={{ fontSize: 11.5, color: '#8B8B99', lineHeight: 1.5, marginBottom: 10, minHeight: 34 }}>
                  실제 포장·구성 사진 — <b>원본 그대로</b> 포장 섹션에 실려요 (본인 상품 사진만)
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {packagingRefImage ? (
                    <PhotoSlot src={packagingRefImage} alt="포장컷" onRemove={() => setPackagingRefImage(null)} />
                  ) : (
                    <EmptySlot enabled hint="포장컷 업로드" label="포장·구성">
                      <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePackUpload} />
                    </EmptySlot>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 누끼컷 생성 안내 */}
          <div style={{
            border: '1px solid #ECECF2', borderRadius: 16, background: '#fff',
            padding: '18px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 12, background: '#F4F0FF',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <Sparkles size={20} color="#6D4CFF" />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#111' }}>누끼컷이 없으세요?</div>
                <div style={{ fontSize: 12.5, color: '#666', marginTop: 2, lineHeight: 1.5 }}>
                  배경 있는 제품 사진을 올리면 AI가 누끼를 따드려요
                </div>
              </div>
            </div>
            <button
              disabled
              title="곧 추가될 기능이에요"
              style={{
                height: 40, border: '1px solid #E5E7EB', background: '#F4F4F6', color: '#A0A0AB',
                fontWeight: 700, fontSize: 13, borderRadius: 12, padding: '0 16px',
                whiteSpace: 'nowrap', cursor: 'not-allowed', flexShrink: 0, fontFamily: 'var(--f)',
              }}
            >
              누끼컷 만들기 (준비 중)
            </button>
          </div>

          {/* 접힌 안내: 어떤 이미지가 만들어지나요 */}
          <div style={{
            border: '1px solid #ECECF2', borderRadius: 16, background: '#fff', overflow: 'hidden',
          }}>
            <button
              onClick={() => setBriefOpen(o => !o)}
              style={{
                width: '100%', padding: '16px 20px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'var(--f)',
              }}
            >
              <span style={{ fontSize: 14, fontWeight: 700, color: '#111' }}>어떤 이미지가 만들어지나요?</span>
              <ChevronDown
                size={18}
                color="#999"
                style={{ transform: briefOpen ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }}
              />
            </button>
            {briefOpen && (
              <div style={{ padding: '0 20px 12px' }}>
                {sectionImageMap.map((s, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: '11px 0',
                      borderTop: '1px solid #F4F4F8',
                    }}
                  >
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#6D4CFF', width: 120, flexShrink: 0 }}>
                      {idx + 1}. {s.name}
                    </span>
                    <span style={{ fontSize: 13.5, fontWeight: 700, color: '#111', width: 120, flexShrink: 0 }}>
                      {s.cut}
                    </span>
                    <span style={{ fontSize: 13, color: '#666', flex: 1 }}>{s.why}</span>
                    <span style={{
                      display: 'flex', alignItems: 'center', gap: 4,
                      fontSize: 12, fontWeight: 700, color: '#6D4CFF', flexShrink: 0,
                    }}>
                      <Sparkles size={12} /> AI 생성
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── 우측: 이미지 가이드 ── */}
        <div style={{
          border: '1px solid #ECECF2', borderRadius: 16, background: '#fff', padding: 20,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Lightbulb size={18} color="#6D4CFF" />
            <span style={{ fontSize: 15, fontWeight: 700, color: '#111' }}>이미지 가이드</span>
          </div>
          {guides.map((g, i) => (
            <div
              key={g.t}
              style={{
                display: 'flex', gap: 12,
                marginBottom: i === guides.length - 1 ? 0 : 16,
              }}
            >
              <div style={{
                width: 36, height: 36, borderRadius: 10, background: '#F4F0FF',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <g.icon size={18} color="#6D4CFF" />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#111' }}>{g.t}</div>
                <div style={{ fontSize: 12, color: '#666', marginTop: 2, lineHeight: 1.5 }}>{g.d}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 하단 네비 */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 32,
      }}>
        <button
          onClick={goPrev}
          style={{
            height: 44, border: '1px solid #ECECF2', background: '#fff', color: '#666',
            fontWeight: 700, fontSize: 14, borderRadius: 16, padding: '0 20px',
            cursor: 'pointer', fontFamily: 'var(--f)',
          }}
        >
          ← 이전
        </button>
        <button
          onClick={goNext}
          style={{
            height: 44, background: '#6D4CFF', color: '#fff', border: 'none',
            fontWeight: 700, fontSize: 14, borderRadius: 16, padding: '0 24px',
            cursor: 'pointer', fontFamily: 'var(--f)',
            boxShadow: '0 4px 14px rgba(109,76,255,0.30)',
          }}
        >
          다음 단계로 →
        </button>
      </div>
      <p style={{
        textAlign: 'center', fontSize: 12.5, color: '#999', marginTop: 14,
      }}>
        사진이 없어도 괜찮아요 — AI가 제품 정보로 알아서 생성해요
      </p>
    </div>
  );
}
