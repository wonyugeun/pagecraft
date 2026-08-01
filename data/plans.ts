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
  /** 한글명 — 보조 표기 */
  name: string;
  /** 영문 플랜명 — 카드 제목(대문자). AI 서비스 관행이고 시각적으로 정돈됨 */
  nameEn: string;
  /** 현재 실제 판매가(원, VAT 포함 표기) */
  price: number;
  /** 정가 — 프로모션 종료 후 적용될 가격.
   *  ⚠️'종전 거래가격'이 아니다. 실제로 판매한 적 없는 가격에 취소선을 그어 할인율을 표시하면
   *  공정위 기준상 허위 할인 표시가 된다(종전가격은 최근 상당기간 실제 판매가여야 함).
   *  그래서 UI는 취소선·할인율 대신 "언제부터 얼마로 조정" 형태의 예고로만 표기한다. */
  listPrice: number;
  /** 지급 크레딧 */
  credits: number;
  /** 대표 문구 — 어떤 셀러에게 맞는지 한 줄 */
  tagline: string;
  /** 추천 배지 — 시선을 유도할 카드 1개에만 */
  recommended?: boolean;
  /** 유효기간(개월) — ★플랜별 차등(2026-07-30):
   *  단건 충전에 일률 1개월은 "산 걸 한 달 안에 못 쓰면 몰수"라 구독의 월 소진과 성격이 다르고,
   *  큰 팩(350크레딧=약 22페이지)을 한 달에 소진하는 건 비현실적이라 상위 플랜이 안 팔린다.
   *  대신 팩이 커질수록 기간을 늘려 '상위 플랜 혜택'으로 쓰고, 작은 팩은 짧게 잡아 재구매를 유도한다. */
  validMonths: number;
}

/** ★전 플랜 공통 혜택(2026-07-30) — Flik은 기능을 플랜으로 잠그지 않는다.
 *  차이는 크레딧 수량과 크레딧당 단가뿐이므로, 공통 혜택은 카드 아래에 한 번만 정리해 보여준다.
 *  (기능 차등이 있는 것처럼 카드마다 다르게 적으면 허위 표시가 된다.) */
export const COMMON_BENEFITS: string[] = [
  '블로그형·슬라이드형·HTML형 전부 사용',
  '섹션당 첫 이미지 무료 포함',
  '카피·이미지 무료 재생성 (8섹션당 5회)',
  '카피 직접 수정 · 결과물 다운로드 무제한',
  '생성 실패 시 크레딧 자동 환불',
  '셀러가 입력하지 않은 정보는 만들지 않아요',
];

/* ── ★프로모션(2026-07-30) — 수수료 플랫폼·유료 광고를 쓰기 어려운 단계라 '기간 한정 특가'가
 *    사실상 유일한 유입 레버다. 다만 허위 할인 표시를 피하려면 다음 원칙을 지킨다:
 *      1) 실제로 판매한 적 없는 가격에 취소선·할인율을 붙이지 않는다(공정위 종전가격 기준).
 *      2) 대신 "지금 X원 · 언제부터 Y원" 형태의 '가격 조정 예고'로 표기한다 — 사실이고 시급성도 생긴다.
 *      3) 프로모션이 끝나 정가로 실제 판매한 이력이 쌓인 뒤에는, 그때부터 정식 할인 표시가 가능하다.
 *    endsAt은 표기용 문자열(자동 만료 로직 없음) — 날짜가 지나면 price를 listPrice로 올려야 한다. ── */
export interface Promo {
  /** 프로모션 진행 여부 — false면 정가(listPrice)로 표시·판매 */
  active: boolean;
  /** 배지 문구 */
  label: string;
  /** 종료 예정일 표기(예: '2026년 9월 1일') — 이 날부터 정가 적용 */
  changesOn: string;
}

export const PROMO: Promo = {
  active: true,
  label: '오픈 기념 특가',
  changesOn: '2026년 9월 1일',
};

/** 화면에 표시할 현재 판매가 — 프로모션 종료 시 정가로 자동 전환 */
export function currentPrice(plan: CreditPlan): number {
  return PROMO.active ? plan.price : plan.listPrice;
}

/** ★크레딧 소모량 안내(2026-08-01) — 출력형태별로 다르다(lib/pricing.ts creditPerSection).
 *  블로그형은 카피 2안을 다 만들고 본문이 길어 원가가 높아 섹션당 1.25크레딧이다. */
export const CREDIT_UNIT_NOTE = '블로그형 8섹션 = 10크레딧 · 슬라이드형 8섹션 = 8크레딧';

export const PLANS: CreditPlan[] = [
  {
    id: 'light',
    name: '라이트',
    nameEn: 'LIGHT',
    price: 9900,
    listPrice: 12900,
    credits: 20,
    validMonths: 1,
    tagline: '상세페이지 1개를 여유 있게',
  },
  {
    id: 'standard',
    name: '스탠다드',
    nameEn: 'STANDARD',
    price: 29000,
    listPrice: 39000,
    credits: 65,
    validMonths: 2,
    tagline: '상품 여러 개를 준비하는 셀러',
  },
  {
    id: 'pro',
    name: '프로',
    nameEn: 'PRO',
    price: 59000,
    listPrice: 79000,
    credits: 140,
    validMonths: 3,
    tagline: '정기적으로 신상품을 올리는 스토어',
    recommended: true,
  },
  {
    id: 'max',
    name: '맥스',
    nameEn: 'MAX',
    price: 119000,
    listPrice: 159000,
    credits: 305,
    validMonths: 6,
    tagline: '여러 스토어를 운영하거나 대량 등록하는 팀',
  },
];

/** 표시용 — 크레딧당 단가(원, 반올림) */
export function pricePerCredit(plan: CreditPlan): number {
  return Math.round(currentPrice(plan) / plan.credits);
}

/** 표시용 — 상세페이지 몇 장 분량인지(소수 1자리).
 *  기본은 블로그형 8섹션 = 10크레딧 기준(가장 많이 쓰는 조합). */
export function pagesPerPlan(plan: CreditPlan, creditsPerPage = 10): number {
  return Math.round((plan.credits / creditsPerPage) * 10) / 10;
}

/* ── ★상위 플랜의 '실제' 이득(2026-07-30) — 기능을 잠그지 않으므로 차등은 단가에서만 나온다.
 *    없는 혜택을 지어내지 않고, 기준 플랜(가장 작은 팩) 단가와 비교해 계산 가능한 값만 보여준다. ── */

/** 기준 플랜 = 크레딧당 단가가 가장 비싼(=가장 작은) 팩 */
function basePlan(): CreditPlan {
  return PLANS.reduce((a, b) => (pricePerCredit(a) >= pricePerCredit(b) ? a : b));
}

/** 기준 플랜 단가 대비 절약률(%) — 기준 플랜 자신은 0 */
export function savingRate(plan: CreditPlan): number {
  const base = pricePerCredit(basePlan());
  if (!base) return 0;
  return Math.round((1 - pricePerCredit(plan) / base) * 100);
}

/** 기준 플랜 단가로 같은 크레딧을 살 때보다 얼마 덜 내는지(원) */
export function savingAmount(plan: CreditPlan): number {
  const base = pricePerCredit(basePlan());
  return Math.max(0, Math.round(plan.credits * base - currentPrice(plan)));
}

/** 카드 혜택 줄 — pre + bold + post 순서로 렌더(강조 위치를 데이터가 결정) */
export interface PlanHighlight { pre?: string; bold: string; post?: string }

/** 상위 플랜은 하위 플랜 혜택을 포함(누적) — 올라갈수록 이득이 쌓이는 게 보이게 */
export function planHighlights(plan: CreditPlan): PlanHighlight[] {
  const idx = PLANS.findIndex(p => p.id === plan.id);
  const prev = idx > 0 ? PLANS[idx - 1] : null;
  const rate = savingRate(plan);
  const amount = savingAmount(plan);
  const rows: PlanHighlight[] = [
    { bold: `크레딧 ${plan.credits}개`, post: ' 지급' },
    { pre: '16섹션 페이지 ', bold: `약 ${pagesPerPlan(plan)}개` , post: ' 분량' },
    { pre: '크레딧당 ', bold: `${pricePerCredit(plan).toLocaleString('ko-KR')}원`, post: rate > 0 ? ` · ${rate}% 저렴` : '' },
  ];
  rows.push({ pre: '유효기간 ', bold: `${plan.validMonths}개월` });
  if (prev) rows.push({ bold: `${prev.nameEn} 플랜의 모든 혜택`, post: ' 포함' });
  if (amount > 0) rows.push({ pre: '낱개로 살 때보다 ', bold: `${amount.toLocaleString('ko-KR')}원 절약` });
  return rows;
}
