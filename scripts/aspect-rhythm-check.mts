/**
 * 이미지 비율 리듬 점검 — 섹션 수가 늘어나도 흐름이 유지되는지 본다(2026-08-01).
 *
 * ★8섹션만 보고 판단하면 안 된다(유근님). 실제 섹션 수는 12·14·16·22·24·26·28·30·32이고,
 *   키워드 규칙은 섹션이 많아질수록 같은 비율이 길게 이어질 위험이 커진다.
 *   같은 비율이 4개 이상 연속되면 '리듬'이 아니라 '단조로움'이다.
 *
 * 실행: npx --yes tsx scripts/aspect-rhythm-check.mts
 */
import fs from 'node:fs';
import path from 'node:path';

const { normalizeAspectsForPage, aspectRatioFor } = await import('../lib/sectionAspect');
type IA = '4:5' | '16:9' | '1:1';

const PRICE: Record<string, number> = { '4:5': 135, '16:9': 135, '1:1': 90 };
const GLYPH: Record<string, string> = { '4:5': '▮', '16:9': '▬', '1:1': '■' };

/** 같은 비율이 몇 개까지 연속되는가 — 리듬 판정의 핵심 지표 */
function maxRun(arr: string[]): { len: number; at: number; ratio: string } {
  let best = { len: 0, at: 0, ratio: '' }, cur = 1;
  for (let i = 1; i <= arr.length; i++) {
    if (i < arr.length && arr[i] === arr[i - 1]) cur++;
    else {
      if (cur > best.len) best = { len: cur, at: i - cur, ratio: arr[i - 1] };
      cur = 1;
    }
  }
  return best;
}

function report(label: string, names: string[], out: 'blog' | 'slide') {
  // 모델 선택이 없는 상태(폴백만)에서 교정이 리듬을 만드는지 = 최악 시나리오 검증
  const fb = names.map(n => aspectRatioFor(n, undefined, out)) as IA[];
  const ratios: IA[] = normalizeAspectsForPage(fb, fb, out);
  const cost = ratios.reduce((s: number, r: string) => s + PRICE[r], 0);
  const run = maxRun(ratios);
  const dist = ratios.reduce<Record<string, number>>((a: Record<string, number>, r: string) => { a[r] = (a[r] ?? 0) + 1; return a; }, {});
  const ok = run.len <= 3;

  console.log(`\n${ok ? '✅' : '⚠️ '} ${label} — ${names.length}섹션 / ${out}`);
  console.log(`   ${ratios.map((r: string) => GLYPH[r]).join(' ')}`);
  console.log(`   분포 ${JSON.stringify(dist)} · 최장 연속 ${run.len}개(${run.ratio}, ${run.at + 1}번째부터)`);
  console.log(`   이미지 원가 ${cost.toLocaleString()}원 (섹션당 ${Math.round(cost / names.length)}원)`);
  if (!ok) {
    console.log(`   └ 같은 비율 ${run.len}개 연속 — ${names.slice(run.at, run.at + run.len).map((s: string) => s.slice(0, 10)).join(' / ')}`);
  }
  return ok;
}

let pass = true;

/* ── 실제 생성된 런 ── */
console.log('══ 실제 런 ══');
const runs: Array<[string, string, 'blog' | 'slide']> = [
  ['뼈국 블로그', 'runs/뼈국-2026-07-25-11-20/raw.json', 'blog'],
  ['뼈국 슬라이드', 'runs/뼈국슬라이드-2026-07-27-05-40/raw.json', 'slide'],
  ['뼈국 14섹션', 'runs/뼈국-2026-07-23-14-29/raw.json', 'blog'],
  ['니트 가디건', 'runs/diversity-v3/01-패션-니트가디건/raw.json', 'blog'],
];
for (const [label, file, out] of runs) {
  const p = path.join(process.cwd(), file);
  if (!fs.existsSync(p)) { console.log(`\n⏭  ${label} — 파일 없음`); continue; }
  const d = JSON.parse(fs.readFileSync(p, 'utf8')) as { sections: { name: string }[] };
  if (!report(label, d.sections.map(s => s.name), out)) pass = false;
  // 같은 섹션 이름으로 슬라이드 비율도 확인(형태만 바꿔 뽑는 셀러가 있다)
  if (out === 'blog' && !report(`${label} (슬라이드로 뽑으면)`, d.sections.map(s => s.name), 'slide')) pass = false;
}

/* ── 16·32섹션 시뮬레이션 — 실제 런이 없어 구조 단계가 만들 법한 이름으로 검증 ── */
console.log('\n══ 대형 페이지 시뮬레이션 ══');
const S16 = [
  '히어로 후킹', '공감·고민', '문제 원인', '솔루션 제시', '핵심 성분', '성분 근거',
  '제형·텍스처', '사용 방법', '사용 전후', '임상·인증', '안전성 검증', '비교 우위',
  '실사용 후기', 'FAQ 반론', '가격·구성', 'CTA 구매유도',
];
const S32 = [
  '히어로 후킹', '브랜드 소개', '공감·고민', '일상 불편', '문제 원인', '원리 설명',
  '솔루션 제시', '핵심 성분', '성분 근거', '함량 스펙', '원료 산지', '제조 공정',
  '제형·텍스처', '사용 방법', '사용 루틴', '사용 전후', '효능 수치', '임상 데이터',
  '인증 마크', '안전성 검증', '무첨가 안심', '비교 우위', '경쟁 비교', '실사용 후기',
  '후기 모음', '재구매율', 'FAQ 반론', '배송 안내', '보관 방법', '가격·구성',
  '옵션 선택', 'CTA 구매유도',
];
for (const [label, names] of [['16섹션', S16], ['32섹션', S32]] as const) {
  for (const out of ['blog', 'slide'] as const) {
    if (!report(label, names, out)) pass = false;
  }
}

console.log(`\n${pass ? '✅ 전부 통과 — 같은 비율 4개 이상 연속 없음' : '⚠️ 단조로운 구간 있음 — 리듬 보정 필요'}`);
process.exit(pass ? 0 : 1);
