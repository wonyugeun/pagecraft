/**
 * Prompt Composer — 3계층(Scene·Layout·Physical Size)을
 * GPT Image가 가장 이해하기 쉬운 "광고 제작 브리프" 하나로 재작성하는 조립층.
 *
 * ★전면 단순화(4블록): LAYOUT / SUBJECT / STYLE / NEGATIVE 만 출력.
 *   · 문장 수 압축이 목표가 아니다 — 이해하기 쉬운 브리프 구조가 목표.
 *   · LAYOUT은 Top/Upper/Middle/Bottom 밴드로 서술(좌표 enum·내부 명칭 출력 금지).
 *   · SUBJECT = 모델+제품+손 규칙+실물 크기+역할을 한 블록으로.
 *   · STYLE = 스타일 계약 1줄 + Lighting 1줄 (hero A/B 검증 — 상세 서술 무이득).
 *   · NEGATIVE = 손 오류+제품 과대+KPI 박스+Template UI 등 통합.
 *
 * ★다이어트 2차: Pose(20종 enum)·Director 계층 제거 — 80장 감사에서 발현 증거 없음.
 *   손 규칙(poseLibrary 코어)만 유지. 충돌 우선순위: 배치=Layout / 조명·모델 유무=Scene /
 *   제품 크기=Physical Size Engine.
 */
import type { SceneSpec } from '@/lib/sectionArchetype';
import type { LayoutSpec } from '@/lib/layoutLibrary';
import { HAND_NEGATIVE_RULES } from '@/lib/poseLibrary';

/* ── 자연어 미니 사전(내부 enum → 사람 말) ── */
const HEADLINE_C: Record<LayoutSpec['headline_area'], string> = {
  top_band: 'a bold headline band',
  top_third: 'a large clean headline area',
  top_half: 'a spacious quiet headline area',
  left_column: 'a vertical headline column on the left',
  right_column: 'a vertical headline column on the right',
  center_band: 'a clear headline band across the center',
};
const VISUAL_C: Record<LayoutSpec['visual_area'], string> = {
  full_bleed: 'photography filling the frame edge to edge',
  center_stage: 'the visual staged at the center',
  lower_two_thirds: 'the visual held in the lower two thirds',
  middle_band: 'the visual held in a calm middle band',
  left_half: 'the visual set in the left half',
  right_half: 'the visual set in the right half',
};
const ANCHOR_C: Record<Exclude<LayoutSpec['product_anchor'], 'none'>, string> = {
  center: 'at the center', center_left: 'on the center-left', center_right: 'on the center-right',
  upper_left: 'in the upper left', upper_right: 'in the upper right',
  lower_center: 'low and centered', lower_left: 'in the lower left', lower_right: 'in the lower right',
};
/** 물리 크기 지시 — 엔진 출력(핵심 1문장)을 그대로, 미지정이면 범용 실물비율 폴백 */
function physicalSizeLine(physicalSize?: string): string {
  return physicalSize
    ?? 'The product appears at its realistic real-world size — natural in the hand, never enlarged for dramatic emphasis.';
}

export interface ComposeInput {
  scene: SceneSpec;
  layout: LayoutSpec;
  physicalSize?: string;   // Physical Size Engine 출력(선택)
}

/**
 * 3계층 → 4블록 광고 제작 브리프 (LAYOUT / SUBJECT / STYLE / NEGATIVE).
 * 결정적 — 같은 입력이면 항상 같은 브리프. 좌표 enum·내부 명칭 미출력.
 */
export function composeBrief(input: ComposeInput): string {
  const { scene, layout, physicalSize } = input;
  const sceneHasModel = scene.recommended_model_ratio[1] > 0;
  const modelInFrame = sceneHasModel && layout.model_anchor !== 'none';
  const productAnchor = ANCHOR_C[layout.product_anchor as Exclude<LayoutSpec['product_anchor'], 'none'>];

  /* ── LAYOUT — Top / Upper / Middle / Bottom 밴드 브리프 ── */
  // ★ingredient 계열 Scene: 원료가 주인공, 제품은 소품 — "product as the visual hero" 고정 문구가
  //   slideBaked의 원료 장면 지시와 정반대로 충돌하던 결함(드라이런 감사 F3) 수정.
  const isIngredientScene = scene.scene_id.startsWith('ingredient');
  const middleWho = modelInFrame
    ? 'the model and the product together'
    : isIngredientScene ? 'the raw ingredient story' : 'the product alone';
  const middleAnchor = isIngredientScene
    ? `with the fresh ingredients staged ${productAnchor} as the visual hero and the product appearing only as a small supporting prop`
    : `with the product anchored ${productAnchor} as the visual hero`;
  // ★Hero 단순화(삭제만): Top 정보바(무데이터 → 가짜 텍스트 유발 위험)·Bottom KPI(slideBaked 스트립이 유일 소스) 제거
  const layoutBlock = [
    `LAYOUT`,
    `Upper: ${HEADLINE_C[layout.headline_area]} — keep this zone clean for the Korean headline, nothing intruding.`,
    `Middle: ${middleWho} — ${VISUAL_C[layout.visual_area]}, ${middleAnchor}.`,
  ].join('\n');

  /* ── SUBJECT — 모델·제품·손·실물 크기·역할 통합 ── */
  const subjectLines: string[] = [];
  if (modelInFrame) {
    subjectLines.push(
      `A Korean model naturally supports and presents the product.`,
    );
    subjectLines.push(
      `Hands look natural — five fingers only on each visible hand, natural joints, hands never overlapping, label never covered by fingers.`,
    );
  } else if (isIngredientScene) {
    subjectLines.push(`No people in frame — fresh raw ingredients and textures carry the frame; the product appears small as a side prop, never as the main subject.`);
  } else {
    subjectLines.push(`No people in frame — the product carries the page alone as the hero.`);
  }
  subjectLines.push(physicalSizeLine(physicalSize));
  subjectLines.push(`The product label stays clearly visible and exactly matches the reference product.`);
  const subjectBlock = [`SUBJECT`, ...subjectLines].join('\n');

  /* ── STYLE — 조명·배경·색감·무드·촬영 스타일 통합 ── */
  // ★A/B 검증(hero, 2026-07-05): Camera·Background 상세 서술 제거해도 품질 동급 이상 —
  //   GPT는 스타일 계약 한 줄에서 구도·배경을 스스로 조합. Lighting만 유지(ingredient 무드 보호, 미검증 구간).
  const styleBlock = [
    `STYLE`,
    `Premium Korean commercial advertising photograph — editorial quality, like a real brand campaign.`,
    `Lighting: ${scene.recommended_lighting}.`,
  ].join('\n');

  /* ── NEGATIVE — 손 오류·제품 과대·KPI 박스·Template UI 통합(중복 제거) ── */
  // 손 오류는 poseLibrary 코어 손 규칙 5종을 직접 병합(Pose 계층 삭제 후 유일 소스)
  // ★아이콘식 KPI 전환: 'icon cards' 금지 항목 제거(slideBaked의 라인 아이콘 지시와 충돌하던 원인)
  const negatives = [...new Set([
    'oversized exaggerated product rendering',
    'thick boxed KPI panels',
    'template UI or infographic look',
    'dashboards, charts, badges, or certification seals',
    ...(modelInFrame ? HAND_NEGATIVE_RULES : []),
    ...scene.negative_rules,
  ])].slice(0, 14);
  const negativeBlock = [`NEGATIVE`, `Avoid: ${negatives.join('; ')}.`].join('\n');

  return [layoutBlock, subjectBlock, styleBlock, negativeBlock].join('\n\n');
}

