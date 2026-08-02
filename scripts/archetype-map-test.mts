/**
 * 섹션 → 컷 종류 매칭 점검 — 62개 기본 섹션 전부 + 셀러가 직접 입력할 법한 이름까지.
 * 기본 구조에 든 섹션만 보면 안 된다. 셀러가 '추가'로 넣는 것들이 진짜 사각지대다.
 *   npx tsx scripts/archetype-map-test.mts
 */
import { classifyCutArchetype } from '../lib/sectionArchetype';

const BAND: Record<string, [number, number]> = {
  hero: [60, 100], empathy: [0, 20], in_use: [40, 85], ingredient_macro: [10, 40],
  texture: [20, 60], clinical: [50, 80], editorial: [20, 60], product_only: [70, 100],
  cta: [80, 100], open: [10, 95],
};

const ALL = ['히어로','공감','피부고민 공감','건강 고민 공감','브랜드 세계관','감성 카피','USP','사용법','비교표','후기','FAQ','CTA','성분 신뢰','성분 인포그래픽','SNS 공유컷','와디즈 스토리','원산지 스토리','맛/신선도','영양 정보','안전/인증','레시피/보관법','생산 과정','스타일 비전','소재/원단','핏/실루엣','코디 제안','사이즈 가이드','관리법','공간 변화','소재/품질','사이즈/스펙','사용 시나리오','설치/사용','핵심 기능','스펙/성능','기술 상세','A/S 보증','성분 안전','적합성','전문가 추천','핵심 기능/기술','소재/스펙','착용감','활동 시나리오','퍼포먼스 비전','세탁/관리','안전 인증','소재/성분','연령별 적합성','발달 효과','사용법/주의사항','핵심 기능성','성분/함량','임상 근거','GMP/인증','복용법/주의사항','원료 원산지','소재/내구성','호환 차종','설치 방법','비교/차별점','법적 고지'];

/** 셀러가 직접 입력할 법한 이름 — 여기가 진짜 사각지대다 */
const CUSTOM = [
  '특허 기술 소개', '수상 이력', '언박싱', '구성품 안내', '선물 포장', '사은품',
  '배송 안내', '교환/반품', '재구매 혜택', '매장 안내', '시술 전후', '착용 사진',
  '반려견 급여량', '아이 사용 후기', '실측 사이즈', '색상 선택 가이드',
];

/** 기대치 — 이건 '이렇게 나오면 안 된다'만 적는다(정답 하나로 못 박으면 또 묶인다) */
const MUSTNOT: Array<[string, string[]]> = [
  ['코디 제안', ['empathy', 'product_only']],       // 옷이 안 보이거나 사람이 없으면 실패
  ['착용감', ['empathy', 'product_only']],
  ['핏/실루엣', ['empathy', 'product_only']],
  ['공간 변화', ['empathy', 'product_only']],
  ['사용 시나리오', ['product_only']],
  ['레시피/보관법', ['product_only']],
  ['생산 과정', ['product_only']],
  ['임상 근거', ['product_only', 'open']],
  ['전문가 추천', ['product_only']],
  ['맛/신선도', ['product_only']],
  ['공감', ['product_only', 'in_use']],             // 고민 컷에 제품이 크게 나오면 실패
  ['피부고민 공감', ['product_only', 'in_use']],
];

const by: Record<string, string[]> = {};
for (const n of [...ALL, ...CUSTOM]) (by[classifyCutArchetype(n)] ??= []).push(n);

console.log('── 기본 62개 + 직접 입력 예상 16개 ──\n');
for (const [a, list] of Object.entries(by).sort((x, y) => y[1].length - x[1].length)) {
  const [lo, hi] = BAND[a];
  console.log(`${a.padEnd(17)} 제품노출 ${String(lo).padStart(2)}~${String(hi).padStart(3)}%  ${String(list.length).padStart(2)}개`);
  console.log(`  ${list.join(', ')}\n`);
}

let fail = 0;
for (const [name, banned] of MUSTNOT) {
  const got = classifyCutArchetype(name);
  if (banned.includes(got)) { fail++; console.log(`✗ ${name} → ${got} (이러면 안 됨)`); }
}
console.log(fail === 0 ? '✓ 금지 매칭 0건' : `\n✗ ${fail}건 실패`);

const opened = by['open'] ?? [];
console.log(`\n분류 근거 없어 모델에게 맡기는 것: ${opened.length}개 — ${opened.join(', ')}`);
if (fail > 0) process.exit(1);
