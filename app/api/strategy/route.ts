import { NextRequest, NextResponse } from 'next/server';
import { runStrategy } from '@/lib/stages/strategy';
import { deductCreditsAtomic, creditsBypassEnabled, checkRateLimit, clientIp } from '@/lib/db';
import { getSessionEmail } from '@/lib/authToken';
import { API_ERROR_CODES } from '@/lib/apiErrors';
import { calculateGenerationCost, generationReason } from '@/lib/pricing';

/**
 * Stage1 (DNA + 전략) — 파이프라인의 첫 유료 스텝이자 ★크레딧 선차감 게이트(P0).
 *
 * - 비용: lib/pricing.ts calculateGenerationCost(1섹션=1크레딧) — 라우트에 고정가 없음.
 * - 멱등: jobKey(생성 1회 1키, 재시도·재개는 같은 키 유지) → 재호출은 duplicate(추가 차감 0).
 * - 순서: 차감 성공(deducted|duplicate) 후에만 Claude 호출. insufficient면 외부 호출 0회로 402.
 * - 환불: 이번 범위 미구현(재시도가 같은 키라 이중 차감 없음 — 중간 실패는 원장 기반 CS로).
 * - dev/harness: creditsBypassEnabled()일 때만 차감 생략(★production에서는 절대 불가).
 */

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const { cat, ch, productName, productExtra, referenceStyle, sectionCount, jobKey } = await req.json() as {
    cat?: string; ch?: string; productName?: string; productExtra?: string;
    referenceStyle?: string; sectionCount?: number; jobKey?: string;
  };

  // ── 크레딧 선차감(외부 API 호출 전) ──
  let credit: { cost: number; balance: number; status: string } | undefined;
  if (!creditsBypassEnabled()) {
    const email = await getSessionEmail(req);
    if (!email) return NextResponse.json({ error: '로그인이 필요해요.' }, { status: 401 });
    // ★llm rate limit — 선차감·Claude 호출 전
    const rl = await checkRateLimit('llm', email, clientIp(req));
    if (!rl.allowed) {
      return NextResponse.json(
        { error: `요청이 많아요 — 잠시 후 다시 시도해주세요. (${rl.window}당 ${rl.limit}회)`, code: API_ERROR_CODES.rateLimited, limit: rl.limit, used: rl.used },
        { status: 429 },
      );
    }
    if (!jobKey || typeof jobKey !== 'string' || typeof sectionCount !== 'number') {
      return NextResponse.json({ error: '생성 요청에 jobKey와 sectionCount가 필요해요.' }, { status: 400 });
    }
    const cost = calculateGenerationCost({ sectionCount });
    try {
      const r = await deductCreditsAtomic(email, cost, jobKey, generationReason(sectionCount));
      if (r.status === 'insufficient') {
        return NextResponse.json(
          { error: `크레딧이 부족해요. (필요 ${cost} / 보유 ${r.balance})`, code: API_ERROR_CODES.insufficientCredits, cost, balance: r.balance, status: r.status },
          { status: 402 },
        );
      }
      credit = { cost, balance: r.balance, status: r.status };   // deducted | duplicate(재시도·재개)
    } catch (err) {
      console.error('[strategy] 크레딧 차감 오류:', err);
      return NextResponse.json({ error: '크레딧 처리 중 오류가 발생했어요.' }, { status: 500 });
    }
  }

  try {
    const result = await runStrategy({ cat, ch, productName, productExtra, referenceStyle });
    return NextResponse.json(credit ? { ...result, credit } : result);
  } catch (err) {
    console.error('Strategy error:', err);
    const msg = err instanceof Error ? err.message : '알 수 없는 오류';
    return NextResponse.json({ error: `전략 도출 중 오류가 발생했어요: ${msg}` }, { status: 500 });
  }
}
