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

export async function POST(req: NextRequest) {
  // ── 1. 요청 파싱 ──
  let prompt: string, sectionNum: string, productImages: string[] | undefined;
  try {
    const body = await req.json() as { prompt: string; sectionNum: string; productImages?: string[] };
    prompt        = body.prompt;
    sectionNum    = body.sectionNum;
    productImages = body.productImages;
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

  const fullPrompt = hasRefImages
    ? `Korean e-commerce product detail page image. ` +
      `The reference images above show the actual product — maintain the product's exact appearance, colors, shape, and branding throughout. ` +
      `${prompt}. ` +
      `High quality commercial photography, professional studio lighting, clean composition.`
    : `Korean e-commerce product detail page image. ${prompt}. ` +
      `High quality commercial photography, professional studio lighting, clean composition.`;

  const refImageParts = (productImages ?? []).slice(0, 3).map(dataUrl => {
    const [header, data] = dataUrl.split(',');
    const mimeType = header.match(/:(.*?);/)?.[1] ?? 'image/jpeg';
    return { inlineData: { mimeType, data } };
  });

  const body = {
    contents: [{
      role: 'user',
      parts: [...refImageParts, { text: fullPrompt }],
    }],
    generationConfig: { responseModalities: ['IMAGE', 'TEXT'] },
  };

  console.log(`[generate-image] START — ref images: ${refImageParts.length}, prompt length: ${fullPrompt.length}, sectionNum: ${sectionNum}`);
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
