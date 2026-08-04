/**
 * 섹션 컷 아키타입(8종) — 섹션 역할 분류 어휘.
 *
 * Phase C(Clean Baseline, 2026-07-16): 구 디렉션 스택(Scene Library·구도/강도 배정·
 * 프롬프트 조각)은 전부 삭제됨 — 이미지 방향은 Creative Director(lib/stages/director)+
 * buildSectionBrief(lib/adBrief)가 담당한다. 이 파일은 분류 함수만 남긴다.
 *
 * 현재 사용처:
 *  - Required Asset 선정(lib/sectionReference.selectRequiredAssetIndex) — Asset-first 가드
 *  - Stage4 imagebrief의 product_visibility 밴드 clamp(블로그 경로 브리프용)
 */

export type CutArchetype =
  | 'hero'              // 모델+제품 화보 (첫 섹션)
  | 'empathy'           // 고민·상황 — 제품은 거의 안 보임
  | 'in_use'            // 사람이 쓰거나 입은 컷 — 제품이 상황 안에 또렷이 보임
  | 'ingredient_macro'  // 원료 클로즈업 — 제품은 소품
  | 'texture'           // 제형·발림 클로즈업
  | 'clinical'          // 신뢰·검증 — 미니멀 스튜디오
  | 'editorial'         // 브랜드 무드컷
  | 'product_only'      // 제품 단독 스튜디오
  | 'cta'               // 모델+제품+구매정보
  | 'open';             // ★분류 근거 없음 — 장면은 모델이 정한다(기본값)

/* 키워드 → 아키타입. 우선순위: 구체적 신호(cta·hero·성분)가 포괄 신호(신뢰·공감)보다 먼저 —
   예: "성분 신뢰"는 ingredient_macro로(원료 컷이 신뢰 스튜디오보다 그 섹션에 맞음). */
const CTA_KEYS        = ['cta', '구매', '결제', '마무리', '결정', '클로징', '클릭'];
const HERO_KEYS       = ['히어로', '메인', '후킹', '오프닝', '인트로'];
const INGREDIENT_KEYS = ['성분', '원료', '함량', '추출물', '유래', '소재', '원단', '원물'];
/* ★상황컷을 둘로 나눈다(2026-08-02) — 밴드가 정반대라 한 묶음으로 두면 한쪽이 반드시 망가진다.
   empathy는 고민을 보여주는 컷이라 제품이 거의 안 보이는 게 맞지만(0~20%),
   '코디 제안'·'착용감'은 입은 옷이 주인공이다. 같은 밴드를 쓰면 정작 팔 물건이 안 보인다. */
/* '이유'는 뺐다 — '이 토너가 다른 이유'·'성분 배합 이유'까지 공감컷(제품 0~20%)으로 끌고 갔다 */
const EMPATHY_KEYS    = ['공감', '고민', '일상', '불편', '걱정', '망설', '원인', '왜', '문제', '진단'];
const IN_USE_KEYS     = ['시나리오', '코디', '착용', '핏', '실루엣', '공간', '활동', '연령', '발달', '적합', '스타일링',
                         '활용', '생활', '장면', '이런 분', '연출'];
/* '사용'을 넓게 받는다 — '사용법'만 두면 '사용 방법'이 안 걸린다.
   '사용 시나리오'류는 in_use를 먼저 보므로 여기로 새지 않는다(검사 순서 주의). */
const TEXTURE_KEYS    = ['제형', '텍스처', '발림', '사용', '루틴', '흡수',
                         '레시피', '조리', '보관', '세탁', '관리', '손질', '설치', '급여', '맛', '신선', '식감',
                         '복용', '섭취', '도포', '세척'];
const CLINICAL_KEYS   = ['신뢰', '인증', '테스트', '안전', '검증', '비교', '후기', '리뷰', '스펙', 'faq', '질문', '의심', '이의', '보증',
                         '임상', '근거', '전문가', '추천', '기능성', '시험', '사이즈', '영양'];
/* 제품 그 자체가 주인공인 컷 — 셀러가 '구성품'·'패키지'처럼 적었을 때 */
const PRODUCT_KEYS    = ['구성', '패키지', '제품컷', '상품컷', '단독', '언박싱', '증정', '컬러', '색상', '실물'];
const EDITORIAL_KEYS  = ['브랜드', '스토리', '감성', '무드', '세계관', '철학', '약속',
                         '생산', '공정', '과정', 'sns', '공유', '비전'];

export function classifyCutArchetype(name = '', role = '', emotion = ''): CutArchetype {
  /* ★띄어쓰기를 무시한다(2026-08-04) — AI가 짓는 이름은 '사용 방법'처럼 띄어 쓰는데
   *  키워드는 '사용법'이라 매칭을 놓쳤다. 놓치면 open으로 떨어져 분류가 헐거워진다. */
  const squeeze = (t: string) => t.toLowerCase().replace(/[\s·/]/g, '');
  const hay = squeeze(`${name} ${role} ${emotion}`);
  const hit = (keys: string[]) => keys.some(k => hay.includes(squeeze(k)));
  if (hit(CTA_KEYS))        return 'cta';
  if (hit(HERO_KEYS))       return 'hero';
  if (hit(INGREDIENT_KEYS)) return 'ingredient_macro';
  if (hit(IN_USE_KEYS))     return 'in_use';
  if (hit(EMPATHY_KEYS))    return 'empathy';
  if (hit(TEXTURE_KEYS))    return 'texture';
  if (hit(CLINICAL_KEYS))   return 'clinical';
  if (hit(EDITORIAL_KEYS))  return 'editorial';
  if (hit(PRODUCT_KEYS))    return 'product_only';
  /* ★모르면 좁게 잠그지 않는다(2026-08-02).
   *  전에는 여기서 product_only로 떨어뜨렸고, 그 밴드가 제품 노출 70~100%를 강제했다.
   *  62개 섹션 중 34개가 이 길로 와서 '코디 제안'도 '공간 변화'도 제품 단독컷이 됐다.
   *  셀러가 직접 입력한 섹션도 전부 여기로 온다 — 우리가 모르는 이름이니 당연히.
   *  모를 때는 장면을 아는 쪽(모델)에게 맡기고, 코드는 밴드를 넓게만 열어둔다. */
  return 'open';
}
