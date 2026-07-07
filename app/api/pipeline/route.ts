import { NextRequest, NextResponse } from 'next/server';
import { runPipeline, type PipelineInput } from '@/lib/pipeline';
import { creditsBypassEnabled } from '@/lib/db';

/**
 * 엔진 통합 1단계 — 통합 파이프라인 진입점.
 * 입력(상품정보)을 받아 strategy→structure→copy→imagebrief를 순서대로 돌려 최종 결과를 반환한다.
 * 화면 연결·기존 generate 정리는 이후 단계. 이미지(Gemini) 실제 생성은 기본 off(연결만 준비).
 */

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  // ★최소 잠금(P0) — 이 경로는 현재 클라이언트가 사용하지 않는 서버 통합 실행 진입점인데
  //   크레딧 차감 없이 전체 파이프라인(Claude 다수 호출)을 돌릴 수 있어 dev 우회일 때만 허용.
  //   (프로덕션 재개방 시에는 strategy 게이트와 동일한 선차감을 붙여야 함)
  if (!creditsBypassEnabled()) {
    return NextResponse.json({ error: '이 경로는 사용이 중지됐어요. 앱 화면에서 생성해주세요.' }, { status: 403 });
  }
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
