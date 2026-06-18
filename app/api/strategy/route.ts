import { NextRequest, NextResponse } from 'next/server';
import { runStrategy } from '@/lib/stages/strategy';

/**
 * Stage1 (DNA + 전략) 프로토타입 — 검증 전용 라우트.
 * 핵심 로직은 lib/stages/strategy.ts(runStrategy)로 추출됨(통합 파이프라인과 공유).
 * 이 라우트는 입력 파싱 + 응답 래핑만 담당하며 외부 동작은 종전과 동일하다.
 */

export async function POST(req: NextRequest) {
  const { cat, ch, productName, productExtra } = await req.json() as {
    cat?: string; ch?: string; productName?: string; productExtra?: string;
  };

  try {
    const result = await runStrategy({ cat, ch, productName, productExtra });
    return NextResponse.json(result);
  } catch (err) {
    console.error('Strategy error:', err);
    const msg = err instanceof Error ? err.message : '알 수 없는 오류';
    return NextResponse.json({ error: `전략 도출 중 오류가 발생했어요: ${msg}` }, { status: 500 });
  }
}
