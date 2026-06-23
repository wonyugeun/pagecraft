/**
 * GPT Image 2 격리 테스트 — route 교체 전 실모델 1장 확인.
 * 격리: 프로덕션 route(app/api/generate-image) 미접촉. OpenAI images/generations 직접 1회 호출.
 * 실행: node scripts/gpt-image-test.mjs
 * 산출: _prototype_out/gpt-image-test.png (+ meta 콘솔)
 *
 * 확인: ① 한글 텍스트 baked 정확도(깨짐0) ② 퀄리티(메디힐급?) ③ 2:3(1024x1536) ④ 응답 data[0].b64_json
 */
import { readFileSync, writeFileSync } from 'node:fs';

const env = readFileSync('.env.local', 'utf8');
const KEY = (env.match(/^OPENAI_API_KEY=(.+)$/m) || [])[1]?.trim();
if (!KEY) { console.error('OPENAI_API_KEY 없음(.env.local)'); process.exit(1); }

const URL = 'https://api.openai.com/v1/images/generations';

// ── 테스트 케이스: 슬라이드 Hero(리프그린 시카토너) + 한글 헤드라인 baked ──
// ★ 이번엔 overlay가 아니라 'baked'로 일부러: GPT Image 2의 한글 렌더 정확도를 눈으로 검증하려는 목적.
const KOREAN_HEADLINE = '예민한 피부, 오늘부터 편안하게';
const KOREAN_SUBCOPY  = '제주 병풀 시카 진정 토너';

const prompt = [
  'Premium Korean skincare ADVERTISEMENT hero, magazine/editorial quality, clean clinical-premium Korean cosmetic brand look (e.g. Medihael-grade), vertical 2:3 composition.',
  // 제품
  'Main subject: a frosted glass cica/centella toner bottle with a soft sage-green cap, center, large, tack-sharp, premium and elegant, sitting on a light wooden surface.',
  // 배경/무드
  'Around it: a few fresh centella (pennywort) leaves, soft linen, clean out-of-focus background. Palette: soft green, beige, warm neutral. Lighting: soft natural daylight, gentle even shadows. Calm, soothing, premium mood.',
  // ★ 한글 텍스트 baked (정확도 테스트)
  `Render this KOREAN headline text crisply and ACCURATELY at the top area, in a clean modern Korean sans-serif (Pretendard-like), dark charcoal color, left-aligned, correct spelling and spacing: "${KOREAN_HEADLINE}".`,
  `Below it, smaller Korean subcopy text, same font, lighter weight: "${KOREAN_SUBCOPY}".`,
  'The Korean characters must be perfectly legible, correctly formed, no garbled or broken glyphs. No other text, no logos, no badges, no numbers.',
].join(' ');

const body = {
  model: 'gpt-image-2',     // 사용자 지정. 무효 시 API가 에러로 정확한 모델명 알려줌.
  prompt,
  size: '1024x1536',        // 2:3 세로(슬라이드 Hero)
  quality: 'high',
  n: 1,
};

async function run() {
  console.log('[gpt-image-test] 생성 중 (gpt-image-2, 1024x1536, high, 1회)…');
  const res = await fetch(URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KEY}` },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(180_000),
  });
  const text = await res.text();
  if (!res.ok) {
    console.error(`OpenAI 오류 HTTP ${res.status}:`, text.slice(0, 700));
    process.exit(1);
  }
  const data = JSON.parse(text);
  // 응답 형식 메모용 로깅
  console.log('[응답 형식] top keys:', Object.keys(data).join(', '));
  console.log('[응답 형식] data[0] keys:', Object.keys(data.data?.[0] ?? {}).join(', '));
  console.log('[응답 형식] usage:', JSON.stringify(data.usage ?? '(none)'));
  const b64 = data.data?.[0]?.b64_json;
  if (!b64) { console.error('b64_json 없음. 전체:', text.slice(0, 600)); process.exit(1); }
  writeFileSync('_prototype_out/gpt-image-test.png', Buffer.from(b64, 'base64'));
  console.log('✅ 저장: _prototype_out/gpt-image-test.png  (b64 length:', b64.length, ')');
}
run().catch(e => { console.error(e); process.exit(1); });
