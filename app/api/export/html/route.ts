import { NextRequest, NextResponse } from 'next/server';
import { getSessionEmail } from '@/lib/authToken';
import { ensureSchemaOnce, hasPaidHistory, recordDownload } from '@/lib/db';
import { buildBlogExportHtml, buildSlideExportHtml, type ExportSection, type PurchaseInfo } from '@/lib/exportHtml';

/**
 * 결과물 내보내기 — 서버가 권한을 확인하고 파일을 만들어 내려준다(2026-08-01).
 *
 * ★왜 서버로 옮겼나: 기존 게이트는 브라우저 안에만 있었다. 서버는 "권한 있음/없음"만
 *  알려주고 파일은 브라우저가 조립했기 때문에, 개발자도구로 그 판정을 바꾸면
 *  체험 계정도 완성된 상세페이지를 받아갈 수 있었다. 문지기가 문 밖에 서 있던 셈이다.
 *  이제 권한을 통과해야 파일이 나온다.
 *
 * ★한계는 분명히 해둔다: 이미지는 화면에 보여주려면 브라우저로 내려갈 수밖에 없어,
 *  작정하면 낱장은 빼낼 수 있다. 여기서 지키는 것은 '조립된 결과물'이다.
 *  완전 차단은 미리보기를 워터마크·저해상도로 낮춰야 하는데, 체험이 한 페이지뿐인
 *  현재 규모에서는 미리보기 경험을 해치는 쪽이 손해가 크다고 판단했다.
 *
 * ★이미지 압축(canvas)은 브라우저에 남는다 — 압축본을 받으므로 업로드량도 줄고,
 *  서버는 문자열 조립만 한다.
 */
export const maxDuration = 60;

/** 업로드 상한 — 압축본 기준 8섹션 ≈ 2MB. 여유를 둬 24MB에서 자른다(메모리 방어). */
const MAX_BODY_CHARS = 24_000_000;

interface Body {
  sections?: ExportSection[];
  meta?: string;
  productName?: string;
  isSlide?: boolean;
  sectionImages?: Record<string, string>;   // 압축된 data URL
  blockImages?: Record<string, string>;
  blockAspects?: Record<string, string>;
  purchaseInfo?: PurchaseInfo;
}

export async function POST(req: NextRequest) {
  await ensureSchemaOnce();

  const email = await getSessionEmail(req);
  if (!email) {
    return NextResponse.json({ error: '로그인이 필요해요.' }, { status: 401 });
  }

  // ★게이트 — 유료 결제 이력이 있어야 결과물을 내보낼 수 있다(체험은 화면 확인·수정까지).
  const paid = await hasPaidHistory(email);
  if (!paid) {
    return NextResponse.json(
      { error: '결과물 다운로드는 유료 플랜에서 가능해요.', code: 'download_locked' },
      { status: 402 },
    );
  }

  const raw = await req.text();
  if (raw.length > MAX_BODY_CHARS) {
    return NextResponse.json({ error: '이미지 용량이 너무 커요. 일부 이미지를 줄여주세요.' }, { status: 413 });
  }

  let body: Body;
  try { body = JSON.parse(raw) as Body; }
  catch { return NextResponse.json({ error: '요청 형식이 올바르지 않아요.' }, { status: 400 }); }

  const sections = Array.isArray(body.sections) ? body.sections : [];
  if (!sections.length) {
    return NextResponse.json({ error: '내보낼 섹션이 없어요.' }, { status: 400 });
  }

  const productName = String(body.productName ?? '').slice(0, 200);
  const meta = String(body.meta ?? '').slice(0, 500);

  let html: string;
  try {
    html = body.isSlide
      ? buildSlideExportHtml(sections, meta, productName, body.sectionImages ?? {})
      : buildBlogExportHtml(
          sections, meta, productName,
          body.sectionImages ?? {}, body.blockImages ?? {}, body.blockAspects ?? {},
          body.purchaseInfo,
        );
  } catch (err) {
    console.error('[export/html] 조립 실패:', err);
    return NextResponse.json({ error: '파일을 만드는 중 오류가 발생했어요.' }, { status: 500 });
  }

  // 환불 판정용 이력 — 실패해도 내보내기를 막지 않는다
  void recordDownload(email, body.isSlide ? 'html-slide' : 'html');

  const filename = `${(productName || 'flik').replace(/[/\\?%*:|"<>]/g, '_')}_detail.html`;
  return new NextResponse(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      // ★RFC 5987 — 한글 파일명이 깨지지 않게 filename*도 함께 준다
      'Content-Disposition': `attachment; filename="flik_detail.html"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      'Cache-Control': 'no-store',
    },
  });
}
