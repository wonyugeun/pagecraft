/**
 * 페이지 단위 강조·정렬 규칙(2026-08-02).
 *
 * 실측(runs/패션-미검증섹션-2026-08-02-08-06)에서 드러난 두 가지:
 *  ① ((포인트 컬러))가 16섹션 중 14곳에 있었다. 프롬프트가 "섹션당 최대 1곳"이라고 했기 때문이다.
 *     매 섹션이 주황색 한 줄로 끝나면 그건 강조가 아니라 문단 장식이다.
 *     "이 집 멘트 좋다"는 페이지가 고르게 좋아서가 아니라 딱 한 문장이 튀어서 생긴다.
 *  ② 본문이 260자 이하면 전부 가운데 정렬이었다. 실제 본문은 128~220자라 사실상 전 섹션이 가운데였다.
 *     히어로는 가운데가 맞지만, 설명하는 글이 여섯 줄 가운데로 이어지면 상세페이지가 아니라 청첩장처럼 읽힌다.
 *
 * ⚠️둘 다 페이지 전체를 봐야 정할 수 있다 — 카피 청크는 병렬이라 모델은 옆 섹션을 모른다.
 */

import { classifyCutArchetype } from '@/lib/sectionArchetype';

const MARK = /\(\(([^)]+)\)\)/g;

/** 강조가 살아남을 섹션 하나를 고른다 — 짧을수록 꽂히므로 가장 짧은 강조 문장을 남긴다 */
function pickAccentIndex(bodies: string[], preferIdx?: number): number {
  if (preferIdx !== undefined && MARK.test(bodies[preferIdx] ?? '')) { MARK.lastIndex = 0; return preferIdx; }
  MARK.lastIndex = 0;

  let best = -1, bestLen = Infinity;
  bodies.forEach((b, i) => {
    if (i === 0 || i === bodies.length - 1) return;      // 히어로·CTA는 이미 강한 자리 — 중간에서 튀어야 한다
    const m = (b ?? '').match(/\(\(([^)]+)\)\)/);
    if (!m) return;
    if (m[1].length < bestLen) { bestLen = m[1].length; best = i; }
  });
  if (best >= 0) return best;
  return bodies.findIndex(b => /\(\([^)]+\)\)/.test(b ?? ''));   // 중간에 없으면 아무 데나 하나
}

/**
 * 페이지에서 포인트 컬러를 한 곳만 남긴다. 나머지는 괄호만 벗기고 문장은 그대로 둔다.
 * @param preferIdx 코드가 킬러 라인으로 지정한 섹션(있으면 그 자리를 우선)
 */
export function limitPageAccent(bodies: string[], preferIdx?: number): string[] {
  const keep = pickAccentIndex(bodies, preferIdx);
  return bodies.map((b, i) =>
    i === keep ? (b ?? '') : (b ?? '').replace(/\(\(([^)]+)\)\)/g, '$1'));
}

/**
 * 이 섹션의 본문을 가운데 정렬할 것인가.
 *
 * 역할이 정한다 — 첫 화면과 마무리, 브랜드 무드는 가운데가 맞고,
 * 설명·근거·사용법은 왼쪽이 읽힌다. 길이는 보조 조건일 뿐이다(아주 짧으면 어느 쪽이든 무방).
 */
export function isCenteredSection(
  sectionName: string, body: string, isFirst: boolean, isLast: boolean,
): boolean {
  const len = (body ?? '').trim().length;
  if (len === 0) return true;
  if (isFirst || isLast) return true;              // 히어로·CTA
  if (len <= 90) return true;                      // 두세 줄짜리는 왼쪽으로 붙일 이유가 없다
  const a = classifyCutArchetype(sectionName ?? '');
  return a === 'editorial' || a === 'empathy';     // 브랜드 무드·공감은 가운데가 어울린다
}
