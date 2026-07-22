/**
 * 새 엔진(pipelineJob 기반 분할 호출) 전환 플래그.
 *
 * 기본 ON(새 엔진). 문제 시 즉시 롤백하려면 .env.local에 NEXT_PUBLIC_USE_NEW_ENGINE=0 설정 후 재빌드.
 * 기존 /api/generate 경로는 삭제하지 않고 플래그 OFF 시 그대로 사용된다.
 */
export const USE_NEW_ENGINE = (process.env.NEXT_PUBLIC_USE_NEW_ENGINE ?? '1') === '1';

/**
 * 래퍼런스형(타입 3번째 갈래) 노출 플래그.
 *
 * 기본 OFF(2026-07-22 결정) — 캡처 분석의 섹션 인식 품질이 오픈 기준에 못 미쳐 보류.
 * 분석 파이프라인(ReferenceScreen·analyze-reference-capture)은 삭제하지 않고 보존 —
 * 다시 열려면 .env.local에 NEXT_PUBLIC_ENABLE_REFERENCE_TYPE=1 설정 후 재빌드.
 */
export const ENABLE_REFERENCE_TYPE = process.env.NEXT_PUBLIC_ENABLE_REFERENCE_TYPE === '1';
