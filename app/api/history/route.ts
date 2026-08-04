import { NextRequest, NextResponse } from 'next/server';
import { getSessionEmail } from '@/lib/authToken';
import { sql } from '@/lib/db';

/**
 * 기기 간 '최근 작업' 목록(2026-08-04) — 목록만 서버에 둔다.
 *
 * ★왜 목록만인가: 결과물은 섹션 카피 + 이미지 base64라 16섹션이면 수십 MB다. DB에 넣을 것이 아니고,
 *   넣는 순간 백업·비용·유출 위험이 한꺼번에 커진다. 셀러가 폰에서 확인하고 싶은 건 대개
 *   "내가 뭘 만들었더라"이지 그 자리에서 이어 만드는 게 아니다.
 *
 * ⚠️그래서 다른 기기에서 만든 항목은 열 수 없다. 화면에서 그 사실을 반드시 밝힌다 —
 *   숨기면 눌렀을 때 아무 일도 안 일어나 고장으로 보인다.
 */

export async function POST(req: NextRequest) {
  const email = await getSessionEmail(req);
  if (!email) return NextResponse.json({ error: '로그인이 필요해요.' }, { status: 401 });

  const b = await req.json() as {
    jobKey?: string; productName?: string; cat?: string; ch?: string; out?: string; secCnt?: number;
  };
  if (!b.jobKey || !b.productName) {
    return NextResponse.json({ error: 'jobKey와 productName이 필요해요.' }, { status: 400 });
  }

  try {
    // 같은 작업을 다시 저장해도 한 줄만 남는다(재생성·재저장 시 이름/섹션 수만 갱신)
    await sql`
      INSERT INTO job_index (job_key, email, product_name, cat, ch, out_type, sec_cnt)
      VALUES (${b.jobKey}, ${email}, ${b.productName.slice(0, 200)}, ${b.cat ?? null},
              ${b.ch ?? null}, ${b.out ?? null}, ${Number(b.secCnt) || null})
      ON CONFLICT (job_key) DO UPDATE
        SET product_name = EXCLUDED.product_name, sec_cnt = EXCLUDED.sec_cnt`;
    return NextResponse.json({ ok: true });
  } catch (err) {
    // 목록 동기화 실패가 생성 흐름을 막으면 안 된다 — 조용히 실패하고 로컬 기록은 그대로 남는다
    console.error('[history] 저장 실패:', err);
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}

export async function GET(req: NextRequest) {
  const email = await getSessionEmail(req);
  if (!email) return NextResponse.json({ error: '로그인이 필요해요.' }, { status: 401 });
  try {
    const rows = await sql`
      SELECT job_key, product_name, cat, ch, out_type, sec_cnt, created_at
      FROM job_index WHERE email = ${email}
      ORDER BY created_at DESC LIMIT 30` as Array<Record<string, unknown>>;
    return NextResponse.json({
      items: rows.map(r => ({
        jobKey: r.job_key, productName: r.product_name, cat: r.cat, ch: r.ch,
        out: r.out_type, secCnt: r.sec_cnt, createdAt: r.created_at,
      })),
    });
  } catch (err) {
    console.error('[history] 조회 실패:', err);
    return NextResponse.json({ items: [] });
  }
}
