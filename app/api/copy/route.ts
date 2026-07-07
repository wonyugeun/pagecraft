import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { runCopy, runCopyChunk, type StrategySummary } from '@/lib/stages/copy';
import { verifyPaidJob, creditsBypassEnabled, checkRateLimit, clientIp } from '@/lib/db';
import { API_ERROR_CODES } from '@/lib/apiErrors';

/**
 * Stage3 (카피 생성, v5) 프로토타입 — 검증 전용 라우트.
 * 핵심 로직은 lib/stages/copy.ts로 추출됨(통합 파이프라인과 공유).
 *
 * 두 가지 호출 모드:
 *  ① 청크 모드 [통합 2단계] — strategySummary + startIndex + totalSections + sections(한 청크)
 *     → runCopyChunk 1회. 각 호출이 독립적으로 300초 내에 끝나게 분할 호출하는 단위.
 *  ② 전체 모드 (기존 호환) — dna + strategy + sections(전체) → runCopy(내부 청크 순차).
 */

export const maxDuration = 300;

interface Strategy {
  concept?: string; story_flow?: string; tone?: string; hero_angle?: string; cta_angle?: string;
  [k: string]: unknown;
}
interface SectionPlan {
  name?: string; role?: string; mission?: string; emotion_goal?: string; writing_style?: string;
}

export async function POST(req: NextRequest) {
  const body = await req.json() as {
    // 청크 모드
    strategySummary?: StrategySummary;
    startIndex?: number;
    totalSections?: number;
    // 전체 모드
    dna?: Record<string, unknown>;
    strategy?: Strategy;
    // 공통
    sections?: SectionPlan[];
    cat?: string; ch?: string; out?: string; depth?: string;
    knownFacts?: string;   // 셀러 원입력(productName+productExtra) — 후처리 날조 그물 허용 기준
    jobKey?: string;       // ★결제 검증(P0 2차) — strategy에서 선차감된 생성 작업의 멱등키
  };

  const { strategySummary, startIndex, totalSections, dna, strategy, sections, cat, ch, out, depth, knownFacts, jobKey } = body;

  // ── ★유료 뒷문 가드(P0 2차) — 외부 Claude 호출 전: 결제된 jobKey + 결제 범위 검증 ──
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
    // 청크 모드: totalSections·(startIndex+청크 크기) / 전체 모드: sections.length — 어느 쪽도 결제 초과 금지
    const requested = Math.max(totalSections ?? 0, (startIndex ?? 0) + (sections?.length ?? 0));
    if (requested > check.paidSections) {
      return NextResponse.json(
        { error: `결제된 섹션 수(${check.paidSections})를 초과한 요청(${requested})이에요.` },
        { status: 402 },
      );
    }
  }

  // ① 청크 모드
  if (strategySummary && typeof startIndex === 'number' && typeof totalSections === 'number') {
    if (!Array.isArray(sections) || sections.length === 0) {
      return NextResponse.json({ error: '청크 모드: sections(이 청크 섹션들)는 필수입니다.' }, { status: 400 });
    }
    try {
      const out_ = await runCopyChunk({ strategySummary, sections, startIndex, totalSections, cat, ch, out, depth, knownFacts });
      return NextResponse.json({ sections: out_, chunk: { startIndex, count: out_.length } });
    } catch (err) {
      console.error('Copy(chunk) error:', err);
      const msg = err instanceof Error ? err.message : '알 수 없는 오류';
      return NextResponse.json({ sections: [], error: `카피 생성 중 오류가 발생했어요: ${msg}` }, { status: 500 });
    }
  }

  // ② 전체 모드 (기존 호환)
  if (!strategy || !Array.isArray(sections) || sections.length === 0) {
    return NextResponse.json({ error: 'strategy와 sections(=Stage2 출력)는 필수입니다.' }, { status: 400 });
  }
  try {
    const result = await runCopy({ dna, strategy, sections, cat, ch, out, depth, knownFacts });
    return NextResponse.json(result);
  } catch (err) {
    console.error('Copy error:', err);
    const msg = err instanceof Error ? err.message : '알 수 없는 오류';
    return NextResponse.json({ sections: [], error: `카피 생성 중 오류가 발생했어요: ${msg}` }, { status: 500 });
  }
}
