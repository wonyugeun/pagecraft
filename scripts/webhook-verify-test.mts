/**
 * 웹훅 서명 검증 테스트 (0원, 네트워크 없음).
 * Standard Webhooks 규격대로 서명을 만들어 넣고, 위·변조가 실제로 걸러지는지 확인한다.
 * 실행: npx --yes tsx scripts/webhook-verify-test.mts
 */
import { createHmac, randomBytes } from 'node:crypto';

const SECRET_RAW = randomBytes(24).toString('base64');
process.env.PORTONE_WEBHOOK_SECRET = `whsec_${SECRET_RAW}`;

const { verifyPortOneWebhook } = await import('../lib/portone');

const sign = (id: string, ts: string, body: string, secret = SECRET_RAW) =>
  createHmac('sha256', Buffer.from(secret, 'base64')).update(`${id}.${ts}.${body}`).digest('base64');

const now = () => String(Math.floor(Date.now() / 1000));
const BODY = JSON.stringify({ type: 'Transaction.Cancelled', data: { paymentId: 'flikTEST123' } });

const h = (o: Record<string, string>) => new Headers(o);
let pass = true;
const chk = (label: string, ok: boolean, detail = '') => {
  if (!ok) pass = false;
  console.log(`  ${ok ? '✅' : '❌'} ${label}${detail ? ' — ' + detail : ''}`);
};

console.log('1) 정상 서명');
{
  const id = 'msg_1', ts = now();
  const r = verifyPortOneWebhook(BODY, h({
    'webhook-id': id, 'webhook-timestamp': ts, 'webhook-signature': `v1,${sign(id, ts, BODY)}`,
  }));
  chk('통과해야 함', r.ok === true, JSON.stringify(r));
}

console.log('2) 본문 변조 — 금액/결제ID를 바꿔치기한 경우');
{
  const id = 'msg_2', ts = now();
  const sig = sign(id, ts, BODY);
  const tampered = JSON.stringify({ type: 'Transaction.Paid', data: { paymentId: 'flikEVIL999' } });
  const r = verifyPortOneWebhook(tampered, h({
    'webhook-id': id, 'webhook-timestamp': ts, 'webhook-signature': `v1,${sig}`,
  }));
  chk('거부해야 함', r.ok === false, JSON.stringify(r));
}

console.log('3) 다른 키로 서명 — 시크릿을 모르는 공격자');
{
  const id = 'msg_3', ts = now();
  const evil = randomBytes(24).toString('base64');
  const r = verifyPortOneWebhook(BODY, h({
    'webhook-id': id, 'webhook-timestamp': ts, 'webhook-signature': `v1,${sign(id, ts, BODY, evil)}`,
  }));
  chk('거부해야 함', r.ok === false, JSON.stringify(r));
}

console.log('4) 재생 공격 — 오래된(10분 전) 정상 서명 재사용');
{
  const id = 'msg_4', ts = String(Math.floor(Date.now() / 1000) - 600);
  const r = verifyPortOneWebhook(BODY, h({
    'webhook-id': id, 'webhook-timestamp': ts, 'webhook-signature': `v1,${sign(id, ts, BODY)}`,
  }));
  chk('거부해야 함', r.ok === false, (r as { reason?: string }).reason ?? '');
}

console.log('5) webhook-id 바꿔치기 — 서명 대상 문자열이 달라진다');
{
  const id = 'msg_5', ts = now();
  const r = verifyPortOneWebhook(BODY, h({
    'webhook-id': 'msg_OTHER', 'webhook-timestamp': ts, 'webhook-signature': `v1,${sign(id, ts, BODY)}`,
  }));
  chk('거부해야 함', r.ok === false, JSON.stringify(r));
}

console.log('6) 서명 헤더 누락');
{
  const r = verifyPortOneWebhook(BODY, h({ 'webhook-id': 'x', 'webhook-timestamp': now() }));
  chk('거부해야 함', r.ok === false, (r as { reason?: string }).reason ?? '');
}

console.log('7) 다중 서명(키 롤링) — 두 번째가 유효하면 통과');
{
  const id = 'msg_7', ts = now();
  const evil = randomBytes(24).toString('base64');
  const r = verifyPortOneWebhook(BODY, h({
    'webhook-id': id, 'webhook-timestamp': ts,
    'webhook-signature': `v1,${sign(id, ts, BODY, evil)} v1,${sign(id, ts, BODY)}`,
  }));
  chk('통과해야 함', r.ok === true, JSON.stringify(r));
}

console.log('8) 알 수 없는 버전 태그만 온 경우');
{
  const id = 'msg_8', ts = now();
  const r = verifyPortOneWebhook(BODY, h({
    'webhook-id': id, 'webhook-timestamp': ts, 'webhook-signature': `v9,${sign(id, ts, BODY)}`,
  }));
  chk('거부해야 함', r.ok === false, JSON.stringify(r));
}

console.log('9) 시크릿 미설정 — 검증 불가를 명시적으로 알려야 함(조용히 통과 금지)');
{
  delete process.env.PORTONE_WEBHOOK_SECRET;
  const r = verifyPortOneWebhook(BODY, h({}));
  chk("ok === 'unconfigured'", r.ok === 'unconfigured', JSON.stringify(r));
}

console.log(pass ? '\n✅ 전부 통과' : '\n❌ 실패 있음');
process.exit(pass ? 0 : 1);
