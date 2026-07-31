/**
 * 카카오톡 '나에게 보내기' 최초 토큰 발급 — refresh_token을 얻는 1회성 절차.
 *
 * ★사전 준비(카카오 디벨로퍼스 developers.kakao.com):
 *   1) 내 애플리케이션 → 애플리케이션 추가하기(이름 아무거나)
 *   2) 앱 설정 → 플랫폼 → Web 등록: https://www.flik.kr
 *   3) 카카오 로그인 → 활성화 ON, Redirect URI 등록: https://www.flik.kr/login
 *   4) 카카오 로그인 → 동의항목 → '카카오톡 메시지 전송(talk_message)' 선택 동의로 설정
 *   5) 앱 키의 REST API 키를 .env.local의 KAKAO_REST_API_KEY 에 넣기
 *
 * ★사용법 2단계:
 *   npx --yes tsx scripts/kakao-token-setup.mts
 *     → 접속할 주소가 출력된다. 브라우저로 열어 로그인·동의하면
 *       https://www.flik.kr/login?code=XXXX 로 이동한다. 주소창의 code 값을 복사.
 *   npx --yes tsx scripts/kakao-token-setup.mts <복사한 code>
 *     → refresh_token이 출력된다. 이 값을 KAKAO_REFRESH_TOKEN 으로 넣으면 끝.
 *
 * ⚠️code는 1회용이고 몇 분 안에 만료된다. 실패하면 1단계부터 다시.
 */
import { readFileSync } from 'node:fs';

const env = readFileSync('.env.local', 'utf8');
for (const line of env.split('\n')) {
  const m = line.match(/^([A-Z_0-9]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
}

const REST_KEY = process.env.KAKAO_REST_API_KEY;
const REDIRECT = process.env.KAKAO_REDIRECT_URI ?? 'https://www.flik.kr/login';

if (!REST_KEY) {
  console.error('❌ KAKAO_REST_API_KEY가 .env.local에 없습니다. 위 주석의 1~5단계를 먼저 진행해주세요.');
  process.exit(1);
}

const code = process.argv[2];

if (!code) {
  const url = 'https://kauth.kakao.com/oauth/authorize'
    + `?client_id=${encodeURIComponent(REST_KEY)}`
    + `&redirect_uri=${encodeURIComponent(REDIRECT)}`
    + '&response_type=code'
    + '&scope=talk_message';
  console.log('\n1단계 — 아래 주소를 브라우저에서 열고 로그인·동의해주세요.\n');
  console.log(url);
  console.log(`\n이동한 주소(${REDIRECT}?code=...)에서 code 값을 복사한 뒤,`);
  console.log('  npx --yes tsx scripts/kakao-token-setup.mts <code>\n');
  process.exit(0);
}

const res = await fetch('https://kauth.kakao.com/oauth/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: REST_KEY,
    redirect_uri: REDIRECT,
    code,
  }),
});
const body = await res.json() as {
  access_token?: string; refresh_token?: string; refresh_token_expires_in?: number;
  error?: string; error_description?: string;
};

if (!res.ok || !body.refresh_token) {
  console.error(`\n❌ 발급 실패(${res.status}): ${body.error ?? ''} ${body.error_description ?? ''}`);
  console.error('  code가 만료됐거나 이미 쓴 값일 수 있어요. 1단계부터 다시 해주세요.');
  process.exit(1);
}

const days = Math.round((body.refresh_token_expires_in ?? 0) / 86400);
console.log('\n✅ 발급 완료 — 아래 값을 .env.local과 Vercel 환경변수에 넣어주세요.\n');
console.log(`KAKAO_REFRESH_TOKEN=${body.refresh_token}`);
console.log(`\n(유효기간 약 ${days}일. 알림이 오갈 때마다 코드가 자동으로 갱신하므로,`);
console.log(' 의견이 두 달 넘게 한 건도 없을 때만 재발급이 필요합니다.)\n');

// 바로 한 통 보내서 실제로 도착하는지 확인 — 설정만 해두고 안 오는 상태가 제일 위험하다
const test = await fetch('https://kapi.kakao.com/v2/api/talk/memo/default/send', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${body.access_token}`,
    'Content-Type': 'application/x-www-form-urlencoded',
  },
  body: new URLSearchParams({
    template_object: JSON.stringify({
      object_type: 'text',
      text: '📮 Flik 알림 연결 완료 — 앞으로 고객 의견이 여기로 옵니다.',
      link: { web_url: 'https://www.flik.kr', mobile_web_url: 'https://www.flik.kr' },
    }),
  }),
});
console.log(test.ok
  ? '📨 테스트 메시지를 보냈어요. 카카오톡 "나와의 채팅"을 확인해주세요.'
  : `⚠️테스트 전송 실패(${test.status}): ${(await test.text()).slice(0, 200)}`);
