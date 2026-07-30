import { NextRequest, NextResponse } from 'next/server';
import { getSessionEmail } from '@/lib/authToken';
import { hasPaidHistory, creditsBypassEnabled, ensureSchemaOnce } from '@/lib/db';
import { TRIAL_MAX_SECTIONS } from '@/lib/pricing';

/**
 * 이용 권한 조회(2026-07-30) — 클라이언트가 "다운로드 가능 여부 / 섹션 상한"을 물어보는 곳.
 *
 * ★서버가 유일한 판정 기준이다. 다만 블로그형 결과물은 클라이언트에서 파일을 만들기 때문에
 *   이 API만으로 완벽히 차단되지는 않는다(결과물은 이미 화면에 있음). 목적은 두 가지:
 *     1) 정상 사용자에게 정책을 정확히 표시하고 결제로 유도
 *     2) 결제 오픈 후 서버 내보내기 API를 추가할 때 판정 로직을 여기 한 곳에 두기
 */
export async function GET(req: NextRequest) {
  await ensureSchemaOnce();
  const email = await getSessionEmail(req);
  if (!email) return NextResponse.json({ error: '로그인이 필요해요.' }, { status: 401 });

  // dev/harness 우회 시엔 제한 없이(로컬 테스트가 게이트에 막히지 않게)
  const paid = creditsBypassEnabled() ? true : await hasPaidHistory(email);

  return NextResponse.json({
    paid,
    canDownload: paid,
    maxSections: paid ? null : TRIAL_MAX_SECTIONS,
  });
}
