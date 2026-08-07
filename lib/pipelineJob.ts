import type { StrategyResult } from '@/lib/stages/strategy';
import type { StructureResult, SectionPlan } from '@/lib/stages/structure';
import type { CopyOut, StrategySummary } from '@/lib/stages/copy';
import type { ImagebriefResult, Brief } from '@/lib/stages/imagebrief';
import type { PipelineInput, PipelineSection } from '@/lib/pipeline';
import { runPool } from '@/lib/asyncPool';

/**
 * 엔진 통합 3단계 — 중간 상태 저장 + 실패 재개 오케스트레이터.
 *
 * 분할 호출(2단계)에서 한 단계(특히 copy 청크 일부)가 실패하면 처음부터 다시 = 과금·시간 낭비.
 * 여기서는 파이프라인 실행 단위에 jobId를 부여하고, 각 스테이지 완료 시 결과를 job 상태에 저장한다.
 * 실패하면 이미 done인 스테이지는 재호출하지 않고, 실패 지점부터 재개한다.
 *
 * [새 인프라 없음] job 상태는 클라이언트가 들고 있는 plain 객체(JSON 직렬화 가능)다.
 * 영속화가 필요하면 persist 콜백을 주입한다(브라우저=IndexedDB, 검증=파일). lib 자체는 저장소 비의존.
 * [스테이지 로직 불변] 서버 라우트(strategy/structure/copy/imagebrief)는 그대로. 이 모듈은 호출 순서·
 * 상태·재개만 관리하며, 실제 호출은 주입된 call()로 한다(HTTP fetch 또는 직접 함수).
 *
 * 화면 진행표시 UI(4단계)·과금방지 정책(5단계)은 포함하지 않는다.
 */

export type StageStatus = 'pending' | 'done' | 'failed';

export interface StageState<T> {
  status: StageStatus;
  result?: T;
  error?: string;
}

export interface CopyChunkState {
  status: StageStatus;
  startIndex: number;   // 전체 섹션에서 이 청크의 시작 인덱스
  count: number;        // 이 청크의 섹션 수
  result?: CopyOut[];
  resultB?: CopyOut[];  // ★블로그형 카피 2안(B안·감성형) — 없으면 단일 안(슬라이드형 또는 B안 실패)
  error?: string;
}

export interface CopyStageState {
  status: StageStatus;            // 모든 청크 done이면 done
  strategySummary?: StrategySummary;
  total?: number;                 // 전체 섹션 수
  chunks: CopyChunkState[];
  chunkSize?: number;
}

export interface JobState {
  jobId: string;
  createdAt: string;
  input: PipelineInput;
  stages: {
    strategy: StageState<StrategyResult>;
    structure: StageState<StructureResult>;
    copy: CopyStageState;
    imagebrief: StageState<ImagebriefResult>;
  };
}

/** call(path, body) — 주입형 스테이지 호출기. HTTP fetch 또는 lib 함수 어댑터. */
export type StageCall = (path: string, body: unknown) => Promise<{ error?: string; [k: string]: unknown }>;

export interface RunJobOptions {
  call: StageCall;
  chunkSize?: number;                                  // copy 청크 크기(기본 16)
  onProgress?: (job: JobState, ev: ProgressEvent) => void;
  persist?: (job: JobState) => void | Promise<void>;   // 각 상태 변화 시 저장(클라/IndexedDB/파일 주입)
  /** strategy 응답의 서버 잔액(credit.balance)을 흘려보냄 — 헤더 크레딧 실시간 갱신용(차감 로직 무관, 표시만). */
  onCredit?: (balance: number) => void;
}

export interface ProgressEvent {
  stage: 'strategy' | 'structure' | 'copy' | 'imagebrief';
  status: StageStatus;
  chunkStartIndex?: number;
  skipped?: boolean;
}

export class PipelineJobError extends Error {
  stage: string;
  constructor(stage: string, cause: unknown) {
    super(`[${stage}] ${cause instanceof Error ? cause.message : String(cause)}`);
    this.name = 'PipelineJobError';
    this.stage = stage;
  }
}

// ★카피 병렬화: 16섹션 1방(출력 1만+ 토큰 = 6~7분, 잘리면 통째 재시도)이 카피 스테이지 병목이었음.
//   작은 청크(4섹션)를 동시 4개 워커로 — 벽시계 시간 = 가장 느린 청크 1개(~1분대), 잘림 재시도 사실상 소멸.
//   비용: 토큰 과금이라 총액 동일(입력 프롬프트 반복분만 소폭 증가, 통째 재시도 낭비는 제거).
const COPY_CHUNK_SIZE_DEFAULT = 4;

/** ★판매 디렉팅 강화 스위치 — 기본 ON(2026-08-04).
 *  이 파일은 브라우저에서 실행된다(runClientPipeline이 'use client'). NEXT_PUBLIC이 아닌
 *  COPY_SALES_MODE는 브라우저에서 항상 undefined라, 하네스(node)에서만 켜지고
 *  실제 사용자 생성에서는 로컬·프로덕션 모두 단 한 번도 켜진 적이 없었다 —
 *  8/2 "포인트 컬러 안 들어간다", 8/4 "어투 다르고 포인트 없다"가 전부 이것이었다.
 *  8/1~8/3 하네스 대량 검증을 통과한 기능이므로 기본 ON. 끄려면 NEXT_PUBLIC_COPY_SALES_MODE=0. */
export function salesModeOn(): boolean {
  return (process.env.NEXT_PUBLIC_COPY_SALES_MODE ?? process.env.COPY_SALES_MODE ?? '1') !== '0';
}

/**
 * 킬러 라인을 맡을 섹션을 코드가 정한다.
 *
 * ★왜 모델에게 안 맡기는가: 청크가 병렬로 돌아 서로를 못 본다. "페이지에서 한 곳만"이라고 쓰면
 *  각 청크가 저마다 자기 섹션을 그 한 곳으로 판단해 결국 전부 강조된다(콜라주가 실패한 원인과 동일).
 * ★어디에 두는가: 히어로는 이미 훅 전용 규칙을 받아 세다. 킬러 라인은 페이지 중반, 독자가
 *  설득에 몰입한 지점에 두는 게 가장 효과적이다 — 감정이 실리는 섹션(공감/해소/스토리)을 우선한다.
 */
const KILLER_PREFERRED = ['해소', '해결', '솔루션', '공감', '고민', '스토리', '안심', '차별'];
export function pickKillerLineIndex(plan: { name?: string }[]): number | undefined {
  if (plan.length < 3) return undefined;
  // 히어로(0)와 CTA(마지막)는 제외 — 그 둘은 각자 다른 임무가 있다
  const mid = plan.slice(1, -1);
  const hit = mid.findIndex(p => {
    const n = (p.name ?? '').toLowerCase();
    return KILLER_PREFERRED.some(k => n.includes(k.toLowerCase()));
  });
  return hit >= 0 ? hit + 1 : Math.floor(plan.length / 2);   // 못 찾으면 페이지 한가운데
}
const COPY_PARALLEL = 4;
const msg = (e: unknown) => (e instanceof Error ? e.message : String(e));

/** dna+strategy에서 strategy_summary 7필드만 추출(순수 함수 — 클라 번들 안전, copy.ts 미의존) */
function extractStrategySummary(
  dna: Record<string, unknown> | undefined,
  strategy: Record<string, unknown> | undefined,
): StrategySummary {
  const s = (v: unknown) => (typeof v === 'string' ? v : undefined);
  return {
    main_weapon:   s(dna?.main_weapon),
    concept:       s(strategy?.concept),
    hero_angle:    s(strategy?.hero_angle),
    target_desire: s(dna?.target_desire),
    target_fear:   s(dna?.target_fear),
    story_flow:    s(strategy?.story_flow),
    tone:          s(strategy?.tone),
  };
}

/** 새 파이프라인 작업 생성 — 모든 스테이지 pending */
export function createJob(input: PipelineInput, jobId?: string): JobState {
  return {
    jobId: jobId ?? `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    input,
    stages: {
      strategy:   { status: 'pending' },
      structure:  { status: 'pending' },
      copy:       { status: 'pending', chunks: [] },
      imagebrief: { status: 'pending' },
    },
  };
}

/**
 * job을 실행/재개한다. done인 스테이지는 건너뛰고, 실패한/대기 중인 스테이지부터 호출한다.
 * 어느 스테이지에서 실패하면 그 상태를 job에 기록·persist한 뒤 PipelineJobError를 던진다.
 * 호출자는 같은 job 객체로 runJob을 다시 호출하면 실패 지점부터 재개된다.
 */
export async function runJob(job: JobState, opts: RunJobOptions): Promise<JobState> {
  const { call, persist, onProgress } = opts;
  const { cat, ch, out, depth, productName, productExtra, sectionCount, baseSectionCount, sectionStructure, sectionDescs, referenceStyle, productForm, productVolume, productShapeProfile, speechLevel } = job.input;

  const save = async (ev: ProgressEvent) => {
    onProgress?.(job, ev);
    await persist?.(job);
  };

  // ── 1) strategy ──
  if (job.stages.strategy.status === 'done') {
    await save({ stage: 'strategy', status: 'done', skipped: true });
  } else {
    try {
      // ★sectionCount+jobKey — 서버 선차감 게이트(1섹션=1크레딧, jobKey 멱등 = 재시도·재개 이중 차감 없음)
      const r = await call('/api/strategy', {
        cat, ch, productName, productExtra, referenceStyle, sectionCount, baseSectionCount,
        // ★out 누락이 블로그 과소청구를 만들었다(2026-08-04 원장 실측: 블로그 8섹션에 -8).
        //   서버 선차감이 out 없이 1.0/섹션으로 계산 — 블로그(1.25/섹션)가 슬라이드 요율로 나갔다.
        out,
        jobKey: job.input.jobKey, speechLevel,
      });
      if (r?.error) throw new Error(r.error);
      job.stages.strategy = { status: 'done', result: r as unknown as StrategyResult };
      // ★서버가 선차감 후 반환한 실시간 잔액을 헤더로 전달(추가 조회 없음). dev bypass 시 credit 없음 → 스킵.
      const bal = (r as { credit?: { balance?: number } }).credit?.balance;
      if (typeof bal === 'number') opts.onCredit?.(bal);
      await save({ stage: 'strategy', status: 'done' });
    } catch (e) {
      job.stages.strategy = { status: 'failed', error: msg(e) };
      await save({ stage: 'strategy', status: 'failed' });
      throw new PipelineJobError('strategy', e);
    }
  }
  const { dna, strategy, visual } = job.stages.strategy.result as StrategyResult;

  // ── 2) structure ──
  if (job.stages.structure.status === 'done') {
    await save({ stage: 'structure', status: 'done', skipped: true });
  } else {
    try {
      const r = await call('/api/structure', { dna, strategy, cat, ch, depth, sectionCount, sectionStructure, sectionDescs, jobKey: job.input.jobKey });
      if (r?.error) throw new Error(r.error);
      job.stages.structure = { status: 'done', result: r as unknown as StructureResult };
      await save({ stage: 'structure', status: 'done' });
    } catch (e) {
      job.stages.structure = { status: 'failed', error: msg(e) };
      await save({ stage: 'structure', status: 'failed' });
      throw new PipelineJobError('structure', e);
    }
  }
  const plan: SectionPlan[] = (job.stages.structure.result as StructureResult).sections;

  // ── 3) copy (청크 분할) ──
  // 청크 슬롯이 아직 없으면 structure 결과로 초기화(strategy_summary 고정·청크 경계 확정)
  if (job.stages.copy.chunks.length === 0) {
    const size = opts.chunkSize ?? COPY_CHUNK_SIZE_DEFAULT;
    job.stages.copy.strategySummary = extractStrategySummary(dna, strategy);
    job.stages.copy.total = plan.length;
    job.stages.copy.chunkSize = size;
    job.stages.copy.chunks = [];
    if (salesModeOn() && plan.length > 1) {
      // ★히어로 독립 청크(2026-08-01) — 첫 섹션을 혼자 돌려 훅 전용 규칙을 온전히 받게 한다.
      //   같은 청크에 묶이면 나머지 섹션과 같은 규칙·같은 리듬으로 쓰여 '격이 다른 한 줄'이 안 나온다.
      job.stages.copy.chunks.push({ status: 'pending', startIndex: 0, count: 1 });
      for (let i = 1; i < plan.length; i += size) {
        job.stages.copy.chunks.push({ status: 'pending', startIndex: i, count: Math.min(size, plan.length - i) });
      }
    } else {
      for (let i = 0; i < plan.length; i += size) {
        job.stages.copy.chunks.push({ status: 'pending', startIndex: i, count: Math.min(size, plan.length - i) });
      }
    }
    await save({ stage: 'copy', status: 'pending' });
  }
  const ss = job.stages.copy.strategySummary as StrategySummary;
  const total = job.stages.copy.total as number;

  // ★청크 병렬 실행(동시 COPY_PARALLEL개) — done 청크는 재호출 없이 스킵(재개 유지),
  //   실패 청크는 상태만 기록하고 전체 settle 후 일괄 판정(부분 성공분은 저장 → 재개 시 실패분만 재호출).
  const knownFactsStr = [productName, productExtra].filter(Boolean).join('\n');   // 셀러 원입력 — 후처리 날조 그물 기준
  for (const chunk of job.stages.copy.chunks) {
    if (chunk.status === 'done') {
      await save({ stage: 'copy', status: 'done', chunkStartIndex: chunk.startIndex, skipped: true });
    }
  }
  const pendingChunks = job.stages.copy.chunks.filter(c => c.status !== 'done');
  await runPool(pendingChunks.map(chunk => async () => {
    try {
      const r = await call('/api/copy', {
        strategySummary: ss,
        sections: plan.slice(chunk.startIndex, chunk.startIndex + chunk.count),
        // ★전체 구성표(2026-07-25) — 병렬 청크 간 USP 재탕 방지(반복 금지 규칙의 재료)
        pageMap: plan.map(p => ({ name: p.name, mission: p.mission })),
        startIndex: chunk.startIndex,
        totalSections: total,
        cat, ch, out, depth,
        knownFacts: knownFactsStr,
        // ★판매 디렉팅 강화 — 킬러 라인 섹션은 코드가 지정(병렬 청크는 서로를 못 본다)
        salesMode: salesModeOn(),
        killerLineIndex: salesModeOn() ? pickKillerLineIndex(plan) : undefined,
        jobKey: job.input.jobKey,   // ★결제 검증(P0 2차)
      });
      if (r?.error) throw new Error(r.error);
      chunk.status = 'done';
      chunk.result = (r.sections as CopyOut[]) ?? [];
      chunk.resultB = (r.sectionsB as CopyOut[] | undefined) ?? undefined;   // ★카피 2안(블로그형)
      chunk.error = undefined;
      await save({ stage: 'copy', status: 'done', chunkStartIndex: chunk.startIndex });
    } catch (e) {
      chunk.status = 'failed';
      chunk.error = msg(e);
      await save({ stage: 'copy', status: 'failed', chunkStartIndex: chunk.startIndex });
    }
  }), COPY_PARALLEL);
  const failedChunk = job.stages.copy.chunks.find(c => c.status === 'failed');
  if (failedChunk) {
    job.stages.copy.status = 'failed';
    await save({ stage: 'copy', status: 'failed', chunkStartIndex: failedChunk.startIndex });
    throw new PipelineJobError(`copy@${failedChunk.startIndex}`, new Error(failedChunk.error ?? '카피 청크 실패'));
  }
  job.stages.copy.status = 'done';

  // ── 4) imagebrief ──
  if (job.stages.imagebrief.status === 'done') {
    await save({ stage: 'imagebrief', status: 'done', skipped: true });
  } else {
    const copySections = job.stages.copy.chunks.flatMap(c => c.result ?? []);
    try {
      const r = await call('/api/imagebrief', { dna, strategy, sections: plan, copy: copySections, cat, ch, out, visual, productForm, productVolume, productShapeProfile, productName, productExtra, jobKey: job.input.jobKey });
      if (r?.error) throw new Error(r.error);
      job.stages.imagebrief = { status: 'done', result: r as unknown as ImagebriefResult };
      await save({ stage: 'imagebrief', status: 'done' });
    } catch (e) {
      job.stages.imagebrief = { status: 'failed', error: msg(e) };
      await save({ stage: 'imagebrief', status: 'failed' });
      throw new PipelineJobError('imagebrief', e);
    }
  }

  return job;
}

/** 완주한 job을 ResultScreen 연결용 구조로 조립(1단계 PipelineResult와 동일 형태) */
export function getJobResult(job: JobState): {
  jobId: string;
  dna: Record<string, unknown>;
  strategy: Record<string, unknown>;
  visual?: StrategyResult['visual'];
  sectionCount: number;
  /** 시작 화면에서 고른 분량 — 이걸 넘겨 더한 섹션은 장당 1크레딧 */
  baseSectionCount?: number;
  sections: PipelineSection[];
} | null {
  const sg = job.stages;
  if (sg.strategy.status !== 'done' || sg.structure.status !== 'done' || sg.copy.status !== 'done') return null;

  const strategyRes = sg.strategy.result as StrategyResult;
  const plan: SectionPlan[] = (sg.structure.result as StructureResult).sections;
  const copySections: CopyOut[] = sg.copy.chunks.flatMap(c => c.result ?? []);
  const briefs: Brief[] = (sg.imagebrief.result as ImagebriefResult | undefined)?.briefs ?? [];

  // ★카피 2안(B안) — 청크별 startIndex 기준으로 정렬 배치(일부 청크 B안 실패 시 그 구간만 없음)
  const copyBSections: (CopyOut | undefined)[] = new Array(plan.length);
  for (const c of sg.copy.chunks) {
    (c.resultB ?? []).forEach((s, j) => { copyBSections[c.startIndex + j] = s; });
  }

  const sections: PipelineSection[] = plan.map((p, i) => {
    const c = copySections[i];
    const b = briefs[i];
    const cb = copyBSections[i];
    return {
      num:           String(i + 1),
      name:          c?.name || p.name || `섹션 ${i + 1}`,
      desc:          p.desc,
      role:          p.role,
      mission:       p.mission,
      emotion_goal:  p.emotion_goal,
      writing_style: p.writing_style,
      headline:      c?.headline ?? '',
      subcopy:       c?.subcopy ?? '',
      body:          c?.body ?? '',
      blocks:        c?.blocks,
      altCopy:       cb ? { variant: 'B', headline: cb.headline, subcopy: cb.subcopy, body: cb.body, blocks: cb.blocks } : undefined,
      imageBrief:    b,
      image:         null,
    };
  });

  return {
    jobId: job.jobId,
    dna: strategyRes.dna,
    strategy: strategyRes.strategy,
    visual: strategyRes.visual,
    sectionCount: (sg.structure.result as StructureResult).section_count ?? sections.length,
    sections,
  };
}

/**
 * 자동 재개(page.tsx 진입) 대상 판정 — stale·실패 job이 fresh 세션을 가로채 무한재개·오생성하는 걸 차단.
 *
 * 재개 O: 정상 진행 중(미완료) + 실패 스테이지·청크 없음 + jobKey 보유(구버전 아님).
 * 재개 X(마커 정리 대상):
 *   - jobKey 없음 → 구버전/stale. 재개하면 서버 선차감 멱등키가 흔들려 위험.
 *   - imagebrief done → 이미 완주(재개 불필요).
 *   - 어느 스테이지/카피 청크라도 failed → 실패 지점 보유. 자동 재개 대신 사용자가 처음부터 재시도.
 */
export function isResumableJob(job: JobState | null | undefined): boolean {
  if (!job || !job.input?.jobKey) return false;
  const s = job.stages;
  if (s.imagebrief.status === 'done') return false;
  const anyFailed =
    s.strategy.status === 'failed' ||
    s.structure.status === 'failed' ||
    s.copy.status === 'failed' ||
    s.imagebrief.status === 'failed' ||
    s.copy.chunks.some(c => c.status === 'failed');
  if (anyFailed) return false;
  return true;
}

/** 진행 상태 한 줄 요약(보고/디버깅용) */
export function jobProgressSummary(job: JobState): string {
  const s = job.stages;
  const copy = s.copy.chunks.length
    ? `copy[${s.copy.chunks.map(c => c.status === 'done' ? '✓' : c.status === 'failed' ? '✗' : '·').join('')}]`
    : 'copy[-]';
  return `strategy:${s.strategy.status} structure:${s.structure.status} ${copy} imagebrief:${s.imagebrief.status}`;
}
