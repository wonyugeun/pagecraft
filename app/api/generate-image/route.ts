import { NextRequest, NextResponse } from 'next/server';

const MODEL   = 'gemini-3.1-flash-image-preview';
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
const TIMEOUT = 120_000; // 120초

const MAX_RETRIES  = 3;
const RETRY_DELAYS = [2_000, 5_000, 10_000]; // 레이트리밋 대비 백오프

async function callGemini(apiKey: string, body: unknown, attempt: number): Promise<Response> {
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

export async function POST(req: NextRequest) {
  const { prompt, sectionNum, productImages } = await req.json() as {
    prompt: string;
    sectionNum: string;
    productImages?: string[]; // base64 data URLs (e.g. "data:image/jpeg;base64,...")
  };

  if (!prompt) {
    return NextResponse.json({ error: 'prompt required' }, { status: 400 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'GEMINI_API_KEY not set' }, { status: 500 });
  }

  const hasRefImages = productImages && productImages.length > 0;

  const fullPrompt = hasRefImages
    ? `Korean e-commerce product detail page image. ` +
      `The reference images above show the actual product — maintain the product's exact appearance, colors, shape, and branding throughout. ` +
      `${prompt}. ` +
      `High quality commercial photography, professional studio lighting, clean composition.`
    : `Korean e-commerce product detail page image. ${prompt}. ` +
      `High quality commercial photography, professional studio lighting, clean composition.`;

  // 제품 참조 이미지 parts 구성 (최대 3장)
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

  console.log(`[generate-image] ref images: ${refImageParts.length}, prompt: ${fullPrompt.slice(0, 120)}`);

  let lastError = '';

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      const delay = RETRY_DELAYS[attempt - 1];
      console.log(`[generate-image] retry ${attempt}/${MAX_RETRIES - 1} after ${delay}ms (prev: ${lastError})`);
      await sleep(delay);
    }

    let geminiRes: Response;
    try {
      geminiRes = await callGemini(apiKey, body, attempt);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[generate-image] fetch error (attempt ${attempt}):`, msg);
      lastError = msg;
      const isTimeout = msg.includes('timeout') || msg.includes('TimeoutError');
      if (isTimeout) {
        // 타임아웃은 재시도해도 의미없을 수 있으므로 즉시 반환
        return NextResponse.json({ error: 'timeout', sectionNum }, { status: 504 });
      }
      continue;
    }

    // 429(레이트리밋) · 503(일시 과부하) → 재시도
    if (geminiRes.status === 429 || geminiRes.status === 503) {
      const text = await geminiRes.text().catch(() => '');
      lastError = `HTTP ${geminiRes.status}`;
      console.warn(`[generate-image] ${geminiRes.status} rate-limit/overload (attempt ${attempt}):`, text.slice(0, 200));
      continue;
    }

    if (!geminiRes.ok) {
      const text = await geminiRes.text().catch(() => '');
      console.error(`[generate-image] Gemini ${geminiRes.status}:`, text.slice(0, 300));
      return NextResponse.json(
        { error: `Gemini ${geminiRes.status}`, detail: text.slice(0, 200), sectionNum },
        { status: geminiRes.status },
      );
    }

    const data  = await geminiRes.json();
    const parts = data?.candidates?.[0]?.content?.parts ?? [];

    console.log('[generate-image] parts count:', parts.length,
      '| types:', parts.map((p: Record<string, unknown>) => Object.keys(p).join(',')).join(' / '));

    const imagePart = parts.find((p: { inlineData?: { mimeType: string; data: string } }) => p.inlineData);

    if (!imagePart?.inlineData) {
      console.error('[generate-image] No image part. Full response:', JSON.stringify(data).slice(0, 500));
      return NextResponse.json({ error: 'No image returned', sectionNum }, { status: 500 });
    }

    return NextResponse.json({
      imageBase64: imagePart.inlineData.data,
      mimeType:    imagePart.inlineData.mimeType,
      sectionNum,
    });
  }

  // 모든 재시도 소진
  console.error(`[generate-image] all ${MAX_RETRIES} attempts failed. last error: ${lastError}`);
  return NextResponse.json(
    { error: `Failed after ${MAX_RETRIES} attempts: ${lastError}`, sectionNum },
    { status: 503 },
  );
}
