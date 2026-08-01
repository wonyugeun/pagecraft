/**
 * "한 번에 3안을 뽑으면 품질이 떨어지는가" 검증(2026-08-01).
 *
 * ★가설: 한 호출에서 3벌을 만들게 하면 모델이 출력 예산·집중을 나눠 써서 각 안이 얇아진다.
 *   미리 생성해 숨겨두는 방식(다른 안 보기)의 전제가 무너지는지 확인하는 게 목적.
 *
 * ★비교 대상: 같은 프롬프트로
 *   (A) 1안만 생성 — 현재 파이프라인과 동일
 *   (B) 3안 동시 생성 — 제안 방식
 *   B의 3안 각각을 A와 같은 잣대로 잰다(분량·정보밀도·날조·중복).
 *
 * ★공정성: 실서비스와 같은 buildCopyChunkPrompts·같은 모델을 쓴다. 하네스 전용 프롬프트를 쓰면
 *   하네스에서만 좋은 결과가 나온다.
 *
 * 실행: npx --yes tsx scripts/variant-quality-test.mts
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
for (const l of fs.readFileSync(path.join(ROOT, '.env.local'), 'utf8').split('\n')) {
  const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) process.env[m[1]] ??= m[2].replace(/^["']|["']$/g, '');
}

const { buildCopyChunkPrompts, callCopyModel, COPY_MODEL } = await import('../lib/stages/copy');
const { TEST_PRODUCTS } = await import('./test-products');

const RAW = path.join(ROOT, 'runs', 'diversity-v3', '01-패션-니트가디건', 'raw.json');
const raw = JSON.parse(fs.readFileSync(RAW, 'utf8')) as { sections: Record<string, unknown>[] };
const p = TEST_PRODUCTS[0];
const hero = raw.sections[0] as Record<string, string>;

const planSection = {
  name: hero.name, role: hero.role, mission: hero.mission,
  emotion_goal: hero.emotion_goal, writing_style: hero.writing_style,
  block_plan: (hero as Record<string, string>).block_plan,
};

const base = {
  strategySummary: { tone: '', speech_level: '해요체' } as never,
  sections: [planSection] as never,
  startIndex: 0, totalSections: 8,
  cat: p.cat, ch: p.ch, out: 'blog',
  knownFacts: [p.productName, ...p.fields].join('\n'),
  pageMap: raw.sections.map(s => ({ name: String(s.name), mission: String(s.mission ?? '') })),
  salesMode: true, killerLineIndex: 1,
};

const { composedSystem, userPrompt } = buildCopyChunkPrompts(base);

/** 3안 요청 — 출력 형식만 바꾸고 규칙은 그대로 둔다(변수 최소화) */
const MULTI_SUFFIX = `

[★이번에는 서로 다른 3안을 만드세요]
같은 섹션에 대해 각도가 다른 3개를 만듭니다. 3개가 비슷하면 실패입니다.
각 안은 위에 적힌 모든 규칙(분량·훅·날조 금지·블록 계획)을 똑같이 지켜야 합니다.
"어차피 3개니까 대충"이 아니라, 각각이 단독으로 쓰여도 될 완성도여야 합니다.

[출력 형식] 다른 텍스트 없이 아래 JSON 배열만 (길이 정확히 3):
[ { "angle":"각도", "name":"${hero.name}", "headline":"...", "subcopy":"...", "body":"...", "blocks":[...] } ]`;

const stat = (s: { headline?: string; subcopy?: string; body?: string; blocks?: unknown[] }) => {
  const b = s.body ?? '';
  const facts = [...(b + (s.headline ?? '')).matchAll(/\d+(?:cm|%|g|kg|ml|개|일|년|도)?/g)].length;
  return { len: b.length, lines: b.split('\n').length, facts, blocks: (s.blocks ?? []).length };
};

const SRC = [p.productName, ...p.fields].join(' ');
const SUSPECT = /(설계|공정|특허|임상|드롭숄더|밸런스|자연광 컷|실내조명 컷|직접 입어)/g;
const fabs = (t: string) => [...t.matchAll(SUSPECT)].map(m => m[0]).filter(w => !SRC.includes(w));

console.log(`품질 비교 — 히어로 1안 생성 vs 3안 동시 생성 (${COPY_MODEL})\n`);

/* ── A: 1안(현재 방식) ── */
console.log('[A] 1안 생성 중...');
const rA = await callCopyModel(COPY_MODEL, composedSystem, userPrompt);
const jA = rA.raw.slice(rA.raw.indexOf('['), rA.raw.lastIndexOf(']') + 1);
const A = JSON.parse(jA)[0] as Record<string, never>;

/* ── B: 3안(제안 방식) ── */
console.log('[B] 3안 동시 생성 중...');
const rB = await callCopyModel(COPY_MODEL, composedSystem, userPrompt + MULTI_SUFFIX);
const jB = rB.raw.slice(rB.raw.indexOf('['), rB.raw.lastIndexOf(']') + 1);
const B = JSON.parse(jB) as Record<string, never>[];

console.log(`\n출력 토큰 — A: ${rA.outTok.toLocaleString()} / B: ${rB.outTok.toLocaleString()} (${(rB.outTok / rA.outTok).toFixed(1)}배)\n`);

const show = (label: string, s: Record<string, never>) => {
  const st = stat(s);
  const f = fabs(String(s.headline ?? '') + String(s.subcopy ?? '') + String(s.body ?? ''));
  console.log(`${label} ${s.angle ? `[${s.angle}]` : ''}`);
  console.log(`  H: ${s.headline}`);
  console.log(`  S: ${s.subcopy ?? ''}`);
  console.log(`  B: ${String(s.body ?? '').replace(/\n/g, ' / ')}`);
  console.log(`  → ${st.len}자 · ${st.lines}줄 · 수치 ${st.facts}개 · 블록 ${st.blocks}개 · 날조 ${f.length}건 ${f.length ? JSON.stringify(f) : ''}`);
  console.log();
};

console.log('══ A. 1안 생성(현재 방식) ══\n');
show('A', A);
console.log('══ B. 3안 동시 생성(제안 방식) ══\n');
B.forEach((s, i) => show(`B-${i + 1}`, s));

/* ── 판정 ── */
const sa = stat(A);
const sb = B.map(stat);
const avgLen = Math.round(sb.reduce((x, y) => x + y.len, 0) / sb.length);
const avgFacts = (sb.reduce((x, y) => x + y.facts, 0) / sb.length).toFixed(1);
const totalFab = B.reduce((n, s) => n + fabs(String(s.headline ?? '') + String(s.body ?? '')).length, 0);
const uniq = new Set(B.map(s => String(s.headline))).size;

console.log('══ 판정 ══');
console.log(`  분량      A ${sa.len}자  vs  B 평균 ${avgLen}자   ${avgLen >= sa.len * 0.8 ? '✅ 유지' : '⚠️ 얇아짐'}`);
console.log(`  수치 밀도  A ${sa.facts}개  vs  B 평균 ${avgFacts}개  ${Number(avgFacts) >= sa.facts * 0.8 ? '✅ 유지' : '⚠️ 감소'}`);
console.log(`  블록      A ${sa.blocks}개  vs  B ${sb.map(s => s.blocks).join('/')}      ${sb.every(s => s.blocks >= sa.blocks) ? '✅ 유지' : '⚠️ 누락'}`);
console.log(`  날조      A ${fabs(String(A.headline ?? '') + String(A.body ?? '')).length}건  vs  B 합계 ${totalFab}건  ${totalFab === 0 ? '✅ 없음' : '⚠️ 발생'}`);
console.log(`  중복      B의 서로 다른 헤드라인 ${uniq}/3        ${uniq === 3 ? '✅ 전부 다름' : '⚠️ 겹침'}`);
console.log(`  잘림      B stop=${rB.stopReason}                ${rB.stopReason === 'max_tokens' ? '⚠️ 상한 도달' : '✅ 정상'}`);

fs.writeFileSync(path.join(ROOT, 'runs', 'variant-quality.json'), JSON.stringify({ single: A, multi: B }, null, 2));
console.log('\n원본 저장 → runs/variant-quality.json');
