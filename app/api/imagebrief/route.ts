import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { runImagebrief } from '@/lib/stages/imagebrief';
import { verifyPaidJob, creditsBypassEnabled, checkRateLimit, clientIp } from '@/lib/db';
import { API_ERROR_CODES } from '@/lib/apiErrors';

/**
 * Stage4 (이미지 브리프 생성) 프로토타입 — 검증 전용 라우트.
 * 핵심 로직은 lib/stages/imagebrief.ts(runImagebrief)로 추출됨(통합 파이프라인과 공유).
 * 이 라우트는 입력 파싱·검증 + 응답 래핑만 담당하며 외부 동작은 종전과 동일하다.
 * 실제 Gemini 이미지 생성은 하지 않는다(브리프 JSON만).
 */

export const maxDuration = 300;

interface Strategy {
  concept?: string; story_flow?: string; tone?: string; hero_angle?: string; cta_angle?: string;
  [k: string]: unknown;
}
interface SectionPlan { name?: string; role?: string; mission?: string }
interface CopyItem { name?: string; headline?: string; subcopy?: string; body?: string }

export async function POST(req: NextRequest) {
  const { dna, strategy, sections, copy, cat, ch, out, visual, productForm, productVolume, productShapeProfile, productName, productExtra, jobKey } = await req.json() as {
    dna?: Record<string, unknown>;
    strategy?: Strategy;
    sections?: SectionPlan[];
    copy?: CopyItem[];
    cat?: string; ch?: string; out?: string;
    visual?: { primary_color?: string; accent_color?: string; soft_color?: string; mood?: string; palette?: string };
    productForm?: string; productVolume?: string; productShapeProfile?: string;
    productName?: string; productExtra?: string;
    jobKey?: string;   // ★결제 검증(P0 2차)
  };

  if (!strategy || !Array.isArray(sections) || sections.length === 0) {
    return NextResponse.json({ error: 'strategy와 sections(=Stage2 출력)는 필수입니다.' }, { status: 400 });
  }

  // ── ★유료 뒷문 가드(P0 2차) — runImagebrief(브리프 Claude 청크 + Product Understanding 호출 포함)
  //    보다 먼저 실행: 결제된 jobKey + 결제 범위 검증. 외부 호출 0회로 차단. ──
  if (!creditsBypassEnabled()) {
    const session = await getServerSession(authOptions);
    const rl = await checkRateLimit('llm', session?.user?.email, clientIp(req));
    if (!rl.allowed) {
      return NextResponse.json(
        { error: `요청이 많아요 — 잠시 후 다시 시도해주세요. (${rl.window}당 ${rl.limit}회)`, code: API_ERROR_CODES.rateLimited, limit: rl.limit, used: rl.used },
        { status: 429 },
      );
    }
    const check = await verifyPaidJob(session?.user?.email, jobKey);
    if (!check.ok) return NextResponse.json({ error: check.error, code: check.code }, { status: check.status });
    if (sections.length > check.paidSections) {
      return NextResponse.json(
        { error: `결제된 섹션 수(${check.paidSections})를 초과한 요청(${sections.length})이에요.` },
        { status: 402 },
      );
    }
  }

  try {
    const result = await runImagebrief({ dna, strategy, sections, copy, cat, ch, out, visual, productForm, productVolume, productShapeProfile, productName, productExtra });
    return NextResponse.json(result);
  } catch (err) {
    console.error('Imagebrief error:', err);
    const msg = err instanceof Error ? err.message : '알 수 없는 오류';
    return NextResponse.json({ briefs: [], error: `이미지 브리프 생성 중 오류가 발생했어요: ${msg}` }, { status: 500 });
  }
}
