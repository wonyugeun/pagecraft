'use client';

import { createJob, runJob, getJobResult, type JobState, type StageCall } from '@/lib/pipelineJob';
import type { PipelineInput } from '@/lib/pipeline';
import type { Section } from '@/store/AppContext';
import { saveJob, getJob } from '@/lib/historyDB';
import { getActiveJobId, setActiveJobId, clearActiveJobId } from '@/lib/activeJob';

/**
 * 클라이언트 측 통합 파이프라인 오케스트레이터(4단계 화면 연결용).
 *
 * - 분할 호출: strategy → structure → copy(청크 16) → imagebrief 를 개별 HTTP로 순차(각 호출 300초 내).
 * - 중간상태: 각 스테이지 완료 시 job을 IndexedDB(jobs 스토어)에 persist. 진행 중 jobId는 마커로 기록.
 * - 재개: resume=true면 마커의 job을 IndexedDB에서 불러와 미완료 스테이지부터 이어감(3단계 runJob 재사용).
 * - 결과: 완주 시 ResultScreen이 읽는 Section[]으로 매핑해 반환. 이미지는 이번 단계 off(자리만).
 *
 * 검증된 스테이지 라우트/로직은 그대로 호출만 한다(변경 없음).
 */

const COPY_CHUNK_SIZE = 16;

const httpCall: StageCall = async (path, body) => {
  // strategy는 max_tokens(1500) 변동으로 가끔 실패 → 오케스트레이터 레벨 재시도(최대 3)
  const attempts = path === '/api/strategy' ? 3 : 1;
  let lastErr: unknown;
  for (let a = 0; a < attempts; a++) {
    try {
      const res = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error || `HTTP ${res.status}`);
      return json;
    } catch (e) {
      lastErr = e;
      if (a === attempts - 1) throw e;
    }
  }
  throw lastErr;
};

export interface ClientProgress { pct: number; label: string; }

/** job 상태 → 진행률(pct) + 한국어 라벨 (멈춘 것처럼 안 보이게) */
export function mapProgress(job: JobState): ClientProgress {
  const s = job.stages;
  if (s.imagebrief.status === 'done') return { pct: 100, label: '완성했어요!' };
  if (s.copy.status === 'done') return { pct: 92, label: '이미지 브리프 준비 중…' };
  if (s.structure.status === 'done') {
    const total = s.copy.total ?? 0;
    const done = s.copy.chunks.filter(c => c.status === 'done').reduce((n, c) => n + c.count, 0);
    if (total > 0) {
      return { pct: 35 + Math.round(52 * (done / total)), label: `카피 작성 중… (${done}/${total} 섹션)` };
    }
    return { pct: 35, label: '카피 작성 준비 중…' };
  }
  if (s.strategy.status === 'done') return { pct: 22, label: '구조 설계 중…' };
  return { pct: 8, label: '전략 분석 중…' };
}

export interface RunClientPipelineOpts {
  resume?: boolean;
  onProgress?: (p: ClientProgress) => void;
  isCancelled?: () => boolean;
}

export interface ClientPipelineResult {
  sections: Section[];
  jobInput: PipelineInput;
  jobId: string;
}

export async function runClientPipeline(
  appInput: PipelineInput,
  opts: RunClientPipelineOpts = {},
): Promise<ClientPipelineResult> {
  const { resume = false, onProgress, isCancelled } = opts;

  // 재개: 마커의 job을 불러옴. 없으면(복구 실패) 신규 생성으로 가지 않고 에러 — 빈 입력 오생성 방지.
  let job: JobState | null = null;
  if (resume) {
    const id = getActiveJobId();
    if (id) { try { job = await getJob<JobState>(id); } catch { job = null; } }
    if (!job) {
      clearActiveJobId();
      throw new Error('이어서 생성할 작업을 찾지 못했어요. 처음부터 다시 시도해주세요.');
    }
  }

  // 신규: job 생성 + 마커 기록 + 첫 저장
  if (!job) {
    job = createJob(appInput);
    setActiveJobId(job.jobId);
    try { await saveJob(job); } catch { /* IndexedDB 불가 환경 — 메모리로만 진행 */ }
  }

  onProgress?.(mapProgress(job));

  await runJob(job, {
    call: httpCall,
    chunkSize: COPY_CHUNK_SIZE,
    onProgress: (j) => { if (!isCancelled?.()) onProgress?.(mapProgress(j)); },
    persist: async (j) => { try { await saveJob(j); } catch { /* no-op */ } },
  });

  // 완주 → 진행 중 마커 제거(이후 재진입 시 자동 재개 대상 아님)
  clearActiveJobId();

  const result = getJobResult(job);
  if (!result) throw new Error('생성 결과 조립에 실패했어요.');

  const v = result.visual;
  const visual = v ? {
    primary_color: v.primary_color, accent_color: v.accent_color,
    soft_color: v.soft_color, soft_border: v.soft_border,
  } : undefined;

  const sections: Section[] = result.sections.map(ps => ({
    num:        ps.num,
    name:       ps.name,
    headline:   ps.headline,
    subcopy:    ps.subcopy || undefined,
    body:       ps.body,                 // 주 카피 원문 그대로(절단·병합 없음)
    imageLabel: ps.imageBrief?.shot_type ? `📸 ${ps.imageBrief.shot_type}` : '📸 이미지 슬롯',
    imageDesc:  ps.imageBrief?.prompt || ps.imageBrief?.mood || '',
    blocks:     ps.blocks,
    bodyFlow:   true,                    // body + blocks 공존 렌더 지시(ResultScreen 분기)
    visual,                              // 제품별 색(전 섹션 동일) — history 저장/복원에도 보존
  }));

  return { sections, jobInput: job.input, jobId: job.jobId };
}
