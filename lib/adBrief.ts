/**
 * Clean Baseline 광고 브리프 — 전 섹션·전 카테고리 (Phase C부터 기본 경로).
 *
 * 목적: 상품정보를 GPT가 실제 광고 전략으로 변환하게 한다(스크래치 3제품 검증 통과 —
 * 리프그린/아쿠아리프/클리어베일, runs/clean-baseline). 시스템은 사실과 보존만 통제하고
 * 구도는 GPT가 판단한다.
 *
 * 원칙:
 *  - 여기서 조립하는 브리프에는 구도·위치·존·아이콘·조명·시점·Scene·Archetype 지시를
 *    생성하지 않는다(금지). 모델 사용도 강제/금지하지 않는다 — 인물 안전은 서버
 *    PEOPLE_RULES(조건부)가 담당.
 *  - 입력은 실제 앱 필드만 매핑하고, 없는 값은 추측하지 않고 생략한다.
 *  - 서버 가드(PRODUCT/COMPONENT/NO_FAKE 등)·edits ref·quota는 기존 generate-image
 *    route가 그대로 적용(이 모듈은 promptText만 대체).
 *
 * 플래그: NEXT_PUBLIC_CLEAN_IMAGE_BRIEF — 기본 ON(Phase C). 0으로 끄면 디렉터 호출 없이
 * buildSectionBrief(director:null) 자유 브리프로 동작한다(구 디렉션 스택은 삭제됨).
 */

import type { DirectorPlan } from '@/lib/stages/director';

/** Clean Baseline 스위치 — Phase C부터 기본 ON. 문제 시 .env에 NEXT_PUBLIC_CLEAN_IMAGE_BRIEF=0 후 재빌드로 롤백.
 *  (단 Phase C에서 구 디렉션 스택이 삭제되므로 OFF 시 폴백은 buildSectionBrief(director:null) = v1 자유 브리프) */
export const CLEAN_IMAGE_BRIEF = (process.env.NEXT_PUBLIC_CLEAN_IMAGE_BRIEF ?? '1') === '1';

export interface AdBriefInput {
  /** 제품명 — AppContext.productName */
  productName?: string | null;
  /** 제품 형태 — AppContext.productForm (ProductScreen select, 선택 입력) */
  productForm?: string | null;
  /** 용량 — AppContext.productVolume (선택 입력) */
  productVolume?: string | null;
  /** 셀러 특징 자유 텍스트 — AppContext.productExtra. 제형·사용법·판매포인트·타깃이
   *  실제로 들어오는 자리(구조화 필드 없음 → 원문 그대로 전달, 항목 분해·보강 금지) */
  productExtra?: string | null;
  /** 차별점 — AppContext.diff (선택 입력) */
  diff?: string | null;
  /** 브랜드명/소개 — AppContext.brand / brandIntro (선택 입력) */
  brand?: string | null;
  brandIntro?: string | null;
  /** Stage3 셀러 카피 — sections[i].headline / .subcopy */
  headline?: string | null;
  subcopy?: string | null;
  /** Stage1 큐레이션 팔레트 — sections[i].visual (hex, 브랜드 톤 일관성 가드) */
  visual?: { primary_color?: string; accent_color?: string; soft_color?: string } | null;
}

/* ═══════════ Phase B — 디렉터 플랜 결합 전 섹션 브리프 ═══════════ */

export interface SectionBriefInput extends AdBriefInput {
  /** Creative Director 출력(페이지당 1회) — null이면 디렉터 없는 v1 형식으로 폴백 */
  director?: DirectorPlan | null;
  /** 이 브리프가 만들 섹션 이름(디렉터 sections에서 show를 찾는 키) */
  sectionName?: string;
}

/**
 * 섹션 1개의 이미지 브리프 — 디렉터의 페이지 컨셉·섹션 목적·인물 결정을 결합한다.
 * 전 섹션·전 카테고리 공용(Phase B). 구도·존·아이콘·조명·시점 지시는 여기서 생성하지 않는다.
 * 카피가 없는 섹션은 "이미지 내 텍스트 금지"로 조립된다(비히어로 안전 기본값).
 */
export function buildSectionBrief(i: SectionBriefInput): string {
  const name = (i.productName ?? '').trim();
  const formVol = [i.productForm, i.productVolume]
    .map(s => (s ?? '').trim()).filter(Boolean).join(' · ');
  const facts = [
    (i.productExtra ?? '').trim(),
    (i.diff ?? '').trim() ? `차별점: ${(i.diff ?? '').trim()}` : '',
  ].filter(Boolean).join('\n');
  const brandLine = [(i.brand ?? '').trim(), (i.brandIntro ?? '').trim()].filter(Boolean).join(' — ');
  const v = i.visual;
  const colors = v?.primary_color
    ? `Color family: main ${v.primary_color}${v.accent_color ? `, accent ${v.accent_color}` : ''}${v.soft_color ? `, soft ${v.soft_color}` : ''} — keep the whole ad's tone consistent with this family.`
    : '';
  const head = (i.headline ?? '').replace(/\s+$/, '');
  const sub = (i.subcopy ?? '').trim();
  const secName = (i.sectionName ?? '').trim();

  const d = i.director ?? null;
  const show = d?.sections?.find(s => s.name === secName)?.show ?? '';
  const person = d
    ? (d.person?.use && d.person.spec
        ? `Person (this page's creative director decided): ${d.person.spec} — keep this same person consistent with the other sections of this page.`
        : `No people in this page (creative director's decision).`)
    : '';

  const withCopy = !!head;

  return [
    `This is the "${secName || 'HERO'}" section of a Korean e-commerce detail page.`,
    name
      ? `Product: ${name}${formVol ? ` (${formVol})` : ''}.`
      : formVol ? `Product: ${formVol}.` : '',
    facts ? `Seller-provided product facts — the ONLY facts you may use:\n${facts}` : '',
    d ? `Page ad concept (decided by this page's creative director — every section of this page lives in this one world):\n${d.selected_concept}` : '',
    show ? `This section must show: ${show}` : '',
    person,
    withCopy
      ? `Korean copy to render crisply with exact spelling — place and size it however serves the ad best:\nHeadline: "${head}"${sub ? `\nSubcopy: "${sub}"` : ''}`
      : `No copy text is provided for this section — do not render any text in the image.`,
    brandLine ? `Brand: ${brandLine}.` : '',
    colors,
    d
      ? `Execute the concept like a top Korean commercial photographer: YOU decide the exact composition, framing, camera and styling that best realizes this concept for THIS section. Do not fall back to a generic template layout.`
      : `You are the ad director. Decide the advertising strategy, the scene, the composition, whether a person appears, how the product's texture or use-feel is expressed, and where the copy sits — whatever sells THIS product best.`,
    `Hard guards:
- The product must exactly match the reference image (shape, proportions, cap/closure, label layout and lettering) — never redesign or re-typeset the label.
- Show only this product; no other containers or invented packaging.
- ${withCopy ? 'Text in the image is limited to the Korean copy above' : 'No text in the image'} — never invent numbers, percentages, certifications, test results, pH or fragrance claims, ingredient lists, efficacy claims, or before/after comparisons; no medical-sounding expressions.`,
  ].filter(Boolean).join('\n\n');
}
