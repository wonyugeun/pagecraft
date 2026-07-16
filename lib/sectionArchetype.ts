/**
 * 섹션 컷 아키타입(8종) — 섹션 역할 분류 어휘.
 *
 * Phase C(Clean Baseline, 2026-07-16): 구 디렉션 스택(Scene Library·구도/강도 배정·
 * 프롬프트 조각)은 전부 삭제됨 — 이미지 방향은 Creative Director(lib/stages/director)+
 * buildSectionBrief(lib/adBrief)가 담당한다. 이 파일은 분류 함수만 남긴다.
 *
 * 현재 사용처:
 *  - Required Asset 선정(lib/sectionReference.selectRequiredAssetIndex) — Asset-first 가드
 *  - Stage4 imagebrief의 product_visibility 밴드 clamp(블로그 경로 브리프용)
 */

export type CutArchetype =
  | 'hero'              // 모델+제품 화보 (첫 섹션)
  | 'empathy'           // 라이프스타일 상황 — 제품 조연
  | 'ingredient_macro'  // 원료 클로즈업 — 제품은 소품
  | 'texture'           // 제형·발림 클로즈업
  | 'clinical'          // 신뢰·검증 — 미니멀 스튜디오
  | 'editorial'         // 브랜드 무드컷
  | 'product_only'      // 제품 단독 스튜디오 (기본값)
  | 'cta';              // 모델+제품+구매정보

/* 키워드 → 아키타입. 우선순위: 구체적 신호(cta·hero·성분)가 포괄 신호(신뢰·공감)보다 먼저 —
   예: "성분 신뢰"는 ingredient_macro로(원료 컷이 신뢰 스튜디오보다 그 섹션에 맞음). */
const CTA_KEYS        = ['cta', '구매', '결제', '마무리', '결정', '클로징', '클릭'];
const HERO_KEYS       = ['히어로', '메인', '후킹', '오프닝', '인트로'];
const INGREDIENT_KEYS = ['성분', '원료', '함량', '추출물', '유래'];
const TEXTURE_KEYS    = ['제형', '텍스처', '발림', '사용감', '사용법', '루틴', '흡수'];
const CLINICAL_KEYS   = ['신뢰', '인증', '테스트', '안전', '검증', '비교', '후기', '리뷰', '스펙', 'faq', '의심', '이의', '보증'];
const EMPATHY_KEYS    = ['공감', '고민', '일상', '불편', '걱정', '망설', '원인', '이유', '왜'];
const EDITORIAL_KEYS  = ['브랜드', '스토리', '감성', '무드', '세계관', '철학', '약속'];

export function classifyCutArchetype(name = '', role = '', emotion = ''): CutArchetype {
  const hay = `${name} ${role} ${emotion}`.toLowerCase();
  const hit = (keys: string[]) => keys.some(k => hay.includes(k.toLowerCase()));
  if (hit(CTA_KEYS))        return 'cta';
  if (hit(HERO_KEYS))       return 'hero';
  if (hit(INGREDIENT_KEYS)) return 'ingredient_macro';
  if (hit(TEXTURE_KEYS))    return 'texture';
  if (hit(CLINICAL_KEYS))   return 'clinical';
  if (hit(EMPATHY_KEYS))    return 'empathy';
  if (hit(EDITORIAL_KEYS))  return 'editorial';
  return 'product_only';
}
