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

/** 숫자 토큰이 knownFacts에 실재하는지 — 구분기호 제거 후 '연속 숫자열'로 검증(다자리 통계 오통과 방지). */
function numberVerified(numStr: string, allowDigits: string): boolean {
  const d = numStr.replace(/[,.\s]/g, '');
  if (!d) return true;
  return allowDigits.includes(d);
}

/** 특징 문구 게이트 — 미검증 숫자를 포함하면 항목째 드롭(날조 수치 방지). 숫자 없는 라벨은 그대로 통과. */
function gateFeature(text: string, allowDigits: string): string {
  const t = (text ?? '').replace(/\s+/g, ' ').trim();
  if (!t) return '';
  const nums = t.match(/\d[\d,.]*\d|\d/g) ?? [];
  for (const n of nums) {
    if (!numberVerified(n, allowDigits)) return '';   // AI 날조 수치 의심 → 드롭
  }
  return t;
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

/** 섹션 blocks에서 하단 특징 스트립 재료 추출 — ★라벨 단어만(iconcards.title / stats.value/label).
 *  설명(desc)·문장(checklist)은 축약 게이트에서 자연 탈락. 숫자 게이트 통과분만, 최대 3개. */
function extractFeatures(blocks: Block[] | undefined, allowDigits: string): string[] {
  if (!blocks?.length) return [];
  const raw: string[] = [];
  for (const b of blocks) {
    if (b.type === 'iconcards') {
      for (const c of b.cards) raw.push(c.title);           // desc 드롭 — 라벨만
    } else if (b.type === 'checklist') {
      raw.push(...b.items);                                  // 문장형은 toShortLabel에서 탈락
    } else if (b.type === 'stats') {
      // 값만 칩 후보("200ml", "24,000원") — 값이 게이트에서 드롭되면 라벨 단독은 수치 맥락을 잃어 함께 제외
      for (const it of b.items) raw.push(it.value);
    }
    // compare/faq/steps 등 표·문답형은 슬라이드 하단 스트립에 부적합 → 제외
  }
  const seen = new Set<string>();
  const out: string[] = [];
  for (const r of raw) {
    const short = toShortLabel(r);
    if (!short) continue;
    const g = gateFeature(short, allowDigits);
    if (!g || seen.has(g)) continue;
    seen.add(g);
    out.push(g);
    if (out.length >= 3) break;
  }
  return out;
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
 */
export function buildSlideBakedText(
  headline: string,
  subcopy: string | undefined,
  knownFacts: string,
  blocks?: Block[],
  archetype: CutArchetype = 'hero',
  accentHex?: string,
): string {
  const head = (headline ?? '').replace(/\n/g, ' ').trim();
  const sub = (subcopy ?? '').replace(/\n/g, ' ').trim();
  const accent = accentHex ? `accent color ${accentHex}` : 'the brand accent color';

  const intro =
    `Render the following Korean marketing copy as crisp, accurate, correctly-spelled text integrated into the composition ` +
    `(clean modern Korean sans-serif like Pretendard, perfectly legible, no garbled or broken glyphs).`;
  const copyLine = `Headline: "${head}"${sub ? `. Subcopy (smaller, lighter): "${sub}"` : ''}.`;
  const noFakeLine =
    `Render ONLY the Korean copy provided above as text — do not invent logos, badges, certification marks, or any numbers/percentages/statistics that are not part of this copy.`;

  // ── hero·cta: 3층 광고 레이아웃 — ★초대형 디스플레이 타이틀 + 키워드 1개 accent 강조 + 특징 스트립(수치 게이트) ──
  if (archetype === 'hero' || archetype === 'cta') {
    const allowDigits = (knownFacts ?? '').replace(/[,.\s]/g, '');
    const feats = extractFeatures(blocks, allowDigits);
    const featLine = feats.length
      ? ` Feature points (bottom strip): render each as a minimal chip containing ONLY this short Korean label word, nothing else — ${feats.map(f => `"${f}"`).join(' · ')}. No sentences, no descriptions on the chips.`
      : '';
    return [
      intro,
      `Layout: an OVERSIZED display headline dominating the top third of the frame — bold Korean display typography at poster scale, with exactly ONE key word of the headline emphasized in ${accent} (the rest in near-black); the subcopy much smaller and lighter directly beneath it (strong size contrast); the product (and model if present) as the hero in the CENTER; the feature chips as a clean strip along the BOTTOM. Compose the top, middle and bottom areas so it reads as a complete, dense product advertisement — no large empty gaps.`,
      `${copyLine}${featLine}`,
      noFakeLine,
    ].join(' ');
  }

  // ── 그 외 6종: 상단 타이틀만(대/소 위계) + 아키타입 장면. 하단 스트립·3층 금지(장면이 화면의 주인공) ──
  return [
    intro,
    `Layout: place the headline as a LARGE bold title with the subcopy noticeably smaller and lighter beneath it — clear size hierarchy — as a compact band at the TOP ONLY. The rest of the frame is the scene itself — do NOT add a bottom feature strip, extra text areas, or a poster-style 3-band layout.`,
    `Scene: ${ARCHETYPE_SCENES[archetype]}`,
    copyLine,
    noFakeLine,
  ].join(' ');
}
