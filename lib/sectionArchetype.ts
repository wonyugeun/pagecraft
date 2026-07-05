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

/** Hero 아키타입 Scene Library — 15종. 값은 K뷰티 에디토리얼 광고 기준 초안.
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
    scene_id: 'hero_editorial',
    name: '매거진 에디토리얼',
    description: '잡지 커버 느낌의 절제된 화보 — 여백과 타이포 공간이 살아있는 컷.',
    recommended_compositions: ['left_heavy', 'right_heavy', 'negative_space'],
    recommended_lighting: 'directional window light with soft falloff and long shadows',
    recommended_product_ratio: [30, 60],
    recommended_model_ratio: [40, 70],
    recommended_background: 'muted editorial set — plaster wall, subtle texture',
    camera_angle: 'eye_level', camera_distance: 'medium_wide', lens_style: 'standard_50mm',
    product_position: 'left_third', model_position: 'right', negative_space: 'generous',
    background_material: 'plaster_wall', surface_material: 'concrete', prop_style: 'fabric_layers',
    reflection: 'none', shadow_style: 'long_directional', depth_of_field: 'medium',
    positive_rules: ['magazine-grade styling', 'intentional empty space for typography', 'muted sophisticated palette'],
    negative_rules: ['loud saturated colors', 'stock-photo smile', 'crowded frame', 'perfect centered symmetry'],
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
    scene_id: 'hero_applying',
    name: '어플라이 모먼트',
    description: '모델이 제품을 피부에 바르는 순간의 클로즈업 화보 — 사용감·밀착의 히어로.',
    recommended_compositions: ['center', 'right_heavy'],
    recommended_lighting: 'soft flattering beauty light with dewy skin highlights',
    recommended_product_ratio: [30, 60],
    recommended_model_ratio: [50, 80],
    recommended_background: 'clean warm studio backdrop',
    camera_angle: 'eye_level', camera_distance: 'closeup', lens_style: 'portrait_85mm',
    product_position: 'held_by_model', model_position: 'center', negative_space: 'moderate',
    background_material: 'seamless_paper', surface_material: 'none', prop_style: 'light_only',
    reflection: 'none', shadow_style: 'soft_diffused', depth_of_field: 'shallow',
    positive_rules: ['genuine application moment', 'dewy skin texture in focus', 'relaxed natural expression'],
    negative_rules: ['awkward stiff hands', 'messy smeared product', 'exaggerated facial expression', 'cluttered background'],
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
  {
    scene_id: 'hero_soft',
    name: '소프트 파스텔',
    description: '부드러운 파스텔 톤 — 진정·보습 감성, 포근한 무드의 히어로.',
    recommended_compositions: ['center', 'negative_space'],
    recommended_lighting: 'diffused soft light through a scrim, airy and tender',
    recommended_product_ratio: [40, 70],
    recommended_model_ratio: [30, 60],
    recommended_background: 'pastel gradient backdrop with soft fabric drape',
    camera_angle: 'eye_level', camera_distance: 'medium', lens_style: 'portrait_85mm',
    product_position: 'center', model_position: 'right', negative_space: 'generous',
    background_material: 'fabric_drape', surface_material: 'fabric', prop_style: 'fabric_layers',
    reflection: 'none', shadow_style: 'soft_diffused', depth_of_field: 'shallow',
    positive_rules: ['pastel tenderness', 'soft fabric textures', 'gentle diffused glow'],
    negative_rules: ['hard contrast', 'black or dark backdrop', 'sharp aggressive angles', 'glossy plastic shine'],
  },
  {
    scene_id: 'hero_minimal',
    name: '미니멀 여백',
    description: '극단적 여백과 단일 오브제 — 카피가 숨 쉬는 조용한 히어로.',
    recommended_compositions: ['negative_space', 'left_heavy', 'right_heavy'],
    recommended_lighting: 'single soft directional light, quiet gradient shadow',
    recommended_product_ratio: [40, 70],
    recommended_model_ratio: [30, 50],
    recommended_background: 'vast empty matte surface in warm grey or sand',
    camera_angle: 'eye_level', camera_distance: 'medium_wide', lens_style: 'standard_50mm',
    product_position: 'right_third', model_position: 'left', negative_space: 'extreme',
    background_material: 'gradient', surface_material: 'concrete', prop_style: 'none',
    reflection: 'none', shadow_style: 'long_directional', depth_of_field: 'deep',
    positive_rules: ['clean background', 'one product', 'large negative space'],
    negative_rules: ['multiple props', 'busy composition', 'heavy decoration', 'excessive leaves', 'dramatic splash'],
  },
  {
    scene_id: 'hero_glass',
    name: '유리 반사',
    description: '유리판·아크릴 위 반사와 굴절 — 투명감·순도를 파는 히어로.',
    recommended_compositions: ['center', 'low_angle'],
    recommended_lighting: 'backlit glow with sharp glass reflections and refractions',
    recommended_product_ratio: [50, 80],
    recommended_model_ratio: [30, 50],
    recommended_background: 'mirrored glass surface with a deep clean gradient',
    camera_angle: 'low_angle', camera_distance: 'closeup', lens_style: 'standard_50mm',
    product_position: 'center', model_position: 'behind_product', negative_space: 'moderate',
    background_material: 'gradient', surface_material: 'glass', prop_style: 'glass_vessels',
    reflection: 'glass_refraction', shadow_style: 'floating_subtle', depth_of_field: 'shallow',
    positive_rules: ['crystal transparency', 'clean light refractions', 'pristine glass surfaces'],
    negative_rules: ['fingerprints or smudges', 'opaque heavy props', 'rustic warm wood', 'cluttered reflections'],
  },
  {
    scene_id: 'hero_window_light',
    name: '창가 자연광',
    description: '창을 통과한 사선 빛과 그림자 패턴 — 아침 루틴의 서정적 히어로.',
    recommended_compositions: ['left_heavy', 'right_heavy', 'diagonal'],
    recommended_lighting: 'hard morning sunlight through a window, cast shadow patterns',
    recommended_product_ratio: [40, 70],
    recommended_model_ratio: [30, 60],
    recommended_background: 'sunlit windowsill or table edge with sheer curtain',
    camera_angle: 'eye_level', camera_distance: 'medium', lens_style: 'standard_50mm',
    product_position: 'left_third', model_position: 'right', negative_space: 'moderate',
    background_material: 'window', surface_material: 'wood', prop_style: 'botanical',
    reflection: 'none', shadow_style: 'hard_cast', depth_of_field: 'medium',
    positive_rules: ['real sunlight feel', 'crisp cast shadow patterns', 'serene morning stillness'],
    negative_rules: ['flat even studio light', 'artificial neon glow', 'crowded windowsill', 'closed curtains gloom'],
  },
  {
    scene_id: 'hero_morning',
    name: '모닝 루틴',
    description: '기상 직후 첫 스킨케어 순간 — 신선함·시작의 감정을 담는 히어로.',
    recommended_compositions: ['right_heavy', 'left_heavy'],
    recommended_lighting: 'fresh cool-to-warm dawn light, dewy atmosphere',
    recommended_product_ratio: [40, 70],
    recommended_model_ratio: [30, 60],
    recommended_background: 'bright morning bathroom or bedside vanity',
    camera_angle: 'eye_level', camera_distance: 'medium', lens_style: 'portrait_85mm',
    product_position: 'held_by_model', model_position: 'left', negative_space: 'moderate',
    background_material: 'interior', surface_material: 'ceramic', prop_style: 'everyday_objects',
    reflection: 'none', shadow_style: 'soft_diffused', depth_of_field: 'shallow',
    positive_rules: ['fresh just-awake atmosphere', 'soft flattering skin light', 'quiet routine intimacy'],
    negative_rules: ['night or evening mood', 'heavy glam makeup', 'office or outdoor setting', 'crowded countertop'],
  },
  {
    scene_id: 'hero_reflection',
    name: '거울 리플렉션',
    description: '거울 속 모델과 제품이 함께 보이는 이중 프레임 — 셀프케어 서사.',
    recommended_compositions: ['symmetric', 'left_heavy'],
    recommended_lighting: 'vanity mirror glow, soft frontal light on skin',
    recommended_product_ratio: [30, 60],
    recommended_model_ratio: [50, 80],
    recommended_background: 'vanity mirror scene with warm bulbs or clean bathroom mirror',
    camera_angle: 'eye_level', camera_distance: 'medium', lens_style: 'portrait_85mm',
    product_position: 'held_by_model', model_position: 'in_mirror', negative_space: 'minimal',
    background_material: 'interior', surface_material: 'glass', prop_style: 'everyday_objects',
    reflection: 'mirror', shadow_style: 'soft_diffused', depth_of_field: 'shallow',
    positive_rules: ['clear readable mirror story', 'model and reflection both visible', 'warm vanity glow'],
    negative_rules: ['warped distorted reflection', 'dirty smudged mirror', 'duplicated products in reflection', 'dark unsettling mood'],
  },
  {
    scene_id: 'hero_water',
    name: '워터 스플래시',
    description: '물결·물방울·스플래시 속 제품 — 수분감을 직관적으로 파는 히어로.',
    recommended_compositions: ['center', 'diagonal', 'extreme_closeup'],
    recommended_lighting: 'crisp backlight freezing droplets, sparkling highlights',
    recommended_product_ratio: [50, 80],
    recommended_model_ratio: [30, 50],
    recommended_background: 'shallow rippling water surface over a pale basin',
    camera_angle: 'low_angle', camera_distance: 'closeup', lens_style: 'macro',
    product_position: 'center', model_position: 'right', negative_space: 'minimal',
    background_material: 'water', surface_material: 'water_surface', prop_style: 'water_droplets',
    reflection: 'water_reflection', shadow_style: 'none', depth_of_field: 'extreme_shallow',
    positive_rules: ['frozen droplets and ripples', 'sparkling backlit water', 'refreshing hydration feel'],
    negative_rules: ['murky cloudy water', 'chaotic stormy splash', 'swimming-pool context', 'submerged unreadable label'],
  },
];

/** Ingredient(ingredient_macro) 아키타입 Scene Library — 15종. 원료가 주인공, 제품은 소품(0~40%), 모델 없음. */
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
    scene_id: 'ingredient_leaf_dew',
    name: '잎맥 이슬 매크로',
    description: '잎맥 위 이슬 한 방울의 초접사 — 자연 유래·순수함을 시적으로.',
    recommended_compositions: ['extreme_closeup', 'negative_space'],
    recommended_lighting: 'morning backlight glowing through the leaf, dew sparkling',
    recommended_product_ratio: [0, 10],
    recommended_model_ratio: [0, 0],
    recommended_background: 'soft green out-of-focus gradient',
    camera_angle: 'eye_level', camera_distance: 'extreme_closeup', lens_style: 'macro',
    product_position: 'foreground', model_position: 'none', negative_space: 'generous',
    background_material: 'gradient', surface_material: 'none', prop_style: 'water_droplets',
    reflection: 'subtle', shadow_style: 'none', depth_of_field: 'extreme_shallow',
    positive_rules: ['leaf veins in crisp macro detail', 'one perfect dew drop', 'poetic natural light'],
    negative_rules: ['insects on the leaf', 'torn damaged leaves', 'heavy rain scene', 'cluttered foliage'],
  },
  {
    scene_id: 'ingredient_flat_lay',
    name: '원료 플랫레이',
    description: '핵심 원료들을 위에서 정갈하게 배열 — 배합·구성의 스토리텔링.',
    recommended_compositions: ['flat_lay', 'top_view', 'symmetric'],
    recommended_lighting: 'even soft overhead light, gentle shadows under each element',
    recommended_product_ratio: [10, 40],
    recommended_model_ratio: [0, 0],
    recommended_background: 'warm linen fabric or pale stone tabletop',
    camera_angle: 'top_down', camera_distance: 'medium', lens_style: 'standard_50mm',
    product_position: 'center', model_position: 'none', negative_space: 'moderate',
    background_material: 'seamless_paper', surface_material: 'fabric', prop_style: 'botanical',
    reflection: 'none', shadow_style: 'soft_diffused', depth_of_field: 'deep',
    positive_rules: ['deliberate curated arrangement', 'breathing room between elements', 'ingredient-to-product visual story'],
    negative_rules: ['random scattered mess', 'overlapping piled items', 'too many ingredient types', 'harsh single-direction shadow'],
  },
  {
    scene_id: 'ingredient_powder_swirl',
    name: '파우더 스월',
    description: '고운 분말 원료가 흩날리거나 소복이 쌓인 컷 — 함량·농축의 물성 표현.',
    recommended_compositions: ['diagonal', 'center'],
    recommended_lighting: 'directional side light catching airborne powder particles',
    recommended_product_ratio: [0, 30],
    recommended_model_ratio: [0, 0],
    recommended_background: 'deep muted gradient that makes powder read clearly',
    camera_angle: 'eye_level', camera_distance: 'closeup', lens_style: 'macro',
    product_position: 'left_third', model_position: 'none', negative_space: 'moderate',
    background_material: 'gradient', surface_material: 'matte_stone', prop_style: 'stone_elements',
    reflection: 'none', shadow_style: 'soft_diffused', depth_of_field: 'shallow',
    positive_rules: ['fine powder texture visible', 'elegant frozen motion', 'monochromatic material focus'],
    negative_rules: ['dusty dirty mess', 'explosion-like clouds', 'multiple powder colors mixed', 'kitchen baking mood'],
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
    scene_id: 'ingredient_petri',
    name: '페트리 디쉬',
    description: '페트리 접시 위 원료·제형 스와치 톱다운 — 성분 검증의 미학.',
    recommended_compositions: ['top_view', 'symmetric'],
    recommended_lighting: 'even clinical overhead light, subtle rim on glass edges',
    recommended_product_ratio: [0, 30],
    recommended_model_ratio: [0, 0],
    recommended_background: 'pure white surface with faint glass shadows',
    camera_angle: 'top_down', camera_distance: 'closeup', lens_style: 'standard_50mm',
    product_position: 'center', model_position: 'none', negative_space: 'generous',
    background_material: 'seamless_paper', surface_material: 'glossy_acrylic', prop_style: 'glass_vessels',
    reflection: 'subtle', shadow_style: 'floating_subtle', depth_of_field: 'deep',
    positive_rules: ['perfect circular dishes', 'ingredient swatches neatly contained', 'minimal clinical grid'],
    negative_rules: ['biological culture look', 'spilled overflowing contents', 'too many dishes', 'warm rustic props'],
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
    scene_id: 'ingredient_water_infusion',
    name: '워터 인퓨전',
    description: '맑은 물속에서 원료가 우러나며 퍼지는 컷 — 성분이 녹아드는 과정.',
    recommended_compositions: ['center', 'negative_space'],
    recommended_lighting: 'bright aquatic backlight, caustic light patterns',
    recommended_product_ratio: [0, 20],
    recommended_model_ratio: [0, 0],
    recommended_background: 'clear water volume over a pale luminous field',
    camera_angle: 'eye_level', camera_distance: 'closeup', lens_style: 'macro',
    product_position: 'foreground', model_position: 'none', negative_space: 'generous',
    background_material: 'water', surface_material: 'water_surface', prop_style: 'botanical',
    reflection: 'water_reflection', shadow_style: 'none', depth_of_field: 'shallow',
    positive_rules: ['delicate diffusion trails in water', 'suspended botanical pieces', 'clean aquatic light'],
    negative_rules: ['murky cloudy water', 'tea-brewing kitchen mood', 'air bubbles covering everything', 'fish-tank look'],
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
  {
    scene_id: 'ingredient_ice_fresh',
    name: '아이스 프레시',
    description: '얼음 조각 위·사이의 원료 — 저온 보존·쿨링의 신선 서사.',
    recommended_compositions: ['diagonal', 'center'],
    recommended_lighting: 'cool crisp light with icy blue-white speculars',
    recommended_product_ratio: [10, 40],
    recommended_model_ratio: [0, 0],
    recommended_background: 'frosted cool gradient',
    camera_angle: 'eye_level', camera_distance: 'closeup', lens_style: 'macro',
    product_position: 'center', model_position: 'none', negative_space: 'minimal',
    background_material: 'gradient', surface_material: 'water_surface', prop_style: 'stone_elements',
    reflection: 'subtle', shadow_style: 'none', depth_of_field: 'shallow',
    positive_rules: ['clear glassy ice', 'frost and chill visible', 'crisp refreshing cold'],
    negative_rules: ['melting watery slush', 'drink-on-the-rocks look', 'freezer-burn cloudiness', 'colored ice cubes'],
  },
  {
    scene_id: 'ingredient_mortar_craft',
    name: '스톤 모르타르',
    description: '돌절구에 담긴 원료 — 정성·조제의 핸드크래프트 무드(손 없이).',
    recommended_compositions: ['top_view', 'left_heavy'],
    recommended_lighting: 'warm directional light with artisanal shadow depth',
    recommended_product_ratio: [0, 30],
    recommended_model_ratio: [0, 0],
    recommended_background: 'textured plaster wall softly out of focus',
    camera_angle: 'high_angle', camera_distance: 'closeup', lens_style: 'standard_50mm',
    product_position: 'right_third', model_position: 'none', negative_space: 'moderate',
    background_material: 'plaster_wall', surface_material: 'matte_stone', prop_style: 'stone_elements',
    reflection: 'none', shadow_style: 'long_directional', depth_of_field: 'medium',
    positive_rules: ['honest stone textures', 'carefully placed raw ingredients', 'artisanal apothecary calm'],
    negative_rules: ['hands or people', 'kitchen cooking context', 'rustic clutter', 'medieval fantasy mood'],
  },
  {
    scene_id: 'ingredient_gel_particle',
    name: '겔 파티클',
    description: '투명 겔 속에 떠 있는 성분 입자·기포의 초접사 — 제형 속 성분 가시화.',
    recommended_compositions: ['extreme_closeup', 'negative_space'],
    recommended_lighting: 'backlit glow making the gel luminous, particles sparkling',
    recommended_product_ratio: [0, 20],
    recommended_model_ratio: [0, 0],
    recommended_background: 'soft luminous gradient behind translucent gel',
    camera_angle: 'eye_level', camera_distance: 'extreme_closeup', lens_style: 'macro',
    product_position: 'foreground', model_position: 'none', negative_space: 'generous',
    background_material: 'gradient', surface_material: 'none', prop_style: 'water_droplets',
    reflection: 'subtle', shadow_style: 'none', depth_of_field: 'extreme_shallow',
    positive_rules: ['luminous translucent gel', 'suspended particles in focus', 'weightless floating feel'],
    negative_rules: ['soap-foam bubbles', 'slimy unappetizing texture', 'opaque murky gel', 'glitter craft look'],
  },
  {
    scene_id: 'ingredient_window_herb',
    name: '창가 허브',
    description: '창가 자연광 아래 허브·원료 — 산지의 아침을 연상시키는 서정 컷.',
    recommended_compositions: ['left_heavy', 'right_heavy', 'diagonal'],
    recommended_lighting: 'morning sun through a window, leaf shadows cast on the surface',
    recommended_product_ratio: [10, 40],
    recommended_model_ratio: [0, 0],
    recommended_background: 'sunlit windowsill with sheer curtain glow',
    camera_angle: 'eye_level', camera_distance: 'medium', lens_style: 'standard_50mm',
    product_position: 'left_third', model_position: 'none', negative_space: 'moderate',
    background_material: 'window', surface_material: 'wood', prop_style: 'botanical',
    reflection: 'none', shadow_style: 'hard_cast', depth_of_field: 'medium',
    positive_rules: ['real sunlight warmth', 'living herbs by the window', 'quiet farm-morning serenity'],
    negative_rules: ['flat artificial studio light', 'plastic pots clutter', 'kitchen countertop mood', 'dying plants'],
  },
];

/** 아키타입 → Scene Library 레지스트리. ⚠️현재 hero·ingredient_macro — 나머지는 후속 작업에서 채움. */
export const SCENE_LIBRARY: Partial<Record<CutArchetype, SceneSpec[]>> = {
  hero: HERO_SCENES,
  ingredient_macro: INGREDIENT_SCENES,
};

/* ═══════════════════════════════════════════════════════════════════
   Composition Library — Scene이 "무엇을 찍을지"라면 Composition은 "어떻게 배치할지".
   Hero/Ingredient 등 아키타입 무관 재사용(모델 없는 컷은 model_priority.position='none' 조합 사용).

   ⚠️현 단계는 데이터만: Prompt·imagebrief·Scene·Stage 무접촉, GPT 미호출. 연결은 후속 작업.
   (기존 Composition(10종 구도 enum)과 별개 계층 — 이건 지면 배치 설계도)
   ═══════════════════════════════════════════════════════════════════ */

export type SubjectBalance = 'product_dominant' | 'model_dominant' | 'equal' | 'scene_dominant';
export type VisualFlow = 'top_to_bottom' | 'left_to_right' | 'right_to_left' | 'diagonal_tl_br' | 'diagonal_bl_tr' | 'center_out' | 'z_pattern';
export type PlacementZone = 'center' | 'left' | 'right' | 'top' | 'bottom' | 'upper_left' | 'upper_right' | 'lower_left' | 'lower_right' | 'foreground' | 'none';
export type LayerContent = 'product' | 'model' | 'props' | 'text_space' | 'texture' | 'empty';
export type CameraBalance = 'symmetric' | 'centered' | 'weighted_left' | 'weighted_right' | 'weighted_top' | 'weighted_bottom';
export type PriorityRank = 'primary' | 'secondary' | 'none';
export type KpiZone = 'bottom_strip' | 'bottom_left' | 'bottom_right' | 'left_column' | 'right_column' | 'none';
export type SafeTextArea = 'top_third' | 'top_half' | 'left_half' | 'right_half' | 'bottom_third' | 'center_band';

export interface CompositionSpec {
  composition_id: string;
  name: string;                              // 한국어 표시명
  description: string;                       // 어떤 배치이고 언제 쓰나 (한국어)
  subject_balance: SubjectBalance;           // 화면 지배 주체
  visual_flow: VisualFlow;                   // 시선 흐름
  negative_space: NegativeSpaceAmt;          // 여백 비율 — 기존 enum 재사용
  depth_layers: { foreground: LayerContent; midground: LayerContent; background: LayerContent };  // 레이어(전/중/후)
  camera_balance: CameraBalance;             // 무게 중심
  product_priority: { position: PlacementZone; rank: PriorityRank };   // 제품 위치·우선순위
  model_priority: { position: PlacementZone; rank: PriorityRank };     // 모델 위치·우선순위 (none = 모델 없는 컷용)
  kpi_position: KpiZone;                     // KPI/특징 스트립 위치
  safe_text_area: SafeTextArea;              // 헤드라인 안전영역
}

/** Composition Library — 15종. 전부 구조가 다르며 Hero(모델 rank 有)/Ingredient(모델 none 조합) 양쪽 재사용 가능. */
export const COMPOSITION_LIBRARY: CompositionSpec[] = [
  {
    composition_id: 'center_focus',
    name: '센터 포커스',
    description: '주인공을 정중앙에 — 가장 강한 단일 집중 배치. 히어로·CTA 기본값.',
    subject_balance: 'product_dominant',
    visual_flow: 'center_out',
    negative_space: 'moderate',
    depth_layers: { foreground: 'product', midground: 'model', background: 'empty' },
    camera_balance: 'centered',
    product_priority: { position: 'center', rank: 'primary' },
    model_priority: { position: 'center', rank: 'secondary' },
    kpi_position: 'bottom_strip',
    safe_text_area: 'top_third',
  },
  {
    composition_id: 'editorial_split',
    name: '에디토리얼 스플릿',
    description: '왼쪽 절반 텍스트 / 오른쪽 절반 피사체 — 잡지형 2분할.',
    subject_balance: 'equal',
    visual_flow: 'left_to_right',
    negative_space: 'generous',
    depth_layers: { foreground: 'product', midground: 'model', background: 'text_space' },
    camera_balance: 'weighted_right',
    product_priority: { position: 'right', rank: 'primary' },
    model_priority: { position: 'upper_right', rank: 'secondary' },
    kpi_position: 'bottom_left',
    safe_text_area: 'left_half',
  },
  {
    composition_id: 'diagonal_flow',
    name: '다이애거널 플로우',
    description: '좌상→우하 대각선으로 시선을 끌고 내려오는 동적 배치.',
    subject_balance: 'equal',
    visual_flow: 'diagonal_tl_br',
    negative_space: 'moderate',
    depth_layers: { foreground: 'props', midground: 'product', background: 'model' },
    camera_balance: 'weighted_right',
    product_priority: { position: 'lower_right', rank: 'primary' },
    model_priority: { position: 'upper_left', rank: 'secondary' },
    kpi_position: 'bottom_left',
    safe_text_area: 'top_third',
  },
  {
    composition_id: 'floating_product',
    name: '플로팅 프로덕트',
    description: '빈 공간에 떠 있는 제품 — 무중력 미니멀. 모델 없는 컷 전용.',
    subject_balance: 'product_dominant',
    visual_flow: 'center_out',
    negative_space: 'extreme',
    depth_layers: { foreground: 'product', midground: 'empty', background: 'texture' },
    camera_balance: 'centered',
    product_priority: { position: 'center', rank: 'primary' },
    model_priority: { position: 'none', rank: 'none' },
    kpi_position: 'none',
    safe_text_area: 'top_half',
  },
  {
    composition_id: 'magazine_cover',
    name: '매거진 커버',
    description: '모델이 지배하는 커버 구도 — 상단 마스트헤드 영역 확보.',
    subject_balance: 'model_dominant',
    visual_flow: 'top_to_bottom',
    negative_space: 'minimal',
    depth_layers: { foreground: 'model', midground: 'product', background: 'empty' },
    camera_balance: 'centered',
    product_priority: { position: 'lower_right', rank: 'secondary' },
    model_priority: { position: 'center', rank: 'primary' },
    kpi_position: 'bottom_right',
    safe_text_area: 'top_third',
  },
  {
    composition_id: 'luxury_balance',
    name: '럭셔리 밸런스',
    description: '하단 무게 중심 + 넉넉한 상단 여백 — 고요한 프리미엄 안정감.',
    subject_balance: 'product_dominant',
    visual_flow: 'top_to_bottom',
    negative_space: 'generous',
    depth_layers: { foreground: 'product', midground: 'props', background: 'texture' },
    camera_balance: 'weighted_bottom',
    product_priority: { position: 'bottom', rank: 'primary' },
    model_priority: { position: 'none', rank: 'none' },
    kpi_position: 'bottom_right',
    safe_text_area: 'top_half',
  },
  {
    composition_id: 'left_model_right_product',
    name: '좌모델 우제품',
    description: '모델(좌)과 제품(우)이 마주 보는 대화형 배치.',
    subject_balance: 'equal',
    visual_flow: 'left_to_right',
    negative_space: 'moderate',
    depth_layers: { foreground: 'product', midground: 'model', background: 'empty' },
    camera_balance: 'symmetric',
    product_priority: { position: 'right', rank: 'primary' },
    model_priority: { position: 'left', rank: 'primary' },
    kpi_position: 'bottom_strip',
    safe_text_area: 'top_third',
  },
  {
    composition_id: 'right_model_left_product',
    name: '우모델 좌제품',
    description: '제품(좌)→모델(우)로 읽히는 미러 배치 — 좌모델의 변주.',
    subject_balance: 'equal',
    visual_flow: 'right_to_left',
    negative_space: 'moderate',
    depth_layers: { foreground: 'product', midground: 'model', background: 'empty' },
    camera_balance: 'symmetric',
    product_priority: { position: 'left', rank: 'primary' },
    model_priority: { position: 'right', rank: 'primary' },
    kpi_position: 'bottom_strip',
    safe_text_area: 'top_third',
  },
  {
    composition_id: 'closeup_crop',
    name: '클로즈업 크롭',
    description: '피사체가 프레임을 가득 채우는 과감한 크롭 — 질감·디테일 몰입.',
    subject_balance: 'scene_dominant',
    visual_flow: 'center_out',
    negative_space: 'minimal',
    depth_layers: { foreground: 'texture', midground: 'product', background: 'empty' },
    camera_balance: 'centered',
    product_priority: { position: 'foreground', rank: 'primary' },
    model_priority: { position: 'none', rank: 'none' },
    kpi_position: 'none',
    safe_text_area: 'top_third',
  },
  {
    composition_id: 'minimal_grid',
    name: '미니멀 그리드',
    description: '수학적 여백 속 작은 피사체 — 절제된 그리드 정렬.',
    subject_balance: 'scene_dominant',
    visual_flow: 'z_pattern',
    negative_space: 'extreme',
    depth_layers: { foreground: 'product', midground: 'empty', background: 'empty' },
    camera_balance: 'weighted_right',
    product_priority: { position: 'lower_right', rank: 'primary' },
    model_priority: { position: 'none', rank: 'none' },
    kpi_position: 'none',
    safe_text_area: 'top_half',
  },
  {
    composition_id: 'bottom_product',
    name: '바텀 프로덕트',
    description: '하단 밴드에 제품, 상단은 넓은 카피 영역 — 텍스트 주도형.',
    subject_balance: 'product_dominant',
    visual_flow: 'top_to_bottom',
    negative_space: 'generous',
    depth_layers: { foreground: 'product', midground: 'text_space', background: 'texture' },
    camera_balance: 'weighted_bottom',
    product_priority: { position: 'bottom', rank: 'primary' },
    model_priority: { position: 'none', rank: 'none' },
    kpi_position: 'right_column',
    safe_text_area: 'top_half',
  },
  {
    composition_id: 'top_headline',
    name: '탑 헤드라인',
    description: '상단 절반이 초대형 타이틀 무대 — 포스터형 강한 위계.',
    subject_balance: 'equal',
    visual_flow: 'top_to_bottom',
    negative_space: 'moderate',
    depth_layers: { foreground: 'text_space', midground: 'product', background: 'model' },
    camera_balance: 'weighted_top',
    product_priority: { position: 'lower_left', rank: 'primary' },
    model_priority: { position: 'lower_right', rank: 'secondary' },
    kpi_position: 'bottom_strip',
    safe_text_area: 'top_half',
  },
  {
    composition_id: 'asymmetric_editorial',
    name: '비대칭 에디토리얼',
    description: '좌측 무게 + 우측 여백의 긴장감 — 세련된 비대칭.',
    subject_balance: 'model_dominant',
    visual_flow: 'diagonal_bl_tr',
    negative_space: 'generous',
    depth_layers: { foreground: 'model', midground: 'product', background: 'text_space' },
    camera_balance: 'weighted_left',
    product_priority: { position: 'lower_left', rank: 'secondary' },
    model_priority: { position: 'left', rank: 'primary' },
    kpi_position: 'bottom_right',
    safe_text_area: 'right_half',
  },
  {
    composition_id: 'premium_catalog',
    name: '프리미엄 카탈로그',
    description: '정면 대칭·정돈된 소품 — 브랜드 카탈로그의 신뢰 배치.',
    subject_balance: 'product_dominant',
    visual_flow: 'z_pattern',
    negative_space: 'moderate',
    depth_layers: { foreground: 'product', midground: 'props', background: 'model' },
    camera_balance: 'symmetric',
    product_priority: { position: 'center', rank: 'primary' },
    model_priority: { position: 'upper_left', rank: 'secondary' },
    kpi_position: 'left_column',
    safe_text_area: 'bottom_third',
  },
  {
    composition_id: 'depth_layered',
    name: '뎁스 레이어드',
    description: '전경 소품 → 중경 제품 → 후경 모델의 깊이감 3층 배치.',
    subject_balance: 'equal',
    visual_flow: 'diagonal_tl_br',
    negative_space: 'minimal',
    depth_layers: { foreground: 'props', midground: 'product', background: 'model' },
    camera_balance: 'weighted_left',
    product_priority: { position: 'center', rank: 'primary' },
    model_priority: { position: 'upper_right', rank: 'secondary' },
    kpi_position: 'bottom_left',
    safe_text_area: 'top_third',
  },
];

/* ═══════════════════════════════════════════════════════════════════
   Scene → Composition Mapping — 각 Scene이 쓸 수 있는 배치 후보(우선순위 포함).

   정합 원칙(불변식):
   · hero_* Scene → 모델이 있는 Composition만(model_priority.rank ≠ 'none') — Hero 상위 규칙 "모델 필수"
   · ingredient_* Scene → 모델 없는 Composition만(rank = 'none') — 원료 컷은 인물 미등장

   ⚠️현 단계는 데이터만: Prompt·imagebrief·Scene·Composition·Stage 무접촉, GPT 미호출.
   ═══════════════════════════════════════════════════════════════════ */

export interface SceneCompositionMapping {
  composition_id: string;   // COMPOSITION_LIBRARY의 id
  priority: number;         // 1 = 최우선
}

export const SCENE_COMPOSITION_MAP: Record<string, SceneCompositionMapping[]> = {
  /* ── hero (모델 있는 배치 풀: center_focus·editorial_split·diagonal_flow·magazine_cover·
        left/right_model_*·top_headline·asymmetric_editorial·premium_catalog·depth_layered) ── */
  hero_beauty: [
    { composition_id: 'magazine_cover', priority: 1 },
    { composition_id: 'editorial_split', priority: 2 },
    { composition_id: 'left_model_right_product', priority: 3 },
  ],
  hero_editorial: [
    { composition_id: 'asymmetric_editorial', priority: 1 },
    { composition_id: 'editorial_split', priority: 2 },
    { composition_id: 'diagonal_flow', priority: 3 },
  ],
  hero_campaign: [
    { composition_id: 'top_headline', priority: 1 },
    { composition_id: 'center_focus', priority: 2 },
    { composition_id: 'magazine_cover', priority: 3 },
  ],
  hero_luxury: [
    { composition_id: 'depth_layered', priority: 1 },
    { composition_id: 'premium_catalog', priority: 2 },
    { composition_id: 'center_focus', priority: 3 },
  ],
  hero_lifestyle: [
    { composition_id: 'left_model_right_product', priority: 1 },
    { composition_id: 'right_model_left_product', priority: 2 },
    { composition_id: 'diagonal_flow', priority: 3 },
  ],
  hero_applying: [
    { composition_id: 'magazine_cover', priority: 1 },
    { composition_id: 'center_focus', priority: 2 },
    { composition_id: 'editorial_split', priority: 3 },
  ],
  hero_clean: [
    // 예시의 minimal_grid는 모델 none 배치라 Hero 불변식 위반 → 모델 있는 정돈 배치로 대체
    { composition_id: 'center_focus', priority: 1 },
    { composition_id: 'premium_catalog', priority: 2 },
    { composition_id: 'top_headline', priority: 3 },
  ],
  hero_clinical: [
    { composition_id: 'premium_catalog', priority: 1 },
    { composition_id: 'center_focus', priority: 2 },
    { composition_id: 'editorial_split', priority: 3 },
  ],
  hero_soft: [
    { composition_id: 'right_model_left_product', priority: 1 },
    { composition_id: 'editorial_split', priority: 2 },
    { composition_id: 'magazine_cover', priority: 3 },
  ],
  hero_minimal: [
    { composition_id: 'asymmetric_editorial', priority: 1 },
    { composition_id: 'right_model_left_product', priority: 2 },
    { composition_id: 'top_headline', priority: 3 },
  ],
  hero_glass: [
    { composition_id: 'depth_layered', priority: 1 },
    { composition_id: 'premium_catalog', priority: 2 },
    { composition_id: 'diagonal_flow', priority: 3 },
  ],
  hero_window_light: [
    { composition_id: 'right_model_left_product', priority: 1 },   // 제품 좌(left_third)·모델 우 레시피와 일치
    { composition_id: 'diagonal_flow', priority: 2 },
    { composition_id: 'asymmetric_editorial', priority: 3 },
  ],
  hero_morning: [
    { composition_id: 'left_model_right_product', priority: 1 },   // 모델 좌 레시피와 일치
    { composition_id: 'editorial_split', priority: 2 },
    { composition_id: 'magazine_cover', priority: 3 },
  ],
  hero_reflection: [
    { composition_id: 'magazine_cover', priority: 1 },
    { composition_id: 'asymmetric_editorial', priority: 2 },
    { composition_id: 'center_focus', priority: 3 },
  ],
  hero_water: [
    { composition_id: 'depth_layered', priority: 1 },
    { composition_id: 'diagonal_flow', priority: 2 },
    { composition_id: 'top_headline', priority: 3 },
  ],

  /* ── ingredient_macro (모델 none 배치 풀: floating_product·luxury_balance·closeup_crop·
        minimal_grid·bottom_product) ── */
  ingredient_droplet: [
    { composition_id: 'closeup_crop', priority: 1 },
    { composition_id: 'floating_product', priority: 2 },
    { composition_id: 'minimal_grid', priority: 3 },
  ],
  ingredient_botanical_fresh: [
    { composition_id: 'bottom_product', priority: 1 },
    { composition_id: 'luxury_balance', priority: 2 },
    { composition_id: 'minimal_grid', priority: 3 },
  ],
  ingredient_leaf_dew: [
    { composition_id: 'closeup_crop', priority: 1 },
    { composition_id: 'minimal_grid', priority: 2 },
    { composition_id: 'floating_product', priority: 3 },
  ],
  ingredient_flat_lay: [
    { composition_id: 'minimal_grid', priority: 1 },
    { composition_id: 'bottom_product', priority: 2 },
    { composition_id: 'luxury_balance', priority: 3 },
  ],
  ingredient_powder_swirl: [
    { composition_id: 'closeup_crop', priority: 1 },
    { composition_id: 'luxury_balance', priority: 2 },
    { composition_id: 'floating_product', priority: 3 },
  ],
  ingredient_lab_glass: [
    // 예시의 premium_catalog·diagonal_flow는 모델 포함 배치라 ingredient 원칙 위반 → 모델 none 정돈 배치로 대체
    { composition_id: 'minimal_grid', priority: 1 },
    { composition_id: 'luxury_balance', priority: 2 },
    { composition_id: 'bottom_product', priority: 3 },
  ],
  ingredient_petri: [
    { composition_id: 'minimal_grid', priority: 1 },
    { composition_id: 'floating_product', priority: 2 },
    { composition_id: 'bottom_product', priority: 3 },
  ],
  ingredient_oil_drop: [
    { composition_id: 'closeup_crop', priority: 1 },
    { composition_id: 'floating_product', priority: 2 },
    { composition_id: 'luxury_balance', priority: 3 },
  ],
  ingredient_water_infusion: [
    { composition_id: 'floating_product', priority: 1 },
    { composition_id: 'closeup_crop', priority: 2 },
    { composition_id: 'luxury_balance', priority: 3 },
  ],
  ingredient_splash_crown: [
    { composition_id: 'closeup_crop', priority: 1 },
    { composition_id: 'bottom_product', priority: 2 },
    { composition_id: 'floating_product', priority: 3 },
  ],
  ingredient_slice_cross: [
    { composition_id: 'closeup_crop', priority: 1 },
    { composition_id: 'minimal_grid', priority: 2 },
    { composition_id: 'bottom_product', priority: 3 },
  ],
  ingredient_ice_fresh: [
    { composition_id: 'luxury_balance', priority: 1 },
    { composition_id: 'closeup_crop', priority: 2 },
    { composition_id: 'minimal_grid', priority: 3 },
  ],
  ingredient_mortar_craft: [
    { composition_id: 'bottom_product', priority: 1 },
    { composition_id: 'luxury_balance', priority: 2 },
    { composition_id: 'minimal_grid', priority: 3 },
  ],
  ingredient_gel_particle: [
    { composition_id: 'floating_product', priority: 1 },
    { composition_id: 'closeup_crop', priority: 2 },
    { composition_id: 'minimal_grid', priority: 3 },
  ],
  ingredient_window_herb: [
    { composition_id: 'bottom_product', priority: 1 },
    { composition_id: 'luxury_balance', priority: 2 },
    { composition_id: 'floating_product', priority: 3 },
  ],
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
  // ── ingredient_macro ──
  ingredient_droplet:         { moodKeys: ['정밀', '농축', '앰플', '에센스'] },
  ingredient_botanical_fresh: { palettes: ['green'], moodKeys: ['자연', '진정', '식물', '저자극'] },
  ingredient_leaf_dew:        { moodKeys: ['순수', '이슬', '서정'] },
  ingredient_flat_lay:        { moodKeys: ['배합', '구성', '레시피'] },
  ingredient_powder_swirl:    { palettes: ['yellow'], moodKeys: ['분말', '비타민', '파우더'] },
  ingredient_lab_glass:       { moodKeys: ['더마', '기능성', '임상', '연구'] },
  ingredient_petri:           { moodKeys: ['검증', '테스트', '과학'] },
  ingredient_oil_drop:        { palettes: ['brown'], moodKeys: ['영양', '오일', '리치', '고보습'] },
  ingredient_water_infusion:  { palettes: ['blue'], moodKeys: ['수분', '워터'] },
  ingredient_splash_crown:    { palettes: ['blue'], moodKeys: ['청량', '임팩트', '상쾌'] },
  ingredient_slice_cross:     { categories: ['식품'], palettes: ['yellow'], moodKeys: ['과일', '원물', '신선'] },
  ingredient_ice_fresh:       { moodKeys: ['쿨링', '시원', '냉장'] },
  ingredient_mortar_craft:    { palettes: ['brown'], moodKeys: ['핸드메이드', '정성', '내추럴'] },
  ingredient_gel_particle:    { moodKeys: ['겔', '투명', '제형'] },
  ingredient_window_herb:     { moodKeys: ['산지', '햇살', '자연광'] },
  // ── hero ──
  hero_beauty:        { categories: ['화장품'], channels: ['올리브영'], palettes: ['pink'], moodKeys: ['뷰티', '화사', '생기'] },
  hero_editorial:     { moodKeys: ['에디토리얼', '감성', '세련', '무드'] },
  hero_campaign:      { channels: ['쿠팡'], palettes: ['yellow'], moodKeys: ['임팩트', '활력', '볼드', '캠페인'] },
  hero_luxury:        { palettes: ['purple'], moodKeys: ['프리미엄', '고급', '럭셔리', '명품'] },
  hero_lifestyle:     { categories: ['식품', '리빙'], palettes: ['brown'], moodKeys: ['일상', '편안', '내추럴'] },
  hero_applying:      { moodKeys: ['사용감', '흡수', '밀착', '발림'] },
  hero_clean:         { categories: ['화장품'], palettes: ['green'], moodKeys: ['클린', '저자극', '순한', '진정'] },
  hero_clinical:      { moodKeys: ['더마', '임상', '기능성', '신뢰'] },
  hero_soft:          { palettes: ['pink'], moodKeys: ['포근', '파스텔', '부드러'] },
  hero_minimal:       { palettes: ['gray'], moodKeys: ['미니멀', '절제', '여백'] },
  hero_glass:         { palettes: ['blue'], moodKeys: ['투명', '청량'] },
  hero_window_light:  { moodKeys: ['햇살', '자연광', '창가'] },
  hero_morning:       { moodKeys: ['아침', '모닝', '루틴'] },
  hero_reflection:    { moodKeys: ['거울', '셀프케어'] },
  hero_water:         { palettes: ['blue'], moodKeys: ['수분', '촉촉', '워터', '보습'] },
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

/* ═══════════════════════════════════════════════════════════════════
   Director Engine — Scene(무엇을 찍나) + Composition(어떻게 배치하나) → DirectorSpec(촬영 지시서).

   병합 규칙(결정적, 랜덤 0):
   · 배치(위치·흐름·KPI·텍스트영역·레이어) = Composition이 결정
   · 내용(카메라·조명·소품·배경 재질·규칙) = Scene이 결정
   · 스케일 = Scene의 권장 비중 범위를 Composition의 rank로 보간
     (primary → 범위 상단 3/4 지점, secondary → 하단 1/4 지점, none → 0)
   · ★Hero 불변식 방어: Scene이 모델을 요구(min>0)하면 어떤 Composition과 조합돼도 model_scale ≥ Scene min

   ⚠️현 단계는 파생 데이터만: Prompt 문자열 미생성, imagebrief·Stage·Scene·Composition 무접촉, GPT 미호출.
   ═══════════════════════════════════════════════════════════════════ */

export interface DirectorSpec {
  camera_instruction: string;      // 카메라 — 앵글·거리·렌즈·심도
  subject_instruction: string;     // 피사체 — 지배 주체 + 제품/모델 위치·우선순위
  layout_instruction: string;      // 지면 — 시선 흐름·무게 중심·텍스트 안전영역·여백
  depth_instruction: string;       // 레이어 — 전/중/후경에 무엇이 오나(Scene 어휘로 해석)
  lighting_instruction: string;    // 조명 — Scene 조명 + 그림자 스타일
  product_scale: number;           // 제품 화면 비중 %
  model_scale: number;             // 모델 화면 비중 % (0 = 미등장)
  kpi_style: string;               // KPI/특징 스트립 스타일
  background_priority: string;     // 배경 — 재질(Scene) + 후경 처리(Composition·심도)
}

const FLOW_P: Record<VisualFlow, string> = {
  top_to_bottom: 'eye flow from top to bottom', left_to_right: 'eye flow from left to right',
  right_to_left: 'eye flow from right to left', diagonal_tl_br: 'diagonal eye flow from upper-left to lower-right',
  diagonal_bl_tr: 'diagonal eye flow from lower-left to upper-right', center_out: 'eye flow radiating from the center',
  z_pattern: 'Z-pattern eye flow',
};
const BALANCE_P: Record<CameraBalance, string> = {
  symmetric: 'symmetric weight', centered: 'centered weight', weighted_left: 'visual weight on the left',
  weighted_right: 'visual weight on the right', weighted_top: 'visual weight on the top', weighted_bottom: 'visual weight on the bottom',
};
const ZONE_P: Record<PlacementZone, string> = {
  center: 'at the center', left: 'on the left', right: 'on the right', top: 'along the top', bottom: 'along the bottom',
  upper_left: 'in the upper-left', upper_right: 'in the upper-right', lower_left: 'in the lower-left',
  lower_right: 'in the lower-right', foreground: 'filling the foreground', none: '',
};
const TEXT_AREA_P: Record<SafeTextArea, string> = {
  top_third: 'keep the top third clear for the headline', top_half: 'keep the top half clear for the headline',
  left_half: 'keep the left half clear for the headline', right_half: 'keep the right half clear for the headline',
  bottom_third: 'keep the bottom third clear for the headline', center_band: 'keep a clear horizontal band across the center for the headline',
};
const KPI_STYLE_P: Record<KpiZone, string> = {
  bottom_strip: 'thin minimal KPI strip along the bottom', bottom_left: 'compact KPI chip cluster at the bottom-left',
  bottom_right: 'compact KPI chip cluster at the bottom-right', left_column: 'slim vertical KPI column on the left',
  right_column: 'slim vertical KPI column on the right', none: 'no KPI elements',
};
const SUBJECT_BALANCE_P: Record<SubjectBalance, string> = {
  product_dominant: 'the product dominates the frame', model_dominant: 'the model dominates the frame',
  equal: 'product and model share equal presence', scene_dominant: 'the scene itself dominates the frame',
};

/** Composition의 레이어 내용을 Scene 어휘로 해석 — 예: props→그 장면의 소품, texture→그 장면의 표면 재질 */
function layerContent(content: LayerContent, scene: SceneSpec): string {
  switch (content) {
    case 'product':    return 'the product';
    case 'model':      return 'the model';
    case 'props':      return PROP_P[scene.prop_style] || 'styling props';
    case 'texture':    return SURF_P[scene.surface_material] ? SURF_P[scene.surface_material].replace(/^on /, '') : BG_P[scene.background_material];
    case 'text_space': return 'clean copy space';
    case 'empty':      return 'clean empty space';
  }
}

/** 비중 범위 [min,max]를 rank로 보간 — primary=상단 3/4, secondary=하단 1/4, none=0. Hero 방어 floor 적용. */
function scaleFor(range: [number, number], rank: PriorityRank, floorMin: number): number {
  if (rank === 'none') return Math.max(0, floorMin);   // Scene이 모델을 요구하면 floor가 살림
  const [min, max] = range;
  const t = rank === 'primary' ? 0.75 : 0.25;
  return Math.max(floorMin, Math.round(min + (max - min) * t));
}

/** Scene + Composition → 촬영 지시서. 순수 함수(결정적) — 같은 입력이면 항상 같은 지시서.
 *
 *  ★Hero 전용 규칙(메디힐형 "모델+제품+깊이감") — scene_id가 hero_*면 Composition 값을 다음으로 override:
 *   1. 제품 = 항상 primary subject / 모델 = support(secondary) — 동등 경쟁 금지
 *   2. 제품 크기 20% 축소(손에 든 실제 비율 — 요구범위 15~25% 내 고정값)
 *   3. 모델은 제품 뒤/옆에서 강조 역할(supporting without competing)
 *   4. 깊이 4층: 전경 소품 → 제품 → 모델 → 배경
 *   5. KPI = thin translucent premium information strip(하단 아이콘 나열 금지) */
export function buildDirectorSpec(scene: SceneSpec, comp: CompositionSpec): DirectorSpec {
  const isHero = scene.scene_id.startsWith('hero_');
  const modelFloor = scene.recommended_model_ratio[0];   // Hero면 ≥30 — Composition이 none이어도 유지

  if (isHero) {
    const modelZone = comp.model_priority.position !== 'none' ? ZONE_P[comp.model_priority.position] : MPOS_P[scene.model_position];
    // 전경은 장면의 소품 어휘(없으면 미세 깊이 요소) — 제품·모델은 2·3층으로 고정
    const fgPhrase = scene.prop_style !== 'none' ? PROP_P[scene.prop_style] : 'subtle depth elements';
    const [pMin, pMax] = scene.recommended_product_ratio;
    return {
      camera_instruction: [
        ANGLE_P[scene.camera_angle], DIST_P[scene.camera_distance],
        LENS_P[scene.lens_style], DOF_P[scene.depth_of_field],
      ].join(', '),
      subject_instruction:
        `the product leads as the primary subject — the product ${ZONE_P[comp.product_priority.position]} at a realistic hand-held size (primary), ` +
        `the model ${modelZone} slightly behind or beside it, supporting and presenting the product without competing for attention (secondary)`,
      layout_instruction: [
        FLOW_P[comp.visual_flow], BALANCE_P[comp.camera_balance],
        TEXT_AREA_P[comp.safe_text_area], NSPACE_P[comp.negative_space],
      ].join(', '),
      // 4층 깊이 — 번역기의 3분할 파싱과 호환되도록 중경에 제품→모델 순서를 서술
      depth_instruction:
        `foreground: ${fgPhrase} / ` +
        `midground: the product held in front with the model just behind it / ` +
        `background: ${layerContent(comp.depth_layers.background, scene)}`,
      lighting_instruction: `${scene.recommended_lighting}, ${SHDW_P[scene.shadow_style]}`,
      product_scale: Math.round((pMin + (pMax - pMin) * 0.75) * 0.8),   // primary 보간 후 20% 축소
      model_scale: Math.max(modelFloor, Math.round(scene.recommended_model_ratio[0] + (scene.recommended_model_ratio[1] - scene.recommended_model_ratio[0]) * 0.25)),
      kpi_style: 'thin translucent premium information strip — a slim floating card along the bottom, no icon row',
      background_priority: `${BG_P[scene.background_material]}${scene.depth_of_field === 'shallow' || scene.depth_of_field === 'extreme_shallow' ? ', softly blurred behind the subject' : ', kept crisp'}`,
    };
  }

  const productParts = [`the product ${ZONE_P[comp.product_priority.position]} (${comp.product_priority.rank})`];
  if (comp.model_priority.rank !== 'none' || modelFloor > 0) {
    const zone = comp.model_priority.position !== 'none' ? ZONE_P[comp.model_priority.position] : MPOS_P[scene.model_position];
    productParts.push(`the model ${zone} (${comp.model_priority.rank !== 'none' ? comp.model_priority.rank : 'secondary'})`);
  }

  return {
    camera_instruction: [
      ANGLE_P[scene.camera_angle], DIST_P[scene.camera_distance],
      LENS_P[scene.lens_style], DOF_P[scene.depth_of_field],
    ].join(', '),
    subject_instruction: `${SUBJECT_BALANCE_P[comp.subject_balance]} — ${productParts.join(', ')}`,
    layout_instruction: [
      FLOW_P[comp.visual_flow], BALANCE_P[comp.camera_balance],
      TEXT_AREA_P[comp.safe_text_area], NSPACE_P[comp.negative_space],
    ].join(', '),
    depth_instruction:
      `foreground: ${layerContent(comp.depth_layers.foreground, scene)} / ` +
      `midground: ${layerContent(comp.depth_layers.midground, scene)} / ` +
      `background: ${layerContent(comp.depth_layers.background, scene)}`,
    lighting_instruction: `${scene.recommended_lighting}, ${SHDW_P[scene.shadow_style]}`,
    product_scale: scaleFor(scene.recommended_product_ratio, comp.product_priority.rank, 0),
    model_scale: scaleFor(scene.recommended_model_ratio, comp.model_priority.rank, modelFloor),
    kpi_style: KPI_STYLE_P[comp.kpi_position],
    background_priority: `${BG_P[scene.background_material]}${scene.depth_of_field === 'shallow' || scene.depth_of_field === 'extreme_shallow' ? ', softly blurred behind the subject' : ', kept crisp'}`,
  };
}

/* ═══════════════════════════════════════════════════════════════════
   Prompt Translator — DirectorSpec → 자연스러운 영문 촬영 지시문.

   규칙: enum·기계 마커를 그대로 출력하지 않는다 — "(primary)" 같은 rank 괄호,
   "foreground: X / midground: Y" 같은 필드 구분자를 전부 사람이 쓰는
   광고 촬영 디렉션 문장으로 재조립한다. (밑줄 포함 토큰 0 — 검증으로 강제)

   ⚠️함수만 구현 — imagebrief 미연결, GPT 미호출, Stage 무접촉.
   ═══════════════════════════════════════════════════════════════════ */

const capFirst = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** DirectorSpec → GPT Image용 자연 영문 디렉터 프롬프트(문장 나열, 광고 촬영 지시문 톤).
 *  @param opts.physicalSize Physical Size Engine 출력(제품 형태·용량 기반 실물 크기 지시) —
 *    제공되면 범용 실물비율 블록을 제품 맞춤 문장으로 대체(모델 서포트 문장은 유지). */
export function directorSpecToPrompt(spec: DirectorSpec, opts?: { physicalSize?: string }): string {
  const sentences: string[] = [];

  // 1. 카메라 — "eye-level camera, medium framing, 85mm portrait lens rendering, shallow depth of field"
  sentences.push(`Professional advertising photography — ${spec.camera_instruction}.`);

  // 2. 피사체 — 지배 주체 문장 + ★실물 비율 자연어(% 지시 금지 — GPT Image가 화면 점유율로 해석해
  //    제품을 과도하게 키우는 문제. 스케일 숫자는 모델 유무 분기 신호로만 쓰고 문장에 노출하지 않는다.)
  const [balancePart, placementPart] = spec.subject_instruction.split(' — ');
  sentences.push(`${capFirst(balancePart)}.`);
  if (spec.model_scale > 0) {
    if (opts?.physicalSize) {
      // ★Physical Size Engine — 제품 형태·용량 맞춤 실물 크기 지시(범용 블록 대체)
      sentences.push(opts.physicalSize);
    } else {
      sentences.push(
        `Use realistic real-world product proportions — the product appears at its natural physical size, ` +
        `comfortably hand-held in one hand and naturally proportional to the model's face and hands.`,
      );
      sentences.push(
        `Avoid oversized hero product rendering; do not enlarge the product for dramatic emphasis — ` +
        `it should feel like the real physical product photographed in a commercial shoot.`,
      );
    }
    sentences.push(
      `Keep the model naturally larger than the product, supporting the product presentation rather than competing with it.`,
    );
  } else {
    if (opts?.physicalSize) {
      sentences.push(opts.physicalSize);
      sentences.push(`No people present in the frame.`);
    } else {
      sentences.push(
        `The product appears at its natural physical size with no people present; avoid oversized dramatic product rendering.`,
      );
    }
  }
  if (placementPart) {
    sentences.push(`Position ${placementPart.replace(/\s*\((?:primary|secondary)\)/g, '')}.`);
  }

  // 3. 지면 — [시선 흐름, 무게, 텍스트영역, 여백] 을 디렉션 문장으로
  const [flow, weight, textArea, space] = spec.layout_instruction.split(', ');
  sentences.push(`Compose with ${flow} and ${weight}; ${textArea}; keep a ${space}.`);

  // 4. 레이어 — "foreground: X / midground: Y / background: Z" → 깊이 서술문
  const layers = spec.depth_instruction.split(' / ').map(p => p.split(': ')[1]);
  if (layers.length === 3 && layers.every(Boolean)) {
    sentences.push(`For depth, place ${layers[0]} in the foreground, ${layers[1]} in the midground, and ${layers[2]} in the background.`);
  }

  // 5. 조명
  sentences.push(`Lit by ${spec.lighting_instruction}.`);

  // 6. KPI — ★Hero는 "프리미엄 정보 바"로 풀 디렉션(아이콘 3개 나열·템플릿 UI 느낌 제거).
  //    Director의 kpi_style 문자열은 무수정 — 'premium information strip' 포함 여부를 감지 신호로만 사용.
  if (spec.kpi_style.includes('premium information strip')) {
    sentences.push(
      `Create a slim premium information strip along the bottom — a clean translucent panel in soft white, with thin separators between each item.`,
    );
    sentences.push(
      `Minimal editorial layout in a luxury skincare advertising style: typography is the primary visual element, with generous spacing and premium alignment.`,
    );
    sentences.push(
      `Each strip item is a short title with an optional brief description; use small elegant line icons only if necessary.`,
    );
    sentences.push(
      `Do not use oversized icons, large circular badges, three-part cards, or thick boxes — no infographic, no dashboard, no colorful cards, no thick borders, no heavy shadows, no template UI feeling.`,
    );
  } else {
    sentences.push(`${capFirst(spec.kpi_style)}.`);
  }

  // 7. 배경 우선순위
  sentences.push(`The background is a ${spec.background_priority}.`);

  return sentences.join(' ');
}
