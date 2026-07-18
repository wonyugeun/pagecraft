'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Zap, Sparkles, ArrowLeft,
  Smartphone, Monitor,
  Type, Image as ImageIcon, ArrowUpDown, EyeOff, Eye, ChevronUp, ChevronDown,
  Upload, Download, RefreshCw,
} from 'lucide-react';
import { useApp, Section } from '@/store/AppContext';
import { resolveOutputType } from '@/lib/outputType';
import { compressMap } from '@/lib/imageCompress';
import { aspectRatioFor } from '@/lib/sectionAspect';
import {
  ImgState, EMPTY_IMG, BlogSection, SlideCard, ImageSection,
  EnhancedLightbox, downloadHtml, downloadMergedImage,
  countGeneratingImages, confirmSkipGenerating,
} from './ResultScreen';
import { CLEAN_IMAGE_BRIEF, buildSectionBrief } from '@/lib/adBrief';
import type { DirectorPlan } from '@/lib/stages/director';
import { selectRequiredAssetIndex, buildPlatePrompt, compositeRequiredAsset } from '@/lib/sectionReference';
import { friendlyGenerationError } from '@/lib/apiErrors';
import { classifyCutArchetype } from '@/lib/sectionArchetype';
import { runPool } from '@/lib/asyncPool';

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
    cat, ch, type, out, sections, productName, productExtra, brand, brandIntro, diff, productForm, productVolume, productImages, packagingRefImage, generationJobKey,
    go, restoredImages, restoredBlockImages, restoredOverrides,
    updateLatestHistoryImages, updateLatestHistoryOverrides,
    toggleChat, credits, setCredits,
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
  const [captureLoading, setCaptureLoading] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const captureRef = useRef<HTMLDivElement>(null);   // 블로그 본문 — 섹션별 PNG 캡처 대상
  // 이미 IndexedDB에 증분 저장된 이미지 키(섹션 num / 블록 num#idx) — 데스크탑 ResultScreen 패턴 재사용
  const persistedKeysRef = useRef<Set<string>>(new Set());
  const overridesPersistTimer = useRef<NodeJS.Timeout | null>(null);

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
    setSectionOverrides(prev => {
      const next = { ...prev, [realIdx]: { ...prev[realIdx], ...patch } };
      // 편집값 IndexedDB 영속화(디바운스 600ms, AI 호출 0) — 새로고침/재방문에도 유지 (데스크탑 동일)
      if (overridesPersistTimer.current) clearTimeout(overridesPersistTimer.current);
      overridesPersistTimer.current = setTimeout(() => updateLatestHistoryOverrides(next as Record<string, unknown>), 600);
      return next;
    });
  };

  // 복원: 작업기록 재방문/새로고침 시 저장된 인라인 편집(override)을 state로 복원
  useEffect(() => {
    setSectionOverrides({ ...(restoredOverrides as Record<number, Partial<Section>>) });
  }, [restoredOverrides]);

  const productImagesRef = useRef(productImages);
  useEffect(() => { productImagesRef.current = productImages; }, [productImages]);
  const packagingRefRef = useRef(packagingRefImage);
  useEffect(() => { packagingRefRef.current = packagingRefImage; }, [packagingRefImage]);
  const jobKeyRef = useRef(generationJobKey);
  useEffect(() => { jobKeyRef.current = generationJobKey; }, [generationJobKey]);

  // ★빈 결과 자동 환불 시도(데스크톱과 동일) — 서버가 이미지 0장을 원장으로 재검증, 멱등
  useEffect(() => {
    if (sections.length > 0 || !generationJobKey) return;
    fetch('/api/credits/refund-failed', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobKey: generationJobKey }),
    }).then(r => r.json()).then(d => {
      if (d?.status === 'refunded' && typeof d.balance === 'number') setCredits(d.balance);
    }).catch(() => {});
  }, [sections.length, generationJobKey]);   // eslint-disable-line react-hooks/exhaustive-deps

  const displaySections = sections;
  const effectiveOut = resolveOutputType(ch, out);
  const isSlide = effectiveOut === 'slide';
  const isHtml = effectiveOut === 'html';
  const isBlog = !isSlide && !isHtml;

  // ★Clean Baseline Phase B — 디렉터 플랜(페이지당 1회 캐시). 데스크톱 ResultScreen과 동일.
  const directorPlanRef = useRef<Promise<DirectorPlan | null> | null>(null);
  const ensureDirectorPlan = useCallback((): Promise<DirectorPlan | null> => {
    if (!CLEAN_IMAGE_BRIEF) return Promise.resolve(null);
    if (!directorPlanRef.current) {
      directorPlanRef.current = fetch('/api/director', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobKey: jobKeyRef.current ?? undefined, cat, ch, productName, productExtra, diff, brand,
          sections: sections.map(s => ({ name: s.name, headline: s.headline, subcopy: s.subcopy })),
          productImage: productImagesRef.current[0] ?? null,
        }),
        signal: AbortSignal.timeout(120_000),
      }).then(r => r.json()).then(d => (d?.plan ?? null) as DirectorPlan | null).catch(() => null);
    }
    return directorPlanRef.current;
  }, [cat, ch, productName, productExtra, diff, brand, sections]);

  // 데스크탑과 동일한 이미지 생성 함수
  const generateImage = useCallback(async (sec: Section, signal: AbortSignal) => {
    const aspect = aspectRatioFor(sec.name, undefined, effectiveOut);   // 슬라이드는 전 섹션 4:5 고정
    setSectionImages(p => ({ ...p, [sec.num]: { loading: true, url: null, error: false, aspectRatio: aspect } }));
    try {
      const images = productImagesRef.current;
      const secIdx = sections.findIndex(x => x.num === sec.num);
      // ★Clean Baseline(Phase C 기본 경로) — 비블로그 전 섹션: 디렉터 플랜+섹션 브리프(데스크톱과 동일).
      const directorPlan = (CLEAN_IMAGE_BRIEF && effectiveOut !== 'blog') ? await ensureDirectorPlan() : null;
      const promptText = effectiveOut === 'blog'
        ? sec.imageDesc
        : buildSectionBrief({ productName, productForm, productVolume, productExtra, diff, brand, brandIntro, headline: sec.headline, subcopy: sec.subcopy, visual: sec.visual, director: directorPlan, sectionName: sec.name, sectionIndex: secIdx >= 0 ? secIdx : undefined, auxRefCount: Math.max(0, images.length - 1) });
      // ★Required Asset(포장/구성 = 증거 섹션) — GPT는 플레이트만, 셀러 포장 원본은 클라 코드 합성(픽셀 보존).
      //   ★페이지당 최고점 1개 섹션만(과발동 핫픽스).
      const packRef = packagingRefRef.current;
      const raIdx = packRef && effectiveOut === 'slide'
        ? selectRequiredAssetIndex(sections.map((s, j) => ({ name: s.name, prompt: s.imageDesc, archetype: j === 0 ? 'hero' : classifyCutArchetype(s.name) })))
        : -1;
      const isPlate = raIdx >= 0 && raIdx === secIdx;
      const res = await fetch('/api/generate-image', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: isPlate ? buildPlatePrompt(sec.headline, sec.subcopy, sec.visual?.accent_color) : promptText,
          sectionNum: sec.num,
          productImages: isPlate ? undefined : (images.length > 0 ? images : undefined),
          outputType: effectiveOut,
          aspectRatio: aspect,
          plateMode: isPlate || undefined,
          jobKey: jobKeyRef.current ?? undefined,   // ★결제 검증(P0 2차)
        }),
        signal,
      });
      if (signal.aborted) return;
      const data = await res.json();
      if (signal.aborted) return;
      if (data.imageBase64) {
        let url = `data:${data.mimeType};base64,${data.imageBase64}`;
        if (isPlate && packRef) {
          try {
            url = await compositeRequiredAsset(url, packRef);   // 원본 자산 카드 합성(픽셀 보존)
          } catch {
            setSectionImages(p => ({ ...p, [sec.num]: { loading: false, url: null, error: true, errorMsg: '포장 사진 합성에 실패했어요 — 재생성해 주세요.', aspectRatio: aspect } }));
            return;
          }
        }
        persistedKeysRef.current.delete(sec.num);   // ★재생성 결과 재영속 허용(안 지우면 persist effect가 skip → 새로고침 시 원본 복귀)
        setSectionImages(p => ({ ...p, [sec.num]: { loading: false, url, error: false, aspectRatio: aspect } }));
      } else {
        // ★402/429 코드 분기(최소 안내) — 코드가 있으면 친화 문구, 없으면 서버 안내문 그대로
        const errorMsg = friendlyGenerationError(data) ?? (typeof data.error === 'string' ? data.error : undefined);
        setSectionImages(p => ({ ...p, [sec.num]: { loading: false, url: null, error: true, errorMsg, aspectRatio: aspect } }));
      }
    } catch {
      if (signal.aborted) return;
      setSectionImages(p => ({ ...p, [sec.num]: { loading: false, url: null, error: true, aspectRatio: aspect } }));
    }
  }, [effectiveOut, productName, productExtra, cat, ch, sections]);

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
          jobKey: jobKeyRef.current ?? undefined,   // ★결제 검증(P0 2차)
        }),
        signal,
      });
      if (signal.aborted) return;
      const data = await res.json();
      if (signal.aborted) return;
      if (data.imageBase64) {
        persistedKeysRef.current.delete(key);   // ★재생성 결과 재영속 허용(위 섹션과 동일)
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
    // 증분 저장 추적 리셋 — 복원된(이미 IndexedDB에 있는) 이미지는 재저장 불필요하므로 미리 '저장됨'으로 시드.
    persistedKeysRef.current = new Set([
      ...Object.keys(restoredImages),
      ...Object.keys(restoredBlockImages),
    ]);

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

    // ★동시 3장 워커 풀 — 데스크탑과 동일(순차 병목 해소). 실패 격리·취소 전파는 runPool+ctrl.signal.
    (async () => {
      const tasks: Array<() => Promise<void>> = [];
      displaySections.forEach(sec => {
        // 섹션 대표 이미지 — 복원본 있으면 skip(재방문 과금 방지)
        if (sec.imageDesc && !restoredImages[sec.num]) {
          tasks.push(() => generateImage(sec, ctrl.signal));
        }
        // 이미지 타입 블록(있으면) 추가 생성 — 현재 Stage3엔 없지만 호환 유지
        sec.blocks?.forEach((block, bi) => {
          if (block.type !== 'image') return;
          if (restoredBlockImages[`${sec.num}#${bi}`]) return;
          tasks.push(() => generateBlockImage(sec, bi, block.desc, ctrl.signal));
        });
      });
      await runPool(tasks, 3, ctrl.signal);
    })();

    return () => { ctrl.abort(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displaySections.length]);

  // ── 이미지 '증분 영속화' — 섹션/블록이 성공할 때마다 그 장만 즉시 IndexedDB에 병합 저장 ── (데스크탑 ResultScreen 패턴 재사용)
  // (과거 allDone 일괄 저장 폐기: 배치 도중 페이지 이탈 시 성공분이 state에만 남아 재방문 시 전량 재생성=재과금됐음.)
  // 새로 성공한(아직 저장 안 된) 이미지만 골라 compress→저장. 실패(null)는 저장 안 함.
  useEffect(() => {
    if (!displaySections.length) return;

    const newSection: Record<string, string> = {};
    for (const sec of displaySections) {
      const url = sectionImages[sec.num]?.url;
      if (url && !persistedKeysRef.current.has(sec.num)) newSection[sec.num] = url;
    }
    const newBlock: Record<string, string> = {};
    for (const sec of displaySections) {
      if (!sec.blocks?.length) continue;
      sec.blocks.forEach((b, bi) => {
        if (b.type !== 'image') return;
        const key = `${sec.num}#${bi}`;
        const url = blockImages[key]?.url;
        if (url && !persistedKeysRef.current.has(key)) newBlock[key] = url;
      });
    }

    const sKeys = Object.keys(newSection);
    const bKeys = Object.keys(newBlock);
    if (sKeys.length === 0 && bKeys.length === 0) return;

    // 선마킹: 같은 키 중복 compress/save 방지. ★저장 실패 시 아래에서 해당 키만 롤백 → 다음 effect 런에서 자동 재시도(P0).
    [...sKeys, ...bKeys].forEach(k => persistedKeysRef.current.add(k));

    (async () => {
      try {
        const [compressedSection, compressedBlock] = await Promise.all([
          compressMap(newSection),
          compressMap(newBlock),
        ]);
        const ok = await updateLatestHistoryImages(compressedSection, compressedBlock);
        if (!ok) throw new Error('persist failed');
      } catch {
        // 실패한 키만 선마킹 해제 — 유실 영구화 방지(다음 이미지 완료 시 이 키들이 다시 저장 후보가 됨)
        [...sKeys, ...bKeys].forEach(k => persistedKeysRef.current.delete(k));
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionImages, blockImages]);

  const regenFn = useCallback(async (sec: Section): Promise<Section | null> => {
    try {
      const res = await fetch('/api/regen-section', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cat, ch, type, out, productName, productExtra, sectionNum: sec.num, sectionName: sec.name, jobKey: generationJobKey ?? undefined }),
        signal: AbortSignal.timeout(30_000),
      });
      const data = await res.json();
      return data.section ?? null;
    } catch (err) {
      console.error('[regenFn] error:', err);
      return null;
    }
  }, [cat, ch, type, out, productName, productExtra, generationJobKey]);

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
    // ★생성 중 이미지 가드 — 미완성분은 export에서 스킵되므로, 지금 받을지/기다릴지 확인.
    if (!confirmSkipGenerating(countGeneratingImages(finalSectionsForExport, sectionImages, blockImages))) return;
    setHtmlLoading(true);
    await new Promise(r => setTimeout(r, 50));
    const ok = await downloadHtml(finalSectionsForExport, meta, productName, sectionImages, blockImages, isSlide);
    if (!ok) alert('HTML 다운로드 중 오류가 발생했어요.');
    setTimeout(() => setHtmlLoading(false), 2000);
  };
  const handleMergeDownload = async () => {
    if (mergeLoading) return;
    // ★생성 중 이미지 가드 — 완성분만 합치므로, 지금 받을지/기다릴지 확인.
    if (!confirmSkipGenerating(countGeneratingImages(finalSectionsForExport, sectionImages, blockImages))) return;
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

  // 섹션 순서 변경 — 모바일은 드래그 대신 ↑↓ 버튼(터치 친화). displayIdx 기준으로 effectiveOrder 재배열.
  const moveSection = (displayIdx: number, dir: -1 | 1) => {
    const target = displayIdx + dir;
    if (target < 0 || target >= effectiveOrder.length) return;
    setSectionOrder(() => {
      const next = [...effectiveOrder];
      [next[displayIdx], next[target]] = [next[target], next[displayIdx]];
      return next;
    });
  };

  // 블로그형 섹션별 PNG 다운로드 — 데스크탑 handleFullCapture 이식(섹션당 1080폭 1장, AI 재호출 0).
  const handleFullCapture = async () => {
    if (captureLoading) return;
    // ★생성 중 이미지 가드 — 캡처는 화면 그대로라 미완성 섹션이 찍히므로, 지금 받을지/기다릴지 확인.
    if (!confirmSkipGenerating(countGeneratingImages(finalSectionsForExport, sectionImages, blockImages))) return;
    const container = captureRef.current;
    if (!container) { alert('캡처할 본문이 없습니다.'); return; }
    const units = (Array.from(container.children) as HTMLElement[]).filter(el => el.offsetHeight > 0 && el.children.length > 0);
    if (units.length === 0) { alert('캡처할 섹션이 없습니다.'); return; }
    setCaptureLoading(true);
    try {
      const { domToCanvas } = await import('modern-screenshot');
      const TARGET_W = 1080;
      const opts = {
        backgroundColor: '#ffffff', scale: 1,
        style: { width: `${TARGET_W}px`, maxWidth: `${TARGET_W}px` },
        // 수정/재생성 버튼·이미지 오버레이·편집패널은 캡처에서 제외
        filter: (node: Node) => {
          if (!(node instanceof Element)) return true;
          const c = (node as HTMLElement).className;
          const cls = typeof c === 'string' ? c : '';
          return !(cls.includes('bs-actions') || cls.includes('img-regen-overlay') || cls.includes('edit-panel') || cls.includes('img-slot-empty'));
        },
      };
      const safeName = (productName || '상세페이지').replace(/[\\/:*?"<>|]/g, '');
      if (units.length > 1) {
        alert(`${units.length}장(섹션별)으로 저장됩니다. 밴드/인스타엔 원하는 섹션만 골라 올리세요.`);
      }
      for (let idx = 0; idx < units.length; idx++) {
        const canvas = await domToCanvas(units[idx], opts);
        const blob: Blob | null = await new Promise(res => canvas.toBlob(b => res(b), 'image/png'));
        if (!blob) continue;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${safeName}_${String(idx + 1).padStart(2, '0')}.png`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
        await new Promise(r => setTimeout(r, 350)); // 다중 다운로드 간 텀
      }
    } catch (err) {
      console.error('[섹션이미지]', err);
      alert('섹션별 이미지 다운로드 중 오류가 발생했어요. 다시 시도해주세요.');
    } finally {
      setCaptureLoading(false);
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
          <button onClick={() => {
            if (!window.confirm('다시 생성하면 크레딧이 새로 차감됩니다(섹션 수만큼). 계속하시겠어요?')) return;
            go('s6');
          }} style={{ background: '#6D4CFF', color: '#fff', border: 'none', fontSize: 14, fontWeight: 700, padding: '14px', borderRadius: 14, cursor: 'pointer', fontFamily: 'inherit' }}>↻ 다시 생성</button>
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
              <div ref={captureRef} style={{ background: '#fff' }}>
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
                  {/* 순서 변경 — 모바일은 ↑↓ 버튼 */}
                  <button
                    onClick={() => moveSection(displayIdx, -1)}
                    disabled={displayIdx === 0}
                    aria-label="위로"
                    style={{ background: 'none', border: 'none', padding: 4, flexShrink: 0, display: 'flex', cursor: displayIdx === 0 ? 'default' : 'pointer' }}
                  >
                    <ChevronUp size={18} color={displayIdx === 0 ? '#DDD' : '#6D4CFF'} />
                  </button>
                  <button
                    onClick={() => moveSection(displayIdx, 1)}
                    disabled={displayIdx === effectiveOrder.length - 1}
                    aria-label="아래로"
                    style={{ background: 'none', border: 'none', padding: 4, flexShrink: 0, display: 'flex', cursor: displayIdx === effectiveOrder.length - 1 ? 'default' : 'pointer' }}
                  >
                    <ChevronDown size={18} color={displayIdx === effectiveOrder.length - 1 ? '#DDD' : '#6D4CFF'} />
                  </button>
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
        {/* 섹션별 이미지(본문 캡처) — 블로그형: 각 섹션 1080폭 PNG 1장씩(밴드/인스타용) */}
        {isBlog && (
          <button onClick={handleFullCapture} disabled={captureLoading} style={{
            width: '100%', height: 50,
            background: '#fff', color: '#111',
            border: '1px solid #ECECF2', borderRadius: 14,
            fontSize: 14, fontWeight: 700,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            cursor: captureLoading ? 'default' : 'pointer', fontFamily: 'inherit',
            opacity: captureLoading ? 0.7 : 1,
          }}>
            <ImageIcon size={16} /> {captureLoading ? '이미지 만드는 중...' : '섹션별 이미지 다운로드 (밴드/인스타용)'}
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
