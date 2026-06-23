/**
 * 갈치 9:16 마지막 보정 — KPI 디자인 + 헤드라인 폰트 고급화. 비율·구도·배경·질감 유지.
 * 실행: node scripts/hero-food-final.mjs → _prototype_out/hero-food-final.png
 */
import { readFileSync, writeFileSync } from 'node:fs';

const env = readFileSync('.env.local', 'utf8');
const OPENAI = (env.match(/^OPENAI_API_KEY=(.+)$/m) || [])[1]?.trim();
if (!OPENAI) { console.error('OPENAI 키 없음'); process.exit(1); }

const { recog, design } = JSON.parse(readFileSync('_prototype_out/hero-food-meta.json', 'utf8'));

const prompt = [
  // ── 9:16 베이스(유지) ──
  'Professional FOOD PHOTOGRAPHY, shot on a DSLR, photorealistic real photograph (NOT illustration, NOT 3D render, NOT CGI). Premium Korean seafood brand advertisement, food-magazine editorial quality.',
  'BACKGROUND: bright, clean, natural — light wood / soft warm grey / natural daylight. NOT dark heavy navy/black.',
  'COMPOSITION: ONE or TWO whole hairtails as the clear HERO, presented cleanly with generous negative space. No crowded fish, no fish-market stall look, no artificial fan.',
  `Same fish species (real silver hairtail), real fresh-fish texture (natural silver scales, fine moisture, realistic skin — NOT metal/chrome/CG). ${recog.food_context}.`,
  `Props ALLOWED, natural amounts: ${JSON.stringify(recog.allowed_props)}. FORBIDDEN: ${JSON.stringify(recog.forbidden_props)}. No cosmetic props, no beauty model, no clinical mood.`,
  'Layout (tall vertical, separate zones with airy balanced whitespace): headline at top, product hero in center, a 3-up benefit row near the bottom.',
  // ── ★ KPI 디자인 고급화 ──
  'BENEFIT ROW DESIGN (make it look designed, not floating): present the 3 benefits as a clean, unified row — each item is a thin circular-outline icon badge (consistent line-icon style, same stroke weight) above its label, with subtle vertical divider lines between the three, evenly aligned. Clear label hierarchy (label slightly bolder, sub-line lighter). Refined, premium, like a high-end Korean cosmetic/food brand benefit strip. Text labels ONLY — NO fabricated numbers, percentages, or grades.',
  // ── ★ 헤드라인 폰트 고급화 ──
  'HEADLINE TYPOGRAPHY (premium food-brand, high-end magazine): thin elegant modern Korean sans-serif with strong WEIGHT CONTRAST — keep the line light/thin and make ONLY the key word bold for impact. Generous airy letter-spacing, neat alignment. Restrained color: deep charcoal base with ONE single accent (subtle deep-green or muted gold) on the key word only. No heavy navy, no multiple colors.',
  // ── 카피/KPI 내용(유지, 불변) ──
  `Headline (crisp accurate Korean, perfectly legible, no broken glyphs): "${design.headline_ko}".`,
  `3 benefit labels (Korean, text only): "${(design.kpis_ko || []).join('", "')}".`,
  // 매력 + 네거티브
  'Fresh, premium, delicious. AVOID: dark heavy background, crowded fish, artificial fan, 3D/CGI/render, glossy plastic, garish/multi-color text, cramped typography, floating bare icons, fake certification marks, percentages, graphs.',
].join(' ');

const fd = new FormData();
fd.append('model', 'gpt-image-2');
fd.append('prompt', prompt);
fd.append('size', '1152x2048');   // 9:16 유지
fd.append('quality', 'high');
fd.append('n', '1');
fd.append('image[]', new File([readFileSync('_prototype_out/갈치.png')], 'product.png', { type: 'image/png' }));

console.log('[final] 9:16 + KPI디자인 + 폰트강약 생성 중…');
const res = await fetch('https://api.openai.com/v1/images/edits', {
  method: 'POST', headers: { Authorization: `Bearer ${OPENAI}` }, body: fd, signal: AbortSignal.timeout(300_000),
});
const text = await res.text();
if (!res.ok) { console.error('OpenAI 오류', res.status, text.slice(0, 600)); process.exit(1); }
const data = JSON.parse(text);
console.log('[응답] size:', data.size);
const b64 = data.data?.[0]?.b64_json;
if (!b64) { console.error('b64 없음'); process.exit(1); }
writeFileSync('_prototype_out/hero-food-final.png', Buffer.from(b64, 'base64'));
console.log('✅ 저장: _prototype_out/hero-food-final.png');
