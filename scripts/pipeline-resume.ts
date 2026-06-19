/**
 * 엔진 통합 3단계 검증 — 중간 상태 저장 + 실패 재개.
 * 실제 lib/pipelineJob.ts(runJob/createJob)를 사용하며, 스테이지 호출은 HTTP로 주입한다.
 *
 * 케이스 A: 정상 완주 → 각 스테이지 결과 저장(파일 persist)되며 완주.
 * 케이스 A-2: 완주한 job 재실행 → 전 스테이지 skip(추가 호출 0) = 멱등.
 * 케이스 B: copy 청크2를 1차에서 강제 실패 → 같은 job 재개 → 성공 스테이지 재호출 없이 실패지점부터.
 *
 * 실행: dev 서버 띄운 채  npx tsx scripts/pipeline-resume.ts
 */
import { Agent, setGlobalDispatcher } from 'undici';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { createJob, runJob, getJobResult, jobProgressSummary, type StageCall, type JobState } from '../lib/pipelineJob';

setGlobalDispatcher(new Agent({ headersTimeout: 0, bodyTimeout: 0 }));
const BASE = process.env.BASE_URL || 'http://localhost:3000';
const OUT_DIR = join(process.cwd(), '_prototype_out');
mkdirSync(OUT_DIR, { recursive: true });

const input = {
  cat: '화장품', ch: '스마트스토어', out: null as string | null, depth: '간결' as const,
  productName: '리프그린 시카 진정 토너 250ml',
  productExtra: [
    '브랜드명: 리프그린(LEAFGREEN)', '정가: 28,000원', '판매가: 19,900원',
    '[주요 성분]: 히알루론산, 병풀(센텔라), 판테놀',
    '[인증 및 특징]: 무향, 무색소, 피부과 테스트 완료',
    '경쟁 차별점: 제주산 병풀 함유, 무향·무색소 저자극, 끈적임 없는 워터리 제형, 250ml 대용량',
    '기타 요청사항: 20~30대 민감성 피부·직장인 여성 타겟, 자극 없이 매일 쓰는 진정 토너 컨셉',
  ].join('\n'),
  generateImages: false,
};

const counts: Record<string, number> = {};
function makeCall(fail?: (path: string, body: Record<string, unknown>) => boolean): StageCall {
  return async (path, body) => {
    counts[path] = (counts[path] || 0) + 1;
    if (fail && fail(path, body as Record<string, unknown>)) {
      throw new Error('의도적 실패 주입(copy 청크2)');
    }
    // strategy는 max_tokens(1500) 변동으로 가끔 실패 → 오케스트레이터 레벨 재시도(최대 3)
    const attempts = path === '/api/strategy' ? 3 : 1;
    let lastErr: unknown;
    for (let a = 0; a < attempts; a++) {
      try {
        const res = await fetch(BASE + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        const json = await res.json();
        if (!res.ok || json.error) throw new Error(json.error || `HTTP ${res.status}`);
        return json;
      } catch (e) { lastErr = e; if (a < attempts - 1) counts[path]++; }
    }
    throw lastErr;
  };
}

const persist = (job: JobState) => writeFileSync(join(OUT_DIR, `job-${job.jobId}.json`), JSON.stringify(job, null, 2));
const onProgress = (_job: JobState, ev: { stage: string; status: string; chunkStartIndex?: number; skipped?: boolean }) =>
  console.log(`   · ${ev.stage}${ev.chunkStartIndex != null ? `@${ev.chunkStartIndex}` : ''} → ${ev.status}${ev.skipped ? ' (skip)' : ''}`);

const reset = () => Object.keys(counts).forEach(k => delete counts[k]);

(async () => {
  // ───────── 케이스 A: 정상 완주 (chunkSize 8 → copy 2청크) ─────────
  console.log('═══════ 케이스 A: 정상 완주 (chunkSize=8) ═══════');
  const jobA = createJob(input);
  console.log('jobId:', jobA.jobId);
  reset();
  await runJob(jobA, { call: makeCall(), chunkSize: 8, onProgress, persist });
  console.log('완주 상태:', jobProgressSummary(jobA));
  console.log('호출 횟수:', JSON.stringify(counts));
  const resA = getJobResult(jobA)!;
  console.log(`getJobResult → sections=${resA.sections.length} 카피채움=${resA.sections.filter(s => s.headline && s.body).length} 브리프=${resA.sections.filter(s => s.imageBrief).length}`);

  // ───────── 케이스 A-2: 완주 job 재실행(멱등) ─────────
  console.log('\n═══════ 케이스 A-2: 완주 job 재실행(멱등) ═══════');
  reset();
  await runJob(jobA, { call: makeCall(), chunkSize: 8, onProgress, persist });
  console.log('재실행 추가 호출:', JSON.stringify(counts), '→ 모두 0이면 전 스테이지 skip 정상');

  // ───────── 케이스 B: copy 청크2 실패 → 재개 ─────────
  console.log('\n═══════ 케이스 B: copy 청크2 강제 실패 → 재개 ═══════');
  const jobB = createJob(input);
  console.log('jobId:', jobB.jobId);
  reset();
  let injected = false;
  const failCall = makeCall((path, body) => {
    if (path === '/api/copy' && body.startIndex === 8 && !injected) { injected = true; return true; }
    return false;
  });
  try {
    await runJob(jobB, { call: failCall, chunkSize: 8, onProgress, persist });
  } catch (e) {
    console.log('1차 실패(예상):', (e as Error).message);
  }
  console.log('1차 후 상태:', jobProgressSummary(jobB));
  console.log('1차 호출 횟수:', JSON.stringify(counts));

  console.log('--- 같은 job 재개(정상 call) ---');
  reset();
  await runJob(jobB, { call: makeCall(), chunkSize: 8, onProgress, persist });
  console.log('2차(재개) 후 상태:', jobProgressSummary(jobB));
  console.log('2차 호출 횟수:', JSON.stringify(counts));
  console.log('→ 기대: strategy 0, structure 0, copy 1(청크2만), imagebrief 1');
  const resB = getJobResult(jobB)!;
  console.log(`재개 완주 → sections=${resB.sections.length} 카피채움=${resB.sections.filter(s => s.headline && s.body).length}`);

  console.log('\n✅ 검증 완료. job 상태 파일: _prototype_out/job-*.json');
})().catch(e => { console.error('\n❌ 실패:', e.message); process.exit(1); });
