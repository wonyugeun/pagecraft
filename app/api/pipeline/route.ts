import { NextRequest, NextResponse } from 'next/server';
import { runPipeline, type PipelineInput } from '@/lib/pipeline';

/**
 * 엔진 통합 1단계 — 통합 파이프라인 진입점.
 * 입력(상품정보)을 받아 strategy→structure→copy→imagebrief를 순서대로 돌려 최종 결과를 반환한다.
 * 화면 연결·기존 generate 정리는 이후 단계. 이미지(Gemini) 실제 생성은 기본 off(연결만 준비).
 */

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const input = await req.json() as PipelineInput;

  try {
    const result = await runPipeline(input);
    return NextResponse.json(result);
  } catch (err) {
    console.error('Pipeline error:', err);
    const msg = err instanceof Error ? err.message : '알 수 없는 오류';
    return NextResponse.json({ sections: [], error: `통합 파이프라인 실행 중 오류가 발생했어요: ${msg}` }, { status: 500 });
  }
}
