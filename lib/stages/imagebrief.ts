import Anthropic from '@anthropic-ai/sdk';
import { resolveOutputType, OUTPUT_TYPE_LABEL } from '@/lib/outputType';
import { aspectRatioFor } from '@/lib/sectionAspect';
import { buildV2ImageRules } from '@/lib/imagePromptRules';
import {
  classifyCutArchetype, assignCompositions, type CutArchetype,
  ARCHETYPE_INTENSITY,
  selectScene, sceneToPromptFragment,
} from '@/lib/sectionArchetype';
import { buildPhysicalSizePrompt, resolveProductForm } from '@/lib/productPhysicalSize';
import { selectLayout } from '@/lib/layoutLibrary';
import { composeBrief } from '@/lib/promptComposer';

/** ★Scene Library 롤백 스위치 — 효과 없으면 false 한 줄로 즉시 원상복구(hero·ingredient_macro만 적용 중) */
const USE_SCENE_LIBRARY = true;
/** ★Composer 스위치 — true: Scene+Layout+PhysicalSize→4블록 브리프(composeBrief) / false: 기존 sceneToPromptFragment.
 *  (USE_SCENE_LIBRARY=false면 이 값과 무관하게 둘 다 꺼짐 — 2단 롤백)
 *  ★다이어트 2차: Pose·Director·Composition(배치 설계도) 계층 삭제 — composeBrief가 director를 이미 미사용(A/B 검증). */
const USE_COMPOSER_PROMPT = true;

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
  /** 구도(enum, 코드 배정 — 슬라이드형만. 인접 섹션 중복 없음) */
  composition?: string;
}

export interface ImagebriefInput {
  dna?: Record<string, unknown>;
  strategy: Strategy;
  sections: SectionPlan[];
  copy?: CopyItem[];
  cat?: string;
  ch?: string;
  out?: string | null;
  /** Stage1 큐레이션 팔레트(visualPalette) — 페이지 공통 색·무드로 전 섹션 prompt에 주입(AI 창작 아님) */
  visual?: { primary_color?: string; accent_color?: string; soft_color?: string; mood?: string; palette?: string };
  /** Physical Size Engine 입력(선택) — 셀러가 형태/용량을 지정했을 때만 실물 크기 지시가 켜짐 */
  productForm?: string;
  productVolume?: string;
  productShapeProfile?: string;
}

export interface ImagebriefResult {
  briefs: Brief[];
  meta: { cat: string; ch: string; out: string; outputTypeLabel: string; count: number };
}

/** 컷 아키타입(8종) → 제품 노출 권장 비중 [min,max] (코드 가드).
 *  분류는 lib/sectionArchetype.ts(classifyCutArchetype) 공유 — slideBaked 레이아웃 분기와 동일 기준. */
const ARCHETYPE_BAND: Record<CutArchetype, [number, number]> = {
  hero:             [60, 100],
  empathy:          [0, 20],
  ingredient_macro: [10, 40],
  texture:          [20, 60],
  clinical:         [50, 80],
  editorial:        [20, 60],
  product_only:     [70, 100],
  cta:              [80, 100],
};

function clamp(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return Math.round((min + max) / 2);
  return Math.min(max, Math.max(min, Math.round(n)));
}

export async function runImagebrief(input: ImagebriefInput): Promise<ImagebriefResult> {
  const { dna, strategy, sections, copy, cat, ch, out, visual, productForm, productVolume, productShapeProfile } = input;
  const plan: SectionPlan[] = sections;

  const category = cat || '화장품';
  const channel  = ch || '스마트스토어';
  const resolvedOut = resolveOutputType(channel, out ?? null);
  const isBlogOutput = resolvedOut === 'blog';

  const targetDesire = typeof dna?.target_desire === 'string' ? dna.target_desire : '';
  const targetFear   = typeof dna?.target_fear === 'string' ? dna.target_fear : '';

  // V2 이미지 규칙 — image_mission 우선, 인물/날조/제품일관성/블로그 텍스트 가이드. 슬라이드형만 모델 허용.
  const imageRules = buildV2ImageRules(category, resolvedOut === 'slide');

  // 섹션별 ratio를 코드에서 확정 (9:16 절대 없음. ★슬라이드형은 전 섹션 4:5 고정 — 카드 스택 일관성)
  const ratioByIdx = plan.map(s => aspectRatioFor(s.name, undefined, resolvedOut));
  // ★섹션별 컷 아키타입(8종) — 첫 섹션은 무조건 hero. 브리프 장면 지시 + visibility 밴드 양쪽에 사용.
  const archetypeByIdx: CutArchetype[] = plan.map((s, i) =>
    i === 0 ? 'hero' : classifyCutArchetype(s.name, s.role, s.emotion_goal));
  // 섹션별 제품 노출 권장 비중 [min,max] (코드 가드 — Claude 응답을 이 범위로 clamp)
  const bandByIdx = archetypeByIdx.map(a => ARCHETYPE_BAND[a]);
  // ★구도·강도(enum 고정, 코드 배정 — 슬라이드형만 주입): 인접 중복 없는 구도 순회 + 강-약-강 리듬
  const isSlideOut = resolvedOut === 'slide';
  const compositionByIdx = assignCompositions(archetypeByIdx);
  const intensityByIdx = archetypeByIdx.map(a => ARCHETYPE_INTENSITY[a]);

  // ★Scene Library(hero·ingredient_macro만, 슬라이드만) — category/channel/palette/mood 점수 선택.
  //   Texture 이하 아키타입은 라이브러리 미구축 → selectScene이 null 반환 = 기존 동작 그대로.
  const sceneInput = {
    category, channel,
    palette: visual?.palette,
    mood: [visual?.mood, typeof strategy.tone === 'string' ? strategy.tone : ''].filter(Boolean).join(' '),
  };
  const sceneByIdx = archetypeByIdx.map(a =>
    USE_SCENE_LIBRARY && isSlideOut && (a === 'hero' || a === 'ingredient_macro')
      ? selectScene(a, sceneInput)
      : null);

  // ★Scene 프롬프트 조각 — Composer(Scene+Layout+PhysicalSize→4블록 브리프) 또는 기존 fragment(롤백).
  // ★Physical Size Engine — 셀러가 형태 또는 용량을 지정한 경우에만 제품 맞춤 실물 크기 지시 생성
  //   (미지정이면 undefined → composeBrief의 범용 실물비율 폴백 = 안전 기본값)
  const physicalSize = (productForm || productVolume)
    ? buildPhysicalSizePrompt(resolveProductForm(productForm), productVolume || undefined, productShapeProfile || undefined)
    : undefined;
  if (physicalSize) console.log(`[imagebrief V2] physical size — form=${productForm || '(자동)'} vol=${productVolume || '(기본)'} shape=${productShapeProfile || '(자동)'}`);

  const sceneFragByIdx: string[] = [];
  const pickLog: string[] = [];
  sceneByIdx.forEach((scene, i) => {
    if (!scene) { sceneFragByIdx.push(''); return; }
    if (!USE_COMPOSER_PROMPT) {
      // Composer 오프 → 기존 Scene fragment (롤백 경로 보존)
      sceneFragByIdx.push(sceneToPromptFragment(scene));
      pickLog.push(`${i + 1}:${scene.scene_id}`);
      return;
    }
    // ★Prompt Composer 호출부 — 3계층(Scene·Layout·PhysicalSize)을 브리프 1개로 압축.
    const layout = selectLayout({ ...sceneInput, scene_id: scene.scene_id });
    const brief = composeBrief({ scene, layout, physicalSize });
    sceneFragByIdx.push(` | brief: ${brief}`);
    pickLog.push(`${i + 1}:${scene.scene_id}→${layout.layout_id}`);
  });
  if (pickLog.length) console.log(`[imagebrief V2] scene picks — ${pickLog.join(' ')}`);

  // ★페이지 공통 팔레트 — Stage1 큐레이션 hex(visualPalette)를 값으로 주입(임의 창작 아님). 색·조명 페이지 통일.
  const paletteLine = visual?.primary_color
    ? `\n- ⭐페이지 팔레트(전 섹션의 palette 필드가 이 색 계열을 준수 — 섹션마다 색이 튀면 실패): main ${visual.primary_color}, accent ${visual.accent_color ?? ''}, soft ${visual.soft_color ?? ''}${visual.mood ? `, mood: ${visual.mood}` : ''}. 조명(light)도 페이지 전체 한 가지 톤으로 정해 모든 섹션 prompt에 동일하게 기술하세요(예: soft diffused daylight).`
    : '';

  const strategyBlock = `[이 페이지의 전략 — 이미지 무드·색조가 이 톤을 일관되게 따라야 합니다]
- 컨셉: ${strategy.concept || '(없음)'}
- 톤(이미지 mood/palette로 번역): ${strategy.tone || '(없음)'}
- 설득 흐름: ${strategy.story_flow || '(없음)'}
${dna?.main_weapon ? `- 핵심 무기: ${dna.main_weapon}` : ''}
${targetDesire ? `- ⭐target_desire(페이지 전체가 반복 환기할 욕구, 단 같은 장면 반복 금지): ${targetDesire}` : ''}
${targetFear ? `- target_fear(공감·원인에서 건드릴 두려움): ${targetFear}` : ''}${paletteLine}`;

  const formNote = isBlogOutput
    ? '이 페이지는 블로그형입니다 — 이미지는 텍스트 오버레이가 없는 깨끗한 사진/연출이어야 합니다. prompt에 카피 문구·타이포그래피·숫자 오버레이를 절대 묘사하지 마세요(제품 자체 라벨은 reference 그대로).'
    : `이 페이지는 슬라이드형입니다 — 이미지 위 텍스트 합성(baked)이 허용됩니다. ⚠️단일 구도를 반복하지 마세요 — 각 섹션에 지정된 컷 아키타입(archetype)에 맞는 장면을 설계하세요:
· hero=모델+제품 화보 / empathy=라이프스타일 상황(제품 조연) / ingredient_macro=원료 클로즈업(제품은 소품) / texture=제형·발림 클로즈업 / clinical=신뢰·검증 미니멀 스튜디오 / editorial=브랜드 무드컷 / product_only=제품 단독 스튜디오 / cta=모델+제품+구매 유도.
인접 섹션과 archetype이 같으면(hero·cta 제외) 구도·카메라 거리·배경을 다르게 변주하세요. 페이지 전체가 강-약-강 리듬으로 읽히도록, 각 섹션에 지정된 연출 강도(intensity: strong/medium/quiet)를 그대로 따르세요(quiet=미니멀·여백·소품 최소·차분한 조명, strong=임팩트·밀도 높은 연출). (실제 헤드라인 텍스트는 생성 단계에서 한글로 합성됩니다 — prompt에 글자를 적지 말고 장면·구도·여백만 지시.)`;

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
   컷 아키타입(archetype, 변경 금지 — 장면·구도를 이 종류로 설계): ${archetypeByIdx[gi]}${isSlideOut ? `
   구도(composition, 변경 금지 — prompt의 shot에 이 구도를 그대로 반영): ${compositionByIdx[gi]}
   연출 강도(intensity — 장면 밀도·소품·조명을 이 강도로): ${intensityByIdx[gi]}` : ''}
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
   - prompt: 위를 종합한 영문 이미지 프롬프트. "<natural English scene, 1~2 sentences> | shot: ..., light: ..., mood: ..., palette: ..., props: ..., surface: ...". ${isBlogOutput
      ? '식별되는 동일 얼굴 금지(피부/손/신체일부는 허용).'
      : '★archetype이 hero 또는 cta인 섹션의 prompt에는 "제품을 손에 든 한국인 모델(얼굴 포함, 상반신)"을 영문으로 명시적으로 묘사하세요(예: "a Korean woman in her 20s holding the toner bottle, upper body, facing camera"). 그 외 archetype 섹션은 지정된 장면을 유지하세요(원료/제형/스튜디오 등 — 모델 없이). prompt에 제품명·라벨 문구를 새로 지어 적지 마세요(라벨은 reference 이미지가 결정).'} 인증·수치·시험·EWG·배지 묘사 금지. "portrait/vertical/9:16/tall" 금지.

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
      // ★구도·강도는 코드가 확정(enum) — 슬라이드형은 prompt 끝에 영문 지시로 강제 주입(모델 응답 미신뢰)
      //   Scene(hero·ingredient_macro)이 선택된 섹션은 Director 프롬프트(또는 롤백 시 기존 fragment)를 추가 append.
      const basePrompt = typeof s.prompt === 'string' ? s.prompt : '';
      const sceneFrag = sceneFragByIdx[gi] ?? '';
      // ★Hero 단순화 실험(삭제만): composer 브리프가 있는 섹션은
      //   Claude 구조 접미(| shot:/light:/mood:/palette:/props:/surface:)와 composition/intensity tail을 제거
      //   — 전부 composer STYLE·LAYOUT과 중복. 브리프 없는 섹션은 기존 tail 유지.
      //   ★구조 다이어트: composition/intensity 꼬리 전면 제거 — 80장 기여도 감사에서 발현 증거 없음(★2),
      //   구도 변주는 Viewpoint 축(infoLayout)이 흡수. 구도 다양성 지시는 Claude 프롬프트의 '구도' 필드로 충분.
      const finalPrompt = isSlideOut && basePrompt && sceneFrag
        ? `${basePrompt.split(' | shot:')[0]}${sceneFrag}`
        : basePrompt;
      return {
        section:       typeof s.section === 'string' ? s.section : (items[j]?.name ?? ''),
        ratio:         ratioByIdx[gi],
        image_mission,
        shot_type:     typeof s.shot_type === 'string' ? s.shot_type : '',
        mood:          typeof s.mood === 'string' ? s.mood : '',
        palette:       typeof s.palette === 'string' ? s.palette : '',
        props:         typeof s.props === 'string' ? s.props : '',
        prompt:        finalPrompt,
        composition:   isSlideOut ? compositionByIdx[gi] : undefined,
      };
    });
  }

  // ★청크 병렬 — 순차 대기 제거(16섹션 = 2청크 동시). 결과 순서는 청크 배열 순서로 보존.
  const parts = await Promise.all(chunks.map(c => runChunk(c.items, c.startIdx)));
  const briefs: Brief[] = parts.flat();

  return {
    briefs,
    meta: { cat: category, ch: channel, out: resolvedOut, outputTypeLabel: OUTPUT_TYPE_LABEL[resolvedOut], count: briefs.length },
  };
}
