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

/* ★슬라이드형 비율(2026-08-01 개편) — 이전엔 전 섹션 4:5 고정이었다.
 *  "카드 스택이 한 세트로 보이게"가 이유였지만, 스마트스토어 상세페이지는 이미지가 세로로
 *  이어지는 형태라 높이가 조금 달라도 제각각으로 보이기보다 리듬으로 읽힌다(유근님 지적).
 *
 *  ⚠️단 슬라이드는 텍스트가 이미지에 박혀 나온다(baked). 그래서 가로형(16:9)은 쓰지 않는다 —
 *    세로 여백이 부족해 한글 헤드라인이 눌리거나 잘린다. 4:5와 1:1만 허용한다.
 *
 *  1:1은 정보 밀도가 높고 카피가 짧은 섹션(성분·스펙·비교·수치)에만 준다.
 *  히어로·CTA·감성 컷은 4:5를 유지해 페이지의 뼈대를 잡는다.
 *  부수 효과로 원가도 내려간다(1024x1536 135원 → 1024x1024 90원). */
/** 정보형(팩트를 늘어놓는) 섹션 — 정사각이 어울리고 카피도 짧다 */
const SLIDE_SQUARE_KEYS = [
  '성분', '비교', '스펙', '수치', '통계', '함량', '인증', '원료', '구성', '가격', '옵션',
  '신뢰', '안심', '무첨가', '검증', '안전', 'faq', 'q&a', '반론', '보관', '배송', '주의',
];
/** 페이지의 뼈대 — 첫 컷과 마지막 컷은 항상 세로로 크게 잡아 시작·끝을 분명히 한다 */
const SLIDE_TALL_KEYS = ['히어로', 'hero', 'cta', '구매 유도', '구매유도', '마무리'];

export function aspectRatioFor(sectionName?: string, blockType?: string, out?: string): ImageAspect {
  const name = (sectionName ?? '').trim();

  if (out === 'slide') {
    // 골격(히어로·CTA)이 먼저 — 이름에 '안심·신뢰'가 섞여 있어도 뼈대는 4:5를 유지한다.
    if (name && matchByKeywords(name, SLIDE_TALL_KEYS))   return '4:5';
    if (name && matchByKeywords(name, SLIDE_SQUARE_KEYS)) return '1:1';
    if (blockType && SQUARE_BLOCK_TYPES.has(blockType))   return '1:1';
    return '4:5';
  }


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
