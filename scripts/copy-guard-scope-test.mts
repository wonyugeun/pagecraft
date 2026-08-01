/**
 * 카피 규칙 적용 범위 검증(2026-08-02) — 출력형태별로 어떤 규칙이 붙는지.
 * 법적 규칙이 '블로그 문체 뭉치' 안에 섞여 있어 슬라이드에서 통째로 빠졌던 사고의 재발 방지.
 * 실행: npx --yes tsx scripts/copy-guard-scope-test.mts
 */
process.env.COPY_SALES_MODE = '1';
const { buildCopyChunkPrompts } = await import('../lib/stages/copy');

const base = {
  strategySummary: { tone: '', speech_level: '단정형' } as never,
  sections: [{ name: '후기', role: 'r', mission: 'm', emotion_goal: 'e', writing_style: 'w' }] as never,
  startIndex: 0, totalSections: 8, cat: '화장품', ch: '스마트스토어',
  knownFacts: '상품명: 시카 토너\n[핵심 성분]: 병풀 추출물(진정)',
  salesMode: true, killerLineIndex: 1,
};
const CHECKS: Array<[string, string, 'both' | 'blogOnly']> = [
  ['가짜 후기 금지(법적)',   '1인칭 과거형 경험담·별점·작성자명을 절대 생성하지 마세요', 'both'],
  ['셀러 안내문 금지',       '셀러에게 말을 거는 안내문',                              'both'],
  ['미입력 사실 금지',       '입력하지 않은 수치·성분·인증',                           'both'],
  ['날조 차단(재료 제한)',   '재료 제한',                                            'both'],
  ['어투(speech_level)',    '어투(speech_level)',                                   'blogOnly'],
  ['v5 문체',              'V5 문체 복원',                                          'blogOnly'],
];

let pass = true;
for (const out of ['blog', 'slide'] as const) {
  const { composedSystem, userPrompt } = buildCopyChunkPrompts({ ...base, out } as never);
  const all = composedSystem + userPrompt;
  console.log(`\n[${out}]`);
  for (const [label, needle, scope] of CHECKS) {
    const has = all.includes(needle);
    const want = scope === 'both' ? true : out === 'blog';
    const ok = has === want;
    if (!ok) pass = false;
    console.log(`  ${ok ? '✅' : '❌'} ${label.padEnd(22)} ${has ? '적용' : '미적용'}${ok ? '' : `  ← 기대: ${want ? '적용' : '미적용'}`}`);
  }
}
console.log(pass ? '\n✅ 법적·날조 규칙은 양쪽 공통, 문체·어투는 블로그 전용' : '\n❌ 범위 불일치');
process.exit(pass ? 0 : 1);
