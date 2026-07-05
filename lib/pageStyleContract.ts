/**
 * Page Style Contract — 상세페이지 1권의 시각 언어를 페이지 시작 시 1회 결정하는 계약.
 *
 * 배경: 히어로 KPI 라운드(테스트1~7)로 확정한 "존 골격"(% 존 5단·그라데이션 연결·록업·워시)은
 * 모든 스타일이 공유하고, 스타일별로 달라지는 건 속성값(아이콘 처리·타이포·구분선·배경 톤)뿐.
 * 이 파일은 그 속성값을 프롬프트 조각(영문, {accent} 플레이스홀더)으로 정의한다.
 *  - preset[0] derma_clean = 테스트7로 검증 완료된 1번 스타일 — 문구를 그대로 보존(회귀 금지).
 *  - 선택은 결정적 채점(카테고리 +3 / 무드 키워드 +2 / 채널 +1, 동점 → 순서). 랜덤 금지.
 *  - 전 섹션이 같은 계약을 상속 → 32섹션이 한 권처럼. 섹션별 '내용' 다양성은 archetype/scene 담당.
 *
 * ⚠️날조 가드는 계약과 무관하게 slideBaked의 숫자 게이트가 전 스타일 공통 적용.
 */

export interface PageStyleContract {
  style_id: string;
  name: string;                 // 한국어 표시명
  description: string;          // 언제 쓰는 스타일인지(한국어)
  /* ── 프롬프트 조각(영문) — slideBaked 존 골격의 빈칸에 그대로 꽂힌다. {accent} 치환. ── */
  wash: string;                 // 전체 배경 톤 문장
  transition: string;           // 사진 존 → 하단 존 연결 문장
  title_type: string;           // 한글 제품명 서체 묘사(록업 1행)
  strip_layout: string;         // 스트립 열 배치·구분선 문장 도입부
  item_stack: string;           // 항목 1개의 시각 스택(아이콘·키워드·서브노트 위계)
  numeric_emphasis: string;     // 수치 키워드 강조({label} 치환 — 게이트 통과분만)
  design_tail: string;          // 말미 Design style 키워드 블록
  /* ── 선택 가중치 ── */
  affinity: {
    categories: string[];       // CategoryScreen id 기준(화장품/식품/패션/생활/가전/반려동물/스포츠/유아/자동차/건강/기타)
    keywords: string[];         // productName+productExtra 텍스트에서 찾는 무드 단서
    channels: string[];
  };
}

/** 조각의 {accent}/{label} 치환 — 계약 데이터는 순수 문자열로 유지(직렬화·테스트 용이). */
export function fillFragment(fragment: string, vars: { accent: string; label?: string }): string {
  return fragment.replaceAll('{accent}', vars.accent).replaceAll('{label}', vars.label ?? '');
}

/** 스타일 4종 — [0] = 검증 완료 프리셋(derma_clean). 추가 스타일은 뒤에 append(순서 = 동점 우선순위). */
export const STYLE_PRESETS: PageStyleContract[] = [
  {
    style_id: 'derma_clean',
    name: '더마 클린',
    description: '메디힐식 클린 더마 — 뮤트 채움 원 아이콘 + 볼드 키워드 + 옅은 워시. 스킨케어·건강·유아 기본.',
    wash:
      `Overall tone: the whole poster sits on a barely-there airy wash of {accent} — only a few percent strength, just perceptible — evenly unifying every zone into one atmosphere; NOT pure stark white, and NEVER a strong saturated color block or band anywhere.`,
    transition:
      `It must dissolve downward into the pale zone below through a soft, gradual gradient fade — NO hard horizontal border, NO visible cut line, NO separately attached panel; the whole poster reads as ONE continuous advertisement.`,
    title_type: `refined medium-weight type`,
    strip_layout: `items in equal-width columns with thin vertical dividers`,
    item_stack:
      `Each item, top to bottom: a small circle SOLIDLY FILLED with a soft muted tone of {accent} (gently desaturated, harmonized with the photo — NEVER a vivid saturated pure color) containing a simple feature icon drawn in clean white line style that matches the keyword's meaning (e.g. leaf, droplet, skin-layer); the Korean keyword in BOLD near-black type; a much smaller, lighter grey sub-note beneath it.`,
    numeric_emphasis:
      `Only the numeric keyword "{label}" may use the same muted tone of {accent} so the number catches the eye.`,
    design_tail:
      `Design style: minimal, premium, clean, high-end Korean beauty advertising — no clutter, no random badges, no messy text blocks, no comparison tables.`,
    affinity: { categories: ['화장품', '건강', '유아'], keywords: ['더마', '진정', '저자극', '민감'], channels: [] },
  },
  {
    style_id: 'luxury_editorial',
    name: '럭셔리 에디토리얼',
    description: '하이엔드 무드 — 아이콘 없이 타이포와 여백만, 가는 레터스페이스. 프리미엄·선물·패션.',
    wash:
      `Overall tone: the whole poster sits on a deep, quiet tonal atmosphere drawn from {accent} — a muted, desaturated luxury tone with soft vignetting, never bright, never busy; every zone shares this one hushed atmosphere.`,
    transition:
      `It must melt downward into the quiet zone below through a soft tonal fade and generous empty space — NO hard horizontal border, NO attached panel; the whole poster reads as ONE continuous editorial page.`,
    title_type: `elegant thin type with wide letter-spacing`,
    strip_layout: `items in equal-width columns separated only by hairline vertical rules and generous empty space`,
    item_stack:
      `Each item is a pure typography stack — NO icons at all: the Korean keyword in refined THIN light type with wide letter-spacing, in a pale tone that stands quietly on the dark background; a much smaller, even lighter sub-note beneath it.`,
    numeric_emphasis:
      `Only the numeric keyword "{label}" may be set slightly larger in a warm highlight tone of {accent} so the number reads first, still understated.`,
    design_tail:
      `Design style: high-end luxury editorial, vast negative space, hushed and expensive — like a prestige beauty or fashion campaign; no clutter, no badges, no boxes, no infographic elements.`,
    affinity: { categories: ['패션'], keywords: ['프리미엄', '럭셔리', '명품', '선물', '골드', '블랙', '한정판'], channels: [] },
  },
  {
    style_id: 'fresh_vivid',
    name: '프레시 비비드',
    description: '식품·활력 무드 — 크고 선명한 컬러 아이콘 + 임팩트 키워드 + 밝은 워시. 식품·펫·스포츠.',
    wash:
      `Overall tone: the whole poster sits on a bright, appetizing airy wash of {accent} — light and fresh (still pale, around ten percent strength), evenly unifying every zone; clean and energetic, never murky, never neon.`,
    transition:
      `It must blend downward into the bright zone below through a soft gradient fade — NO hard horizontal border, NO attached panel; the whole poster reads as ONE continuous advertisement.`,
    title_type: `friendly rounded bold type`,
    strip_layout: `items in equal-width columns with clean thin vertical dividers`,
    item_stack:
      `Each item, top to bottom: a generous circle filled with a fresh, appetizing tone of {accent} containing a bold white icon that matches the keyword's meaning (e.g. wheat, flame, snowflake, paw); the Korean keyword in THICK impactful near-black type; a smaller grey sub-note beneath it.`,
    numeric_emphasis:
      `Only the numeric keyword "{label}" may pop in a stronger tone of {accent} so the number reads first.`,
    design_tail:
      `Design style: fresh, appetizing, energetic Korean commerce advertising — vivid but organized; no clutter, no random badges, no messy text blocks, no comparison tables.`,
    affinity: { categories: ['식품', '반려동물', '스포츠'], keywords: ['신선', '산지직송', '당일', '국내산', '유기농'], channels: [] },
  },
  {
    style_id: 'tech_minimal',
    name: '테크 미니멀',
    description: '스펙·기능 무드 — 원 없이 가는 라인 아이콘 + 뉴트럴 그레이 톤. 가전·자동차·생활.',
    wash:
      `Overall tone: the whole poster sits on a cool, neutral near-white tone with the faintest trace of {accent} — precise and technical, evenly unifying every zone; no warm cast, no decorative color fields.`,
    transition:
      `It must transition downward into the clean zone below through a subtle fade and disciplined empty space — NO hard horizontal border, NO attached panel; the whole poster reads as ONE continuous product page.`,
    title_type: `precise medium-weight geometric type`,
    strip_layout: `items in equal-width columns on a strict grid with hairline vertical dividers`,
    item_stack:
      `Each item, top to bottom: a minimal thin-line icon drawn in {accent} with NO enclosing circle and NO fill (a precise engineering-style glyph matching the keyword's meaning); the Korean keyword in clean MEDIUM-BOLD near-black type; a smaller cool-grey sub-note beneath it.`,
    numeric_emphasis:
      `Only the numeric keyword "{label}" may be set in {accent} so the spec number reads first.`,
    design_tail:
      `Design style: precise, minimal, engineered — like a premium tech product page; strict alignment, no clutter, no badges, no boxes, no infographic decoration.`,
    affinity: { categories: ['가전', '자동차', '생활'], keywords: ['스펙', '무선', '스마트', '휴대용', '스테인리스'], channels: [] },
  },
];

export interface StyleSelectInput {
  category?: string;   // 스토어 cat(카테고리 id)
  channel?: string;
  moodText?: string;   // productName + productExtra 결합 텍스트(무드 단서 탐색)
}

/**
 * 페이지 스타일 계약 선택 — 결정적 채점(카테고리 +3 / 무드 키워드 각 +2 / 채널 +1).
 * 동점 → STYLE_PRESETS 순서(= derma_clean이 최종 폴백). 랜덤 금지.
 */
export function selectPageStyle(input: StyleSelectInput = {}): PageStyleContract {
  const cat = (input.category ?? '').split('/')[0].trim();
  const ch = (input.channel ?? '').trim();
  const mood = (input.moodText ?? '').toLowerCase();

  let best = STYLE_PRESETS[0];
  let bestScore = -1;
  for (const s of STYLE_PRESETS) {
    let score = 0;
    if (cat && s.affinity.categories.includes(cat)) score += 3;
    for (const k of s.affinity.keywords) {
      if (mood.includes(k.toLowerCase())) score += 2;
    }
    if (ch && s.affinity.channels.includes(ch)) score += 1;
    if (score > bestScore) { best = s; bestScore = score; }
  }
  return best;
}
