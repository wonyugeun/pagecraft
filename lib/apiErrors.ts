/**
 * 402/429 에러 code 규약 — 서버 응답과 클라 안내 분기의 단일 소스(2026-07-08).
 *
 * 서버: 유료 라우트가 에러 응답에 `code`를 실어 보낸다(메시지 문장은 자유, 분기는 코드로).
 * 클라: friendlyGenerationError로 코드별 최소 안내 문구를 얻는다(모르는 코드는 undefined →
 *   서버 메시지 그대로 노출). 기존 'ref_missing'(422)과 같은 선례의 확장.
 */

export const API_ERROR_CODES = {
  /** 결제된 생성 작업 없음(jobKey 미보유·과거 히스토리) — 새 생성으로 유도 */
  paymentRequired: 'payment_required',
  /** jobKey 이미지 quota 소진(429) */
  quotaExhausted: 'quota_exhausted',
  /** user/IP 시간창 rate 초과(429) */
  rateLimited: 'rate_limited',
  /** 크레딧 잔액 부족(402) */
  insufficientCredits: 'insufficient_credits',
} as const;

export interface ApiErrorPayload {
  code?: string;
  error?: string;
  quotaUsed?: number;
  quotaLimit?: number;
}

/** 코드별 최소 안내 문구 — 이미지 슬롯 등 클라 노출면용. 미지정 코드는 undefined(서버 메시지 사용). */
export function friendlyGenerationError(data: ApiErrorPayload): string | undefined {
  switch (data.code) {
    case API_ERROR_CODES.paymentRequired:
      return '이 작업은 새로 생성해야 이미지를 만들 수 있어요.';
    case API_ERROR_CODES.quotaExhausted:
      return `이 생성의 이미지 한도를 모두 사용했어요.${typeof data.quotaUsed === 'number' && data.quotaLimit ? ` (${data.quotaUsed}/${data.quotaLimit})` : ''}`;
    case API_ERROR_CODES.rateLimited:
      return '요청이 많아요 — 잠시 후 다시 시도해주세요.';
    case API_ERROR_CODES.insufficientCredits:
      return '크레딧이 부족해요.';
    default:
      return undefined;
  }
}
