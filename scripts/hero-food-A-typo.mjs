/**
 * 갈치 슬라이드 — A안(밝은 배경·2마리·레이아웃) 유지 + 타이포(폰트/컬러) 세련도만 ↑.
 * 이미지/배경/구도/카피/KPI 전부 A안 그대로. 추가되는 건 타이포 방향성뿐. Vision 0회.
 * 실행: node scripts/hero-food-A-typo.mjs → _prototype_out/hero-food-A-typo.png
 */
import { readFileSync, writeFileSync } from 'node:fs';

const env = readFileSync('.env.local', 'utf8');
const OPENAI = (env.match(/^OPENAI_API_KEY=(.+)$/m) || [])[1]?.trim();
if (!OPENAI) { console.error('OPENAI 키 없음'); process.exit(1); }

const { recog, design } = JSON.parse(readFileSync('_prototype_out/hero-food-meta.json', 'utf8'));

const prompt = [
  // ── A안 베이스(유지) ──
  'Professional FOOD PHOTOGRAPHY, shot on a DSLR, photorealistic real photograph (NOT illustration, NOT 3D render, NOT CGI). Premium Korean seafood brand advertisement, food-magazine editorial quality. Vertical 2:3.',
  'BACKGROUND: bright, clean, natural — light wood / soft warm grey / natural daylight. NOT a dark heavy navy/black background.',
  'COMPOSITION: feature only ONE or TWO whole hairtails as the clear HERO, presented cleanly with generous negative space. No crowded many fish, no fish-market stall look, no artificial fan arrangement.',
  `Same fish species (real silver hairtail), real fresh-fish texture (natural silver scales, fine moisture, realistic skin — NOT metal/chrome/CG). ${recog.food_context}.`,
  `Props ALLOWED, natural amounts: ${JSON.stringify(recog.allowed_props)}. FORBIDDEN: ${JSON.stringify(recog.forbidden_props)}. No cosmetic props, no beauty model, no clinical mood.`,
  'Layout: headline at top, product hero center, a clean 3-up label row. Generous whitespace.',
  // ── ★ 타이포 세련도(이번 변경 포인트) ──
  'TYPOGRAPHY (premium food-brand, high-end magazine level): use a thin, elegant, modern Korean sans-serif (a refined minimal serif accent is acceptable). Clear weight hierarchy — keep most text light/regular and make ONLY the key emphasis word bold. Generous, airy letter-spacing and line-spacing (not cramped). Sophisticated, editorial, restrained typesetting.',
  // ── ★ 컬러 절제 + 포인트 1곳 ──
  'TEXT COLOR: a restrained deep charcoal base for the typography, with ONE single accent only on the key word (a subtle deep-green or muted gold). Do NOT use heavy solid navy text, do NOT use multiple colors — minimal, refined, one accent maximum.',
  // ── 카피/KPI 유지(내용 불변) ──
  `Headline text (crisp, accurate Korean, perfectly legible, no broken glyphs): "${design.headline_ko}".`,
  `3-up Korean labels (text only, NO fabricated numbers/grades): "${(design.kpis_ko || []).join('", "')}".`,
  // 매력 + 네거티브
  'Make it look fresh, premium and delicious. AVOID: dark heavy background, crowded fish, artificial fan, 3D/CGI/render, glossy plastic look, heavy/garish text colors, cramped typography, fake certification marks, percentages, graphs.',
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
writeFileSync('_prototype_out/hero-food-A-typo.png', Buffer.from(b64, 'base64'));
console.log('✅ 저장: _prototype_out/hero-food-A-typo.png');
