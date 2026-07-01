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

/** 섹션 blocks에서 하단 특징 스트립 재료 추출(iconcards/checklist/stats). 숫자 게이트 통과분만, 최대 3개. */
function extractFeatures(blocks: Block[] | undefined, allowDigits: string): string[] {
  if (!blocks?.length) return [];
  const raw: string[] = [];
  for (const b of blocks) {
    if (b.type === 'iconcards') {
      for (const c of b.cards) raw.push(c.desc ? `${c.title} — ${c.desc}` : c.title);
    } else if (b.type === 'checklist') {
      raw.push(...b.items);
    } else if (b.type === 'stats') {
      for (const it of b.items) raw.push(`${it.value} ${it.label}`.trim());
    }
    // compare/faq/steps 등 표·문답형은 슬라이드 하단 스트립에 부적합 → 제외
  }
  const seen = new Set<string>();
  const out: string[] = [];
  for (const r of raw) {
    const g = gateFeature(r, allowDigits);
    if (!g || seen.has(g)) continue;
    seen.add(g);
    out.push(g);
    if (out.length >= 3) break;
  }
  return out;
}

/**
 * 슬라이드 baked 프롬프트 생성.
 * @param headline  섹션 헤드라인
 * @param subcopy   섹션 서브카피(있으면)
 * @param knownFacts 셀러 원입력(productName + productExtra) — 수치 검증 기준
 * @param blocks    섹션 blocks — 하단 특징 스트립 재료
 */
export function buildSlideBakedText(
  headline: string,
  subcopy: string | undefined,
  knownFacts: string,
  blocks?: Block[],
): string {
  const head = (headline ?? '').replace(/\n/g, ' ').trim();
  const sub = (subcopy ?? '').replace(/\n/g, ' ').trim();
  const allowDigits = (knownFacts ?? '').replace(/[,.\s]/g, '');
  const feats = extractFeatures(blocks, allowDigits);

  const featLine = feats.length
    ? ` Feature points (bottom strip, each as a short labeled chip): ${feats.map(f => `"${f}"`).join(' · ')}.`
    : '';

  return [
    `Render the following Korean marketing copy as crisp, accurate, correctly-spelled text integrated into a full advertising poster layout`,
    `(clean modern Korean sans-serif like Pretendard, perfectly legible, no garbled or broken glyphs).`,
    // 레이아웃: 상단 카피 / 중앙 제품·모델 / 하단 특징 스트립 — 위·중간·아래 꽉 차게
    `Layout: the headline${sub ? ' and subcopy' : ''} as a bold title band at the TOP; the product (and model if present) as the hero in the CENTER; the feature points as a clean labeled strip along the BOTTOM. Compose the top, middle and bottom areas so it reads as a complete, dense product advertisement — no large empty gaps.`,
    `Headline: "${head}"${sub ? `. Subcopy (smaller, lighter): "${sub}"` : ''}.${featLine}`,
    // 셀러 입력 기반 카피만 렌더, 그 외 로고·날조 수치 금지
    `Render ONLY the Korean copy provided above as text — do not invent logos, badges, certification marks, or any numbers/percentages/statistics that are not part of this copy.`,
  ].join(' ');
}
