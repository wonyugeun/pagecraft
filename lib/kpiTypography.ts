/**
 * KPI Typography Library — KPI(특징 스트립)의 타이포그래피 스타일 사전.
 *
 * 기존 "아이콘 3개 + 설명" 템플릿을 전면 폐기 — 아이콘은 최대 '보조 마커' 수준까지만
 * 허용(enum에 아이콘 나열 개념 자체가 없음). 타이포가 주인공인 20종 스타일.
 *
 * 각 스타일은 다음 6속성만 정의: icon 사용 / font hierarchy / text emphasis /
 * divider / spacing / alignment. (id·name·description은 식별용)
 *
 * 타 라이브러리와 독립 — import 없음.
 * ⚠️현 단계는 데이터만: Prompt·imagebrief·Translator·GPT 미접촉.
 */

/* ── enum (전부 고정 union — 자유 텍스트 금지) ── */
export type KpiIconUsage = 'none' | 'tiny_dot_marker' | 'optional_line_icon';   // 큰 아이콘·아이콘 나열 없음
export type KpiFontHierarchy = 'single_level' | 'title_over_caption' | 'number_over_label' | 'label_over_detail';
export type KpiTextEmphasis =
  | 'regular' | 'bold_keyword' | 'numeric_bold' | 'thin_light'
  | 'all_small_caps' | 'uppercase_tracking' | 'monospace_clean' | 'italic_note';
export type KpiDividerUsage = 'none' | 'thin_vertical' | 'thin_horizontal' | 'dot_separator' | 'double_line';
export type KpiSpacing = 'tight' | 'comfortable' | 'airy' | 'extra_airy';
export type KpiAlignment = 'left' | 'center' | 'right' | 'justified_row' | 'vertical_stack';

export interface KpiTypographySpec {
  style_id: string;
  name: string;                      // 한국어 표시명
  description: string;              // 어떤 스타일이고 언제 쓰나 (한국어)
  icon_usage: KpiIconUsage;
  font_hierarchy: KpiFontHierarchy;
  text_emphasis: KpiTextEmphasis;
  divider_usage: KpiDividerUsage;
  spacing: KpiSpacing;
  alignment: KpiAlignment;
}

/** KPI Typography Library — 20종. 전부 6속성 조합이 서로 다름. */
export const KPI_TYPOGRAPHY_LIBRARY: KpiTypographySpec[] = [
  {
    style_id: 'editorial_label',
    name: '에디토리얼 라벨',
    description: '잡지 캡션처럼 — 타이틀+작은 설명, 트래킹 넓은 대문자.',
    icon_usage: 'none', font_hierarchy: 'title_over_caption', text_emphasis: 'uppercase_tracking',
    divider_usage: 'none', spacing: 'airy', alignment: 'left',
  },
  {
    style_id: 'minimal_bar',
    name: '미니멀 바',
    description: '가는 수평선 위 단층 텍스트 — 가장 절제된 기본형.',
    icon_usage: 'none', font_hierarchy: 'single_level', text_emphasis: 'regular',
    divider_usage: 'thin_horizontal', spacing: 'comfortable', alignment: 'center',
  },
  {
    style_id: 'luxury_footer',
    name: '럭셔리 푸터',
    description: '얇은 세로 구분선과 넓은 여백 — 하이엔드 브랜드 하단.',
    icon_usage: 'none', font_hierarchy: 'label_over_detail', text_emphasis: 'thin_light',
    divider_usage: 'thin_vertical', spacing: 'extra_airy', alignment: 'center',
  },
  {
    style_id: 'clinical_tag',
    name: '클리니컬 태그',
    description: '정갈한 좌측 정렬 라벨+세부 — 더마·기능성의 신뢰 태그.',
    icon_usage: 'none', font_hierarchy: 'label_over_detail', text_emphasis: 'regular',
    divider_usage: 'thin_horizontal', spacing: 'comfortable', alignment: 'left',
  },
  {
    style_id: 'small_caps',
    name: '스몰 캡스',
    description: '전부 스몰캡 단층 — 조용하지만 격식 있는 표기.',
    icon_usage: 'none', font_hierarchy: 'single_level', text_emphasis: 'all_small_caps',
    divider_usage: 'none', spacing: 'comfortable', alignment: 'center',
  },
  {
    style_id: 'micro_copy',
    name: '마이크로 카피',
    description: '아주 작고 가는 한 줄 — 존재감을 죽인 최소 표기.',
    icon_usage: 'none', font_hierarchy: 'single_level', text_emphasis: 'thin_light',
    divider_usage: 'none', spacing: 'tight', alignment: 'left',
  },
  {
    style_id: 'thin_divider',
    name: '씬 디바이더',
    description: '가는 세로선으로 항목을 가르는 한 줄 나열형.',
    icon_usage: 'none', font_hierarchy: 'single_level', text_emphasis: 'regular',
    divider_usage: 'thin_vertical', spacing: 'comfortable', alignment: 'justified_row',
  },
  {
    style_id: 'number_focus',
    name: '넘버 포커스',
    description: '숫자를 크게, 라벨을 작게 — 수치가 주인공인 표기.',
    icon_usage: 'none', font_hierarchy: 'number_over_label', text_emphasis: 'numeric_bold',
    divider_usage: 'none', spacing: 'comfortable', alignment: 'center',
  },
  {
    style_id: 'ingredient_label',
    name: '성분 라벨',
    description: '작은 점 마커+점 구분자 — 성분 표기 특화.',
    icon_usage: 'tiny_dot_marker', font_hierarchy: 'label_over_detail', text_emphasis: 'regular',
    divider_usage: 'dot_separator', spacing: 'comfortable', alignment: 'left',
  },
  {
    style_id: 'premium_chip',
    name: '프리미엄 칩',
    description: '키워드만 볼드로 띄운 여백형 칩 — 테두리 없는 강조.',
    icon_usage: 'none', font_hierarchy: 'single_level', text_emphasis: 'bold_keyword',
    divider_usage: 'none', spacing: 'airy', alignment: 'center',
  },
  {
    style_id: 'mono_label',
    name: '모노 라벨',
    description: '모노스페이스 느낌의 좁은 라벨 — 테크·성분코드 무드.',
    icon_usage: 'none', font_hierarchy: 'single_level', text_emphasis: 'monospace_clean',
    divider_usage: 'none', spacing: 'tight', alignment: 'left',
  },
  {
    style_id: 'beauty_footer',
    name: '뷰티 푸터',
    description: '조건부 라인 아이콘+타이틀·캡션 — 뷰티 광고 하단 표준.',
    icon_usage: 'optional_line_icon', font_hierarchy: 'title_over_caption', text_emphasis: 'regular',
    divider_usage: 'thin_vertical', spacing: 'airy', alignment: 'center',
  },
  {
    style_id: 'soft_badge',
    name: '소프트 배지',
    description: '가늘고 옅은 단어 배지 — 테두리·채움 없는 부드러운 표기.',
    icon_usage: 'none', font_hierarchy: 'single_level', text_emphasis: 'thin_light',
    divider_usage: 'none', spacing: 'airy', alignment: 'center',
  },
  {
    style_id: 'floating_caption',
    name: '플로팅 캡션',
    description: '오른쪽에 떠 있는 가벼운 캡션 — 사진 위 최소 개입.',
    icon_usage: 'none', font_hierarchy: 'single_level', text_emphasis: 'thin_light',
    divider_usage: 'none', spacing: 'extra_airy', alignment: 'right',
  },
  {
    style_id: 'vertical_label',
    name: '버티컬 라벨',
    description: '세로로 쌓인 대문자 라벨 — 에디토리얼 레일용.',
    icon_usage: 'none', font_hierarchy: 'single_level', text_emphasis: 'uppercase_tracking',
    divider_usage: 'none', spacing: 'airy', alignment: 'vertical_stack',
  },
  {
    style_id: 'double_line',
    name: '더블 라인',
    description: '위아래 이중 괘선 사이 타이틀·캡션 — 클래식 인쇄 무드.',
    icon_usage: 'none', font_hierarchy: 'title_over_caption', text_emphasis: 'regular',
    divider_usage: 'double_line', spacing: 'comfortable', alignment: 'center',
  },
  {
    style_id: 'mini_spec',
    name: '미니 스펙',
    description: '점 마커+숫자 강조의 촘촘한 스펙 표기 — 용량·함량용.',
    icon_usage: 'tiny_dot_marker', font_hierarchy: 'number_over_label', text_emphasis: 'numeric_bold',
    divider_usage: 'dot_separator', spacing: 'tight', alignment: 'left',
  },
  {
    style_id: 'footer_strip',
    name: '푸터 스트립',
    description: '가로 전폭 균등 배치 — 항목이 나란한 하단 스트립.',
    icon_usage: 'optional_line_icon', font_hierarchy: 'label_over_detail', text_emphasis: 'regular',
    divider_usage: 'thin_vertical', spacing: 'comfortable', alignment: 'justified_row',
  },
  {
    style_id: 'data_label',
    name: '데이터 라벨',
    description: '우측 정렬 숫자+라벨, 가는 밑선 — 계기판이 아닌 서류 느낌.',
    icon_usage: 'none', font_hierarchy: 'number_over_label', text_emphasis: 'numeric_bold',
    divider_usage: 'thin_horizontal', spacing: 'tight', alignment: 'right',
  },
  {
    style_id: 'magazine_note',
    name: '매거진 노트',
    description: '이탤릭 노트 한 줄 — 편집자의 짧은 메모 같은 표기.',
    icon_usage: 'none', font_hierarchy: 'single_level', text_emphasis: 'italic_note',
    divider_usage: 'none', spacing: 'airy', alignment: 'left',
  },
];
