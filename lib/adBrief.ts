/**
 * Clean Baseline 광고 브리프 (1차, 2026-07-16 승인) — 화장품 Hero 전용 병렬 경로.
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
 * 플래그: NEXT_PUBLIC_CLEAN_IMAGE_BRIEF (기본 OFF).
 *  - OFF: 기존 프로덕션 promptText 경로가 바이트 동일하게 유지된다.
 *  - ON: 화장품 Hero(슬라이드 계열)에서만 이 브리프가 promptText를 대체한다.
 * 롤백 = 플래그 OFF (기존 Stage4/5 코드는 무수정).
 */

export const CLEAN_IMAGE_BRIEF = (process.env.NEXT_PUBLIC_CLEAN_IMAGE_BRIEF ?? '0') === '1';

/** Clean 브리프 1차 적용 대상 — 화장품만(승인 범위). 확장은 검증 후 별도 승인. */
export function isCleanBriefTarget(cat: string | null | undefined): boolean {
  return (cat ?? '').split('/')[0].trim() === '화장품';
}

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

/**
 * 상품정보 → 간결한 광고 브리프(영문 프레임 + 셀러 원문). 순수 함수 — 같은 입력이면 같은 출력.
 * 반환값이 슬라이드 hero의 promptText 전체를 대체한다(Stage4 장면문·Stage5 baked 미사용).
 */
export function buildAdBrief(i: AdBriefInput): string {
  const name = (i.productName ?? '').trim();
  const formVol = [i.productForm, i.productVolume]
    .map(s => (s ?? '').trim()).filter(Boolean).join(' · ');
  const facts = [
    (i.productExtra ?? '').trim(),
    (i.diff ?? '').trim() ? `차별점: ${(i.diff ?? '').trim()}` : '',
  ].filter(Boolean).join('\n');
  const brandLine = [
    (i.brand ?? '').trim(),
    (i.brandIntro ?? '').trim(),
  ].filter(Boolean).join(' — ');
  const v = i.visual;
  const colors = v?.primary_color
    ? `Color family: main ${v.primary_color}${v.accent_color ? `, accent ${v.accent_color}` : ''}${v.soft_color ? `, soft ${v.soft_color}` : ''} — keep the whole ad's tone consistent with this family.`
    : '';
  const head = (i.headline ?? '').replace(/\s+$/, '');
  const sub = (i.subcopy ?? '').trim();

  return [
    `This is the HERO (first screen) of a Korean e-commerce detail page.`,
    name
      ? `Product: ${name}${formVol ? ` (${formVol})` : ''}.`
      : formVol ? `Product: ${formVol}.` : '',
    facts
      ? `Seller-provided product facts — the ONLY facts you may use:\n${facts}`
      : '',
    `Hero's job: at first glance the buyer must feel what this product is, how it feels to use, and why it fits them. Persuade like a real premium Korean brand campaign — one integrated advertisement, not a template poster with the product simply standing in the center.`,
    head
      ? `Korean copy to render crisply with exact spelling — place and size it however serves the ad best:\nHeadline: "${head}"${sub ? `\nSubcopy: "${sub}"` : ''}`
      : '',
    brandLine ? `Brand: ${brandLine}.` : '',
    colors,
    `You are the ad director. Decide the advertising strategy, the scene, the composition, whether a person appears, how the product's texture or use-feel is expressed, and where the copy sits — whatever sells THIS product best.`,
    `Hard guards:
- The product must exactly match the reference image (shape, proportions, cap/closure, label layout and lettering) — never redesign or re-typeset the label.
- Show only this product; no other containers or invented packaging.
- Text in the image is limited to the Korean copy above — never invent numbers, percentages, certifications, test results, pH or fragrance claims, ingredient lists, efficacy claims, or before/after comparisons; no medical-sounding expressions.`,
  ].filter(Boolean).join('\n\n');
}
