import Anthropic from '@anthropic-ai/sdk';
import { resolveOutputType, OUTPUT_TYPE_LABEL } from '@/lib/outputType';
import { getCategoryConfig, COPY_PRINCIPLES } from '@/lib/categoryPrompts';
import { getCategoryCopyGuard } from '@/lib/copyGuards';
import type { Block } from '@/store/AppContext';

/**
 * Stage3 (카피 생성, v5) — 검증된 프로토타입 로직.
 *
 * [통합 2단계] 청크 분할 단위로 독립 호출 가능하게 분리한다.
 *  - runCopyChunk(): 섹션 한 청크(≤16개)만 LLM 1회 호출 → 각 호출이 300초 내에 끝나게.
 *  - 각 청크 호출에는 strategy_summary(7필드)만 재주입한다(DNA 전체 주입 금지 = 토큰 절약).
 *    main_weapon / concept / hero_angle / target_desire / target_fear / story_flow / tone
 *  - 같은 strategy_summary를 모든 청크가 공유하므로 16~32~48섹션이 한 전략 아래 유지된다.
 *  - runCopy(): 전체 섹션을 16개씩 잘라 runCopyChunk를 순차 호출(편의 함수, 하위호환).
 *
 * 카피 생성 프롬프트 본문(블로그 규칙·문체·Character·블록·정답지·가드)은 검증된 그대로다.
 * 바뀐 것은 "전략 주입 소스를 strategy_summary 7필드로 한정"한 점뿐.
 */

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export const COPY_CHUNK_SIZE = 16;

interface Strategy {
  concept?: string;
  story_flow?: string;
  tone?: string;
  hero_angle?: string;
  cta_angle?: string;
  [k: string]: unknown;
}
interface SectionPlan {
  name?: string;
  role?: string;
  mission?: string;
  emotion_goal?: string;
  writing_style?: string;
}
export interface CopyOut {
  name: string;
  headline: string;
  subcopy: string;
  body: string;
  blocks?: Block[];
}

/** 청크마다 재주입하는 전략 요약 — 7필드 (DNA 전체 주입 금지) */
export interface StrategySummary {
  main_weapon?: string;
  concept?: string;
  hero_angle?: string;
  target_desire?: string;
  target_fear?: string;
  story_flow?: string;
  tone?: string;
}

/** dna+strategy에서 strategy_summary 7필드만 추출 */
export function buildStrategySummary(
  dna: Record<string, unknown> | undefined,
  strategy: Strategy,
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

export interface CopyChunkInput {
  strategySummary: StrategySummary;
  sections: SectionPlan[];   // 이 청크의 섹션들(≤16개)
  startIndex: number;        // 전체에서 이 청크의 시작 인덱스(0-based)
  totalSections: number;     // 전체 섹션 수(첫/마지막 섹션 판별용)
  cat?: string;
  ch?: string;
  out?: string | null;
  depth?: string;
}

/** 한 청크(≤16섹션)의 카피를 LLM 1회 호출로 생성 — 통합 분할 호출의 기본 단위 */
export async function runCopyChunk(input: CopyChunkInput): Promise<CopyOut[]> {
  const { strategySummary: ss, sections: items, startIndex, totalSections, cat, ch, out } = input;

  const category = cat || '화장품';
  const channel  = ch || '스마트스토어';
  const resolvedOut = resolveOutputType(channel, out ?? null);
  const isSlide  = resolvedOut === 'slide';

  // 정답지 v1 + 원칙 + 가드 — 기존 모듈에서 읽기만
  const { system, sectionGuide } = getCategoryConfig(category, channel);
  const copyGuard = getCategoryCopyGuard(category);

  // 블로그형 강제 규칙 — 설명문/보고서 톤을 막고 "독자가 느끼는" 대화체로.
  // 기존 categoryPrompts(system)는 수정하지 않고, system 뒤에 덧붙인다.
  const blogModeRules = `

[블로그형 상세페이지 작성 규칙 — 반드시 지킬 것]
- 당신은 보고서·브랜드 소개서를 쓰는 사람이 아닙니다. 독자에게 직접 말 거는 대화체로 쓰세요. ("~입니다" 나열식 설명문·요약문 말투 금지)
- 핵심 목표: 각 섹션은 주어진 emotion_goal(독자가 속으로 느껴야 할 한마디)을 "설명"하는 게 아니라 "달성"해야 합니다. 독자가 그 문장을 스스로 떠올리게 만드세요.
- 제품 자랑보다 독자의 문제·고민·상황을 먼저 건드린 뒤, 그것을 푸는 근거로 제품을 연결하세요.
- 한 문단은 2~3문장. 5줄 이상 이어지는 산문 덩어리 금지. 짧게 끊어 읽히게 쓰세요.
- 질문형 도입 허용·권장: "~한 적 있으신가요?", "~ 때문에 망설이셨다면".
- 각 섹션의 마지막 문장은 다음 섹션으로 자연스럽게 넘어가는 연결고리를 만드세요.

[섹션별 문체 변주 — 단, 브랜드 톤은 하나로 공유]
- ⭐바닥 톤(brand tone)은 모든 섹션이 공유합니다: ${ss.tone || '신뢰감 있되 친근한'}. 이 톤은 16개 섹션 전체에 깔리는 한 사람의 목소리입니다.
- 그 위에서, 각 섹션은 주어진 writing_style(말하는 방식)대로 변주하세요. 공감 섹션은 친구처럼 묻고, 솔루션은 짧고 단호하게, 가성비는 숫자로 계산하듯 — 섹션마다 리듬이 달라지게.
- 그러나 "다른 사람이 쓴 글"처럼 따로 놀면 안 됩니다. "한 사람이 상황에 맞게 말투를 바꾸는 것"처럼 들려야 합니다. 어휘·호칭·존댓말 수준·독자를 부르는 방식은 전 섹션 일관되게 유지하세요(문체는 바꾸되 사람은 한 명).
- 문체를 살리겠다고 과장·말장난·유행어로 흐르지 마세요. 변주는 리듬을 위한 것이지 산만함을 위한 게 아닙니다.

[v4 — 전략을 마지막 섹션까지 유지하는 규칙 (이 페이지에서 가장 중요. 중반 이후 전략 누수를 막는다)]
- ⭐우선순위 역전: 각 섹션은 mission(무엇을 알려야 하는가)보다 emotion_goal(무엇을 느끼게 해야 하는가) 달성을 우선합니다. "느끼게 할 것"을 먼저 쓰고, "알려야 할 것"은 그 뒤에 근거로 잇습니다. 절대 정보(성분명·수치·기능)부터 나열하며 섹션을 열지 마세요.
- ⭐성분·기능·스펙 섹션 규칙(중반 이후 누수 차단): 성분/기능/수치를 설명하기 전에, "왜 고객이 이걸 찾게 되었는지 / 왜 지금 이 정보가 필요한지"를 독자의 상황·감정으로 먼저 서술한 뒤, 그 다음에 성분 근거를 댑니다.
   · 나쁜 예(설명형, 금지): "글루코사민은 관절 연골을 구성하는 성분입니다."
   · 좋은 예(설득형): "계단 앞에서 멈칫하는 아이를 보고 '더 빨리 챙겨줄걸' 싶으셨죠? 그래서 글루코사민이 중요합니다." → 이어서 성분 근거 설명.
- ⭐감정 우선 ≠ 정보 삭제: 성분명·함량·기능·스펙은 반드시 그대로 유지합니다. 바꾸는 것은 '순서와 포장'뿐입니다. 정보 밀도가 떨어지면 실패입니다. Flik은 감성 카피 생성기가 아니라 구매 설득 엔진입니다. 성분 근거·스펙·수치를 삭제하면 실패.
- 섹션 내부 리듬: 감정(왜 필요한지) → 정보(성분·근거·수치) → 감정(그래서 무엇이 달라지는지) → 다음 섹션 연결. 정보만 남기고 끝내지 마세요.
- ⭐target_desire 관통: target_desire(고객이 진짜 원하는 것)는 페이지 전체를 흐르는 감정선입니다. 단 같은 문장·키워드 반복은 금지. 같은 욕망을 섹션마다 다른 '장면'으로 변주하세요(예: '다시 함께 산책' → 산책길 걷기 / 계단 스스로 오르기 / 현관에서 먼저 기다리기 / 차 타고 외출 / 보호자 옆을 나란히 걷기). 모든 섹션에 넣을 필요는 없지만, 성분·비교·FAQ·스펙 등 중후반 섹션도 정보 설명 후 target_desire를 한 번 환기한 뒤 다음 섹션으로 넘기세요. 키워드 반복이 아니라 감정선 유지가 목적입니다.
- 성분 섹션 성공 기준: 독자가 성분 '이름'을 외우게 하는 게 아니라 "아, 그래서 이게 필요하구나 → 내 아이(또는 나)를 위해 챙겨줘야겠다"를 느끼게 하면 성공. 정보만 남으면 실패.
- FAQ·비교 섹션의 역할은 '설명'이 아니라 '불안 해소'입니다. target_fear를 짚고 → 해소하고 → target_desire로 닫으세요.
- 결과적으로 카피를 끝까지 읽었을 때, 독자가 '○○ 성분 제품'이 아니라 'target_desire를 이뤄줄 제품'으로 기억해야 합니다.

[V5 — 섹션별 화자(Character) 도입: "무엇을 말하는가"에 더해 "누가 말하는가"를 바꿔 사람이 직접 쓴 블로그 느낌을 낸다]
- 각 섹션은 그 역할에 맞는 화자(Character)의 시점·말투로 씁니다. Character는 라벨이 아니라 실제 문체와 시점을 바꾸는 것입니다(앞에 "[기획자]" 같은 라벨을 붙이라는 뜻이 아니라, 그 사람이 말하듯 쓰라는 뜻).
- 역할별 화자 매핑 — 섹션 role/mission을 보고 가장 맞는 화자를 고르세요:
   · 공감/고민 → [같은 고민을 겪는 고객] 시점: "혹시 요즘 ~하지 않으셨나요?" → 목표 '이거 우리 얘기다'
   · 원인/원리 → [전문가] 시점: 차분한 설명 "노령견의 관절은 7세 이후…" → 목표 '아픈 거였구나'
   · 성분/기능/스펙 → [제품 기획자] 시점: "그래서 이걸 넣었습니다" → 목표 '그래서 이게 필요한 거구나'
   · 비교 → [분석자] 시점: 객관적 비교 → 목표 '차이가 있네'
   · FAQ/구매장벽 → [상담 담당자] 시점: 질문에 직접 답변 "많이 받는 질문입니다" → 목표 '궁금한 게 해결됐다'
   · CTA → [브랜드 담당자] 시점: 행동 유도 → 목표 '지금 시작해보자'
   · (그 외 섹션은 가장 가까운 역할의 화자를 따르세요.)
- ⭐Character는 화자일 뿐 새로운 정보원이 아닙니다. 모든 화자는 동일한 Stage1 전략·동일한 사실·동일한 target_desire·target_fear를 공유합니다. 화자가 바뀌어도 main_weapon·concept·hero_angle·target_desire·target_fear는 절대 바뀌지 않습니다. 새 주장·새 사실·새 효능·새 근거를 만들면 실패입니다. 화자의 역할은 '같은 전략을 다른 시점으로 전달'하는 것뿐입니다.
- ⭐통일감: 화자가 바뀌어도 브랜드 기본 톤(${ss.tone || '신뢰감 있되 친근한'})은 전 섹션 공통입니다. 16명이 따로 쓴 문서가 아니라, 하나의 브랜드가 상황에 맞는 화자를 내세우는 느낌이어야 합니다. 호칭·존댓말 수준·독자를 부르는 방식은 일관되게. 과도한 화자 분리·산만함은 금지.
- ⭐후기/리뷰 섹션 예외(법적 필수, 화장품 후기 정직 처리 원칙과 동일): 후기 섹션에는 '실제 구매자' 화자를 쓰지 마세요. 셀러가 실제 후기를 입력하지 않았다면 1인칭 후기·별점·작성자를 절대 생성하지 마세요. 금지 예시 → "저는 써봤는데요" / "큰 기대 안 했는데" / "우리 강아지가 좋아했어요" / "★★★★★" / 작성자명 생성. 후기 데이터가 없으면 body 안에 "💡 실제 후기를 입력하면 이 섹션이 더 강력해집니다" 안내와 함께 3인칭 기대 시나리오 또는 구매 전 체크포인트 형태로 처리하세요(quote 블록 금지, rating 금지).`;

  const composedSystem = isSlide ? system : system + blogModeRules;

  const formRule = isSlide
    ? `[출력형태 = 슬라이드형] 이미지가 주인공입니다. headline은 12자 내외로 강하게, subcopy는 1줄, body는 최소화(1~2문장). 한 섹션 = 한 메시지. 비주얼이 말할 수 있는 것은 글로 반복하지 마세요.`
    : `[출력형태 = 블로그형] 글이 설득의 주인공입니다(이미지는 텍스트 없는 사진). headline은 검색 키워드를 머금은 제목형, subcopy 1줄. body는 대화체로 한 문단 2~3문장씩, 설명문이 아니라 독자가 emotion_goal을 느끼도록. 섹션 끝은 다음 섹션으로 자연스럽게 이어지는 흐름.`;

  // 블록 강제 — 섹션마다 적절한 블록 1개 이상으로 설명문을 차단. 스키마는 AppContext의 Block 타입과 동일.
  const blockSpec = `[블록(blocks) — 설명문을 막기 위해, 각 섹션은 아래 블록 중 그 섹션 역할에 맞는 것을 최소 1개 포함하세요]
역할 → 권장 블록 매핑:
- 공감/고민 섹션 → checklist (독자가 "맞아" 하고 체크할 상황 목록)
- 성분/특징 섹션 → iconcards (성분·특징 카드)
- 사용법/루틴 섹션 → steps (순서 단계)
- 비교 섹션 → compare (표)
- 후기/리뷰 섹션 → quote (인용 후기)
- Q&A/구매장벽 → faq
- 가격/수치 강조 → stats
- 그 외 강조가 필요하면 → heading 또는 cta

블록 스키마(type별 필드 — 정확히 따를 것. 추가 필드 금지):
- { "type": "checklist", "items": ["...", "..."] }
- { "type": "steps", "items": [{ "title": "...", "desc": "..." }] }
- { "type": "iconcards", "cards": [{ "title": "...", "desc": "..." }] }
- { "type": "stats", "items": [{ "value": "...", "label": "..." }] }
- { "type": "compare", "headers": ["구분","A","B"], "rows": [["행이름","값","값"]] }
- { "type": "quote", "text": "...", "author": "...", "rating": 5 }
- { "type": "faq", "items": [{ "q": "...", "a": "..." }] }
- { "type": "heading", "text": "..." }
- { "type": "cta", "text": "...", "button": "..." }
블록 안에서도 copyGuards를 동일하게 지키세요(미입력 사실·과장 금지, 효능은 헤지). 실제 후기가 입력되지 않았다면 단정적 후기를 지어내지 말고 quote 블록은 생략하고 body에서 기대 시나리오로 처리하세요.`;

  // 전략 요약(strategy_summary) — 7필드만. 청크가 나뉘어도 매 청크에 동일하게 주입돼 전 섹션 일관성 유지.
  const strategyBlock = `[이 페이지의 전략 요약(strategy_summary) — 모든 섹션 카피가 이 전략을 벗어나면 안 됩니다. 카피가 청크로 나뉘어도 이 요약은 매 청크에 동일하게 주입됩니다]
- 핵심 무기(main_weapon): ${ss.main_weapon || '(없음)'}
- 컨셉(concept, 절대 벗어나지 말 것): ${ss.concept || '(없음)'}
- 히어로 전략(hero_angle, 첫 섹션에서 수행): ${ss.hero_angle || '(없음)'}
- 설득 흐름(story_flow): ${ss.story_flow || '(없음)'}
- 톤(tone): ${ss.tone || '(없음)'}
- ★고객이 진짜 원하는 것(target_desire) — 페이지 전체를 관통하는 감정선, 섹션마다 다른 장면으로 변주: ${ss.target_desire || '(없음)'}
- 고객이 가장 두려워하는 것(target_fear) — 초반 설득 + FAQ/비교에서 해소 대상: ${ss.target_fear || '(없음)'}`;

  const sectionList = items.map((s, j) => {
    const globalIdx = startIndex + j;
    const isFirst = globalIdx === 0;
    const isLast  = globalIdx === totalSections - 1;
    const tag = isFirst ? ' ★첫 섹션 — hero_angle 전략 수행' : isLast ? ' ★마지막 섹션 — CTA(전환 유도, story_flow 마지막 단계·concept에 맞춰 행동 촉구)' : '';
    return `${globalIdx + 1}. [${s.name || '섹션'}]${tag}
   역할: ${s.role || '(미정)'}
   임무(mission — 이 제품의 main_weapon을 미는 각도, 반드시 카피에 반영): ${s.mission || '(미정)'}
   ★독자가 느껴야 할 것(emotion_goal — 이 섹션을 읽은 독자가 이 문장을 속으로 떠올리게 만드는 게 목표): ${s.emotion_goal || '(미정)'}
   ★문체(writing_style — 이 섹션은 이 방식으로 쓰되, 바닥 브랜드 톤은 공유): ${s.writing_style || '(미정)'}`;
  }).join('\n\n');

  const userPrompt = `다음 ${items.length}개 섹션의 카피를 작성하세요. 각 섹션의 목표는 mission을 설명하는 게 아니라, 그 섹션의 emotion_goal(독자가 속으로 느껴야 할 한마디)을 독자가 스스로 떠올리게 만드는 것입니다.

${strategyBlock}

${formRule}

[작성할 섹션 — 순서·이름 그대로]
${sectionList}

[카테고리 섹션 역할 정답지 — 섹션 이름에 맞는 패턴 적용]
${sectionGuide}

${blockSpec}

${copyGuard}

${COPY_PRINCIPLES}

[출력 형식] — 다른 텍스트 없이 아래 JSON 배열만 반환하세요. 배열 길이는 정확히 ${items.length}개:
[
  {
    "name": "섹션 이름(입력과 동일)",
    "headline": "헤드라인 카피${isSlide ? ' (12자 내외)' : ' (제목형)'}",
    "subcopy": "서브카피 1줄",
    "body": "본문 카피 — 대화체, 한 문단 2~3문장${isSlide ? ', 1~2문장으로 최소화' : ''}",
    "blocks": [ /* 이 섹션 역할에 맞는 블록 최소 1개 (위 블록 스키마 준수) */ ]
  }
]`;

  const message = await client.messages.create({
    model:      'claude-sonnet-4-6',
    max_tokens: 16000,
    system:     composedSystem,
    messages:   [{ role: 'user', content: userPrompt }],
  });

  const raw = message.content[0]?.type === 'text' ? message.content[0].text : '';
  console.log(`[copy] chunk@${startIndex} (${items.length}섹션) stop=${message.stop_reason} out=${message.usage?.output_tokens} len=${raw.length}`);
  if (message.stop_reason === 'max_tokens') {
    throw new Error(`청크(${startIndex}~)가 max_tokens(16000)에 도달해 잘렸어요. 청크 크기를 줄여보세요.`);
  }
  const first = raw.indexOf('[');
  const last  = raw.lastIndexOf(']');
  if (first === -1 || last === -1 || last < first) {
    console.error(`[copy] JSON 배열 미발견 chunk@${startIndex}. raw head:\n${raw.slice(0, 400)}`);
    throw new Error('응답에서 JSON 배열을 찾을 수 없음');
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw.slice(first, last + 1));
  } catch (parseErr) {
    const pmsg = parseErr instanceof Error ? parseErr.message : String(parseErr);
    console.error(`[copy] JSON.parse 실패 chunk@${startIndex}: ${pmsg}\nraw tail:\n${raw.slice(-400)}`);
    throw new Error(`JSON 파싱 실패: ${pmsg}`);
  }
  if (!Array.isArray(parsed)) throw new Error(`JSON이 배열이 아님: ${typeof parsed}`);
  return (parsed as Record<string, unknown>[]).map(s => ({
    name:     typeof s.name === 'string' ? s.name : '',
    headline: typeof s.headline === 'string' ? s.headline : '',
    subcopy:  typeof s.subcopy === 'string' ? s.subcopy : '',
    body:     typeof s.body === 'string' ? s.body : '',
    blocks:   Array.isArray(s.blocks) ? (s.blocks as Block[]) : undefined,
  }));
}

export interface CopyInput {
  dna?: Record<string, unknown>;
  strategy: Strategy;
  sections: SectionPlan[];
  cat?: string;
  ch?: string;
  out?: string | null;
  depth?: string;
}

export interface CopyResult {
  sections: CopyOut[];
  meta: {
    cat: string;
    ch: string;
    form: string;
    depth: string | null;
    count: number;
    outputTypeLabel: string;
  };
}

/**
 * 전체 섹션 카피 — 16개씩 잘라 runCopyChunk를 순차 호출(편의/하위호환 함수).
 * 분할 HTTP 호출이 필요한 경우(대량 섹션, Vercel 300초 천장)는 오케스트레이터가
 * runCopyChunk를 청크별로 직접 호출한다.
 */
export async function runCopy(input: CopyInput): Promise<CopyResult> {
  const { dna, strategy, sections, cat, ch, out, depth } = input;

  const category = cat || '화장품';
  const channel  = ch || '스마트스토어';
  const resolvedOut = resolveOutputType(channel, out ?? null);
  const formLabel = resolvedOut === 'slide' ? '슬라이드형' : '블로그형';

  const strategySummary = buildStrategySummary(dna, strategy);
  const total = sections.length;

  console.log(`[copy] cat=${category} ch=${channel} form=${formLabel} sections=${total} chunkSize=${COPY_CHUNK_SIZE}`);

  const results: CopyOut[] = [];
  for (let i = 0; i < total; i += COPY_CHUNK_SIZE) {
    const part = await runCopyChunk({
      strategySummary,
      sections: sections.slice(i, i + COPY_CHUNK_SIZE),
      startIndex: i,
      totalSections: total,
      cat, ch, out, depth,
    });
    results.push(...part);
  }

  return {
    sections: results,
    meta: { cat: category, ch: channel, form: formLabel, depth: depth ?? null, count: results.length, outputTypeLabel: OUTPUT_TYPE_LABEL[resolvedOut] },
  };
}
