import { NextRequest, NextResponse } from 'next/server';
import { runImagebrief } from '@/lib/stages/imagebrief';

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
  const { dna, strategy, sections, copy, cat, ch, out, visual, productForm, productVolume, productShapeProfile, productName, productExtra } = await req.json() as {
    dna?: Record<string, unknown>;
    strategy?: Strategy;
    sections?: SectionPlan[];
    copy?: CopyItem[];
    cat?: string; ch?: string; out?: string;
    visual?: { primary_color?: string; accent_color?: string; soft_color?: string; mood?: string; palette?: string };
    productForm?: string; productVolume?: string; productShapeProfile?: string;
    productName?: string; productExtra?: string;
  };

  if (!strategy || !Array.isArray(sections) || sections.length === 0) {
    return NextResponse.json({ error: 'strategy와 sections(=Stage2 출력)는 필수입니다.' }, { status: 400 });
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
