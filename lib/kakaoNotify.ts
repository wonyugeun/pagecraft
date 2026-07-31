import { sql } from '@/lib/db';

/**
 * 카카오톡 '나에게 보내기' 알림(2026-07-31).
 *
 * ★왜 이 방식인가: 유근님이 카카오톡에 상주하시고 다른 앱을 새로 여는 걸 원치 않으셨다.
 *  대신 카카오는 토큰 관리가 필요하다 — 그 부담을 코드가 대신 진다.
 *
 * ★토큰 수명(카카오 정책):
 *   access_token  6시간   → 매번 새로 받기엔 낭비라 DB에 캐시하고 만료 전에만 갱신
 *   refresh_token 2개월   → 갱신 시 남은 기간이 1개월 미만이면 카카오가 새 걸 같이 준다.
 *                          그 새 값을 반드시 저장해야 한다. 안 그러면 2개월 뒤 조용히 죽는다.
 *
 * ⚠️'조용히 죽는 것'이 이 기능의 유일한 실패 모드다. 알림이 안 오는데 오는 줄 알면
 *   고객 의견을 통째로 놓친다. 그래서 실패는 전부 error 로그로 남기고, 토큰이 만료되면
 *   무엇을 해야 하는지(재발급 절차)까지 로그에 적는다.
 *
 * ★환경변수: KAKAO_REST_API_KEY, KAKAO_REFRESH_TOKEN(최초 1회 — scripts/kakao-token-setup.mts로 발급)
 */

const TOKEN_URL = 'https://kauth.kakao.com/oauth/token';
const MEMO_URL = 'https://kapi.kakao.com/v2/api/talk/memo/default/send';

/** access_token을 만료 이 시간 전에 미리 갱신(경계에서 401 나는 것 방지) */
const REFRESH_MARGIN_SEC = 300;

/** 토큰 보관용 KV — 서버리스라 프로세스 메모리로는 캐시가 유지되지 않는다. */
async function ensureKv(): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS app_kv (
      k          TEXT PRIMARY KEY,
      v          TEXT NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`;
}

async function kvGet(key: string): Promise<string | null> {
  const rows = await sql`SELECT v FROM app_kv WHERE k = ${key}`;
  return (rows[0] as { v?: string } | undefined)?.v ?? null;
}

async function kvSet(key: string, value: string): Promise<void> {
  await sql`
    INSERT INTO app_kv (k, v) VALUES (${key}, ${value})
    ON CONFLICT (k) DO UPDATE SET v = EXCLUDED.v, updated_at = now()`;
}

export function kakaoConfigured(): boolean {
  return Boolean(process.env.KAKAO_REST_API_KEY && process.env.KAKAO_REFRESH_TOKEN);
}

/** 현재 유효한 refresh_token — DB에 갱신본이 있으면 그걸, 없으면 최초 환경변수 값을 쓴다. */
async function currentRefreshToken(): Promise<string> {
  return (await kvGet('kakao:refresh_token')) ?? process.env.KAKAO_REFRESH_TOKEN ?? '';
}

/**
 * 유효한 access_token 확보 — 캐시가 살아있으면 그대로, 아니면 refresh로 새로 받는다.
 * 실패하면 null(호출부가 알림을 포기하고 로그만 남긴다 — 의견 저장 자체를 막지 않는다).
 */
async function getAccessToken(): Promise<string | null> {
  const restKey = process.env.KAKAO_REST_API_KEY;
  if (!restKey) return null;

  await ensureKv();

  const cached = await kvGet('kakao:access_token');
  const expiresAt = Number(await kvGet('kakao:access_expires_at') ?? 0);
  if (cached && Date.now() / 1000 < expiresAt - REFRESH_MARGIN_SEC) return cached;

  const refresh = await currentRefreshToken();
  if (!refresh) {
    console.error('[kakao] refresh_token 없음 — scripts/kakao-token-setup.mts로 재발급 필요');
    return null;
  }

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: restKey,
      refresh_token: refresh,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  const body = await res.json().catch(() => ({})) as {
    access_token?: string; expires_in?: number; refresh_token?: string;
    error?: string; error_description?: string;
  };

  if (!res.ok || !body.access_token) {
    console.error(
      `[kakao] ⚠️토큰 갱신 실패(${res.status}) — ${body.error ?? ''} ${body.error_description ?? ''}\n` +
      '  refresh_token이 만료됐을 수 있습니다. `npx tsx scripts/kakao-token-setup.mts`로 재발급하세요.',
    );
    return null;
  }

  await kvSet('kakao:access_token', body.access_token);
  await kvSet('kakao:access_expires_at', String(Math.floor(Date.now() / 1000) + (body.expires_in ?? 21600)));

  // ★남은 기간이 1개월 미만일 때만 새 refresh_token이 온다 — 오면 반드시 저장(놓치면 2개월 뒤 정지)
  if (body.refresh_token) {
    await kvSet('kakao:refresh_token', body.refresh_token);
    console.log('[kakao] refresh_token 갱신 저장됨');
  }
  return body.access_token;
}

/**
 * 나에게 보내기 — 실패해도 예외를 던지지 않는다(알림 실패가 의견 저장을 막으면 본말전도).
 * 성공 여부를 반환하므로 점검 스크립트가 결과를 확인할 수 있다.
 */
export async function sendKakaoMemo(text: string, linkUrl?: string): Promise<boolean> {
  try {
    const token = await getAccessToken();
    if (!token) return false;

    const templateObject = {
      object_type: 'text',
      // 카카오 텍스트 템플릿 상한 200자 — 넘기면 400이 떨어지므로 여기서 자른다
      text: text.slice(0, 200),
      link: linkUrl ? { web_url: linkUrl, mobile_web_url: linkUrl } : {},
    };

    const res = await fetch(MEMO_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ template_object: JSON.stringify(templateObject) }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      console.error(`[kakao] 전송 실패(${res.status}): ${(await res.text()).slice(0, 300)}`);
      return false;
    }
    return true;
  } catch (e) {
    console.error('[kakao] 전송 오류:', e);
    return false;
  }
}
