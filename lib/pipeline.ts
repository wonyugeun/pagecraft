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
  /** 사용자가 s7에서 선택/편집한 섹션 이름 목록(순서·이름·개수). 있으면 structure가 이 목록을 '정답지'로 강제. */
  sectionStructure?: string[];
  /** ★레퍼런스 스타일 힌트(2026-07-21) — s5-5 분석의 톤·헤드라인 패턴·강조 포인트 요약.
   *  strategy의 tone·hero_angle 결정에 '스타일 참고'로만 주입(사실·성분·수치 출처 아님). */
  referenceStyle?: string;
  /** 파이프라인 로직엔 쓰이지 않으나 job에 보관해 재개 시 작업기록 저장에 사용(타입 라벨) */
  type?: string;
  /** ★크레딧 멱등키(P0) — 생성 1회 1키. strategy 선차감·structure 결제 검증에 사용.
   *  job 상태에 영속되므로 재시도·재개(resume)는 자동으로 같은 키 유지 = 이중 차감 없음. */
  jobKey?: string;
  /** Gemini 이미지 실제 생성 여부. 기본 false(무과금). 1단계에선 연결만 준비. */
  generateImages?: boolean;
  /** Physical Size Engine 입력(선택) — 제품 형태/용량/실루엣 → imagebrief에서 실물 크기 지시로 변환 */
  productForm?: string;
  productVolume?: string;
  productShapeProfile?: string;
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
  altCopy?: AltCopy;           // ★블로그형 카피 2안(B안·감성형) — 없으면 단일 안
  imageBrief?: Brief;          // Stage4 촬영 브리프(ratio/shot_type/mood/palette/props/prompt)
  image: string | null;        // Gemini 결과 자리 — 1단계에선 항상 null
}

/** 블로그형 카피 2안 — variant는 이 묶음이 어떤 안인지(현재 파이프라인은 항상 'B'=감성형) */
export interface AltCopy {
  variant: 'A' | 'B';
  headline: string;
  subcopy?: string;
  body: string;
  blocks?: Block[];
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

  // 2) Stage2 — 구조 설계(전략 종속). sectionStructure 있으면 그 목록을 정답지로 강제.
  const structure = await runStructure({
    dna: strategy.dna, strategy: strategy.strategy, cat, ch, depth, sectionCount, sectionStructure: input.sectionStructure,
  });
  const plan: SectionPlan[] = structure.sections;

  // 3) Stage3 — 카피(v5: emotion_goal 우선 + writing_style + Character + 블록)
  const copy = await runCopy({
    dna: strategy.dna, strategy: strategy.strategy, sections: plan, cat, ch, out, depth,
    knownFacts: [productName, productExtra].filter(Boolean).join('\n'),   // 셀러 원입력 — 후처리 날조 그물 기준
  });

  // 4) Stage4 — 이미지 브리프(촬영 지시문, Gemini 미호출)
  const imagebrief = await runImagebrief({
    dna: strategy.dna, strategy: strategy.strategy, sections: plan, copy: copy.sections, cat, ch, out,
    visual: strategy.visual,   // 페이지 공통 팔레트(Stage1 큐레이션) — 전 섹션 색·조명 통일
    productForm: input.productForm, productVolume: input.productVolume, productShapeProfile: input.productShapeProfile,
    productName, productExtra,   // ★Product Understanding — 식품(원물) 물리 특징 블록 생성용
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
