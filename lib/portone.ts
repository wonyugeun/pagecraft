/**
 * 포트원 V2 결제 설정·검증 — 서버 전용 헬퍼(2026-07-30).
 *
 * ★환경변수(.env.local / Vercel):
 *   NEXT_PUBLIC_PORTONE_STORE_ID     상점 아이디 (클라이언트 노출 정상 — SDK 호출에 필요)
 *   NEXT_PUBLIC_PORTONE_CHANNEL_KEY  채널 키 (클라이언트 노출 정상)
 *   PORTONE_API_SECRET               V2 API 시크릿 (⚠️서버 전용 — 절대 클라이언트로 내리지 말 것)
 *
 * ★테스트 모드는 코드가 아니라 포트원 콘솔의 채널 설정에서 [테스트]로 지정한다.
 *   따라서 심사용 테스트 결제는 '테스트 채널의 channelKey'를 넣는 것으로 전환된다.
 *
 * ⚠️이 모듈은 서버 전용이다(node:crypto·API 시크릿 사용). 클라이언트 컴포넌트에서 import 금지.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';

export const PORTONE_STORE_ID = process.env.NEXT_PUBLIC_PORTONE_STORE_ID ?? '';
export const PORTONE_CHANNEL_KEY = process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY ?? '';

/** 결제 연동 설정 완료 여부 — 미설정이면 결제 화면이 안내만 표시한다(빈 값으로 호출해 실패하지 않게) */
export function portoneConfigured(): boolean {
  return PORTONE_STORE_ID.length > 0 && PORTONE_CHANNEL_KEY.length > 0;
}

/** paymentId 최대 길이 — ⚠️KPN(한국결제네트웍스) 제약.
 *  KPN은 이 값을 MxIssueNO로 받는데 상한이 32byte라, 넘으면 결제창에서 9104
 *  "MxIssueNO 길이 초과"로 실패한다(2026-07-30 실측). 여유를 둬 28자로 생성한다. */
export const PAYMENT_ID_MAX = 32;

/** paymentId — 영문 대소문자·숫자만(포트원 제약) + 32byte 이내(KPN 제약).
 *  'flik'(4) + 24자 = 28자. 24자 hex는 96비트라 중복 가능성은 사실상 0. */
export function newPaymentId(): string {
  const rand = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}${Math.random()}`;
  const body = rand.replace(/[^a-zA-Z0-9]/g, '').slice(0, 24);
  const id = `flik${body}`;
  if (id.length > PAYMENT_ID_MAX) throw new Error(`paymentId 길이 초과(${id.length} > ${PAYMENT_ID_MAX})`);
  return id;
}

export interface PortOnePayment {
  status?: string;
  /** cancelled = 취소된 누계 금액. total과 같으면 전액 취소다. */
  amount?: { total?: number; cancelled?: number };
  currency?: string;
  orderName?: string;
  method?: { type?: string };
  failure?: { message?: string };
  cancelledAt?: string;
  channel?: { type?: string; pgProvider?: string };
}

/**
 * 포트원 결제 단건 조회 — 결제 완료 검증의 유일한 근거.
 * ⚠️클라이언트가 보낸 금액·상태를 절대 신뢰하지 않는다. 이 조회 결과만 사용한다.
 */
export async function fetchPortOnePayment(paymentId: string): Promise<PortOnePayment> {
  const secret = process.env.PORTONE_API_SECRET;
  if (!secret) throw new Error('PORTONE_API_SECRET 미설정 — 서버 환경변수를 확인해주세요.');

  const res = await fetch(`https://api.portone.io/payments/${encodeURIComponent(paymentId)}`, {
    headers: { Authorization: `PortOne ${secret}` },
    signal: AbortSignal.timeout(15_000),
  });
  const body = await res.json() as PortOnePayment & { message?: string; type?: string };
  if (!res.ok) {
    throw new Error(`포트원 조회 실패(${res.status}): ${body?.message ?? body?.type ?? '알 수 없는 오류'}`);
  }
  return body;
}

/** 포트원 결제 취소(환불) — 전액 취소. 성공 시 취소 정보를 반환한다. */
export async function cancelPortOnePayment(paymentId: string, reason: string): Promise<void> {
  const secret = process.env.PORTONE_API_SECRET;
  if (!secret) throw new Error('PORTONE_API_SECRET 미설정');

  const res = await fetch(`https://api.portone.io/payments/${encodeURIComponent(paymentId)}/cancel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `PortOne ${secret}` },
    body: JSON.stringify({ reason }),
    signal: AbortSignal.timeout(20_000),
  });
  const body = await res.json().catch(() => ({})) as { message?: string; type?: string };
  if (!res.ok) {
    throw new Error(`포트원 결제 취소 실패(${res.status}): ${body?.message ?? body?.type ?? '알 수 없는 오류'}`);
  }
}

/* ────────────────────────────────────────────────────────────────
 * 웹훅 서명 검증 — Standard Webhooks 규격(포트원 V2가 이 규격을 따른다).
 *
 * 헤더: webhook-id / webhook-timestamp / webhook-signature
 * 서명 대상 문자열: `{id}.{timestamp}.{원문 본문}`  ← ⚠️파싱 전 raw body여야 한다
 * 키: PORTONE_WEBHOOK_SECRET (`whsec_` 접두사 뒤가 base64 키)
 * 서명 헤더 형식: `v1,<base64>` 공백 구분 다중 가능(키 롤링 대비)
 * ──────────────────────────────────────────────────────────────── */

export type WebhookVerdict =
  | { ok: true }
  | { ok: false; reason: string }
  | { ok: 'unconfigured'; reason: string };

/** 재생 공격 방지 — 이 시간(초)보다 오래된 웹훅은 거부 */
const WEBHOOK_TOLERANCE_SEC = 300;

export function verifyPortOneWebhook(rawBody: string, headers: Headers): WebhookVerdict {
  const secret = process.env.PORTONE_WEBHOOK_SECRET;
  if (!secret) {
    return { ok: 'unconfigured', reason: 'PORTONE_WEBHOOK_SECRET 미설정' };
  }

  const id = headers.get('webhook-id');
  const ts = headers.get('webhook-timestamp');
  const sigHeader = headers.get('webhook-signature');
  if (!id || !ts || !sigHeader) return { ok: false, reason: '서명 헤더 누락' };

  const sent = Number(ts);
  if (!Number.isFinite(sent)) return { ok: false, reason: 'timestamp 형식 오류' };
  const drift = Math.abs(Date.now() / 1000 - sent);
  if (drift > WEBHOOK_TOLERANCE_SEC) {
    return { ok: false, reason: `timestamp 허용 범위 초과(${Math.round(drift)}초)` };
  }

  const key = Buffer.from(secret.replace(/^whsec_/, ''), 'base64');
  const expected = createHmac('sha256', key)
    .update(`${id}.${ts}.${rawBody}`)
    .digest();

  // `v1,<sig> v1,<sig2>` — 하나라도 일치하면 통과
  for (const part of sigHeader.split(' ')) {
    const comma = part.indexOf(',');
    if (comma < 0) continue;
    if (part.slice(0, comma) !== 'v1') continue;
    let given: Buffer;
    try { given = Buffer.from(part.slice(comma + 1), 'base64'); } catch { continue; }
    if (given.length === expected.length && timingSafeEqual(given, expected)) {
      return { ok: true };
    }
  }
  return { ok: false, reason: '서명 불일치' };
}

/** 관리자 이메일 화이트리스트 — ADMIN_EMAILS(쉼표 구분). 미설정이면 아무도 관리자가 아니다. */
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const list = (process.env.ADMIN_EMAILS ?? '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
  return list.includes(email.toLowerCase());
}
