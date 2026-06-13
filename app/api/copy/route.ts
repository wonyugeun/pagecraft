import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';
import { resolveOutputType, OUTPUT_TYPE_LABEL } from '@/lib/outputType';
import { getCategoryConfig, COPY_PRINCIPLES } from '@/lib/categoryPrompts';
import { getCategoryCopyGuard } from '@/lib/copyGuards';

/**
 * Stage3 (카피 생성) 프로토타입 — 검증 전용 라우트.
 *
 * Flik 엔진 재설계: 입력 → Stage1(DNA+전략) → Stage2(구조) → Stage3(카피) → Stage4(이미지).
 * 이 라우트는 Stage1·2의 출력(strategy + sections[mission])을 물려 섹션별 카피를 생성한다.
 *
 * 검증 핵심:
 *  ① 전략+구조를 물린 카피가 기존보다 제품 고유성이 높은가
 *  ② 정답지 v1(화장품 system+sectionGuide) + COPY_PRINCIPLES + copyGuards(화장품법·미입력 사실)가
 *     이 경로에서도 작동하나
 *
 * 이미지 생성·브리프는 없음(Stage4 영역). 기존 generate/categoryPrompts/copyGuards는 읽기 전용.
 * 토큰이 크므로 청크 분할(16섹션 단위)을 처음부터 넣어 최대 50섹션에 대비.
 */

export const maxDuration = 300;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const CHUNK_SIZE = 16;

interface Strategy {
  concept?: string;
  story_flow?: string;
  tone?: string;
  hero_angle?: string;
  cta_angle?: string;
}
interface SectionPlan {
  name?: string;
  role?: string;
  mission?: string;
}
interface CopyOut {
  name: string;
  headline: string;
  subcopy: string;
  body: string;
}

export async function POST(req: NextRequest) {
  const { dna, strategy, sections, cat, ch, out, depth } = await req.json() as {
    dna?: Record<string, unknown>;
    strategy?: Strategy;
    sections?: SectionPlan[];
    cat?: string; ch?: string; out?: string; depth?: string;
  };

  if (!strategy || !Array.isArray(sections) || sections.length === 0) {
    return NextResponse.json({ error: 'strategy와 sections(=Stage2 출력)는 필수입니다.' }, { status: 400 });
  }
  const allSections: SectionPlan[] = sections;

  const category = cat || '화장품';
  const channel  = ch || '스마트스토어';
  const resolvedOut = resolveOutputType(channel, out ?? null);
  const isSlide  = resolvedOut === 'slide';
  const formLabel = isSlide ? '슬라이드형' : '블로그형';

  // 정답지 v1 + 원칙 + 가드 — 기존 모듈에서 읽기만
  const { system, sectionGuide } = getCategoryConfig(category, channel);
  const copyGuard = getCategoryCopyGuard(category);

  const formRule = isSlide
    ? `[출력형태 = 슬라이드형] 이미지가 주인공입니다. headline은 12자 내외로 강하게, subcopy는 1줄, body는 최소화(1~2문장). 한 섹션 = 한 메시지. 비주얼이 말할 수 있는 것은 글로 반복하지 마세요.`
    : `[출력형태 = 블로그형] 글이 설득의 주인공입니다(이미지는 텍스트 없는 사진). headline은 검색 키워드를 머금은 제목형, subcopy 1줄, body는 2~4문장으로 충실하게. 섹션 끝은 다음 섹션으로 자연스럽게 이어지는 흐름.`;

  const strategyBlock = `[이 페이지의 전략 — 모든 섹션 카피가 이 전략을 벗어나면 안 됩니다]
- 컨셉(절대 벗어나지 말 것): ${strategy.concept || '(없음)'}
- 설득 흐름: ${strategy.story_flow || '(없음)'}
- 톤: ${strategy.tone || '(없음)'}
- 히어로 전략(첫 섹션에서 수행): ${strategy.hero_angle || '(없음)'}
- CTA 전략(마지막 섹션에서 수행): ${strategy.cta_angle || '(없음)'}
${dna?.main_weapon ? `- 핵심 무기(main_weapon): ${dna.main_weapon}` : ''}
${dna?.target_customer ? `- 타겟: ${dna.target_customer}` : ''}
${dna?.objection ? `- 구매 망설임(objection): ${dna.objection}` : ''}`;

  // 청크 분할 — 전역 인덱스 유지(첫/마지막 섹션 판별용)
  const chunks: { items: SectionPlan[]; startIdx: number }[] = [];
  for (let i = 0; i < allSections.length; i += CHUNK_SIZE) {
    chunks.push({ items: allSections.slice(i, i + CHUNK_SIZE), startIdx: i });
  }
  console.log(`[copy] cat=${category} ch=${channel} form=${formLabel} sections=${allSections.length} chunks=${chunks.length} guard=${copyGuard.length}chars`);

  async function runChunk(items: SectionPlan[], startIdx: number): Promise<CopyOut[]> {
    const sectionList = items.map((s, j) => {
      const globalIdx = startIdx + j;
      const isFirst = globalIdx === 0;
      const isLast  = globalIdx === allSections.length - 1;
      const tag = isFirst ? ' ★첫 섹션 — hero_angle 전략 수행' : isLast ? ' ★마지막 섹션 — cta_angle 전략 수행' : '';
      return `${globalIdx + 1}. [${s.name || '섹션'}]${tag}
   역할: ${s.role || '(미정)'}
   임무(mission — 이 제품의 main_weapon을 미는 각도, 반드시 카피에 반영): ${s.mission || '(미정)'}`;
    }).join('\n\n');

    const userPrompt = `다음 ${items.length}개 섹션의 카피를 작성하세요. 각 섹션은 아래 임무(mission)를 반드시 카피로 수행해야 합니다.

${strategyBlock}

${formRule}

[작성할 섹션 — 순서·이름 그대로]
${sectionList}

[카테고리 섹션 역할 정답지 — 섹션 이름에 맞는 패턴 적용]
${sectionGuide}

${copyGuard}

${COPY_PRINCIPLES}

[출력 형식] — 다른 텍스트 없이 아래 JSON 배열만 반환하세요. 배열 길이는 정확히 ${items.length}개:
[
  {
    "name": "섹션 이름(입력과 동일)",
    "headline": "헤드라인 카피${isSlide ? ' (12자 내외)' : ' (제목형)'}",
    "subcopy": "서브카피 1줄",
    "body": "본문 카피${isSlide ? ' (1~2문장, 최소화)' : ' (2~4문장)'}"
  }
]`;

    const message = await client.messages.create({
      model:      'claude-sonnet-4-6',
      max_tokens: 8000,
      system,
      messages:   [{ role: 'user', content: userPrompt }],
    });

    const raw = message.content[0]?.type === 'text' ? message.content[0].text : '';
    console.log(`[copy] chunk@${startIdx} stop=${message.stop_reason} out=${message.usage?.output_tokens} len=${raw.length}`);
    if (message.stop_reason === 'max_tokens') {
      throw new Error(`청크(${startIdx}~)가 max_tokens(8000)에 도달해 잘렸어요. 청크 크기를 줄여보세요.`);
    }
    const first = raw.indexOf('[');
    const last  = raw.lastIndexOf(']');
    if (first === -1 || last === -1 || last < first) {
      console.error(`[copy] JSON 배열 미발견 chunk@${startIdx}. raw head:\n${raw.slice(0, 400)}`);
      throw new Error('응답에서 JSON 배열을 찾을 수 없음');
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw.slice(first, last + 1));
    } catch (parseErr) {
      const pmsg = parseErr instanceof Error ? parseErr.message : String(parseErr);
      console.error(`[copy] JSON.parse 실패 chunk@${startIdx}: ${pmsg}\nraw tail:\n${raw.slice(-400)}`);
      throw new Error(`JSON 파싱 실패: ${pmsg}`);
    }
    if (!Array.isArray(parsed)) throw new Error(`JSON이 배열이 아님: ${typeof parsed}`);
    return (parsed as Record<string, unknown>[]).map(s => ({
      name:     typeof s.name === 'string' ? s.name : '',
      headline: typeof s.headline === 'string' ? s.headline : '',
      subcopy:  typeof s.subcopy === 'string' ? s.subcopy : '',
      body:     typeof s.body === 'string' ? s.body : '',
    }));
  }

  try {
    // 청크 순차 처리 — 결과를 순서대로 합침
    const results: CopyOut[] = [];
    for (const c of chunks) {
      const part = await runChunk(c.items, c.startIdx);
      results.push(...part);
    }

    return NextResponse.json({
      sections: results,
      meta: { cat: category, ch: channel, form: formLabel, depth: depth ?? null, count: results.length, outputTypeLabel: OUTPUT_TYPE_LABEL[resolvedOut] },
    });
  } catch (err) {
    console.error('Copy error:', err);
    const msg = err instanceof Error ? err.message : '알 수 없는 오류';
    return NextResponse.json({ sections: [], error: `카피 생성 중 오류가 발생했어요: ${msg}` }, { status: 500 });
  }
}
