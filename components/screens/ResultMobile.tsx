'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Menu, Zap, Sparkles, ArrowLeft,
  Smartphone, Monitor, Maximize,
  Type, Image as ImageIcon, ArrowUpDown, EyeOff, Eye,
  Upload, Download, RefreshCw,
} from 'lucide-react';
import { useApp, Section } from '@/store/AppContext';
import { resolveOutputType } from '@/lib/outputType';
import { compressMap } from '@/lib/imageCompress';
import { aspectRatioFor } from '@/lib/sectionAspect';
import {
  ImgState, EMPTY_IMG, BlogSection, SlideCard, ImageSection,
  EnhancedLightbox, downloadHtml, downloadMergedImage, buildBakedText,
} from './ResultScreen';

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

export default function ResultMobile() {
  // 데스크탑 ResultScreen과 동일 useApp
  const {
    cat, ch, type, out, sections, productName, productExtra, productImages,
    go, restoredImages, restoredBlockImages, updateLatestHistoryImages,
    toggleChat, credits,
  } = useApp();

  // 데스크탑과 동일 state
  const [lightboxSecNum, setLightboxSecNum] = useState<string | null>(null);
  const [sectionImages, setSectionImages] = useState<Record<string, ImgState>>({});
  const [blockImages, setBlockImages] = useState<Record<string, ImgState>>({});
  const [createdAt] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  });
  const [sectionOrder, setSectionOrder] = useState<number[]>([]);
  const [hiddenSections, setHiddenSections] = useState<Set<number>>(new Set());
  const [sectionOverrides, setSectionOverrides] = useState<Record<number, Partial<Section>>>({});
  const [regenLoadingSet, setRegenLoadingSet] = useState<Set<number>>(new Set());
  const [viewMode, setViewMode] = useState<'mobile' | 'pc'>('mobile');
  const [zoom, setZoom] = useState(100);
  const [htmlLoading, setHtmlLoading] = useState(false);
  const [mergeLoading, setMergeLoading] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const savedImagesRef = useRef(false);

  useEffect(() => {
    setSectionOrder(sections.map((_, i) => i));
    setHiddenSections(new Set());
    setSectionOverrides({});
  }, [sections.length]);

  const getEffectiveSection = (realIdx: number): Section => ({
    ...sections[realIdx],
    ...sectionOverrides[realIdx],
  });
  const updateSection = (realIdx: number, patch: Partial<Section>) => {
    setSectionOverrides(prev => ({ ...prev, [realIdx]: { ...prev[realIdx], ...patch } }));
  };

  const productImagesRef = useRef(productImages);
  useEffect(() => { productImagesRef.current = productImages; }, [productImages]);

  const displaySections = sections;
  const effectiveOut = resolveOutputType(ch, out);
  const isSlide = effectiveOut === 'slide';
  const isHtml = effectiveOut === 'html';
  const isBlog = !isSlide && !isHtml;

  // 데스크탑과 동일한 이미지 생성 함수
  const generateImage = useCallback(async (sec: Section, signal: AbortSignal) => {
    const aspect = aspectRatioFor(sec.name);
    setSectionImages(p => ({ ...p, [sec.num]: { loading: true, url: null, error: false, aspectRatio: aspect } }));
    try {
      const images = productImagesRef.current;
      // 슬라이드 = baked: 헤드라인을 한글 텍스트로 이미지에 합성(GPT Image 2). 블로그는 텍스트 0.
      const promptText = effectiveOut === 'blog'
        ? sec.imageDesc
        : `${sec.imageDesc}. ${buildBakedText(sec.headline, sec.subcopy)}`;
      const res = await fetch('/api/generate-image', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptText, sectionNum: sec.num,
          productImages: images.length > 0 ? images : undefined,
          outputType: effectiveOut,
          aspectRatio: aspect,
        }),
        signal,
      });
      if (signal.aborted) return;
      const data = await res.json();
      if (signal.aborted) return;
      if (data.imageBase64) {
        setSectionImages(p => ({ ...p, [sec.num]: { loading: false, url: `data:${data.mimeType};base64,${data.imageBase64}`, error: false, aspectRatio: aspect } }));
      } else {
        setSectionImages(p => ({ ...p, [sec.num]: { loading: false, url: null, error: true, aspectRatio: aspect } }));
      }
    } catch {
      if (signal.aborted) return;
      setSectionImages(p => ({ ...p, [sec.num]: { loading: false, url: null, error: true, aspectRatio: aspect } }));
    }
  }, [effectiveOut]);

  const generateBlockImage = useCallback(async (sec: Section, blockIdx: number, desc: string, signal: AbortSignal) => {
    const key = `${sec.num}#${blockIdx}`;
    const blockType = sec.blocks?.[blockIdx]?.type;
    const aspect = aspectRatioFor(sec.name, blockType);
    setBlockImages(p => ({ ...p, [key]: { loading: true, url: null, error: false, aspectRatio: aspect } }));
    try {
      const images = productImagesRef.current;
      const res = await fetch('/api/generate-image', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: desc, sectionNum: key,
          productImages: images.length > 0 ? images : undefined,
          outputType: 'blog',
          aspectRatio: aspect,
        }),
        signal,
      });
      if (signal.aborted) return;
      const data = await res.json();
      if (signal.aborted) return;
      if (data.imageBase64) {
        setBlockImages(p => ({ ...p, [key]: { loading: false, url: `data:${data.mimeType};base64,${data.imageBase64}`, error: false, aspectRatio: aspect } }));
      } else {
        setBlockImages(p => ({ ...p, [key]: { loading: false, url: null, error: true, aspectRatio: aspect } }));
      }
    } catch {
      if (signal.aborted) return;
      setBlockImages(p => ({ ...p, [key]: { loading: false, url: null, error: true, aspectRatio: aspect } }));
    }
  }, []);

  // 데스크탑과 동일한 자동 생성 useEffect (작업기록 복원 가드 포함)
  useEffect(() => {
    if (!displaySections.length) return;
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    savedImagesRef.current = false;

    if (Object.keys(restoredImages).length > 0) {
      const initial: Record<string, ImgState> = {};
      for (const [key, url] of Object.entries(restoredImages)) {
        initial[key] = { loading: false, url, error: false };
      }
      setSectionImages(initial);
    } else {
      setSectionImages({});
    }
    if (Object.keys(restoredBlockImages).length > 0) {
      const initialBlocks: Record<string, ImgState> = {};
      for (const [key, url] of Object.entries(restoredBlockImages)) {
        initialBlocks[key] = { loading: false, url, error: false };
      }
      setBlockImages(initialBlocks);
    } else {
      setBlockImages({});
    }

    const sleep = (ms: number) => new Promise<void>(r => {
      const id = setTimeout(r, ms);
      ctrl.signal.addEventListener('abort', () => { clearTimeout(id); r(); }, { once: true });
    });

    (async () => {
      let count = 0;
      for (let i = 0; i < displaySections.length; i++) {
        if (ctrl.signal.aborted) break;
        const sec = displaySections[i];

        // 섹션 대표 이미지 — 블록 유무 무관 V2 브리프(sec.imageDesc)로 생성. 복원본 있으면 skip(과금 방지).
        if (sec.imageDesc && !restoredImages[sec.num]) {
          if (count > 0) await sleep(3_000);
          if (ctrl.signal.aborted) break;
          await generateImage(sec, ctrl.signal);
          count++;
        }

        // 이미지 타입 블록(있으면) 추가 생성 — 현재 Stage3엔 없지만 호환 유지
        if (sec.blocks?.length) {
          for (let bi = 0; bi < sec.blocks.length; bi++) {
            if (ctrl.signal.aborted) break;
            const block = sec.blocks[bi];
            if (block.type !== 'image') continue;
            if (restoredBlockImages[`${sec.num}#${bi}`]) continue;
            if (count > 0) await sleep(3_000);
            await generateBlockImage(sec, bi, block.desc, ctrl.signal);
            count++;
          }
        }
      }
    })();

    return () => { ctrl.abort(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displaySections.length]);

  // 작업기록 저장 (압축)
  useEffect(() => {
    if (!displaySections.length || savedImagesRef.current) return;
    const allDone = displaySections.every(sec => {
      const secImg = sectionImages[sec.num];
      const secOk = !sec.imageDesc || (secImg && !secImg.loading);
      const blockOk = !sec.blocks?.length || sec.blocks.every((b, bi) => {
        if (b.type !== 'image') return true;
        const img = blockImages[`${sec.num}#${bi}`];
        return img && !img.loading;
      });
      return secOk && blockOk;
    });
    if (!allDone) return;

    const sectionUrls: Record<string, string> = {};
    for (const sec of displaySections) {
      const url = sectionImages[sec.num]?.url;
      if (url) sectionUrls[sec.num] = url;
    }
    const blockUrls: Record<string, string> = {};
    for (const sec of displaySections) {
      if (!sec.blocks?.length) continue;
      sec.blocks.forEach((b, bi) => {
        if (b.type !== 'image') return;
        const url = blockImages[`${sec.num}#${bi}`]?.url;
        if (url) blockUrls[`${sec.num}#${bi}`] = url;
      });
    }
    if (Object.keys(sectionUrls).length === 0 && Object.keys(blockUrls).length === 0) return;
    savedImagesRef.current = true;
    (async () => {
      const [compressedSection, compressedBlock] = await Promise.all([
        compressMap(sectionUrls),
        compressMap(blockUrls),
      ]);
      updateLatestHistoryImages(compressedSection, compressedBlock);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionImages, blockImages]);

  const regenFn = useCallback(async (sec: Section): Promise<Section | null> => {
    try {
      const res = await fetch('/api/regen-section', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cat, ch, type, out, productName, productExtra, sectionNum: sec.num, sectionName: sec.name }),
        signal: AbortSignal.timeout(30_000),
      });
      const data = await res.json();
      return data.section ?? null;
    } catch (err) {
      console.error('[regenFn] error:', err);
      return null;
    }
  }, [cat, ch, type, out, productName, productExtra]);

  const handleRegenSection = async (realIdx: number) => {
    const targetSec = getEffectiveSection(realIdx);
    if (!targetSec) return;
    setRegenLoadingSet(prev => new Set(prev).add(realIdx));
    try {
      const result = await regenFn(targetSec);
      if (result) updateSection(realIdx, { headline: result.headline, body: result.body });
    } finally {
      setRegenLoadingSet(prev => { const n = new Set(prev); n.delete(realIdx); return n; });
    }
  };

  // 단일 소스로 표시되는 섹션들 + 순서/숨김 적용
  const effectiveOrder = sectionOrder.length === displaySections.length
    ? sectionOrder
    : displaySections.map((_, i) => i);
  const orderedVisibleSections = effectiveOrder
    .filter(i => !hiddenSections.has(i))
    .map(realIdx => ({ section: getEffectiveSection(realIdx), realIdx }));
  const finalSectionsForExport = orderedVisibleSections.map(o => o.section);

  const toggleHidden = (realIdx: number) => {
    setHiddenSections(prev => {
      const n = new Set(prev);
      if (n.has(realIdx)) n.delete(realIdx); else n.add(realIdx);
      return n;
    });
  };

  const closeLightbox = useCallback(() => setLightboxSecNum(null), []);
  const lightboxItems = [
    ...displaySections.filter(s => !!(sectionImages[s.num]?.url))
      .map(s => ({ secNum: s.num, url: sectionImages[s.num].url as string, alt: s.imageLabel })),
    ...displaySections.flatMap(s =>
      (s.blocks ?? []).flatMap((b, idx) => {
        if (b.type !== 'image') return [];
        const k = `${s.num}#${idx}`;
        const st = blockImages[k];
        return st?.url ? [{ secNum: k, url: st.url, alt: b.label }] : [];
      }),
    ),
  ];
  const lightboxInitIdx = lightboxSecNum !== null
    ? lightboxItems.findIndex(i => i.secNum === lightboxSecNum)
    : -1;

  const meta = [cat, ch, type, isBlog ? '블로그형' : isSlide ? '슬라이드형' : 'HTML형', `${displaySections.length}섹션`].filter(Boolean).join(' · ');
  const outputTypeLabel = isBlog ? '블로그형' : isSlide ? '슬라이드형' : 'HTML형';
  const totalLength = (displaySections.length * 1040).toLocaleString();

  const handleHtmlDownload = async () => {
    setHtmlLoading(true);
    await new Promise(r => setTimeout(r, 50));
    const ok = await downloadHtml(finalSectionsForExport, meta, productName, sectionImages, blockImages);
    if (!ok) alert('HTML 다운로드 중 오류가 발생했어요.');
    setTimeout(() => setHtmlLoading(false), 2000);
  };
  const handleMergeDownload = async () => {
    if (mergeLoading) return;
    setMergeLoading(true);
    try {
      await downloadMergedImage(finalSectionsForExport, sectionImages, blockImages, productName);
    } catch (err) {
      console.error('[handleMergeDownload]', err);
      alert('통이미지 다운로드 중 오류가 발생했어요.');
    } finally {
      setMergeLoading(false);
    }
  };

  const onPrev = () => go('s5');
  const onRegen = () => {
    if (!window.confirm('전체 텍스트와 이미지를 다시 생성합니다. 크레딧과 이미지 생성 비용이 발생할 수 있어요. 계속하시겠어요?')) return;
    go('s6');
  };

  const zoomOut = () => setZoom(z => Math.max(50, z - 10));
  const zoomIn = () => setZoom(z => Math.min(150, z + 10));

  // sections 없음 fallback
  if (sections.length === 0) {
    return (
      <div style={{ minHeight: '100vh', background: '#FAFAFC', textAlign: 'center', padding: '80px 20px' }}>
        <div style={{ fontSize: 44, marginBottom: 16 }}>⚠️</div>
        <div style={{ fontSize: 17, fontWeight: 700, color: '#dc2626', marginBottom: 10 }}>결과가 비어 있어요</div>
        <div style={{ fontSize: 13, color: '#666', marginBottom: 24 }}>콘텐츠가 생성되지 않았어요.</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button onClick={() => go('s5')} style={{ background: '#fff', border: '1.5px solid #ECECF2', color: '#111', fontSize: 14, fontWeight: 700, padding: '14px', borderRadius: 14, cursor: 'pointer', fontFamily: 'inherit' }}>← 정보 수정</button>
          <button onClick={() => go('s6')} style={{ background: '#6D4CFF', color: '#fff', border: 'none', fontSize: 14, fontWeight: 700, padding: '14px', borderRadius: 14, cursor: 'pointer', fontFamily: 'inherit' }}>↻ 다시 생성</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#FAFAFC',
      fontFamily: 'Pretendard, sans-serif',
      paddingBottom: 32,
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
          }}>F</div>
          <span style={{ fontSize: 18, fontWeight: 700, color: '#111' }}>Flik</span>
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
            const active = s.num === 10;
            const done = s.num < 10;
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

      {/* 3) 타이틀 */}
      <section style={{ padding: '24px 20px 0' }}>
        <h1 style={{
          margin: 0, fontSize: 22, fontWeight: 800, color: '#111',
          display: 'flex', alignItems: 'center', gap: 8,
          letterSpacing: '-0.03em',
        }}>
          <Sparkles size={20} color="#6D4CFF" />
          상세페이지가 완성되었어요!
        </h1>
        <p style={{ margin: '10px 0 0', fontSize: 13, color: '#666', lineHeight: 1.6 }}>
          아래 결과물을 확인하고, 필요시 빠르게 수정하거나 스토어에 바로 업로드해보세요.
        </p>
      </section>

      {/* 4) 출력형태 탭 */}
      <section style={{ padding: '20px 20px 0' }}>
        <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #ECECF2' }}>
          {[
            { id: 'blog',  label: '블로그형',   active: isBlog },
            { id: 'slide', label: '슬라이드형', active: isSlide },
            { id: 'html',  label: 'HTML형',     active: isHtml },
          ].map(t => (
            <button key={t.id} disabled style={{
              padding: '12px 18px', fontSize: 14, fontWeight: 700,
              background: 'transparent', border: 'none',
              borderBottom: t.active ? '2px solid #6D4CFF' : '2px solid transparent',
              color: t.active ? '#6D4CFF' : '#999',
              cursor: 'default', fontFamily: 'inherit',
            }}>{t.label}</button>
          ))}
        </div>
      </section>

      {/* 5) 디바이스 + 줌 */}
      <section style={{
        padding: '14px 20px 0',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
      }}>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => setViewMode('mobile')} style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            background: viewMode === 'mobile' ? '#F4F0FF' : '#fff',
            border: viewMode === 'mobile' ? '1.5px solid #6D4CFF' : '1px solid #ECECF2',
            color: viewMode === 'mobile' ? '#6D4CFF' : '#666',
            fontSize: 12, fontWeight: 700,
            borderRadius: 10, padding: '8px 12px',
            cursor: 'pointer', fontFamily: 'inherit',
          }}>
            <Smartphone size={14} /> 모바일
          </button>
          <button onClick={() => setViewMode('pc')} style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            background: viewMode === 'pc' ? '#F4F0FF' : '#fff',
            border: viewMode === 'pc' ? '1.5px solid #6D4CFF' : '1px solid #ECECF2',
            color: viewMode === 'pc' ? '#6D4CFF' : '#666',
            fontSize: 12, fontWeight: 700,
            borderRadius: 10, padding: '8px 12px',
            cursor: 'pointer', fontFamily: 'inherit',
          }}>
            <Monitor size={14} /> PC
          </button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '6px 10px', borderRadius: 10,
            border: '1px solid #ECECF2', background: '#fff',
            fontSize: 12, color: '#111',
          }}>
            <button onClick={zoomOut} disabled={zoom <= 50} style={{ background: 'none', border: 'none', cursor: zoom <= 50 ? 'default' : 'pointer', fontSize: 14, color: zoom <= 50 ? '#CCC' : '#666', fontFamily: 'inherit', padding: 0 }}>−</button>
            <span style={{ minWidth: 32, textAlign: 'center', fontWeight: 600 }}>{zoom}%</span>
            <button onClick={zoomIn} disabled={zoom >= 150} style={{ background: 'none', border: 'none', cursor: zoom >= 150 ? 'default' : 'pointer', fontSize: 14, color: zoom >= 150 ? '#CCC' : '#666', fontFamily: 'inherit', padding: 0 }}>+</button>
          </div>
          <button style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: '#fff', border: '1px solid #ECECF2',
            borderRadius: 10, padding: 8, cursor: 'pointer',
          }}>
            <Maximize size={14} color="#666" />
          </button>
        </div>
      </section>

      {/* 6) 미리보기 캔버스 — 모바일 grid는 BlockRenderer에서 isMobile로 처리 */}
      <section style={{ padding: '14px 16px 0' }}>
        <div style={{
          background: '#fff', border: '1px solid #ECECF2',
          borderRadius: 20,
          overflow: 'hidden', maxWidth: '100%',
          width: '100%',
        }}>
          <div style={{ width: '100%' }}>
            {isBlog && (
              <div style={{ background: '#fff' }}>
                {orderedVisibleSections.map(({ section: sec, realIdx }, displayIdx) => (
                  <BlogSection
                    key={realIdx}
                    sec={sec}
                    onRegen={() => handleRegenSection(realIdx)}
                    regenLoading={regenLoadingSet.has(realIdx)}
                    onPatch={patch => updateSection(realIdx, patch)}
                    imgState={sectionImages[sec.num] ?? EMPTY_IMG}
                    onGenerateImage={() => generateImage(sec, AbortSignal.timeout(130_000))}
                    isLast={displayIdx === orderedVisibleSections.length - 1}
                    isFirst={displayIdx === 0}
                    onLightbox={sectionImages[sec.num]?.url ? () => setLightboxSecNum(sec.num) : undefined}
                    blockImages={blockImages}
                    onLightboxBlock={(key: string) => setLightboxSecNum(key)}
                    isMobile
                  />
                ))}
              </div>
            )}
            {isHtml && orderedVisibleSections.map(({ section: sec, realIdx }, displayIdx) => (
              <ImageSection
                key={realIdx}
                sec={sec}
                imgState={sectionImages[sec.num] ?? EMPTY_IMG}
                onGenerateImage={() => generateImage(sec, AbortSignal.timeout(130_000))}
                index={displayIdx} accent="blue"
                onLightbox={sectionImages[sec.num]?.url ? () => setLightboxSecNum(sec.num) : undefined}
              />
            ))}
            {isSlide && orderedVisibleSections.map(({ section: sec, realIdx }, displayIdx) => (
              <SlideCard
                key={realIdx}
                sec={sec}
                onRegen={regenFn}
                imgState={sectionImages[sec.num] ?? EMPTY_IMG}
                onGenerateImage={() => generateImage(sec, AbortSignal.timeout(130_000))}
                index={displayIdx}
                onLightbox={sectionImages[sec.num]?.url ? () => setLightboxSecNum(sec.num) : undefined}
              />
            ))}
          </div>
        </div>
      </section>

      {/* 7) 페이지 정보 */}
      <section style={{ padding: '14px 20px 0' }}>
        <div style={{ background: '#fff', border: '1.5px solid #ECECF2', borderRadius: 18, padding: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#111', marginBottom: 14 }}>페이지 정보</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 13 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#666' }}>생성 타입</span>
              <span style={{ fontWeight: 700, color: '#111' }}>{outputTypeLabel}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#666' }}>전체 길이</span>
              <span style={{ fontWeight: 700, color: '#111' }}>{totalLength}px (예상)</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#666' }}>생성 일시</span>
              <span style={{ fontWeight: 700, color: '#111' }}>{createdAt}</span>
            </div>
          </div>
        </div>
      </section>

      {/* 8) 빠른 수정 */}
      <section style={{ padding: '14px 20px 0' }}>
        <div style={{ background: '#fff', border: '1.5px solid #ECECF2', borderRadius: 18, padding: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#111', marginBottom: 14 }}>빠른 수정</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { Icon: Type, title: '카피(텍스트) 수정', desc: '문구, 제목, 설명을 수정할 수 있어요' },
              { Icon: ImageIcon, title: '이미지 교체 / 재생성', desc: '이미지, 배경을 교체하거나 AI로 재생성' },
              { Icon: ArrowUpDown, title: '섹션 순서 변경', desc: '섹션 순서를 드래그로 변경할 수 있어요' },
              { Icon: EyeOff, title: '특정 섹션 숨기기', desc: '불필요한 섹션을 숨길 수 있어요' },
            ].map(({ Icon, title, desc }) => (
              <div key={title} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: '#F4F0FF', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={18} color="#6D4CFF" />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#111' }}>{title}</div>
                  <div style={{ marginTop: 2, fontSize: 11.5, color: '#666' }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 9) 섹션 목록 — 실제 데이터 */}
      <section style={{ padding: '14px 20px 0' }}>
        <div style={{ background: '#fff', border: '1.5px solid #ECECF2', borderRadius: 18, padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#111' }}>섹션 목록</span>
            <span style={{ fontSize: 11.5, color: '#999' }}>총 {displaySections.length}개</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {effectiveOrder.map((realIdx, displayIdx) => {
              if (!sections[realIdx]) return null;
              const sec = getEffectiveSection(realIdx);
              const thumb = sectionImages[sec.num]?.url
                ?? blockImages[Object.keys(blockImages).find(k => k.startsWith(`${sec.num}#`)) ?? '']?.url;
              const isHidden = hiddenSections.has(realIdx);
              return (
                <div key={realIdx} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: 10, borderRadius: 12,
                  opacity: isHidden ? 0.5 : 1,
                }}>
                  <button onClick={() => toggleHidden(realIdx)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0, display: 'flex' }}>
                    {isHidden ? <EyeOff size={16} color="#999" /> : <Eye size={16} color="#6D4CFF" />}
                  </button>
                  <div style={{
                    width: 36, height: 36, borderRadius: 8,
                    background: '#F4F0FF', flexShrink: 0, overflow: 'hidden',
                  }}>
                    {thumb && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={thumb} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    )}
                  </div>
                  <span style={{
                    flex: 1, fontSize: 13, fontWeight: 500, color: '#111',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {String(displayIdx + 1).padStart(2, '0')} {sec.name?.split('—')[0]?.trim() || sec.name}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 10) 액션 버튼 */}
      <section style={{ padding: '20px 20px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* 스토어 업로드 — 비활성 */}
        <button disabled aria-disabled style={{
          width: '100%', height: 50,
          background: '#F4F4F7', color: '#999',
          border: '1px solid #ECECF2', borderRadius: 14,
          fontSize: 14, fontWeight: 700,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          cursor: 'not-allowed', fontFamily: 'inherit',
        }}>
          <Upload size={16} /> {ch ?? '스토어'} 업로드 (준비 중)
        </button>
        <button onClick={handleHtmlDownload} disabled={htmlLoading} style={{
          width: '100%', height: 50,
          background: '#fff', color: '#111',
          border: '1px solid #ECECF2', borderRadius: 14,
          fontSize: 14, fontWeight: 700,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          cursor: htmlLoading ? 'default' : 'pointer', fontFamily: 'inherit',
          opacity: htmlLoading ? 0.7 : 1,
        }}>
          <Download size={16} /> {htmlLoading ? '저장 중...' : 'HTML 다운로드'}
        </button>
        <p style={{ margin: '-4px 4px 0', fontSize: 11.5, color: '#666', lineHeight: 1.55 }}>
          자사몰은 HTML을 그대로 사용하세요. 스마트스토어는 HTML을 열어 텍스트는 복사하고 이미지는 저장해 올려주세요.
        </p>
        {/* 통이미지 — 슬라이드/HTML만 */}
        {!isBlog && (
          <button onClick={handleMergeDownload} disabled={mergeLoading} style={{
            width: '100%', height: 50,
            background: '#fff', color: '#111',
            border: '1px solid #ECECF2', borderRadius: 14,
            fontSize: 14, fontWeight: 700,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            cursor: mergeLoading ? 'default' : 'pointer', fontFamily: 'inherit',
            opacity: mergeLoading ? 0.7 : 1,
          }}>
            <ImageIcon size={16} /> {mergeLoading ? '합치는 중...' : '통이미지 다운로드'}
          </button>
        )}
        <button onClick={onRegen} style={{
          width: '100%', height: 50,
          background: '#fff', color: '#111',
          border: '1px solid #ECECF2', borderRadius: 14,
          fontSize: 14, fontWeight: 700,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          cursor: 'pointer', fontFamily: 'inherit',
        }}>
          <RefreshCw size={16} /> 다시 생성하기
        </button>
      </section>

      {/* 11) 안내 박스 */}
      <section style={{ padding: '20px 20px 0' }}>
        <div style={{
          background: '#F7F6FB', borderRadius: 14, padding: 14,
          display: 'flex', alignItems: 'flex-start', gap: 10,
        }}>
          <div style={{ fontSize: 18 }}>💡</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: '#111' }}>
              더 다양한 수정이 필요하신가요?
            </div>
            <div style={{ marginTop: 4, fontSize: 11.5, color: '#666', lineHeight: 1.55 }}>
              상단의 각 단계를 돌아가면 더 세밀한 설정과 재생성이 가능합니다.
            </div>
          </div>
        </div>
      </section>

      {/* 12) 이전 단계로 */}
      <section style={{ padding: '14px 20px 0' }}>
        <button onClick={onPrev} style={{
          width: '100%', height: 48,
          background: '#fff', color: '#111',
          border: '1px solid #ECECF2', borderRadius: 14,
          fontSize: 14, fontWeight: 700,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          cursor: 'pointer', fontFamily: 'inherit',
        }}>
          <ArrowLeft size={16} /> 이전 단계로
        </button>
      </section>

      {/* 라이트박스 */}
      {lightboxSecNum && lightboxInitIdx >= 0 && (
        <EnhancedLightbox
          items={lightboxItems}
          initialIndex={lightboxInitIdx}
          onClose={closeLightbox}
        />
      )}

    </div>
  );
}
