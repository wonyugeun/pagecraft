'use client';

import { useState, useEffect, useRef } from 'react';
import { useApp } from '@/store/AppContext';
import { CAT_DEFAULTS } from '@/components/screens/SectionStructureScreen';

/**
 * 섹션구조 초기화/상태 — 데스크탑/모바일 공용 훅(중복 구현 방지).
 *
 * ★상태 3개 구분:
 *   - secs            = 현재 작업값. ★store(sectionStructure) 단일 소스 — 삭제·추가·순서·되돌리기가 즉시 store에 반영 → 화면 이동에 유지.
 *   - originalSections = 처음 받은 AI/레퍼런스 추천 원본(되돌리기용, 1회 보관·불변).
 *   - setSecs         = store(sectionStructure)에 반영하는 setter.
 *
 * 초기 채움 우선순위: 저장값(sectionStructure) > 레퍼런스 > 캡처 > AI(recommend-sections, 동적). AI 실패 시 CAT_DEFAULTS 폴백.
 * recommend-sections는 크레딧 미차감(과금 없음).
 *
 * @param enabled  false면 부수효과(AI 호출·원본 보관) 비활성 — 모바일에서 데스크탑 컴포넌트가 동시 마운트되며
 *                 생기는 '이중 인스턴스'가 store를 덮어쓰지 않게(데스크탑 인스턴스 enabled=!isMobile).
 */
export function useInitialSections(enabled: boolean = true) {
  const { cat, ch, type, productName, productExtra, referenceAnalysis, captureAnalysis,
    sectionStructure, setSectionStructure, originalSections, setOriginalSections } = useApp();

  const [recommendLoading, setRecommendLoading] = useState(false);
  const initCalledRef = useRef(false);

  // ★현재 작업값 = store(sectionStructure) 단일 소스. setSecs는 store에 직접 반영 → 화면 떠났다 와도 마지막 값 유지.
  const secs = sectionStructure;
  const setSecs = (u: string[] | ((prev: string[]) => string[])) =>
    setSectionStructure(typeof u === 'function' ? (u as (p: string[]) => string[])(sectionStructure) : u);

  // 초기 채움(store가 비었을 때만) + AI 추천. enabled=false(비활성 인스턴스)면 아무것도 안 함.
  useEffect(() => {
    if (!enabled) return;
    if (initCalledRef.current) return;
    initCalledRef.current = true;
    if (sectionStructure.length > 0) return;              // 재진입/저장값 있으면 유지
    if (referenceAnalysis?.sections?.length) { setSectionStructure([...referenceAnalysis.sections]); return; }
    if (captureAnalysis?.섹션목록?.length) { setSectionStructure(captureAnalysis.섹션목록.map(s => s.타입)); return; }

    const depth: '간결' | '풍부' =
      (type === '풍부' || type === '프리미엄형') ? '풍부' : '간결';
    const fallback = (): string[] =>
      CAT_DEFAULTS[cat || '']?.[type || '기본형'] ??
      ['히어로', '공감', 'USP', '사용법', '비교표', '후기', 'FAQ', 'CTA'];

    setRecommendLoading(true);
    fetch('/api/recommend-sections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cat: cat ?? '기타',
        ch: ch ?? '스마트스토어',
        productName: productName ?? '',
        depth,
        productExtra: productExtra ?? undefined,
      }),
      signal: AbortSignal.timeout(60_000),
    })
      .then(async r => {
        const data = await r.json();
        if (!r.ok || !Array.isArray(data?.sections) || data.sections.length === 0) {
          throw new Error(data?.error ?? '추천 실패');
        }
        setSectionStructure(data.sections as string[]);
      })
      .catch(err => {
        console.error('[recommend-sections]', err);
        setSectionStructure(fallback());
      })
      .finally(() => setRecommendLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  // ★원본 추천을 store(originalSections)에 처음 1회만 보관(비었을 때만) — 이후 수정·탭이동에도 불변.
  useEffect(() => {
    if (!enabled) return;
    if (originalSections.length === 0 && sectionStructure.length > 0) {
      setOriginalSections([...sectionStructure]);
    }
  }, [enabled, sectionStructure, originalSections.length, setOriginalSections]);

  return { secs, setSecs, recommendLoading, original: originalSections };
}
