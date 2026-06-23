/**
 * Baked 슬라이드 Hero 검증 — route(generate-image)가 실제로 만들 프롬프트를 그대로 재현해 1장 생성.
 * (dev server 미실행: route의 prompt 조립 + size 매핑 + GPT Image 2 경로를 충실히 모사.)
 * 실행: node scripts/hero-baked-verify.mjs
 * 산출: _prototype_out/hero-baked-test.png
 */
import { readFileSync, writeFileSync } from 'node:fs';

const env = readFileSync('.env.local', 'utf8');
const KEY = (env.match(/^OPENAI_API_KEY=(.+)$/m) || [])[1]?.trim();
if (!KEY) { console.error('OPENAI_API_KEY 없음'); process.exit(1); }

// 실데이터(리프그린 토너 Hero, pipeline-test.json section 0)
const headline = '민감성 피부 진정 토너, 뺄 건 다 뺐습니다';
const subcopy  = '무향 · 무색소 · 피부과 테스트 완료 — 예민한 피부가 매일 믿고 쓸 수 있는 이유';
const imageDesc = 'A sleek toner bottle stands centered on a matte beige concrete surface, flanked by dewy fresh centella leaves that catch soft morning light, with delicate water droplets scattered around the base, conveying effortless purity and skin-safe reassurance. shot: 45° overhead, product as clear focal point';

// ── 클라(ResultScreen)의 buildBakedText 그대로 ──
function buildBakedText(h, s) {
  const head = (h ?? '').replace(/\n/g, ' ').trim();
  const sub = (s ?? '').replace(/\n/g, ' ').trim();
  return [
    `Render the following Korean marketing copy as crisp, accurate, correctly-spelled text integrated naturally into the ad layout`,
    `(clean modern Korean sans-serif like Pretendard, perfectly legible, no garbled or broken glyphs).`,
    `Headline: "${head}"${sub ? `. Subcopy (smaller, lighter): "${sub}"` : ''}.`,
    `Only this copy as text — no other text, no logos, no numbers, no fabricated data.`,
  ].join(' ');
}

// 클라 promptText (슬라이드 Hero = slideHero:true → 서브카피 포함)
const promptText = `${imageDesc}. ${buildBakedText(headline, subcopy)}`;

// ── route의 fullPrompt 조립 그대로 (슬라이드 baked: TEXT_RULES/TEXTZONE 미적용, PEOPLE+NO_FAKE_DATA만) ──
const PEOPLE_RULES = `Skin and body-part close-ups WITHOUT a recognizable face are allowed for emotion/situation (cheek, jawline, neck, hands, back of hand, a fingertip touching skin). Do NOT show a recognizable full face, a consistent brand model, or a fashion-style model holding the product as the focus.`;
const NO_FAKE_DATA_RULES = `Do NOT render certification marks, seals, badges, test/clinical results, EWG grades, percentages, statistics, or graphs. Convey "tested/safe" only through clean clinical mood, never as data.`;
const cleanedPrompt = promptText.trim().replace(/[.\s]+$/, '');
const fullPrompt = [
  `Korean e-commerce product detail page image.`,
  `${cleanedPrompt}.`,
  PEOPLE_RULES, NO_FAKE_DATA_RULES,
].filter(Boolean).join(' ');

// route: aspect 4:5(Hero) → size 1024x1536, quality high
const body = { model: 'gpt-image-2', prompt: fullPrompt, size: '1024x1536', quality: 'high', n: 1 };

async function run() {
  console.log('[hero-baked-verify] route 프롬프트 재현 생성 중 (gpt-image-2, 1024x1536, high)…');
  console.log('  fullPrompt len:', fullPrompt.length);
  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KEY}` },
    body: JSON.stringify(body), signal: AbortSignal.timeout(180_000),
  });
  const text = await res.text();
  if (!res.ok) { console.error(`OpenAI 오류 ${res.status}:`, text.slice(0, 600)); process.exit(1); }
  const data = JSON.parse(text);
  console.log('[응답] output_format:', data.output_format, '| size:', data.size, '| quality:', data.quality);
  const b64 = data.data?.[0]?.b64_json;
  if (!b64) { console.error('b64_json 없음'); process.exit(1); }
  writeFileSync('_prototype_out/hero-baked-test.png', Buffer.from(b64, 'base64'));
  console.log('✅ 저장: _prototype_out/hero-baked-test.png');
}
run().catch(e => { console.error(e); process.exit(1); });
