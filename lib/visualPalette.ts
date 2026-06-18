/**
 * 결과물(상세페이지 내용) 색상 큐레이션 팔레트.
 *
 * 촌스러움 방지: AI가 hex를 자유 생성하지 않는다. Stage1은 아래 팔레트 "키"만 고르고,
 * 실제 hex는 여기 정의된 디자이너 큐레이션 세트에서 코드가 채운다.
 *
 * ⚠️ Flik UI(네비·진행바·버튼)는 항상 브랜드 보라(#6D4CFF) 유지 — 이 팔레트는 결과물 내용 전용.
 * purple 팔레트가 브랜드색과 동일하며, 색 정보가 없는 구버전 데이터의 폴백이기도 하다.
 */

export interface PaletteSet {
  primary: string;     // 메인 강조(체크·아이콘·KPI 숫자·비교표 헤더 등)
  accent: string;      // 보조 강조(별점 등)
  soft: string;        // 연한 배경(아이콘카드·인용 박스 등)
  softBorder: string;  // 연한 보더
}

export const PALETTES = {
  green:  { primary: '#2F9E6E', accent: '#5FBF8F', soft: '#E8F6EF', softBorder: '#C9EAD8' }, // 병풀·자연·진정
  blue:   { primary: '#2D7FC4', accent: '#5BA3D9', soft: '#E7F1FA', softBorder: '#C5DEF2' }, // 청량·수분·기술
  yellow: { primary: '#E0900F', accent: '#F4B445', soft: '#FCF3E1', softBorder: '#F3DFB4' }, // 비타민·활력
  pink:   { primary: '#D85B8E', accent: '#EE94B6', soft: '#FBEAF1', softBorder: '#F4CADB' }, // 뷰티·부드러움
  brown:  { primary: '#A9763F', accent: '#C49A6C', soft: '#F3EADD', softBorder: '#E2CDB0' }, // 내추럴·따뜻
  purple: { primary: '#6D4CFF', accent: '#9B7BFF', soft: '#F4F0FF', softBorder: '#E6DEFF' }, // 프리미엄(브랜드·폴백)
  gray:   { primary: '#4B5563', accent: '#7B8595', soft: '#EEF1F4', softBorder: '#D5DBE2' }, // 미니멀
} as const satisfies Record<string, PaletteSet>;

export type PaletteKey = keyof typeof PALETTES;

export const PALETTE_KEYS = Object.keys(PALETTES) as PaletteKey[];
export const DEFAULT_PALETTE: PaletteKey = 'purple';

/** 결과물에 실리는 비주얼 정보 — 색 hex는 모두 큐레이션 팔레트에서 온 값(AI 자유 생성 아님) */
export interface Visual {
  palette: PaletteKey;
  mood: string;
  primary_color: string;
  accent_color: string;
  soft_color: string;
  soft_border: string;
}

/** Stage1이 고른 palette 키 + mood로 결과 Visual 구성(유효하지 않으면 purple 폴백) */
export function resolveVisual(paletteKey: unknown, mood: unknown): Visual {
  const key: PaletteKey = (typeof paletteKey === 'string' && (PALETTE_KEYS as string[]).includes(paletteKey))
    ? paletteKey as PaletteKey
    : DEFAULT_PALETTE;
  const p = PALETTES[key];
  return {
    palette: key,
    mood: typeof mood === 'string' ? mood : '',
    primary_color: p.primary,
    accent_color: p.accent,
    soft_color: p.soft,
    soft_border: p.softBorder,
  };
}
