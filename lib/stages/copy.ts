import Anthropic from '@anthropic-ai/sdk';
import { resolveOutputType, OUTPUT_TYPE_LABEL } from '@/lib/outputType';
import { getCategoryConfig, COPY_PRINCIPLES } from '@/lib/categoryPrompts';
import { getCategoryCopyGuard } from '@/lib/copyGuards';
import { scrubCopyItems } from '@/lib/factScrub';
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

export const COPY_CHUNK_SIZE = 4;   // ★카피 병렬화 — 작은 청크(출력 상한 잘림 소멸) × 동시 실행. 16 → 4
const COPY_MAX_ATTEMPTS = 2; // 최초 1 + 자동 재시도 1 (strategy/imagebrief와 동일 패턴)

interface Strategy {
  concept?: string;
  story_flow?: string;
  tone?: string;
  speech_level?: string;
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
  /** 콘텐츠 디렉터 블록 계획(structure 산출, 블로그형) — '글만' 또는 블록 타입 1~2개 + 이유 */
  block_plan?: string;
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
  speech_level?: string;
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
    speech_level:  s(strategy?.speech_level),
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
  knownFacts?: string;       // 셀러 원입력(productName+productExtra) — 후처리 날조 그물의 허용 기준
  /** ★전체 페이지 구성표(2026-07-25) — 청크가 병렬 생성돼 서로의 내용을 못 보면서 같은 USP를
   *  섹션마다 재탕하던 문제(실사용 피드백: "설명이 길다, 같은 말 반복"). 모든 섹션의 이름+임무를
   *  매 청크에 주입해 "내 섹션 고유 주제만 쓰기"를 강제한다. */
  pageMap?: { name: string; mission?: string }[];
  /** ★판매 디렉팅 강화(2026-08-01) — 아래 SALES_MODE 주석 참고. 호출부가 켜면 활성. */
  salesMode?: boolean;
  /** 이 페이지의 '킬러 라인'을 맡을 섹션의 전체 인덱스(0-based). salesMode에서만 사용. */
  killerLineIndex?: number;
}

/* ────────────────────────────────────────────────────────────────────────────
 * ★판매 디렉팅 강화(salesMode, 2026-08-01) — "무난하다"의 원인 3가지를 겨냥한다.
 *
 * 진단(유근님 피드백 + 실측):
 *  1) 모든 문장이 고르게 괜찮다 → 기억에 남는 한 줄이 없다.
 *     프롬프트가 "모든 섹션을 잘 써라"만 요구하고 "캡처해갈 한 문장"을 요구하지 않는다.
 *  2) 히어로가 훅이 아니라 목차다("~부터 보여드릴게요"). 히어로가 나머지 7개 섹션과
 *     같은 청크에서 같은 규칙으로 쓰이니, 격이 다른 문장이 나올 이유가 없다.
 *  3) 리듬이 없다. 훅형 180자·설득형 320자로 차등을 뒀지만 실측은 둘 다 130~160자로 붙었다.
 *     상한만 다르고 '짧게 쓰라는 압력'이 없으면 모델은 편한 중간값으로 수렴한다.
 *
 * 대응:
 *  1) 킬러 라인을 코드가 한 섹션에 지정 → 그 섹션에만 ((포인트 컬러)) 허용.
 *     (병렬 청크는 서로를 못 보므로 '알아서 하나만'은 성립하지 않는다 — 콜라주가 실패한 것과 같은 이유)
 *  2) 히어로를 독립 청크로 분리하고 훅 전용 규칙을 준다.
 *  3) 분량 상한을 실제로 벌린다: 히어로 60자 / 훅형 120자 / 설득형 320자.
 *
 * ⚠️판매력을 올린다고 없는 사실을 만들면 Flik의 유일한 차별점이 무너진다.
 *   그래서 '재료를 늘리는 것'이 아니라 '같은 재료의 배치·밀도·순서를 바꾸는 것'만 허용한다.
 * ──────────────────────────────────────────────────────────────────────────── */

/** 히어로 전용 훅 규칙 — 첫 섹션이 독립 청크로 올 때만 주입 */
const HERO_HOOK_RULES = `
[★이 청크는 히어로(첫 섹션) 하나뿐입니다 — 페이지 전체의 성패가 여기서 갈립니다]
독자는 이 화면에서 3초 안에 계속 볼지 나갈지 정합니다. 이 섹션은 '설명의 시작'이 아니라 '스크롤을 멈추는 장치'입니다.

⛔ 절대 금지 — 아래는 전부 '목차'지 훅이 아닙니다:
 · "~부터 보여드릴게요 / 말씀드릴게요 / 알려드릴게요"  (앞으로 할 얘기 예고)
 · "이 두 가지만 기억하세요" 류의 안내 문구
 · 상품 카테고리 + 장점 나열형 선언 ("오버핏 니트, 편하고 예뻐요")
 · 셀러가 독자에게 설명하는 자세 전반

⛔⛔ 단점·주의사항·리스크를 히어로에서 먼저 꺼내지 마세요(수축·오차·관리 어려움·알레르기 등).
   단점을 장점의 증거로 뒤집는 건 강력한 기술이지만, 그건 '이미 끌린 사람을 붙잡는' 중반의 무기입니다.
   첫 화면에서 망설일 이유를 주면 그 사람은 스크롤을 내리지 않습니다. 순서가 반대면 안 됩니다.

✅ 훅이 되는 방식 — 전부 '끌어당기는' 계열입니다. 이 상품에 가장 맞는 하나를 고르세요:
 · 장면: 독자가 겪었던 순간을 한 컷으로. 설명 말고 그림이 그려지게.
 · 욕망 결과: 이 상품을 쓰면 무엇이 좋아지는지를 결과 상태로.
 · 통념 반박: "이런 건 원래 ~하다"는 고정관념을 정면으로 뒤집기.
 · 숫자 충돌: 셀러가 준 수치 하나를 통념과 부딪히게 놓기.
 · 속마음 인용: 독자가 실제로 했을 혼잣말을 그대로.
 · 대비: 전/후, 남들/우리를 짧게 맞붙이기.
 · 해방: 이제 하지 않아도 되는 것을 선언하기.

📏 분량 — ★짧을수록 셉니다. body 2~4줄, 공백 포함 60자 이내. 넘기면 훅이 아니라 문단입니다.
   headline도 길게 늘어뜨리지 마세요. 한 호흡에 읽히는 길이로.

⛔ 화면에 없는 것을 가리키지 마세요 — "저 체형도", "이 사진처럼", "아래 컷을 보시면" 같이
   특정 이미지의 내용을 전제하는 표현 금지. 어떤 사진이 붙을지 당신은 모릅니다.`;

/** 킬러 라인 지시 — 페이지 전체에서 단 한 섹션에만 주입 */
function killerLineRule(sectionName: string): string {
  return `
[★킬러 라인 — 이 페이지에서 딱 한 문장, "${sectionName}" 섹션이 맡습니다]
사람들이 "이 집 멘트 좋다"고 느끼는 건 페이지가 고르게 좋아서가 아니라, 딱 한 문장이 튀기 때문입니다.
평균 80점 문장 여덟 개보다 100점 하나 + 70점 일곱이 훨씬 강합니다.

이 섹션의 body에 그 한 문장을 만드세요:
 · 이 문장만 따로 캡처해도 상품이 설명되는 문장.
 · 정보 요약이 아니라, 읽는 순간 '어' 하고 멈추게 하는 문장.
 · 짧을 것. 수식어를 걷어낼 것. 두 문장으로 나누지 말 것.
 · 그 문장에만 ((괄호))를 씌우세요.
 · ★여기는 히어로와 달리 '단점을 장점의 증거로 뒤집는' 각도가 아주 강하게 먹힙니다.
   이미 관심이 생긴 뒤라 솔직함이 신뢰로 읽히기 때문입니다.
   (예: 셀러가 밝힌 수축·오차·관리 번거로움을 '진짜라는 증거'로 재해석)

⚠️다른 섹션에는 ((포인트 컬러))를 쓰지 마세요 — 여덟 곳이 강조되면 강조가 아니라 소음입니다.`;
}

/** salesMode 분량 규칙 — 상한을 실제로 벌려 리듬을 만든다 */
const SALES_LENGTH_RULE = `
[★분량 — 리듬을 만드는 장치입니다. 전 섹션이 같은 길이면 강한 데가 강하게 느껴지지 않습니다]
 · 히어로: body 2~4줄, 60자 이내 — 치고 빠집니다.
 · 훅형(공감·전환·CTA): body 3~5줄, 120자 이내 — 짧게.
 · 설득형(정체·근거·성분·신뢰·비교·FAQ·스토리): body 5~9줄, 320자 이내 — 여기서만 늘어집니다.
⚠️'이내'는 목표가 아니라 상한입니다. 훅형에서 120자를 채우려 하지 마세요 — 60~80자에서 끝나면 그게 더 좋습니다.
⚠️⚠️★가장 중요 — 셀러가 준 재료가 적으면 그 섹션은 '짧게' 쓰세요.
   상한은 재료가 충분할 때의 여유일 뿐입니다. 분량을 채우려고 없는 사실을 지어내면
   길고 그럴듯한 실패작이 됩니다. 재료가 두 줄뿐이면 두 줄로 끝내는 게 정답입니다.`;

/**
 * ★날조 차단 — salesMode에서만 추가로 주입.
 *
 * ⚠️왜 따로 필요한가(2026-08-01 실측): 훅·판매력 강화 지시를 넣자 카피가 '재료를 늘려서' 대응했다.
 *   니트 가디건 테스트에서 셀러가 준 적 없는 '드롭숄더 각도·소매 여유량·기장 밸런스 설계',
 *   존재하지 않는 '자연광 컷/실내조명 컷', 셀러가 한 적 없는 '저희가 직접 입어봤어요'가 나왔다.
 *   기존 프롬프트에도 날조 금지 규칙은 있지만 다른 위치에 흩어져 있어, 열 줄짜리 훅 압력에 밀렸다.
 *   그래서 훅 규칙과 같은 무게로, 같은 자리에서 못 박는다.
 */
function antiFabricationRule(knownFacts: string): string {
  const facts = (knownFacts ?? '').trim();
  return `
[⛔⛔ 재료 제한 — 위의 '강하게 쓰라'는 지시보다 이 규칙이 우선합니다]
판매력을 높이는 방법은 '재료를 늘리는 것'이 아니라 '있는 재료의 배치·순서·밀도를 바꾸는 것'입니다.
아래가 이 상품에 대해 당신이 아는 전부입니다. 여기 없는 것은 존재하지 않습니다.

────────── 셀러가 준 재료 (이것이 전부) ──────────
${facts || '(입력 없음)'}
──────────────────────────────────────────────

특히 아래 넷은 '그럴듯해서' 자주 나오는 날조입니다. 절대 쓰지 마세요:
 1. 설계·개발·공정 서사 — "따로 계산해서 설계했어요", "수십 번 테스트했어요", "각도를 맞췄어요"
    → 위 재료에 설계 과정이 적혀 있지 않으면 그런 과정은 없는 것입니다.
 2. 기술 용어 창작 — 위 재료에 없는 부위명·수치·공법·소재 특성을 만들어 붙이기.
 3. 페이지에 없는 것 가리키기 — "자연광 컷과 실내조명 컷을 나란히 올렸어요", "아래 표에서",
    "사진처럼" → 어떤 이미지·블록이 붙을지 당신은 모릅니다.
 4. 셀러의 행동·의도 창작 — "저희가 직접 입어봤어요", "고심 끝에 골랐어요", "일부러 ~했어요"
    → 셀러가 그렇게 말한 적이 없으면 쓰지 마세요.

✅ 대신 이렇게 강하게 만드세요 — 전부 재료를 늘리지 않는 방법입니다:
 · 있는 숫자 하나를 문장 맨 앞에 놓기.
 · 독자의 상황·감정·혼잣말은 자유롭게 써도 됩니다(상품 사실이 아니므로 날조가 아닙니다).
 · 일반적으로 알려진 상식·통념은 써도 됩니다(이 상품 고유의 주장으로 쓰지만 않으면).
 · 셀러가 밝힌 단점(수축·오차 등)을 먼저 인정해 신뢰를 사기.
 · 같은 사실을 추상어 대신 장면으로 바꾸기.

⚠️판단이 서지 않으면 빼세요. 이 페이지는 실제 판매에 쓰입니다 — 없는 사실이 들어가면
  셀러가 표시광고법 위반으로 처벌받습니다. 강한 카피보다 정확한 카피가 우선입니다.`;
}

/** 청크 프롬프트 구성 — 모델 호출부와 분리(카피 모델 A/B 하네스가 동일 프롬프트를 재사용). 프롬프트 내용은 기존 그대로. */
export function buildCopyChunkPrompts(input: CopyChunkInput): { composedSystem: string; userPrompt: string } {
  const { strategySummary: ss, sections: items, startIndex, totalSections, cat, ch, out, knownFacts, pageMap,
          salesMode, killerLineIndex } = input;

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
- 질문형 도입은 '가능한 선택지 중 하나'입니다(전 섹션 기본값이 아님). 선언·장면·숫자·대비로 여는 것도 좋습니다 — 연달아 세 섹션 이상이 질문으로 열리지 않게 하세요.
- 각 섹션의 마지막 문장은 다음 섹션으로 자연스럽게 넘어가는 연결고리를 만드세요.

[V5 문체 복원 — '무엇을 말하는가'는 그대로, '어떻게 말하는가'만 바꾼다 (이번 작업의 핵심)]
※ 전략·정보·성분·수치·근거·순서상의 논리는 절대 그대로 유지. 아래는 같은 정보를 v5 말투로 '번역'하는 규칙입니다. 정보가 늘어도(날조) 줄어도(누락) 실패. 바꾸는 건 문장 길이·호흡·말투뿐입니다.
1. 짧은 문장: 한 문장에 한 가지 생각만. "~외부 자극에 의해 쉽게 붉어질 수 있습니다" 같은 긴 서술형 설명문 금지. 짧게 끊어 쓰세요.
2. 대화체: 보고서·소개서 말투 금지. 독자에게 말을 거는 대화체로 쓰세요.
   ⚠️어미·상투구를 정해두지 마세요. "있으시죠?/해보셨나요?/~거예요" 같은 특정 표현에 기대면 모든 상품의 카피가 똑같아집니다.
   이 제품의 고객이 실제로 쓸 법한 말을 그 상품의 맥락에서 새로 고르세요 — 같은 뜻이라도 매번 다른 문장으로.
3. 독자 속마음 대변: 설명을 먼저 던지지 말고, 독자가 속으로 했을 혼잣말·생각을 먼저 말하세요. (예: 설명 "민감성 피부는 향료에 자극을 받을 수 있습니다" ❌ → 속마음 "'이번엔 괜찮겠지' 했는데 또 붉어졌던 날." ✅)
4. 질문형 후킹: 섹션 도입을 질문으로 열 수 있습니다 — 단 정해진 관용구를 재사용하지 말고, 이 상품의 고객이 실제로 품을 의문을 그대로 쓰세요.
5. 도입 순서 — ★섹션 역할에 따라 다르게(2026-07-29 완화):
   · 훅형(히어로·공감·CTA): 공감 → 상황(장면) → 감정 → 설명. 정보부터 던지지 마세요.
   · 설득형(성분·근거·비교·FAQ·스펙): 이 순서를 강제하지 않습니다. 근거·수치·대비로 바로 열어도 좋고, 장면으로 열어도 좋습니다 —
     그 섹션의 writing_style이 지시하는 방식을 우선하세요. 8개 섹션이 전부 같은 순서로 열리면 페이지가 단조로워집니다.
   · 공통 최소 조건: 정보만 나열하고 끝내지 말 것(마지막엔 독자에게 무엇이 달라지는지 한 번은 연결).
6. body 호흡: body는 짧은 문장 여러 개가 줄바꿈으로 끊겨 흐르듯 이어지게 쓰세요. 한 호흡(짧은 생각 단위)마다 줄을 바꿉니다(JSON 문자열이므로 줄바꿈은 \\n으로). 5줄 넘는 한 덩어리 산문 금지.
   예) "퇴근하고 거울을 봤는데\\n볼이 또 붉어져 있던 날.\\n좋다는 제품도 써보고\\n진정 제품도 써봤는데\\n왜 나만 그런 걸까요?"
7. ★분량 — 섹션 역할별 차등(일률 상한 금지, 2026-07-27 재조정):
   · 훅형(히어로·공감·CTA·전환 유도): body 3~6줄, 공백 포함 180자 이내 — 짧게 치고 빠집니다.
   · 설득형(정체 소개·성분/근거·신뢰·스토리·비교·FAQ): body 5~9줄, 공백 포함 320자 이내 — 설득에 필요한 살은 남깁니다. 근거·장면·정보를 갖춰 쓰되 같은 말 되풀이만 금지.
   · blocks가 있는 섹션은 정보를 블록에 맡기고 body를 짧게, block_plan이 '글만'인 섹션은 body가 유일한 설득 수단이므로 여유 있게 쓰세요.
   · 공통: 같은 내용을 표현만 바꿔 되풀이하지 마세요. 줄이는 대상은 '반복과 군더더기'지 정보가 아닙니다(성분·수치·근거 유지).
8. ★강조 마킹(2026-07-27 — 렌더가 볼드·포인트 컬러로 표시): body와 subcopy에서만 사용.
   · **구절** = 굵게 강조 — 섹션당 1~2곳, 셀러 입력 팩트(수치·재료·핵심 특징)에만.
   · ((문장)) = 포인트 컬러 강조 — 섹션당 최대 1곳, 그 섹션의 결정적 한 줄에만(주로 마지막 호흡).
   · headline·blocks 안에는 마킹 금지. 마킹 남발은 강조가 아니라 소음입니다 — 없는 섹션이 있어도 됩니다.
⚠️ 이 문체는 전 카테고리(화장품·식품 등) 공통입니다. 단 성분·함량·수치·근거·전략·정보 밀도는 그대로 — 문체만 바꿉니다(감정 우선 ≠ 정보 삭제).

[섹션별 문체 변주 — 단, 브랜드 톤은 하나로 공유]
- ⭐바닥 톤(brand tone)은 모든 섹션이 공유합니다: ${ss.tone || '신뢰감 있되 친근한'}. 이 톤은 16개 섹션 전체에 깔리는 한 사람의 목소리입니다.
- ★어투(speech_level) = ${ss.speech_level || '해요체'} — 전 섹션 이 어투로 통일하고 중간에 섞지 마세요.
   · 해요체 → "~해요/~어요/~죠" 친근한 존댓말.
   · 합니다체 → "~합니다/~습니다" 정중·전문적. 문장이 조금 길어도 됩니다.
   · 단정형(~다체) → "매일 아침이 달라진다 / 흔들리지 않는다" 처럼 광고 카피 어조로 짧고 단단하게. 존댓말 어미를 쓰지 마세요.
   · 명사형 → "하루 한 알로 끝. / 손질 없는 저녁." 처럼 체언으로 끊어 절제된 리듬을 만드세요.
   · 반말친근체 → 무례하지 않은 선에서 "~야/~지/~거든" 캐주얼하게. 20대 타겟·캐주얼 브랜드 전용.
   ⚠️어투는 문장 끝만 바꾸는 게 아니라 문장 길이·호흡까지 함께 바뀝니다. 단정형·명사형은 특히 짧게.
   ⚠️단, CTA의 행동 유도와 법정 고지 문구는 어투와 무관하게 오해 없이 명확하게 쓰세요.
- ★톤을 실제 문장에 반영하세요(라벨만 받고 무시하지 말 것). 톤이 바뀌면 어미·문장 길이·호칭·리듬이 실제로 달라져야 합니다:
  직설형→ 수식 걷어내고 단언 위주 짧은 문장 / 감성형→ 장면과 정서를 먼저, 여운 있는 마무리 / 데이터형→ 숫자·대비를 문장 앞에 /
  다정형→ 안심시키는 어투와 부드러운 청유 / 유쾌형→ 가볍고 리듬감 있게(과장·말장난·유행어는 금지) / 미니멀형→ 짧은 문장과 여백, 접속사 최소화 /
  스토리형→ 만든 사람·과정의 시점 / 실용형→ 언제 어떻게 쓰는지 상황 중심 / 전문가형→ 근거와 기준을 먼저 / 신뢰형→ 검증·안전 요소를 앞세움.
- 그 위에서, 각 섹션은 주어진 writing_style(말하는 방식)대로 변주하세요. 공감 섹션은 친구처럼 묻고, 솔루션은 짧고 단호하게, 가성비는 숫자로 계산하듯 — 섹션마다 리듬이 달라지게.
- ★writing_style 우선(2026-07-29): 위 문체 규칙(질문형 도입·공감 우선 등)과 그 섹션의 writing_style이 충돌하면 writing_style을 따르세요.
  writing_style이 '선언형'이면 질문 없이 단언으로 열고, '계산형'이면 숫자로 열고, 'Q&A형'이면 질문·답 구조로 씁니다.
  문체 규칙은 기본값일 뿐이고, writing_style은 이 섹션에 내려진 구체적 지시입니다. 지키지 않으면 전 섹션이 같은 리듬으로 반복됩니다.
- 그러나 "다른 사람이 쓴 글"처럼 따로 놀면 안 됩니다. "한 사람이 상황에 맞게 말투를 바꾸는 것"처럼 들려야 합니다. 어휘·호칭·어투(speech_level)·독자를 부르는 방식은 전 섹션 일관되게 유지하세요(문체는 바꾸되 사람은 한 명).
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
- ⭐통일감: 화자가 바뀌어도 브랜드 기본 톤(${ss.tone || '신뢰감 있되 친근한'})은 전 섹션 공통입니다. 16명이 따로 쓴 문서가 아니라, 하나의 브랜드가 상황에 맞는 화자를 내세우는 느낌이어야 합니다. 호칭·어투(speech_level)·독자를 부르는 방식은 일관되게. 과도한 화자 분리·산만함은 금지.
- ⭐후기/리뷰 섹션 — ⚠️전 카테고리 공통 법적 필수(표시광고법 / 공정위, 가짜 후기는 과징금 대상). 카테고리(화장품·식품·패션·가전·반려동물·건강 등) 무관하게 동일 적용:
   · 셀러가 실제 후기를 입력했으면 → 그 후기를 그대로 예쁘게 표시(작성자·별점도 입력값이 있을 때만).
   · 셀러가 후기를 입력하지 않았으면 → 1인칭 과거형 경험담·별점·작성자명을 절대 생성하지 마세요. 금지 예시 → "샀는데 좋았어요" / "저는 써봤는데요" / "큰 기대 안 했는데" / "우리 아이가 좋아해요" / "★★★★★" / 작성자명.
   · 대신 미래형 기대 시나리오로 처리: "이런 분들이 만족하실 거예요: [상품 특성 기반 대상 2~3가지]" — 단정·보장이 아니라 기대형으로.
   · ⛔셀러에게 말을 거는 안내문을 카피에 절대 넣지 마세요 — "실제 후기를 입력하면 이 섹션이 강력해집니다" 같은 문구는
     셀러용 안내인데 body에 쓰면 고객이 보는 상세페이지에 그대로 실립니다(다운로드 파일에도 남습니다).
     후기 입력을 권하는 안내는 화면(편집 UI)이 따로 보여줍니다. 카피에는 고객이 읽을 말만 쓰세요.
   · quote 블록(작성자/별점) 금지, rating 금지. 단 후기 섹션 자체는 유지(셀러가 진짜 후기를 넣을 자리).`;

  const composedSystem = isSlide ? system : system + blogModeRules;

  const formRule = isSlide
    ? `[출력형태 = 슬라이드형] 이미지가 주인공입니다. headline은 12자 내외로 강하게, subcopy는 1줄, body는 최소화(1~2문장). 한 섹션 = 한 메시지. 비주얼이 말할 수 있는 것은 글로 반복하지 마세요.
⚠️셀러에게 말을 거는 안내문·메타 문구를 headline/subcopy/body/blocks 어디에도 절대 쓰지 마세요(예: "실제 후기를 입력하면 이 섹션이 강해집니다", "~를 추가해 주세요") — 슬라이드 카피는 전부 이미지에 박혀 고객에게 그대로 노출됩니다. 후기가 없으면 후기 섹션은 기대형 카피("이런 분들께 맞습니다")로 쓰세요.`
    : `[출력형태 = 블로그형] 글이 설득의 주인공입니다(이미지는 텍스트 없는 사진). headline은 검색 키워드를 머금은 제목형, subcopy는 짧은 후킹 1줄. body는 v5 호흡 — 짧은 문장이 줄바꿈(\\n)으로 끊겨 흐르듯 이어지는 대화체(설명문·산문 덩어리 금지), 공감→상황→감정→설명 순서로 독자가 emotion_goal을 느끼도록. ★분량: 훅형(히어로·공감·CTA) 3~6줄·180자, 설득형(정체·근거·신뢰·FAQ) 5~9줄·320자 — 반복만 줄이고 설득의 살은 유지. 섹션 끝은 다음 섹션으로 자연스럽게 이어지는 흐름.`;

  // 블록 지시 — ★디렉터 계획(block_plan)이 있으면(2026-07-21 정형화 해소) 그 계획을 따르고,
  //   없으면(구 데이터·정답지 없는 재생성 경로) 기존 역할→블록 고정 매핑으로 폴백.
  //   스크래치 검증: runs/블로그디렉터-202607210243 — 계획형이 제품별로 다른 구조 생성, '글만' 섹션 품질 우수.
  const hasBlockPlan = !isSlide && items.some(s => typeof s.block_plan === 'string' && s.block_plan.trim().length > 0);
  const blockGuide = hasBlockPlan
    ? `[블록(blocks) — 콘텐츠 디렉터의 블록 계획(block_plan)을 따르세요. 페이지 리듬은 이미 설계되어 있습니다]
- 각 섹션 목록에 적힌 block_plan이 그 섹션의 블록 지시입니다.
- block_plan이 '글만'이면 blocks를 빈 배열([])로 두고 body의 글(v5 호흡)로만 설득하세요 — 단, 설명문 덩어리 금지는 동일하게 적용됩니다.
- block_plan에 블록 타입이 지정된 섹션은 그 타입을 중심으로 최소 1개 만드세요. 계획에 없는 블록을 임의로 추가해 페이지 리듬을 깨지 마세요.
- 첫 섹션 계획에 iconcards가 있으면 그 카드(2~3개)는 하단 지표 스트립의 재료가 됩니다.`
    : `[블록(blocks) — 설명문을 막기 위해, 각 섹션은 아래 블록 중 그 섹션 역할에 맞는 것을 최소 1개 포함하세요]
역할 → 권장 블록 매핑:
- ★첫 번째(히어로) 섹션 → iconcards 필수 (핵심 특징 2~3개: title=짧은 키워드, desc=짧은 보조설명 — 하단 지표 스트립의 재료가 됩니다)
- 공감/고민 섹션 → checklist (독자가 "맞아" 하고 체크할 상황 목록)
- 성분/특징 섹션 → iconcards (성분·특징 카드)
- 사용법/루틴 섹션 → steps (순서 단계)
- 비교 섹션 → compare (표)
- 후기/리뷰 섹션 → quote (인용 후기)
- Q&A/구매장벽 → faq
- 가격/수치 강조 → stats
- 그 외 강조가 필요하면 → heading 또는 cta`;

  const blockSpec = `${blockGuide}

블록 스키마(type별 필드 — 정확히 따를 것. 추가 필드 금지):
- { "type": "checklist", "items": ["...", "..."] }
- { "type": "steps", "items": [{ "title": "...", "desc": "..." }] }
- { "type": "iconcards", "cards": [{ "title": "...", "desc": "..." }] }
- { "type": "stats", "items": [{ "value": "...", "label": "..." }] }
- { "type": "compare", "headers": ["구분","A","B"], "rows": [["행이름","값","값"]] }
- { "type": "quote", "text": "..." }   ← author·rating은 셀러가 입력한 실제 후기가 있을 때만 채우세요. 실제 후기가 없으면 quote 블록 자체를 만들지 마세요(가짜 후기·별점 금지 — 표시광고법).
- { "type": "faq", "items": [{ "q": "...", "a": "..." }] }
- { "type": "heading", "text": "..." }
- { "type": "cta", "text": "...(마무리 행동 촉구 문구)" }   ← button 필드 금지 — 상세페이지 안의 '주문하기/구매하기' 모양 가짜 버튼은 클릭되지 않아 기만 소지. 실제 구매 버튼은 스토어 플랫폼이 제공하므로 문구로만 마무리.
블록 안에서도 copyGuards를 동일하게 지키세요(미입력 사실·과장 금지, 효능은 헤지). 실제 후기가 입력되지 않았다면 단정적 후기를 지어내지 말고 quote 블록은 생략하고 body에서 기대 시나리오로 처리하세요.
⚠️경쟁사·타사 브랜드 실명 금지(비방광고·상표 리스크): 비교가 필요하면 "일반 토너", "기존 제품", "시중 제품"처럼 일반명사로만. 셀러가 입력하지 않은 타 브랜드명(예: 다이슨, 메디힐)·타 산지명을 카피 어디에도 쓰지 마세요.`;

  // 전략 요약(strategy_summary) — 7필드만. 청크가 나뉘어도 매 청크에 동일하게 주입돼 전 섹션 일관성 유지.
  const strategyBlock = `[이 페이지의 전략 요약(strategy_summary) — 모든 섹션 카피가 이 전략을 벗어나면 안 됩니다. 카피가 청크로 나뉘어도 이 요약은 매 청크에 동일하게 주입됩니다]
- 핵심 무기(main_weapon): ${ss.main_weapon || '(없음)'}
- 컨셉(concept, 절대 벗어나지 말 것): ${ss.concept || '(없음)'}
- 히어로 전략(hero_angle, 첫 섹션에서 수행): ${ss.hero_angle || '(없음)'}
- 설득 흐름(story_flow): ${ss.story_flow || '(없음)'}
- 톤(tone): ${ss.tone || '(없음)'}
- 어투(speech_level): ${ss.speech_level || '해요체'}
- ★고객이 진짜 원하는 것(target_desire) — 페이지 전체를 관통하는 감정선, 섹션마다 다른 장면으로 변주: ${ss.target_desire || '(없음)'}
- 고객이 가장 두려워하는 것(target_fear) — 초반 설득 + FAQ/비교에서 해소 대상: ${ss.target_fear || '(없음)'}`;

  const sectionList = items.map((s, j) => {
    const globalIdx = startIndex + j;
    const isFirst = globalIdx === 0;
    const isLast  = globalIdx === totalSections - 1;
    const killerTag = salesMode && killerLineIndex === globalIdx
      ? ' ★★이 섹션이 페이지의 킬러 라인을 맡습니다(아래 킬러 라인 규칙 적용)' : '';
    const tag = (isFirst ? ' ★첫 섹션 — hero_angle 전략 수행' : isLast ? ' ★마지막 섹션 — CTA(전환 유도, story_flow 마지막 단계·concept에 맞춰 행동 촉구)' : '') + killerTag;
    return `${globalIdx + 1}. [${s.name || '섹션'}]${tag}
   역할: ${s.role || '(미정)'}
   임무(mission — 이 제품의 main_weapon을 미는 각도, 반드시 카피에 반영): ${s.mission || '(미정)'}
   ★독자가 느껴야 할 것(emotion_goal — 이 섹션을 읽은 독자가 이 문장을 속으로 떠올리게 만드는 게 목표): ${s.emotion_goal || '(미정)'}
   ★문체(writing_style — 이 섹션은 이 방식으로 쓰되, 바닥 브랜드 톤은 공유): ${s.writing_style || '(미정)'}${hasBlockPlan && s.block_plan ? `
   ★블록 계획(block_plan — 이 섹션의 블록 지시, 그대로 따를 것): ${s.block_plan}` : ''}`;
  }).join('\n\n');

  // 셀러가 입력한 실제 고객 후기 — knownFacts의 "고객 후기:" 블록만 추출(전체 facts 주입 아님 = strategy_summary 설계 유지).
  // 있으면 후기 섹션에서 이 후기만 quote로 인용하도록 지시(없는 후기·별점 날조 금지). 없으면 빈 문자열 → 미래형 시나리오 그대로.
  const reviewMatch = (knownFacts ?? '').match(/고객 후기:\s*([\s\S]*?)(?:\nAI 추천 키워드:|$)/);
  const reviewText = reviewMatch?.[1]?.trim() ?? '';
  const reviewBlock = reviewText
    ? `\n[셀러가 입력한 실제 고객 후기 — 후기/리뷰 섹션에서 아래 후기(들)만 quote 블록으로 인용하세요. 작성자·별점은 아래에 있을 때만 넣고, 여기 없는 후기·별점·작성자를 새로 지어내지 마세요]\n${reviewText}\n`
    : '';

  // ★전체 구성표 + 반복 금지(2026-07-25) — 병렬 청크가 서로의 카피를 못 봐 같은 USP를 재탕하던 문제의 해결.
  const pageMapBlock = pageMap?.length
    ? `

[전체 페이지 구성표 — 이 페이지의 모든 섹션과 각 섹션의 임무입니다. 당신은 이 중 ${startIndex + 1}~${startIndex + items.length}번만 작성합니다]
${pageMap.map((p, i) => `${i + 1}. ${p.name}${p.mission ? ` — ${p.mission}` : ''}`).join('\n')}

[★반복 금지 — 이 페이지에서 가장 흔한 실패가 '같은 말 반복'입니다]
- 독자는 페이지를 위에서 아래로 한 번에 읽습니다. 앞 섹션에서 이미 읽었을 내용을 당신 섹션이 또 말하면 독자는 이탈합니다.
- 각 섹션은 자기 임무(mission)의 고유 주제만 다룹니다. 위 구성표에서 다른 섹션이 맡은 사실(예: 조리법, 재료 구성, 산지 서사, 보관·배송, 가격)은 그 섹션의 몫입니다 — 당신 섹션에서 다시 서술하지 말고, 꼭 필요하면 한 구절로만 스치세요.
- 제품 대표 구절(핵심 재료 조합, 조리 간편성 문구, 산지·전통 서사 등)은 그 주제를 맡은 섹션 한 곳에서만 본격적으로 다룹니다. 같은 명사구·같은 문형을 여러 섹션에 복사하듯 재사용하면 실패입니다.
- 단, 반복 금지는 '표현과 서술'의 규칙입니다 — strategy_summary의 전략·톤은 전 섹션이 공유합니다.`
    : '';

  /* ★판매 디렉팅 강화 블록 — salesMode에서만 붙는다. 기존 규칙은 한 줄도 건드리지 않고 위에 얹는다. */
  const heroBlock = salesMode && startIndex === 0 && items.length === 1 && !isSlide ? HERO_HOOK_RULES : '';
  const killerBlock = salesMode && killerLineIndex !== undefined && !isSlide
    && killerLineIndex >= startIndex && killerLineIndex < startIndex + items.length
    ? killerLineRule(items[killerLineIndex - startIndex]?.name ?? '해당') : '';
  // 킬러 라인이 다른 청크에 있으면, 이 청크는 포인트 컬러를 쓰지 않는다(페이지 전체에서 1곳 보장)
  const noMarkBlock = salesMode && !isSlide && !killerBlock
    ? '\n[★포인트 컬러 금지] 이 청크의 섹션에는 ((포인트 컬러)) 강조를 쓰지 마세요 — 이 페이지의 포인트 컬러는 다른 섹션 한 곳이 맡습니다. **볼드**는 셀러 입력 팩트에 한해 섹션당 1곳까지 허용합니다.'
    : '';
  const lengthBlock = salesMode && !isSlide ? SALES_LENGTH_RULE : '';
  // ★날조 차단은 훅 블록 '뒤'에 온다 — 나중에 읽은 지시가 더 강하게 걸린다.
  //   앞에 두면 열 줄짜리 훅 압력이 이겨서 재료를 지어내는 쪽으로 흐른다(실측).
  const antiFabBlock = salesMode && !isSlide ? antiFabricationRule(knownFacts ?? '') : '';

  const userPrompt = `다음 ${items.length}개 섹션의 카피를 작성하세요. 각 섹션의 목표는 mission을 설명하는 게 아니라, 그 섹션의 emotion_goal(독자가 속으로 느껴야 할 한마디)을 독자가 스스로 떠올리게 만드는 것입니다.

${strategyBlock}${pageMapBlock}

${formRule}${heroBlock}${killerBlock}${noMarkBlock}${lengthBlock}${antiFabBlock}

[헤드라인·훅 변주 — 매 생성 다르게]
- 헤드라인·서브카피·첫 문장(훅)은 생성마다 다른 각도로 쓰세요 — 질문형/선언형/공감형/반전형/수치·팩트형/장면묘사형 중 이 전략에 맞는 것을 선택하되, 가장 흔한 관용 표현("혹시 ~하지 않으셨나요?", "~로 고민이신가요?" 류)에 고정되지 마세요. 화자 가이드의 예시 문장은 예시일 뿐 정답이 아닙니다.
- ⚠️변주는 표현(각도·어순·톤)만: 셀러 입력 팩트(성분·수치·기능·인증)는 정확히 유지하고, 변주를 이유로 새 사실·새 수치를 만들지 마세요.

[작성할 섹션 — 순서·이름 그대로]
${sectionList}

[카테고리 섹션 역할 정답지 — 섹션 이름에 맞는 패턴 적용]
${sectionGuide}

${blockSpec}
${reviewBlock}
${copyGuard}

${COPY_PRINCIPLES}

[출력 형식] — 다른 텍스트 없이 아래 JSON 배열만 반환하세요. 배열 길이는 정확히 ${items.length}개:
[
  {
    "name": "섹션 이름(입력과 동일)",
    "headline": "헤드라인 카피${isSlide ? ' (12자 내외)' : ' (제목형)'}",
    "subcopy": "서브카피 1줄",
    "body": "본문 카피${isSlide ? ' — 1~2문장으로 최소화' : ' — v5 호흡: 짧은 문장이 줄바꿈(\\n)으로 끊겨 흐르는 대화체. 공감→상황→감정→설명. 정보·수치·성분은 그대로. ★분량은 역할별: 훅형 3~6줄·180자 / 설득형 5~9줄·320자'}",
    "blocks": [ /* ${hasBlockPlan ? "block_plan을 따를 것 — '글만'이면 빈 배열 []" : '이 섹션 역할에 맞는 블록 최소 1개 (위 블록 스키마 준수)'} */ ]
  }
]`;

  return { composedSystem, userPrompt };
}

/** 카피 기본 모델(A안) — 2026-07 A/B 검증: v5 호흡·헤지·규격 최상, 비용 4.6 동급 */
export const COPY_MODEL = 'claude-sonnet-5';
/** 카피 B안 모델(블로그형 전용) — ★2026-07-29 Opus 4.8 → GPT-5.6 Luna 교체.
 *  실측(비타민·밤호박 × 8섹션): 날조 0·핵심 팩트 반영 동등·상투구 더 적음, 속도 3배,
 *  원가 16섹션 페이지 기준 약 800원 → 110원. A안(Claude)과 다른 계열이라 A/B 대비도 더 뚜렷.
 *  롤백은 이 상수만 'claude-opus-4-8'로 되돌리면 된다. */
export const COPY_MODEL_ALT = 'gpt-5.6-luna';

/* ── ★모델 프로바이더 분기(2026-07-29) — B안이 GPT(gpt-5.6-luna)로 바뀌면서 필요.
 *    model 문자열 접두사로 판별한다: 'gpt-'/'o1'/'o3'/'o4' → OpenAI, 그 외 → Anthropic.
 *    응답은 { raw, stopReason, outTok }로 통일해 아래 파싱 루프가 프로바이더를 몰라도 되게 한다. ── */
interface LlmReply { raw: string; stopReason: string | null; outTok: number }

function isOpenAIModel(model: string): boolean {
  return /^(gpt-|o[134])/.test(model);
}

/** ★export 이유: 훅 후보 생성 하네스(scripts/hook-candidates.mts)가 실서비스와 동일한 모델·설정으로
 *  호출해야 비교가 성립한다. 하네스 전용 경로를 따로 만들면 하네스에서만 좋은 결과가 나온다. */
export async function callCopyModel(model: string, system: string, user: string): Promise<LlmReply> {
  if (isOpenAIModel(model)) {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: JSON.stringify({
        model,
        messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
        max_completion_tokens: 16000,
      }),
    });
    const j = await res.json() as {
      choices?: Array<{ message?: { content?: string }; finish_reason?: string }>;
      usage?: { completion_tokens?: number };
      error?: { message?: string };
    };
    if (!res.ok) throw new Error(`OpenAI ${res.status}: ${j?.error?.message ?? JSON.stringify(j).slice(0, 200)}`);
    const fin = j.choices?.[0]?.finish_reason ?? null;
    return {
      raw: j.choices?.[0]?.message?.content ?? '',
      // OpenAI 'length' == Anthropic 'max_tokens' (잘림) — 아래 루프가 같은 이름으로 판정하게 정규화
      stopReason: fin === 'length' ? 'max_tokens' : fin,
      outTok: j.usage?.completion_tokens ?? 0,
    };
  }
  const message = await client.messages.create({
    model,
    max_tokens: 16000,   // thinking 포함 상한 — A/B 실측 청크당 사고+출력 합 8K 미만으로 여유
    thinking:   { type: 'adaptive' },
    system,
    messages:   [{ role: 'user', content: user }],
  });
  // adaptive thinking에선 content[0]이 thinking 블록일 수 있음 — text 블록을 찾아서 추출
  return {
    raw: message.content.find(b => b.type === 'text')?.text ?? '',
    stopReason: message.stop_reason ?? null,
    outTok: message.usage?.output_tokens ?? 0,
  };
}

/** 한 청크(≤16섹션)의 카피를 LLM 1회 호출로 생성 — 통합 분할 호출의 기본 단위.
 *  model 인자로 B안 생성에도 재사용(Anthropic·OpenAI 모두 지원 — callCopyModel이 분기). */
export async function runCopyChunk(input: CopyChunkInput, model: string = COPY_MODEL): Promise<CopyOut[]> {
  const { sections: items, startIndex, knownFacts } = input;
  const { composedSystem, userPrompt } = buildCopyChunkPrompts(input);

  // 잘림(max_tokens) 또는 JSON 파싱 실패 시 1회 자동 재시도 (strategy/imagebrief와 동일 패턴).
  // userPrompt·composedSystem(strategy_summary 7필드 포함)은 동일 입력으로 그대로 재주입한다.
  let parsed: unknown = null;
  let lastErr = '';
  for (let attempt = 1; attempt <= COPY_MAX_ATTEMPTS; attempt++) {
    const message = await callCopyModel(model, composedSystem, userPrompt);

    const raw = message.raw;
    console.log(`[copy] chunk@${startIndex} (${items.length}섹션) model=${model} attempt=${attempt}/${COPY_MAX_ATTEMPTS} stop=${message.stopReason} out=${message.outTok} len=${raw.length}`);

    if (message.stopReason === 'max_tokens') {
      lastErr = `청크(${startIndex}~)가 max_tokens(16000)에 도달해 잘렸어요`;
      console.warn(`[copy] ${lastErr} — ${attempt < COPY_MAX_ATTEMPTS ? '자동 재시도' : '재시도 소진'}`);
      continue;
    }

    const first = raw.indexOf('[');
    const last  = raw.lastIndexOf(']');
    if (first === -1 || last === -1 || last < first) {
      lastErr = '응답에서 JSON 배열을 찾을 수 없음';
      console.error(`[copy] ${lastErr} chunk@${startIndex} (attempt ${attempt}). raw head:\n${raw.slice(0, 400)}`);
      continue;
    }

    try {
      const p = JSON.parse(raw.slice(first, last + 1));
      if (!Array.isArray(p)) { lastErr = `JSON이 배열이 아님: ${typeof p}`; continue; }
      // ★개수 검증(P0) — 요청 섹션 수와 응답 수가 다르면 이후 전 섹션이 한 칸씩 밀린 채
      //   조용히 렌더되므로(인덱스 기반 병합) 절대 통과시키지 않는다. 재시도 → 소진 시 명확히 실패.
      if (p.length !== items.length) {
        lastErr = `응답 개수 불일치 — 청크@${startIndex} 요청 ${items.length}개 ↔ 응답 ${p.length}개`;
        console.error(`[copy] ${lastErr} (attempt ${attempt})`);
        continue;
      }
      parsed = p;
      break;
    } catch (parseErr) {
      const pmsg = parseErr instanceof Error ? parseErr.message : String(parseErr);
      lastErr = `JSON 파싱 실패: ${pmsg}`;
      console.error(`[copy] ${lastErr} chunk@${startIndex} (attempt ${attempt})\nraw tail:\n${raw.slice(-400)}`);
      continue;
    }
  }

  if (parsed === null) {
    throw new Error(`카피 생성 실패(청크 ${startIndex}~, ${COPY_MAX_ATTEMPTS}회 시도): ${lastErr}`);
  }
  const mapped = (parsed as Record<string, unknown>[]).map(s => ({
    name:     typeof s.name === 'string' ? s.name : '',
    headline: typeof s.headline === 'string' ? s.headline : '',
    subcopy:  typeof s.subcopy === 'string' ? s.subcopy : '',
    body:     typeof s.body === 'string' ? s.body : '',
    blocks:   Array.isArray(s.blocks) ? (s.blocks as Block[]) : undefined,
  }));
  // ⭐최후 그물: 셀러 원입력에 없는 위험 수치(약 OO Brix 등)·품종 주장 제거(표시광고법 안전망).
  return scrubCopyItems(mapped, knownFacts ?? '');
}

export interface CopyInput {
  dna?: Record<string, unknown>;
  strategy: Strategy;
  sections: SectionPlan[];
  cat?: string;
  ch?: string;
  out?: string | null;
  depth?: string;
  knownFacts?: string;       // 셀러 원입력 — 후처리 날조 그물의 허용 기준
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
  const { dna, strategy, sections, cat, ch, out, depth, knownFacts } = input;

  const category = cat || '화장품';
  const channel  = ch || '스마트스토어';
  const resolvedOut = resolveOutputType(channel, out ?? null);
  const formLabel = resolvedOut === 'slide' ? '슬라이드형' : '블로그형';

  const strategySummary = buildStrategySummary(dna, strategy);
  const total = sections.length;

  console.log(`[copy] cat=${category} ch=${channel} form=${formLabel} sections=${total} chunkSize=${COPY_CHUNK_SIZE}`);

  // ★청크 병렬 — 순차 대기 제거. 결과 순서는 청크 시작 인덱스 순으로 보존.
  const starts: number[] = [];
  for (let i = 0; i < total; i += COPY_CHUNK_SIZE) starts.push(i);
  const parts = await Promise.all(starts.map(i => runCopyChunk({
    strategySummary,
    sections: sections.slice(i, i + COPY_CHUNK_SIZE),
    startIndex: i,
    totalSections: total,
    cat, ch, out, depth, knownFacts,
  })));
  const results: CopyOut[] = parts.flat();

  return {
    sections: results,
    meta: { cat: category, ch: channel, form: formLabel, depth: depth ?? null, count: results.length, outputTypeLabel: OUTPUT_TYPE_LABEL[resolvedOut] },
  };
}
