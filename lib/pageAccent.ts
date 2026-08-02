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

/**
 * 페이지에서 포인트 컬러를 남길 섹션들을 고른다.
 *
 * ★한 곳만 남겨봤더니 스크롤 내내 색이 한 번도 안 나와 밋밋했다(2026-08-03 유근님).
 *   반대로 전 섹션에 있으면 문단 장식이 된다. 페이지 길이에 비례해 두는 게 맞다 —
 *   대략 다섯 섹션에 한 번, 최소 2곳. 8섹션 2곳 · 16섹션 3곳 · 32섹션 6곳.
 * ★히어로는 우선 남긴다 — 첫 화면에서 한 줄이 튀어야 페이지의 톤이 정해진다.
 * ★남긴 자리끼리는 최소 3섹션 떨어뜨린다. 붙어 나오면 두 개가 서로를 죽인다.
 */
function pickAccentIndexes(bodies: string[], preferIdx?: number): Set<number> {
  const marked = bodies
    .map((b, i) => ({ i, m: (b ?? '').match(/\(\(([^)]+)\)\)/) }))
    .filter(x => x.m)
    .map(x => ({ i: x.i, len: x.m![1].length }));
  if (!marked.length) return new Set();

  const quota = Math.min(6, Math.max(2, Math.round(bodies.length / 5)));
  const keep = new Set<number>();
  const take = (i: number) => { keep.add(i); };

  if (preferIdx !== undefined && marked.some(x => x.i === preferIdx)) take(preferIdx);
  if (marked.some(x => x.i === 0)) take(0);                       // 히어로 우선

  // 남은 자리는 강조 문장이 짧은 순 — 짧을수록 꽂힌다
  for (const cand of [...marked].sort((a, b) => a.len - b.len)) {
    if (keep.size >= quota) break;
    if (keep.has(cand.i)) continue;
    if ([...keep].some(k => Math.abs(k - cand.i) < 3)) continue;  // 너무 붙으면 서로 죽인다
    take(cand.i);
  }
  return keep;
}

/** 포인트 컬러를 정해진 곳에만 남긴다. 나머지는 괄호만 벗기고 문장은 그대로 둔다. */
export function limitPageAccent(bodies: string[], preferIdx?: number): string[] {
  const keep = pickAccentIndexes(bodies, preferIdx);
  return bodies.map((b, i) =>
    keep.has(i) ? (b ?? '') : (b ?? '').replace(/\(\(([^)]+)\)\)/g, '$1'));
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
  /* ★역할별로 가운데/왼쪽을 섞어봤다가 되돌렸다(2026-08-03 유근님).
   *  한 페이지에서 정렬이 오가면 리듬이 아니라 정돈이 안 된 것으로 읽힌다 —
   *  특히 이미지 폭까지 함께 달라지면 "왜 여긴 왼쪽이지" 하는 어긋남이 먼저 보인다.
   *  가운데를 기본으로 두고, 센터로는 감당 안 되는 아주 긴 본문만 왼쪽으로 내린다(종전 기준). */
  void sectionName; void isFirst; void isLast;
  return (body ?? '').length <= 260;
}
