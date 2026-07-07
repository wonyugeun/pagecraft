import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { runStructure, type Dna, type Strategy } from '@/lib/stages/structure';
import { getPaidSections, creditsBypassEnabled } from '@/lib/db';
import { API_ERROR_CODES } from '@/lib/apiErrors';

/**
 * Stage2 (구조 설계) — ★결제 섹션 수 검증(P0).
 * strategy에서 jobKey로 선차감된 섹션 수(credit_ledger reason 규약 "generation:{count}")를 조회해:
 *  1) 요청 sectionCount·sectionStructure.length가 결제 수치를 초과하면 402(외부 API 호출 전 차단)
 *  2) 산출 plan이 결제 수치를 초과하면 안전하게 절단
 * "strategy에 적게 신고·차감하고 structure에 크게 요청"하는 우회를 막는다.
 * dev/harness: creditsBypassEnabled()일 때만 검증 생략(★production에서는 절대 불가).
 */

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const { dna, strategy, cat, ch, depth, sectionCount, sectionStructure, jobKey } = await req.json() as {
    dna?: Dna; strategy?: Strategy; cat?: string; ch?: string;
    depth?: '간결' | '풍부'; sectionCount?: number; sectionStructure?: string[]; jobKey?: string;
  };

  if (!dna || !strategy) {
    return NextResponse.json({ error: 'dna와 strategy(=Stage1 출력)는 필수입니다.' }, { status: 400 });
  }

  // ── 결제 섹션 수 검증(외부 API 호출 전) ──
  let paid: number | null = null;
  if (!creditsBypassEnabled()) {
    const session = await getServerSession(authOptions);
    const email = session?.user?.email;
    if (!email) return NextResponse.json({ error: '로그인이 필요해요.' }, { status: 401 });
    if (!jobKey || typeof jobKey !== 'string') {
      return NextResponse.json({ error: '생성 요청에 jobKey가 필요해요.' }, { status: 400 });
    }
    try {
      paid = await getPaidSections(email, jobKey);
    } catch (err) {
      console.error('[structure] 결제 기록 조회 오류:', err);
      return NextResponse.json({ error: '결제 기록 확인 중 오류가 발생했어요.' }, { status: 500 });
    }
    if (paid === null) {
      return NextResponse.json({ error: '결제된 생성 작업을 찾을 수 없어요. 처음부터 다시 시도해주세요.', code: API_ERROR_CODES.paymentRequired }, { status: 402 });
    }
    const requested = Math.max(sectionCount ?? 0, sectionStructure?.length ?? 0);
    if (requested > paid) {
      return NextResponse.json(
        { error: `결제된 섹션 수(${paid})를 초과한 요청(${requested})이에요.` },
        { status: 402 },
      );
    }
  }

  try {
    const result = await runStructure({ dna, strategy, cat, ch, depth, sectionCount, sectionStructure });
    // 산출 plan이 결제 수치를 초과하면 절단(안전) — LLM이 요청보다 많이 뽑는 경우 방어
    if (paid !== null && Array.isArray(result?.sections) && result.sections.length > paid) {
      console.warn(`[structure] plan ${result.sections.length}개 > 결제 ${paid}개 — 절단`);
      result.sections = result.sections.slice(0, paid);
    }
    return NextResponse.json(result);
  } catch (err) {
    console.error('Structure error:', err);
    const msg = err instanceof Error ? err.message : '알 수 없는 오류';
    return NextResponse.json({ error: `구조 설계 중 오류가 발생했어요: ${msg}` }, { status: 500 });
  }
}
