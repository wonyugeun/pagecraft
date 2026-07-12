import { NextRequest, NextResponse } from 'next/server';
import { deductCreditsAtomic, creditsBypassEnabled, checkRateLimit, clientIp } from '@/lib/db';
import { getSessionEmail } from '@/lib/authToken';
import { API_ERROR_CODES } from '@/lib/apiErrors';
import { calculateGenerationCost, generationReason } from '@/lib/pricing';

/**
 * 빠른제작 크레딧 선차감 게이트 — ★유일 차감·jobKey 발급 지점.
 *
 * QuickScreen이 생성(handleGenerate) 첫 동작으로 호출한다. 여기서 deductCreditsAtomic(단일 CTE,
 * idempotency_key=jobKey UNIQUE)이 "차감 + generation:{count} 원장 기록"을 원자적으로 수행 →
 * 이후 regen-section·generate-image는 그 jobKey로 verifyPaidJob만 통과(재차감 없음, verify-only).
 * - 비용: calculateGenerationCost(1섹션=1크레딧). 라우트에 고정가 없음.
 * - 멱등: 같은 jobKey 재호출 = duplicate(추가 차감 0) → 실패 후 무료 재시도(C정책).
 * - insufficient면 402(외부 호출 0). dev/harness는 creditsBypassEnabled()일 때만 차감 생략.
 * - ★서버 게이트(verifyPaidJob) 불변 — 통과 '자격'(paid jobKey)만 여기서 만든다.
 */

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const { jobKey, sectionCount } = await req.json() as { jobKey?: string; sectionCount?: number };

  let credit: { cost: number; balance: number; status: string } | undefined;
  if (!creditsBypassEnabled()) {
    const email = await getSessionEmail(req);
    if (!email) return NextResponse.json({ error: '로그인이 필요해요.' }, { status: 401 });
    const rl = await checkRateLimit('llm', email, clientIp(req));
    if (!rl.allowed) {
      return NextResponse.json(
        { error: `요청이 많아요 — 잠시 후 다시 시도해주세요. (${rl.window}당 ${rl.limit}회)`, code: API_ERROR_CODES.rateLimited, limit: rl.limit, used: rl.used },
        { status: 429 },
      );
    }
    const cnt = typeof sectionCount === 'number' && sectionCount > 0 ? sectionCount : 1;
    if (!jobKey || typeof jobKey !== 'string') {
      return NextResponse.json({ error: '생성 요청에 jobKey가 필요해요.' }, { status: 400 });
    }
    const cost = calculateGenerationCost({ sectionCount: cnt });
    try {
      const r = await deductCreditsAtomic(email, cost, jobKey, generationReason(cnt));
      if (r.status === 'insufficient') {
        return NextResponse.json(
          { error: `크레딧이 부족해요. (필요 ${cost} / 보유 ${r.balance})`, code: API_ERROR_CODES.insufficientCredits, cost, balance: r.balance, status: r.status },
          { status: 402 },
        );
      }
      credit = { cost, balance: r.balance, status: r.status };   // deducted | duplicate(재시도)
    } catch (err) {
      console.error('[quick/charge] 크레딧 차감 오류:', err);
      return NextResponse.json({ error: '크레딧 처리 중 오류가 발생했어요.' }, { status: 500 });
    }
  }

  return NextResponse.json(credit ? { ...credit } : { status: 'bypass' });
}
