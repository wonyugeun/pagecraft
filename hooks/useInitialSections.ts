'use client';

import { useState, useEffect, useRef } from 'react';
import { useApp } from '@/store/AppContext';
import { CAT_DEFAULTS } from '@/components/screens/SectionStructureScreen';

/**
 * 섹션구조 초기화 — 데스크탑/모바일 공용 훅(중복 구현 방지).
 * 우선순위: 저장값(sectionStructure) > 레퍼런스 > 캡처 > AI(recommend-sections, 카테고리×타입×채널 동적).
 * - 레퍼런스/캡처 있으면 AI 호출 안 함(우선순위 유지).
 * - AI 실패/타임아웃 시 CAT_DEFAULTS[cat][type] 폴백(없으면 기본 8섹션).
 * - recommend-sections는 크레딧 미차감(과금 없음) — 추천만.
 * @returns { secs, setSecs, recommendLoading }
 */
export function useInitialSections() {
  const { cat, ch, type, productName, productExtra, referenceAnalysis, captureAnalysis, sectionStructure } = useApp();

  // 우선순위 1~3 (저장된 거 / 레퍼런스 / 캡처). 통과 시 [] 반환 → useEffect에서 AI 추천 호출.
  const getInitial = (): string[] => {
    if (sectionStructure.length) return [...sectionStructure];
    if (referenceAnalysis?.sections?.length) return [...referenceAnalysis.sections];
    if (captureAnalysis?.섹션목록?.length) return captureAnalysis.섹션목록.map(s => s.타입);
    return [];
  };

  const [secs, setSecs] = useState<string[]>(getInitial);
  // ★원본 추천 구조 보관 — 셀러가 수정해도 처음 받은 구조를 기억. '되돌리기'에서 AI 재호출 없이 이 값으로 즉시 복원(무료).
  const [original, setOriginal] = useState<string[]>(getInitial);
  const [recommendLoading, setRecommendLoading] = useState(false);
  const recommendCalledRef = useRef(false);

  // 4순위 진입: AI 추천 호출. 1~3순위 통과 시 secs가 이미 채워져 있어 skip.
  useEffect(() => {
    if (recommendCalledRef.current) return;
    recommendCalledRef.current = true;
    if (secs.length > 0) return; // 1~3순위 이미 적용된 상태
    // 레퍼런스가 있으면 절대 호출하지 않음 (우선순위 유지)
    if (referenceAnalysis?.sections?.length || captureAnalysis?.섹션목록?.length) return;

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
        setSecs(data.sections as string[]);
        setOriginal(data.sections as string[]);   // 원본 추천 보관
      })
      .catch(err => {
        console.error('[recommend-sections]', err);
        const fb = fallback();
        setSecs(fb);
        setOriginal(fb);   // 폴백도 원본으로 보관
      })
      .finally(() => setRecommendLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { secs, setSecs, recommendLoading, original };
}
