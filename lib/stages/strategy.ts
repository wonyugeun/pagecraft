import Anthropic from '@anthropic-ai/sdk';
import { universalFactGuard } from '@/lib/copyGuards';

/**
 * Stage1 (DNA + 전략) — 검증된 프로토타입 로직을 lib으로 추출(통합 파이프라인 공유용).
 * app/api/strategy/route.ts 의 핵심 로직을 그대로 옮긴 것. 동작 변경 없음.
 * 라우트는 이 함수를 호출하는 얇은 래퍼가 된다.
 */

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface StrategyInput {
  cat?: string;
  ch?: string;
  productName?: string;
  productExtra?: string;
}

export interface StrategyResult {
  dna: Record<string, unknown>;
  strategy: Record<string, unknown>;
}

const SYSTEM = `당신은 이커머스 상품 분석가 겸 상세페이지 전략가입니다. 카피라이터가 아닙니다.
당신의 임무는 셀러가 입력한 상품 정보를 분석해, 이 제품의 DNA(본질)와 상세페이지 설득 전략을 도출하는 것입니다.

[절대 규칙]
- 카피·헤드라인·섹션 문구·본문을 쓰지 마세요. 당신은 전략만 출력합니다. (다음 단계의 카피라이터가 이 전략을 받아 카피를 씁니다.)
- main_weapon(가장 강력한 무기)은 입력 정보에 실재하는 것에서만 도출하세요. 셀러가 입력하지 않은 수치·성분·인증·이력을 무기로 만들어내지 마세요.
- 같은 카테고리의 제품이라도 이 제품만의 차별점·성분·기타 요청사항을 최우선 재료로 삼아, 제품마다 분명히 다른 전략이 나오도록 분석하세요. 카테고리 일반론으로 뭉뚱그리지 마세요.
- 입력에 "기타 요청사항"(셀러의 의도)이 있으면, 그것을 전략의 1순위 입력으로 반영하세요.

${universalFactGuard}

[출력 형식 — 아래 JSON 객체 하나만 출력. 다른 텍스트·설명·마크다운·코드펜스 금지]
{
  "dna": {
    "main_weapon": "이 제품의 가장 강력한 무기 한 가지 (입력 정보에서 도출, 없는 사실 생성 금지)",
    "target_customer": "누가 사는가",
    "pain_point": "해결하려는 문제",
    "target_desire": "이 고객이 진짜 원하는 것 / 욕망 (제품 너머의 이상적 상태)",
    "target_fear": "이 고객이 가장 두려워하는 것 / 구매를 막는 공포",
    "buy_reason": "실제 구매 이유",
    "objection": "구매 전 망설임",
    "category_type": "카테고리"
  },
  "strategy": {
    "concept": "상세페이지 전체 컨셉 한 줄",
    "story_flow": "설득 흐름 (예: 문제→원인→진정→회복)",
    "tone": "전문가형/신뢰형/감성형/데이터형 중",
    "hero_angle": "첫 화면 핵심 전략",
    "cta_angle": "마지막 구매 유도 전략"
  }
}`;

export async function runStrategy(input: StrategyInput): Promise<StrategyResult> {
  const { cat, ch, productName, productExtra } = input;

  const userPrompt = `다음 상품 정보를 분석해 DNA와 전략 JSON을 출력하세요.

[상품 정보]
- 카테고리: ${cat || '(미입력)'}
- 판매 채널: ${ch || '(미입력)'}
- 상품명: ${productName || '(미입력)'}
${productExtra ? `\n[상세 정보 — 차별점·성분·기타 요청사항 등이 포함됨. "기타 요청사항:" 라인이 있으면 전략의 1순위로 반영하세요]\n${productExtra}\n` : '\n(상세 정보 미입력 — 상품명·카테고리만으로 분석하되, 없는 사실을 지어내지 마세요)\n'}`;

  console.log(`[strategy] cat=${cat} ch=${ch} name=${productName} extraLen=${productExtra?.length ?? 0}`);

  // 출력(dna 8필드 + strategy 5필드)이 1500을 가끔 초과해 JSON이 잘리던 문제 → 한도 상향.
  // strategy는 1회 호출이라 토큰 비용 부담이 작다. 프롬프트·전략 내용은 변경하지 않는다.
  const MAX_TOKENS = 4000;
  const MAX_ATTEMPTS = 2; // 원호출 + 잘림/파싱실패 시 1회 자동 재시도

  async function runOnce(attempt: number): Promise<StrategyResult> {
    const message = await client.messages.create({
      model:      'claude-sonnet-4-6',
      max_tokens: MAX_TOKENS,
      system:     SYSTEM,
      messages:   [{ role: 'user', content: userPrompt }],
    });

    const raw = message.content[0]?.type === 'text' ? message.content[0].text : '';
    console.log(`[strategy] attempt=${attempt} stop_reason=${message.stop_reason} input=${message.usage?.input_tokens} output=${message.usage?.output_tokens} raw_len=${raw.length}`);
    if (message.stop_reason === 'max_tokens') {
      throw new Error(`응답이 max_tokens(${MAX_TOKENS})에 도달해 잘렸어요.`);
    }

    // 객체 하나만 추출 — 첫 '{'부터 마지막 '}'까지
    const first = raw.indexOf('{');
    const last  = raw.lastIndexOf('}');
    if (first === -1 || last === -1 || last < first) {
      console.error(`[strategy] JSON 객체 미발견. raw head:\n${raw.slice(0, 500)}`);
      throw new Error('응답에서 JSON 객체를 찾을 수 없음');
    }

    let result: unknown;
    try {
      result = JSON.parse(raw.slice(first, last + 1));
    } catch (parseErr) {
      const pmsg = parseErr instanceof Error ? parseErr.message : String(parseErr);
      console.error(`[strategy] JSON.parse 실패: ${pmsg}\nraw:\n${raw.slice(0, 600)}`);
      throw new Error(`JSON 파싱 실패: ${pmsg}`);
    }

    const r = result as { dna?: unknown; strategy?: unknown };
    if (!r.dna || !r.strategy) {
      console.error('[strategy] dna/strategy 필드 누락:', JSON.stringify(result).slice(0, 300));
      throw new Error('출력에 dna 또는 strategy 필드가 없음');
    }

    return result as StrategyResult;
  }

  // 잘림(stop_reason=max_tokens)·JSON 파싱 실패 시 1회 자동 재시도. 재시도도 실패하면 마지막 에러 전파.
  let lastErr: unknown;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      return await runOnce(attempt);
    } catch (e) {
      lastErr = e;
      if (attempt < MAX_ATTEMPTS) {
        console.warn(`[strategy] 시도 ${attempt} 실패(${e instanceof Error ? e.message : String(e)}) → 재시도`);
      }
    }
  }
  throw lastErr;
}
