/**
 * 섹션 뼈대에 리듬을 준다(2026-08-03).
 *
 * ★왜: 결과물을 눈으로 보니 16개 섹션이 예외 없이 같은 순서였다 —
 *   제목 → 서브 → 큰 이미지(같은 폭·같은 둥근 모서리) → 본문 → 블록.
 *   블록 생김새(blockLayout)나 정렬(pageAccent)을 바꿔도 뼈대가 같으면 티가 나지 않는다.
 *   '10장 뽑으면 10장이 비슷하다'의 가장 큰 몫이 여기다.
 *
 * ★여기서도 아무도 고르지 않는다. 섹션의 역할(컷 아키타입)과 페이지 흐름이 정한다.
 *   ① 역할이 기본 뼈대를 정한다 — 공감은 글로 먼저 걸어야 하고, 브랜드 무드는 사진이 말한다.
 *   ② 같은 뼈대가 3연속이면 끊는다 — 비율·블록에서 쓴 방식과 동일.
 *
 * ⚠️뼈대는 네 가지뿐이다. 더 늘리면 '다양한' 게 아니라 '들쭉날쭉한' 페이지가 된다.
 *   히어로와 CTA는 건드리지 않는다 — 페이지의 처음과 끝은 예측 가능해야 한다.
 */

import { classifyCutArchetype } from '@/lib/sectionArchetype';

export type SectionLayout =
  | 'standard'    // 제목 → 이미지 → 본문 (기본)
  | 'textfirst'   // 제목 → 본문 → 이미지 — 글로 먼저 걸고 사진으로 확인시킨다
  | 'bleed';      // 이미지가 좌우 여백 없이 화면 끝까지 — 사진이 말하는 섹션
/* ★'compact'(이미지 축소)는 폐기(2026-08-03 유근님) — 근거 섹션이라도 사진이 작아지면
   페이지가 빈약해 보인다. 상세페이지에서 이미지는 줄이는 게 아니라 키우는 쪽이 맞다. */

const MAX_SAME_RUN = 2;

function byRole(name: string, isFirst: boolean, isLast: boolean): SectionLayout {
  if (isFirst || isLast) return 'standard';        // 처음과 끝은 예측 가능해야 한다
  switch (classifyCutArchetype(name ?? '')) {
    case 'empathy':   return 'textfirst';          // 고민을 글로 먼저 짚어야 사진이 '내 얘기'가 된다
    case 'editorial': return 'bleed';              // 브랜드·감성은 사진이 말한다 — 여백이 방해가 된다
    case 'in_use':    return 'bleed';              // 입고 쓰는 장면은 크게 봐야 산다
    default:          return 'standard';
  }
}

/** 같은 뼈대가 이어질 때 바꿔 앉힐 짝 — 성격이 너무 튀지 않는 것끼리 */
const PARTNER: Record<SectionLayout, SectionLayout> = {
  standard: 'textfirst', textfirst: 'standard', bleed: 'standard',
};

/**
 * 페이지 전체를 보고 섹션 뼈대를 정한다.
 * @param names 섹션 이름 배열(페이지 순서)
 */
export function assignSectionLayouts(names: string[]): SectionLayout[] {
  const last = names.length - 1;
  const out = names.map((n, i) => byRole(n, i === 0, i === last));

  let run = 1;
  for (let i = 1; i < out.length; i++) {
    if (out[i] !== out[i - 1]) { run = 1; continue; }
    run++;
    if (run <= MAX_SAME_RUN) continue;
    if (i === 0 || i === last) continue;            // 히어로·CTA는 바꾸지 않는다
    out[i] = PARTNER[out[i]];
    run = 1;
  }

  /* 풀블리드가 너무 잦으면 리듬이 아니라 소음이다 — 페이지의 1/4까지만 남기고 되돌린다 */
  const cap = Math.max(1, Math.floor(names.length / 4));
  let seen = 0;
  for (let i = 0; i < out.length; i++) {
    if (out[i] !== 'bleed') continue;
    seen++;
    if (seen > cap) out[i] = 'standard';
  }
  return out;
}
