/**
 * 비율 재검증 — A-typo와 동일 내용/프롬프트, size만 변경(변수 통제).
 * 실행: node scripts/hero-ratio.mjs <size> <outname>
 *   예: node scripts/hero-ratio.mjs 1152x2048 hero-ratio-916
 *       node scripts/hero-ratio.mjs 1024x2048 hero-ratio-12
 */
import { readFileSync, writeFileSync } from 'node:fs';

const SIZE = process.argv[2] || '1152x2048';
const OUT  = process.argv[3] || 'hero-ratio';

const env = readFileSync('.env.local', 'utf8');
const OPENAI = (env.match(/^OPENAI_API_KEY=(.+)$/m) || [])[1]?.trim();
if (!OPENAI) { console.error('OPENAI 키 없음'); process.exit(1); }

const { recog, design } = JSON.parse(readFileSync('_prototype_out/hero-food-meta.json', 'utf8'));

// A-typo와 동일 프롬프트(비율 언급 제거 — size 파라미터가 결정)
const prompt = [
  'Professional FOOD PHOTOGRAPHY, shot on a DSLR, photorealistic real photograph (NOT illustration, NOT 3D render, NOT CGI). Premium Korean seafood brand advertisement, food-magazine editorial quality.',
  'BACKGROUND: bright, clean, natural — light wood / soft warm grey / natural daylight. NOT a dark heavy navy/black background.',
  'COMPOSITION: feature only ONE or TWO whole hairtails as the clear HERO, presented cleanly with generous negative space. No crowded many fish, no fish-market stall look, no artificial fan arrangement.',
  `Same fish species (real silver hairtail), real fresh-fish texture (natural silver scales, fine moisture, realistic skin — NOT metal/chrome/CG). ${recog.food_context}.`,
  `Props ALLOWED, natural amounts: ${JSON.stringify(recog.allowed_props)}. FORBIDDEN: ${JSON.stringify(recog.forbidden_props)}. No cosmetic props, no beauty model, no clinical mood.`,
  'Layout: headline at the top, product hero in the center, a clean 3-up label row near the bottom. Use the tall vertical space to separate these zones with generous, balanced whitespace (airy, not cramped).',
  'TYPOGRAPHY (premium food-brand, high-end magazine): thin elegant modern Korean sans-serif, clear weight hierarchy (only the key emphasis word bold), generous airy letter/line spacing.',
  'TEXT COLOR: restrained deep charcoal base, with ONE single accent only on the key word (subtle deep-green or muted gold). No heavy navy, no multiple colors.',
  `Headline (crisp accurate Korean, perfectly legible): "${design.headline_ko}".`,
  `3-up Korean labels (text only, NO fabricated numbers/grades): "${(design.kpis_ko || []).join('", "')}".`,
  'Fresh, premium, delicious. AVOID: dark heavy background, crowded fish, artificial fan, 3D/CGI/render, glossy plastic, garish text colors, cramped typography, fake certification marks, percentages, graphs.',
].join(' ');

const fd = new FormData();
fd.append('model', 'gpt-image-2');
fd.append('prompt', prompt);
fd.append('size', SIZE);
fd.append('quality', 'high');
fd.append('n', '1');
fd.append('image[]', new File([readFileSync('_prototype_out/갈치.png')], 'product.png', { type: 'image/png' }));

console.log(`[ratio] size=${SIZE} 생성 중…`);
const res = await fetch('https://api.openai.com/v1/images/edits', {
  method: 'POST', headers: { Authorization: `Bearer ${OPENAI}` }, body: fd, signal: AbortSignal.timeout(300_000),
});
const text = await res.text();
if (!res.ok) {
  console.error(`OpenAI 오류 ${res.status} (size=${SIZE}):`, text.slice(0, 700));
  process.exit(1);
}
const data = JSON.parse(text);
console.log('[응답] size:', data.size, '| output_format:', data.output_format);
const b64 = data.data?.[0]?.b64_json;
if (!b64) { console.error('b64 없음'); process.exit(1); }
writeFileSync(`_prototype_out/${OUT}.png`, Buffer.from(b64, 'base64'));
console.log(`✅ 저장: _prototype_out/${OUT}.png`);
