/**
 * 블록 생김새를 '내용'과 '페이지 흐름'이 정한다(2026-08-02).
 *
 * ★왜: 실측 21개 페이지에서 블록 조합은 페이지마다 달랐다(4~7종). 그런데 다 비슷해 보였다.
 *   원인은 조합이 아니라 생김새였다 — stats는 언제나 "큰 숫자 + 작은 설명"을 N등분한 회색 카드다.
 *   상품이 무엇이든 CSS가 한 벌이라 같은 KPI 카드가 나온다.
 *
 * ★고르게 하지 않는다. 셀러도 모델도 아무것도 선택하지 않는다:
 *   ① 내용이 모양을 정한다 — 숫자가 하나면 크게, 라벨이 길면 세로로. 상품이 다르면 내용이
 *      다르므로 자동으로 달라진다. '이 섹션은 이 모양'이라고 못 박는 표가 아니다.
 *   ② 같은 모양이 이어지면 끊는다 — 비율 리듬(normalizeAspectsForPage)과 같은 방식.
 *      청크가 병렬이라 모델은 페이지 전체를 못 본다. 전체를 보는 건 코드뿐이다.
 *
 * ⚠️레이아웃 자체는 코드에 있어야 한다. 모델에게 CSS를 쓰게 하면 글자가 겹치고 모바일에서
 *   깨진다 — 그건 다채로운 게 아니라 망가진 것이다. 재료는 코드에, 선택은 내용에.
 */

import type { Block } from '@/store/AppContext';

/** ★가격·할인 KPI 제거(2026-08-04 유근님: "할인가 20% 같은 KPI 절대 나오면 안 됨").
 *  가격은 구매 정보 스트립(셀러 입력값)이 담당한다 — 카피 블록에 겹치면 두 군데가 어긋난다.
 *  프롬프트로도 금지하지만 모델이 어기므로(오늘 실측) 렌더 직전에 코드로 걷어낸다.
 *  항목만 제거하고, 남는 항목이 1개 이하면 블록 자체를 뺀다(한 칸짜리 KPI는 더 이상하다). */
const PRICE_RE = /할인|정가|판매가|가격|₩|\d[\d,]*\s*원/;
export function scrubPriceBlocks(blocks: Block[]): Block[] {
  return blocks.map((b): Block | null => {
    /* ★cta 블록은 그리지 않는다(2026-08-04 유근님: "삭제시켜야 함") — 바로 위 본문과 같은 말을
     *  반복하는 배너였고, 눌리지도 않는다(가짜 버튼을 뺀 7/21 결정의 연장). 마지막 섹션의
     *  카피·구매 정보 스트립이 마무리를 담당한다. */
    if (b.type === 'cta') return null;
    if (b.type === 'stats') {
      const items = b.items.filter(i => !PRICE_RE.test(`${i.value} ${i.label}`));
      return items.length >= 2 ? { ...b, items } : null;
    }
    if (b.type === 'iconcards') {
      const cards = b.cards.filter(c => !PRICE_RE.test(`${c.title} ${c.desc ?? ''}`));
      return cards.length >= 2 ? { ...b, cards } : null;
    }
    return b;
  }).filter((b): b is Block => b !== null);
}

/** 블록에 붙는 생김새 수식자(클래스명 접미사). 빈 문자열이면 기본형. */
export type BlockVariant = '' | 'solo' | 'stack' | 'lead' | 'rail' | 'flow' | 'plain';

const len = (s: string) => (s ?? '').trim().length;
const maxLen = (arr: string[]) => arr.reduce((m, s) => Math.max(m, len(s)), 0);

/** 값이 숫자·단위 위주인가 — "48시간", "70%", "59,000원"처럼 짧고 수치면 크게 보여줄 값이다 */
function isNumeric(v: string): boolean {
  return /\d/.test(v) && len(v) <= 10;
}

/** ① 내용이 정하는 모양 */
function byContent(b: Block): BlockVariant {
  switch (b.type) {
    case 'stats': {
      const n = b.items.length;
      if (n === 1) return 'solo';                                   // 하나뿐이면 카드로 가둘 이유가 없다
      const labels = b.items.map(i => i.label);
      const values = b.items.map(i => i.value);
      if (maxLen(labels) > 10) return 'stack';                      // 설명이 길면 N등분이 좁아 읽히지 않는다
      if (n >= 4) return 'rail';                                    // 넷 이상은 카드보다 가로 나열이 정갈하다
      if (!values.every(isNumeric)) return 'stack';                 // 수치가 아니면 크게 띄울 이유가 없다
      return '';
    }
    case 'iconcards': {
      const n = b.cards.length;
      const descs = b.cards.map(c => c.desc ?? '');
      if (descs.every(d => len(d) === 0)) return 'plain';           // 설명 없으면 카드가 빈 상자로 보인다
      if (n === 2) return 'stack';                                  // 둘뿐이면 가로 카드가 헐렁하다
      if (maxLen(descs) > 32) return 'stack';                       // 설명이 길면 가로 카드에서 글이 눌린다(45→32, 다양화)
      return '';
    }
    case 'steps': {
      const descs = b.items.map(s => s.desc ?? '');
      if (descs.every(d => len(d) === 0)) return 'rail';            // 제목만 있으면 타임라인이 과하다
      if (b.items.length >= 3) return 'flow';                       // 셋부터 번호 카드가 줄줄이 무거워진다(4→3, 2026-08-04 다양화)
      if (maxLen(descs) <= 24) return 'rail';                       // 설명이 짧으면 카드가 헐렁하다
      return '';
    }
    case 'checklist':
      return b.items.length >= 5 || maxLen(b.items) <= 18 ? 'rail' : '';   // 많거나 짧으면 2열
    default:
      return '';
  }
}

/** 같은 모양이 3연속이면 끊을 때 쓰는 짝 — 성격이 비슷한 것끼리만 바꾼다 */
const PARTNER: Record<string, BlockVariant> = {
  '': 'stack', stack: '', rail: 'stack', flow: '', solo: '', plain: 'stack', lead: '',
};

const MAX_SAME_RUN = 2;

/**
 * 페이지(섹션 목록) 전체를 보고 블록 생김새를 정한다.
 * 내용으로 먼저 정하고, 같은 (타입,모양)이 연달아 이어지면 끊는다.
 *
 * @param blocksPerSection 섹션별 블록 배열 — 페이지 순서 그대로
 * @returns 같은 모양의 2차원 배열(섹션별 → 블록별 수식자)
 */
export function assignBlockVariants(blocksPerSection: Block[][]): BlockVariant[][] {
  const flat: Array<{ s: number; b: number; type: string; v: BlockVariant }> = [];
  blocksPerSection.forEach((blocks, s) =>
    blocks.forEach((blk, b) => flat.push({ s, b, type: blk.type, v: byContent(blk) })));

  // ②같은 타입이 같은 모양으로 연달아 나오면 끊는다(타입별로 따로 센다 —
  //   stats가 세 번 이어지는 것과 checklist가 사이에 낀 것은 다르다)
  const runByType: Record<string, { v: BlockVariant; n: number }> = {};
  for (const item of flat) {
    const r = runByType[item.type];
    if (r && r.v === item.v) {
      r.n++;
      if (r.n > MAX_SAME_RUN) {
        item.v = PARTNER[item.v] ?? '';
        r.v = item.v; r.n = 1;
      }
    } else {
      runByType[item.type] = { v: item.v, n: 1 };
    }
  }

  const out: BlockVariant[][] = blocksPerSection.map(blocks => blocks.map(() => '' as BlockVariant));
  for (const item of flat) out[item.s][item.b] = item.v;
  return out;
}

/** 단일 섹션만 다시 그릴 때(재생성) — 페이지 흐름을 모르므로 내용만 본다 */
export function variantsForSection(blocks: Block[]): BlockVariant[] {
  return blocks.map(byContent);
}
