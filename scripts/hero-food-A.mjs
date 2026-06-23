/**
 * 갈치 슬라이드 A안 — 구조 레벨 재설계(밝은 배경 + 1~2마리 주인공 + 자연 플레이팅).
 * 카피/KPI/제품인지(forbidden)는 기존 meta 유지. 배경·개수·구도만 override. Vision 0회.
 * 실행: node scripts/hero-food-A.mjs → _prototype_out/hero-food-A.png
 */
import { readFileSync, writeFileSync } from 'node:fs';

const env = readFileSync('.env.local', 'utf8');
const OPENAI = (env.match(/^OPENAI_API_KEY=(.+)$/m) || [])[1]?.trim();
if (!OPENAI) { console.error('OPENAI 키 없음'); process.exit(1); }

const { recog, design } = JSON.parse(readFileSync('_prototype_out/hero-food-meta.json', 'utf8'));

const prompt = [
  // 실사 강제
  'Professional FOOD PHOTOGRAPHY, shot on a DSLR, photorealistic real photograph (NOT illustration, NOT 3D render, NOT CGI). Food-magazine editorial quality, premium Korean seafood brand advertisement. Vertical 2:3.',
  // ★ A안 — 배경(밝게)
  'BACKGROUND: bright, clean, natural — light wood / soft warm grey / natural daylight. Do NOT use a dark heavy navy/black background. Airy, fresh, premium grocery editorial feel.',
  // ★ A안 — 개수·구도(주인공 1~2마리)
  'COMPOSITION: feature only ONE or TWO whole hairtails as the clear HERO, presented cleanly and elegantly. Do NOT crowd many fish (no 5-6 fish, no fish-market stall look). Generous negative space around the hero.',
  // ★ A안 — 배열 자연
  'Arrange naturally and elegantly (NOT an artificial fan or rigid symmetry). Natural, light food styling.',
  // 제품: 갈치 실사 질감
  `Transform the raw product in the PROVIDED image into an appetizing premium ad. Same fish species (real silver hairtail / cutlassfish). The fish must look like a REAL fresh fish in a real photo: natural silver scales with subtle imperfections, fine moisture, realistic skin — NOT smooth metal/chrome/plastic/CG. ${recog.food_context}.`,
  // 소품 절제
  `Props ALLOWED (use sparingly, natural amounts): ${JSON.stringify(recog.allowed_props)}. Ice and salt minimal and natural, not exaggerated.`,
  // 제품인지 가드 유지
  `FORBIDDEN (never render): ${JSON.stringify(recog.forbidden_props)}. No cosmetic props, no beauty model, no clinical mood.`,
  // 광고 매력
  'Make it look genuinely fresh and DELICIOUS — appetizing, premium, makes the viewer want to buy. Soft natural light, realistic depth of field, subtle photographic grain.',
  // 카피/KPI 유지
  `Render this Korean headline as crisp accurate text at top (clean modern Korean sans-serif, perfectly legible): "${design.headline_ko}".`,
  `Clean 3-up Korean text label row (text only, NO fabricated numbers/grades): "${(design.kpis_ko || []).join('", "')}".`,
  // 네거티브
  'AVOID: dark heavy background, crowded fish, fish-market stall look, artificial fan arrangement, 3D/CGI/render, overly smooth glossy surfaces, fake certification marks, percentages, graphs.',
].join(' ');

const fd = new FormData();
fd.append('model', 'gpt-image-2');
fd.append('prompt', prompt);
fd.append('size', '1024x1536');
fd.append('quality', 'high');
fd.append('n', '1');
fd.append('image[]', new File([readFileSync('_prototype_out/갈치.png')], 'product.png', { type: 'image/png' }));

const res = await fetch('https://api.openai.com/v1/images/edits', {
  method: 'POST', headers: { Authorization: `Bearer ${OPENAI}` }, body: fd, signal: AbortSignal.timeout(180_000),
});
const text = await res.text();
if (!res.ok) { console.error('OpenAI 오류', res.status, text.slice(0, 600)); process.exit(1); }
const b64 = JSON.parse(text).data?.[0]?.b64_json;
if (!b64) { console.error('b64 없음'); process.exit(1); }
writeFileSync('_prototype_out/hero-food-A.png', Buffer.from(b64, 'base64'));
console.log('✅ 저장: _prototype_out/hero-food-A.png');
