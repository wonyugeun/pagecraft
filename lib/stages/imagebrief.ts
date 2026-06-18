import Anthropic from '@anthropic-ai/sdk';
import { resolveOutputType, OUTPUT_TYPE_LABEL } from '@/lib/outputType';
import { aspectRatioFor } from '@/lib/sectionAspect';
import { buildImagePromptRules } from '@/lib/imagePromptRules';

/**
 * Stage4 (이미지 브리프 생성) — 검증된 프로토타입 로직을 lib으로 추출(통합 파이프라인 공유용).
 * app/api/imagebrief/route.ts 의 핵심 로직을 그대로 옮긴 것. 동작 변경 없음.
 * 실제 Gemini 이미지 생성은 하지 않는다(브리프 JSON만). ratio는 코드에서 확정(9:16 원천 차단).
 */

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const CHUNK_SIZE = 16;

interface Strategy {
  concept?: string;
  story_flow?: string;
  tone?: string;
  hero_angle?: string;
  cta_angle?: string;
  [k: string]: unknown;
}
interface SectionPlan { name?: string; role?: string; mission?: string }
interface CopyItem { name?: string; headline?: string; subcopy?: string; body?: string }

export interface Brief {
  section: string;
  ratio: string;
  shot_type: string;
  mood: string;
  palette: string;
  props: string;
  prompt: string;
}

export interface ImagebriefInput {
  dna?: Record<string, unknown>;
  strategy: Strategy;
  sections: SectionPlan[];
  copy?: CopyItem[];
  cat?: string;
  ch?: string;
  out?: string | null;
}

export interface ImagebriefResult {
  briefs: Brief[];
  meta: { cat: string; ch: string; out: string; outputTypeLabel: string; count: number };
}

export async function runImagebrief(input: ImagebriefInput): Promise<ImagebriefResult> {
  const { dna, strategy, sections, copy, cat, ch, out } = input;
  const plan: SectionPlan[] = sections;

  const category = cat || '화장품';
  const channel  = ch || '스마트스토어';
  const resolvedOut = resolveOutputType(channel, out ?? null);
  const isBlogOutput = resolvedOut === 'blog';

  // 기존 이미지 규칙 — 인물 금지/제품 일관성/구성품 폴백/9:16 금지/영문/블로그 텍스트 금지
  const imageRules = buildImagePromptRules(category, isBlogOutput);

  // 섹션별 ratio를 코드에서 확정 (sectionAspect 규칙, 9:16 절대 없음)
  const ratioByIdx = plan.map(s => aspectRatioFor(s.name));

  const strategyBlock = `[이 페이지의 전략 — 이미지 무드·색조가 이 톤을 일관되게 따라야 합니다]
- 컨셉: ${strategy.concept || '(없음)'}
- 톤(이미지 mood/palette로 번역): ${strategy.tone || '(없음)'}
- 설득 흐름: ${strategy.story_flow || '(없음)'}
${dna?.main_weapon ? `- 핵심 무기: ${dna.main_weapon}` : ''}`;

  const formNote = isBlogOutput
    ? '이 페이지는 블로그형입니다 — 이미지는 텍스트 오버레이가 없는 깨끗한 사진이어야 합니다. prompt에 카피 문구·타이포그래피·숫자 오버레이를 절대 묘사하지 마세요(제품 자체 라벨은 reference 그대로).'
    : '이 페이지는 슬라이드형입니다 — 이미지 위 텍스트 합성이 허용됩니다. 단 카피 원문을 그대로 넣지 말고, 합성 가능한 영역(negative space)을 prompt에 확보하세요.';

  console.log(`[imagebrief] cat=${category} ch=${channel} out=${resolvedOut} sections=${plan.length} ratios=${JSON.stringify(ratioByIdx)}`);

  const chunks: { items: SectionPlan[]; startIdx: number }[] = [];
  for (let i = 0; i < plan.length; i += CHUNK_SIZE) {
    chunks.push({ items: plan.slice(i, i + CHUNK_SIZE), startIdx: i });
  }

  async function runChunk(items: SectionPlan[], startIdx: number): Promise<Brief[]> {
    const sectionList = items.map((s, j) => {
      const gi = startIdx + j;
      const c = copy?.[gi];
      return `${gi + 1}. 섹션명: ${s.name || '섹션'}
   역할: ${s.role || '(미정)'}
   임무(mission): ${s.mission || '(미정)'}
   ${c?.headline ? `카피 맥락(헤드라인, 이미지에 텍스트로 넣지 말 것): ${c.headline}` : ''}
   고정 비율(ratio, 변경 금지): ${ratioByIdx[gi]}`;
    }).join('\n\n');

    const userPrompt = `당신은 화장품 상세페이지의 이미지 아트디렉터입니다. 아래 ${items.length}개 섹션 각각에 대해, Gemini 이미지 모델에 보낼 "촬영 브리프"를 작성하세요.

${strategyBlock}

[형태 규칙] ${formNote}

${imageRules}

[작성할 섹션]
${sectionList}

[브리프 작성 지침]
- shot_type: 제품컷/연출컷/원료컷/텍스처/사용장면(피부 클로즈업, 얼굴 없음) 등 섹션 역할에 맞는 촬영 유형(한국어 한 단어~짧은 구).
- mood: 위 전략 tone을 영문 무드 키워드로 번역(페이지 전체가 일관되게).
- palette: 전략·제품에 맞는 영문 색조.
- props: 비제품 소품만(식물·물방울·돌·천·트레이 등). reference에 없는 화장품 용기·공병·구성품(패드·파우치 등)은 절대 넣지 마세요.
- prompt: 위를 종합한 영문 이미지 프롬프트. 형식은 "<natural English scene, 1~2 sentences> | shot: ..., light: ..., mood: ..., palette: ..., props: ..., surface: ...". 인물/얼굴/모델 금지, 제품을 중심에 두고 모든 섹션에서 제품 형태·라벨 일관 유지. "portrait/vertical/9:16/tall" 등 비율 표현 금지.

[출력 형식] — 다른 텍스트 없이 JSON 배열만, 길이 정확히 ${items.length}개:
[
  { "section": "섹션명(입력과 동일)", "shot_type": "...", "mood": "...(영문)", "palette": "...(영문)", "props": "...", "prompt": "...(영문, 위 형식)" }
]`;

    const message = await client.messages.create({
      model:      'claude-sonnet-4-6',
      max_tokens: 8000,
      messages:   [{ role: 'user', content: userPrompt }],
    });

    const raw = message.content[0]?.type === 'text' ? message.content[0].text : '';
    console.log(`[imagebrief] chunk@${startIdx} stop=${message.stop_reason} out=${message.usage?.output_tokens} len=${raw.length}`);
    if (message.stop_reason === 'max_tokens') {
      throw new Error(`청크(${startIdx}~)가 max_tokens(8000)에 도달해 잘렸어요.`);
    }
    const first = raw.indexOf('[');
    const last  = raw.lastIndexOf(']');
    if (first === -1 || last === -1 || last < first) {
      console.error(`[imagebrief] JSON 배열 미발견 chunk@${startIdx}. raw head:\n${raw.slice(0, 400)}`);
      throw new Error('응답에서 JSON 배열을 찾을 수 없음');
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw.slice(first, last + 1));
    } catch (parseErr) {
      const pmsg = parseErr instanceof Error ? parseErr.message : String(parseErr);
      console.error(`[imagebrief] JSON.parse 실패 chunk@${startIdx}: ${pmsg}\nraw tail:\n${raw.slice(-400)}`);
      throw new Error(`JSON 파싱 실패: ${pmsg}`);
    }
    if (!Array.isArray(parsed)) throw new Error(`JSON이 배열이 아님: ${typeof parsed}`);

    // ratio는 코드에서 확정한 값으로 덮어씀(모델 응답 신뢰하지 않음 → 9:16 원천 차단)
    return (parsed as Record<string, unknown>[]).map((s, j) => ({
      section:   typeof s.section === 'string' ? s.section : (items[j]?.name ?? ''),
      ratio:     ratioByIdx[startIdx + j],
      shot_type: typeof s.shot_type === 'string' ? s.shot_type : '',
      mood:      typeof s.mood === 'string' ? s.mood : '',
      palette:   typeof s.palette === 'string' ? s.palette : '',
      props:     typeof s.props === 'string' ? s.props : '',
      prompt:    typeof s.prompt === 'string' ? s.prompt : '',
    }));
  }

  const briefs: Brief[] = [];
  for (const c of chunks) {
    const part = await runChunk(c.items, c.startIdx);
    briefs.push(...part);
  }

  return {
    briefs,
    meta: { cat: category, ch: channel, out: resolvedOut, outputTypeLabel: OUTPUT_TYPE_LABEL[resolvedOut], count: briefs.length },
  };
}
