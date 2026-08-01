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

/* ★페이지 단위 리듬 보정(2026-08-01) — 섹션별 키워드 분류만으로는 큰 페이지에서 무너진다.
 *  실측: 32섹션 블로그는 1:1이 22개(최장 9연속), 32섹션 슬라이드는 4:5가 7연속.
 *  섹션 이름이 '성분·근거·스펙…'처럼 한 계열로 몰리면 같은 비율이 줄줄이 이어져
 *  리듬이 아니라 단조로움이 된다. 그래서 분류한 뒤 '같은 비율 연속'을 끊어준다.
 *
 *  ⚠️의미는 최대한 보존한다 — 첫 섹션(히어로)과 마지막(CTA)은 페이지의 뼈대라 절대 바꾸지 않고,
 *    바꿀 때도 같은 성격의 짝으로만 바꾼다(블로그 1:1↔16:9, 슬라이드 1:1↔4:5). */
const MAX_SAME_RUN = 3;

function partnerAspect(a: ImageAspect, out?: string): ImageAspect {
  if (out === 'slide') return a === '4:5' ? '1:1' : '4:5';   // 슬라이드는 16:9 금지(baked 텍스트)
  if (a === '1:1')  return '16:9';
  if (a === '16:9') return '1:1';
  return '1:1';                                              // 4:5가 길게 이어지면 정사각으로 끊는다
}

const VALID: ImageAspect[] = ['4:5', '16:9', '1:1'];

/**
 * ★모델이 고른 비율을 받아 '하지 말아야 할 것'만 교정한다(2026-08-01).
 *
 *  왜 코드가 정하지 않는가: 섹션 이름 키워드로 비율을 못 박으면 상품이 뭐든 같은 결과가 나온다.
 *  같은 '성분' 섹션이라도 원료 클로즈업이면 정사각, 원료가 놓인 풍경이면 가로가 맞다.
 *  그건 장면을 설계한 아트디렉터(모델)만 안다 — 그래서 선택은 모델에게 맡긴다.
 *
 *  코드가 지키는 건 모델이 알 수 없는 두 가지뿐이다:
 *   1) 슬라이드는 텍스트가 이미지에 박히므로 가로형(16:9) 금지 — 한글 헤드라인이 눌린다.
 *   2) 같은 비율 4개 이상 연속 금지 — 청크가 병렬이라 모델은 페이지 전체를 못 본다.
 *
 *  @param chosen 모델이 섹션별로 고른 비율(빈 값·오타는 fallback으로 대체)
 *  @param fallback 모델 응답이 없을 때 쓸 기본값(aspectRatioFor 결과)
 */
export function normalizeAspectsForPage(
  chosen: Array<string | undefined>, fallback: ImageAspect[], out?: string,
): ImageAspect[] {
  const base: ImageAspect[] = chosen.map((c, i) => {
    let a = VALID.includes(c as ImageAspect) ? (c as ImageAspect) : fallback[i];
    if (out === 'slide' && a === '16:9') a = '4:5';   // baked 텍스트 자리 확보
    return a;
  });
  const last = base.length - 1;
  let run = 1;
  for (let i = 1; i < base.length; i++) {
    if (base[i] !== base[i - 1]) { run = 1; continue; }
    run++;
    if (run <= MAX_SAME_RUN) continue;
    // 히어로(0)·CTA(마지막)는 페이지의 뼈대라 바꾸지 않는다.
    // 마지막에서 걸리면 대신 바로 앞 섹션을 끊어준다 — 안 그러면 끝부분만 4연속으로 남는다.
    const target = i === last ? i - 1 : i;
    if (target <= 0 || target === last) continue;
    base[target] = partnerAspect(base[target], out);
    run = 1;
  }
  return base;
}

export function aspectRatioFor(sectionName?: string, blockType?: string, out?: string): ImageAspect {
  const name = (sectionName ?? '').trim();

  /* ⚠️여기서 반환하는 값은 '모델이 답을 안 줬을 때의 폴백'일 뿐이다(normalizeAspectsForPage 참고).
   *  슬라이드는 텍스트가 이미지에 박히므로 가로형을 쓰지 않는다 — 그 제약만 지키고
   *  어떤 컷이 정사각이 맞는지는 장면을 아는 쪽이 정한다(키워드 표로 못 박지 않는다). */
  if (out === 'slide') {
    if (blockType && SQUARE_BLOCK_TYPES.has(blockType)) return '1:1';
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
