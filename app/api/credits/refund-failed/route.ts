import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { refundZeroOutputJob, creditsBypassEnabled, checkRateLimit, clientIp } from '@/lib/db';
import { getSessionEmail } from '@/lib/authToken';

/**
 * POST /api/credits/refund-failed — 산출물 0장 생성의 크레딧 자동 환불.
 *
 * 선차감(strategy) 후 파이프라인 실패·이탈로 이미지가 0장인 jobKey만 환불된다.
 * 검증은 전부 서버 원장 기준(본인 차감 기록·이미지 카운터 0·기환불 없음 — 단일 SQL 원자).
 * 클라는 실패 경로(catch·빈 결과 화면)에서만 호출하지만, 언제 호출돼도 안전하다 —
 * 이미지가 나간 jobKey는 not_eligible, 환불된 jobKey는 이후 이미지 생성이 402로 막힘.
 */
export async function POST(req: NextRequest) {
  const email = await getSessionEmail(req);
  if (!email) return NextResponse.json({ error: '로그인이 필요해요.' }, { status: 401 });

  if (creditsBypassEnabled()) {
    return NextResponse.json({ status: 'not_eligible' });   // dev/harness — 원장 없음, no-op
  }

  const rate = await checkRateLimit('prep', email, clientIp(req));
  if (!rate.allowed) return NextResponse.json({ error: '요청이 너무 잦아요. 잠시 후 다시 시도해주세요.' }, { status: 429 });

  let jobKey: unknown;
  try {
    ({ jobKey } = await req.json());
  } catch {
    return NextResponse.json({ error: '잘못된 요청이에요.' }, { status: 400 });
  }
  if (!jobKey || typeof jobKey !== 'string' || jobKey.length > 100) {
    return NextResponse.json({ error: 'jobKey가 필요해요.' }, { status: 400 });
  }

  try {
    const r = await refundZeroOutputJob(email, jobKey);
    if (r.status === 'refunded') console.log(`[refund-failed] ${email} ${jobKey} → 환불(잔액 ${r.balance})`);
    return NextResponse.json({ status: r.status, balance: r.balance });
  } catch (err) {
    console.error('[refund-failed] 오류:', err);
    return NextResponse.json({ error: '환불 처리 중 오류가 발생했어요.' }, { status: 500 });
  }
}
