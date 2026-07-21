import Anthropic from '@anthropic-ai/sdk';

/**
 * Stage2 (구조 설계) — 검증된 프로토타입 로직을 lib으로 추출(통합 파이프라인 공유용).
 * app/api/structure/route.ts 의 핵심 로직을 그대로 옮긴 것. 동작 변경 없음.
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

export interface Dna {
  main_weapon?: string;
  target_customer?: string;
  pain_point?: string;
  buy_reason?: string;
  objection?: string;
  category_type?: string;
  [k: string]: unknown;
}
export interface Strategy {
  concept?: string;
  story_flow?: string;
  tone?: string;
  hero_angle?: string;
  cta_angle?: string;
  [k: string]: unknown;
}

export interface StructureInput {
  dna: Dna;
  strategy: Strategy;
  cat?: string;
  ch?: string;
  depth?: '간결' | '풍부';
  sectionCount?: number;
  /** 사용자가 s7에서 선택/편집한 섹션 이름 목록. 있으면 이 목록(순서·이름·개수)을 '정답지'로 강제. */
  sectionStructure?: string[];
}

export interface SectionPlan {
  name?: string;
  role?: string;
  mission?: string;
  emotion_goal?: string;
  writing_style?: string;
  /** 콘텐츠 디렉터 블록 계획(블로그형) — '글만' 또는 블록 타입 1~2개 + 이유. 카피 청크가 이 계획을 따름 */
  block_plan?: string;
  [k: string]: unknown;
}

export interface StructureResult {
  section_count: number;
  sections: SectionPlan[];
}

export async function runStructure(input: StructureInput): Promise<StructureResult> {
  const { dna, strategy, cat, ch, depth, sectionCount, sectionStructure } = input;

  const resolvedDepth: '간결' | '풍부' = depth === '풍부' ? '풍부' : '간결';
  // 사용자가 s7에서 선택/편집한 섹션 목록이 있으면 그게 '정답지' = 개수·이름·순서 그대로(하한 6 없음, 최소 1).
  const hasExplicitSections = Array.isArray(sectionStructure) && sectionStructure.length > 0;
  const targetCount = hasExplicitSections
    ? Math.min(50, Math.max(1, sectionStructure!.length))
    : sectionCount && sectionCount > 0
      ? Math.min(50, Math.max(1, Math.round(sectionCount)))   // 하한 6 제거 — 지정 개수 그대로(최소 1)
      : computeTargetCount(cat ?? '', ch ?? '스마트스토어', resolvedDepth);

  // 정답지(이름·순서·개수 강제) — 구 엔진 /api/generate 방식 이식. 선택이 있을 때만.
  const sectionBlock = hasExplicitSections
    ? `\n[섹션 구조 — 반드시 아래 순서·이름·개수 그대로 설계하세요. 임의로 변경·추가·삭제하지 마세요. 섹션은 정확히 ${targetCount}개(±0, 더하거나 빼지 말 것). 각 섹션의 name은 아래 이름을 그대로 쓰고, role·mission·emotion_goal·writing_style만 이 제품 전략에 맞게 채우세요]\n${sectionStructure!.map((s, i) => `${i + 1}. ${s}`).join('\n')}\n`
    : '';

  const system = `당신은 대한민국 이커머스 상세페이지 기획자입니다. 카피라이터가 아닙니다.
당신의 임무는 주어진 전략(DNA + 전략)을 받아, 그 전략을 가장 잘 수행하는 섹션 구조를 설계하는 것입니다.

[절대 규칙]
- 카피·헤드라인·본문 문구를 쓰지 마세요. 당신은 섹션 설계만 합니다. (다음 단계의 카피라이터가 각 섹션의 mission을 받아 카피를 씁니다.)
- 전략 종속 설계: strategy.story_flow의 설득 흐름을 섹션 순서로 구현하세요. 예) story_flow가 "문제→원인→진정→회복"이면 섹션 순서가 그 흐름을 따라야 합니다.
- strategy.concept과 hero_angle을 구조 전반에 반영하세요. 첫 섹션(히어로)은 hero_angle 전략을, 마지막 섹션(CTA)은 strategy.cta_angle 전략을 수행해야 합니다.
- 각 섹션의 mission은 "이 섹션이 이 제품의 main_weapon을 어느 각도로 미는지"를 한 줄로 명시하세요. 같은 '성분 섹션'이어도 제품의 main_weapon이 다르면 mission이 달라야 합니다 (일반론 금지, 이 제품 고유의 각도로).
- 각 섹션마다 emotion_goal을 정하세요: 그 섹션을 다 읽은 독자가 속으로 느껴야 할 감정·생각을 독자의 1인칭 속마음 한 문장으로 적습니다. mission(설계자 관점의 임무)과 달리 emotion_goal은 독자가 실제로 느낄 결과입니다. (예: 공감='아 맞아, 딱 내 얘기네' / 원인='아, 문제가 성분이었구나' / CTA='이 정도면 한번 써볼 만하겠다') 다음 단계 카피라이터가 이 emotion_goal을 "달성"하는 카피를 씁니다.
- 각 섹션마다 writing_style을 정하세요: 그 섹션을 "어떤 말하는 방식"으로 쓸지 한 줄로 지정합니다. 섹션 역할에 가장 맞는 문체를 고르세요. 가이드(절대 규칙 아님, 역할 보고 선택): 공감→'친구가 말하듯(질문·대화체)', 원인→'원인 분석형(논리로 깨달음 유도)', 솔루션→'선언형(짧고 강한 문장)', 성분→'스토리텔링형(왜 넣었는지)', 비교→'비교 분석형', 후기→'실사용자 대화체', FAQ→'Q&A형', 가성비→'계산형(숫자 중심)', CTA→'결정 유도형(부담 제거)'. 섹션마다 문체가 변주되어 페이지에 리듬이 생기도록 하되, 모든 문체는 다음 단계에서 브랜드 톤(strategy.tone) 위에 얹힙니다.
- 전략상 불필요한 섹션은 넣지 말고, 전략을 밀어붙이는 데 필요한 섹션에 집중하세요. ${hasExplicitSections ? `섹션은 아래 사용자 지정 목록의 순서·이름·개수를 정확히 ${targetCount}개로 따르세요(±0, 임의 추가·삭제 금지).` : `섹션 수는 ${targetCount}개 기준(±2 허용)이되, 채우기용 섹션으로 늘리지 마세요.`}
- 없는 사실(미입력 수치·성분·인증)을 전제로 한 섹션을 만들지 마세요.
- 당신은 콘텐츠 디렉터로서 각 섹션의 block_plan(본문 시각 블록 계획, 블로그형에서 사용)도 설계합니다. 선택지: '글만'(블록 없이 순수 글) 또는 checklist·steps·iconcards·stats·compare·quote·faq·heading 중 1~2개.
  · 페이지 전체 리듬을 설계하세요: 전체 섹션 중 1~2개는 반드시 '글만'으로 두어 읽는 호흡을 만들고, 블록은 그 섹션 내용이 '표·카드·리스트로 봐야 더 설득되는' 경우에만 배정하세요.
  · 같은 블록 타입을 연속 섹션에 배정하지 말고, 페이지 전체에서 같은 타입은 최대 2회.
  · 첫(히어로) 섹션도 반드시 카드일 필요 없습니다 — 이 제품 전략에 맞는 첫인상(수치 카드·강한 선언 글·체크리스트 등)을 직접 고르세요.
  · 이 제품만의 구조가 드러나야 합니다. 어떤 제품이든 똑같은 블록 배치가 나오면 실패입니다. (예: 품종·비교가 무기면 compare, 수치가 무기면 stats, 감정 서사가 무기면 '글만')

[출력 형식 — 아래 JSON 객체 하나만. 다른 텍스트·설명·마크다운·코드펜스 금지]
{
  "section_count": ${targetCount},
  "sections": [
    { "name": "섹션 이름(12자 이내 역할명)", "role": "이 섹션의 역할", "mission": "이 제품의 전략/main_weapon을 어떤 각도로 수행하는지 한 줄", "emotion_goal": "이 섹션을 읽고 독자가 속으로 느껴야 할 한 문장 (독자의 1인칭 속마음)", "writing_style": "이 섹션을 쓸 말하는 방식 한 줄 (예: 친구가 말하듯 질문·대화체 / 선언형 짧고 강한 문장 / 계산형 숫자 중심 등)", "block_plan": "'글만' 또는 블록 타입 1~2개 + 선택 이유 한 마디 (예: 'compare — 일반 품종과 식감 차이가 설득 핵심')" }
  ]
}`;

  const userPrompt = `아래 전략을 받아 상세페이지 섹션 구조를 설계하세요.

[기본 정보]
- 카테고리: ${cat || '(미입력)'}
- 판매 채널: ${ch || '스마트스토어'}
- 깊이: ${resolvedDepth} (목표 섹션 수 ${targetCount}개)
${sectionBlock}

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

  const message = await client.messages.create({
    model:      'claude-sonnet-4-6',
    max_tokens: 8000,
    system,
    messages:   [{ role: 'user', content: userPrompt }],
  });

  const raw = message.content[0]?.type === 'text' ? message.content[0].text : '';
  console.log(`[structure] stop=${message.stop_reason} in=${message.usage?.input_tokens} out=${message.usage?.output_tokens} len=${raw.length}`);
  if (message.stop_reason === 'max_tokens') {
    throw new Error('응답이 max_tokens(8000)에 도달해 잘렸어요. 섹션 수를 줄여보세요.');
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

  // 정답지가 있으면 과생성(=과금 방향) 안전망: 정확히 targetCount개로 자른다. 이름은 사용자 지정대로 강제.
  if (hasExplicitSections) {
    const sliced = (r.sections as SectionPlan[]).slice(0, targetCount).map((s, i) => ({
      ...s,
      name: sectionStructure![i] ?? s.name,   // 이름은 사용자 선택 그대로(AI가 바꿔도 교정)
    }));
    return { section_count: sliced.length, sections: sliced };
  }

  return result as StructureResult;
}
