import { NextRequest, NextResponse } from 'next/server';
import { runStructure, type Dna, type Strategy } from '@/lib/stages/structure';

/**
 * Stage2 (구조 설계) 프로토타입 — 검증 전용 라우트.
 * 핵심 로직은 lib/stages/structure.ts(runStructure)로 추출됨(통합 파이프라인과 공유).
 * 이 라우트는 입력 파싱·검증 + 응답 래핑만 담당하며 외부 동작은 종전과 동일하다.
 */

export async function POST(req: NextRequest) {
  const { dna, strategy, cat, ch, depth, sectionCount } = await req.json() as {
    dna?: Dna; strategy?: Strategy; cat?: string; ch?: string;
    depth?: '간결' | '풍부'; sectionCount?: number;
  };

  if (!dna || !strategy) {
    return NextResponse.json({ error: 'dna와 strategy(=Stage1 출력)는 필수입니다.' }, { status: 400 });
  }

  try {
    const result = await runStructure({ dna, strategy, cat, ch, depth, sectionCount });
    return NextResponse.json(result);
  } catch (err) {
    console.error('Structure error:', err);
    const msg = err instanceof Error ? err.message : '알 수 없는 오류';
    return NextResponse.json({ error: `구조 설계 중 오류가 발생했어요: ${msg}` }, { status: 500 });
  }
}
