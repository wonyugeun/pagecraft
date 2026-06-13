import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Stage2 (구조 설계) 프로토타입 — 검증 전용 라우트.
 *
 * Flik 엔진 재설계: 입력 → Stage1(DNA+전략) → Stage2(구조 설계) → 카피 → 이미지.
 * 이 라우트는 Stage1의 출력(dna + strategy)을 받아, 섹션 구조를 "전략 종속"으로
 * 생성한다. 같은 화장품이어도 전략이 다르면 섹션 순서·구성·각 섹션 mission이 달라져야 한다.
 *
 * 기존 recommend-sections와의 차이: 그쪽은 전략 없이 cat·ch·depth로 섹션 "이름"만 뽑음.
 * Stage2는 전략을 물려 섹션마다 "이 제품의 main_weapon을 어느 각도로 미는지"(mission)까지 설계.
 *
 * 검증 전용 — 카피·헤드라인·본문·이미지는 일절 생성하지 않는다.
 * 기존 recommend-sections/generate/categoryPrompts/copyGuards는 수정하지 않는다.
 */

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

/* 섹션 수 기준 — recommend-sections route의 기준값을 그대로 복제(프로토타입 자체 보유).
   하드코딩 산출이 아니라 입력 depth로 분기. */
const DEPTH_BASE: Record<string, { 간결: number; 풍부: number }> = {
  화장품:   { 간결: 16, 풍부: 32 },
  식품:     { 간결: 14, 풍부: 28 },
  패션:     { 간결: 14, 풍부: 26 },
  생활:     { 간결: 12, 풍부: 24 },
  가전:     { 간결: 16, 풍부: 30 },
  반려동물: { 간결: 14, 풍부: 26 },
  스포츠:   { 간결: 14, 풍부: 26 },
  유아:     { 간결: 16, 풍부: 30 },
  자동차:   { 간결: 12, 풍부: 22 },
  건강:     { 간결: 16, 풍부: 32 },
  기타:     { 간결: 12, 풍부: 24 },
};

const CHANNEL_WEIGHT: Record<string, number> = {
  스마트스토어: 1.0,
  와디즈:       1.4,
  자사몰:       0.9,
  쿠팡:         0.5,
};

function normalizeCat(cat: string): string {
  const c = cat?.split('/')[0]?.trim() ?? '';
  return DEPTH_BASE[c] ? c : '기타';
}

function computeTargetCount(cat: string, ch: string, depth: '간결' | '풍부'): number {
  const base = DEPTH_BASE[normalizeCat(cat)][depth];
  const weight = CHANNEL_WEIGHT[ch] ?? 1.0;
  return Math.min(50, Math.max(6, Math.round(base * weight)));
}

interface Dna {
  main_weapon?: string;
  target_customer?: string;
  pain_point?: string;
  buy_reason?: string;
  objection?: string;
  category_type?: string;
}
interface Strategy {
  concept?: string;
  story_flow?: string;
  tone?: string;
  hero_angle?: string;
  cta_angle?: string;
}

export async function POST(req: NextRequest) {
  const { dna, strategy, cat, ch, depth, sectionCount } = await req.json() as {
    dna?: Dna; strategy?: Strategy; cat?: string; ch?: string;
    depth?: '간결' | '풍부'; sectionCount?: number;
  };

  if (!dna || !strategy) {
    return NextResponse.json({ error: 'dna와 strategy(=Stage1 출력)는 필수입니다.' }, { status: 400 });
  }
  const resolvedDepth: '간결' | '풍부' = depth === '풍부' ? '풍부' : '간결';
  const targetCount = sectionCount && sectionCount > 0
    ? Math.min(50, Math.max(6, Math.round(sectionCount)))
    : computeTargetCount(cat ?? '', ch ?? '스마트스토어', resolvedDepth);

  const system = `당신은 대한민국 이커머스 상세페이지 기획자입니다. 카피라이터가 아닙니다.
당신의 임무는 주어진 전략(DNA + 전략)을 받아, 그 전략을 가장 잘 수행하는 섹션 구조를 설계하는 것입니다.

[절대 규칙]
- 카피·헤드라인·본문 문구를 쓰지 마세요. 당신은 섹션 설계만 합니다. (다음 단계의 카피라이터가 각 섹션의 mission을 받아 카피를 씁니다.)
- 전략 종속 설계: strategy.story_flow의 설득 흐름을 섹션 순서로 구현하세요. 예) story_flow가 "문제→원인→진정→회복"이면 섹션 순서가 그 흐름을 따라야 합니다.
- strategy.concept과 hero_angle을 구조 전반에 반영하세요. 첫 섹션(히어로)은 hero_angle 전략을, 마지막 섹션(CTA)은 strategy.cta_angle 전략을 수행해야 합니다.
- 각 섹션의 mission은 "이 섹션이 이 제품의 main_weapon을 어느 각도로 미는지"를 한 줄로 명시하세요. 같은 '성분 섹션'이어도 제품의 main_weapon이 다르면 mission이 달라야 합니다 (일반론 금지, 이 제품 고유의 각도로).
- 전략상 불필요한 섹션은 넣지 말고, 전략을 밀어붙이는 데 필요한 섹션에 집중하세요. 섹션 수는 ${targetCount}개 기준(±2 허용)이되, 채우기용 섹션으로 늘리지 마세요.
- 없는 사실(미입력 수치·성분·인증)을 전제로 한 섹션을 만들지 마세요.

[출력 형식 — 아래 JSON 객체 하나만. 다른 텍스트·설명·마크다운·코드펜스 금지]
{
  "section_count": ${targetCount},
  "sections": [
    { "name": "섹션 이름(12자 이내 역할명)", "role": "이 섹션의 역할", "mission": "이 제품의 전략/main_weapon을 어떤 각도로 수행하는지 한 줄" }
  ]
}`;

  const userPrompt = `아래 전략을 받아 상세페이지 섹션 구조를 설계하세요.

[기본 정보]
- 카테고리: ${cat || '(미입력)'}
- 판매 채널: ${ch || '스마트스토어'}
- 깊이: ${resolvedDepth} (목표 섹션 수 ${targetCount}개)

[DNA]
- main_weapon(가장 강력한 무기): ${dna.main_weapon || '(없음)'}
- target_customer: ${dna.target_customer || '(없음)'}
- pain_point: ${dna.pain_point || '(없음)'}
- buy_reason: ${dna.buy_reason || '(없음)'}
- objection: ${dna.objection || '(없음)'}

[전략]
- concept: ${strategy.concept || '(없음)'}
- story_flow: ${strategy.story_flow || '(없음)'}
- tone: ${strategy.tone || '(없음)'}
- hero_angle: ${strategy.hero_angle || '(없음)'}
- cta_angle: ${strategy.cta_angle || '(없음)'}

위 전략을 섹션 순서와 각 섹션 mission에 반영해 JSON으로 출력하세요.`;

  console.log(`[structure] cat=${cat} ch=${ch} depth=${resolvedDepth} target=${targetCount} weapon=${dna.main_weapon?.slice(0, 30)}`);

  try {
    const message = await client.messages.create({
      model:      'claude-sonnet-4-6',
      max_tokens: 4000,
      system,
      messages:   [{ role: 'user', content: userPrompt }],
    });

    const raw = message.content[0]?.type === 'text' ? message.content[0].text : '';
    console.log(`[structure] stop=${message.stop_reason} in=${message.usage?.input_tokens} out=${message.usage?.output_tokens} len=${raw.length}`);
    if (message.stop_reason === 'max_tokens') {
      throw new Error('응답이 max_tokens(4000)에 도달해 잘렸어요. 섹션 수를 줄여보세요.');
    }

    const first = raw.indexOf('{');
    const last  = raw.lastIndexOf('}');
    if (first === -1 || last === -1 || last < first) {
      console.error(`[structure] JSON 객체 미발견. raw head:\n${raw.slice(0, 500)}`);
      throw new Error('응답에서 JSON 객체를 찾을 수 없음');
    }

    let result: unknown;
    try {
      result = JSON.parse(raw.slice(first, last + 1));
    } catch (parseErr) {
      const pmsg = parseErr instanceof Error ? parseErr.message : String(parseErr);
      console.error(`[structure] JSON.parse 실패: ${pmsg}\nraw:\n${raw.slice(0, 600)}`);
      throw new Error(`JSON 파싱 실패: ${pmsg}`);
    }

    const r = result as { sections?: unknown };
    if (!Array.isArray(r.sections) || r.sections.length === 0) {
      console.error('[structure] sections 배열 누락:', JSON.stringify(result).slice(0, 300));
      throw new Error('출력에 유효한 sections 배열이 없음');
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error('Structure error:', err);
    const msg = err instanceof Error ? err.message : '알 수 없는 오류';
    return NextResponse.json({ error: `구조 설계 중 오류가 발생했어요: ${msg}` }, { status: 500 });
  }
}
