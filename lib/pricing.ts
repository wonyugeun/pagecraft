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

/** ★체험(무료) 계정 섹션 상한(2026-07-30) — 체험 크레딧 10개로 기본 14~16섹션을 시도하면
 *  첫 화면에서 '크레딧 부족'을 만나 이탈한다. 체험은 짧은 페이지 하나를 온전히 끝내게 한다. */
export const TRIAL_MAX_SECTIONS = 10;

/** 유료 결제 이력이 없으면 섹션 수를 체험 상한으로 clamp */
export function clampSectionsForTrial(sectionCount: number, hasPaid: boolean): number {
  const n = Math.floor(Number(sectionCount)) || MIN_BILLABLE_SECTIONS;
  return hasPaid ? n : Math.min(n, TRIAL_MAX_SECTIONS);
}
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

/* ── 이미지 quota 정책(P0, 2026-07-08) — "결제된 jobKey로 generate-image 무한 호출" 차단 ──
 * quota = paidSections × 3 + 10 (8섹션=34, 16섹션=58, 24섹션=82).
 * 정상 수요(기본 1장/섹션 + 재생성 + 블록 이미지 + 썸네일)는 넉넉히 덮고 비용 폭주만 상한.
 * high 품질은 비용 ~4배라 2카운트(quality override 복원 후에도 노출 상한 유지). */

// ★재생성 정책(2026-07-27 유근님 확정): 무료 = 첫 생성(섹션당 1장) + 결제 규모에 비례한 재생성.
//   재생성 무료분 = 16섹션당 10장(32섹션=20장, 8섹션=5장). 1~2섹션(빠른제작·썸네일)은 0장.
//   한도 소진 후엔 1장당 1크레딧(고품질 2) 추가 차감 — generate-image 라우트의 chargeExtra 흐름.
//   (구: 섹션×1 + 정액 10 — 1크레딧 빠른제작이 11장을 받아 정식 생성보다 7배 유리한 역전 구간이 있었음)
export const IMAGE_QUOTA_PER_SECTION = 1;
/** 재생성 무료분의 기준 — REGEN_FREE_PER_UNIT장 / REGEN_UNIT_SECTIONS섹션 (비례 배분, 내림) */
export const REGEN_UNIT_SECTIONS = 16;
export const REGEN_FREE_PER_UNIT = 10;

/** 결제된 섹션 수 → jobKey당 무료 재생성 장수(첫 생성분 제외). 16섹션=10, 32섹션=20, 1섹션=0 */
export function calculateFreeRegenQuota(paidSections: number): number {
  const sections = Math.min(Math.max(Math.floor(paidSections) || MIN_BILLABLE_SECTIONS, MIN_BILLABLE_SECTIONS), MAX_BILLABLE_SECTIONS);
  return Math.floor((sections * REGEN_FREE_PER_UNIT) / REGEN_UNIT_SECTIONS);
}

/** 결제된 섹션 수 → jobKey당 이미지 quota(첫 생성 섹션당 1장 + 무료 재생성분) */
export function calculateImageQuota(paidSections: number): number {
  const sections = Math.min(Math.max(Math.floor(paidSections) || MIN_BILLABLE_SECTIONS, MIN_BILLABLE_SECTIONS), MAX_BILLABLE_SECTIONS);
  return sections * IMAGE_QUOTA_PER_SECTION + calculateFreeRegenQuota(sections);
}

/** 품질별 quota 가중치 — high=2(비용 ~4배 반영), 그 외(medium/기본)=1 */
export function imageQuotaWeight(quality: string | undefined): number {
  return quality === 'high' ? 2 : 1;
}

/* ── user/IP 시간창 rate limit(배포 전 방어, 2026-07-08) — 자동화 남용·무료 크레딧 farming 속도 상한.
 * usage_counters 재사용(scope_key 규약 rl:{subject}:{class}:{h|d}:{window}), 고정 윈도.
 * 수치는 실사용 분포 보고 조정 전제. ── */
export const RATE_LIMITS = {
  image: { emailHour: 120, emailDay: 400, ipDay: 800 },
  llm:   { emailHour: 60 },
  prep:  { emailDay: 20, ipDay: 60 },
} as const;

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
