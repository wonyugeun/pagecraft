/**
 * Hero Spec v1.1 검증 2차 — 제품 중심 재설계 + seam 방지.
 * 격리: 프로덕션 로직 미접촉. Brief→프롬프트 자체 변환 + Gemini 1회 직접 호출.
 * 실행: node scripts/hero-spec-v1-verify2.mjs
 * 산출: _prototype_out/hero-spec-v1-brief2.json, _prototype_out/hero-spec-v1-test2.png
 */
import { readFileSync, writeFileSync } from 'node:fs';

const env = readFileSync('.env.local', 'utf8');
const KEY = (env.match(/^GEMINI_API_KEY=(.+)$/m) || [])[1]?.trim();
if (!KEY) { console.error('GEMINI_API_KEY 없음'); process.exit(1); }
const MODEL = 'gemini-3.1-flash-image-preview';
const URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${KEY}`;

/* ── Hero Brief v1.1 (제품 중심) — spec §8 스키마 ── */
const brief = {
  purpose: 'hero',
  emotion: '안심',
  visual_priority: ['text_zone', 'product', 'model'],   // v1.1: 제품을 모델 위로
  layout: {
    text_zone:        { position: 'top', ratio: 0.38, align: 'left' },
    product_position: { position: 'center-lower', area_min: 0.30 },  // 주인공 25~35%
    model_position:   { position: 'behind-product', band: [0.45, 0.90], role: 'support' },
  },
  text_zone: { location: 'top', min_ratio: 0.38, align: 'left', intent: 'reserved-for-copy',
    background: 'light-uniform', forbid: ['product', 'face', 'high-contrast', 'busy-objects', 'text'] },
  product_placement: { required: true, area_min: 0.30, priority: 'center-lower',
    identifiable: true, in_focus: true, is_hero: true },
  model_use: { enabled: true, role: 'support', type: 'partial', face_exposure: 'minimal',
    forbid_consistent_face: true, forbid_virtual_model_lock: true },
  background: 'natural', lighting: 'soft-daylight', mood: 'natural',
  negative: ['any text, letters, numbers, typography', 'logos, badges, certification marks',
    'product smaller than 25% area', 'product blending into background',
    'dominant or recognizable model face', 'horizontal bands, panels, split frame, collage, visible seams',
    'fake data, graphs, percentages'],
};

/* ── Brief → 프롬프트. ★ seam 방지: 밴드 열거 대신 "하나의 연속 사진"으로 기술 ── */
function briefToPrompt() {
  return [
    'Korean e-commerce PREMIUM skincare HERO advertisement background — ONE single, seamless, continuous photograph, vertical 4:5 aspect.',
    // 제품 = 주인공 (먼저, 크게)
    'HERO SUBJECT: a frosted clean cosmetic TONER bottle (centella/cica toner, blank label with NO text), large and tack-sharp in clear focus, positioned in the center-lower area, occupying about 30% of the frame — it is the clear main subject and first thing the eye lands on.',
    // 모델 = 보조 (작게, 흐리게, 얼굴 최소)
    'SUPPORTING context (secondary, must NOT dominate): softly out-of-focus hints of clean healthy skin or a hand and a few centella leaves arranged behind/around the bottle. No recognizable face, minimal to no face visible — supporting role only.',
    // 텍스트존 = 의도된 여백
    'The TOP ~38% of the frame is calm, bright, uniform EMPTY SPACE (soft even gradient, clean and low-contrast), intentionally reserved for a left-aligned text overlay added later — no product, no face, no objects in that top area.',
    // seam 방지 (핵심)
    'IMPORTANT: render it as ONE cohesive continuous scene with smooth, even, natural lighting throughout. Do NOT split the image into horizontal bands, panels, strips, or a collage. No visible seams, no dividing lines, no stitched sections — a single uninterrupted photograph.',
    // 무드
    'Mood: natural, calm, premium and clean. Palette: soft green, beige, warm neutral (cica/centella). Lighting: soft daylight, gentle even shadows. Background: simple, uncluttered.',
    // negative
    'Do NOT render any text, letters, numbers, typography, logos, badges, certification marks, graphs, or percentages anywhere. No captions. Clean photographic advertising image.',
  ].join(' ');
}

const prompt = briefToPrompt();
const body = {
  contents: [{ role: 'user', parts: [{ text: prompt }] }],
  generationConfig: { responseModalities: ['IMAGE', 'TEXT'], imageConfig: { aspectRatio: '4:5' } },
};

async function run() {
  writeFileSync('_prototype_out/hero-spec-v1-brief2.json', JSON.stringify({ brief, prompt }, null, 2));
  console.log('[hero-verify2] 제품중심 + seam방지 생성 중 (Gemini, 4:5, 1회)…');
  let lastErr = '';
  for (let attempt = 1; attempt <= 2; attempt++) {
    const res = await fetch(URL, { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body), signal: AbortSignal.timeout(120_000) });
    if (res.status === 429 || res.status === 503) { lastErr = `HTTP ${res.status}`; console.warn(`재시도(${lastErr})`); await new Promise(r => setTimeout(r, 4000)); continue; }
    if (!res.ok) { console.error('Gemini 오류', res.status, (await res.text()).slice(0, 400)); process.exit(1); }
    const data = await res.json();
    const img = (data?.candidates?.[0]?.content?.parts ?? []).find(p => p.inlineData?.data);
    if (!img) { console.error('이미지 파트 없음:', JSON.stringify(data).slice(0, 500)); process.exit(1); }
    writeFileSync('_prototype_out/hero-spec-v1-test2.png', Buffer.from(img.inlineData.data, 'base64'));
    console.log('✅ 저장: _prototype_out/hero-spec-v1-test2.png');
    return;
  }
  console.error('생성 실패:', lastErr); process.exit(1);
}
run().catch(e => { console.error(e); process.exit(1); });
