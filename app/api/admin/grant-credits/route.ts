import { NextRequest, NextResponse } from 'next/server';
import { getSessionEmail } from '@/lib/authToken';
import { isAdminEmail } from '@/lib/portone';
import { ensureSchemaOnce, sql, recordCreditLot } from '@/lib/db';

/**
 * 테스터 크레딧 지급(2026-08-06) — 대면 피드백 미팅용.
 *
 * ★왜: 신규 가입 체험은 10크레딧뿐이라 블로그형 8섹션 한 장이면 끝난다. 셀러를 앞에 앉혀두고
 *   "한 번 더 만들어볼까요?"를 못 한다. 지급 경로가 가입·구매·환불뿐이라 운영자가 손으로
 *   넣어줄 방법이 없었다.
 *
 * ★원장(credit_ledger)을 그대로 쓴다 — 지급 이력이 남아야 나중에 "이 크레딧 어디서 났지"에
 *   답할 수 있고, 셀러 화면의 사용 내역에도 정상 표시된다.
 * ★멱등키로 같은 지급이 두 번 들어가는 것을 막는다(새로고침·중복 클릭).
 *
 * 사용: 관리자 로그인 상태로
 *   POST /api/admin/grant-credits  {"email":"seller@x.com","amount":50,"note":"대면테스트"}
 */
export const maxDuration = 20;

/** 한 번에 줄 수 있는 상한 — 손이 미끄러져 5000을 넣는 사고 방지 */
const MAX_GRANT = 300;

export async function POST(req: NextRequest) {
  await ensureSchemaOnce();
  const me = await getSessionEmail(req);
  if (!me) return NextResponse.json({ error: '로그인이 필요해요.' }, { status: 401 });
  if (!isAdminEmail(me)) return NextResponse.json({ error: '권한이 없어요.' }, { status: 403 });

  const body = await req.json().catch(() => null) as
    { email?: string; amount?: number; note?: string } | null;

  const email = (body?.email ?? '').trim().toLowerCase();
  const amount = Math.round(Number(body?.amount));
  const note = (body?.note ?? '수동지급').trim().slice(0, 40).replace(/\s+/g, '_');

  /* ★카카오 계정은 이메일이 없을 수 있다(선택동의 거절 시). 그때 우리 식별자는 'kakao:12345'가 되고,
     이메일만 받으면 그 사람에겐 지급 자체를 못 한다 — 대면 테스트에서 바로 막히는 지점이다.
     이메일 또는 provider:id 두 형태를 모두 받는다. */
  const isEmail = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
  const isProviderId = /^(kakao|google):[a-z0-9._-]+$/i.test(email);
  if (!isEmail && !isProviderId) {
    return NextResponse.json({
      error: '이메일(seller@gmail.com) 또는 계정 식별자(kakao:12345) 형태로 적어주세요.',
    }, { status: 400 });
  }
  if (!Number.isFinite(amount) || amount <= 0 || amount > MAX_GRANT) {
    return NextResponse.json({ error: `지급량은 1~${MAX_GRANT} 사이로 적어주세요.` }, { status: 400 });
  }

  // 같은 사람·같은 양·같은 사유는 하루에 한 번만(중복 클릭 방어). 더 주려면 note를 바꾸면 된다.
  const key = `admin-grant:${email}:${amount}:${note}:${new Date().toISOString().slice(0, 10)}`;

  try {
    // 계정이 없을 수도 있다(아직 가입 전) — 행부터 만들고 원장·잔액을 함께 올린다
    await sql`INSERT INTO credits (user_email, balance) VALUES (${email}, 0)
              ON CONFLICT (user_email) DO NOTHING`;
    const rows = await sql`
      WITH l AS (
        INSERT INTO credit_ledger (user_email, amount, type, reason, idempotency_key)
        VALUES (${email}, ${amount}, 'grant', ${'admin:' + note}, ${key})
        ON CONFLICT (idempotency_key) DO NOTHING
        RETURNING id
      )
      UPDATE credits SET balance = balance + ${amount}, updated_at = now()
      WHERE user_email = ${email} AND EXISTS (SELECT 1 FROM l)
      RETURNING balance` as Array<{ balance: number }>;

    if (!rows.length) {
      const cur = await sql`SELECT balance FROM credits WHERE user_email = ${email}` as Array<{ balance: number }>;
      return NextResponse.json({
        ok: true, already: true, balance: cur[0]?.balance ?? 0,
        message: '오늘 같은 조건으로 이미 지급됐어요(중복 지급 안 됨). 더 주려면 사유를 다르게 적어주세요.',
      });
    }

    // 만료 없는 지급 — 테스터에게 준 크레딧이 7일 만에 사라지면 미팅 뒤 재사용을 못 한다
    await recordCreditLot(email, amount, 'purchase', null);

    return NextResponse.json({
      ok: true, balance: rows[0].balance,
      message: `${email} 님에게 ${amount}크레딧을 지급했어요. 현재 잔액 ${rows[0].balance}.`,
    });
  } catch (err) {
    console.error('[admin/grant-credits] 실패:', err);
    return NextResponse.json({ error: '지급 중 오류가 발생했어요.' }, { status: 500 });
  }
}
