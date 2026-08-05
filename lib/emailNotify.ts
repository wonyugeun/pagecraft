import nodemailer from 'nodemailer';

/**
 * 관리자 이메일 알림(2026-08-04 유근님) — 셀러 의견을 카톡 대신 메일로 받는다.
 *
 * ★왜 이메일인가: 카톡 알림은 일상 메시지에 섞여 정신없다(유근님). 메일함은 답장할 일이
 *   쌓이는 곳이라 셀러 의견의 성격과 맞고, 받은 편지함이 곧 처리 대기열이 된다.
 *
 * 설정(환경변수 3개, 지메일 기준):
 *   NOTIFY_SMTP_USER = 받는/보내는 지메일 주소
 *   NOTIFY_SMTP_PASS = 구글 '앱 비밀번호' 16자리(계정 비밀번호 아님 — 2단계 인증 필요)
 *   NOTIFY_EMAIL_TO  = (선택) 받을 주소가 보내는 주소와 다를 때만
 *
 * ⚠️알림은 부가 기능이다 — 실패해도 호출부의 본 작업(의견 저장 등)을 절대 막지 않는다.
 *   여기서 throw하지 않고 로그만 남긴다.
 */

export function emailConfigured(): boolean {
  return Boolean(process.env.NOTIFY_SMTP_USER && process.env.NOTIFY_SMTP_PASS);
}

export async function sendAdminEmail(subject: string, text: string, imageDataUrl?: string | null): Promise<void> {
  const user = process.env.NOTIFY_SMTP_USER;
  const pass = process.env.NOTIFY_SMTP_PASS;
  if (!user || !pass) return;

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.NOTIFY_SMTP_HOST ?? 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: { user, pass },
      connectionTimeout: 10_000,
    });
    await transporter.sendMail({
      from: `"Flik 알림" <${user}>`,
      to: process.env.NOTIFY_EMAIL_TO ?? user,
      subject,
      text,
      // 셀러가 첨부한 스크린샷 — 메일에서 바로 봐야 회신 판단이 된다.
      // data URL을 nodemailer path로 넘기지 않고 직접 디코드한다(해석 실패 여지 제거).
      ...(imageDataUrl?.startsWith('data:image/')
        ? {
            attachments: [{
              filename: `첨부이미지.${/^data:image\/png/.test(imageDataUrl) ? 'png' : 'jpg'}`,
              content: Buffer.from(imageDataUrl.slice(imageDataUrl.indexOf(',') + 1), 'base64'),
            }],
          }
        : {}),
    });
  } catch (err) {
    console.error('[emailNotify] 발송 실패:', err);
  }
}
