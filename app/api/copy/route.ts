import { NextRequest, NextResponse } from 'next/server';
import { runCopy, runCopyChunk, enforceSpeechLevel, COPY_MODEL_ALT, type StrategySummary } from '@/lib/stages/copy';
import { resolveOutputType } from '@/lib/outputType';
import { verifyPaidJob, creditsBypassEnabled, checkRateLimit, clientIp, consumeUsageQuota } from '@/lib/db';
import { getSessionEmail } from '@/lib/authToken';
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
    pageMap?: { name: string; mission?: string }[];   // ★전체 구성표(반복 방지) — 청크에 그대로 전달
    cat?: string; ch?: string; out?: string; depth?: string;
    knownFacts?: string;   // 셀러 원입력(productName+productExtra) — 후처리 날조 그물 허용 기준
    jobKey?: string;       // ★결제 검증(P0 2차) — strategy에서 선차감된 생성 작업의 멱등키
    salesMode?: boolean;             // ★판매 디렉팅 강화(2026-08-01) — 훅·킬러라인·분량차등
    killerLineIndex?: number;        // 킬러 라인을 맡을 섹션의 전체 인덱스(호출부가 지정)
  };

  const { strategySummary, startIndex, totalSections, dna, strategy, sections, pageMap, cat, ch, out, depth, knownFacts, jobKey,
          salesMode, killerLineIndex } = body;

  // ── ★유료 뒷문 가드(P0 2차) — 외부 Claude 호출 전: 결제된 jobKey + 결제 범위 검증 ──
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
      const chunkInput = { strategySummary, sections, startIndex, totalSections, cat, ch, out, depth, knownFacts, pageMap,
                           salesMode, killerLineIndex };
      // ★블로그형 카피 2안 — A안(기본 모델)과 B안(감성형 모델)을 병렬 생성.
      //   카피는 텍스트뿐이라 원가가 페이지당 수백 원 수준 + 블로그형은 이미지에 텍스트가 없어 이미지 재생성 불필요.
      //   B안 실패는 전체 실패로 번지지 않게 무시(A안만으로 정상 진행).
      const isBlog = resolveOutputType(ch ?? null, out ?? null) === 'blog';
      const [out_, outB] = await Promise.all([
        runCopyChunk(chunkInput),
        isBlog
          ? runCopyChunk(chunkInput, COPY_MODEL_ALT).catch(err => {
              console.warn(`[copy] B안(${COPY_MODEL_ALT}) chunk@${startIndex} 실패 — A안만 진행:`, err instanceof Error ? err.message : err);
              return null;
            })
          : Promise.resolve(null),
      ]);
      // ★산출물 전달 기록(2026-07-27 보안점검) — 카피를 실제로 받아간 job은 '이미지 0장' 환불 대상에서 제외.
      //   (이게 없으면 카피만 뽑고 환불받아 전 카피 파이프라인을 무료로 쓸 수 있었음)
      if (typeof jobKey === 'string' && jobKey) {
        try { await consumeUsageQuota(`txt:${jobKey}`, 1, 10_000); } catch { /* 기록 실패는 생성 차단 사유 아님 */ }
      }
      /* ★어투 강제 변환(2026-08-04) — 프롬프트 지시는 세 번 실패했다. 셀러가 어투를 직접
         골랐으면(strategy.speech_level) 생성된 텍스트의 어미를 별도 패스로 맞춘다.
         A·B안 모두. 실패 시 원문 유지 — 지금보다 나빠질 수 없다. */
      const lvl = (strategy as { speech_level?: string } | undefined)?.speech_level
        ?? (strategySummary as { speech_level?: string } | undefined)?.speech_level;
      const [outFixed, outBFixed] = lvl
        ? await Promise.all([
            enforceSpeechLevel(out_, lvl),
            outB ? enforceSpeechLevel(outB, lvl) : Promise.resolve(undefined),
          ])
        : [out_, outB];
      return NextResponse.json({ sections: outFixed, sectionsB: outBFixed ?? undefined, chunk: { startIndex, count: outFixed.length } });
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
