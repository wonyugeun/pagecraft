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

/* ── Hero Model Policy — 카테고리 게이트(1차, 2026-07-15) ──
 * 배경: hero가 4중 스택(L1 여기 peopleRule·L2 imagebrief 스펙·L3 HERO_SCENES 불변식·
 * L4 composeBrief SUBJECT)으로 모델을 강제해, 갈치·그래놀라 같은 식품에서도
 * "여성 모델+제품 들고+웃음" 구조가 반복(템플릿감)되고 제품이 손 크기에 맞춰 과대 렌더됨.
 * 모델 hero 허용(착용·사용감 카테고리): 화장품·패션·유아 — 기존 동작 그대로.
 * 제품 중심 hero(1차): 식품만. 2차 확장(가전·생활 등)은 식품 검증 후 별도 결정.
 * 이 상수가 단일 정책 소스 — 여기(peopleRule)와 imagebrief(scene 선택 skip)가 함께 참조. */
export const PRODUCT_HERO_CATEGORIES = new Set(['식품']);
export function isProductHeroCategory(cat: string): boolean {
  return PRODUCT_HERO_CATEGORIES.has((cat ?? '').split('/')[0].trim());
}

/**
 * Stage4 V2 전용 이미지 규칙 — image_mission(왜 이 사진인가) 우선 설계용.
 * 옛 엔진(generate/regen)이 쓰는 buildImagePromptRules는 그대로 두고, V2(imagebrief)만 이걸 쓴다.
 *
 * AI(Claude)에게 주는 "생성 가이드"이며, 강제 가드(인물/날조/텍스트/제품일관성)는
 * generate-image route의 코드 negation이 한 번 더 막는다(역할 분리: AI 생성 + 코드 가드).
 */
export function buildV2ImageRules(cat: string, isSlide = false): string {
  const isCosmetics = cat.split('/')[0].trim() === '화장품';

  // ★슬라이드형은 모델을 "지시"(허용이 아님) — 메디힐식 에디토리얼 광고컷. 블로그는 기존(얼굴 화보 금지) 유지.
  //   단 제품 중심 카테고리(식품 1차)는 hero에서 모델을 끄고 제품 패키지 중심으로(Hero Model Policy).
  const peopleRule = isSlide
    ? (isProductHeroCategory(cat)
      ? `- [인물 정책 — 슬라이드형·제품 중심 카테고리(식품)] ★hero 섹션은 모델 없이 "제품 패키지가 주인공"인 히어로를 설계하세요: 실제 판매 페이지처럼 아침 식탁·산지·원물·신선함·포장 신뢰 무드를 보조 요소로(예: 식탁 위에 자연스럽게 놓인 제품 + 주변에 원물·그릇·섭취 장면 소품). 제품은 실제 크기감 그대로 — 손에 들리게 하지 말고, 화면을 과도하게 점유하지 않게 자연스러운 스케일로 배치하세요. cta 섹션은 기존대로 "제품을 손에 든 한국인 모델(얼굴 포함, 상반신)"을 허용하되 hero와 겹치지 않는 연출로. 그 외 archetype(원료/제형/스튜디오/무드컷)은 모델 없이 지정된 장면 유지(empathy는 상황 연출상 인물 등장 가능하되 제품이 조연). 제품은 reference 제품과 동일해야 합니다.`
      : `- [인물 정책 — 슬라이드형, ⚠️아래 감정별 변주 예시의 "no face" 문구보다 이 정책이 우선] archetype이 hero·cta인 섹션은 반드시 "제품을 손에 든 한국인 모델(얼굴 포함, 상반신)"을 prompt에 명시적으로 묘사하세요 — 프리미엄 뷰티 광고 화보처럼. ⚠️단 cta는 hero와 다른 연출로 변주하세요(정면 응시+가슴 앞 홀딩 반복 금지): 자연스럽게 사용하는 동작, 창가 자연광 아래, 제품을 내미는 손, 시선을 화면 밖에 둔 컷, 옆모습 클로즈업 등에서 hero와 겹치지 않는 하나를 고르세요. 그 외 archetype(원료/제형/스튜디오/무드컷)은 모델 없이 지정된 장면 유지(empathy는 상황 연출상 인물 등장 가능하되 제품이 조연). 모델이 든 제품은 reference 제품과 동일해야 합니다. (지금 단계는 얼굴 일관성 불필요 — 컷마다 얼굴이 달라도 됩니다.)`)
    : `- [인물 정책] 얼굴 없는 피부 클로즈업(붉어진 볼·턱선·목), 손, 신체 일부, 따가운 순간·상황 연출은 허용합니다(감정 전달용). 단 식별되는 동일 인물의 얼굴 전체·브랜드 모델·착용 화보는 금지(향후 가상모델 시스템 담당).`;

  const cosmeticsGuide = isCosmetics
    ? `
[화장품 이미지 시각 키워드 (영문, 방향 — image_mission에 맞게 선택·조합. 고정 복붙 아님)]
공통 베이스: minimal Korean skincare editorial · soft diffused natural light · matte beige/sand/concrete or clean white surface · shallow depth of field · calm muted tone · generous negative space · magazine-quality.
감정별 변주:
  · 공감(불편함): macro skin close-up (cheek/jawline only, no face) showing mild redness/dryness/tightness, vulnerable honest light. 제품은 거의/전혀 없음.
  · 원인(각성): fingertip touching a tight/irritated skin patch, or environmental stress cue on skin (no face). 제품 없음.
  · 솔루션(진정): product + soothed dewy skin (back of hand) + centella, weightless watery sheen, relief.
  · 신뢰(안정감): the clear colorless formula in clean hands or on clinical white set — transparency = safety. 인증/수치/마크 절대 그리지 말 것(분위기만).
  · CTA(구매욕): warm hero product shot, golden light, premium invitation. 제품이 주인공.
`
    : '';

  return `
[이미지 규칙 — image_mission(왜 이 사진인가)을 먼저 정한 뒤 이를 만족시키는 컷을 도출. shot_type은 결과값]
- ⭐결정 순서: emotion_goal → target_fear/target_desire → headline+body(함께 읽어 visual_focus 도출) → mission → (그 결과로) shot_type/구도/prompt. shot_type부터 정하지 마세요.
- ⭐모든 컷에 제품을 강제로 넣지 마세요. 공감·원인 섹션은 제품보다 "상황·감정(피부)"이 주인공입니다(product_visibility 0~20%). 솔루션·신뢰는 제품+근거, CTA는 제품 히어로.
- ⭐target_desire를 페이지 전체에서 반복 환기하되 같은 장면 반복 금지 — 섹션마다 다른 상황·다른 연출로 변주.
${peopleRule}
- [미입력 사실 날조 금지] 인증 마크·수치·시험 결과·EWG 등급·임상 데이터·그래프·배지를 이미지에 그리지 마세요(셀러 미입력 사실). "테스트/검증"은 임의 데이터가 아니라 clinical·clean한 "분위기"로만 표현.
- [전후 사진 금지 — 표시광고법] 피부·상태의 비포/애프터 비교 연출을 그리지 마세요: 2분할(좌우/상하) 전후 화면, "붉은 피부 → 맑은 피부" 나란히 비교, 사용 전후 대비 화면 전부 금지(실증자료 없는 전후 오인 광고). "전과 후" 류 섹션도 건강한 단일 상태 연출 한 장면으로만 표현.
- [제품 일관성] 제품이 등장하는 컷은 reference 이미지의 제품과 동일한 형태·색·라벨·브랜드를 유지하세요(섹션이 달라도 같은 제품). ⚠️prompt에 제품명·라벨 문구를 영문으로 지어 적지 마세요(예: "centella calming toner bottle" 금지 → "the toner bottle from the reference"로) — 라벨 텍스트는 reference 이미지가 결정하며, prompt에 적힌 제품명이 라벨을 덮어씁니다. reference에 없는 화장품 용기·구성품을 추가하지 마세요. 연출 소품은 비제품(돌·식물·물·천·트레이)만.
- [블로그형] 이미지 안에 텍스트·문구·숫자·타이포그래피를 그리지 마세요(제품 자체의 reference 라벨만 유지). 깨끗한 사진.
- ⚠️ "portrait/vertical/9:16/tall" 등 비율 표현 금지(비율은 시스템이 섹션별로 확정).
- ⚠️ prompt는 반드시 영문(Gemini 미감 보존).${cosmeticsGuide}`;
}

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
