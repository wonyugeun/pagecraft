/**
 * InfoLayout — 섹션의 "정보 표현 방식" 축 (아키타입=장면 축과 직교).
 *
 * 배경: 비-히어로 전 섹션이 "상단 타이틀 + 장면 사진" 단일 구조로 렌더돼 페이지가 단조롭던 문제.
 * 카피 단계가 이미 생성하는 blocks(stats·steps·quote·iconcards)를 슬라이드 baked 레이아웃으로
 * 조리하는 축을 추가한다 — 새 엔진 아님: 배정(여기) + 렌더(slideBaked 분기) + 기존 blocks 재사용.
 *
 * 1라운드 5종 + 기본형:
 *  - big_numbers      큰 숫자 KPI/임상 (★★★★★) — ⚠게이트 통과 숫자가 있을 때만 배정 가능(날조 0)
 *  - steps_numbered   STEP 1·2·3 번호 중심 (★★★★☆)
 *  - ingredient_story 성분 하나씩 크게 (★★☆☆☆)
 *  - quote_poster     한 줄 카피 포스터 (★☆☆☆☆)
 *  - texture_minimal  제형 확대 + 텍스트 최소 (★☆☆☆☆)
 *  - scene_title      기존 "타이틀 + 장면" (★★★☆☆, 폴백)
 *
 * 배정은 결정적(키워드+블록 보유+숫자 게이트 채점, 동점 → 우선순위 순서). 랜덤 금지.
 * 인접 중복 금지: 같은 레이아웃이 연속되면 후순위 후보로 강등. 고밀도(★4+) 연속도 완화.
 */
import type { Block } from '@/store/AppContext';
import type { CutArchetype } from '@/lib/sectionArchetype';

export type InfoLayout =
  | 'scene_title'
  | 'big_numbers'
  | 'steps_numbered'
  | 'ingredient_story'
  | 'quote_poster'
  | 'texture_minimal'
  | 'product_detail'
  | 'full_bleed_poster'
  | 'manifesto_typo'
  | 'versus_check'
  | 'state_compare';

/** 정보 밀도(1~5) — 페이지 리듬 배열에 사용(고밀도 연속 방지) */
export const INFO_DENSITY: Record<InfoLayout, number> = {
  big_numbers: 5,
  steps_numbered: 4,
  versus_check: 4,
  scene_title: 3,
  state_compare: 3,
  ingredient_story: 2,
  product_detail: 2,
  manifesto_typo: 2,
  quote_poster: 1,
  texture_minimal: 1,
  full_bleed_poster: 1,
};

/** 같은 레이아웃 재사용 금지 창 — 최소 3개 섹션이 지나야 재등장 가능(기본형 제외) */
const LAYOUT_COOLDOWN = 3;

export interface InfoLayoutInput {
  name?: string;
  role?: string;
  blocks?: Block[];
  archetype: CutArchetype;
}

/* ── Viewpoint 축 — 카메라 시점 다양화(레이아웃 축과 독립) ──
 * 통이미지2 진단: 레이아웃은 갈라졌지만 제품 컷들이 전부 "정면·눈높이·중앙" 동일 시점.
 * 제품 중심 섹션(scene_title×clinical/product_only/editorial, product_detail)에만 결정적 순회로
 * 시점을 배정한다. 장면 다양성이 이미 있는 섹션(공감·제형·스텝 등)은 무배정(빈 문자열). 랜덤 금지. */
const PRODUCT_VIEWPOINTS: string[] = [
  'a straight-on front view at eye level',
  'a 45-degree three-quarter angle',
  // ★카메라 프로브(2026-07-05): 'looking slightly up'은 미발현(아이레벨로 회귀) — 카메라 물리 위치를 명시해 강화
  'a dramatic low-angle shot, the camera physically placed below the product base looking up — the product towers over the viewer with visible upward foreshortening',
  'a top-down flat-lay arrangement seen from directly above',
  'a close-up detail crop framing only the upper half of the product',
  'the product standing on a glossy reflective surface with a clean mirror reflection beneath it',
  'a floating composition — the product suspended mid-air with a soft shadow below',
  'a macro crop concentrating on the label and cap details',
  'a side profile view of the product',
  'the product lying down on its side on the surface',
  'the product tilted at a gentle dynamic angle',
  'the product standing in shallow rippling water with soft reflections',
  'a tight crop where the product bleeds off the frame edge, only partially visible',
  'an extreme macro on the product surface with fine water droplets',
  'the product held in a hand entering from the frame edge (hand only, no face)',
  'an off-center composition — the product pushed to one side with vast empty space opposite',
];

/* ── Treatment 축 — 상업 광고 연출(스플래시·부양·반사·보태니컬…). 시점과 독립, 결정적 순회. ── */
const PRODUCT_TREATMENTS: string[] = [
  'a dynamic splash of the liquid arcing around the product, frozen mid-motion with crisp suspended droplets',
  'the product floating weightlessly with fine water droplets suspended in the air around it',
  'the product standing in a shallow pool of water with soft concentric ripples spreading outward',
  'the product doubled by a dramatic mirror reflection on a polished glossy surface',
  'delicate prism light streaks refracting across the product and the background',
  'a lush botanical composition — fresh leaves layered in the foreground and background with real depth',
  'a chilled-bottle effect — the product surface covered in fine cold condensation droplets',
  'a premium still-life arrangement with stone, linen fabric and sculpted shadow play',
  'backlight passing through the liquid so the product glows luminous from within',
  'a macro crown splash on the water surface right beside the product',
];

/* ── Lighting 축 — 페이지마다 조명이 바뀌게(같은 스튜디오 조명 반복 차단). 색군은 페이지 톤 유지. ── */
const LIGHTING_POOL: string[] = [
  'soft morning window light with long gentle shadows',
  'bright airy daylight, almost shadowless and clean',
  'directional side light carving crisp edges and one hard clean shadow',
  'warm golden-hour glow with a soft rim light tracing the edges',
  'cool overcast diffusion — even, calm, matte',
  'backlight with a luminous halo and translucent glow',
  'dappled light filtering through leaves, casting organic shadow patterns',
  'low-key editorial lighting — deeper shadows with a focused pool of light on the subject',
];

/** 연출 배정 — 제품 중심 + 포스터형 섹션에 광고 연출을 순회 배정. 그 외는 ''. */
export function assignTreatments(archetypes: CutArchetype[], layouts: InfoLayout[]): string[] {
  let k = 0;
  return archetypes.map((a, i) => {
    const eligible =
      layouts[i] === 'product_detail' || layouts[i] === 'full_bleed_poster' ||
      (layouts[i] === 'scene_title' && (a === 'clinical' || a === 'product_only' || a === 'editorial'));
    if (!eligible) return '';
    return PRODUCT_TREATMENTS[k++ % PRODUCT_TREATMENTS.length];
  });
}

/** 조명 배정 — hero·cta(계약 워시·모델 화보 유지) 제외 전 섹션 순회. 페이지 내 같은 조명 반복 차단. */
export function assignLighting(archetypes: CutArchetype[]): string[] {
  let k = 0;
  return archetypes.map(a => {
    if (a === 'hero' || a === 'cta') return '';
    return LIGHTING_POOL[k++ % LIGHTING_POOL.length];
  });
}

/** 시점 배정 — 제품 중심 섹션만 풀을 순서대로 순회(결정적, 인접 중복 불가 구조). 그 외 섹션은 ''. */
export function assignViewpoints(archetypes: CutArchetype[], layouts: InfoLayout[]): string[] {
  let k = 0;
  return archetypes.map((a, i) => {
    const productCentric =
      layouts[i] === 'product_detail' ||
      (layouts[i] === 'scene_title' && (a === 'clinical' || a === 'product_only' || a === 'editorial'));
    if (!productCentric) return '';
    return PRODUCT_VIEWPOINTS[k++ % PRODUCT_VIEWPOINTS.length];
  });
}

/** 숫자 토큰이 knownFacts 토큰 집합에 '정확히' 존재하는지 — slideBaked와 동일한 토큰 단위 게이트.
 *  (substring 검증의 한 자리 우회("3~4개월"의 4 ← "24000"의 4) 차단) */
function hasGatedNumber(blocks: Block[] | undefined, allow: Set<string>): boolean {
  if (!blocks?.length || !allow.size) return false;
  for (const b of blocks) {
    if (b.type !== 'stats') continue;
    for (const it of b.items) {
      const nums = (it.value ?? '').match(/\d[\d,.]*\d|\d/g) ?? [];
      for (const n of nums) {
        const d = n.replace(/[,.\s]/g, '');
        if (d && allow.has(d)) return true;   // 검증된 수치 1개 이상 → big_numbers 자격
      }
    }
  }
  return false;
}

const has = (blocks: Block[] | undefined, type: Block['type']) => !!blocks?.some(b => b.type === type);
const hit = (hay: string, keys: string[]) => keys.some(k => hay.includes(k));

/**
 * 섹션 1개의 레이아웃 후보를 점수순으로 반환(1위가 기본 배정, 인접 중복 시 차순위로 강등).
 * 후보 산정: 키워드 +2 / 필요 블록 보유 +3 / 아키타입 친화 +1. 자격 미달(숫자 게이트 등)은 후보 제외.
 */
function rankCandidates(input: InfoLayoutInput, allow: Set<string>): InfoLayout[] {
  const hay = `${input.name ?? ''} ${input.role ?? ''}`.toLowerCase();
  const scores = new Map<InfoLayout, number>();
  const add = (l: InfoLayout, s: number) => scores.set(l, (scores.get(l) ?? 0) + s);

  // big_numbers — 게이트 통과 숫자 필수(없으면 후보 자체가 안 됨 = 날조 원천 차단)
  if (hasGatedNumber(input.blocks, allow)) {
    add('big_numbers', 3);
    if (hit(hay, ['임상', '결과', '수치', '검증', '테스트', '보습력', '지속'])) add('big_numbers', 2);
    if (input.archetype === 'clinical') add('big_numbers', 1);
  }
  // steps_numbered
  if (has(input.blocks, 'steps')) add('steps_numbered', 3);
  if (hit(hay, ['사용법', '사용 방법', '사용방법', '순서', '루틴', '이렇게', 'step', '스텝'])) add('steps_numbered', 2);
  // ingredient_story
  if (has(input.blocks, 'iconcards')) add('ingredient_story', 1);
  if (hit(hay, ['성분', '원료', '함량', '추출물'])) add('ingredient_story', 2);
  if (input.archetype === 'ingredient_macro') add('ingredient_story', 2);
  // quote_poster
  if (has(input.blocks, 'quote')) add('quote_poster', 3);
  if (hit(hay, ['후기', '리뷰', '한마디', '철학', '약속', '진심'])) add('quote_poster', 2);
  if (input.archetype === 'empathy' || input.archetype === 'editorial') add('quote_poster', 1);
  // texture_minimal
  if (input.archetype === 'texture') add('texture_minimal', 3);
  if (hit(hay, ['제형', '텍스처', '발림', '흡수'])) add('texture_minimal', 2);
  // product_detail — 제품 자체를 감상시키는 프리미엄 정물(모델 0, 아이콘 0, 타이포 최소)
  if (input.archetype === 'product_only') add('product_detail', 3);
  if (hit(hay, ['디테일', '패키지', '용기', '보틀', '라벨', '구성'])) add('product_detail', 2);
  if (input.archetype === 'clinical' || input.archetype === 'editorial') add('product_detail', 1);
  // versus_check — 비교 체크표(compare 블록 필수·경쟁사명 금지는 렌더에서 강제)
  if (has(input.blocks, 'compare')) add('versus_check', 3);
  if (hit(hay, ['비교', '기준', '차이', 'vs', '다른', '항목별'])) add('versus_check', 2);
  // state_compare — 전/후 '서술' 비교(사진 금지 — 표시광고법). 재료(checklist/compare) 있어야 자격.
  if (hit(hay, ['전과 후', '전후', '변화', '달라'])) add('state_compare', 3);
  if (has(input.blocks, 'checklist') || has(input.blocks, 'compare')) add('state_compare', 1);
  // full_bleed_poster — 풀블리드 무드 포스터(WOW 컷)
  if (input.archetype === 'editorial' || input.archetype === 'empathy' || input.archetype === 'texture') add('full_bleed_poster', 2);
  if (hit(hay, ['무드', '감성', '순간', '일상', '라이프'])) add('full_bleed_poster', 2);
  // manifesto_typo — 브랜드 선언 타이포 포스터
  if (hit(hay, ['철학', '약속', '다짐', '기준', '선언', '이유', '진심'])) add('manifesto_typo', 2);
  if (input.archetype === 'editorial') add('manifesto_typo', 2);

  const ranked = [...scores.entries()]
    .filter(([, s]) => s >= 3)                    // 확신 문턱 — 애매하면 기본형 유지
    .sort((a, b) => b[1] - a[1])
    .map(([l]) => l);
  ranked.push('scene_title');                     // 최종 폴백은 항상 존재
  return ranked;
}

/**
 * 페이지 전체 InfoLayout 배정 — hero·cta는 기존 존 스펙 경로라 배정 대상에서 제외(scene_title 슬롯).
 * 규칙: ① 같은 레이아웃은 최소 LAYOUT_COOLDOWN(3)개 섹션이 지나야 재사용(기본형 제외)
 *      ② 고밀도(4+) 연속 금지 — 차순위 후보로 강등.
 */
export function assignInfoLayouts(sections: InfoLayoutInput[], knownFacts: string): InfoLayout[] {
  const allow = new Set<string>();
  for (const n of (knownFacts ?? '').match(/\d[\d,.]*\d|\d/g) ?? []) {
    const d = n.replace(/[,.\s]/g, '');
    if (d) allow.add(d);
  }
  const out: InfoLayout[] = [];
  for (let i = 0; i < sections.length; i++) {
    const sec = sections[i];
    if (sec.archetype === 'hero' || sec.archetype === 'cta') { out.push('scene_title'); continue; }
    const candidates = rankCandidates(sec, allow);
    const prev = out[i - 1];
    const recent = out.slice(Math.max(0, i - LAYOUT_COOLDOWN));   // 직전 3개 창
    const pick = candidates.find(c =>
      (c === 'scene_title' || !recent.includes(c)) &&
      !(INFO_DENSITY[c] >= 4 && prev !== undefined && INFO_DENSITY[prev] >= 4),
    ) ?? 'scene_title';
    out.push(pick);
  }
  // ★WOW 보장(결정적): 페이지에 포스터형(full_bleed/manifesto)이 2장 미만이면
  //   무드 계열(editorial/empathy/texture) scene_title을 승격해 2장까지 확보(전·후반 분산, 인접 회피).
  let wow = out.filter(l => l === 'full_bleed_poster' || l === 'manifesto_typo').length;
  if (wow < 2 && sections.length >= 8) {
    for (let i = Math.floor(sections.length / 4); i < sections.length && wow < 2; i++) {
      const a = sections[i].archetype;
      const nearPoster = [out[i - 1], out[i + 1]].some(l => l === 'full_bleed_poster' || l === 'manifesto_typo');
      if (out[i] === 'scene_title' && !nearPoster && (a === 'editorial' || a === 'empathy' || a === 'texture')) {
        out[i] = wow === 0 ? 'full_bleed_poster' : 'manifesto_typo';
        wow++;
        i += 3;   // 승격 간 간격 확보
      }
    }
  }
  return out;
}
