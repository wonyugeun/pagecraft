/**
 * Layout Engine — 광고 "지면 레이아웃" 사전. GPT가 장면 이전에 레이아웃 자체를 이해하게 하는 계층.
 *
 * 역할 분리(완전 독립 — 이 파일은 sectionArchetype의 어떤 타입도 import하지 않는다):
 *   · Scene       = 무엇을 촬영할지 (sectionArchetype.SCENE_LIBRARY)
 *   · Composition = 화면 구도      (sectionArchetype.COMPOSITION_LIBRARY)
 *   · Director    = 어떻게 촬영할지 (buildDirectorSpec)
 *   · ★Layout     = 어디에 배치할지 (이 파일 — 지면의 존/앵커/안전영역 설계도)
 *
 * 지면 수직 밴드 모델:
 *   ┌─────────────────────┐
 *   │  Headline Zone       │  ← headline_area
 *   │  Visual Zone         │  ← visual_area (product_anchor / model_anchor)
 *   │  Information Zone    │  ← kpi_anchor
 *   │  Bottom Safe Area    │  ← safe_bottom_area
 *   └─────────────────────┘
 *
 * ⚠️현 단계는 데이터만: imagebrief·Translator·Prompt·GPT 호출 미접촉, 실생성 0.
 */

/* ── 자체 enum (전부 고정 union — 자유 텍스트 금지) ── */
export type HeadlineArea = 'top_band' | 'top_third' | 'top_half' | 'left_column' | 'right_column' | 'center_band';
export type VisualArea = 'full_bleed' | 'center_stage' | 'lower_two_thirds' | 'middle_band' | 'left_half' | 'right_half';
export type AnchorPoint =
  | 'center' | 'center_left' | 'center_right'
  | 'upper_left' | 'upper_right'
  | 'lower_center' | 'lower_left' | 'lower_right'
  | 'none';
export type KpiAnchor = 'bottom_strip' | 'bottom_left' | 'bottom_right' | 'left_rail' | 'right_rail' | 'none';
export type ClearZone = 'top_third' | 'top_half' | 'left_half' | 'right_half' | 'center_band' | 'bottom_third';
export type LogoArea = 'top_left' | 'top_right' | 'top_center' | 'bottom_center' | 'none';
export type BottomSafe = 'none' | 'slim' | 'standard' | 'tall';
export type VisualBalance = 'symmetric' | 'centered' | 'left_weighted' | 'right_weighted' | 'top_heavy' | 'bottom_heavy';
export type LayoutNegativeSpace = 'minimal' | 'moderate' | 'generous' | 'extreme';
export type ReadingFlow = 'top_down' | 'z_pattern' | 'f_pattern' | 'left_right' | 'center_out' | 'diagonal';

export interface LayoutSpec {
  layout_id: string;
  name: string;                     // 한국어 표시명
  description: string;             // 어떤 지면이고 언제 쓰나 (한국어)
  headline_area: HeadlineArea;     // 헤드라인 존
  visual_area: VisualArea;         // 비주얼 존
  product_anchor: AnchorPoint;     // 제품 고정점
  model_anchor: AnchorPoint;       // 모델 고정점 (none = 모델 없는 지면)
  kpi_anchor: KpiAnchor;           // 정보(KPI) 존
  safe_text_area: ClearZone;       // 텍스트 안전영역(절대 비워둘 곳)
  safe_logo_area: LogoArea;        // 로고 안전영역
  safe_bottom_area: BottomSafe;    // 하단 안전영역(스토어 UI·잘림 대비 여유)
  visual_balance: VisualBalance;   // 지면 무게
  negative_space: LayoutNegativeSpace;  // 여백 비율
  reading_flow: ReadingFlow;       // 읽기 흐름
}

/** Layout Library — 15종. 전부 구조가 다르며 Scene/Composition/Director와 독립 계층. */
export const LAYOUT_LIBRARY: LayoutSpec[] = [
  {
    layout_id: 'hero_editorial',
    name: '에디토리얼',
    description: '좌측 헤드라인 컬럼 + 우측 비주얼 — 잡지 내지형 지면.',
    headline_area: 'left_column',
    visual_area: 'right_half',
    product_anchor: 'center_right',
    model_anchor: 'upper_right',
    kpi_anchor: 'bottom_left',
    safe_text_area: 'left_half',
    safe_logo_area: 'top_left',
    safe_bottom_area: 'slim',
    visual_balance: 'right_weighted',
    negative_space: 'generous',
    reading_flow: 'f_pattern',
  },
  {
    layout_id: 'hero_campaign',
    name: '캠페인 포스터',
    description: '상단 대형 헤드라인 밴드 + 중앙 풀 비주얼 + 하단 스트립 — 임팩트 포스터.',
    headline_area: 'top_band',
    visual_area: 'center_stage',
    product_anchor: 'center',
    model_anchor: 'center_left',
    kpi_anchor: 'bottom_strip',
    safe_text_area: 'top_third',
    safe_logo_area: 'top_center',
    safe_bottom_area: 'standard',
    visual_balance: 'centered',
    negative_space: 'minimal',
    reading_flow: 'top_down',
  },
  {
    layout_id: 'hero_magazine',
    name: '매거진 커버',
    description: '모델이 지면을 지배하고 텍스트가 겹쳐 앉는 커버형.',
    headline_area: 'top_third',
    visual_area: 'full_bleed',
    product_anchor: 'lower_right',
    model_anchor: 'center',
    kpi_anchor: 'bottom_right',
    safe_text_area: 'top_third',
    safe_logo_area: 'top_left',
    safe_bottom_area: 'slim',
    visual_balance: 'centered',
    negative_space: 'minimal',
    reading_flow: 'z_pattern',
  },
  {
    layout_id: 'hero_center',
    name: '센터 스테이지',
    description: '정중앙 비주얼 + 상단 카피 + 하단 정보 — 가장 안정적인 기본 지면.',
    headline_area: 'top_third',
    visual_area: 'center_stage',
    product_anchor: 'center',
    model_anchor: 'center_right',
    kpi_anchor: 'bottom_strip',
    safe_text_area: 'top_third',
    safe_logo_area: 'top_center',
    safe_bottom_area: 'standard',
    visual_balance: 'symmetric',
    negative_space: 'moderate',
    reading_flow: 'top_down',
  },
  {
    layout_id: 'hero_split',
    name: '스플릿',
    description: '좌우 절반 분할 — 한쪽 텍스트, 한쪽 비주얼의 명확한 2단.',
    headline_area: 'right_column',
    visual_area: 'left_half',
    product_anchor: 'center_left',
    model_anchor: 'upper_left',
    kpi_anchor: 'right_rail',
    safe_text_area: 'right_half',
    safe_logo_area: 'top_right',
    safe_bottom_area: 'slim',
    visual_balance: 'left_weighted',
    negative_space: 'moderate',
    reading_flow: 'left_right',
  },
  {
    layout_id: 'hero_product_focus',
    name: '프로덕트 포커스',
    description: '모델 없는 제품 단독 지면 — 하단 2/3 제품, 상단 카피.',
    headline_area: 'top_third',
    visual_area: 'lower_two_thirds',
    product_anchor: 'lower_center',
    model_anchor: 'none',
    kpi_anchor: 'bottom_strip',
    safe_text_area: 'top_third',
    safe_logo_area: 'top_center',
    safe_bottom_area: 'standard',
    visual_balance: 'bottom_heavy',
    negative_space: 'moderate',
    reading_flow: 'top_down',
  },
  {
    layout_id: 'hero_clean',
    name: '클린 화이트',
    description: '넓은 여백 속 중앙 피사체 — 클린 뷰티의 미니멀 지면.',
    headline_area: 'top_half',
    visual_area: 'middle_band',
    product_anchor: 'center',
    model_anchor: 'center_right',
    kpi_anchor: 'bottom_strip',
    safe_text_area: 'top_half',
    safe_logo_area: 'top_center',
    safe_bottom_area: 'slim',
    visual_balance: 'centered',
    negative_space: 'generous',
    reading_flow: 'center_out',
  },
  {
    layout_id: 'hero_premium',
    name: '프리미엄',
    description: '하단 무게 + 상단 깊은 여백 — 럭셔리의 고요한 지면.',
    headline_area: 'top_half',
    visual_area: 'lower_two_thirds',
    product_anchor: 'lower_center',
    model_anchor: 'lower_right',
    kpi_anchor: 'bottom_right',
    safe_text_area: 'top_half',
    safe_logo_area: 'top_center',
    safe_bottom_area: 'tall',
    visual_balance: 'bottom_heavy',
    negative_space: 'extreme',
    reading_flow: 'top_down',
  },
  {
    layout_id: 'hero_diagonal',
    name: '다이애거널',
    description: '좌상 카피 → 우하 비주얼의 대각 동선 지면.',
    headline_area: 'top_third',
    visual_area: 'lower_two_thirds',
    product_anchor: 'lower_right',
    model_anchor: 'center_left',
    kpi_anchor: 'bottom_left',
    safe_text_area: 'top_third',
    safe_logo_area: 'top_left',
    safe_bottom_area: 'slim',
    visual_balance: 'right_weighted',
    negative_space: 'moderate',
    reading_flow: 'diagonal',
  },
  {
    layout_id: 'hero_left_copy',
    name: '레프트 카피',
    description: '좌측 세로 카피 레일 + 우측 전신 비주얼 — 세로 카피 지면.',
    headline_area: 'left_column',
    visual_area: 'right_half',
    product_anchor: 'lower_right',
    model_anchor: 'center_right',
    kpi_anchor: 'left_rail',
    safe_text_area: 'left_half',
    safe_logo_area: 'bottom_center',
    safe_bottom_area: 'standard',
    visual_balance: 'right_weighted',
    negative_space: 'moderate',
    reading_flow: 'f_pattern',
  },
  {
    layout_id: 'hero_right_copy',
    name: '라이트 카피',
    description: '우측 카피 컬럼 + 좌측 비주얼 — 레프트 카피의 미러.',
    headline_area: 'right_column',
    visual_area: 'left_half',
    product_anchor: 'lower_left',
    model_anchor: 'center_left',
    kpi_anchor: 'bottom_right',
    safe_text_area: 'right_half',
    safe_logo_area: 'top_right',
    safe_bottom_area: 'slim',
    visual_balance: 'left_weighted',
    negative_space: 'generous',
    reading_flow: 'z_pattern',
  },
  {
    layout_id: 'hero_stacked',
    name: '스택',
    description: '카피 → 비주얼 → 정보의 명확한 3단 수직 적층 지면.',
    headline_area: 'top_band',
    visual_area: 'middle_band',
    product_anchor: 'center',
    model_anchor: 'center_left',
    kpi_anchor: 'bottom_strip',
    safe_text_area: 'top_third',
    safe_logo_area: 'bottom_center',
    safe_bottom_area: 'tall',
    visual_balance: 'symmetric',
    negative_space: 'moderate',
    reading_flow: 'top_down',
  },
  {
    layout_id: 'hero_minimal_wide',
    name: '미니멀 와이드',
    description: '극단적 여백에 작은 피사체를 우측 하단에 — 절제의 지면.',
    headline_area: 'top_half',
    visual_area: 'lower_two_thirds',
    product_anchor: 'lower_right',
    model_anchor: 'none',
    kpi_anchor: 'none',
    safe_text_area: 'top_half',
    safe_logo_area: 'top_left',
    safe_bottom_area: 'slim',
    visual_balance: 'right_weighted',
    negative_space: 'extreme',
    reading_flow: 'diagonal',
  },
  {
    layout_id: 'hero_lifestyle_scene',
    name: '라이프스타일 씬',
    description: '풀 블리드 생활 장면 위에 최소 카피 — 상황 몰입 지면.',
    headline_area: 'top_third',
    visual_area: 'full_bleed',
    product_anchor: 'center_left',
    model_anchor: 'center_right',
    kpi_anchor: 'none',
    safe_text_area: 'top_third',
    safe_logo_area: 'top_right',
    safe_bottom_area: 'standard',
    visual_balance: 'left_weighted',
    negative_space: 'minimal',
    reading_flow: 'left_right',
  },
  {
    layout_id: 'hero_kpi_rail',
    name: 'KPI 레일',
    description: '우측 세로 정보 레일이 특징 — 스펙·기능 강조형 지면.',
    headline_area: 'top_third',
    visual_area: 'left_half',
    product_anchor: 'center_left',
    model_anchor: 'lower_left',
    kpi_anchor: 'right_rail',
    safe_text_area: 'top_third',
    safe_logo_area: 'top_left',
    safe_bottom_area: 'standard',
    visual_balance: 'left_weighted',
    negative_space: 'moderate',
    reading_flow: 'f_pattern',
  },
];

/* ═══════════════════════════════════════════════════════════════════
   Layout Selection Engine — 상품 특성으로 가장 적합한 Layout을 "결정적으로" 선택.

   1) Scene마다 추천 Layout 후보(순서 = 기본 우선순위)
   2) category/channel/palette/mood 채점으로 후보 중 1개 확정
   3) 동점 = 후보 순서, 무신호 = 첫 후보 — 같은 입력이면 항상 같은 결과(랜덤 0)

   ⚠️scene_id는 문자열 계약(sectionArchetype과 독립 유지를 위해 import하지 않음).
   ⚠️모델 없는 Scene(ingredient_*)의 후보는 model_anchor가 없거나 비워도 자연스러운 지면 위주.
   ═══════════════════════════════════════════════════════════════════ */

/** Scene → 추천 Layout 후보(배열 순서 = 우선순위). 미등록 scene은 DEFAULT_LAYOUT_CANDIDATES 폴백. */
export const SCENE_LAYOUT_MAP: Record<string, string[]> = {
  // ── hero (★다이어트 2차: Scene 15→6 축소에 맞춰 잔존 장면 키만 유지) ──
  hero_beauty:       ['hero_magazine', 'hero_center', 'hero_editorial'],
  hero_campaign:     ['hero_campaign', 'hero_split', 'hero_stacked'],
  hero_luxury:       ['hero_premium', 'hero_stacked', 'hero_center'],
  hero_lifestyle:    ['hero_lifestyle_scene', 'hero_split', 'hero_right_copy'],
  hero_clean:        ['hero_clean', 'hero_premium', 'hero_center'],
  hero_clinical:     ['hero_kpi_rail', 'hero_center', 'hero_clean'],
  // ── ingredient_macro (모델 없는 컷 — 제품 단독·미니멀 지면 위주) ──
  ingredient_droplet:         ['hero_product_focus', 'hero_minimal_wide', 'hero_clean'],
  ingredient_botanical_fresh: ['hero_product_focus', 'hero_diagonal', 'hero_clean'],
  ingredient_lab_glass:       ['hero_kpi_rail', 'hero_product_focus', 'hero_clean'],
  ingredient_oil_drop:        ['hero_premium', 'hero_product_focus', 'hero_minimal_wide'],
  ingredient_splash_crown:    ['hero_campaign', 'hero_product_focus', 'hero_diagonal'],
  ingredient_slice_cross:     ['hero_product_focus', 'hero_stacked', 'hero_clean'],
};

/** scene_id 미등록/미지정 시 폴백 후보 */
export const DEFAULT_LAYOUT_CANDIDATES = ['hero_center', 'hero_campaign', 'hero_editorial'];

/** 레이아웃별 적합 신호 — 후보 안에서만 채점(카테고리 +3 / 채널 +2 / 팔레트 +2 / 무드 키워드당 +3) */
interface LayoutAffinity {
  categories?: string[];
  channels?: string[];
  palettes?: string[];
  moodKeys?: string[];
}

const LAYOUT_AFFINITY: Record<string, LayoutAffinity> = {
  hero_editorial:       { moodKeys: ['에디토리얼', '감성', '세련', '무드'] },
  hero_campaign:        { channels: ['쿠팡'], palettes: ['yellow'], moodKeys: ['임팩트', '활력', '볼드', '캠페인'] },
  hero_magazine:        { channels: ['올리브영'], palettes: ['pink'], moodKeys: ['뷰티', '화보', '커버'] },
  hero_center:          {},   // 범용 기본 지면 — 신호 없음(후보 순서로만 승부)
  hero_split:           { moodKeys: ['비교', '구조', '모던'] },
  hero_product_focus:   { categories: ['가전'], moodKeys: ['실용', '정직', '스펙'] },
  hero_clean:           { palettes: ['green', 'gray'], moodKeys: ['클린', '저자극', '순한', '진정'] },
  hero_premium:         { palettes: ['purple'], moodKeys: ['프리미엄', '고급', '럭셔리', '명품'] },
  hero_diagonal:        { moodKeys: ['다이내믹', '활동', '에너지'] },
  hero_left_copy:       { moodKeys: ['스토리', '서사', '브랜드'] },
  hero_right_copy:      { moodKeys: ['일상', '편안'] },
  hero_stacked:         { moodKeys: ['정돈', '스펙', '구성'] },
  hero_minimal_wide:    { palettes: ['gray'], moodKeys: ['미니멀', '절제', '여백'] },
  hero_lifestyle_scene: { categories: ['식품', '리빙'], palettes: ['brown'], moodKeys: ['일상', '라이프', '편안'] },
  hero_kpi_rail:        { moodKeys: ['더마', '기능성', '임상', '스펙'] },
};

export interface LayoutSelectInput {
  category?: string;   // cat (예: '화장품')
  channel?: string;    // ch (예: '올리브영')
  palette?: string;    // strategy.visual.palette 키
  mood?: string;       // strategy.visual.mood + tone 등 무드 텍스트
  scene_id?: string;   // 선택된 Scene id — 후보 풀 결정
}

/** 상품 특성 → 최적 Layout 1개(결정적). 동점은 후보 순서, 무신호는 첫 후보. */
export function selectLayout(input: LayoutSelectInput): LayoutSpec {
  const byId = new Map(LAYOUT_LIBRARY.map(l => [l.layout_id, l]));
  const candidateIds = SCENE_LAYOUT_MAP[input.scene_id ?? ''] ?? DEFAULT_LAYOUT_CANDIDATES;

  const cat = (input.category ?? '').split('/')[0].trim();
  const ch = (input.channel ?? '').trim();
  const pal = (input.palette ?? '').trim();
  const mood = (input.mood ?? '').toLowerCase();

  let best = byId.get(candidateIds[0]) ?? LAYOUT_LIBRARY[0];
  let bestScore = -1;
  for (const id of candidateIds) {
    const layout = byId.get(id);
    if (!layout) continue;   // 후보 오타 방어 — 실존 레이아웃만
    const a = LAYOUT_AFFINITY[id] ?? {};
    let score = 0;
    if (cat && a.categories?.includes(cat)) score += 3;
    if (ch && a.channels?.includes(ch)) score += 2;
    if (pal && a.palettes?.includes(pal)) score += 2;
    for (const k of a.moodKeys ?? []) {
      if (mood && mood.includes(k.toLowerCase())) score += 3;
    }
    if (score > bestScore) { bestScore = score; best = layout; }   // 동점 시 앞 순서 유지(결정적)
  }
  return best;
}

/* ═══════════════════════════════════════════════════════════════════
   Layout Translator — LayoutSpec → 자연스러운 영문 광고 레이아웃 디렉션.

   규칙: enum·snake_case·좌표값을 그대로 출력하지 않는다 — 사람이 읽는
   광고 디렉션 문장으로 번역(숫자 0, 밑줄 토큰 0 — 검증으로 강제).
   필수 포함 8요소: Headline / Visual / Product / Model / Negative Space /
   Reading Flow / KPI / Bottom Safe.

   ⚠️함수만 구현 — imagebrief·Director·이미지 Translator·Prompt·GPT 무접촉.
   ═══════════════════════════════════════════════════════════════════ */

const HEADLINE_ZONE_P: Record<HeadlineArea, string> = {
  top_band:     'Reserve a bold headline band across the very top of the page.',
  top_third:    'Leave the upper third completely clean for a large editorial headline.',
  top_half:     'Leave the entire upper half as quiet space dedicated to the headline.',
  left_column:  'Reserve a vertical headline column along the left side of the page.',
  right_column: 'Reserve a vertical headline column along the right side of the page.',
  center_band:  'Keep a clear horizontal band across the center for the headline.',
};
const VISUAL_ZONE_P: Record<VisualArea, string> = {
  full_bleed:       'Let the photography fill the entire canvas edge to edge.',
  center_stage:     'Stage the main visual at the center of the page.',
  lower_two_thirds: 'Contain the main visual within the lower two thirds of the page.',
  middle_band:      'Hold the main visual in a calm middle band of the page.',
  left_half:        'Place the main visual in the left half of the page.',
  right_half:       'Place the main visual in the right half of the page.',
};
const ANCHOR_P2: Record<Exclude<AnchorPoint, 'none'>, string> = {
  center: 'at the very center', center_left: 'on the center-left', center_right: 'on the center-right',
  upper_left: 'toward the upper left', upper_right: 'toward the upper right',
  lower_center: 'low and centered', lower_left: 'toward the lower left', lower_right: 'toward the lower right',
};
const KPI_ZONE_P: Record<KpiAnchor, string> = {
  bottom_strip: 'Reserve a continuous premium information strip along the bottom.',
  bottom_left:  'Reserve a compact information block at the bottom left.',
  bottom_right: 'Reserve a compact information block at the bottom right.',
  left_rail:    'Reserve a slim vertical information rail along the left edge.',
  right_rail:   'Reserve a slim vertical information rail along the right edge.',
  none:         'No information strip — keep the page purely visual.',
};
const BOTTOM_SAFE_P: Record<BottomSafe, string> = {
  none:     'The composition may run all the way to the bottom edge.',
  slim:     'Keep a slim quiet margin at the very bottom of the page.',
  standard: 'Keep a comfortable safe margin at the very bottom, free of any critical elements.',
  tall:     'Keep a tall protected area at the very bottom, completely free of critical elements.',
};
const NEG_SPACE_P: Record<LayoutNegativeSpace, string> = {
  minimal:  'Fill the page densely — minimal empty space, high visual energy.',
  moderate: 'Balance the composition with moderate breathing room.',
  generous: 'Maintain generous breathing room throughout the composition.',
  extreme:  'Let vast empty space dominate the page — the quietness itself is the design.',
};
const READING_FLOW_P: Record<ReadingFlow, string> = {
  top_down:   "Guide the viewer's eye naturally from the headline down through the visual and finally to the information area.",
  z_pattern:  "Guide the viewer's eye in a Z pattern — from the headline, across the visual, down to the information area.",
  f_pattern:  "Guide the viewer's eye in an F pattern — down the text column first, then into the visual.",
  left_right: "Guide the viewer's eye smoothly from left to right across the page.",
  center_out: "Guide the viewer's eye from the center of the page outward.",
  diagonal:   "Guide the viewer's eye diagonally across the page, from the headline to the product.",
};

/** LayoutSpec → 사람이 읽는 영문 광고 레이아웃 디렉션(문장 나열). 결정적 — 같은 입력이면 같은 출력. */
export function layoutToPrompt(layout: LayoutSpec): string {
  const sentences: string[] = [];

  // 1. Headline Zone
  sentences.push(HEADLINE_ZONE_P[layout.headline_area]);
  // 2. Visual Zone
  sentences.push(VISUAL_ZONE_P[layout.visual_area]);
  // 3. Product Placement — 제품은 항상 지면의 시각 앵커
  sentences.push(`Anchor the product ${ANCHOR_P2[layout.product_anchor as Exclude<AnchorPoint, 'none'>]} so it remains the visual anchor of the page.`);
  // 4. Model Placement
  if (layout.model_anchor === 'none') {
    sentences.push('No model appears in this layout — the product carries the page alone.');
  } else {
    sentences.push(`Place the model naturally ${ANCHOR_P2[layout.model_anchor]} within the visual zone, supporting the product without stealing attention.`);
  }
  // 5. KPI Area
  sentences.push(KPI_ZONE_P[layout.kpi_anchor]);
  // 6. Bottom Safe Area
  sentences.push(BOTTOM_SAFE_P[layout.safe_bottom_area]);
  // 7. Negative Space
  sentences.push(NEG_SPACE_P[layout.negative_space]);
  // 8. Reading Flow
  sentences.push(READING_FLOW_P[layout.reading_flow]);

  return sentences.join(' ');
}
