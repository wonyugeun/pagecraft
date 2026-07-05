/**
 * 슬라이드형 컷 아키타입(8종) — 섹션 역할을 "어떤 종류의 컷인가"로 분류하는 공유 어휘.
 *
 * 사용처 2곳이 같은 기준을 공유해야 브리프(설계)와 최종 프롬프트(레이아웃)가 어긋나지 않는다:
 *  - lib/stages/imagebrief.ts: 섹션별 archetype 지정(브리프 장면 지시) + product_visibility 밴드
 *  - lib/slideBaked.ts: archetype별 레이아웃 분기(hero·cta만 3층, 그 외 장면 지시)
 *
 * 서버 의존 0 — 클라이언트(ResultScreen/Mobile)에서도 import 안전.
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

/* ── Composition(구도) — enum 고정 10종. 아키타입별 허용 구도에서 페이지 단위 순회 배정(인접 중복 금지). ── */
export type Composition =
  | 'center' | 'left_heavy' | 'right_heavy' | 'diagonal' | 'top_view'
  | 'flat_lay' | 'extreme_closeup' | 'low_angle' | 'symmetric' | 'negative_space';

export const ARCHETYPE_COMPOSITIONS: Record<CutArchetype, Composition[]> = {
  hero:             ['center', 'left_heavy', 'right_heavy'],
  empathy:          ['negative_space', 'left_heavy', 'right_heavy', 'diagonal'],
  ingredient_macro: ['top_view', 'flat_lay', 'extreme_closeup', 'diagonal'],
  texture:          ['extreme_closeup', 'top_view', 'diagonal'],
  clinical:         ['symmetric', 'center', 'negative_space'],
  editorial:        ['negative_space', 'diagonal', 'low_angle', 'left_heavy'],
  product_only:     ['center', 'low_angle', 'symmetric', 'negative_space'],
  cta:              ['center', 'symmetric', 'low_angle'],
};

/** 이미지 프롬프트에 주입할 영문 구도 지시 — enum당 고정 문구(자유 텍스트 금지) */
export const COMPOSITION_PHRASES: Record<Composition, string> = {
  center:          'centered subject, balanced framing',
  left_heavy:      'subject weighted to the left third, open copy space on the right',
  right_heavy:     'subject weighted to the right third, open copy space on the left',
  diagonal:        'dynamic diagonal arrangement across the frame',
  top_view:        'top-down 90-degree overhead view',
  flat_lay:        'styled flat lay arrangement on a surface',
  extreme_closeup: 'extreme macro close-up, subject fills the frame',
  low_angle:       'low camera angle looking slightly up, monumental feel',
  symmetric:       'strict symmetric composition on a centered axis',
  negative_space:  'minimal composition with generous negative space',
};

/** 페이지 단위 구도 배정 — 아키타입별 허용 목록을 순회하되 인접 섹션 동일 구도 금지. */
export function assignCompositions(archetypes: CutArchetype[]): Composition[] {
  const counters: Partial<Record<CutArchetype, number>> = {};
  const out: Composition[] = [];
  for (let i = 0; i < archetypes.length; i++) {
    const allowed = ARCHETYPE_COMPOSITIONS[archetypes[i]];
    const start = counters[archetypes[i]] ?? 0;
    let pick = allowed[start % allowed.length];
    // 인접 중복 회피 — 허용 목록 안에서 다음 후보로 순회(전부 같으면 그대로)
    for (let k = 1; k < allowed.length && out[i - 1] === pick; k++) {
      pick = allowed[(start + k) % allowed.length];
    }
    counters[archetypes[i]] = start + 1;
    out.push(pick);
  }
  return out;
}

/* ── Intensity(연출 강도) — 3단계 리듬. 페이지가 강-약-강으로 읽히게 아키타입에 고정 매핑. ── */
export type Intensity = 'strong' | 'medium' | 'quiet';

export const ARCHETYPE_INTENSITY: Record<CutArchetype, Intensity> = {
  hero:             'strong',
  cta:              'strong',
  ingredient_macro: 'medium',
  texture:          'medium',
  clinical:         'medium',
  empathy:          'quiet',
  editorial:        'quiet',
  product_only:     'quiet',
};

/** 이미지 프롬프트에 주입할 영문 강도 지시 — enum당 고정 문구 */
export const INTENSITY_PHRASES: Record<Intensity, string> = {
  strong: 'Styling intensity: strong — high-impact, densely styled, bold dramatic presence.',
  medium: 'Styling intensity: medium — balanced editorial density.',
  quiet:  'Styling intensity: quiet — minimal styling, abundant negative space, very few props, calm subdued lighting.',
};

/* ═══════════════════════════════════════════════════════════════════
   Scene Library — Archetype 아래 "장면 사전" 계층.
   구조: Archetype → Scene Library → Scene 선택 → Prompt (선택·주입은 후속 작업)

   ⚠️현 단계는 데이터 구조만: imagebrief 미연결, 프롬프트 미생성, GPT 미호출.
   ⚠️Hero만 구현 — 다른 Archetype의 라이브러리는 후속 작업에서 추가.
   ═══════════════════════════════════════════════════════════════════ */

/* ── 촬영 레시피 enum — 전부 고정 union(자유 텍스트 금지). 추후 프롬프트 영문 문구로 번역될 어휘. ── */
export type CameraAngle       = 'eye_level' | 'high_angle' | 'low_angle' | 'top_down';
export type CameraDistance    = 'extreme_closeup' | 'closeup' | 'medium' | 'medium_wide' | 'wide';
export type LensStyle         = 'macro' | 'standard_50mm' | 'portrait_85mm' | 'wide_35mm' | 'telephoto_compressed';
export type ProductPosition   = 'center' | 'left_third' | 'right_third' | 'foreground' | 'held_by_model';
export type ModelPosition     = 'none' | 'center' | 'left' | 'right' | 'behind_product' | 'in_mirror';
export type NegativeSpaceAmt  = 'minimal' | 'moderate' | 'generous' | 'extreme';
export type BackgroundMaterial = 'seamless_paper' | 'plaster_wall' | 'fabric_drape' | 'velvet' | 'gradient' | 'interior' | 'window' | 'water';
export type SurfaceMaterial   = 'none' | 'matte_stone' | 'polished_stone' | 'glossy_acrylic' | 'glass' | 'wood' | 'concrete' | 'fabric' | 'ceramic' | 'water_surface';
export type PropStyle         = 'none' | 'light_only' | 'botanical' | 'water_droplets' | 'glass_vessels' | 'fabric_layers' | 'stone_elements' | 'everyday_objects';
export type ReflectionStyle   = 'none' | 'subtle' | 'mirror' | 'glass_refraction' | 'water_reflection';
export type ShadowStyle       = 'none' | 'soft_diffused' | 'hard_cast' | 'long_directional' | 'floating_subtle';
export type DepthOfField      = 'deep' | 'medium' | 'shallow' | 'extreme_shallow';

export interface SceneSpec {
  scene_id: string;                          // 고유 id (예: 'hero_beauty')
  name: string;                              // 한국어 표시명
  description: string;                       // 이 장면이 무엇이고 언제 쓰나 (한국어)
  recommended_compositions: Composition[];   // 권장 구도 — 기존 Composition enum 재사용
  recommended_lighting: string;              // 권장 조명 (영문 — 추후 프롬프트 주입용)
  recommended_product_ratio: [number, number]; // 제품 노출 비중 권장 [min,max] %
  recommended_model_ratio: [number, number];   // 모델 노출 비중 권장 [min,max] % (0=모델 없음)
  recommended_background: string;            // 권장 배경 (영문 — 추후 프롬프트 주입용)
  // ── 촬영 레시피(전부 enum) — 실제 광고 촬영 지시 수준의 구체성 ──
  camera_angle: CameraAngle;
  camera_distance: CameraDistance;
  lens_style: LensStyle;
  product_position: ProductPosition;
  model_position: ModelPosition;
  negative_space: NegativeSpaceAmt;
  background_material: BackgroundMaterial;
  surface_material: SurfaceMaterial;
  prop_style: PropStyle;
  reflection: ReflectionStyle;
  shadow_style: ShadowStyle;
  depth_of_field: DepthOfField;
  // ── 장면별 지킬 것/금지 규칙 (영문 — 추후 프롬프트의 positive/negative 지시로 번역될 어휘) ──
  positive_rules: string[];
  negative_rules: string[];
}

/** Hero 아키타입 Scene Library — 6종(★다이어트 2차: 15→6).
 *  5개 브랜드 80장 검증에서 실제 발화한 장면(clean·lifestyle·luxury) + 계약 축 커버(beauty·campaign·clinical)만 유지.
 *  값은 K뷰티 에디토리얼 광고 기준 초안.
 *  ⚠️Hero 최상위 규칙: 모델 필수 — Scene은 하위 개념이라 이 규칙을 덮어쓸 수 없다.
 *    전 장면 불변식: recommended_model_ratio min ≥ 30, model_position ≠ 'none'.
 *    (제품 단독 컷은 product_only 아키타입 소관 — Hero 라이브러리에 두지 않는다.) */
export const HERO_SCENES: SceneSpec[] = [
  {
    scene_id: 'hero_beauty',
    name: '뷰티 화보',
    description: '모델이 제품을 든 정통 뷰티 광고 화보 — 피부 결과 제품이 동급 주인공.',
    recommended_compositions: ['center', 'left_heavy', 'right_heavy'],
    recommended_lighting: 'soft beauty-dish key light with gentle fill, luminous skin',
    recommended_product_ratio: [40, 70],
    recommended_model_ratio: [50, 80],
    recommended_background: 'seamless studio backdrop in a warm neutral tone',
    camera_angle: 'eye_level', camera_distance: 'medium', lens_style: 'portrait_85mm',
    product_position: 'held_by_model', model_position: 'center', negative_space: 'moderate',
    background_material: 'seamless_paper', surface_material: 'none', prop_style: 'light_only',
    reflection: 'none', shadow_style: 'soft_diffused', depth_of_field: 'shallow',
    positive_rules: ['flawless glowing skin', 'model and product sharing focus', 'polished commercial beauty-ad finish'],
    negative_rules: ['cluttered props', 'harsh unflattering shadows', 'exaggerated posing', 'hair covering the face'],
  },
  {
    scene_id: 'hero_campaign',
    name: '캠페인 메인컷',
    description: '브랜드 캠페인 키비주얼 — 임팩트 최우선, 대형 카피와 공존하는 밀도 높은 컷.',
    recommended_compositions: ['center', 'symmetric'],
    recommended_lighting: 'bold high-contrast studio lighting with a defined rim light',
    recommended_product_ratio: [50, 80],
    recommended_model_ratio: [40, 70],
    recommended_background: 'saturated brand-color seamless backdrop',
    camera_angle: 'low_angle', camera_distance: 'medium', lens_style: 'standard_50mm',
    product_position: 'center', model_position: 'behind_product', negative_space: 'minimal',
    background_material: 'gradient', surface_material: 'glossy_acrylic', prop_style: 'none',
    reflection: 'subtle', shadow_style: 'hard_cast', depth_of_field: 'deep',
    positive_rules: ['bold saturated backdrop', 'poster-ready impact', 'strong confident presence'],
    negative_rules: ['washed-out colors', 'timid small product', 'cluttered background', 'soft dreamy haze'],
  },
  {
    scene_id: 'hero_luxury',
    name: '럭셔리 무드',
    description: '프리미엄 라인용 — 어두운 톤, 금빛 하이라이트, 광택 소재의 고급감.',
    recommended_compositions: ['center', 'low_angle'],
    recommended_lighting: 'low-key dramatic lighting with warm golden accents',
    recommended_product_ratio: [60, 90],
    recommended_model_ratio: [30, 60],
    recommended_background: 'dark charcoal or deep green velvet / polished stone',
    camera_angle: 'low_angle', camera_distance: 'closeup', lens_style: 'telephoto_compressed',
    product_position: 'center', model_position: 'behind_product', negative_space: 'moderate',
    background_material: 'velvet', surface_material: 'polished_stone', prop_style: 'stone_elements',
    reflection: 'subtle', shadow_style: 'long_directional', depth_of_field: 'shallow',
    positive_rules: ['premium material', 'polished surface', 'elegant lighting'],
    negative_rules: ['colorful props', 'cartoon mood', 'cheap plastic feeling'],
  },
  {
    scene_id: 'hero_lifestyle',
    name: '라이프스타일 히어로',
    description: '일상 공간 속 자연스러운 사용 순간 — 광고 냄새를 뺀 친밀한 히어로.',
    recommended_compositions: ['left_heavy', 'right_heavy', 'diagonal'],
    recommended_lighting: 'natural ambient daylight, lived-in warmth',
    recommended_product_ratio: [30, 60],
    recommended_model_ratio: [40, 70],
    recommended_background: 'bright Korean apartment interior — vanity, bathroom shelf',
    camera_angle: 'eye_level', camera_distance: 'medium_wide', lens_style: 'wide_35mm',
    product_position: 'held_by_model', model_position: 'right', negative_space: 'moderate',
    background_material: 'interior', surface_material: 'wood', prop_style: 'everyday_objects',
    reflection: 'none', shadow_style: 'soft_diffused', depth_of_field: 'medium',
    positive_rules: ['natural candid moment', 'believable lived-in setting', 'warm ambient daylight'],
    negative_rules: ['sterile studio look', 'stiff staged posing', 'floating product', 'neon artificial colors'],
  },
  {
    scene_id: 'hero_clean',
    name: '클린 미니멀 화이트',
    description: '순백 배경의 클린 뷰티 — 저자극·순한 포지셔닝의 기본값.',
    recommended_compositions: ['center', 'negative_space'],
    recommended_lighting: 'bright even high-key lighting, almost shadowless',
    recommended_product_ratio: [50, 80],
    recommended_model_ratio: [30, 60],
    recommended_background: 'pure white seamless with a faint soft shadow',
    camera_angle: 'eye_level', camera_distance: 'medium', lens_style: 'standard_50mm',
    product_position: 'center', model_position: 'right', negative_space: 'generous',
    background_material: 'seamless_paper', surface_material: 'ceramic', prop_style: 'none',
    reflection: 'none', shadow_style: 'floating_subtle', depth_of_field: 'deep',
    positive_rules: ['pure white environment', 'immaculate spotless surfaces', 'airy even brightness'],
    negative_rules: ['dark heavy shadows', 'colored lighting gels', 'any clutter', 'noisy textured background'],
  },
  {
    scene_id: 'hero_clinical',
    name: '클리니컬 랩',
    description: '더마·기능성 포지셔닝 — 실험실 무드의 신뢰형 히어로(차트·배지 없이 분위기만).',
    recommended_compositions: ['symmetric', 'center'],
    recommended_lighting: 'cool precise laboratory lighting, clean speculars on glass',
    recommended_product_ratio: [50, 80],
    recommended_model_ratio: [30, 60],
    recommended_background: 'clinical white set with glass vessels and acrylic risers',
    camera_angle: 'eye_level', camera_distance: 'medium', lens_style: 'standard_50mm',
    product_position: 'center', model_position: 'behind_product', negative_space: 'moderate',
    background_material: 'seamless_paper', surface_material: 'glossy_acrylic', prop_style: 'glass_vessels',
    reflection: 'subtle', shadow_style: 'soft_diffused', depth_of_field: 'medium',
    positive_rules: ['laboratory precision', 'glass and acrylic staging', 'calm sterile order'],
    negative_rules: ['charts, seals or badges', 'rendered claim text', 'warm cozy props', 'messy arrangement'],
  },
];

/** Ingredient(ingredient_macro) 아키타입 Scene Library — 6종(★다이어트 2차: 15→6, 실발화 3종 + 무드 축 3종).
 *  원료가 주인공, 제품은 소품(0~40%), 모델 없음. */
export const INGREDIENT_SCENES: SceneSpec[] = [
  {
    scene_id: 'ingredient_droplet',
    name: '스포이드 드롭',
    description: '유리 스포이드에서 추출물 한 방울이 떨어지는 순간 — 성분의 순도·정밀함.',
    recommended_compositions: ['center', 'extreme_closeup'],
    recommended_lighting: 'crisp backlight freezing the falling drop, sparkling rim highlights',
    recommended_product_ratio: [0, 20],
    recommended_model_ratio: [0, 0],
    recommended_background: 'deep clean gradient with a soft glow behind the drop',
    camera_angle: 'eye_level', camera_distance: 'extreme_closeup', lens_style: 'macro',
    product_position: 'foreground', model_position: 'none', negative_space: 'moderate',
    background_material: 'gradient', surface_material: 'glass', prop_style: 'water_droplets',
    reflection: 'glass_refraction', shadow_style: 'none', depth_of_field: 'extreme_shallow',
    positive_rules: ['single suspended drop in sharp focus', 'crystal-clear liquid', 'precision laboratory elegance'],
    negative_rules: ['multiple chaotic drops', 'colored dyes', 'plastic pipettes', 'busy background'],
  },
  {
    scene_id: 'ingredient_botanical_fresh',
    name: '신선 원료',
    description: '갓 딴 식물 원료(잎·꽃·뿌리)가 물방울을 머금은 채 놓인 컷 — 원료의 신선함.',
    recommended_compositions: ['diagonal', 'flat_lay'],
    recommended_lighting: 'soft diffused daylight with dewy speculars on leaves',
    recommended_product_ratio: [10, 40],
    recommended_model_ratio: [0, 0],
    recommended_background: 'matte stone slab in a warm neutral tone',
    camera_angle: 'high_angle', camera_distance: 'closeup', lens_style: 'macro',
    product_position: 'right_third', model_position: 'none', negative_space: 'moderate',
    background_material: 'seamless_paper', surface_material: 'matte_stone', prop_style: 'botanical',
    reflection: 'none', shadow_style: 'soft_diffused', depth_of_field: 'shallow',
    positive_rules: ['visibly fresh living botanicals', 'natural water droplets on leaves', 'true-to-nature green tones'],
    negative_rules: ['wilted or dried leaves', 'artificial plastic plants', 'over-saturated fake green', 'crowded pile of herbs'],
  },
  {
    scene_id: 'ingredient_lab_glass',
    name: '랩 글라스',
    description: '비커·플라스크 속 원료 추출물 — 연구·정제의 신뢰 서사(차트·배지 없이).',
    recommended_compositions: ['symmetric', 'center'],
    recommended_lighting: 'cool precise lab lighting with clean glass speculars',
    recommended_product_ratio: [10, 40],
    recommended_model_ratio: [0, 0],
    recommended_background: 'clinical white set, softly graded',
    camera_angle: 'eye_level', camera_distance: 'medium', lens_style: 'standard_50mm',
    product_position: 'right_third', model_position: 'none', negative_space: 'moderate',
    background_material: 'seamless_paper', surface_material: 'glossy_acrylic', prop_style: 'glass_vessels',
    reflection: 'subtle', shadow_style: 'soft_diffused', depth_of_field: 'medium',
    positive_rules: ['clean laboratory glassware', 'clear liquid gradients', 'ordered scientific calm'],
    negative_rules: ['bubbling mad-science liquids', 'charts or measurement text', 'colored chemical dyes', 'cluttered bench'],
  },
  {
    scene_id: 'ingredient_oil_drop',
    name: '오일 드롭 매크로',
    description: '황금빛 오일 방울·스월의 초접사 — 영양·리치함의 물성.',
    recommended_compositions: ['extreme_closeup', 'diagonal'],
    recommended_lighting: 'warm backlight glowing through golden oil',
    recommended_product_ratio: [0, 20],
    recommended_model_ratio: [0, 0],
    recommended_background: 'deep amber-to-dark gradient',
    camera_angle: 'eye_level', camera_distance: 'extreme_closeup', lens_style: 'macro',
    product_position: 'foreground', model_position: 'none', negative_space: 'minimal',
    background_material: 'gradient', surface_material: 'glass', prop_style: 'water_droplets',
    reflection: 'glass_refraction', shadow_style: 'none', depth_of_field: 'extreme_shallow',
    positive_rules: ['luminous golden translucency', 'perfect round oil beads', 'rich nourishing warmth'],
    negative_rules: ['greasy frying-pan look', 'murky brown oil', 'food cooking context', 'splattered mess'],
  },
  {
    scene_id: 'ingredient_splash_crown',
    name: '스플래시 크라운',
    description: '원료가 수면에 닿는 순간의 크라운 스플래시 — 신선한 임팩트 컷.',
    recommended_compositions: ['center', 'low_angle'],
    recommended_lighting: 'high-speed strobe freezing the splash, glittering droplets',
    recommended_product_ratio: [0, 30],
    recommended_model_ratio: [0, 0],
    recommended_background: 'clean rippling water plane with soft horizon glow',
    camera_angle: 'low_angle', camera_distance: 'closeup', lens_style: 'macro',
    product_position: 'center', model_position: 'none', negative_space: 'moderate',
    background_material: 'water', surface_material: 'water_surface', prop_style: 'water_droplets',
    reflection: 'water_reflection', shadow_style: 'none', depth_of_field: 'shallow',
    positive_rules: ['sharply frozen crown splash', 'every droplet crisp', 'fresh energetic moment'],
    negative_rules: ['chaotic stormy water', 'milk-like opaque liquid', 'oversized tsunami splash', 'blurred motion smear'],
  },
  {
    scene_id: 'ingredient_slice_cross',
    name: '단면 클로즈업',
    description: '과일·허브의 싱싱한 단면 — 원물 그대로의 조직감과 수분.',
    recommended_compositions: ['extreme_closeup', 'symmetric'],
    recommended_lighting: 'bright fresh light revealing juicy inner texture',
    recommended_product_ratio: [0, 30],
    recommended_model_ratio: [0, 0],
    recommended_background: 'clean pale ceramic with soft shadow',
    camera_angle: 'high_angle', camera_distance: 'extreme_closeup', lens_style: 'macro',
    product_position: 'right_third', model_position: 'none', negative_space: 'moderate',
    background_material: 'seamless_paper', surface_material: 'ceramic', prop_style: 'botanical',
    reflection: 'none', shadow_style: 'soft_diffused', depth_of_field: 'shallow',
    positive_rules: ['juicy translucent cross-section', 'visible cell texture', 'just-cut freshness'],
    negative_rules: ['browning oxidized cut', 'knife in frame', 'cutting-board kitchen scene', 'dried shriveled slices'],
  },
];

/** 아키타입 → Scene Library 레지스트리. ⚠️현재 hero·ingredient_macro — 나머지는 후속 작업에서 채움. */
export const SCENE_LIBRARY: Partial<Record<CutArchetype, SceneSpec[]>> = {
  hero: HERO_SCENES,
  ingredient_macro: INGREDIENT_SCENES,
};

/* ── Hero Scene 선택 — 점수 기반(랜덤 금지). category·channel·palette·mood(strategy.visual)로 채점. ──
   ⚠️현 단계: 선택 결과(selectedScene)만 노출 — 프롬프트 주입·imagebrief 연결·GPT 호출 수정 없음. */

interface SceneAffinity {
  categories?: string[];   // 일치 +3 (카테고리 기본 성향)
  channels?: string[];     // 일치 +2
  palettes?: string[];     // strategy.visual.palette 키 일치 +2
  moodKeys?: string[];     // mood/톤 문자열에 포함될 때 키워드당 +3 — 명시적 포지셔닝 신호라 카테고리 기본값보다 우선
}

/** 장면별 적합 신호 — SceneSpec(순수 데이터)과 분리해 채점 규칙만 따로 둠. hero_*·ingredient_* 공용 레지스트리. */
const SCENE_AFFINITY: Record<string, SceneAffinity> = {
  // ── ingredient_macro (★다이어트 2차 — 삭제 장면의 무드 키는 성격이 가장 가까운 잔존 장면에 병합해 라우팅 신호 보존) ──
  ingredient_droplet:         { moodKeys: ['정밀', '농축', '앰플', '에센스', '겔', '투명', '제형'] },
  ingredient_botanical_fresh: { palettes: ['green'], moodKeys: ['자연', '진정', '식물', '저자극', '순수', '내추럴', '산지'] },
  ingredient_lab_glass:       { moodKeys: ['더마', '기능성', '임상', '연구', '검증', '테스트', '과학'] },
  ingredient_oil_drop:        { palettes: ['brown'], moodKeys: ['영양', '오일', '리치', '고보습'] },
  ingredient_splash_crown:    { palettes: ['blue'], moodKeys: ['청량', '임팩트', '상쾌', '수분', '워터', '쿨링', '시원'] },
  ingredient_slice_cross:     { categories: ['식품'], palettes: ['yellow'], moodKeys: ['과일', '원물', '신선'] },
  // ── hero (삭제 장면의 무드 키 병합 동일 원칙) ──
  hero_beauty:        { categories: ['화장품'], channels: ['올리브영'], palettes: ['pink'], moodKeys: ['뷰티', '화사', '생기', '수분', '촉촉', '보습', '사용감', '발림', '포근', '부드러'] },
  hero_campaign:      { channels: ['쿠팡'], palettes: ['yellow'], moodKeys: ['임팩트', '활력', '볼드', '캠페인'] },
  hero_luxury:        { palettes: ['purple'], moodKeys: ['프리미엄', '고급', '럭셔리', '명품', '에디토리얼', '세련'] },
  hero_lifestyle:     { categories: ['식품', '리빙'], palettes: ['brown'], moodKeys: ['일상', '편안', '내추럴', '아침', '모닝', '루틴', '햇살', '자연광'] },
  hero_clean:         { categories: ['화장품'], palettes: ['green', 'gray'], moodKeys: ['클린', '저자극', '순한', '진정', '미니멀', '절제', '여백', '투명'] },
  hero_clinical:      { moodKeys: ['더마', '임상', '기능성', '신뢰'] },
};

export interface SceneSelectInput {
  category?: string;   // cat (예: '화장품', '식품')
  channel?: string;    // ch (예: '올리브영', '쿠팡')
  palette?: string;    // strategy.visual.palette 키 (green/blue/yellow/pink/brown/purple/gray)
  mood?: string;       // strategy.visual.mood + strategy.tone 등 무드 텍스트(합쳐 전달 가능)
}

/** Scene 결정(범용) — 해당 아키타입 라이브러리에서 최고 점수 1개(동점은 정의 순서 = 결정적, 랜덤 없음).
 *  라이브러리가 없는 아키타입은 null(기존 동작 유지 신호). */
export function selectScene(archetype: CutArchetype, input: SceneSelectInput): SceneSpec | null {
  const lib = SCENE_LIBRARY[archetype];
  if (!lib?.length) return null;

  const cat = (input.category ?? '').split('/')[0].trim();
  const ch = (input.channel ?? '').trim();
  const pal = (input.palette ?? '').trim();
  const mood = (input.mood ?? '').toLowerCase();

  let best = lib[0];
  let bestScore = -1;
  for (const scene of lib) {
    const a = SCENE_AFFINITY[scene.scene_id] ?? {};
    let score = 0;
    if (cat && a.categories?.includes(cat)) score += 3;
    if (ch && a.channels?.includes(ch)) score += 2;
    if (pal && a.palettes?.includes(pal)) score += 2;
    for (const k of a.moodKeys ?? []) {
      if (mood && mood.includes(k.toLowerCase())) score += 3;
    }
    if (score > bestScore) { bestScore = score; best = scene; }   // 동점 시 앞 순서 유지(결정적)
  }
  return best;
}

/** Hero Scene 결정 — selectScene('hero') 위임(기존 시그니처 보존). */
export function selectHeroScene(input: SceneSelectInput): SceneSpec {
  return selectScene('hero', input)!;   // hero 라이브러리는 항상 존재
}

/* ── Scene → 영문 프롬프트 조각 — Recipe(12 enum) + Positive/Negative를 촬영 지시문으로 번역 ── */
const ANGLE_P: Record<CameraAngle, string> = { eye_level: 'eye-level camera', high_angle: 'slightly elevated camera angle', low_angle: 'low camera angle', top_down: 'top-down overhead camera' };
const DIST_P: Record<CameraDistance, string> = { extreme_closeup: 'extreme close-up framing', closeup: 'close-up framing', medium: 'medium framing', medium_wide: 'medium-wide framing', wide: 'wide framing' };
const LENS_P: Record<LensStyle, string> = { macro: 'macro lens detail', standard_50mm: 'natural 50mm lens rendering', portrait_85mm: '85mm portrait lens rendering', wide_35mm: '35mm environmental lens', telephoto_compressed: 'telephoto compression' };
const PPOS_P: Record<ProductPosition, string> = { center: 'product placed center', left_third: 'product on the left third', right_third: 'product on the right third', foreground: 'subject filling the foreground', held_by_model: 'product held by the model' };
const MPOS_P: Record<ModelPosition, string> = { none: 'no people in frame', center: 'model centered', left: 'model on the left', right: 'model on the right', behind_product: 'model behind the product', in_mirror: 'model seen in a mirror' };
const NSPACE_P: Record<NegativeSpaceAmt, string> = { minimal: 'tightly filled frame', moderate: 'balanced negative space', generous: 'generous negative space', extreme: 'vast empty negative space' };
const BG_P: Record<BackgroundMaterial, string> = { seamless_paper: 'seamless studio backdrop', plaster_wall: 'textured plaster wall backdrop', fabric_drape: 'draped fabric backdrop', velvet: 'dark velvet backdrop', gradient: 'smooth gradient backdrop', interior: 'real interior setting', window: 'window-lit setting', water: 'water environment' };
const SURF_P: Record<SurfaceMaterial, string> = { none: '', matte_stone: 'on a matte stone surface', polished_stone: 'on a polished stone surface', glossy_acrylic: 'on a glossy acrylic surface', glass: 'on a glass surface', wood: 'on a wooden surface', concrete: 'on a concrete surface', fabric: 'on soft fabric', ceramic: 'on a ceramic surface', water_surface: 'on a water surface' };
const PROP_P: Record<PropStyle, string> = { none: 'no props', light_only: 'light and shadow as the only styling', botanical: 'fresh botanical props', water_droplets: 'water droplet details', glass_vessels: 'glass vessel props', fabric_layers: 'layered fabric props', stone_elements: 'stone element props', everyday_objects: 'subtle everyday objects' };
const REFL_P: Record<ReflectionStyle, string> = { none: '', subtle: 'subtle surface reflection', mirror: 'mirror reflection', glass_refraction: 'glass refraction highlights', water_reflection: 'water reflection' };
const SHDW_P: Record<ShadowStyle, string> = { none: 'shadowless lighting', soft_diffused: 'soft diffused shadows', hard_cast: 'hard cast shadows', long_directional: 'long directional shadows', floating_subtle: 'subtle floating shadow' };
const DOF_P: Record<DepthOfField, string> = { deep: 'deep depth of field', medium: 'moderate depth of field', shallow: 'shallow depth of field', extreme_shallow: 'extremely shallow depth of field' };

/** SceneSpec → 기존 prompt 뒤에 붙일 영문 조각. (프롬프트 본문·slideBaked·route는 무접촉 — append만) */
export function sceneToPromptFragment(scene: SceneSpec): string {
  const shot = [
    ANGLE_P[scene.camera_angle], DIST_P[scene.camera_distance], LENS_P[scene.lens_style],
    PPOS_P[scene.product_position], MPOS_P[scene.model_position], NSPACE_P[scene.negative_space],
    BG_P[scene.background_material], SURF_P[scene.surface_material], PROP_P[scene.prop_style],
    REFL_P[scene.reflection], SHDW_P[scene.shadow_style], DOF_P[scene.depth_of_field],
  ].filter(Boolean).join(', ');
  return ` | scene [${scene.scene_id}]: ${shot}. lighting: ${scene.recommended_lighting}.` +
    ` Must include: ${scene.positive_rules.join('; ')}.` +
    ` Must avoid: ${scene.negative_rules.join('; ')}.`;
}

