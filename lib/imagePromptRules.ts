/**
 * imageDesc(이미지 생성 프롬프트) 작성 규칙 — Claude에게 주는 한국어 지시.
 *
 * generate(전체 생성)·regen-section(섹션 재생성) 양쪽 route가 공유한다.
 * 구성품 폴백 가드·인물 금지·영문 강제·비율 표현 금지가 모두 여기 있으므로
 * 반드시 이 모듈만 수정할 것 (route에 복붙 금지).
 * Gemini 쪽 영문 RULES(COMPONENT_RULES 등)는 generate-image route에 있다.
 */

/** JSON 출력 형식 안내에 쓰는 imageDesc 필드 스펙 — 양쪽 route 동일 문구 유지용 */
export const IMAGE_DESC_FIELD_SPEC =
  '<natural English scene description, 1~2 sentences> | shot: <composition>, light: <lighting>, mood: <mood>, palette: <color tone>, props: <props>, surface: <background/surface>';

export function buildImagePromptRules(cat: string, isBlogOutput: boolean): string {
  const isCosmetics = cat.split('/')[0].trim() === '화장품';

  const cosmeticsImageGuide = isCosmetics
    ? `
[화장품 이미지 시각 키워드 가이드 — 영문 키워드를 섹션 역할에 맞게 자연스럽게 조합 (예시·방향이지 고정 복붙 아님)]
공통 베이스 (모든 섹션에 반영):
  · minimal Korean skincare editorial
  · soft diffused natural light from a north-facing window
  · matte beige / sand / concrete surface
  · shallow depth of field
  · calm muted tone
  · generous negative space
  · premium magazine-quality

섹션 역할별 변주 (Claude가 섹션 이름·역할 보고 적절히 선택):
  · 히어로 / 메인 후킹: 45° overhead or eye-level hero shot, product as clear focal point, subtle water droplets or dewy highlight, fresh airy mood
  · 성분 / 신뢰: ingredient props (fresh leaves, water drops, raw material) arranged with matching color tone around product, clean flat-lay or side composition
  · 사용법 / 제형 / 텍스처: macro texture shot, product texture swatch on matte surface or back of hand (no face), glossy dewy detail
  · 진정 / 효과 / before-after: close-up skin texture without face, soft healthy glow, clean clinical-fresh tone
`
    : '';

  return `
[이미지 프롬프트 작성 규칙 — imageDesc${isBlogOutput ? ' 및 image 블록의 desc' : ''} 작성 시 반드시 준수]
- 이미지에는 항상 제품(셀러가 제공한 제품)을 중심에 두세요. 원료·소재·배경·피부 디테일은 제품과 함께 보조적으로 표현합니다.
- 모든 이미지에서 제품의 모양·색·라벨이 동일하게 유지되도록 묘사하세요. 섹션·블록이 달라도 같은 제품이라는 것이 명확해야 합니다.
- 옵션/구성 섹션의 이미지는 업로드된 제품 이미지(reference)에 있는 제품만으로 구성하세요. 단품=제품 1개, 1+1=같은 제품 2개 나란히.
- reference에 시각 정보가 없는 구성품(패드, 파우치, 사은품 등)은 이미지에 그리지 마세요 — 해당 구성은 카피 텍스트로만 표현합니다.
- 모든 섹션 공통: reference에 없는 다른 화장품 용기·공병·타사 제품을 소품으로 추가하지 마세요. 연출 소품은 비제품 사물(돌, 식물, 물, 천, 트레이 등)만 사용합니다.
- 사람 얼굴/인물/전신/모델을 등장시키지 마세요. 매번 다른 얼굴이 나와 브랜드 일관성이 깨집니다.
- 단, 얼굴 없는 피부 클로즈업(피부 질감, 볼 표면, 손등 피부 등 — 인물 식별이 안 되는 디테일)은 효과 표현용으로 허용됩니다.
${isBlogOutput ? '- 이미지 안에 별도로 오버레이되는 텍스트·문구·라벨·숫자·타이포그래피를 묘사하지 마세요(제품 자체의 기존 라벨/브랜딩은 reference 그대로 유지). 깔끔한 사진 이미지여야 합니다.\n' : ''}- ⚠️ "portrait", "vertical", "9:16", "tall format" 같은 세로 긴 비율 표현은 절대 쓰지 마세요. 이미지 비율은 시스템이 섹션 역할별로 자동 지정합니다(4:5, 16:9, 1:1).
- ⚠️ imageDesc는 반드시 영문으로 작성하세요. Gemini 이미지 모델이 영어 학습 비중이 압도적이라 한국어로 쓰면 미감 디테일이 손실됩니다.
- imageDesc 출력 형식 (자연스러운 영문 묘사 + 구조화된 영문 시각 키워드):
    "<natural English scene description, 1~2 sentences> | shot: <camera angle/composition>, light: <lighting>, mood: <mood>, palette: <color tone>, props: <supporting objects>, surface: <background/surface texture>"
  예시:
    "A premium toner bottle stands on a matte sand-colored concrete surface beside fresh centella leaves carrying morning dew, captured from a slight 45-degree overhead angle. | shot: 45° overhead, shallow depth of field, product as focal point, generous negative space. light: soft diffused natural daylight from a north-facing window. mood: calm, clean, K-beauty editorial. palette: warm beige and muted green. props: fresh centella leaves, a few water droplets. surface: matte beige concrete."
${cosmeticsImageGuide}`;
}
