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
 */

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
  amount?: { total?: number };
  currency?: string;
  orderName?: string;
  method?: { type?: string };
  failure?: { message?: string };
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
