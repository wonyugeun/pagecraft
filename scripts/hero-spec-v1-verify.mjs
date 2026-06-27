/**
 * Hero Spec v1 검증 — Spec(§8 스키마) → Brief → 실제 이미지 1장.
 *
 * ⚠️ 격리: 기존 imagebrief/generate-image 로직을 수정하지 않는다. 이 스크립트가 Brief→프롬프트 변환을
 *    자체 수행(임시 주입)하고 Gemini를 직접 1회 호출한다. 프로덕션 코드 원복 불필요(미접촉).
 *
 * 실행: node scripts/hero-spec-v1-verify.mjs
 * 산출: _prototype_out/hero-spec-v1-brief.json, _prototype_out/hero-spec-v1-test.png
 */
import { readFileSync, writeFileSync } from 'node:fs';

const env = readFileSync('.env.local', 'utf8');
const KEY = (env.match(/^GEMINI_API_KEY=(.+)$/m) || [])[1]?.trim();
if (!KEY) { console.error('GEMINI_API_KEY 없음(.env.local)'); process.exit(1); }

const MODEL = 'gemini-3.1-flash-image-preview';   // generate-image route와 동일 모델
const URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${KEY}`;

/* ── Hero Image Brief — docs/hero-image-spec-v1.md §8 스키마 그대로. 리프그린 시카토너 / 화장품 ── */
const brief = {
  purpose: 'hero',
  emotion: '안심',                                   // 시카(센텔라) = 민감 피부 진정
  visual_priority: ['text_zone', 'model', 'product'], // 화장품 규칙
  layout: {
    text_zone:        { position: 'top', ratio: 0.38, align: 'left' },
    model_position:   { position: 'center', band: [0.40, 0.85] },   // 피부 일부(얼굴 X)
    product_position: { position: 'bottom-left', area_min: 0.20 },
  },
  text_zone: {
    location: 'top', min_ratio: 0.38, align: 'left',
    background: 'light-uniform',
    forbid: ['product', 'face', 'high-contrast', 'busy-objects', 'text'],
  },
  product_placement: {
    required: true, area_min: 0.20, priority: 'bottom-left',
    identifiable: true, in_focus: true,
  },
  model_use: {
    enabled: true, type: 'partial',                  // 피부/손, 식별 얼굴 금지
    forbid_consistent_face: true, forbid_virtual_model_lock: true,
  },
  background: 'natural',
  lighting: 'soft-daylight',
  mood: 'natural',
  negative: [
    'any text, letters, numbers, typography',
    'logos, badges, certification marks',
    'product smaller than 20% area',
    'product blending into background',
    'busy or high-contrast objects in the top text zone',
    'recognizable or repeated model face',
    'fake data, graphs, percentages',
  ],
};

/* ── Brief → 프롬프트 변환(임시 주입). generate-image route의 textZone:'top' 규칙 구조를 모사 ── */
function briefToPrompt(b) {
  const subject = '센텔라(시카) 성분의 민감 피부 진정 토너. 무향·무색소·워터리 제형의 깨끗한 스킨케어';
  return [
    'Korean e-commerce premium skincare HERO advertisement background (vertical 4:5).',
    `Product theme: ${subject}.`,
    // 레이아웃 = layout/text_zone
    `Composition: keep the TOP ~38% of the frame as clean, uniform, bright NEGATIVE SPACE (soft even light, plain/soft-gradient) with NO product, NO face, NO busy objects — this top band is reserved for a text overlay added later (left-aligned). `,
    `Place the main subject in the center band and the product in the LOWER part of the frame.`,
    // model_use = partial (no face)
    `Center: a soft, calm close-up of clean healthy skin / a hand gently touching skin (NO recognizable face, no model portrait), soothing natural feeling.`,
    // product_placement
    `Bottom-left: a single clear, in-focus toner bottle (frosted/clean cosmetic bottle), clearly identifiable, occupying about 20% of the frame, not blending into the background.`,
    // mood / lighting / background
    `Mood: natural, calm, premium-clean. Palette: soft green, beige, warm neutral (cica/centella). Lighting: soft daylight, gentle shadows. Background: simple, low-contrast, uncluttered.`,
    // negative
    `Do NOT render any text, letters, numbers, typography, logos, badges, certification marks, graphs, or percentages anywhere in the image. No captions. Clean photographic advertising image.`,
  ].join(' ');
}

const prompt = briefToPrompt(brief);

const body = {
  contents: [{ role: 'user', parts: [{ text: prompt }] }],
  generationConfig: {
    responseModalities: ['IMAGE', 'TEXT'],
    imageConfig: { aspectRatio: '4:5' },
  },
};

async function run() {
  writeFileSync('_prototype_out/hero-spec-v1-brief.json', JSON.stringify({ brief, prompt }, null, 2));
  console.log('[hero-verify] 생성 중 (Gemini, 4:5, 1회)…');
  let lastErr = '';
  for (let attempt = 1; attempt <= 2; attempt++) {  // transient(429/503)만 1회 재시도 — 변형 생성 아님
    const res = await fetch(URL, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body), signal: AbortSignal.timeout(120_000),
    });
    if (res.status === 429 || res.status === 503) { lastErr = `HTTP ${res.status}`; console.warn(`재시도(${lastErr})`); await new Promise(r => setTimeout(r, 4000)); continue; }
    if (!res.ok) { console.error('Gemini 오류', res.status, (await res.text()).slice(0, 400)); process.exit(1); }
    const data = await res.json();
    const parts = data?.candidates?.[0]?.content?.parts ?? [];
    const img = parts.find(p => p.inlineData?.data);
    if (!img) { console.error('이미지 파트 없음:', JSON.stringify(data).slice(0, 500)); process.exit(1); }
    writeFileSync('_prototype_out/hero-spec-v1-test.png', Buffer.from(img.inlineData.data, 'base64'));
    console.log('✅ 저장: _prototype_out/hero-spec-v1-test.png  (mime:', img.inlineData.mimeType + ')');
    return;
  }
  console.error('생성 실패:', lastErr); process.exit(1);
}
run().catch(e => { console.error(e); process.exit(1); });
