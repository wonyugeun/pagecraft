/**
 * 흐름 이식 검증 — 실제 copy.ts(runCopyChunk) in-process 호출.
 * 격리 스크립트(flow-ab-test.mjs)는 자체 NEW_SYSTEM을 썼지만, 이건 production copy.ts 경로를 그대로 탄다.
 * → COPY_PRINCIPLES에 이식한 "독자 시작" 흐름이 실제 파이프라인에 반영됐는지 확인.
 *
 * dev server 불필요(메모리: 서버 실행 금지) — Anthropic만 직접 호출. 텍스트만, 이미지 0.
 * 실행: npx tsx scripts/flow-verify.ts
 */
import { readFileSync } from 'node:fs';
import { Agent, setGlobalDispatcher } from 'undici';
setGlobalDispatcher(new Agent({ headersTimeout: 0, bodyTimeout: 0 }));

// copy.ts는 모듈 로드 시 process.env.ANTHROPIC_API_KEY로 client 생성 → import 전에 주입.
const env = readFileSync('.env.local', 'utf8');
process.env.ANTHROPIC_API_KEY = (env.match(/^ANTHROPIC_API_KEY=(.+)$/m) || [])[1]?.trim();

const CASES = [
  { file: 'factguard-case1.json', label: '식품(단호박)' },
  { file: 'pipeline-test.json',   label: '화장품(토너)' },
  { file: 'retention-test.json',  label: '반려동물(노령견 관절)' },
];

const UNIT = '분|시간|초|일|원|kg|g|개입|개|%|퍼센트|도|brix|Brix|당도';
const unitNums = (s: string) =>
  new Set((String(s).match(new RegExp(`\\d[\\d,.]*\\s*(?:${UNIT})`, 'g')) || []).map(t => t.replace(/\s+/g, '')));

async function main() {
  const { runCopyChunk } = await import('@/lib/stages/copy');
  const sep = '═'.repeat(76);
  const only = process.argv[2];   // 부분일치 필터(파일명/라벨). 없으면 전체.
  const cases = only ? CASES.filter(c => c.file.includes(only) || c.label.includes(only)) : CASES;

  for (const { file, label } of cases) {
    const j = JSON.parse(readFileSync(`_prototype_out/${file}`, 'utf8'));
    // 저장본 구조 정규화: (A) {dna,strategy,sections}  또는 (B) {strategy:{dna,strategy},structure.sections,copy.sections}
    const nested = j.strategy?.dna ? j.strategy : null;
    const dna = nested ? nested.dna : j.dna;
    const strat = nested ? nested.strategy : j.strategy;
    const planSecs = j.structure?.sections ?? j.sections;        // 섹션 계획(role/mission 포함)
    const oldSecs = j.copy?.sections ?? j.sections;               // 생성된 OLD 카피
    const old3 = oldSecs.slice(0, 3);
    const plan3 = planSecs.slice(0, 3);
    const kf = j.input ? `${j.input.productName || ''} ${j.input.productExtra || ''}`.trim() : '';
    const ss = {
      main_weapon: dna.main_weapon, concept: strat.concept, hero_angle: strat.hero_angle,
      target_desire: dna.target_desire, target_fear: dna.target_fear,
      story_flow: strat.story_flow, tone: strat.tone,
    };
    const sects = plan3.map((s: any) => ({
      name: s.name, role: s.role, mission: s.mission, emotion_goal: s.emotion_goal, writing_style: s.writing_style,
    }));
    // factScrub 허용 기준: 셀러 원입력 있으면 그걸로, 없으면 전략·DNA 사실 텍스트 프록시
    const knownFacts = kf || [dna.main_weapon, dna.buy_reason, strat.concept].filter(Boolean).join(' / ');
    const allowed = unitNums(JSON.stringify(ss) + JSON.stringify(sects) +
      old3.map((s: any) => `${s.headline}\n${s.subcopy}\n${s.body}`).join('\n'));

    console.log(`\n\n${sep}\n  ${label}  —  ${file}\n${sep}`);
    const NEW = await runCopyChunk({
      strategySummary: ss, sections: sects, startIndex: 0, totalSections: planSecs.length,
      cat: j.meta?.cat || j.input?.cat || dna.category_type || '', ch: '스마트스토어', out: 'blog', depth: '간결', knownFacts,
    });

    const fab: string[] = [];
    for (const s of NEW) for (const n of unitNums(`${s.headline} ${s.subcopy} ${s.body}`)) if (!allowed.has(n)) fab.push(n);

    for (let i = 0; i < NEW.length; i++) {
      console.log(`\n──── [${i}] ${old3[i].name}  (ws: ${(old3[i].writing_style || '').split(' ')[0]}) ────`);
      console.log('OLD H:', old3[i].headline);
      console.log('OLD  :', `${old3[i].subcopy}\n${old3[i].body}`.replace(/\n/g, '\n        '));
      console.log('NEW H:', NEW[i].headline);
      console.log('NEW  :', `${NEW[i].subcopy}\n${NEW[i].body}`.replace(/\n/g, '\n        '));
    }
    console.log('\n' + (fab.length ? `⚠️ 입력에 없는 수치: ${[...new Set(fab)].join(', ')}` : '✅ 날조 숫자 0'));
  }
}
main().catch(e => { console.error(e); process.exit(1); });
