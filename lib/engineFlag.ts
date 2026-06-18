/**
 * 새 엔진(pipelineJob 기반 분할 호출) 전환 플래그.
 *
 * 기본 ON(새 엔진). 문제 시 즉시 롤백하려면 .env.local에 NEXT_PUBLIC_USE_NEW_ENGINE=0 설정 후 재빌드.
 * 기존 /api/generate 경로는 삭제하지 않고 플래그 OFF 시 그대로 사용된다.
 */
export const USE_NEW_ENGINE = (process.env.NEXT_PUBLIC_USE_NEW_ENGINE ?? '1') === '1';
