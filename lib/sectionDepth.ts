// 카테고리별 섹션 수 기준 (간결=기본형 / 풍부=프리미엄형) — ★단일 소스.
// recommend-sections(실제 생성)와 타입 화면(예시 개수 표시)이 이 값을 함께 사용 → 미리보기 = 실제 생성 개수.
// 값 변경 시 양쪽에 동시 반영됨(드리프트 방지).
export const DEPTH_BASE: Record<string, { 간결: number; 풍부: number }> = {
  화장품:   { 간결: 16, 풍부: 32 },
  식품:     { 간결: 14, 풍부: 28 },
  패션:     { 간결: 14, 풍부: 26 },
  생활:     { 간결: 12, 풍부: 24 },
  가전:     { 간결: 16, 풍부: 30 },
  반려동물: { 간결: 14, 풍부: 26 },
  스포츠:   { 간결: 14, 풍부: 26 },
  유아:     { 간결: 16, 풍부: 30 },
  자동차:   { 간결: 12, 풍부: 22 },
  건강:     { 간결: 16, 풍부: 32 },
  기타:     { 간결: 12, 풍부: 24 },
};

// 타입(기본형/프리미엄형)별 기준 섹션 수. cat이 없거나 미정의(기타 등)면 '기타' 기준값.
// (채널 가중치는 실제 생성 시 곱해짐 — 미리보기는 카테고리 기준값을 '약 N개'로 표시)
export function baseSectionCount(cat: string | null | undefined, isPremium: boolean): number {
  const key = cat?.split('/')[0]?.trim() ?? '';
  const row = DEPTH_BASE[key] ?? DEPTH_BASE['기타'];
  return isPremium ? row.풍부 : row.간결;
}
