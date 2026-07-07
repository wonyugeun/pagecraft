/**
 * 가격 정책(pricing) — 크레딧 비용 계산의 단일 소스.
 *
 * ★정책(2026-07-07 확정): 1섹션 = 1크레딧. 8섹션=8, 16섹션=16, 24섹션=24.
 *   1크레딧의 현금 가치는 코드 밖(판매 단가) — 여기서는 크레딧 수량만 다룬다.
 * ★원칙: 라우트에 비용 리터럴을 직접 박지 않는다 — 서버 차감·클라 안내 모두 이 함수 경유.
 * ★순수 함수·의존성 0 — 서버 라우트와 클라 UI가 같은 함수를 import(가격 이원화 차단).
 */

export const CREDIT_PER_SECTION = 1;

/** 섹션 수 서비스 한도 — 기존 /api/generate의 50 상한과 동일 기준 */
export const MAX_BILLABLE_SECTIONS = 50;
export const MIN_BILLABLE_SECTIONS = 1;

export interface GenerationPricingInput {
  sectionCount: number;
  // ── 확장 슬롯(타입만 예약 — 오늘 계산식 미반영) ──
  imageQuality?: 'medium' | 'high';   // 추후: 이미지 품질 배수
  regenerationCount?: number;         // 추후: 재생성 과금
  referenceAnalysis?: boolean;        // 추후: 레퍼런스 분석 비용
  premiumTemplate?: boolean;          // 추후: 프리미엄 템플릿 비용
}

/** 생성 1회 비용(크레딧). sectionCount 정수화 + [1, 50] clamp. */
export function calculateGenerationCost(input: GenerationPricingInput): number {
  const raw = Math.floor(Number(input.sectionCount));
  const sections = Math.min(Math.max(Number.isFinite(raw) ? raw : MIN_BILLABLE_SECTIONS, MIN_BILLABLE_SECTIONS), MAX_BILLABLE_SECTIONS);
  return sections * CREDIT_PER_SECTION;
}

/* ── credit_ledger.reason 규약 — "generation:{결제 섹션 수}" (스키마 무변경으로 결제 수치 조회) ── */

export const GENERATION_REASON_PREFIX = 'generation:';

/** 차감 ledger에 기록할 reason 문자열 — 결제된 섹션 수를 규약으로 보존 */
export function generationReason(sectionCount: number): string {
  return `${GENERATION_REASON_PREFIX}${Math.floor(sectionCount)}`;
}

/** reason 문자열 → 결제된 섹션 수(규약 불일치·구버전 'generation'은 null) */
export function parseGenerationReason(reason: string | null | undefined): number | null {
  if (!reason || !reason.startsWith(GENERATION_REASON_PREFIX)) return null;
  const n = parseInt(reason.slice(GENERATION_REASON_PREFIX.length), 10);
  return Number.isFinite(n) && n >= MIN_BILLABLE_SECTIONS ? n : null;
}
