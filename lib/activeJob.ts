/**
 * "진행 중 파이프라인 job" 마커 — 새로고침/탭 이탈 후 재진입 복구용.
 *
 * - 진행 중 jobId는 localStorage에 기록(생성 시작 시 set, 완주·취소 시 clear).
 * - 페이지 로드 때 마커가 있으면(그리고 IndexedDB에 미완료 job이 있으면) 그 지점부터 재개.
 * - "지금 막 복구로 진입했다"는 1회성 의도는 sessionStorage로 전달(정상 신규 생성과 구분).
 *
 * 새 인프라 없음 — 브라우저 내장 localStorage/sessionStorage만 사용.
 */

const ACTIVE_KEY = 'pc_active_job';
const RESUME_KEY = 'pc_resume_job';

export function getActiveJobId(): string | null {
  try { return localStorage.getItem(ACTIVE_KEY); } catch { return null; }
}
export function setActiveJobId(jobId: string): void {
  try { localStorage.setItem(ACTIVE_KEY, jobId); } catch { /* no-op */ }
}
export function clearActiveJobId(): void {
  try { localStorage.removeItem(ACTIVE_KEY); } catch { /* no-op */ }
}

/** 복구 경로로 s7에 진입함을 표시(정상 신규 생성과 구분) */
export function markResumeIntent(): void {
  try { sessionStorage.setItem(RESUME_KEY, '1'); } catch { /* no-op */ }
}
/** 복구 의도를 1회 읽고 소거 */
export function consumeResumeIntent(): boolean {
  try {
    const v = sessionStorage.getItem(RESUME_KEY);
    sessionStorage.removeItem(RESUME_KEY);
    return v === '1';
  } catch { return false; }
}
