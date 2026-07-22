import Anthropic from '@anthropic-ai/sdk';
import { universalFactGuard } from '@/lib/copyGuards';
import { resolveVisual, type Visual } from '@/lib/visualPalette';

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
  /** ★레퍼런스 스타일 힌트(s5-5 분석) — 톤·헤드라인 패턴·강조 포인트 요약. 스타일 참고 전용(사실 출처 아님) */
  referenceStyle?: string;
}

export interface StrategyResult {
  dna: Record<string, unknown>;
  strategy: Record<string, unknown>;
  visual?: Visual;
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
  },
  "visual": {
    "palette": "이 제품에 가장 어울리는 색 팔레트 키 하나만 — green|blue|yellow|pink|brown|purple|gray 중. ⭐1순위 기준은 '제품 실물의 색'입니다: 상세페이지 사진 속 제품·재료와 나란히 놓였을 때 어울려야 하므로, 제품 자체가 띠는 색조를 먼저 따르세요 (예: 곡물·오트·그래놀라·견과·빵·커피는 실물이 베이지·갈색이므로 '건강 식품'이어도 green이 아니라 brown). 실물 색이 애매할 때만 무드 기준: 병풀·자연·진정→green, 청량·수분·기술→blue, 비타민·활력→yellow, 뷰티·부드러움→pink, 내추럴·따뜻→brown, 프리미엄·럭셔리→purple, 미니멀·테크→gray. hex를 직접 쓰지 말고 키만 고르세요.",
    "mood": "비주얼 분위기 한 단어 (clean/warm/natural/bold/soft 등)"
  }
}`;

export async function runStrategy(input: StrategyInput): Promise<StrategyResult> {
  const { cat, ch, productName, productExtra, referenceStyle } = input;

  const userPrompt = `다음 상품 정보를 분석해 DNA와 전략 JSON을 출력하세요.

[상품 정보]
- 카테고리: ${cat || '(미입력)'}
- 판매 채널: ${ch || '(미입력)'}
- 상품명: ${productName || '(미입력)'}
${productExtra ? `\n[상세 정보 — 차별점·성분·기타 요청사항 등이 포함됨. "기타 요청사항:" 라인이 있으면 전략의 1순위로 반영하세요]\n${productExtra}\n` : '\n(상세 정보 미입력 — 상품명·카테고리만으로 분석하되, 없는 사실을 지어내지 마세요)\n'}${referenceStyle ? `\n[셀러가 참고한 레퍼런스 페이지의 스타일 분석 — ⚠️스타일 힌트로만 참고하세요. 사실·성분·수치의 출처가 아니며, 여기 있는 표현을 근거로 새 사실을 만들지 마세요. tone·hero_angle 결정에 참고하되, 이 제품 고유의 차별점이 항상 우선입니다]\n${referenceStyle}\n` : ''}`;

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

    const r = result as { dna?: unknown; strategy?: unknown; visual?: { palette?: unknown; mood?: unknown } };
    if (!r.dna || !r.strategy) {
      console.error('[strategy] dna/strategy 필드 누락:', JSON.stringify(result).slice(0, 300));
      throw new Error('출력에 dna 또는 strategy 필드가 없음');
    }

    // 색상: AI가 고른 palette 키로 hex를 코드가 채움(자유 hex 생성 금지 → 촌스러움 방지). 키 없으면 purple 폴백.
    const out = result as StrategyResult;
    out.visual = resolveVisual(r.visual?.palette, r.visual?.mood);
    console.log(`[strategy] visual palette=${out.visual.palette} mood=${out.visual.mood} primary=${out.visual.primary_color}`);

    return out;
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
