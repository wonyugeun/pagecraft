import { NextRequest, NextResponse } from 'next/server';
import { runCopy } from '@/lib/stages/copy';

/**
 * Stage3 (카피 생성, v5) 프로토타입 — 검증 전용 라우트.
 * 핵심 로직은 lib/stages/copy.ts(runCopy)로 추출됨(통합 파이프라인과 공유).
 * 이 라우트는 입력 파싱·검증 + 응답 래핑만 담당하며 외부 동작은 종전과 동일하다.
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
  const { dna, strategy, sections, cat, ch, out, depth } = await req.json() as {
    dna?: Record<string, unknown>;
    strategy?: Strategy;
    sections?: SectionPlan[];
    cat?: string; ch?: string; out?: string; depth?: string;
  };

  if (!strategy || !Array.isArray(sections) || sections.length === 0) {
    return NextResponse.json({ error: 'strategy와 sections(=Stage2 출력)는 필수입니다.' }, { status: 400 });
  }

  try {
    const result = await runCopy({ dna, strategy, sections, cat, ch, out, depth });
    return NextResponse.json(result);
  } catch (err) {
    console.error('Copy error:', err);
    const msg = err instanceof Error ? err.message : '알 수 없는 오류';
    return NextResponse.json({ sections: [], error: `카피 생성 중 오류가 발생했어요: ${msg}` }, { status: 500 });
  }
}
