import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

// 첨부 경로 검증용 8x8 주황 PNG — 이 이미지가 메일에 붙어 오면 첨부 코드가 정상이다
const TEST_PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAFklEQVR4AWP4z8Dwn4EIMKpwVCEDAwB1fx4hFPeCIQAAAABJRU5ErkJggg==';
import { getSessionEmail } from '@/lib/authToken';
import { isAdminEmail } from '@/lib/portone';

/**
 * 이메일 알림 진단(2026-08-05) — 관리자가 브라우저로 열면 테스트 메일을 쏘고 결과를 그대로 보여준다.
 *
 * ★왜: NOTIFY_SMTP_* 가 Vercel Sensitive라 밖에서 값을 검사할 수 없다. 발송이 조용히 실패하면
 *   원인(비밀번호 오류인지, 변수 누락인지)을 알 길이 없어, 서버 안에서 직접 시도하고 에러를
 *   문장으로 돌려준다. 비밀번호 값 자체는 절대 응답에 싣지 않는다 — 길이와 에러 메시지만.
 */
export async function GET(req: NextRequest) {
  const email = await getSessionEmail(req);
  if (!email) return NextResponse.json({ error: '로그인이 필요해요.' }, { status: 401 });
  if (!isAdminEmail(email)) return NextResponse.json({ error: '권한이 없어요.' }, { status: 403 });

  const user = process.env.NOTIFY_SMTP_USER;
  const pass = process.env.NOTIFY_SMTP_PASS;
  const check = {
    NOTIFY_SMTP_USER: user ? `설정됨(${user})` : '❌ 없음',
    NOTIFY_SMTP_PASS: pass ? `설정됨(길이 ${pass.length}${/\s/.test(pass) ? ', ⚠️공백 포함' : ''})` : '❌ 없음',
  };
  if (!user || !pass) {
    return NextResponse.json({ ok: false, check, 해결: '환경변수를 넣고 Redeploy 했는지 확인하세요.' });
  }

  try {
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com', port: 465, secure: true,
      auth: { user, pass }, connectionTimeout: 10_000,
    });
    await transporter.verify();   // 인증만 먼저 — 여기서 실패하면 비밀번호 문제
    await transporter.sendMail({
      from: `"Flik 알림" <${user}>`, to: process.env.NOTIFY_EMAIL_TO ?? user,
      subject: '[Flik] 이메일 알림 테스트 ✅', text: '이 메일이 왔다면 알림 설정 완료입니다. 첨부이미지.png가 붙어 있으면 이미지 첨부도 정상입니다.',
      attachments: [{ filename: '첨부이미지.png', path: TEST_PNG }],
    });
    return NextResponse.json({ ok: true, check, 결과: '발송 성공 — 메일함(스팸함 포함)을 확인하세요.' });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({
      ok: false, check, 에러: msg.slice(0, 300),
      해결: msg.includes('535') || /auth/i.test(msg)
        ? '구글이 로그인을 거부했어요 — 앱 비밀번호가 아니거나(16자리 영문), 다른 계정에서 발급된 것일 수 있어요. flik.support 계정으로 다시 발급해 교체하세요.'
        : '에러 메시지를 그대로 개발 세션에 전달해주세요.',
    });
  }
}
