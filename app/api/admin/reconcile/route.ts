import { NextRequest, NextResponse } from 'next/server';
import { getSessionEmail } from '@/lib/authToken';
import { ensureSchemaOnce } from '@/lib/db';
import { isAdminEmail } from '@/lib/portone';
import { reconcilePayments } from '@/lib/reconcile';

/**
 * 결제 대사 API — 판정·교정 규칙은 lib/reconcile.ts에 있고 여기서는 권한만 지킨다.
 *
 * 사용:
 *   GET  /api/admin/reconcile         진단만(아무것도 바꾸지 않음)
 *   GET  /api/admin/reconcile?all=1   종료된 주문까지 포함해 진단
 *   POST /api/admin/reconcile { "apply": true }   교정 실행
 */
export const maxDuration = 120;

async function guard(req: NextRequest) {
  await ensureSchemaOnce();
  const email = await getSessionEmail(req);
  if (!email) return NextResponse.json({ error: '로그인이 필요해요.' }, { status: 401 });
  if (!isAdminEmail(email)) return NextResponse.json({ error: '권한이 없어요.' }, { status: 403 });
  return null;
}

export async function GET(req: NextRequest) {
  const denied = await guard(req);
  if (denied) return denied;

  const includeAll = req.nextUrl.searchParams.get('all') === '1';
  return NextResponse.json(await reconcilePayments({ doApply: false, includeAll }));
}

export async function POST(req: NextRequest) {
  const denied = await guard(req);
  if (denied) return denied;

  const body = await req.json().catch(() => ({})) as { apply?: boolean; all?: boolean };
  // 실행은 명시적으로만 — 실수로 POST해도 아무 일 없게
  if (!body.apply) {
    return NextResponse.json({ error: '{ "apply": true }를 보내야 실행됩니다.' }, { status: 400 });
  }
  return NextResponse.json(await reconcilePayments({ doApply: true, includeAll: body.all === true }));
}
