/**
 * 동시 N개 워커 풀 — 이미지 생성 병렬화용(ResultScreen·ResultMobile 공유).
 *
 * - 실패 격리: task 하나가 throw해도 나머지 작업은 계속(장 단위 에러는 task 내부에서
 *   이미 state로 처리되지만, 여기서도 방어적으로 삼킨다).
 * - 취소 전파: signal abort 시 새 작업을 더 뽑지 않는다. 진행 중인 fetch는
 *   각 task가 받은 동일 signal이 중단시킨다(호출부가 같은 ctrl.signal 전달).
 */
export async function runPool(
  tasks: Array<() => Promise<void>>,
  concurrency: number,
  signal?: AbortSignal,
): Promise<void> {
  let next = 0;
  const worker = async () => {
    while (!signal?.aborted) {
      const idx = next++;
      if (idx >= tasks.length) return;
      try { await tasks[idx](); } catch { /* 장 단위 실패 격리 — 나머지 계속 */ }
    }
  };
  const size = Math.max(1, Math.min(concurrency, tasks.length));
  await Promise.all(Array.from({ length: size }, worker));
}
