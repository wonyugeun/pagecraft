/**
 * 엔진 통합 2단계 검증 — 분할 호출 오케스트레이터(프론트 역할 대행, 화면 연결은 다음 단계).
 *
 * strategy → structure → copy(청크 16개씩 N회) → imagebrief 를 각각 "개별 HTTP 호출"로 순차 실행.
 * 각 호출이 독립적으로 300초(Vercel 천장) 내에 끝나는지 시간 측정.
 * copy 청크마다 strategy_summary(7필드)를 재주입해 청크 간 전략 일관성을 유지.
 *
 * 사용: dev 서버 띄운 채  node scripts/pipeline-split.mjs
 * 출력: 각 호출 소요시간 표 + _prototype_out/pipeline-split-<depth>.json
 */
import { Agent, setGlobalDispatcher } from 'undici';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

setGlobalDispatcher(new Agent({ headersTimeout: 0, bodyTimeout: 0 })); // 클라 타임아웃 해제(서버 단계별 측정용)

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const OUT_DIR = join(process.cwd(), '_prototype_out');
mkdirSync(OUT_DIR, { recursive: true });
const LIMIT = 300; // Vercel 함수 천장(초)
const COPY_CHUNK_SIZE = 16;

const productExtra = [
  '브랜드명: 리프그린(LEAFGREEN)', '정가: 28,000원', '판매가: 19,900원', '할인율: 29%', '가격 표시 여부: 상세페이지에 표시',
  '옵션: 250ml 단품 / 1+1 / 2개+패드', '[주요 성분]: 히알루론산, 병풀(센텔라), 판테놀',
  '[인증 및 특징]: 무향, 무색소, 피부과 테스트 완료',
  '경쟁 차별점: 제주산 병풀 함유, 무향·무색소 저자극, 끈적임 없는 워터리 제형, 250ml 대용량',
  '기타 요청사항: 20~30대 민감성 피부·직장인 여성 타겟, 자극 없이 매일 쓰는 진정 토너 컨셉, 신뢰감 있되 친근한 톤',
].join('\n');
const cat = '화장품', ch = '스마트스토어', productName = '리프그린 시카 진정 토너 250ml';

async function callTimed(label, path, body) {
  const t0 = Date.now();
  const res = await fetch(`${BASE}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const sec = (Date.now() - t0) / 1000;
  const json = await res.json();
  if (!res.ok || json.error) throw new Error(`[${label}] HTTP ${res.status} (${sec.toFixed(1)}s): ${json.error || ''}`);
  const flag = sec <= LIMIT ? '✓' : '✗ 초과';
  console.log(`   ${flag} ${label.padEnd(22)} ${sec.toFixed(1)}s`);
  return { json, sec };
}

async function runDepth(depth, sectionCount) {
  console.log(`\n══════════ depth=${depth} (목표 ${sectionCount}섹션) — 분할 호출 ══════════`);
  const timings = [];

  // 1) strategy (개별 호출)
  const s = await callTimed('strategy', '/api/strategy', { cat, ch, productName, productExtra });
  timings.push(['strategy', s.sec]);
  const { dna, strategy } = s.json;

  // 2) structure (개별 호출)
  const st = await callTimed('structure', '/api/structure', { dna, strategy, cat, ch, depth, sectionCount });
  timings.push(['structure', st.sec]);
  const plan = st.json.sections;

  // strategy_summary 7필드 — 클라이언트가 추출해 매 copy 청크에 재주입
  const strategySummary = {
    main_weapon: dna?.main_weapon, concept: strategy?.concept, hero_angle: strategy?.hero_angle,
    target_desire: dna?.target_desire, target_fear: dna?.target_fear,
    story_flow: strategy?.story_flow, tone: strategy?.tone,
  };

  // 3) copy — 16개씩 청크로 나눠 개별 호출(각 호출에 동일 strategy_summary 재주입)
  const total = plan.length;
  const copySections = [];
  let chunkNo = 0;
  for (let i = 0; i < total; i += COPY_CHUNK_SIZE) {
    chunkNo++;
    const chunk = plan.slice(i, i + COPY_CHUNK_SIZE);
    const c = await callTimed(`copy 청크#${chunkNo} (${chunk.length}섹션)`, '/api/copy', {
      strategySummary, sections: chunk, startIndex: i, totalSections: total, cat, ch, out: null, depth,
    });
    timings.push([`copy#${chunkNo}`, c.sec]);
    copySections.push(...c.json.sections);
  }

  // 4) imagebrief (개별 호출)
  const ib = await callTimed('imagebrief', '/api/imagebrief', { dna, strategy, sections: plan, copy: copySections, cat, ch, out: null });
  timings.push(['imagebrief', ib.sec]);

  const maxSec = Math.max(...timings.map(t => t[1]));
  const sumSec = timings.reduce((a, t) => a + t[1], 0);
  console.log(`   ── 최장 단일 호출 ${maxSec.toFixed(1)}s (${maxSec <= LIMIT ? '✓ 300초 내' : '✗ 초과'}) · 전체 합 ${sumSec.toFixed(1)}s · 호출 ${timings.length}회`);

  writeFileSync(join(OUT_DIR, `pipeline-split-${depth}.json`), JSON.stringify({
    depth, sectionCount: total, strategySummary, timings, maxSec, sumSec,
    dna, strategy, plan, copy: copySections, briefs: ib.json.briefs,
  }, null, 2));

  return { depth, total, timings, maxSec, copySections, strategySummary };
}

(async () => {
  console.log(`▶ 분할 호출 검증  BASE=${BASE}  (Vercel 천장 ${LIMIT}s)`);
  const r1 = await runDepth('간결', 16);
  const r2 = await runDepth('풍부', 32); // copy가 16+16 두 청크로 분할되는지 확인

  console.log(`\n\n══════════ 요약 ══════════`);
  for (const r of [r1, r2]) {
    const copyChunks = r.timings.filter(t => t[0].startsWith('copy')).length;
    console.log(`depth=${r.depth}: ${r.total}섹션 · copy 청크 ${copyChunks}회 · 최장 단일호출 ${r.maxSec.toFixed(1)}s ${r.maxSec <= 300 ? '✓' : '✗'}`);
  }
  console.log(`\n저장: _prototype_out/pipeline-split-간결.json, pipeline-split-풍부.json`);
})().catch(e => { console.error('\n❌ 실패:', e.message); process.exit(1); });
