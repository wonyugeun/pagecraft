/**
 * 섹션 역할별 이미지 생성 비율 매핑.
 *
 * Section.name(한국어 라벨)을 우선 매칭, 미스 시 blockType으로 보조 판단.
 * 9:16(세로 긴 비율)은 절대 반환하지 않음 — 세로형 남발 방지.
 *
 * 반환값은 Gemini API의 generationConfig.imageConfig.aspectRatio 포맷("4:5", "16:9", "1:1").
 * CSS aspect-ratio 변환은 toCssAspectRatio()로.
 */

export type ImageAspect = '4:5' | '16:9' | '1:1';

/** Gemini의 "4:5" → CSS의 "4/5" */
export function toCssAspectRatio(a: string): string {
  return a.replace(':', '/');
}

const HERO_KEYS = ['히어로', '메인', '후킹', 'cta', '구매', '마무리'];
const SQUARE_KEYS = [
  '성분', '비교', '인증', '스펙', '통계', '수치', '효능', '함량',
  '안전', '원료', '소재', '기술', '효과 수치', '인포그래픽', '신뢰',
];
const WIDE_KEYS = [
  '사용', '효과', 'before', 'after', '비포', '애프터',
  '공감', '고민', '시나리오', '활용', '연출', '코디', '레시피',
  '스토리', '브랜드', '세계관', '감성', '공간', '제형', '텍스처',
];

const HERO_BLOCK_TYPES = new Set(['hero', 'cta']);
const SQUARE_BLOCK_TYPES = new Set(['iconcards', 'stats', 'compare']);
const WIDE_BLOCK_TYPES = new Set(['steps', 'paragraph', 'checklist', 'quote']);

function matchByKeywords(name: string, keys: string[]): boolean {
  const lower = name.toLowerCase();
  return keys.some(k => lower.includes(k.toLowerCase()));
}

export function aspectRatioFor(sectionName?: string, blockType?: string, out?: string): ImageAspect {
  // ★슬라이드형: 카드 스택이 한 세트로 보이도록 전 섹션 4:5 고정(크기 제각각 방지). 블로그·기타는 기존 로직.
  if (out === 'slide') return '4:5';

  const name = (sectionName ?? '').trim();

  if (name) {
    if (matchByKeywords(name, HERO_KEYS))   return '4:5';
    if (matchByKeywords(name, SQUARE_KEYS)) return '1:1';
    if (matchByKeywords(name, WIDE_KEYS))   return '16:9';
  }

  if (blockType) {
    if (HERO_BLOCK_TYPES.has(blockType))   return '4:5';
    if (SQUARE_BLOCK_TYPES.has(blockType)) return '1:1';
    if (WIDE_BLOCK_TYPES.has(blockType))   return '16:9';
  }

  return '1:1';
}
