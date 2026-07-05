/**
 * Product Physical Size Engine — 제품 형태+용량 → 실물 크기 추정 → 자연어 크기 지시.
 *
 * GPT Image는 제품 사진만으로 실제 물리 크기를 알 수 없다. Flik이 형태(드롭다운)와
 * 용량으로 실물 치수를 추정해 "손·얼굴 대비 관계"의 자연어로 프롬프트에 전달한다.
 * Hero뿐 아니라 상세페이지 전체 이미지에서 쓰일 공용 엔진.
 *
 * ⚠️규칙: 프롬프트 출력에 cm/mm 등 숫자를 절대 넣지 않는다 — 숫자는 DB 내부용,
 *   출력은 자연어 관계 서술만(digit-free, 검증으로 강제).
 * ⚠️현 단계: DB와 엔진만 — imagebrief·Director·Translator 미연결, 실생성 0.
 */

/* ── 제품 형태 (상품정보 드롭다운) ── */
export type ProductForm =
  | 'toner_bottle'       // 토너 병
  | 'serum_bottle'       // 세럼 병
  | 'dropper_bottle'     // 스포이드(앰플)
  | 'essence_bottle'     // 에센스
  | 'tube'               // 튜브
  | 'cream_jar'          // 크림 단지
  | 'cushion'            // 쿠션
  | 'powder'             // 파우더
  | 'spray'              // 스프레이
  | 'supplement_bottle'  // 영양제 병
  | 'generic_bottle'     // 일반 병
  | 'other';             // 기타

export const PRODUCT_FORM_OPTIONS: { value: ProductForm; label: string }[] = [
  { value: 'toner_bottle', label: '토너 병' },
  { value: 'serum_bottle', label: '세럼 병' },
  { value: 'dropper_bottle', label: '스포이드(앰플)' },
  { value: 'essence_bottle', label: '에센스' },
  { value: 'tube', label: '튜브' },
  { value: 'cream_jar', label: '크림 단지' },
  { value: 'cushion', label: '쿠션' },
  { value: 'powder', label: '파우더' },
  { value: 'spray', label: '스프레이' },
  { value: 'supplement_bottle', label: '영양제 병' },
  { value: 'generic_bottle', label: '일반 병' },
  { value: 'other', label: '기타' },
];

/* ── 제품 용량 (상품정보 드롭다운) ── */
export const PRODUCT_VOLUME_OPTIONS = ['10ml', '30ml', '50ml', '100ml', '150ml', '200ml', '250ml', '300ml', '500ml', '1L'] as const;
export type ProductVolume = typeof PRODUCT_VOLUME_OPTIONS[number];

/* ── 제품 형태 프로필 (같은 용량이라도 실루엣이 다름 — 상품정보 드롭다운) ── */
export type ProductShapeProfile =
  | 'slim_tall'   // 슬림 롱(길쭉한 원통)
  | 'standard'    // 표준
  | 'wide'        // 와이드(낮고 넓음)
  | 'square'      // 사각
  | 'dropper'     // 스포이드형
  | 'tube'        // 튜브형
  | 'jar'         // 단지형
  | 'compact'     // 컴팩트형(납작)
  | 'spray'       // 스프레이형
  | 'other';      // 기타

export const PRODUCT_SHAPE_OPTIONS: { value: ProductShapeProfile; label: string }[] = [
  { value: 'slim_tall', label: '슬림 롱(길쭉한 병)' },
  { value: 'standard', label: '표준' },
  { value: 'wide', label: '와이드(낮고 넓음)' },
  { value: 'square', label: '사각' },
  { value: 'dropper', label: '스포이드형' },
  { value: 'tube', label: '튜브형' },
  { value: 'jar', label: '단지형' },
  { value: 'compact', label: '컴팩트형(납작)' },
  { value: 'spray', label: '스프레이형' },
  { value: 'other', label: '기타' },
];

/** 프로필별 실루엣·그립 서술 — 프롬프트 문장 자동 변경용(영문 자연어, 숫자 금지) */
const SHAPE_TRAITS: Record<ProductShapeProfile, { body: string; grip?: string; hand?: string }> = {
  slim_tall: {
    body: 'a slender body with long vertical proportions',
    grip: 'it is comfortably wrapped by one hand around its slim body',
  },
  standard: { body: 'balanced everyday proportions' },
  wide: {
    body: 'a shorter, wider body',
    grip: 'it is naturally supported by the palm rather than wrapped by the fingers',
  },
  square: {
    body: 'a clean squared silhouette',
    grip: 'it is held with the flat sides resting between the fingers and palm',
  },
  dropper: {
    body: 'a small bottle topped with a dropper cap',
    grip: 'it is held delicately between the fingers, often by the dropper',
  },
  tube: {
    body: 'a soft squeezable tube',
    grip: 'it is held flat between the fingers and thumb',
  },
  jar: {
    body: 'a wide circular container',
    grip: 'it is held from below, resting in the open palm',
    hand: 'sits comfortably in one open palm',
  },
  compact: {
    body: 'a flat palm-sized case',
    grip: 'it sits flat in the palm',
    hand: 'sits flat in one open palm',
  },
  spray: {
    body: 'an upright bottle with a spray head',
    grip: 'it is gripped with the index finger resting on the spray head',
  },
  other: { body: 'its natural everyday proportions' },
};

/* ── 물리 크기 스펙 ── */
export interface PhysicalSizeSpec {
  typical_height_cm: number;   // DB 내부용 — 프롬프트에 절대 노출 금지
  typical_width_cm: number;    // 지름/폭 — 동일
  noun: string;                // 프롬프트용 영문 명사 (bottle/tube/jar/dropper bottle …)
  shape_profile: ProductShapeProfile;  // 실루엣 프로필(형태 기본값, 사용자 지정으로 override 가능)
  grip_style: string;          // 잡는 방식 (영문 자연어)
  hand_relation: string;       // 손 대비 관계 (영문 자연어)
  face_relation: string;       // 얼굴 대비 관계 (영문 자연어)
}

/** 형태별 기준 스펙 — 치수는 그 형태의 대표 용량(refVolume) 기준. 용량이 다르면 배율로 보정. */
interface FormBase {
  noun: string;
  shape_profile: ProductShapeProfile;   // 이 형태의 기본 실루엣
  refVolume: ProductVolume;
  height: number;              // cm @ refVolume
  width: number;               // cm @ refVolume
  grip_style: string;
  hand_relation: string;
  face_relation: string;
}

const FORM_DB: Record<ProductForm, FormBase> = {
  toner_bottle: {
    noun: 'toner bottle', shape_profile: 'slim_tall', refVolume: '200ml', height: 18, width: 5,
    grip_style: 'the fingers wrap naturally around the slim cylindrical body',
    hand_relation: 'fits naturally inside one adult hand',
    face_relation: 'never appears larger than the width of an adult face',
  },
  serum_bottle: {
    noun: 'serum bottle', shape_profile: 'standard', refVolume: '30ml', height: 10, width: 3.5,
    grip_style: 'it is held lightly between the thumb and fingers',
    hand_relation: 'is small enough to sit inside a half-closed hand',
    face_relation: 'appears clearly smaller than an adult face — roughly palm-sized',
  },
  dropper_bottle: {
    noun: 'dropper bottle', shape_profile: 'dropper', refVolume: '30ml', height: 11, width: 3.5,
    grip_style: 'it is held delicately between the fingers, often by the dropper cap',
    hand_relation: 'is small enough to sit inside a half-closed hand',
    face_relation: 'appears clearly smaller than an adult face — roughly palm-sized',
  },
  essence_bottle: {
    noun: 'essence bottle', shape_profile: 'slim_tall', refVolume: '150ml', height: 16, width: 4.5,
    grip_style: 'the fingers wrap naturally around the slender body',
    hand_relation: 'fits naturally inside one adult hand',
    face_relation: 'never appears larger than the width of an adult face',
  },
  tube: {
    noun: 'tube', shape_profile: 'tube', refVolume: '100ml', height: 15, width: 4,
    grip_style: 'it is held flat between the fingers and thumb',
    hand_relation: 'fits naturally along the length of one adult hand',
    face_relation: 'never appears larger than the width of an adult face',
  },
  cream_jar: {
    noun: 'cream jar', shape_profile: 'jar', refVolume: '50ml', height: 6, width: 7.5,
    grip_style: 'it rests in an open palm or is held around its round body',
    hand_relation: 'sits comfortably in one open palm',
    face_relation: 'appears much smaller than an adult face — about the size of a palm',
  },
  cushion: {
    noun: 'cushion compact', shape_profile: 'compact', refVolume: '50ml', height: 3.5, width: 7.5,
    grip_style: 'it sits flat in the palm like a small compact case',
    hand_relation: 'sits flat in one open palm',
    face_relation: 'appears much smaller than an adult face — about the size of a palm',
  },
  powder: {
    noun: 'powder compact', shape_profile: 'compact', refVolume: '30ml', height: 4, width: 6,
    grip_style: 'it sits flat in the palm',
    hand_relation: 'sits flat in one open palm',
    face_relation: 'appears much smaller than an adult face',
  },
  spray: {
    noun: 'spray bottle', shape_profile: 'spray', refVolume: '150ml', height: 17, width: 4.5,
    grip_style: 'it is gripped with the index finger resting on the spray head',
    hand_relation: 'fits naturally inside one adult hand',
    face_relation: 'never appears larger than the width of an adult face',
  },
  supplement_bottle: {
    noun: 'supplement bottle', shape_profile: 'wide', refVolume: '150ml', height: 11, width: 6,
    grip_style: 'it is held around its rounded body with one hand',
    hand_relation: 'sits comfortably in one adult hand',
    face_relation: 'appears clearly smaller than an adult face',
  },
  generic_bottle: {
    noun: 'bottle', shape_profile: 'standard', refVolume: '150ml', height: 15, width: 5,
    grip_style: 'the fingers wrap naturally around the body',
    hand_relation: 'fits naturally inside one adult hand',
    face_relation: 'never appears larger than the width of an adult face',
  },
  other: {
    noun: 'product', shape_profile: 'other', refVolume: '150ml', height: 12, width: 6,
    grip_style: 'it is held naturally with one hand',
    hand_relation: 'fits naturally inside one adult hand',
    face_relation: 'never appears larger than the width of an adult face',
  },
};

/** 용량 배율 — 형태의 refVolume 대비 치수 보정(높이·폭에 세제곱근 비례 근사) */
const VOLUME_ML: Record<ProductVolume, number> = {
  '10ml': 10, '30ml': 30, '50ml': 50, '100ml': 100, '150ml': 150,
  '200ml': 200, '250ml': 250, '300ml': 300, '500ml': 500, '1L': 1000,
};

/** 한국어 라벨·느슨한 문자열 → ProductForm (드롭다운 라벨/값 양쪽 허용, 미매칭 시 other) */
export function resolveProductForm(input: string | null | undefined): ProductForm {
  const t = (input ?? '').trim();
  if (!t) return 'other';
  const byValue = PRODUCT_FORM_OPTIONS.find(o => o.value === t);
  if (byValue) return byValue.value;
  const byLabel = PRODUCT_FORM_OPTIONS.find(o => t.includes(o.label.replace(/\(.+\)/, '')) || o.label.includes(t));
  return byLabel?.value ?? 'other';
}

/** 형태+용량 → 물리 크기 스펙. 용량 미지정 시 형태의 대표 용량 기준. (결정적 — 랜덤 0) */
export function getPhysicalSize(form: ProductForm, volume?: ProductVolume | string, shape?: ProductShapeProfile | string): PhysicalSizeSpec {
  const base = FORM_DB[form] ?? FORM_DB.other;
  // 사용자 지정 프로필이 유효하면 형태 기본값을 override
  const profile: ProductShapeProfile = (shape && shape in SHAPE_TRAITS) ? shape as ProductShapeProfile : base.shape_profile;
  const traits = SHAPE_TRAITS[profile];
  const vol = (PRODUCT_VOLUME_OPTIONS as readonly string[]).includes(volume ?? '') ? volume as ProductVolume : base.refVolume;
  const scale = Math.cbrt(VOLUME_ML[vol] / VOLUME_ML[base.refVolume]);
  const height = Math.round(base.height * scale * 10) / 10;
  const width = Math.round(base.width * scale * 10) / 10;

  // 극단 용량이면 손 관계 서술을 보정(대용량 500ml+ = 두 손/가득 쥐는 그립)
  let hand = base.hand_relation;
  if (height >= 24) hand = 'is a large container held with a full one-hand grip or supported with both hands';
  else if (height >= 20) hand = 'is held with a fuller one-hand grip — noticeably taller than palm-size but still a natural hand-held object';

  return {
    typical_height_cm: height,
    typical_width_cm: width,
    noun: base.noun,
    shape_profile: profile,
    grip_style: traits.grip ?? base.grip_style,          // 프로필 그립이 있으면 우선
    hand_relation: height >= 20 ? hand : (traits.hand ?? hand),  // 대용량 보정은 프로필보다 우선
    face_relation: base.face_relation,
  };
}

/** 형태+용량 → 프롬프트용 자연어 크기 지시(★digit-free — cm 등 숫자 절대 미포함, 명사는 형태별 자동). */
export function buildPhysicalSizePrompt(form: ProductForm | string, volume?: string, shape?: ProductShapeProfile | string): string {
  const resolved = typeof form === 'string' && !(form in FORM_DB) ? resolveProductForm(form) : form as ProductForm;
  const s = getPhysicalSize(resolved, volume, shape);
  const body = SHAPE_TRAITS[s.shape_profile].body;
  // grip 절이 'it ...'로 시작하면 독립 문장으로, 'the fingers ...'처럼 도구 주어면 'When held,' 접두(중복 회피)
  const gripSentence = s.grip_style.startsWith('it ')
    ? `${s.grip_style.charAt(0).toUpperCase()}${s.grip_style.slice(1)}.`
    : `When held, ${s.grip_style}.`;
  return [
    `Use realistic real-world product proportions.`,
    `The ${s.noun} has ${body} and should appear at its natural physical size — it ${s.hand_relation}.`,
    gripSentence,
    `The product ${s.face_relation}.`,
    `It should feel like a real commercial ${s.noun} photographed in a professional shoot.`,
    `Avoid oversized product rendering; do not enlarge the product for dramatic emphasis.`,
  ].join(' ');
}
