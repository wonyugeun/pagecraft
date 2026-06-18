import { runStrategy } from '@/lib/stages/strategy';
import { runStructure, type SectionPlan } from '@/lib/stages/structure';
import { runCopy } from '@/lib/stages/copy';
import { runImagebrief, type Brief } from '@/lib/stages/imagebrief';
import type { Block } from '@/store/AppContext';

/**
 * 엔진 통합 1단계 — 검증 끝난 4스테이지를 순서대로 잇는 통합 파이프라인.
 *
 *   strategy → structure → copy → imagebrief
 *
 * 각 스테이지는 lib/stages/* 의 검증된 함수를 그대로 호출한다(로직 변경 없음, 잇기만).
 * 화면 연결·기존 generate 정리는 이후 단계. 청크분할/가드확장/과금방지 정책도 이후 단계.
 *
 * 이미지(Gemini) 실제 생성은 generateImages 플래그로 on/off하되, 1단계에서는 연결 지점만
 * 준비하고 실제 호출은 하지 않는다(기본 off → 무과금 검증 가능). image 자리는 항상 null로 둔다.
 */

export interface PipelineInput {
  cat?: string;
  ch?: string;
  out?: string | null;
  depth?: '간결' | '풍부';
  productName?: string;
  productExtra?: string;
  sectionCount?: number;
  /** Gemini 이미지 실제 생성 여부. 기본 false(무과금). 1단계에선 연결만 준비. */
  generateImages?: boolean;
}

/** ResultScreen이 읽을 수 있는 통합 섹션 — 구조(plan) + 카피 + 블록 + 이미지 브리프/자리 */
export interface PipelineSection {
  num: string;                 // 1-based 섹션 번호
  name: string;
  role?: string;
  mission?: string;
  emotion_goal?: string;
  writing_style?: string;
  headline: string;
  subcopy: string;
  body: string;
  blocks?: Block[];
  imageBrief?: Brief;          // Stage4 촬영 브리프(ratio/shot_type/mood/palette/props/prompt)
  image: string | null;        // Gemini 결과 자리 — 1단계에선 항상 null
}

export interface PipelineResult {
  dna: Record<string, unknown>;
  strategy: Record<string, unknown>;
  sectionCount: number;
  sections: PipelineSection[];
  meta: {
    cat: string;
    ch: string;
    out: string | null;
    depth: '간결' | '풍부';
    form: string;
    count: number;
    outputTypeLabel: string;
    imagesRequested: boolean;  // 요청 플래그
    imagesGenerated: boolean;  // 실제 생성 여부 — 1단계에선 항상 false
  };
}

export async function runPipeline(input: PipelineInput): Promise<PipelineResult> {
  const {
    cat, ch, out, productName, productExtra, sectionCount,
    depth: rawDepth, generateImages = false,
  } = input;
  const depth: '간결' | '풍부' = rawDepth === '풍부' ? '풍부' : '간결';

  console.log(`[pipeline] ▶ start cat=${cat} ch=${ch} depth=${depth} name=${productName} images=${generateImages}`);

  // 1) Stage1 — DNA + 전략
  const strategy = await runStrategy({ cat, ch, productName, productExtra });

  // 2) Stage2 — 구조 설계(전략 종속)
  const structure = await runStructure({
    dna: strategy.dna, strategy: strategy.strategy, cat, ch, depth, sectionCount,
  });
  const plan: SectionPlan[] = structure.sections;

  // 3) Stage3 — 카피(v5: emotion_goal 우선 + writing_style + Character + 블록)
  const copy = await runCopy({
    dna: strategy.dna, strategy: strategy.strategy, sections: plan, cat, ch, out, depth,
  });

  // 4) Stage4 — 이미지 브리프(촬영 지시문, Gemini 미호출)
  const imagebrief = await runImagebrief({
    dna: strategy.dna, strategy: strategy.strategy, sections: plan, copy: copy.sections, cat, ch, out,
  });

  // 인덱스 정렬 병합 — 구조(plan)를 척추로, 카피·브리프를 같은 순서로 얹는다
  const sections: PipelineSection[] = plan.map((p, i) => {
    const c = copy.sections[i];
    const b = imagebrief.briefs[i];
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
      // 1단계: Gemini 실제 호출은 연결만 준비(미실행). 플래그가 켜져도 자리는 null로 둔다.
      image:         null,
    };
  });

  console.log(`[pipeline] ✓ done sections=${sections.length} (plan=${plan.length} copy=${copy.sections.length} briefs=${imagebrief.briefs.length})`);

  return {
    dna: strategy.dna,
    strategy: strategy.strategy,
    sectionCount: structure.section_count ?? sections.length,
    sections,
    meta: {
      cat: copy.meta.cat,
      ch: copy.meta.ch,
      out: out ?? null,
      depth,
      form: copy.meta.form,
      count: sections.length,
      outputTypeLabel: copy.meta.outputTypeLabel,
      imagesRequested: generateImages,
      imagesGenerated: false,
    },
  };
}
