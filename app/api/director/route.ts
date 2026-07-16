import { NextRequest, NextResponse } from 'next/server';
import { runDirector, type DirectorSectionIn } from '@/lib/stages/director';
import { verifyPaidJob, creditsBypassEnabled, checkRateLimit, clientIp } from '@/lib/db';
import { getSessionEmail } from '@/lib/authToken';
import { API_ERROR_CODES } from '@/lib/apiErrors';

/**
 * Creative Director 라우트 (Clean Baseline Phase B) — 페이지당 1회 호출.
 * 가드는 imagebrief 라우트와 동일: rate limit + verifyPaidJob(결제된 jobKey 필수) 후에만
 * LLM 호출. NEXT_PUBLIC_CLEAN_IMAGE_BRIEF ON인 클라이언트만 이 라우트를 사용한다.
 */

export const maxDuration = 120;

export async function POST(req: NextRequest) {
  const { jobKey, cat, ch, productName, productExtra, diff, brand, sections, productImage } = await req.json() as {
    jobKey?: string; cat?: string; ch?: string;
    productName?: string; productExtra?: string; diff?: string; brand?: string;
    sections?: DirectorSectionIn[];
    productImage?: string | null;
  };

  if (!Array.isArray(sections) || sections.length === 0) {
    return NextResponse.json({ error: 'sections는 필수입니다.' }, { status: 400 });
  }

  // ── 유료 뒷문 가드 — imagebrief 라우트와 동일 순서(외부 호출 전 차단) ──
  if (!creditsBypassEnabled()) {
    const email = await getSessionEmail(req);
    const rl = await checkRateLimit('llm', email, clientIp(req));
    if (!rl.allowed) {
      return NextResponse.json(
        { error: `요청이 많아요 — 잠시 후 다시 시도해주세요. (${rl.window}당 ${rl.limit}회)`, code: API_ERROR_CODES.rateLimited, limit: rl.limit, used: rl.used },
        { status: 429 },
      );
    }
    const check = await verifyPaidJob(email, jobKey);
    if (!check.ok) return NextResponse.json({ error: check.error, code: check.code }, { status: check.status });
    if (sections.length > check.paidSections) {
      return NextResponse.json(
        { error: `결제된 섹션 수(${check.paidSections})를 초과한 요청(${sections.length})이에요.` },
        { status: 402 },
      );
    }
  }

  try {
    const plan = await runDirector({ jobKey, cat, ch, productName, productExtra, diff, brand, sections, productImage });
    return NextResponse.json({ plan });
  } catch (err) {
    console.error('Director error:', err);
    const msg = err instanceof Error ? err.message : '알 수 없는 오류';
    // 실패 시 클라이언트는 기존 경로로 폴백 — 생성 자체는 계속된다
    return NextResponse.json({ plan: null, error: `디렉터 기획 중 오류: ${msg}` }, { status: 500 });
  }
}
