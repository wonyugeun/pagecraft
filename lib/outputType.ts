export type OutputType = 'blog' | 'slide' | 'html';

export function resolveOutputType(ch: string | null, out: string | null): OutputType {
  if (ch === '쿠팡') return 'slide';
  if (ch === '자사몰' || ch === '와디즈') return 'html';
  return (out as OutputType) || 'blog';
}

export const OUTPUT_TYPE_LABEL: Record<OutputType, string> = {
  blog:  '블로그형 (글+그림)',
  slide: '이미지 슬라이드형',
  html:  'HTML 섹션형',
};

const SLIDE_KEYWORDS = ['슬라이드', '카드형', '이미지카드', '상품카드', 'slide'];

export function inferOutFromSections(sections: string[]): OutputType | null {
  const joined = sections.join(' ');
  if (SLIDE_KEYWORDS.some(k => joined.includes(k))) return 'slide';
  if (sections.length >= 4) return 'blog';
  return null;
}
