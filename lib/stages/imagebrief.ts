import Anthropic from '@anthropic-ai/sdk';
import { resolveOutputType, OUTPUT_TYPE_LABEL } from '@/lib/outputType';
import { aspectRatioFor } from '@/lib/sectionAspect';
import { buildV2ImageRules } from '@/lib/imagePromptRules';

/**
 * Stage4 V2 (이미지 브리프 생성) — image_mission("왜 이 사진이 필요한가") 우선 설계.
 *
 * 핵심 전환(P1-1 진단 결과 반영): shot_type을 먼저 정해 전부 "제품 정물"로 수렴하던 구조를 버리고,
 *   image_mission(emotion_goal·target_fear/desire·headline+body·mission에서 도출) → shot_type(결과값)
 * 순서로 생성한다.
 *
 * 역할 분리:
 *   - AI(Claude): image_mission + brief 생성 (왜/무엇을 느끼게/주인공)
 *   - 코드 가드: product_visibility를 섹션 role 기반 권장 비중으로 clamp.
 *     인물 정책·미입력 사실 날조 금지·텍스트 오버레이 금지는 generate-image route의 코드 negation이 강제.
 *
 * Stage1/2/3 변경 없음 — emotion_goal(plan), body(copy), target_desire/fear(dna)는 이미 전달받는 값을 "사용"만 한다.
 * ratio는 코드에서 확정(9:16 원천 차단). 실제 Gemini 이미지 생성은 하지 않는다(브리프 JSON만).
 */

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// V2는 image_mission 7필드를 섹션마다 길게 생성해 V1보다 출력이 훨씬 길다.
// → 청크당 섹션 수를 줄이고(16→8) max_tokens를 넉넉히(8000→16000) 상향, 잘림 시 1회 자동 재시도.
const CHUNK_SIZE = 8;
const MAX_TOKENS = 16000;
const MAX_ATTEMPTS = 2; // 최초 1 + 자동 재시도 1

interface Strategy {
  concept?: string;
  story_flow?: string;
  tone?: string;
  hero_angle?: string;
  cta_angle?: string;
  [k: string]: unknown;
}
interface SectionPlan { name?: string; role?: string; mission?: string; emotion_goal?: string }
interface CopyItem { name?: string; headline?: string; subcopy?: string; body?: string }

/** image_mission — "왜 이 사진이 필요한가"를 shot_type보다 먼저 확정하는 블록 */
export interface ImageMission {
  purpose: string;            // 이 이미지가 페이지에서 해야 할 일
  emotion: string;            // 보는 사람이 느껴야 할 감정 (emotion_goal 연동)
  desired_reaction: string;   // 본 직후 독자의 속마음
  target_desire_link: string; // target_desire를 이 섹션에서 어떤 표정으로 환기하는가
  visual_focus: string;       // 화면의 주인공 (상황/피부/손/제품/원료 …)
  product_visibility: number; // 0~100 (섹션 role 기반 코드 clamp)
  visual_priority: string[];  // 이 컷의 주인공 순서 (예: ["붉어진 볼","불안한 순간","제품"])
}

export interface Brief {
  section: string;
  ratio: string;
  image_mission: ImageMission;
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

/** 섹션 role/name/emotion_goal → 제품 노출 권장 비중 [min,max] (코드 가드).
 *  공감/원인 0~20, 솔루션 40~70, 신뢰 50~80, CTA 80~100. 미분류는 완만한 기본값. */
type Archetype = 'empathy' | 'cause' | 'solution' | 'trust' | 'cta' | 'neutral';

const ARCHETYPE_BAND: Record<Archetype, [number, number]> = {
  empathy:  [0, 20],
  cause:    [0, 20],
  solution: [40, 70],
  trust:    [50, 80],
  cta:      [80, 100],
  neutral:  [30, 90],
};

const CTA_KEYS     = ['cta', '구매', '결제', '마무리', '결정', '클로징', '클릭'];
const TRUST_KEYS   = ['신뢰', '인증', '테스트', '안전', '검증', '비교', '후기', '리뷰', '스펙', 'faq', '의심', '이의', '배지', '보증'];
const EMPATHY_KEYS = ['공감', '고민', '일상', '불편', '걱정', '망설'];
const CAUSE_KEYS   = ['원인', '이유', '왜'];
const SOLUTION_KEYS = ['솔루션', '해결', '제형', '사용', '효과', '진정', '성분', '원료', '제안', '루틴', '텍스처', '체험'];

function classifyArchetype(name = '', role = '', emotion = ''): Archetype {
  const hay = `${name} ${role} ${emotion}`.toLowerCase();
  const hit = (keys: string[]) => keys.some(k => hay.includes(k.toLowerCase()));
  // CTA/신뢰를 솔루션 키워드보다 먼저 (구매·인증이 더 구체적 신호)
  if (hit(CTA_KEYS))      return 'cta';
  if (hit(TRUST_KEYS))    return 'trust';
  if (hit(EMPATHY_KEYS))  return 'empathy';
  if (hit(CAUSE_KEYS))    return 'cause';
  if (hit(SOLUTION_KEYS)) return 'solution';
  return 'neutral';
}

function clamp(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return Math.round((min + max) / 2);
  return Math.min(max, Math.max(min, Math.round(n)));
}

export async function runImagebrief(input: ImagebriefInput): Promise<ImagebriefResult> {
  const { dna, strategy, sections, copy, cat, ch, out } = input;
  const plan: SectionPlan[] = sections;

  const category = cat || '화장품';
  const channel  = ch || '스마트스토어';
  const resolvedOut = resolveOutputType(channel, out ?? null);
  const isBlogOutput = resolvedOut === 'blog';

  const targetDesire = typeof dna?.target_desire === 'string' ? dna.target_desire : '';
  const targetFear   = typeof dna?.target_fear === 'string' ? dna.target_fear : '';

  // V2 이미지 규칙 — image_mission 우선, 인물/날조/제품일관성/블로그 텍스트 가이드
  const imageRules = buildV2ImageRules(category);

  // 섹션별 ratio를 코드에서 확정 (9:16 절대 없음)
  const ratioByIdx = plan.map(s => aspectRatioFor(s.name));
  // 섹션별 제품 노출 권장 비중 [min,max] (코드 가드 — Claude 응답을 이 범위로 clamp)
  const bandByIdx = plan.map(s => ARCHETYPE_BAND[classifyArchetype(s.name, s.role, s.emotion_goal)]);

  const strategyBlock = `[이 페이지의 전략 — 이미지 무드·색조가 이 톤을 일관되게 따라야 합니다]
- 컨셉: ${strategy.concept || '(없음)'}
- 톤(이미지 mood/palette로 번역): ${strategy.tone || '(없음)'}
- 설득 흐름: ${strategy.story_flow || '(없음)'}
${dna?.main_weapon ? `- 핵심 무기: ${dna.main_weapon}` : ''}
${targetDesire ? `- ⭐target_desire(페이지 전체가 반복 환기할 욕구, 단 같은 장면 반복 금지): ${targetDesire}` : ''}
${targetFear ? `- target_fear(공감·원인에서 건드릴 두려움): ${targetFear}` : ''}`;

  const formNote = isBlogOutput
    ? '이 페이지는 블로그형입니다 — 이미지는 텍스트 오버레이가 없는 깨끗한 사진/연출이어야 합니다. prompt에 카피 문구·타이포그래피·숫자 오버레이를 절대 묘사하지 마세요(제품 자체 라벨은 reference 그대로).'
    : '이 페이지는 슬라이드형입니다 — 이미지 위 텍스트 합성이 허용됩니다. 단 카피 원문을 그대로 넣지 말고, 합성 가능한 영역(negative space)을 prompt에 확보하세요. ★단 첫 섹션(Hero)은 프론트에서 진짜 폰트로 텍스트를 얹는 overlay 방식이므로 prompt에 글자·타이포를 넣지 말고, 상단 ~40%를 "깨끗하고 단순한 여백(soft gradient/plain background, 제품·피사체 없음)"으로 비우라고 명시하세요(위치 고정). 제품·주요 피사체는 하단 ~60%에 배치.';

  console.log(`[imagebrief V2] cat=${category} ch=${channel} out=${resolvedOut} sections=${plan.length} desire="${targetDesire.slice(0, 24)}"`);

  const chunks: { items: SectionPlan[]; startIdx: number }[] = [];
  for (let i = 0; i < plan.length; i += CHUNK_SIZE) {
    chunks.push({ items: plan.slice(i, i + CHUNK_SIZE), startIdx: i });
  }

  async function runChunk(items: SectionPlan[], startIdx: number): Promise<Brief[]> {
    const sectionList = items.map((s, j) => {
      const gi = startIdx + j;
      const c = copy?.[gi];
      const [vmin, vmax] = bandByIdx[gi];
      return `${gi + 1}. 섹션명: ${s.name || '섹션'}
   역할(role): ${s.role || '(미정)'}
   섹션 임무(mission): ${s.mission || '(미정)'}
   ★독자가 느껴야 할 감정(emotion_goal): ${s.emotion_goal || '(미정)'}
   헤드라인(headline — 이 섹션의 핵심 감정 문장. body와 동급으로 반드시 반영, 무시 금지): ${c?.headline || '(없음)'}
   본문(body — 구체 상황/맥락. visual_focus를 여기서 도출, 추상 은유로 점프 금지): ${c?.body ? c.body.slice(0, 280) : '(없음)'}
   제품 노출 권장 비중(product_visibility, 이 범위 내로): ${vmin}~${vmax}%
   고정 비율(ratio, 변경 금지): ${ratioByIdx[gi]}`;
    }).join('\n\n');

    const userPrompt = `당신은 화장품 상세페이지의 이미지 아트디렉터입니다. 아래 ${items.length}개 섹션 각각에 대해, 먼저 image_mission("왜 이 사진이 필요한가")을 확정한 뒤, 이를 만족시키는 Gemini 촬영 브리프를 작성하세요.

${strategyBlock}

[형태 규칙] ${formNote}

${imageRules}

[작성할 섹션]
${sectionList}

[작성 순서 — 반드시 이대로]
1) 먼저 image_mission 7필드를 결정합니다. emotion_goal·target_fear/target_desire·headline+body·mission을 종합해 "이 컷이 왜 필요하고 무엇을 느끼게 할지"를 정합니다. (shot_type을 먼저 정하지 마세요.)
   - purpose: 이 이미지가 페이지에서 해야 할 일 (한 문장)
   - emotion: 보는 사람이 느껴야 할 감정 (emotion_goal과 일치)
   - desired_reaction: 본 직후 독자의 속마음 한마디 (예: "맞아, 내 얘기네")
   - target_desire_link: target_desire를 이 섹션에서 어떤 표정으로 환기하는가 (섹션마다 다른 장면으로 변주)
   - visual_focus: 화면의 주인공 (body의 구체 상황에서 도출 — 예: "붉어진 볼", "진정된 손등 피부", "제품 히어로")
   - product_visibility: 위 권장 비중 범위 안의 정수 (공감/원인은 제품을 거의/전혀 넣지 않음)
   - visual_priority: 이 컷 주인공의 우선순위 배열 (예: ["붉어진 볼","불안한 아침","제품 없음"])
2) 그 다음 image_mission을 시각적으로 구현하는 shot_type/mood/palette/props/prompt를 도출합니다(shot_type은 결과값).
   - shot_type: image_mission을 가장 잘 수행하는 촬영 유형(한국어 한 단어~짧은 구). 공감/원인이면 제품컷이 아니라 피부·상황 클로즈업이 될 수 있습니다.
   - mood: 전략 tone + emotion을 영문 무드 키워드로.
   - palette: 영문 색조.
   - props: 비제품 소품만(식물·물방울·돌·천). reference에 없는 화장품 용기·구성품 금지.
   - prompt: 위를 종합한 영문 이미지 프롬프트. "<natural English scene, 1~2 sentences> | shot: ..., light: ..., mood: ..., palette: ..., props: ..., surface: ...". 식별되는 동일 얼굴 금지(피부/손/신체일부는 허용). 인증·수치·시험·EWG·배지 묘사 금지. "portrait/vertical/9:16/tall" 금지.

[출력 형식] — 다른 텍스트 없이 JSON 배열만, 길이 정확히 ${items.length}개:
[
  {
    "section": "섹션명(입력과 동일)",
    "image_mission": { "purpose": "...", "emotion": "...", "desired_reaction": "...", "target_desire_link": "...", "visual_focus": "...", "product_visibility": 0, "visual_priority": ["...","..."] },
    "shot_type": "...", "mood": "...(영문)", "palette": "...(영문)", "props": "...", "prompt": "...(영문, 위 형식)"
  }
]`;

    // 잘림(max_tokens) 또는 JSON 파싱 실패 시 1회 자동 재시도 (strategy 스테이지와 동일 패턴)
    let parsed: unknown = null;
    let lastErr = '';
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const message = await client.messages.create({
        model:      'claude-sonnet-4-6',
        max_tokens: MAX_TOKENS,
        messages:   [{ role: 'user', content: userPrompt }],
      });

      const raw = message.content[0]?.type === 'text' ? message.content[0].text : '';
      console.log(`[imagebrief V2] chunk@${startIdx} attempt=${attempt}/${MAX_ATTEMPTS} stop=${message.stop_reason} out=${message.usage?.output_tokens} len=${raw.length}`);

      if (message.stop_reason === 'max_tokens') {
        lastErr = `청크(${startIdx}~)가 max_tokens(${MAX_TOKENS})에 도달해 잘렸어요`;
        console.warn(`[imagebrief V2] ${lastErr} — ${attempt < MAX_ATTEMPTS ? '자동 재시도' : '재시도 소진'}`);
        continue;
      }

      const first = raw.indexOf('[');
      const last  = raw.lastIndexOf(']');
      if (first === -1 || last === -1 || last < first) {
        lastErr = '응답에서 JSON 배열을 찾을 수 없음';
        console.error(`[imagebrief V2] ${lastErr} chunk@${startIdx} (attempt ${attempt}). raw head:\n${raw.slice(0, 400)}`);
        continue;
      }

      try {
        const p = JSON.parse(raw.slice(first, last + 1));
        if (!Array.isArray(p)) { lastErr = `JSON이 배열이 아님: ${typeof p}`; continue; }
        parsed = p;
        break;
      } catch (parseErr) {
        const pmsg = parseErr instanceof Error ? parseErr.message : String(parseErr);
        lastErr = `JSON 파싱 실패: ${pmsg}`;
        console.error(`[imagebrief V2] ${lastErr} chunk@${startIdx} (attempt ${attempt})\nraw tail:\n${raw.slice(-400)}`);
        continue;
      }
    }

    if (parsed === null) {
      throw new Error(`이미지 브리프 생성 실패(청크 ${startIdx}~, ${MAX_ATTEMPTS}회 시도): ${lastErr}`);
    }

    // ratio·product_visibility는 코드에서 확정(가드) — 모델 응답을 신뢰하지 않음
    return (parsed as Record<string, unknown>[]).map((s, j) => {
      const gi = startIdx + j;
      const [vmin, vmax] = bandByIdx[gi];
      const im = (s.image_mission ?? {}) as Record<string, unknown>;
      const rawVis = typeof im.product_visibility === 'number'
        ? im.product_visibility
        : Number(im.product_visibility);
      const image_mission: ImageMission = {
        purpose:            typeof im.purpose === 'string' ? im.purpose : '',
        emotion:            typeof im.emotion === 'string' ? im.emotion : '',
        desired_reaction:   typeof im.desired_reaction === 'string' ? im.desired_reaction : '',
        target_desire_link: typeof im.target_desire_link === 'string' ? im.target_desire_link : '',
        visual_focus:       typeof im.visual_focus === 'string' ? im.visual_focus : '',
        product_visibility: clamp(rawVis, vmin, vmax),  // ← 코드 가드: 섹션 role 기반 비중으로 강제
        visual_priority:    Array.isArray(im.visual_priority) ? im.visual_priority.map(String) : [],
      };
      return {
        section:       typeof s.section === 'string' ? s.section : (items[j]?.name ?? ''),
        ratio:         ratioByIdx[gi],
        image_mission,
        shot_type:     typeof s.shot_type === 'string' ? s.shot_type : '',
        mood:          typeof s.mood === 'string' ? s.mood : '',
        palette:       typeof s.palette === 'string' ? s.palette : '',
        props:         typeof s.props === 'string' ? s.props : '',
        prompt:        typeof s.prompt === 'string' ? s.prompt : '',
      };
    });
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
