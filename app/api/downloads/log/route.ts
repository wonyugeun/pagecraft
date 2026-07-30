import { NextRequest, NextResponse } from 'next/server';
import { getSessionEmail } from '@/lib/authToken';
import { ensureSchemaOnce, recordDownload } from '@/lib/db';

/**
 * 다운로드 이력 기록(2026-07-30) — 환불 판정에 사용.
 * 실패해도 클라이언트 내보내기를 막지 않는다(기록은 부가 기능).
 */
export async function POST(req: NextRequest) {
  await ensureSchemaOnce();
  const email = await getSessionEmail(req);
  if (!email) return NextResponse.json({ ok: false }, { status: 401 });
  const { kind } = await req.json().catch(() => ({ kind: 'unknown' })) as { kind?: string };
  await recordDownload(email, kind ?? 'unknown');
  return NextResponse.json({ ok: true });
}
