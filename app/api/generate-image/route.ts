import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { verifyPaidJob, creditsBypassEnabled, consumeUsageQuota, checkRateLimit, clientIp } from '@/lib/db';
import { calculateImageQuota, imageQuotaWeight } from '@/lib/pricing';
import { API_ERROR_CODES } from '@/lib/apiErrors';

/**
 * 이미지 생성 라우트 — GPT Image 2 (OpenAI Images / generations).
 *
 * [교체 이력] Gemini(gemini-3.1-flash-image) → GPT Image 2(gpt-image-2).
 *   이유: 한글 텍스트 baked 정확도(Gemini는 깨짐) + 2:3 네이티브 + 마케팅 퀄리티. 격리 테스트 통과.
 *   클라이언트 응답 계약 { imageBase64, mimeType }은 그대로 유지 → 호출부 7곳 무수정.
 *
 * [현재 범위] 제품 사진(productImages) 유무로 엔드포인트 분기.
 *   있음 → /v1/images/edits (멀티파트, image[]에 첨부) = 제품 충실도 reference 반영.
 *   없음 → /v1/images/generations (text-to-image) 폴백 = 기존 동작.
 *   모델(gpt-image-2)·프롬프트·응답 파싱·retry·에러 분기는 두 경로 공통(재사용).
 *
 * [overlay 보류] textZone(상단 여백 확보) 분기는 코드로 남겨둠(롤백 가능) — 현재 baked 채택이라
 *   클라가 textZone을 보내지 않으면 동작 안 함. overlay로 되돌리려면 클라에서 textZone 재전송.
 */

export const maxDuration = 300;   // high tier edits 1장 75~110s + 재시도 여유(타 route와 동일 기준)

const MODEL   = 'gpt-image-2';
const GEN_URL  = 'https://api.openai.com/v1/images/generations'; // ref 없음 폴백
const EDIT_URL = 'https://api.openai.com/v1/images/edits';       // ref 있음(제품 사진)
const MAX_REF_IMAGES = 4;                                        // edits 첨부 상한(입력 토큰 비용 방어)
const TIMEOUT = 180_000; // 3분 — high tier 생성이 길어질 수 있어 여유

const MAX_RETRIES  = 3;
const RETRY_DELAYS = [2_000, 5_000, 10_000]; // 레이트리밋 대비 백오프

// body가 FormData(edits)면 Content-Type 미지정 → 런타임이 boundary 포함해 자동 설정.
// JSON(generations)이면 application/json 명시.
async function callOpenAI(apiKey: string, url: string, body: FormData | unknown): Promise<Response> {
  const isForm = body instanceof FormData;
  return fetch(url, {
    method:  'POST',
    headers: isForm
      ? { Authorization: `Bearer ${apiKey}` }
      : { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body:    isForm ? body : JSON.stringify(body),
    signal:  AbortSignal.timeout(TIMEOUT),
  });
}

// senders 형식 불통일 정규화: data URL(data:image/png;base64,xxx) 또는 raw base64 → Blob(mime 포함).
function base64ToBlob(input: string): Blob {
  let mime = 'image/png';
  let b64  = input;
  const m = input.match(/^data:([^;]+);base64,([\s\S]*)$/);
  if (m) { mime = m[1]; b64 = m[2]; }
  return new Blob([Buffer.from(b64, 'base64')], { type: mime });
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function errJson(msg: string, extra?: Record<string, unknown>, status = 500) {
  return NextResponse.json({ error: msg, ...extra }, { status });
}

// 앱이 쓰는 비율(4:5/16:9/1:1 등)을 gpt-image-2 지원 사이즈로 매핑.
// 지원: 1024x1024(1:1) / 1024x1536(2:3 세로) / 1536x1024(3:2 가로). 4:5→2:3, 16:9→3:2 근사.
function mapSize(aspect?: string): string {
  switch (aspect) {
    case '4:5': case '3:4': case '2:3': case '9:16':   // 세로
      return '1024x1536';
    case '16:9': case '3:2': case '5:4': case '4:3': case '21:9':  // 가로
      return '1536x1024';
    case '1:1': default:
      return '1024x1024';
  }
}

export async function POST(req: NextRequest) {
  // ── 1. 요청 파싱 ── (계약 유지: prompt/sectionNum/productImages/outputType/aspectRatio/textZone, +quality 옵션)
  let prompt: string, sectionNum: string, productImages: string[] | undefined,
      outputType: string | undefined, aspectRatio: string | undefined,
      textZone: 'top' | 'bottom' | undefined, qualityIn: string | undefined,
      plateMode: boolean, jobKey: string | undefined;
  try {
    const body = await req.json() as {
      prompt: string; sectionNum: string; productImages?: string[];
      outputType?: string; aspectRatio?: string; textZone?: 'top' | 'bottom'; quality?: string;
      plateMode?: boolean; jobKey?: string;
    };
    prompt        = body.prompt;
    sectionNum    = body.sectionNum;
    productImages = body.productImages;
    outputType    = body.outputType;
    aspectRatio   = body.aspectRatio;
    textZone      = body.textZone;     // overlay 보류 — 현재 클라는 미전송
    qualityIn     = body.quality;
    // ★Required Asset 플레이트 모드 — GPT는 배경판·타이포만 생성(제품 미등장), 원본 자산은 클라가 코드 합성.
    plateMode     = body.plateMode === true;
    jobKey        = body.jobKey;       // ★결제 검증(P0 2차)
  } catch (e) {
    console.error('[generate-image] req.json() 실패:', e);
    return errJson('요청 본문 파싱 실패', {}, 400);
  }

  if (!prompt) return errJson('prompt required', {}, 400);

  // ── ★유료 뒷문 가드(P0 2차) — GPT Image 호출 전: 결제된 jobKey 검증(plateMode 포함). ──
  let paidSections: number | null = null;   // null = dev 우회(아래 quota 선점도 생략)
  if (!creditsBypassEnabled()) {
    const session = await getServerSession(authOptions);
    const email = session?.user?.email;
    // ★적용 순서: ①user/IP rate → ②결제 검증 → ③jobKey quota → ④GPT Image 호출
    const rl = await checkRateLimit('image', email, clientIp(req));
    if (!rl.allowed) {
      return errJson(`요청이 많아요 — 잠시 후 다시 시도해주세요. (${rl.window}당 ${rl.limit}장)`, { sectionNum, code: API_ERROR_CODES.rateLimited, limit: rl.limit, used: rl.used }, 429);
    }
    const check = await verifyPaidJob(email, jobKey);
    if (!check.ok) return errJson(check.error, { sectionNum, code: check.code }, check.status);
    paidSections = check.paidSections;
  }

  // ── 2. API 키 ──
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('[generate-image] OPENAI_API_KEY 환경변수 없음');
    return errJson('이미지 생성 서비스 설정 오류예요. 잠시 후 다시 시도해 주세요.');   // ★env 이름 미노출
  }

  // ── 3. 프롬프트 규칙 구성 ──
  // 제품 사진 있으면 edits로 ref 반영 → 제품 일관성 RULES 활성. 없으면 generations 폴백.
  const refImages = (productImages ?? []).filter(s => typeof s === 'string' && s.length > 0).slice(0, MAX_REF_IMAGES);
  const hasRefImages = refImages.length > 0;
  const isBlog = outputType === 'blog';
  const isSlide = outputType === 'slide';

  // ★슬라이드 + reference 없음 = 무경고 generations 폴백 금지 — 제품 일관성이 필수인 슬라이드에서
  //   ref 없이 생성하면 모델이 실존 경쟁 브랜드를 그릴 수 있음(법적 리스크). OpenAI 호출 전 차단(무과금).
  //   블로그형은 기존대로 ref 없이도 허용(텍스트0 조연 컷이라 제품 미등장 가능).
  //   ★플레이트 모드는 예외 — 제품이 아예 등장하지 않는 배경판이라 ref 불필요(프롬프트가 제품 생성 전면 금지).
  if (isSlide && !hasRefImages && !plateMode) {
    console.warn(`[generate-image] 차단 — 슬라이드인데 refImgs=0 (sectionNum: ${sectionNum}). 제품 사진 유실 의심.`);
    return errJson(
      '제품 사진이 유실되었습니다 — 상품정보 단계에서 제품 사진을 다시 업로드한 뒤 재생성해 주세요.',
      { sectionNum, code: 'ref_missing' },
      422,
    );
  }

  const PRODUCT_RULES = hasRefImages
    ? `The reference images above show the actual product. CRITICAL: maintain the product's EXACT appearance, color, shape, label, and branding identically in every image. ` +
      `Do NOT change, translate, restyle, or re-write ANY label text — reproduce the reference label lettering exactly as-is, even if the scene description mentions a product name or ingredient in words.`
    : '';
  // ★Fidelity A/B(갈치, 2026-07-05)에서 확인된 라벨 날조 차단 — 레퍼런스에 없는 소매 포장·라벨 스티커·
  //   인쇄 라벨 문구를 제품 위에 창작하는 것 금지(무포장 원물은 무포장 그대로). 표시광고 리스크.
  const COMPONENT_RULES = hasRefImages
    ? `Only depict the exact product(s) shown in the reference images. Never invent additional cosmetic containers, bottles, jars, or unrelated products. ` +
      `Never invent retail packaging, label stickers, or printed label text that is not visible in the reference images — if the reference product is unpackaged, keep it unpackaged. ` +
      `Props must be non-product objects only (stones, plants, water, fabric, trays).`
    : '';

  // 인물 정책 — ★슬라이드형만 모델 허용(제품 든/사용하는 에디토리얼 히어로컷). 블로그·기타는 얼굴 화보 금지 유지.
  //   플레이트 모드는 무인물 배경판 — 모델 강제 지시가 오배동하지 않게 별도 처리.
  const PEOPLE_RULES = plateMode
    ? `No people, no hands, no body parts in the frame.`
    : isSlide
    ? `If the scene describes a model/person, you MUST render that model with a fully visible face (Korean beauty-ad ` +
      `editorial, upper body) — do NOT crop out the face or substitute hands-only shots. ` +
      `The product in the model's hands MUST exactly match the reference product (same shape, color, label). ` +
      `(Face consistency across images is NOT required at this stage — a different face per cut is acceptable.)`
    : `Skin and body-part close-ups WITHOUT a recognizable face are allowed for emotion/situation ` +
      `(cheek, jawline, neck, hands, back of hand, a fingertip touching skin). ` +
      `Do NOT show a recognizable full face, a consistent brand model, or a fashion-style model holding the product as the focus.`;

  // 미입력 사실 날조 금지. ★슬라이드형은 baked 카피의 셀러 검증 수치(가격·용량·함량 등, 클라 게이트 통과분)는 텍스트로 허용,
  //   그 외 날조 인증/통계/그래프는 계속 금지. 블로그·기타는 수치 전면 금지 유지.
  const NO_FAKE_DATA_RULES = isSlide
    ? `Do NOT invent certification marks, seals, badges, EWG grades, clinical/test results, or statistical graphs. You MAY render the specific numbers and labels that are part of the provided marketing copy (e.g. price, volume, ingredient specs) as designed ad text, but never add extra percentages or statistics that are not present in that copy.`
    : `Do NOT render certification marks, seals, badges, test/clinical results, EWG grades, percentages, statistics, or graphs. Convey "tested/safe" only through clean clinical mood, never as data.`;

  // 텍스트 금지 — 블로그형 전체 + (슬라이드라도) overlay용 textZone 지정 시. 슬라이드 baked는 텍스트 허용이라 여기 안 걸림.
  const TEXT_RULES = (isBlog || textZone)
    ? `Do NOT render any text, letters, numbers, labels, or typography overlaid on the image. Clean photographic image, no captions.`
    : '';

  // 텍스트존 확보(overlay 보류 — 현재 미사용). 클라가 textZone 보낼 때만 동작.
  const TEXTZONE_RULES = textZone === 'top'
    ? `Composition: keep the TOP ~40% of the frame as clean, simple negative space reserved for a text overlay added later. Place the product and main subject in the LOWER ~60%.`
    : textZone === 'bottom'
    ? `Composition: keep the BOTTOM ~30% as clean negative space reserved for a text overlay. Place product/subject in the UPPER portion.`
    : '';

  const rulesTail = [COMPONENT_RULES, PEOPLE_RULES, NO_FAKE_DATA_RULES, TEXT_RULES, TEXTZONE_RULES].filter(Boolean).join(' ');
  const cleanedPrompt = prompt.trim().replace(/[.\s]+$/, '');

  const fullPrompt = [
    `Korean e-commerce product detail page image.`,
    `${cleanedPrompt}.`,
    PRODUCT_RULES,
    rulesTail,
  ].filter(Boolean).join(' ');

  // ── 4. 사이즈/퀄리티 ──
  const size = mapSize(aspectRatio);
  // ★테스트 모드: 개발 중엔 전 섹션 medium(장당 ~90원, high의 1/4) — 구도·레이아웃·색은 동일, 미세 디테일만 차이.
  //   완성도 확정 후 출시 시 이 상수를 null로 되돌리면 기존 규칙(4:5=high) 복원. 명시 quality 요청은 항상 우선.
  const QUALITY_TEST_OVERRIDE: string | null = 'medium';
  const quality = qualityIn ?? QUALITY_TEST_OVERRIDE ?? (size === '1024x1536' ? 'high' : 'medium');

  // ── ★이미지 quota 선점(P0) — GPT Image 호출 '전' 원자 증가(count+weight ≤ limit일 때만).
  //    성공 후 카운트가 아니라 선점이므로 같은 jobKey 동시 100호출도 초과분은 외부 호출 자체가 안 나감.
  //    실패 환급 없음(정책 — quota는 크레딧이 아니라 비용 폭주 안전장치) · 내부 자동 재시도는 요청당 1카운트. ──
  if (paidSections !== null) {
    const quotaLimit = calculateImageQuota(paidSections);
    const weight = imageQuotaWeight(quality);
    try {
      const q = await consumeUsageQuota(`img:${jobKey}`, weight, quotaLimit);
      if (!q.allowed) {
        console.warn(`[generate-image] quota 초과 — jobKey=${jobKey} used=${q.used}/${quotaLimit} weight=${weight}`);
        return errJson(
          `이미지 생성 한도를 모두 사용했어요. (사용 ${q.used}/${quotaLimit})`,
          { sectionNum, code: API_ERROR_CODES.quotaExhausted, quotaLimit, quotaUsed: q.used, attemptedWeight: weight },
          429,
        );
      }
    } catch (err) {
      console.error('[generate-image] quota 확인 오류:', err);
      return errJson('사용량 확인 중 오류가 발생했어요.', { sectionNum }, 500);
    }
  }

  // ── 4b. 엔드포인트/바디 분기 ── ref 있으면 edits(FormData), 없으면 generations(JSON).
  let apiUrl: string;
  let reqBody: FormData | Record<string, unknown>;
  if (hasRefImages) {
    apiUrl = EDIT_URL;
    const form = new FormData();
    form.append('model', MODEL);
    form.append('prompt', fullPrompt);
    form.append('size', size);
    form.append('quality', quality);
    form.append('n', '1');
    refImages.forEach((img, i) => {
      const blob = base64ToBlob(img);
      const ext  = (blob.type.split('/')[1] || 'png').split('+')[0];
      form.append('image[]', blob, `product_${i}.${ext}`);   // gpt-image: 다중 참조 = image[] 반복
    });
    reqBody = form;
  } else {
    apiUrl  = GEN_URL;
    reqBody = { model: MODEL, prompt: fullPrompt, size, quality, n: 1 };
  }

  console.log(`[generate-image] START — sectionNum: ${sectionNum}, endpoint: ${hasRefImages ? 'edits' : 'generations'}, refImgs: ${refImages.length}, size: ${size}, quality: ${quality}, promptLen: ${fullPrompt.length}`);
  console.log(`[generate-image] prompt preview: "${fullPrompt.slice(0, 150)}"`);

  let lastError = '';

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      const delay = RETRY_DELAYS[attempt - 1];
      console.log(`[generate-image] retry ${attempt}/${MAX_RETRIES - 1} after ${delay}ms (prev: ${lastError})`);
      await sleep(delay);
    }

    // ── 5. OpenAI 호출 ──
    let res: Response;
    try {
      res = await callOpenAI(apiKey, apiUrl, reqBody);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[generate-image] fetch 실패 (attempt ${attempt}):`, msg);
      lastError = msg;
      if (msg.includes('timeout') || msg.includes('TimeoutError')) {
        return errJson('이미지 생성 시간 초과. 다시 시도해 주세요.', { sectionNum }, 504);
      }
      continue;
    }

    console.log(`[generate-image] OpenAI HTTP status: ${res.status} (attempt ${attempt})`);

    // 429(레이트리밋) · 5xx → 재시도
    if (res.status === 429 || res.status >= 500) {
      const text = await res.text().catch(() => '');
      lastError = `HTTP ${res.status}`;
      console.warn(`[generate-image] ${res.status} — 재시도 예정:`, text.slice(0, 300));
      continue;
    }

    // 그 외 4xx → 즉시 반환 (content_policy_violation 등 안전정책 분기 포함)
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      let parsed: { error?: { message?: string; code?: string; type?: string } } = {};
      try { parsed = JSON.parse(text); } catch { /* 비JSON */ }
      const code = parsed.error?.code ?? '';
      const emsg = parsed.error?.message ?? text.slice(0, 200);
      // ★마스킹(배포 안정화): OpenAI 원문(401 시 부분 마스킹 키 포함 가능)은 서버 로그에만.
      //   클라에는 일반화 메시지 + status만. 안전정책 거부는 사용자 조치가 가능하니 유지.
      console.error(`[generate-image] OpenAI 오류 ${res.status}: ${emsg}`);
      if (code === 'content_policy_violation' || /safety|policy/i.test(emsg)) {
        return errJson(`안전 정책으로 이미지 생성이 거부되었습니다. 프롬프트를 수정해 주세요.`, { sectionNum, code }, 400);
      }
      return errJson(`이미지 생성에 실패했어요. 잠시 후 다시 시도해 주세요. (${res.status})`, { sectionNum }, res.status);
    }

    // ── 6. 응답 파싱 ── { created, data:[{b64_json}], output_format, size, quality, usage }
    let data: { data?: Array<{ b64_json?: string }>; output_format?: string };
    try {
      data = await res.json();
    } catch (e) {
      console.error(`[generate-image] 응답 JSON 파싱 실패 (attempt ${attempt}):`, e);
      lastError = 'JSON parse error';
      continue;
    }

    const b64 = data.data?.[0]?.b64_json;
    if (!b64) {
      console.error('[generate-image] b64_json 없음. 응답 일부:', JSON.stringify(data).slice(0, 400));
      lastError = 'no image data';
      if (attempt < MAX_RETRIES - 1) continue;
      return errJson('이미지가 반환되지 않았습니다. 다시 시도해 주세요.', { sectionNum });
    }

    // ── 7. 성공 ── 클라 계약 그대로: { imageBase64, mimeType }
    const mimeType = `image/${data.output_format || 'png'}`;
    console.log(`[generate-image] 성공 — mimeType: ${mimeType}, b64 length: ${b64.length}`);
    return NextResponse.json({ imageBase64: b64, mimeType, sectionNum });
  }

  console.error(`[generate-image] ${MAX_RETRIES}회 모두 실패. 마지막 에러: ${lastError}`);
  return errJson(`${MAX_RETRIES}회 시도 후 실패: ${lastError}. 잠시 후 다시 시도해 주세요.`, { sectionNum }, 502);
}
