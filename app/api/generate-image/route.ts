import { NextRequest, NextResponse } from 'next/server';

const MODEL   = 'gemini-3.1-flash-image-preview';
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
const TIMEOUT = 120_000; // 120초

const MAX_RETRIES  = 3;
const RETRY_DELAYS = [2_000, 5_000, 10_000]; // 레이트리밋 대비 백오프

async function callGemini(apiKey: string, body: unknown): Promise<Response> {
  return fetch(`${API_URL}?key=${apiKey}`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
    signal:  AbortSignal.timeout(TIMEOUT),
  });
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function errJson(msg: string, extra?: Record<string, unknown>, status = 500) {
  return NextResponse.json({ error: msg, ...extra }, { status });
}

// Gemini가 허용하는 비율 화이트리스트. 9:16(세로 긴 비율) 등 우리가 안 쓰는 것 차단.
const ALLOWED_ASPECT = new Set(['1:1', '4:5', '5:4', '16:9', '9:16', '3:4', '4:3', '3:2', '2:3', '21:9']);

export async function POST(req: NextRequest) {
  // ── 1. 요청 파싱 ──
  let prompt: string, sectionNum: string, productImages: string[] | undefined, outputType: string | undefined, aspectRatio: string | undefined, textZone: 'top' | 'bottom' | undefined;
  try {
    const body = await req.json() as { prompt: string; sectionNum: string; productImages?: string[]; outputType?: string; aspectRatio?: string; textZone?: 'top' | 'bottom' };
    prompt        = body.prompt;
    sectionNum    = body.sectionNum;
    productImages = body.productImages;
    outputType    = body.outputType;
    aspectRatio   = body.aspectRatio;
    textZone      = body.textZone;   // 'top'|'bottom' = 오버레이 텍스트존 확보(여백) + 텍스트 굽기 금지. 슬라이드 Hero 전용.
  } catch (e) {
    console.error('[generate-image] req.json() 실패:', e);
    return errJson('요청 본문 파싱 실패', {}, 400);
  }

  if (!prompt) {
    return errJson('prompt required', {}, 400);
  }

  // ── 2. API 키 확인 ──
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('[generate-image] GEMINI_API_KEY 환경변수 없음');
    return errJson('GEMINI_API_KEY not set');
  }

  // ── 3. 페이로드 구성 ──
  const hasRefImages = productImages && productImages.length > 0;
  const isBlog       = outputType === 'blog';

  // 제품 reference 보존 — 최우선. ref 이미지가 있을 때만 의미 있음.
  const PRODUCT_RULES = hasRefImages
    ? `The reference images above show the actual product. CRITICAL: maintain the product's EXACT appearance, color, shape, label, and branding identically in every image. Even when showing ingredients, materials, backgrounds, or skin close-ups, the same product from the reference must remain consistent across all images.`
    : '';

  // 구성품 폴백 가드 — reference에 없는 구성품·공병·타사 제품을 임의 생성하는 것을 막는다. ref 이미지가 있을 때만 의미 있음.
  const COMPONENT_RULES = hasRefImages
    ? `Only depict the exact product(s) shown in the reference images. For bundle/option shots, show only multiples of the referenced product. ` +
      `Never invent additional cosmetic containers, bottles, jars, or unrelated products not present in the reference. ` +
      `Props must be non-product objects only (stones, plants, water, fabric, trays).`
    : '';

  // 인물 정책 (V2 정정) — 감정/상황 전달용 신체 일부·피부 클로즈업은 허용, 식별되는 동일 모델 얼굴·화보만 금지.
  // (붉어진 볼·따가운 순간 등 공감/원인 컷을 막지 않도록. 일관된 얼굴 모델은 향후 가상모델 시스템 담당.)
  const PEOPLE_RULES =
    `Skin and body-part close-ups WITHOUT a recognizable face are allowed for emotion/situation ` +
    `(e.g. cheek with mild redness, jawline, neck, hands, back of hand skin, a fingertip touching skin). ` +
    `Do NOT show a recognizable full face, a consistent brand model, or a fashion-style model wearing/holding the product as the focus.`;

  // 미입력 사실 날조 금지 (코드 가드, 항상 적용) — 셀러가 입력하지 않은 인증·수치·시험결과를 이미지에 그리지 못하게.
  const NO_FAKE_DATA_RULES =
    `Do NOT render any certification marks, seals, badges, test/clinical results, EWG grades, percentages, ` +
    `statistics, graphs, or invented packaging copy. Convey "tested/safe" only through clean clinical mood, never as data.`;

  // 텍스트 금지 — 블로그형 전체 + (슬라이드라도) textZone 지정 시. textZone은 프론트가 진짜 폰트로
  // 텍스트를 얹는 overlay 방식 → Gemini가 글자를 구워 넣으면(한글 깨짐) 안 되므로 동일하게 금지.
  const TEXT_RULES = (isBlog || textZone)
    ? `Do NOT render any text, letters, numbers, labels, or typography overlaid on the image (the product's own existing label and branding from the reference must remain as-is). Clean photographic image, no captions.`
    : '';

  // 텍스트존 확보(여백) — 슬라이드 Hero overlay 전용. 정해진 영역(상단/하단)을 '깨끗하고 단순한 여백'으로
  // 비워, 프론트 텍스트가 제품/주요 피사체 위에 겹치지 않게 한다. 위치 고정 = AI가 매번 다른 데 비우지 않게.
  const TEXTZONE_RULES = textZone === 'top'
    ? `Composition: keep the TOP ~40% of the frame as clean, simple, uncluttered negative space (a soft, smooth gradient or plain out-of-focus background) with NO product, NO main subject, and NO busy detail in that top area — it is reserved for a text overlay added later. Place the product and main subject in the LOWER ~60% of the frame.`
    : textZone === 'bottom'
    ? `Composition: keep the BOTTOM ~30% of the frame as clean, simple, uncluttered negative space reserved for a text overlay added later. Place the product and main subject in the UPPER portion.`
    : '';

  const rulesTail = [COMPONENT_RULES, PEOPLE_RULES, NO_FAKE_DATA_RULES, TEXT_RULES, TEXTZONE_RULES].filter(Boolean).join(' ');

  // 끝부분 마침표/공백 정리 — Claude 출력이 '.'으로 끝나도 우리가 또 찍지 않도록
  const cleanedPrompt = prompt.trim().replace(/[.\s]+$/, '');

  // 순서: 컨텍스트 → positive 미적 지시(Claude의 영문 시각 키워드) → 제품 일관성 → negation
  // generic 꼬리("High quality commercial photography, professional studio lighting, clean composition.")는
  // Gemini 디폴트 룩을 호출해 결과가 밋밋해지므로 제거. 미감은 Claude의 imageDesc(영문 키워드)가 담당.
  const fullPrompt = [
    `Korean e-commerce product detail page image.`,
    `${cleanedPrompt}.`,
    PRODUCT_RULES,
    rulesTail,
  ].filter(Boolean).join(' ');

  const refImageParts = (productImages ?? []).slice(0, 3).map(dataUrl => {
    const [header, data] = dataUrl.split(',');
    const mimeType = header.match(/:(.*?);/)?.[1] ?? 'image/jpeg';
    return { inlineData: { mimeType, data } };
  });

  const validAspect = aspectRatio && ALLOWED_ASPECT.has(aspectRatio) ? aspectRatio : undefined;

  const body = {
    contents: [{
      role: 'user',
      parts: [...refImageParts, { text: fullPrompt }],
    }],
    generationConfig: {
      responseModalities: ['IMAGE', 'TEXT'],
      ...(validAspect ? { imageConfig: { aspectRatio: validAspect } } : {}),
    },
  };

  console.log(`[generate-image] START — ref images: ${refImageParts.length}, prompt length: ${fullPrompt.length}, sectionNum: ${sectionNum}, aspectRatio: ${validAspect ?? 'default'}`);
  console.log(`[generate-image] prompt preview: "${fullPrompt.slice(0, 150)}"`);

  let lastError = '';

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      const delay = RETRY_DELAYS[attempt - 1];
      console.log(`[generate-image] retry ${attempt}/${MAX_RETRIES - 1} after ${delay}ms (prev error: ${lastError})`);
      await sleep(delay);
    }

    // ── 4. Gemini 호출 ──
    let geminiRes: Response;
    try {
      geminiRes = await callGemini(apiKey, body);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[generate-image] fetch 실패 (attempt ${attempt}):`, msg);
      lastError = msg;
      if (msg.includes('timeout') || msg.includes('TimeoutError')) {
        return errJson('이미지 생성 시간 초과 (120초). 다시 시도해 주세요.', { sectionNum }, 504);
      }
      continue;
    }

    console.log(`[generate-image] Gemini HTTP status: ${geminiRes.status} (attempt ${attempt})`);

    // 429 · 503 → 재시도
    if (geminiRes.status === 429 || geminiRes.status === 503) {
      const text = await geminiRes.text().catch(() => '');
      lastError = `HTTP ${geminiRes.status}`;
      console.warn(`[generate-image] ${geminiRes.status} — 재시도 예정:`, text.slice(0, 300));
      continue;
    }

    // 그 외 4xx/5xx → 즉시 반환
    if (!geminiRes.ok) {
      const text = await geminiRes.text().catch(() => '');
      console.error(`[generate-image] Gemini 오류 ${geminiRes.status}:`, text.slice(0, 500));
      return errJson(
        `Gemini API 오류 (${geminiRes.status}): ${text.slice(0, 200)}`,
        { sectionNum },
        geminiRes.status >= 500 ? 502 : geminiRes.status,
      );
    }

    // ── 5. 응답 파싱 ──
    let data: Record<string, unknown>;
    try {
      data = await geminiRes.json();
    } catch (e) {
      console.error(`[generate-image] 응답 JSON 파싱 실패 (attempt ${attempt}):`, e);
      lastError = 'JSON parse error';
      continue;
    }

    // ── 6. 응답 구조 분석 ──
    const promptFeedback = data?.promptFeedback as Record<string, unknown> | undefined;
    const candidates     = data?.candidates as Array<Record<string, unknown>> | undefined;

    // safety filter로 전체 차단된 경우
    if (promptFeedback?.blockReason) {
      const reason = promptFeedback.blockReason as string;
      console.error(`[generate-image] promptFeedback 차단: ${reason}`, JSON.stringify(promptFeedback));
      return errJson(
        `안전 정책으로 이미지 생성이 차단되었습니다 (${reason}). 프롬프트를 수정해 주세요.`,
        { sectionNum, blockReason: reason },
      );
    }

    // candidates 없거나 비어있음
    if (!candidates || candidates.length === 0) {
      console.error('[generate-image] candidates 없음. 전체 응답:', JSON.stringify(data).slice(0, 600));
      lastError = 'empty candidates';
      continue;
    }

    const candidate = candidates[0];
    const finishReason = candidate?.finishReason as string | undefined;

    console.log(`[generate-image] finishReason: ${finishReason}`);

    // safety filter로 개별 candidate 차단
    if (finishReason === 'SAFETY' || finishReason === 'RECITATION') {
      const safetyRatings = candidate?.safetyRatings;
      console.error(`[generate-image] candidate 차단 (${finishReason}):`, JSON.stringify(safetyRatings));
      return errJson(
        `안전 정책으로 이미지 생성이 거부되었습니다 (${finishReason}).`,
        { sectionNum, finishReason },
      );
    }

    const parts = (candidate?.content as Record<string, unknown>)?.parts as Array<Record<string, unknown>> ?? [];

    console.log(
      `[generate-image] parts count: ${parts.length}`,
      '| types:', parts.map(p => Object.keys(p).join(',')).join(' / '),
    );

    const imagePart = parts.find(p => p.inlineData) as
      { inlineData: { mimeType: string; data: string } } | undefined;

    if (!imagePart?.inlineData) {
      // 텍스트만 있는 경우 내용 확인
      const textParts = parts.filter(p => p.text).map(p => String(p.text).slice(0, 200));
      console.error(
        `[generate-image] image part 없음. finishReason: ${finishReason}`,
        '텍스트 parts:', textParts,
        '전체 응답 일부:', JSON.stringify(data).slice(0, 800),
      );
      lastError = `no image part (finishReason: ${finishReason ?? 'none'})`;
      // 마지막 시도가 아니면 재시도
      if (attempt < MAX_RETRIES - 1) continue;
      return errJson(
        `이미지가 반환되지 않았습니다 (${finishReason ?? 'unknown reason'}). 다시 시도해 주세요.`,
        { sectionNum, finishReason, textParts },
      );
    }

    // ── 7. 성공 ──
    console.log(`[generate-image] 성공 — mimeType: ${imagePart.inlineData.mimeType}, data length: ${imagePart.inlineData.data.length}`);
    return NextResponse.json({
      imageBase64: imagePart.inlineData.data,
      mimeType:    imagePart.inlineData.mimeType,
      sectionNum,
    });
  }

  // 모든 재시도 소진
  console.error(`[generate-image] ${MAX_RETRIES}회 모두 실패. 마지막 에러: ${lastError}`);
  return errJson(
    `${MAX_RETRIES}회 시도 후 실패: ${lastError}. 잠시 후 다시 시도해 주세요.`,
    { sectionNum },
    503,
  );
}
