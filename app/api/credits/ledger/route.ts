import { NextRequest, NextResponse } from 'next/server';
import { getSessionEmail } from '@/lib/authToken';
import { sql } from '@/lib/db';

/**
 * GET /api/credits/ledger — 내 크레딧 사용 내역(2026-08-04 유근님).
 *
 * ★크레딧 pill을 눌렀을 때 "어디에 얼마가 나갔는지"가 보여야 한다.
 *   잔액만 보이면 차감이 없었던 것인지, 있었는데 못 본 것인지 셀러가 구분할 수 없다 —
 *   오늘 "차감이 안 된다"는 오해도 내역이 화면에 없어서 생겼다.
 * 원장(credit_ledger)을 그대로 읽기만 한다 — 쓰기 없음, 본인 것만.
 */
export async function GET(req: NextRequest) {
  const email = await getSessionEmail(req);
  if (!email) return NextResponse.json({ error: '로그인이 필요해요.' }, { status: 401 });
  try {
    const rows = await sql`
      SELECT type, amount, reason, created_at
      FROM credit_ledger WHERE user_email = ${email}
      ORDER BY created_at DESC LIMIT 40` as Array<Record<string, unknown>>;
    return NextResponse.json({
      items: rows.map(r => ({
        type: r.type, amount: Number(r.amount),
        reason: String(r.reason ?? ''), at: r.created_at,
      })),
    });
  } catch (err) {
    console.error('[credits/ledger] 조회 실패:', err);
    return NextResponse.json({ items: [] });
  }
}
