/**
 * 클라이언트 → 서버 크레딧 차감 헬퍼 (3단계).
 * 생성 성공 후 1회 호출. 서버가 원자적으로 차감하고 새 잔액을 반환한다.
 * 금액은 서버가 정함(여기선 멱등키만 보냄) = 조작 방지.
 */
export async function deductCreditsOnServer(
  idempotencyKey: string,
): Promise<{ balance: number; status: 'deducted' | 'duplicate' | 'insufficient' } | null> {
  try {
    const res = await fetch('/api/credits/deduct', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idempotencyKey }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok && res.status !== 402) {
      console.warn('[deduct] 실패', res.status, data);
      return null;
    }
    return data as { balance: number; status: 'deducted' | 'duplicate' | 'insufficient' };
  } catch (e) {
    console.warn('[deduct] 네트워크 오류', e);
    return null;
  }
}
