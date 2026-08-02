/**
 * 섹션 추가 목록의 묶음(2026-08-02).
 *
 * ★왜 묶나: 62개를 알약 모양 칩으로 한 줄에 흘려놓으니 이름만 빽빽해서, 셀러가
 *   무엇을 넣어야 할지 판단할 수가 없었다. 고르는 화면인데 고를 근거가 없던 셈이다.
 *   페이지에서 맡는 역할로 묶고 설명을 함께 보여주면 "지금 우리 페이지에 뭐가 비었나"로 읽힌다.
 *
 * ⚠️여기 없는 이름(AI가 만든 변형·셀러가 직접 입력한 것)은 '그 밖에'로 모인다 — 목록에서 사라지지 않는다.
 */

export const SECTION_GROUPS: Array<{ key: string; label: string; desc: string; items: string[] }> = [
  {
    key: 'open', label: '시작·끌어오기', desc: '첫 화면에서 손님을 붙잡는 부분',
    items: ['히어로', '공감', '피부고민 공감', '건강 고민 공감', '브랜드 세계관', '스타일 비전', '퍼포먼스 비전', '와디즈 스토리'],
  },
  {
    key: 'explain', label: '설명·특징', desc: '이 상품이 무엇이고 무엇이 다른지',
    items: [
      'USP', '핵심 기능', '핵심 기능/기술', '핵심 기능성', '스펙/성능', '기술 상세',
      '소재/원단', '소재/품질', '소재/스펙', '소재/성분', '소재/내구성',
      '성분/함량', '영양 정보', '맛/신선도', '핏/실루엣', '착용감', '공간 변화',
      '사이즈 가이드', '사이즈/스펙', '호환 차종', '적합성', '연령별 적합성', '발달 효과',
    ],
  },
  {
    key: 'trust', label: '신뢰·근거', desc: '왜 믿어도 되는지 뒷받침하는 부분',
    items: [
      '성분 신뢰', '성분 안전', '성분 인포그래픽', '안전/인증', '안전 인증', 'GMP/인증',
      '임상 근거', '원산지 스토리', '원료 원산지', '생산 과정', '전문가 추천',
      '후기', '비교표', '비교/차별점', 'A/S 보증',
    ],
  },
  {
    key: 'use', label: '사용·관리', desc: '어떻게 쓰고 어떻게 관리하는지',
    items: [
      '사용법', '사용법/주의사항', '복용법/주의사항', '급여 가이드', '설치/사용', '설치 방법',
      '레시피/보관법', '세탁/관리', '관리법', '보관/관리', '사용 시나리오', '활동 시나리오', '코디 제안',
    ],
  },
  {
    key: 'close', label: '마무리·구매', desc: '결정을 돕고 구매로 잇는 부분',
    items: ['감성 카피', 'SNS 공유컷', 'FAQ', '법적 고지', 'CTA'],
  },
];

/** 목록에 없는 이름도 버리지 않는다 — 그 밖에로 모은다 */
export function groupSections(names: string[]): Array<{ label: string; desc: string; items: string[] }> {
  const known = new Set(SECTION_GROUPS.flatMap(g => g.items));
  const out = SECTION_GROUPS
    .map(g => ({ label: g.label, desc: g.desc, items: g.items.filter(i => names.includes(i)) }))
    .filter(g => g.items.length > 0);
  const rest = names.filter(n => !known.has(n));
  if (rest.length) out.push({ label: '그 밖에', desc: '추천·직접 입력으로 만들어진 섹션', items: rest });
  return out;
}
