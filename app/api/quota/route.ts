import { NextRequest, NextResponse } from 'next/server';
import { getSessionEmail } from '@/lib/authToken';
import { peekUsageQuota } from '@/lib/db';
import { calculateFreeRegenQuota } from '@/lib/pricing';

/**
 * 남은 무료 재생성 조회(2026-08-04) — 차감 없이 읽기만 한다.
 *
 * ★왜 필요한가: 결과 화면에 '무료 재생성 N장 남았어요' 안내는 있었지만,
 *   재생성을 한 번 눌러 서버 응답을 받아야만 숫자가 채워졌다. 즉 처음 들어온 셀러는
 *   무료가 몇 번인지 모른 채 "재생성하면 돈이 나가나?" 하고 안 누른다.
 *   결과 화면에 들어오는 순간 알려주려면 읽기 전용 조회가 필요하다.
 *
 * ⚠️크레딧을 건드리지 않는다. 카운터를 증가시키지도 않는다(peek).
 */
export async function GET(req: NextRequest) {
  const email = await getSessionEmail(req);
  if (!email) return NextResponse.json({ error: '로그인이 필요해요.' }, { status: 401 });

  const jobKey = req.nextUrl.searchParams.get('jobKey') ?? '';
  const sections = Number(req.nextUrl.searchParams.get('sections') ?? '0');
  if (!jobKey) return NextResponse.json({ error: 'jobKey가 필요해요.' }, { status: 400 });

  const limit = calculateFreeRegenQuota(Number.isFinite(sections) ? sections : 0);
  const used = await peekUsageQuota(`freeregen:${jobKey}`);
  return NextResponse.json({ limit, used, freeRegenLeft: Math.max(0, limit - used) });
}
