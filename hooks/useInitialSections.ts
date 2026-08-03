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
  const { cat, ch, type, secCnt, productName, productExtra, referenceAnalysis, captureAnalysis,
    sectionStructure, setSectionStructure, originalSections, setOriginalSections, setSectionDescs,
    structureForCount, setStructureForCount, setSectionSuggestions,
    structureForFacts, setStructureForFacts } = useApp();

  const [recommendLoading, setRecommendLoading] = useState(false);
  const initCalledRef = useRef(false);

  // ★현재 작업값 = store(sectionStructure) 단일 소스. setSecs는 store에 직접 반영 → 화면 떠났다 와도 마지막 값 유지.
  const secs = sectionStructure;
  const setSecs = (u: string[] | ((prev: string[]) => string[])) =>
    setSectionStructure(typeof u === 'function' ? (u as (p: string[]) => string[])(sectionStructure) : u);

  /* ★분량이 바뀌면 목록을 다시 만든다(2026-08-03).
   *  32섹션으로 받아본 뒤 뒤로 가서 16으로 바꿔 돌아오면 목록은 32개 그대로였다 —
   *  '한 번만 채운다'는 규칙이 '분량이 바뀌었다'는 사정을 몰랐기 때문이다.
   *  ⚠️secs.length가 아니라 structureForCount와 비교한다. 셀러가 화면에서 직접 더하고 뺀 것은
   *    분량 변경이 아니므로 다시 만들면 그 편집이 날아간다. */
  const depthChanged = enabled
    && structureForCount > 0 && secCnt > 0 && secCnt !== structureForCount;

  // 초기 채움(store가 비었을 때만) + AI 추천. enabled=false(비활성 인스턴스)면 아무것도 안 함.
  useEffect(() => {
    if (!enabled) return;
    if (initCalledRef.current && !depthChanged) return;
    initCalledRef.current = true;
    if (depthChanged) {                                    // 분량이 바뀌었으니 새로 받는다
      setOriginalSections([]);
      setSectionDescs({});
      setSectionSuggestions([]);
    } else if (sectionStructure.length > 0) return;        // 재진입/저장값 있으면 유지
    if (referenceAnalysis?.sections?.length) { setSectionStructure([...referenceAnalysis.sections]); return; }
    if (captureAnalysis?.섹션목록?.length) { setSectionStructure(captureAnalysis.섹션목록.map(s => s.타입)); return; }

    const depth: '간결' | '풍부' =
      (type === '풍부' || type === '프리미엄형') ? '풍부' : '간결';
    /* ★폴백도 고른 개수에 맞춘다(2026-08-02) — CAT_DEFAULTS는 9~13개 고정이라
     *  AI 추천이 실패하면 8/16/32 중 무엇을 골랐든 같은 개수가 나왔다. */
    const fallback = (): string[] => {
      const base = CAT_DEFAULTS[cat || '']?.[type || '기본형'] ??
        ['히어로', '공감', 'USP', '사용법', '비교표', '후기', 'FAQ', 'CTA'];
      const n = secCnt > 0 ? secCnt : base.length;
      if (base.length === n) return [...base];
      const tail = base[base.length - 1];                       // CTA는 항상 끝
      if (base.length > n) return [...base.slice(0, n - 1), tail];
      const out = base.slice(0, -1);
      /* ★뜻 없는 이름을 만들지 않는다(2026-08-03) — 전엔 '추가 섹션 2·3·4…'로 채웠다.
         AI 호출이 실패했을 때 쓰는 마지막 안전망인데, 여기서 자리표시자를 깔면
         셀러 화면엔 그냥 고장으로 보이고 그 자리에도 크레딧이 붙는다.
         실제로 쓰이는 이름으로 채우고, 모자라면 그만큼 적게 만든다. */
      const extra = [
        '상세 스펙', '사용 시나리오', '자주 묻는 질문', '배송/교환 안내', '브랜드 소개', '보관/관리',
        '구성품 안내', '이런 분께', '색상·옵션 안내', '가격 안내', '주의사항', '사용 순서',
        '제품 특징 요약', '선택 가이드', '사이즈·용량 안내', '첫 사용 안내', '관리 팁', '브랜드 약속',
      ];
      for (const e of extra) { if (out.length >= n - 1) break; if (!out.includes(e)) out.push(e); }
      return [...out, tail];
    };

    /* 요청을 보내는 순간 지난 추천을 비운다 — 응답이 오기 전까지 이전 구성의 제안이 남아
       새 구성에 대한 말인 것처럼 보인다(실측: 구성 중인데 추천이 먼저 떠 있었다). */
    setSectionSuggestions([]);
    setRecommendLoading(true);
    fetch('/api/recommend-sections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cat: cat ?? '기타',
        ch: ch ?? '스마트스토어',
        productName: productName ?? '',
        depth,
        sectionCount: secCnt || undefined,   // ★셀러가 고른 8/16/32가 우선한다
        productExtra: productExtra ?? undefined,
      }),
      signal: AbortSignal.timeout(120_000),   // 32섹션은 desc까지 쓰느라 60초를 넘긴다(실측 44초+)
    })
      .then(async r => {
        const data = await r.json();
        if (!r.ok || !Array.isArray(data?.sections) || data.sections.length === 0) {
          throw new Error(data?.error ?? '추천 실패');
        }
        setSectionStructure(data.sections as string[]);
        if (data.sectionDescs) setSectionDescs(data.sectionDescs as Record<string, string>);
        setStructureForCount(secCnt || (data.sections as string[]).length);
        setStructureForFacts(productExtra ?? '');
        setSectionSuggestions(Array.isArray(data.sectionSuggestions ?? data.suggestions) ? (data.suggestions ?? []) : []);
      })
      .catch(err => {
        console.error('[recommend-sections]', err);
        const fb = fallback();
        setSectionStructure(fb);
        setStructureForCount(secCnt || fb.length);
        setStructureForFacts(productExtra ?? '');
      })
      .finally(() => setRecommendLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, depthChanged]);

  // ★원본 추천을 store(originalSections)에 처음 1회만 보관(비었을 때만) — 이후 수정·탭이동에도 불변.
  useEffect(() => {
    if (!enabled) return;
    if (originalSections.length === 0 && sectionStructure.length > 0) {
      setOriginalSections([...sectionStructure]);
    }
  }, [enabled, sectionStructure, originalSections.length, setOriginalSections]);

  /* 상품정보가 이 구조를 만든 뒤로 달라졌는가 — 셀러가 '상품정보에 더 적기'로 다녀온 경우 */
  const factsChanged = structureForFacts !== '' && (productExtra ?? '') !== structureForFacts;

  /** 셀러가 눌렀을 때만 다시 잡는다(무료·AI 재호출). 손으로 고친 구성이 사라지므로 확인은 호출부에서. */
  const rebuild = () => {
    initCalledRef.current = false;
    setSectionStructure([]);
    setOriginalSections([]);
    setSectionDescs({});
    setSectionSuggestions([]);
    setStructureForFacts('');
  };

  return { factsChanged, rebuild, secs, setSecs, recommendLoading, original: originalSections };
}
