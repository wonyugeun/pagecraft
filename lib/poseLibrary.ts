/**
 * Hand Rules — AI 손 붕괴(손가락 6개·융합·겹침)를 구조적으로 막는 코어 규칙.
 *
 * ★다이어트 2차(2026-07-05): Pose Library 20종 + Scene→Pose 선택 엔진 삭제.
 *   80장 기여도 감사 결과 — 포즈 enum(그립·손가락·손목 서술)의 프롬프트 발현 증거 없음,
 *   실제 품질 기여는 "손 규칙" 뿐. 모델 포즈 변주는 imagebrief의 Claude 장면 설계와
 *   imagePromptRules의 CTA 변주 지시가 담당. (복원 필요 시 git: b635fc9 이전 버전)
 */

export const HAND_POSITIVE_RULES = [
  'five fingers only on each visible hand',
  'natural finger joints and knuckles',
  'hands never overlap each other',
  'natural cosmetic advertising pose',
] as const;

export const HAND_NEGATIVE_RULES = [
  'duplicated fingers',
  'fused or merged fingers',
  'interlocked fingers',
  'extra or missing fingers',
  'broken or bent-back wrist',
] as const;
