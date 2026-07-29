/**
 * 사업자 정보 — 단일 소스(2026-07-29).
 *
 * ★PG(카드사) 심사 요건: 홈페이지 하단에 사업자등록증과 '동일하게'
 *   사업자번호 / 상호명 / 사업장 주소 / 대표자명 / 유선전화 를 모두 표기해야 하며,
 *   하나라도 다르거나 빠지면 심사 반송된다.
 *
 * ★여기만 채우면 푸터·이용약관·개인정보처리방침에 한 번에 반영된다.
 *   값이 빈 문자열이면 푸터에 '미기재'가 눈에 띄게 표시되어 실수로 비워둔 채
 *   심사에 넣는 사고를 막는다(오픈 전 반드시 채울 것).
 */
export interface BusinessInfo {
  /** 상호명 — 사업자등록증의 '상호' 그대로 */
  companyName: string;
  /** 대표자명 — 사업자등록증의 '성명' 그대로 */
  ceo: string;
  /** 사업자등록번호 — 000-00-00000 형식 */
  regNumber: string;
  /** 사업장 주소 — 사업자등록증의 '사업장 소재지' 그대로(상세주소 포함) */
  address: string;
  /** 유선전화 — 카드사 심사 요건상 휴대폰이 아닌 유선번호 권장 (예: 02-000-0000) */
  phone: string;
  /** 통신판매업 신고번호 — 예: 제2026-서울강남-00000호 (신고 후 기재) */
  mailOrderNumber: string;
  /** 고객문의 이메일 */
  email: string;
  /** 개인정보 보호책임자 */
  privacyOfficer: string;
}

export const BUSINESS: BusinessInfo = {
  companyName: '',
  ceo: '',
  regNumber: '',
  address: '',
  phone: '',
  mailOrderNumber: '',
  email: '',
  privacyOfficer: '',
};

/** 표기용 — 빈 값은 심사 반송 사유라 눈에 띄게 표시 */
export function biz(value: string): string {
  return value.trim() || '[미기재]';
}

/** 필수 항목이 모두 채워졌는지(오픈 전 점검용) */
export function isBusinessInfoComplete(): boolean {
  return [BUSINESS.companyName, BUSINESS.ceo, BUSINESS.regNumber, BUSINESS.address, BUSINESS.phone]
    .every(v => v.trim().length > 0);
}
