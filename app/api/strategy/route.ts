import { NextRequest, NextResponse } from 'next/server';
import { runStrategy } from '@/lib/stages/strategy';
import { consumeUsageQuota, deductCreditsAtomic, creditsBypassEnabled, checkRateLimit, clientIp } from '@/lib/db';
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
  const { cat, ch, out, productName, productExtra, referenceStyle, sectionCount, jobKey, speechLevel , baseSectionCount} = await req.json() as {
    cat?: string; ch?: string; productName?: string; productExtra?: string;
    out?: string;            // ★출력형태 — 블로그형은 섹션당 1.25크레딧(lib/pricing)
    referenceStyle?: string; sectionCount?: number; baseSectionCount?: number; jobKey?: string;
    speechLevel?: string;   // ★셀러 지정 카피 어투(2026-07-29) — 미지정이면 AI가 선택
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
    /* ★out 없는 요청은 거절한다 — 차감 0(2026-08-04).
     *  선차감 요율이 out에 달려 있는데(블로그 1.25/섹션) 이 값을 클라이언트가 보낸다.
     *  배포 전에 열려 있던 탭은 옛 번들로 계속 돌므로 out을 빼고 보내고, 그러면 블로그가
     *  슬라이드 요율(-8)로 조용히 과소청구됐다 — 실제로 두 번 발생(15:37, 16:02 원장).
     *  서버가 모르는 값을 추측해 깎느니 시작 자체를 막는 편이 맞다: 여기서 거절하면
     *  외부 API 호출도 차감도 일어나지 않고, 셀러는 새로고침 한 번으로 복구된다. */
    if (typeof out !== 'string' || !out) {
      return NextResponse.json(
        { error: '화면이 이전 버전이에요 — 페이지를 새로고침(⌘+Shift+R)한 뒤 다시 시도해주세요.', code: 'stale_client' },
        { status: 400 },
      );
    }
    /* ★고른 분량(baseSectionCount)을 넘겨 더한 섹션은 장당 1크레딧(2026-08-03) —
       화면에 +1크레딧이라 적어놓고 결제에서 2가 빠지면 그 순간 신뢰를 잃는다. */
    const cost = calculateGenerationCost({ sectionCount, baseSectionCount, out });
    try {
      const r = await deductCreditsAtomic(email, cost, jobKey, generationReason(sectionCount));
      if (r.status === 'insufficient') {
        return NextResponse.json(
          { error: `크레딧이 부족해요. (필요 ${cost} / 보유 ${r.balance})`, code: API_ERROR_CODES.insufficientCredits, cost, balance: r.balance, status: r.status },
          { status: 402 },
        );
      }
      // ★jobKey 재사용 상한(2026-07-27 보안점검) — duplicate는 정상 재시도·재개 경로라 허용하되,
      //   같은 키로 무한 무료 재실행(Sonnet)이 되지 않게 횟수를 제한한다.
      if (r.status === 'duplicate') {
        const reuse = await consumeUsageQuota(`strategy-run:${jobKey}`, 1, 5);
        if (!reuse.allowed) {
          return NextResponse.json(
            { error: '이미 사용된 생성 요청이에요. 새로 생성해주세요.', code: API_ERROR_CODES.paymentRequired },
            { status: 402 },
          );
        }
      }
      credit = { cost, balance: r.balance, status: r.status };   // deducted | duplicate(재시도·재개)
    } catch (err) {
      console.error('[strategy] 크레딧 차감 오류:', err);
      return NextResponse.json({ error: '크레딧 처리 중 오류가 발생했어요.' }, { status: 500 });
    }
  }

  try {
    const result = await runStrategy({ cat, ch, productName, productExtra, referenceStyle, speechLevel });
    return NextResponse.json(credit ? { ...result, credit } : result);
  } catch (err) {
    console.error('Strategy error:', err);
    const msg = err instanceof Error ? err.message : '알 수 없는 오류';
    return NextResponse.json({ error: `전략 도출 중 오류가 발생했어요: ${msg}` }, { status: 500 });
  }
}
