/**
 * 슬라이드형 baked 텍스트 빌더 — 이미지에 합성할 한글 카피 프롬프트를 만든다.
 *
 * 원칙: 자리를 비우지 않고 셀러가 입력한 진짜 정보로 채운다. AI가 지어낸 수치만 차단.
 *  - headline(+subcopy) + 하단 특징 스트립(섹션 blocks에서 추출)을 광고 레이아웃에 배치 지시.
 *  - ★수치 안전 게이트: 특징 문구의 숫자는 knownFacts(productName+productExtra)로 검증되는 것만 통과.
 *    셀러 입력값(가격·용량·함량 등) → 통과 / AI 날조 임상·만족도 %(미입력) → 항목째 드롭.
 *
 * 블로그형은 이 함수를 쓰지 않는다(텍스트0 유지). 슬라이드 경로에서만 호출.
 */
import type { Block } from '@/store/AppContext';
import type { CutArchetype } from '@/lib/sectionArchetype';
import { STYLE_PRESETS, fillFragment, type PageStyleContract } from '@/lib/pageStyleContract';
import type { InfoLayout } from '@/lib/infoLayout';
import { fixNegativeTemps } from '@/lib/factScrub';
import { isProductHeroCategory } from '@/lib/imagePromptRules';

/* ── HeroVisualType(1차, 2026-07-15) — hero도 섹션 visual type을 갖게 하는 최소 축.
 * 배경: 비-히어로는 InfoLayout 11종으로 구조가 갈리는데 hero·cta는 제외(infoLayout.ts:231)돼
 * 항상 같은 4존 골격(헤드라인·사진·록업·3아이콘 스트립) → 페이지 첫인상이 전 제품 동일.
 *  - model_proof: 기존 hero 골격 그대로(기본값 — 화장품·패션·유아 등 무변화 보장)
 *  - product_statement: 식품 1차 — 제품 패키지+실제 맥락 장면이 주인공, 스트립·록업 존 제거/약화
 * 2차 확장(kpi_impact, 전 섹션 축 통합)은 이 함수(assignInfoLayouts 패턴)를 키우는 방식으로. */
export type HeroVisualType = 'model_proof' | 'product_statement';
export function selectHeroVisualType(cat: string | null | undefined): HeroVisualType {
  return isProductHeroCategory(cat ?? '') ? 'product_statement' : 'model_proof';
}

/* ── 아키타입별 장면 지시(영문) — Claude 초안. 추후 GPT 최적화 문구로 교체 가능하도록 아키타입당 상수 1개. ── */
const SCENE_EMPATHY =
  `a candid everyday lifestyle moment that mirrors the customer's daily concern (Korean setting, soft window light, ` +
  `lived-in styling details — a mirror, towel, morning light on skin); the situation is the hero — ` +
  `the product appears only as a small supporting element or not at all.`;
const SCENE_INGREDIENT_MACRO =
  `a macro close-up of the raw key ingredients (fresh botanicals with water droplets, a glass dropper releasing a drop of extract, ` +
  `fine powders) layered with styled props — stone slab, ripples of water, glass reflections — shallow depth of field; ` +
  `the product may appear small as a side prop, never as the main subject.`;
const SCENE_TEXTURE =
  `an extreme close-up of the formula's texture — a swatch, smear or suspended droplet showing its consistency and glossy sheen, ` +
  `with micro water droplets and light refracting through the gel/liquid, on a clean surface or skin without a face; ` +
  `tactile detail fills the frame.`;
const SCENE_CLINICAL =
  `a minimal clinical studio set — clean white/neutral surfaces, acrylic risers and glass vessels, precise soft lighting with ` +
  `subtle glass reflections, laboratory-calm mood that conveys trust and verification through atmosphere only ` +
  `(no charts, no badges, no seals).`;
const SCENE_EDITORIAL =
  `a brand mood editorial — atmospheric composition with generous negative space, layered styled props (fabric, stone, botanicals), ` +
  `directional light and soft shadows that express the brand's world; magazine-cover quality.`;
const SCENE_PRODUCT_ONLY =
  `a clean studio product shot — the product standing alone as the hero on a simple premium surface (stone or acrylic riser), ` +
  `crisp lighting with a delicate glass reflection, water droplets on the bottle, subtle natural shadow.`;

const ARCHETYPE_SCENES: Record<Exclude<CutArchetype, 'hero' | 'cta'>, string> = {
  empathy:          SCENE_EMPATHY,
  ingredient_macro: SCENE_INGREDIENT_MACRO,
  texture:          SCENE_TEXTURE,
  clinical:         SCENE_CLINICAL,
  editorial:        SCENE_EDITORIAL,
  product_only:     SCENE_PRODUCT_ONLY,
};

/** knownFacts의 숫자 토큰 집합 — 정규화(구분기호 제거)한 '정확한 숫자 문자열' 단위.
 *  ★substring 검증의 구멍 수정: "3~4개월"의 4가 "24000원"의 4로 오통과하던 한 자리 우회 차단. */
export function collectNumberTokens(knownFacts: string): Set<string> {
  const set = new Set<string>();
  for (const n of (knownFacts ?? '').match(/\d[\d,.]*\d|\d/g) ?? []) {
    const d = n.replace(/[,.\s]/g, '');
    if (d) set.add(d);
  }
  return set;
}

/** 숫자 토큰이 knownFacts 토큰 집합에 '정확히' 존재하는지 — 토큰 단위 일치(부분 문자열 금지). */
function numberVerified(numStr: string, allow: Set<string>): boolean {
  const d = numStr.replace(/[,.\s]/g, '');
  if (!d) return true;
  return allow.has(d);
}

/** 특징 문구 게이트 — 미검증 숫자를 포함하면 항목째 드롭(날조 수치 방지). 숫자 없는 라벨은 그대로 통과. */
function gateFeature(text: string, allow: Set<string>): string {
  const t = (text ?? '').replace(/\s+/g, ' ').trim();
  if (!t) return '';
  const nums = t.match(/\d[\d,.]*\d|\d/g) ?? [];
  for (const n of nums) {
    if (!numberVerified(n, allow)) return '';   // AI 날조 수치 의심 → 드롭
  }
  return t;
}

/** 메타 문구 그물 — 셀러 안내문("~를 입력하면 이 섹션이 강해집니다" 류)이 카피로 새어 들어와
 *  이미지에 박히는 사고 차단(출력단 최후 방어 — 카피 프롬프트 금지 지시와 이중). */
function stripMetaGuidance(text: string): string {
  return (text ?? '')
    .replace(/💡/g, '')
    .split(/(?<=[.!?다요])\s+/)
    .filter(s => !/(입력하면|입력해\s*주세요|추가해\s*주세요|추가하면)[^]*?(강해|강력해|풍부해|좋아)/.test(s) && !/이\s*섹션이/.test(s))
    .join(' ')
    .trim();
}

/** 라벨 축약 — 스트립 칩은 짧은 한글 단어만("무알콜/무향/저자극"). 설명문·문장형은 드롭.
 *  한글 어순 깨짐("무알콜 지극없 처방" 류)의 원인이던 긴 설명 텍스트를 원천 제거. */
function toShortLabel(raw: string): string {
  let t = (raw ?? '').replace(/\([^)]*\)/g, '').replace(/\s+/g, ' ').trim();
  t = t.split(/[—:·,|]/)[0].trim();              // 구분자 앞 라벨부만
  if (t.length < 2 || t.length > 8) return '';    // 단어 길이 게이트(2~8자 — "병풀 추출물" 허용)
  if (/[요다죠까]$/.test(t)) return '';            // 문장형 어미 드롭(checklist 문장 등)
  return t;
}

/** 서브노트 정제 — 입력 desc를 짧은 명사구로(≤12자). 문장형·긴 설명은 드롭(서브노트는 지표 보조문구). */
function toShortNote(raw: string | undefined, allow: Set<string>): string {
  let t = (raw ?? '').replace(/\([^)]*\)/g, '').replace(/\s+/g, ' ').trim();
  t = t.split(/[—:·,|.]/)[0].trim();
  if (t.length < 2 || t.length > 12) return '';
  if (/(니다|세요|해요|어요|아요|죠|까)$/.test(t)) return '';
  return gateFeature(t, allow);   // 노트의 숫자도 동일 게이트(날조 0)
}

/** 섹션 blocks에서 하단 특징 스트립 재료 추출 — "라벨 — 서브노트" 쌍(둘 다 입력값 기반, 숫자 게이트 통과분만).
 *  iconcards: title=라벨, desc=서브노트 / stats: value=라벨, label=서브노트 / checklist: 라벨만. 최대 3개. */
function extractFeatures(blocks: Block[] | undefined, allow: Set<string>): string[] {
  if (!blocks?.length) return [];
  const raw: Array<{ label: string; note?: string }> = [];
  for (const b of blocks) {
    if (b.type === 'iconcards') {
      for (const c of b.cards) raw.push({ label: c.title, note: c.desc });
    } else if (b.type === 'checklist') {
      for (const it of b.items) raw.push({ label: it });     // 문장형은 toShortLabel에서 탈락
    } else if (b.type === 'stats') {
      // 값=라벨("250ml"), 원래 라벨=서브노트("용량") — 값이 게이트에서 드롭되면 쌍째 제외
      for (const it of b.items) raw.push({ label: it.value, note: it.label });
    }
    // compare/faq/steps 등 표·문답형은 슬라이드 하단 스트립에 부적합 → 제외
  }
  const seen = new Set<string>();
  const out: string[] = [];
  for (const r of raw) {
    const short = toShortLabel(r.label);
    if (!short) continue;
    const g = gateFeature(short, allow);
    if (!g || seen.has(g)) continue;
    seen.add(g);
    const note = toShortNote(r.note, allow);
    out.push(note ? `${g} — ${note}` : g);   // 대시 뒤 = 서브노트(featLine에서 위계 지시)
    if (out.length >= 3) break;
  }
  return out;
}

/* ── 슬라이드 최종 프롬프트 결합 — 조명 지시 일원화(1차 검증, 2026-07-15) ──
 * 문제: Stage4 브리프(imageDesc)의 `light:` 세그먼트/composeBrief `Lighting:` 라인과
 * Stage5 baked의 `Lighting:`(assignLighting)이 한 프롬프트에 공존 → 서로 다른 조명이
 * 동시에 지시돼 제품 엣지·질감·무드가 애매해지는 원인 후보.
 * 역할 분리: Stage4 = 무엇을(장면·제품·소품·배경), Stage5 = 어떻게(스타일·구도·조명).
 * baked가 Lighting을 지시하는 경우에만 브리프 쪽 조명을 제거 — baked에 조명이 없는
 * 경로(hero·cta의 계약 워시, big_numbers 등 타이포 주도 레이아웃)는 브리프 조명을
 * 유지해 조명 지시 0개가 되지 않게 한다. 블로그형은 이 함수를 타지 않음(무접촉). */
export function composeSlidePrompt(imageDesc: string, baked: string): string {
  let desc = (imageDesc ?? '').trim();
  let bk = baked;
  if (bk.includes('Lighting:')) {
    desc = desc
      // Claude 구조 꼬리의 light: 세그먼트만 제거 — 스펙 예시가 세그먼트를 마침표로 구분하므로
      // 쉼표·마침표 양쪽 경계 처리(다음 라벨 mood:/palette:/props:/surface: 앞까지만, 나머지 세그먼트 보존)
      .replace(/[,.]?\s*\blight:\s*.*?(?=[,.]\s*(?:mood|palette|props|surface)\s*:|\n|$)/i, '')
      // composeBrief STYLE 블록의 `Lighting: ...` 라인 제거(scene 섹션이 baked 조명과 겹칠 때)
      .replace(/^\s*Lighting:\s*.*$\n?/m, '')
      .trim();
  }
  // ★장면 서술 이중 제거(2차 검증, 2026-07-15) — 브리프가 이미 제품 특정 장면 자연문을 제공하면
  //   baked의 제네릭 ARCHETYPE_SCENES 'Scene:' 문장을 제거. 같은 장면을 두 표현으로 두 번 지시하면
  //   모델이 열거 선택지를 평균화(스와치+스미어+부유 방울 동시 렌더, A/B 실증)함. 장면 타입·구도·캡션은
  //   baked의 Layout:/Lighting:이 계속 담당(역할: Stage4=무엇을, Stage5=어떻게). 브리프 자연문이
  //   없으면(빈 imageDesc 등) ARCHETYPE_SCENES 유지 — 장면 소스 0개 방지.
  if (/^[^|]{20,}/.test(desc)) {
    bk = bk.replace(/\s*Scene:\s[^]*?(?=Color harmony:|Headline: "|Render ONLY)/, ' ');
  }
  return `${desc}. ${bk}`;
}

/**
 * 슬라이드 baked 프롬프트 생성 — archetype별 레이아웃 분기.
 *  - hero·cta: 3층(상단 카피 / 중앙 제품·모델 / 하단 특징 스트립) — 검증된 기존 문구 유지.
 *  - 그 외 6종: 상단 타이틀 밴드만 + 아키타입별 장면 지시(ARCHETYPE_SCENES). 3층 강제 없음.
 * @param headline  섹션 헤드라인
 * @param subcopy   섹션 서브카피(있으면)
 * @param knownFacts 셀러 원입력(productName + productExtra) — 수치 검증 기준
 * @param blocks    섹션 blocks — 하단 특징 스트립 재료(hero·cta에서만 사용)
 * @param archetype 컷 아키타입(lib/sectionArchetype). 미지정 시 hero(기존 동작 보존)
 * @param accentHex 페이지 팔레트 accent hex — 헤드라인 핵심 키워드 1개 컬러 강조용(미지정 시 일반 지시)
 * @param productName 셀러 입력 제품명 — 사진과 KPI 사이 제품명 라인(hero·cta, 입력값 그대로 = 날조 0)
 * @param style 페이지 스타일 계약(lib/pageStyleContract) — 미지정 시 검증된 1번(derma_clean) = 기존 동작 보존
 * @param infoLayout 정보 표현 방식(lib/infoLayout) — 비-히어로 섹션의 baked 구조 분기. 미지정 시 기존 "타이틀+장면"
 * @param viewpoint 카메라 시점(assignViewpoints 배정, 영문 구) — 제품 중심 섹션의 시점 단조로움 제거. ''이면 미주입
 * @param treatment 상업 광고 연출(assignTreatments 배정 — 스플래시·부양·반사 등). ''이면 미주입
 * @param lighting 조명 연출(assignLighting 배정 — 페이지 내 조명 반복 차단). ''이면 미주입
 * @param heroType Hero visual type(1차). 기본 model_proof = 기존 골격 그대로(하위 호환).
 *                 product_statement는 archetype==='hero'에서만 발동(cta 무접촉).
 */
export function buildSlideBakedText(
  headline: string,
  subcopy: string | undefined,
  knownFacts: string,
  blocks?: Block[],
  archetype: CutArchetype = 'hero',
  accentHex?: string,
  productName?: string,
  style: PageStyleContract = STYLE_PRESETS[0],
  infoLayout: InfoLayout = 'scene_title',
  viewpoint?: string,
  treatment?: string,
  lighting?: string,
  heroType: HeroVisualType = 'model_proof',
): string {
  // ★음수 온도 부호 안전망 — copy 단계 scrub을 거치지 않은 경로(과거 히스토리 복원·인라인 편집) 방어.
  //   baked 최종 문자열 전체에 적용(수치+℃ 단위만 대상이라 % 존·가격 등 다른 숫자 무영향).
  const head = fixNegativeTemps(stripMetaGuidance((headline ?? '').replace(/\n/g, ' ').trim()), knownFacts);
  const sub = fixNegativeTemps(stripMetaGuidance((subcopy ?? '').replace(/\n/g, ' ').trim()), knownFacts);
  const accent = accentHex ? `accent color ${accentHex}` : 'the brand accent color';

  const intro =
    `Render the following Korean marketing copy as crisp, accurate, correctly-spelled text integrated into the composition ` +
    `(clean modern Korean sans-serif like Pretendard, perfectly legible, no garbled or broken glyphs).`;
  const copyLine = `Headline: "${head}"${sub ? `. Subcopy (smaller, lighter): "${sub}"` : ''}.`;
  const noFakeLine =
    `Render ONLY the Korean copy provided above as text — do not invent logos, badges, certification marks, or any numbers/percentages/statistics that are not part of this copy.`;

  // ── hero product_statement(1차): 제품 패키지+실제 맥락 장면이 주인공인 히어로 —
  //   고정 4존 골격 대신 헤드라인+대형 장면 존. 3아이콘 스트립 제거, 록업은 하단 캡션 1행으로 약화.
  //   장면의 '내용물'(식탁·원물 등)은 Stage4 브리프가 결정(역할 분리: Stage4=무엇을, Stage5=어떻게).
  //   cta는 기존 골격 유지(범위 밖). model_proof는 아래 기존 경로 그대로(바이트 동일 보장).
  if (archetype === 'hero' && heroType === 'product_statement') {
    const pname = (productName ?? '').replace(/\s+/g, ' ').trim();
    return [
      intro,
      `${fillFragment(style.wash, { accent })} If any earlier instruction mentions a pure white or plain background, this unified page tone takes precedence.`,
      `Vertical structure, top to bottom:`,
      `— Headline zone (top ~20%): an OVERSIZED Korean display headline at poster scale — exactly ONE key word emphasized in ${accent}, the rest near-black; the subcopy much smaller and lighter directly beneath it (strong size contrast). Headline: "${head}"${sub ? `; subcopy: "${sub}"` : ''}.`,
      `— Scene zone (the rest of the frame, ~75%): the PRODUCT PACKAGE is the hero of one real, lived-in scene — standing naturally at its true real-world size within its context (never held by anyone, never floating, never enlarged beyond realism), styled with the craft of a premium brand campaign. The scene breathes edge to edge below the headline — NO separate horizontal bands, NO icon strip, NO boxed panels, NO KPI row; the product label stays clearly readable and exactly matches the reference product.`,
      pname ? `— One quiet caption near the bottom of the scene: the Korean product name "${pname}" in small refined type on a naturally calm area — a subtle signature, never a separate title block.` : '',
      noFakeLine,
      style.design_tail,
    ].filter(Boolean).join(' ');
  }

  // ── hero·cta: ★% 존 골격(테스트1~7로 검증) + Page Style Contract 속성값 — 골격은 전 스타일 공유,
  //   스타일별 차이(워시·전환·아이콘·타이포·구분선·수치 강조·스타일 키워드)는 계약 조각으로 주입.
  //   % 존 방식·정보바 미이식(제품 코드 = 날조 발생기)·숫자 게이트는 스타일과 무관하게 불변.
  if (archetype === 'hero' || archetype === 'cta') {
    const allow = collectNumberTokens(knownFacts);
    const feats = extractFeatures(blocks, allow);
    const numericLabel = feats.map(f => f.split(' — ')[0]).find(l => /\d/.test(l));
    const numLine = numericLabel
      ? ` ${fillFragment(style.numeric_emphasis, { accent, label: numericLabel })}`
      : '';
    const pname = (productName ?? '').replace(/\s+/g, ' ').trim();
    const hasLockup = !!pname;
    const hasStrip = feats.length > 0;
    // 존 % — 록업·스트립 유무에 따라 사진 존으로 재배분(합계 ~100 유지)
    const photoPct = 45 + (hasLockup ? 0 : 10) + (hasStrip ? 0 : 15);

    const zones: string[] = [];
    zones.push(
      `— Headline zone (top ~25%): an OVERSIZED Korean display headline at poster scale, centered — exactly ONE key word emphasized in ${accent}, the rest near-black; the subcopy much smaller and lighter directly beneath it (strong size contrast). Headline: "${head}"${sub ? `; subcopy: "${sub}"` : ''}.`,
    );
    zones.push(
      `— Photo zone (middle ~${photoPct}%): the photograph. ${fillFragment(style.transition, { accent })}`,
    );
    if (hasLockup) {
      zones.push(
        `— Product title zone (~10%): a centered two-line title lockup with generous air above and below — the Korean product name "${pname}" in ${style.title_type} (noticeably larger than the strip keywords, clearly smaller than the headline); directly beneath it a much smaller FULL English product name in elegant letter-spaced uppercase — the complete brand + product name as a natural full English rendering (prefer the full name over short label abbreviations; never add numbers or claims). It must read as a deliberate title, NOT a caption squeezed in.`,
      );
    }
    if (hasStrip) {
      zones.push(
        `— Feature strip (~15%): ${Math.min(feats.length, 3)} ${style.strip_layout}. ${fillFragment(style.item_stack, { accent })} Items — ${feats.map(f => `"${f}"`).join(' · ')} — the text after an em-dash is that item's sub-note; if an item has no dash, add a short fitting generic Korean sub-note describing what the keyword offers (natural wording is fine, but NEVER invent numbers, percentages, durations, or clinical statistics). Every item ends up with both a keyword and a sub-note so the strip reads complete.${numLine} No certification badges, no generic clipart, no sentences, no thick boxes.`,
      );
    }
    zones.push(
      `— Bottom margin (~5%): clean empty breathing space — the content above must never touch or crowd the bottom edge.`,
    );

    return [
      intro,
      // ★워시 우선권(감사 F1): composer STYLE의 "pure white seamless" 류 배경 지시와 충돌 시 워시가 이긴다 — 복불복 제거
      `${fillFragment(style.wash, { accent })} If any earlier instruction mentions a pure white or plain background, this unified page tone takes precedence.`,
      `Vertical structure, top to bottom:`,
      ...zones,
      style.design_tail,
    ].join(' ');
  }

  // ── 비-히어로: InfoLayout(정보 표현 방식)별 baked 구조 분기 — "타이틀+장면" 단일 템플릿 반복이
  //   페이지 단조로움의 원인이었음(메디힐류는 절반이 정보 그래픽 페이지). 카피 blocks를 여기서 조리한다.
  // ★페이지 톤 통일(감사 F2): 전 섹션 공통 컬러 그레이딩 라인 유지.
  const harmonyLine =
    `Color harmony: this image is one page of a longer detail page — grade the whole scene toward the page's shared tone with a subtle affinity to ${accent}, keeping color temperature consistent with the other sections; no jarring tonal shifts.`;
  // ★Viewpoint 주입(제품 중심 섹션만 배정됨) — "정면·눈높이·중앙" 단일 시점 수렴 차단
  const viewLine = viewpoint
    ? ` Camera viewpoint: ${viewpoint} — commit fully to this viewpoint; do NOT default to a plain straight-on centered shot.`
    : '';
  // ★아트디렉션 축(연출·조명) — "전부 같은 스튜디오 사진" 반복 차단. 색군은 페이지 톤(harmonyLine) 유지.
  const treatLine = treatment
    ? ` Commercial treatment: stage the shot as ${treatment} — executed like a high-end advertising campaign photograph.`
    : '';
  const lightLine = lighting
    ? ` Lighting: ${lighting} — a deliberate lighting choice for this page, while keeping the page's shared color family.`
    : '';
  const allow = collectNumberTokens(knownFacts);

  // ① big_numbers — 대형 숫자 KPI/임상(★★★★★). 게이트 통과 수치만 크게(배정기가 이미 자격 검증).
  if (infoLayout === 'big_numbers') {
    const nums: Array<{ value: string; label: string }> = [];
    for (const b of blocks ?? []) {
      if (b.type !== 'stats') continue;
      for (const it of b.items) {
        if (gateFeature(it.value, allow) && nums.length < 3) nums.push({ value: fixNegativeTemps(it.value.trim(), knownFacts), label: (it.label ?? '').trim() });
      }
    }
    if (nums.length) {
      return [
        intro,
        `Layout: a compact headline band at the top — "${head}" in bold type${sub ? ` with the smaller, lighter subcopy "${sub}" beneath it` : ''}. Below it, the page is a NUMBER SHOWCASE: ${nums.length} oversized display ${nums.length === 1 ? 'figure' : 'figures'} dominating the frame — ${nums.map(n => `"${n.value}"`).join(' · ')} rendered at poster scale in a muted tone of ${accent} (each the largest text element in its area), with its short label in BOLD near-black type directly beneath (${nums.map(n => `"${n.label}"`).join(' · ')}), and generous empty space around each figure${nums.length > 1 ? ', separated by thin dividers' : ''}.`,
        `The photographic scene stays quiet and recedes — a calm minimal backdrop so the typography leads. NO graphs, NO charts, NO gauges, NO dashboards — text hierarchy only. Do not add any basis or footnote text that is not provided here.`,
        harmonyLine,
        noFakeLine,
      ].join(' ');
    }
    // 자격 데이터가 비면 기본형으로 안전 폴백(아래 scene_title)
  }

  // ② steps_numbered — STEP 번호 중심(★★★★☆). 아이콘 금지, 번호 타이포가 주인공.
  if (infoLayout === 'steps_numbered') {
    const steps = (blocks ?? []).flatMap(b => (b.type === 'steps' ? b.items : []))
      .map(it => ({ title: gateFeature(it.title, allow), desc: gateFeature(it.desc ?? '', allow) }))
      .filter(s => s.title).slice(0, 4);
    if (steps.length >= 2) {
      return [
        intro,
        `Layout: a compact headline band at the top — "${head}" in bold type${sub ? ` with the smaller, lighter subcopy "${sub}" beneath it` : ''}. Below it, a vertical STEP sequence of ${steps.length} rows: each row leads with an oversized numeral (1, 2, 3…) in a muted tone of ${accent} — the numeral is the visual anchor, NO icons — followed by the step title in BOLD near-black Korean type and, when given, a smaller lighter description beneath it. Steps — ${steps.map((s, i) => `${i + 1}. "${s.title}"${s.desc ? ` (note: "${s.desc}")` : ''}`).join(' / ')}. Generous spacing between rows, a thin hairline or fine connector guiding the eye downward.`,
        `The photographic scene stays soft and secondary behind or beside the step column. No boxes, no badges, no icon rows.`,
        harmonyLine,
        noFakeLine,
      ].join(' ');
    }
  }

  // ③ ingredient_story — 성분 하나씩 크게(★★☆☆☆). iconcards(title=성분명, desc=효과)를 세로 스택으로.
  if (infoLayout === 'ingredient_story') {
    const ings = (blocks ?? []).flatMap(b => (b.type === 'iconcards' ? b.cards : []))
      .map(c => ({ name: gateFeature(c.title, allow), desc: gateFeature(c.desc ?? '', allow) }))
      .filter(c => c.name).slice(0, 3);
    if (ings.length) {
      return [
        intro,
        `Layout: a compact headline band at the top — "${head}" in bold type${sub ? ` with the smaller, lighter subcopy "${sub}" beneath it` : ''}. Below it, an INGREDIENT STORY of ${ings.length} generous horizontal bands, one per ingredient: the ingredient name in VERY LARGE elegant Korean display type (a muted tone of ${accent} or near-black) — ${ings.map(g => `"${g.name}"`).join(' · ')} — each followed by one short lighter line describing what it does${ings.some(g => g.desc) ? ` (${ings.filter(g => g.desc).map(g => `"${g.name}": "${g.desc}"`).join(' / ')})` : ''}. Wide empty space between bands, at most a fine hairline separating them.`,
        `The macro botanical/ingredient photography breathes behind and between the bands — the name typography and the raw ingredient visuals share the stage. No icon circles, no cards, no boxes.`,
        harmonyLine,
        noFakeLine,
      ].join(' ');
    }
  }

  // ④ quote_poster — 한 줄 카피 포스터(★☆☆☆☆). 인용/헤드라인을 광고 카피처럼 크게, 나머지는 여백.
  if (infoLayout === 'quote_poster') {
    const q = (blocks ?? []).find(b => b.type === 'quote') as Extract<Block, { type: 'quote' }> | undefined;
    const quoteText = (q?.text ?? head).replace(/\n/g, ' ').trim();
    const author = (q?.author ?? '').trim();
    return [
      intro,
      `Layout: a QUOTE POSTER — the single line ${JSON.stringify(quoteText)} set VERY LARGE in refined Korean display type, centered in the frame with vast breathing space around it; break it into two or three short stacked lines if long, with exactly ONE key word allowed in a muted tone of ${accent}.${author ? ` Beneath it, a much smaller, lighter attribution line "${author}".` : ''}${q && head !== quoteText ? '' : sub ? ` A much smaller, lighter supporting line "${sub}" sits quietly beneath.` : ''}`,
      `The photographic scene is a soft atmospheric backdrop only — muted, low-contrast, nothing competing with the type.${lightLine} No decorative quotation-mark graphics larger than the text, no boxes, no badges.`,
      harmonyLine,
      noFakeLine,
    ].join(' ');
  }

  // ⑦ full_bleed_poster — 풀블리드 무드 포스터(★☆☆☆☆, WOW 컷). 사진이 프레임 전체, 타이포는 절제된 오버레이.
  if (infoLayout === 'full_bleed_poster') {
    return [
      intro,
      `Layout: a FULL-BLEED POSTER — the photograph fills the ENTIRE frame edge to edge with cinematic, atmospheric quality; no bands, no strips, no boxed areas.${treatLine}${lightLine} Push the art direction to campaign grade: dramatic depth, a bold cinematic color grade within the page's palette, and one unforgettable visual moment — this is an advertising photograph, not a catalog cut. The headline "${head}" sits as a compact, elegant editorial title over a naturally calm area of the image (exactly ONE key word in ${accent})${sub ? `, with a much smaller light line "${sub}" beneath it` : ''} — small type, confident placement, vast visual breathing space. This page should make the viewer stop scrolling — one striking image doing all the talking.`,
      harmonyLine,
      noFakeLine,
    ].join(' ');
  }

  // ⑧ manifesto_typo — 브랜드 선언 타이포 포스터(★★☆☆☆). 타이포가 화면 절반 이상, 배경은 조용한 질감.
  if (infoLayout === 'manifesto_typo') {
    return [
      intro,
      `Layout: a BRAND MANIFESTO POSTER — typography IS the image. Break the headline "${head}" into two or three short stacked lines set at HUGE poster scale, occupying more than half of the frame, with exactly ONE key word in ${accent} and the rest near-black${sub ? `; beneath it, the smaller light line "${sub}"` : ''}. The background stays quiet — a soft textured surface, a whisper of the scene, or gentle gradient light; the product appears small and understated or not at all. Generous margins, deliberate line breaks, museum-poster confidence. No photos competing with the type, no boxes, no icons.`,
      harmonyLine,
      noFakeLine,
    ].join(' ');
  }

  // ⑨ versus_check — 비교 체크표(★★★★☆). compare 블록 → 타이포 체크 테이블(경쟁사명 금지·두꺼운 박스 금지).
  if (infoLayout === 'versus_check') {
    const cmp = (blocks ?? []).find(b => b.type === 'compare') as Extract<Block, { type: 'compare' }> | undefined;
    const headers = (cmp?.headers ?? []).map(h => gateFeature(h, allow)).filter(Boolean).slice(0, 3);
    const rows = (cmp?.rows ?? [])
      .map(r => r.map(c => gateFeature(c, allow)))
      .filter(r => r.every(Boolean) && r.length >= 2)
      .slice(0, 4);
    if (headers.length >= 2 && rows.length >= 2) {
      return [
        intro,
        `Layout: a compact headline band at the top — "${head}" in bold type${sub ? ` with the smaller, lighter subcopy "${sub}" beneath it` : ''}. Below it, a clean typographic COMPARISON TABLE: columns "${headers.join('" / "')}", separated only by fine hairlines and generous spacing — NO thick boxes, NO colored panels. Rows — ${rows.map(r => `[${r.map(c => `"${c}"`).join(' | ')}]`).join(' · ')}. Mark our product's column with small ${accent} check marks (✓) and keep the comparison column in muted grey — quietly confident, never mocking. Use only generic terms for the other column (never a real competitor brand name or logo).`,
        `The photographic scene stays minimal behind the table — the typography leads. No badges, no seals.`,
        harmonyLine,
        noFakeLine,
      ].join(' ');
    }
  }

  // ⑩ state_compare — 전/후 '서술' 비교(★★★☆☆). ⚠️전후 피부 사진 금지(표시광고법) — 타이포 패널만.
  if (infoLayout === 'state_compare') {
    const items = (blocks ?? []).flatMap(b => (b.type === 'checklist' ? b.items : []))
      .map(t => gateFeature(t, allow)).filter(Boolean).slice(0, 3);
    if (items.length >= 2) {
      return [
        intro,
        `Layout: a compact headline band at the top — "${head}" in bold type${sub ? ` with the smaller, lighter subcopy "${sub}" beneath it` : ''}. Below it, TWO calm typographic panels side by side, separated by a fine hairline: the left panel titled "이런 고민이 있었다면" listing — ${items.map(t => `"${t}"`).join(' · ')} — in muted grey type; the right panel titled "이 제품이 다가가는 방식" with 2–3 short reassuring lines drawn from the copy above, keywords in ${accent}. This is a TEXT panel comparison ONLY: absolutely NO before/after skin photographs, NO split-face imagery, NO two-state skin comparison photos anywhere in the frame — the photographic background stays a single calm scene.`,
        harmonyLine,
        noFakeLine,
      ].join(' ');
    }
  }

  // ⑥ product_detail — 제품 자체를 감상시키는 프리미엄 정물(★★☆☆☆). 제품 70~90%, 재질·라벨·빛이 주인공.
  //   ★디테일 어휘 강화: macro 조명·샤프 엣지·표면 질감·반사 품질 — "제품이 광고처럼 보이게".
  if (infoLayout === 'product_detail') {
    return [
      intro,
      `Layout: a PREMIUM PRODUCT SHOWCASE — the product is the ONLY subject, standing large and commanding at 70–90% of the frame height.${viewLine}${treatLine}${lightLine} This is luxury commercial product photography at macro quality: sharp crisp product edges, high-end studio lighting sculpting the form, and the product's real materials rendered in fine detail — whether glass, liquid, matte plastic, metal, kraft paper or fabric, stay true to the reference product's materials — with premium reflections tracing the silhouette and subtle specular highlights on its details. The label is perfectly readable and crisp up close. Typography is minimal: only a small refined caption near the top — "${head}"${sub ? ` with an even smaller, lighter line "${sub}" beneath it` : ''} — nothing else.`,
      `No people, no hands. No infographic, no icons, no feature strip, no boxes. The product label must exactly match the reference product.`,
      harmonyLine,
      noFakeLine,
    ].join(' ');
  }

  // ⑤ texture_minimal — 제형이 화면 전체, 텍스트는 최소(★☆☆☆☆). 타이틀 밴드 없이 작은 캡션만.
  if (infoLayout === 'texture_minimal') {
    return [
      intro,
      `Layout: the texture macro fills the ENTIRE frame edge to edge — no title band, no text block, no strip. Only one small, light floating caption near the top: "${head}"${sub ? ` with an even smaller line "${sub}" beneath it` : ''} — quiet type that lets the texture be the whole story.${lightLine}`,
      `Scene: ${ARCHETYPE_SCENES[archetype]}`,
      harmonyLine,
      noFakeLine,
    ].join(' ');
  }

  // 기본형 scene_title — 기존 "타이틀 + 장면"(★★★☆☆). 제품 중심 섹션이면 배정된 시점 주입.
  return [
    intro,
    `Layout: place the headline as a LARGE bold title with the subcopy noticeably smaller and lighter beneath it — clear size hierarchy — as a compact band at the TOP ONLY. The rest of the frame is the scene itself — do NOT add a bottom feature strip, extra text areas, or a poster-style 3-band layout.${viewLine}${treatLine}${lightLine}`,
    harmonyLine,
    `Scene: ${ARCHETYPE_SCENES[archetype]}`,
    copyLine,
    noFakeLine,
  ].join(' ');
}
