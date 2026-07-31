import { NextRequest, NextResponse } from 'next/server';
import { getSessionEmail } from '@/lib/authToken';
import { ensureSchemaOnce, saveFeedback, checkRateLimit, clientIp, sql } from '@/lib/db';
import { isAdminEmail } from '@/lib/portone';

/**
 * 고객의 소리(2026-07-30).
 *
 * ★설계 의도: 초기 서비스는 불완전하다. 불편을 겪은 셀러를 놓치지 않고 실제로 풀어주는 것이
 *   기능 하나 더 만드는 것보다 중요하다. 그래서 '보내기'의 마찰을 최대한 낮추고(짧은 글 + 선택 이미지),
 *   대신 고치는 데 필요한 맥락(상품정보·생성 설정)은 자동으로 붙인다.
 * ★수집 사실은 화면에서 명시한다(FeedbackModal) — 조용히 입력값을 가져가지 않는다.
 */
export const maxDuration = 30;

/** 이미지 상한 — 클라이언트가 압축해 보내지만 서버에서도 방어 */
const MAX_IMAGE_CHARS = 1_500_000;   // 약 1MB data URL

export async function POST(req: NextRequest) {
  await ensureSchemaOnce();
  const email = await getSessionEmail(req);
  if (!email) return NextResponse.json({ error: '로그인이 필요해요.' }, { status: 401 });

  const rl = await checkRateLimit('prep', email, clientIp(req));
  if (!rl.allowed) {
    return NextResponse.json({ error: '의견 전송이 많아요. 잠시 후 다시 시도해주세요.' }, { status: 429 });
  }

  const body = await req.json().catch(() => null) as {
    message?: string; rating?: number; context?: Record<string, unknown>; image?: string;
  } | null;

  const message = (body?.message ?? '').trim();
  if (!message) return NextResponse.json({ error: '내용을 입력해주세요.' }, { status: 400 });
  if (message.length > 4000) return NextResponse.json({ error: '내용이 너무 길어요(4000자 이내).' }, { status: 400 });

  let image = typeof body?.image === 'string' ? body.image : null;
  if (image && (!image.startsWith('data:image/') || image.length > MAX_IMAGE_CHARS)) {
    image = null;   // 형식·용량 미달은 첨부 없이 저장(의견 자체는 살린다)
  }

  const rating = typeof body?.rating === 'number' && body.rating >= 1 && body.rating <= 5
    ? Math.round(body.rating) : null;

  try {
    const id = await saveFeedback({ email, message, rating, context: body?.context ?? null, image });
    notify(email, rating, message, id);   // 알림은 실패해도 저장을 막지 않는다
    return NextResponse.json({ ok: true, id });
  } catch (err) {
    console.error('[feedback] 저장 실패:', err);
    return NextResponse.json({ error: '전송 중 오류가 발생했어요. 잠시 후 다시 시도해주세요.' }, { status: 500 });
  }
}

/** 관리자 조회 — 최근 의견 목록 */
export async function GET(req: NextRequest) {
  await ensureSchemaOnce();
  const email = await getSessionEmail(req);
  if (!email) return NextResponse.json({ error: '로그인이 필요해요.' }, { status: 401 });
  if (!isAdminEmail(email)) return NextResponse.json({ error: '권한이 없어요.' }, { status: 403 });

  const withImage = req.nextUrl.searchParams.get('image') === '1';
  const rows = withImage
    ? await sql`SELECT id, user_email, rating, message, context, image, status, created_at
                FROM feedback ORDER BY created_at DESC LIMIT 50`
    : await sql`SELECT id, user_email, rating, message, context, status, created_at,
                       (image IS NOT NULL) AS has_image
                FROM feedback ORDER BY created_at DESC LIMIT 50`;
  return NextResponse.json({ feedback: rows });
}

/**
 * 새 의견 알림 — FEEDBACK_WEBHOOK_URL이 있으면 전송. 텔레그램·슬랙·디스코드를 모두 받는다.
 *
 * ★의견이 DB에만 쌓이면 없는 기능이나 마찬가지다. 셀러가 불편을 말한 그날 답이 가야 의미가 있다.
 * ★설정 방법은 채널마다 다르지만 넣는 곳은 환경변수 하나로 통일한다 — 나중에 채널을 갈아타도
 *   코드를 고칠 필요가 없게.
 *   · 텔레그램: FEEDBACK_WEBHOOK_URL=https://api.telegram.org/bot<토큰>/sendMessage
 *              + FEEDBACK_TELEGRAM_CHAT_ID=<본인 chat id>
 *   · 슬랙/디스코드: 발급받은 Incoming Webhook URL 그대로
 */
function notify(email: string, rating: number | null, message: string, id: number): void {
  const url = process.env.FEEDBACK_WEBHOOK_URL;
  if (!url) return;

  const text = `📮 Flik 새 의견 #${id}\n${rating ? `평점 ${rating}/5 · ` : ''}${email}\n${message.slice(0, 500)}`;

  // 텔레그램만 형식이 다르다(chat_id 필수). 나머지는 content/text를 같이 보내면 각자 자기 필드만 읽는다.
  const isTelegram = url.includes('api.telegram.org');
  const chatId = process.env.FEEDBACK_TELEGRAM_CHAT_ID;
  if (isTelegram && !chatId) {
    console.error('[feedback] 텔레그램 알림 실패 — FEEDBACK_TELEGRAM_CHAT_ID 미설정');
    return;
  }
  const payload = isTelegram
    ? { chat_id: chatId, text, disable_web_page_preview: true }
    : { content: text, text };

  void fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(10_000),
  })
    .then(async res => {
      // 조용히 실패하면 '알림이 오는 줄 알았는데 안 오는' 최악의 상태가 된다 — 응답까지 확인한다.
      if (!res.ok) console.error(`[feedback] 알림 실패(${res.status}): ${(await res.text()).slice(0, 200)}`);
    })
    .catch(e => console.error('[feedback] 알림 실패:', e));
}
