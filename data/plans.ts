/**
 * 요금제(크레딧 충전 팩) — 판매 가격의 단일 소스(2026-07-29).
 *
 * ★PG(카드사) 심사 요건: 홈페이지에 실제 판매 가격이 표시되어야 한다.
 *   "준비 중"만 있으면 심사가 통과되지 않는다.
 *
 * ★가격 산정 근거(실측):
 *   - 이미지: 장당 약 90원(medium) — app/api/generate-image/route.ts:209 주석
 *   - 16섹션 1페이지 기준: 기본 이미지 16장 + 무료 재생성 최대 10장 = 최대 26장
 *   - 카피 파이프라인(strategy·structure·copy A/B·imagebrief) 약 800원/페이지
 *   → 페이지 1개 원가: 평상시 약 2,200원 / 무료 재생성 다 쓰면 약 3,100원
 *   → 크레딧 1개 원가: 약 140~200원
 *
 * ★현재 구조는 '단건 결제(충전)'다. 정기결제(구독)는 PG 빌링 계약·심사가 별도라
 *   오픈은 단건으로 하고, 수요가 확인되면 구독을 추가한다.
 *
 * ★가격을 바꾸려면 이 파일만 수정한다(요금제 페이지·크레딧 모달이 함께 반영).
 */

export interface CreditPlan {
  id: string;
  name: string;
  /** 판매가(원, VAT 포함 표기) */
  price: number;
  /** 지급 크레딧 */
  credits: number;
  /** 대표 문구 */
  tagline: string;
  /** 추천 배지 */
  recommended?: boolean;
}

/** 크레딧 1개 = 상세페이지 섹션 1개 생성 */
export const CREDIT_UNIT_NOTE = '크레딧 1개 = 상세페이지 섹션 1개 생성';

/** 크레딧 유효기간(개월) — 전자상거래법상 소멸 조건 명시 필요 */
export const CREDIT_VALID_MONTHS = 12;

export const PLANS: CreditPlan[] = [
  {
    id: 'light',
    name: '라이트',
    price: 9900,
    credits: 20,
    tagline: '상세페이지 1개를 여유 있게',
  },
  {
    id: 'standard',
    name: '스탠다드',
    price: 29000,
    credits: 70,
    tagline: '상품 여러 개를 준비하는 셀러',
    recommended: true,
  },
  {
    id: 'pro',
    name: '프로',
    price: 59000,
    credits: 160,
    tagline: '정기적으로 신상품을 올리는 스토어',
  },
];

/** 표시용 — 크레딧당 단가(원, 반올림) */
export function pricePerCredit(plan: CreditPlan): number {
  return Math.round(plan.price / plan.credits);
}

/** 표시용 — 16섹션 페이지 몇 개 분량인지(소수 1자리) */
export function pagesPerPlan(plan: CreditPlan, sectionsPerPage = 16): number {
  return Math.round((plan.credits / sectionsPerPage) * 10) / 10;
}
