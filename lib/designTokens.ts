/**
 * 디자인 토큰 — 앱 UI의 시각 값 단일 소스(2026-07-30).
 *
 * ★배경: inline style로 그때그때 만들다 보니 borderRadius 19종·fontSize 32종·boxShadow 38종이
 *   누적됐다. 거의 같은 값들이 미묘하게 어긋나며 "정돈 안 된 느낌"을 만든다.
 *   새 코드는 반드시 이 토큰만 쓰고, 기존 화면은 점진적으로 치환한다.
 *
 * ★적용 범위: 앱 UI(화면 크롬)만. 셀러 결과물(상세페이지 카피·블록·내보내기 HTML)은
 *   제품별 visual 팔레트를 따르므로 여기 토큰을 적용하지 않는다.
 */

/** 모서리 — 5단계. 칩/작은 배지는 pill, 카드는 md~lg */
export const R = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
} as const;

/** 글자 크기 — 8단계. 0.5px 단위 남발 금지 */
export const FS = {
  xs: 11,    // 배지·보조 라벨
  sm: 12,    // 힌트·캡션
  md: 13,    // 본문 보조
  base: 14,  // 기본 본문·버튼
  lg: 15,    // 카드 제목
  xl: 17,    // 섹션 소제목
  h2: 20,    // 화면 내 제목
  h1: 28,    // 화면 타이틀(StepHeader)
} as const;

/** 그림자 — 3단계. 그 외 값 금지 */
export const SHADOW = {
  /** 카드 기본 — 거의 안 보이는 정도 */
  card: '0 1px 3px rgba(17,17,26,0.04)',
  /** 떠 있는 요소(hover·선택) */
  raised: '0 4px 14px rgba(17,17,26,0.08)',
  /** 모달·오버레이 */
  overlay: '0 20px 60px rgba(17,17,26,0.25)',
} as const;

/** 중립색 — 4단계로 통일(#ECECF2/#E5E7EB/#F3F4F6/#EDEBF5 난립 해소) */
export const NEUTRAL = {
  /** 카드 테두리 */
  border: '#ECECF2',
  /** 옅은 배경(입력 비활성·보조 영역) */
  surface: '#FAFAFC',
  /** 보조 텍스트 */
  textSub: '#8B95A1',
  /** 본문 텍스트 */
  text: '#4E5968',
  /** 제목 텍스트 */
  textStrong: '#191F28',
} as const;

/** 브랜드 색 — globals.css의 --ac와 동일 값(이원화 금지) */
export const BRAND = {
  primary: '#6D4CFF',
  primaryHover: '#5A3BF0',
  soft: '#F4F0FF',
  softBorder: '#E6DEFF',
  onSoft: '#5B3FD6',
} as const;

/** 아이콘 크기 — 옆 글자 크기에 맞춘 3단계 */
export const ICON = {
  sm: 14,
  md: 16,
  lg: 20,
} as const;
