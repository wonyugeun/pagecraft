/**
 * Pose Library — 광고 촬영에서 실제 쓰는 "손 포즈" 사전.
 *
 * "제품을 든다" 수준이 아니라, 손가락 위치·손목 각도·팔꿈치 노출·몸 방향까지
 * 데이터화해 AI 손 붕괴(손가락 6개·융합·겹침)를 구조적으로 막는 계층.
 *
 * 역할 분리: Scene(무엇을)·Composition(구도)·Layout(배치)·Director(촬영)와 독립 —
 * 이 파일은 다른 라이브러리를 import하지 않는다.
 *
 * ⚠️현 단계는 데이터만: Prompt·Director·Translator·imagebrief 미연결, GPT 미호출.
 */

/* ── enum (전부 고정 union — 자유 텍스트 금지) ── */
export type HandCount = 'none' | 'one' | 'two';
export type ProductContact = 'full_grip' | 'light_grip' | 'fingertips' | 'palm_rest' | 'cradled' | 'none';
export type FingerPosition = 'wrapped' | 'relaxed_open' | 'aligned_straight' | 'gentle_curve' | 'soft_pinch' | 'spread_soft' | 'hidden';
export type WristAngle = 'neutral' | 'slightly_bent' | 'raised' | 'turned_in' | 'turned_out';
export type ElbowVisibility = 'hidden' | 'partial' | 'visible';
export type BodyOrientation = 'front' | 'three_quarter' | 'side' | 'back_glance';
export type FaceDirection = 'to_camera' | 'to_product' | 'downward' | 'away' | 'profile';
export type CameraSuitability = 'closeup' | 'medium' | 'medium_wide' | 'wide';

export interface PoseSpec {
  pose_id: string;
  name: string;                          // 한국어 표시명
  description: string;                   // 어떤 포즈이고 언제 쓰나 (한국어)
  hand_count: HandCount;
  product_contact: ProductContact;
  finger_position: FingerPosition;
  wrist_angle: WristAngle;
  elbow_visibility: ElbowVisibility;
  body_orientation: BodyOrientation;
  face_direction: FaceDirection;
  camera_suitability: CameraSuitability[];  // 이 포즈가 잘 읽히는 프레이밍
  positive_rules: string[];              // 지킬 것 (영문) — 공통 손 규칙 포함
  negative_rules: string[];              // 금지 (영문) — 공통 손 규칙 포함
}

/* ── 공통 손 규칙 — 모든 포즈의 rules에 병합(요구사항 4: 전 포즈 필수 포함) ── */
export const HAND_POSITIVE_RULES = [
  'five fingers only on each visible hand',
  'natural finger joints and knuckles',
  'hands never overlap each other',
  'natural cosmetic advertising pose',
] as const;

export const HAND_NEGATIVE_RULES = [
  'duplicated fingers',
  'fused or merged fingers',
  'interlocked fingers',
  'extra or missing fingers',
  'broken or bent-back wrist',
] as const;

const P = (...specific: string[]) => [...HAND_POSITIVE_RULES, ...specific];
const N = (...specific: string[]) => [...HAND_NEGATIVE_RULES, ...specific];

/** Pose Library — Hero 기준 20종. 광고 실무 손 포즈의 결정적 사전. */
export const POSE_LIBRARY: PoseSpec[] = [
  {
    pose_id: 'hold_front',
    name: '정면 홀드',
    description: '가슴 앞에서 라벨이 정면을 향하게 드는 기본 광고 포즈.',
    hand_count: 'one', product_contact: 'light_grip', finger_position: 'wrapped',
    wrist_angle: 'neutral', elbow_visibility: 'partial', body_orientation: 'front', face_direction: 'to_camera',
    camera_suitability: ['medium', 'medium_wide'],
    positive_rules: P('label fully visible and unobstructed by fingers', 'product held at chest height'),
    negative_rules: N('fingers covering the label', 'white-knuckle tight grip'),
  },
  {
    pose_id: 'hold_bottom',
    name: '바텀 홀드',
    description: '병의 아랫부분만 받쳐 들어 라벨 전체를 여는 포즈.',
    hand_count: 'one', product_contact: 'palm_rest', finger_position: 'gentle_curve',
    wrist_angle: 'neutral', elbow_visibility: 'hidden', body_orientation: 'front', face_direction: 'to_product',
    camera_suitability: ['closeup', 'medium'],
    positive_rules: P('palm supporting the base only', 'entire label exposed above the hand'),
    negative_rules: N('hand climbing above the lower third of the bottle'),
  },
  {
    pose_id: 'hold_side',
    name: '사이드 홀드',
    description: '몸 옆에서 45도로 들어 실루엣과 제품을 함께 보여주는 포즈.',
    hand_count: 'one', product_contact: 'light_grip', finger_position: 'wrapped',
    wrist_angle: 'slightly_bent', elbow_visibility: 'visible', body_orientation: 'three_quarter', face_direction: 'to_camera',
    camera_suitability: ['medium', 'medium_wide', 'wide'],
    positive_rules: P('relaxed arm line from shoulder to wrist', 'product angled toward camera'),
    negative_rules: N('stiff straight robotic arm', 'product pointing away from camera'),
  },
  {
    pose_id: 'hold_one_hand',
    name: '원 핸드',
    description: '한 손 그립의 자연스러운 실물 비율 강조 — 크기 인지 기준 포즈.',
    hand_count: 'one', product_contact: 'full_grip', finger_position: 'wrapped',
    wrist_angle: 'neutral', elbow_visibility: 'partial', body_orientation: 'front', face_direction: 'to_product',
    camera_suitability: ['closeup', 'medium'],
    positive_rules: P('fingers wrap naturally showing true hand-to-product scale', 'thumb visible along the body'),
    negative_rules: N('product dwarfing the hand', 'hand dwarfing the product'),
  },
  {
    pose_id: 'hold_two_hand',
    name: '투 핸드',
    description: '두 손으로 소중히 감싸 쥐는 선물·정성의 포즈.',
    hand_count: 'two', product_contact: 'cradled', finger_position: 'gentle_curve',
    wrist_angle: 'turned_in', elbow_visibility: 'partial', body_orientation: 'front', face_direction: 'downward',
    camera_suitability: ['closeup', 'medium'],
    positive_rules: P('both hands cupping gently from below and sides', 'clear gap between the two hands'),
    negative_rules: N('praying-hands gesture', 'both thumbs crossing over the label'),
  },
  {
    pose_id: 'hold_face_side',
    name: '페이스 사이드',
    description: '얼굴 옆(볼 높이)에 제품을 나란히 드는 스킨케어 시그니처 포즈.',
    hand_count: 'one', product_contact: 'light_grip', finger_position: 'wrapped',
    wrist_angle: 'raised', elbow_visibility: 'hidden', body_orientation: 'front', face_direction: 'to_camera',
    camera_suitability: ['closeup', 'medium'],
    positive_rules: P('product beside the cheek at eye level', 'product clearly smaller than the face'),
    negative_rules: N('product touching or pressing the skin', 'product covering any part of the face'),
  },
  {
    pose_id: 'apply_cheek',
    name: '어플라이 치크',
    description: '볼에 내용물을 바르는 순간 — 사용감 전달 포즈(제품은 다른 손).',
    hand_count: 'two', product_contact: 'light_grip', finger_position: 'aligned_straight',
    wrist_angle: 'raised', elbow_visibility: 'hidden', body_orientation: 'three_quarter', face_direction: 'to_camera',
    camera_suitability: ['closeup'],
    positive_rules: P('two fingertips gently touching the cheek', 'other hand holding the product lower in frame'),
    negative_rules: N('palm smearing the whole face', 'fingers poking the eye area'),
  },
  {
    pose_id: 'point_product',
    name: '포인트',
    description: '검지로 제품을 가리키는 추천·강조 포즈.',
    hand_count: 'one', product_contact: 'none', finger_position: 'aligned_straight',
    wrist_angle: 'neutral', elbow_visibility: 'partial', body_orientation: 'three_quarter', face_direction: 'to_camera',
    camera_suitability: ['medium', 'medium_wide'],
    positive_rules: P('single relaxed index finger pointing at the product', 'other fingers softly curled'),
    negative_rules: N('aggressive jabbing gesture', 'finger touching the product'),
  },
  {
    pose_id: 'table_display',
    name: '테이블 디스플레이',
    description: '제품은 테이블 위, 모델의 손은 곁에 자연스럽게 놓인 포즈.',
    hand_count: 'one', product_contact: 'none', finger_position: 'relaxed_open',
    wrist_angle: 'neutral', elbow_visibility: 'visible', body_orientation: 'three_quarter', face_direction: 'to_product',
    camera_suitability: ['medium', 'medium_wide'],
    positive_rules: P('hand resting flat near the product, not on it', 'product standing upright on the surface'),
    negative_rules: N('hand shadow falling over the label', 'fingers drumming or tense'),
  },
  {
    pose_id: 'product_near_face',
    name: '니어 페이스',
    description: '턱선 근처로 제품을 올려 피부와 제품을 한 프레임에 담는 포즈.',
    hand_count: 'one', product_contact: 'fingertips', finger_position: 'soft_pinch',
    wrist_angle: 'raised', elbow_visibility: 'hidden', body_orientation: 'front', face_direction: 'to_camera',
    camera_suitability: ['closeup'],
    positive_rules: P('fingertips presenting the product near the jawline', 'skin texture and product both in focus'),
    negative_rules: N('product blocking the chin or lips', 'clawed fingertip grip'),
  },
  {
    pose_id: 'shoulder_hold',
    name: '숄더 홀드',
    description: '어깨 높이에 제품을 올려 드는 캠페인 화보 포즈.',
    hand_count: 'one', product_contact: 'light_grip', finger_position: 'wrapped',
    wrist_angle: 'raised', elbow_visibility: 'visible', body_orientation: 'three_quarter', face_direction: 'to_camera',
    camera_suitability: ['medium', 'medium_wide'],
    positive_rules: P('product resting at shoulder height beside the face line', 'elbow forming a soft triangle'),
    negative_rules: N('product balanced on the shoulder without a hand', 'arm covering the chest awkwardly'),
  },
  {
    pose_id: 'palm_support',
    name: '팜 서포트',
    description: '펼친 손바닥 위에 제품을 올려 진열하듯 보여주는 포즈.',
    hand_count: 'one', product_contact: 'palm_rest', finger_position: 'spread_soft',
    wrist_angle: 'neutral', elbow_visibility: 'partial', body_orientation: 'front', face_direction: 'to_product',
    camera_suitability: ['closeup', 'medium'],
    positive_rules: P('product standing upright on an open flat palm', 'fingers softly spread beneath, not gripping'),
    negative_rules: N('product tipping or floating above the palm', 'fingers curling up around the product'),
  },
  {
    pose_id: 'fingertip_support',
    name: '핑거팁 서포트',
    description: '손끝만으로 가볍게 받쳐 제품을 보석처럼 다루는 포즈.',
    hand_count: 'one', product_contact: 'fingertips', finger_position: 'soft_pinch',
    wrist_angle: 'slightly_bent', elbow_visibility: 'hidden', body_orientation: 'front', face_direction: 'to_product',
    camera_suitability: ['closeup'],
    positive_rules: P('only fingertips touching the base and cap', 'jewel-like delicate handling'),
    negative_rules: N('full fist appearing in frame', 'product slipping between fingers'),
  },
  {
    pose_id: 'cosmetic_editorial',
    name: '코스메틱 에디토리얼',
    description: '시선은 밖으로, 손은 제품과 함께 — 잡지 화보의 절제된 포즈.',
    hand_count: 'one', product_contact: 'light_grip', finger_position: 'gentle_curve',
    wrist_angle: 'turned_out', elbow_visibility: 'visible', body_orientation: 'side', face_direction: 'away',
    camera_suitability: ['medium', 'medium_wide', 'wide'],
    positive_rules: P('editorial detachment — model not looking at camera or product', 'long elegant arm line'),
    negative_rules: N('commercial smile at the camera', 'tense shoulders'),
  },
  {
    pose_id: 'luxury_hold',
    name: '럭셔리 홀드',
    description: '낮은 조도 속 느린 손 — 제품을 예물처럼 드는 프리미엄 포즈.',
    hand_count: 'two', product_contact: 'cradled', finger_position: 'gentle_curve',
    wrist_angle: 'turned_in', elbow_visibility: 'hidden', body_orientation: 'front', face_direction: 'downward',
    camera_suitability: ['closeup', 'medium'],
    positive_rules: P('slow deliberate hand placement', 'product presented like a precious object'),
    negative_rules: N('casual loose grip', 'busy jewelry cluttering the hands'),
  },
  {
    pose_id: 'clinical_hold',
    name: '클리니컬 홀드',
    description: '정갈하고 중립적인 그립 — 더마·기능성의 신뢰 포즈.',
    hand_count: 'one', product_contact: 'light_grip', finger_position: 'aligned_straight',
    wrist_angle: 'neutral', elbow_visibility: 'hidden', body_orientation: 'front', face_direction: 'to_product',
    camera_suitability: ['closeup', 'medium'],
    positive_rules: P('clean bare nails, clinical neutrality', 'product held perfectly vertical'),
    negative_rules: N('decorative nail art', 'playful tilted angles'),
  },
  {
    pose_id: 'beauty_campaign',
    name: '뷰티 캠페인',
    description: '카메라 정면 아이컨택 + 제품 전면 — 메인 캠페인 컷 포즈.',
    hand_count: 'one', product_contact: 'light_grip', finger_position: 'wrapped',
    wrist_angle: 'raised', elbow_visibility: 'partial', body_orientation: 'front', face_direction: 'to_camera',
    camera_suitability: ['medium'],
    positive_rules: P('confident direct eye contact with camera', 'product held between chest and chin height'),
    negative_rules: N('product held above the head', 'exaggerated open-mouth expression'),
  },
  {
    pose_id: 'magazine_pose',
    name: '매거진 포즈',
    description: '몸을 비틀어 어깨 너머로 시선 — 커버용 다이내믹 포즈.',
    hand_count: 'one', product_contact: 'light_grip', finger_position: 'wrapped',
    wrist_angle: 'slightly_bent', elbow_visibility: 'visible', body_orientation: 'back_glance', face_direction: 'to_camera',
    camera_suitability: ['medium_wide', 'wide'],
    positive_rules: P('over-the-shoulder glance with the product forward', 'dynamic but balanced body twist'),
    negative_rules: N('unnatural neck rotation', 'product hidden behind the body'),
  },
  {
    pose_id: 'standing_hold',
    name: '스탠딩 홀드',
    description: '서 있는 전신·상반신 컷에서 자연스럽게 제품을 든 포즈.',
    hand_count: 'one', product_contact: 'light_grip', finger_position: 'wrapped',
    wrist_angle: 'neutral', elbow_visibility: 'visible', body_orientation: 'three_quarter', face_direction: 'to_camera',
    camera_suitability: ['medium_wide', 'wide'],
    positive_rules: P('relaxed standing posture with weight on one leg', 'free arm hanging naturally'),
    negative_rules: N('soldier-stiff stance', 'both arms doing the same gesture'),
  },
  {
    pose_id: 'sitting_hold',
    name: '시팅 홀드',
    description: '앉은 자세에서 무릎 위·테이블 위로 제품을 드는 편안한 포즈.',
    hand_count: 'two', product_contact: 'cradled', finger_position: 'relaxed_open',
    wrist_angle: 'neutral', elbow_visibility: 'visible', body_orientation: 'three_quarter', face_direction: 'downward',
    camera_suitability: ['medium', 'medium_wide'],
    positive_rules: P('elbows resting comfortably, product at lap or table height', 'soft intimate atmosphere'),
    negative_rules: N('slouched collapsed posture', 'knees blocking the product'),
  },
];

/* ═══════════════════════════════════════════════════════════════════
   Pose Selection Engine — Scene(+Layout·상품 특성)별 최적 Pose를 "결정적으로" 선택.

   1) Scene마다 추천 Pose 후보(순서 = 기본 우선순위) — SCENE_POSE_MAP
   2) category/channel/palette/mood/layout_id 채점으로 후보 중 1개 확정
   3) 동점 = 후보 순서, 무신호 = 첫 후보 — 같은 입력이면 항상 같은 결과(랜덤 0)

   ⚠️scene_id·layout_id는 문자열 계약(타 라이브러리와 독립 유지 — import 없음).
   ⚠️ingredient_* Scene은 인물 미등장 컷 — 후보는 손이 없거나(테이블 진열)
     손끝 카메오만 허용되는 포즈 위주. 실제 사용 여부는 연결 단계에서 결정.
   ═══════════════════════════════════════════════════════════════════ */

/** Scene → 추천 Pose 후보(배열 순서 = 우선순위). 미등록 scene은 DEFAULT_POSE_CANDIDATES 폴백. */
export const SCENE_POSE_MAP: Record<string, string[]> = {
  // ── hero ──
  hero_beauty:       ['beauty_campaign', 'hold_face_side', 'hold_front'],
  hero_editorial:    ['magazine_pose', 'luxury_hold', 'product_near_face'],
  hero_campaign:     ['standing_hold', 'beauty_campaign', 'hold_side'],
  hero_luxury:       ['luxury_hold', 'fingertip_support', 'hold_two_hand'],
  hero_lifestyle:    ['sitting_hold', 'table_display', 'hold_side'],
  hero_applying:     ['apply_cheek', 'product_near_face', 'hold_face_side'],
  hero_clean:        ['hold_front', 'palm_support', 'beauty_campaign'],
  hero_clinical:     ['clinical_hold', 'hold_front', 'palm_support'],
  hero_soft:         ['hold_two_hand', 'hold_face_side', 'palm_support'],
  hero_minimal:      ['fingertip_support', 'hold_bottom', 'clinical_hold'],
  hero_glass:        ['fingertip_support', 'luxury_hold', 'hold_bottom'],
  hero_window_light: ['table_display', 'sitting_hold', 'hold_side'],
  hero_morning:      ['hold_face_side', 'sitting_hold', 'apply_cheek'],
  hero_reflection:   ['product_near_face', 'hold_face_side', 'beauty_campaign'],
  hero_water:        ['hold_bottom', 'palm_support', 'hold_one_hand'],
  // ── ingredient_macro (인물 미등장 컷 — 진열·손끝·클리니컬 계열) ──
  ingredient_droplet:         ['fingertip_support', 'clinical_hold', 'table_display'],
  ingredient_botanical_fresh: ['table_display', 'palm_support', 'fingertip_support'],
  ingredient_leaf_dew:        ['table_display', 'fingertip_support', 'clinical_hold'],
  ingredient_flat_lay:        ['table_display', 'clinical_hold', 'palm_support'],
  ingredient_powder_swirl:    ['table_display', 'fingertip_support', 'clinical_hold'],
  ingredient_lab_glass:       ['clinical_hold', 'table_display', 'fingertip_support'],
  ingredient_petri:           ['clinical_hold', 'fingertip_support', 'table_display'],
  ingredient_oil_drop:        ['fingertip_support', 'table_display', 'clinical_hold'],
  ingredient_water_infusion:  ['table_display', 'fingertip_support', 'hold_bottom'],
  ingredient_splash_crown:    ['table_display', 'hold_bottom', 'fingertip_support'],
  ingredient_slice_cross:     ['table_display', 'palm_support', 'fingertip_support'],
  ingredient_ice_fresh:       ['fingertip_support', 'table_display', 'hold_bottom'],
  ingredient_mortar_craft:    ['table_display', 'palm_support', 'clinical_hold'],
  ingredient_gel_particle:    ['fingertip_support', 'clinical_hold', 'table_display'],
  ingredient_window_herb:     ['table_display', 'sitting_hold', 'palm_support'],
};

/** scene_id 미등록/미지정 시 폴백 후보 */
export const DEFAULT_POSE_CANDIDATES = ['hold_front', 'hold_one_hand', 'beauty_campaign'];

/** 포즈별 적합 신호 — 후보 안에서만 채점(카테고리 +3 / 채널 +2 / 팔레트 +2 / 무드 키워드당 +3 / 레이아웃 일치 +2) */
interface PoseAffinity {
  categories?: string[];
  channels?: string[];
  palettes?: string[];
  moodKeys?: string[];
  layouts?: string[];   // layoutLibrary의 layout_id (문자열 계약)
}

const POSE_AFFINITY: Record<string, PoseAffinity> = {
  hold_front:         {},   // 범용 기본 포즈
  hold_bottom:        { moodKeys: ['라벨', '정직'] },
  hold_side:          { moodKeys: ['활동', '다이내믹'] },
  hold_one_hand:      { moodKeys: ['실물', '크기'] },
  hold_two_hand:      { moodKeys: ['선물', '포근', '정성'] },
  hold_face_side:     { palettes: ['pink'], moodKeys: ['뷰티', '수분', '피부'] },
  apply_cheek:        { moodKeys: ['사용감', '흡수', '발림', '진정'] },
  point_product:      { moodKeys: ['추천', '강조'] },
  table_display:      { categories: ['식품', '리빙'], layouts: ['hero_lifestyle_scene'], moodKeys: ['일상', '편안'] },
  product_near_face:  { moodKeys: ['화보', '피부'] },
  shoulder_hold:      { layouts: ['hero_campaign'], moodKeys: ['캠페인'] },
  palm_support:       { moodKeys: ['진열', '실용'] },
  fingertip_support:  { layouts: ['hero_minimal_wide'], palettes: ['gray'], moodKeys: ['미니멀', '절제', '섬세'] },
  cosmetic_editorial: { layouts: ['hero_editorial'], moodKeys: ['에디토리얼', '세련'] },
  luxury_hold:        { layouts: ['hero_premium'], palettes: ['purple'], moodKeys: ['프리미엄', '고급', '럭셔리'] },
  clinical_hold:      { layouts: ['hero_kpi_rail', 'hero_clean'], moodKeys: ['더마', '기능성', '임상', '신뢰'] },
  beauty_campaign:    { channels: ['올리브영'], palettes: ['pink'], layouts: ['hero_magazine', 'hero_campaign'], moodKeys: ['뷰티', '화사'] },
  magazine_pose:      { layouts: ['hero_magazine', 'hero_editorial'], moodKeys: ['커버', '화보'] },
  standing_hold:      { layouts: ['hero_campaign', 'hero_split'], moodKeys: ['활력', '당당'] },
  sitting_hold:       { categories: ['식품', '리빙'], layouts: ['hero_lifestyle_scene'], moodKeys: ['일상', '편안', '휴식'] },
};

export interface PoseSelectInput {
  category?: string;   // cat (예: '화장품')
  channel?: string;    // ch (예: '올리브영')
  palette?: string;    // strategy.visual.palette 키
  mood?: string;       // strategy.visual.mood + tone 등 무드 텍스트
  scene_id?: string;   // 선택된 Scene id — 후보 풀 결정
  layout_id?: string;  // 선택된 Layout id — 포즈↔지면 정합 가점
}

/** Scene·Layout·상품 특성 → 최적 Pose 1개(결정적). 동점은 후보 순서, 무신호는 첫 후보. */
export function selectPose(input: PoseSelectInput): PoseSpec {
  const byId = new Map(POSE_LIBRARY.map(p => [p.pose_id, p]));
  const candidateIds = SCENE_POSE_MAP[input.scene_id ?? ''] ?? DEFAULT_POSE_CANDIDATES;

  const cat = (input.category ?? '').split('/')[0].trim();
  const ch = (input.channel ?? '').trim();
  const pal = (input.palette ?? '').trim();
  const mood = (input.mood ?? '').toLowerCase();
  const layout = (input.layout_id ?? '').trim();

  let best = byId.get(candidateIds[0]) ?? POSE_LIBRARY[0];
  let bestScore = -1;
  for (const id of candidateIds) {
    const pose = byId.get(id);
    if (!pose) continue;   // 후보 오타 방어 — 실존 포즈만
    const a = POSE_AFFINITY[id] ?? {};
    let score = 0;
    if (cat && a.categories?.includes(cat)) score += 3;
    if (ch && a.channels?.includes(ch)) score += 2;
    if (pal && a.palettes?.includes(pal)) score += 2;
    if (layout && a.layouts?.includes(layout)) score += 2;
    for (const k of a.moodKeys ?? []) {
      if (mood && mood.includes(k.toLowerCase())) score += 3;
    }
    if (score > bestScore) { bestScore = score; best = pose; }   // 동점 시 앞 순서 유지(결정적)
  }
  return best;
}
