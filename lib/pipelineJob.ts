import type { StrategyResult } from '@/lib/stages/strategy';
import type { StructureResult, SectionPlan } from '@/lib/stages/structure';
import type { CopyOut, StrategySummary } from '@/lib/stages/copy';
import type { ImagebriefResult, Brief } from '@/lib/stages/imagebrief';
import type { PipelineInput, PipelineSection } from '@/lib/pipeline';

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

const COPY_CHUNK_SIZE_DEFAULT = 16;
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
  const { cat, ch, out, depth, productName, productExtra, sectionCount } = job.input;

  const save = async (ev: ProgressEvent) => {
    onProgress?.(job, ev);
    await persist?.(job);
  };

  // ── 1) strategy ──
  if (job.stages.strategy.status === 'done') {
    await save({ stage: 'strategy', status: 'done', skipped: true });
  } else {
    try {
      const r = await call('/api/strategy', { cat, ch, productName, productExtra });
      if (r?.error) throw new Error(r.error);
      job.stages.strategy = { status: 'done', result: r as unknown as StrategyResult };
      await save({ stage: 'strategy', status: 'done' });
    } catch (e) {
      job.stages.strategy = { status: 'failed', error: msg(e) };
      await save({ stage: 'strategy', status: 'failed' });
      throw new PipelineJobError('strategy', e);
    }
  }
  const { dna, strategy } = job.stages.strategy.result as StrategyResult;

  // ── 2) structure ──
  if (job.stages.structure.status === 'done') {
    await save({ stage: 'structure', status: 'done', skipped: true });
  } else {
    try {
      const r = await call('/api/structure', { dna, strategy, cat, ch, depth, sectionCount });
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
    for (let i = 0; i < plan.length; i += size) {
      job.stages.copy.chunks.push({ status: 'pending', startIndex: i, count: Math.min(size, plan.length - i) });
    }
    await save({ stage: 'copy', status: 'pending' });
  }
  const ss = job.stages.copy.strategySummary as StrategySummary;
  const total = job.stages.copy.total as number;

  for (const chunk of job.stages.copy.chunks) {
    if (chunk.status === 'done') {
      await save({ stage: 'copy', status: 'done', chunkStartIndex: chunk.startIndex, skipped: true });
      continue;
    }
    try {
      const r = await call('/api/copy', {
        strategySummary: ss,
        sections: plan.slice(chunk.startIndex, chunk.startIndex + chunk.count),
        startIndex: chunk.startIndex,
        totalSections: total,
        cat, ch, out, depth,
      });
      if (r?.error) throw new Error(r.error);
      chunk.status = 'done';
      chunk.result = (r.sections as CopyOut[]) ?? [];
      chunk.error = undefined;
      await save({ stage: 'copy', status: 'done', chunkStartIndex: chunk.startIndex });
    } catch (e) {
      chunk.status = 'failed';
      chunk.error = msg(e);
      job.stages.copy.status = 'failed';
      await save({ stage: 'copy', status: 'failed', chunkStartIndex: chunk.startIndex });
      throw new PipelineJobError(`copy@${chunk.startIndex}`, e);
    }
  }
  job.stages.copy.status = 'done';

  // ── 4) imagebrief ──
  if (job.stages.imagebrief.status === 'done') {
    await save({ stage: 'imagebrief', status: 'done', skipped: true });
  } else {
    const copySections = job.stages.copy.chunks.flatMap(c => c.result ?? []);
    try {
      const r = await call('/api/imagebrief', { dna, strategy, sections: plan, copy: copySections, cat, ch, out });
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
  sections: PipelineSection[];
} | null {
  const sg = job.stages;
  if (sg.strategy.status !== 'done' || sg.structure.status !== 'done' || sg.copy.status !== 'done') return null;

  const strategyRes = sg.strategy.result as StrategyResult;
  const plan: SectionPlan[] = (sg.structure.result as StructureResult).sections;
  const copySections: CopyOut[] = sg.copy.chunks.flatMap(c => c.result ?? []);
  const briefs: Brief[] = (sg.imagebrief.result as ImagebriefResult | undefined)?.briefs ?? [];

  const sections: PipelineSection[] = plan.map((p, i) => {
    const c = copySections[i];
    const b = briefs[i];
    return {
      num:           String(i + 1),
      name:          c?.name || p.name || `섹션 ${i + 1}`,
      role:          p.role,
      mission:       p.mission,
      emotion_goal:  p.emotion_goal,
      writing_style: p.writing_style,
      headline:      c?.headline ?? '',
      subcopy:       c?.subcopy ?? '',
      body:          c?.body ?? '',
      blocks:        c?.blocks,
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

/** 진행 상태 한 줄 요약(보고/디버깅용) */
export function jobProgressSummary(job: JobState): string {
  const s = job.stages;
  const copy = s.copy.chunks.length
    ? `copy[${s.copy.chunks.map(c => c.status === 'done' ? '✓' : c.status === 'failed' ? '✗' : '·').join('')}]`
    : 'copy[-]';
  return `strategy:${s.strategy.status} structure:${s.structure.status} ${copy} imagebrief:${s.imagebrief.status}`;
}
