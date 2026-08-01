/**
 * 셀러 안내문 유출 검증 — "💡 실제 후기를 입력하면…"이 고객 카피에 남지 않는지(2026-08-01).
 * 이 문구는 셀러에게 하는 말이라 상세페이지·다운로드 파일에 실리면 안 된다.
 * 실행: npx --yes tsx scripts/seller-hint-test.mts
 */
const { scrubCopyItems } = await import('../lib/factScrub');
const NO_REVIEW = '상품명: 니트\n[소재]: 울';
const HAS_REVIEW = '상품명: 니트\n고객 후기: 따뜻해요 - 김OO';

const cases: Array<[string, string, string, string]> = [
  ['안내문만 있는 줄',      '이런 분들이 만족하실 거예요.\n💡 실제 후기를 입력하면 이 섹션이 훨씬 강력해집니다', NO_REVIEW, '이런 분들이 만족하실 거예요.'],
  ['문장 뒤에 붙은 경우',    '편하게 입으실 수 있어요. 💡 실제 후기를 입력하면 이 섹션이 훨씬 강력해집니다', NO_REVIEW, '편하게 입으실 수 있어요.'],
  ['이모지 없이',           '좋은 옷이에요.\n실제 후기를 입력하면 더 강해집니다', NO_REVIEW, '좋은 옷이에요.'],
  ['연속 두 번',           'A입니다.\n💡 실제 후기를 입력하면 강해집니다\n💡 실제 후기를 입력하면 강해집니다\nB입니다.', NO_REVIEW, 'A입니다.\nB입니다.'],
  ['후기 입력한 계정에도',   '따뜻해요 - 김OO\n💡 실제 후기를 입력하면 이 섹션이 훨씬 강력해집니다', HAS_REVIEW, '따뜻해요 - 김OO'],
  ['안내문 없으면 무손상',   '첫 줄이에요.\n둘째 줄이에요.', NO_REVIEW, '첫 줄이에요.\n둘째 줄이에요.'],
];

let pass = true;
for (const [label, body, allow, want] of cases) {
  const got = scrubCopyItems([{ name: '후기', headline: 'h', subcopy: 's', body }], allow)[0].body;
  const ok = got === want;
  if (!ok) pass = false;
  console.log(`  ${ok ? '✅' : '❌'} ${label}`);
  if (!ok) console.log(`     기대 ${JSON.stringify(want)}\n     실제 ${JSON.stringify(got)}`);
}
// headline·subcopy로도 새지 않는지
const hs = scrubCopyItems([{ name: '후기', headline: '💡 실제 후기를 입력하면 강해집니다', subcopy: '좋아요 💡 실제 후기를 입력하면', body: 'x' }], NO_REVIEW)[0];
const hsOk = !/실제 후기를 입력하면/.test(hs.headline + hs.subcopy);
if (!hsOk) pass = false;
console.log(`  ${hsOk ? '✅' : '❌'} 헤드라인·서브카피에서도 제거 — ${JSON.stringify(hs.headline)} / ${JSON.stringify(hs.subcopy)}`);

console.log(pass ? '\n✅ 전부 통과 — 안내문만 제거되고 카피는 보존' : '\n❌ 실패');
process.exit(pass ? 0 : 1);
