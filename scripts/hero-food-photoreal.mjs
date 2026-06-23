/**
 * 갈치 슬라이드 — 구조/카피/소품 유지 + 포토리얼(실사) 강화만.
 * 기존 hero-food-meta.json(recog/design) 재사용 → [1][2] 재호출 안 함(Vision 0). [3] 재생성만 포토리얼 프롬프트로.
 * 실행: node scripts/hero-food-photoreal.mjs → _prototype_out/hero-food-photoreal.png
 */
import { readFileSync, writeFileSync } from 'node:fs';

const env = readFileSync('.env.local', 'utf8');
const OPENAI = (env.match(/^OPENAI_API_KEY=(.+)$/m) || [])[1]?.trim();
if (!OPENAI) { console.error('OPENAI 키 없음'); process.exit(1); }

const { recog, design } = JSON.parse(readFileSync('_prototype_out/hero-food-meta.json', 'utf8'));

const prompt = [
  // ── 실사 강제(맨 앞) ──
  'Professional FOOD PHOTOGRAPHY, shot on a DSLR, photorealistic real photograph (NOT an illustration, NOT 3D render, NOT CGI). Natural lighting, realistic textures, food-magazine editorial quality.',
  'Vertical 2:3 Korean FOOD e-commerce SLIDE ADVERTISEMENT — appetizing premium seafood detail-page hero.',
  // ── 구조/카피 유지(기존 design 그대로) ──
  `Keep this self-designed STRUCTURE (layout/composition/mood/props/gaze): ${JSON.stringify(design)}.`,
  `Transform the raw product in the PROVIDED image into an appetizing food ad per hero_type "${design.hero_type}": ${recog.food_context}. Same fish species (real silver hairtail / cutlassfish), fresh and premium.`,
  // ── 갈치 실사 질감 ──
  'The hairtail must look like a REAL fresh fish in a real photo: natural silver scales with subtle imperfections, fine moisture/wet sheen, realistic fish skin surface, soft natural reflections. Do NOT make it look like smooth metal, chrome, plastic, or a CG render.',
  // ── 소품/배열 자연스럽게 ──
  'Arrange the fish NATURALLY (not a perfect artificial fan/symmetry). Ice and sea salt in NATURAL, modest amounts (not exaggerated). Realistic depth of field, soft natural shadows, subtle photographic grain.',
  // ── 제품인지 가드 유지 ──
  `Props ALLOWED: ${JSON.stringify(recog.allowed_props)}. FORBIDDEN (never render): ${JSON.stringify(recog.forbidden_props)}. No cosmetic props, no beauty model, no clinical mood.`,
  // ── 한글 카피/KPI 유지 ──
  `Render this Korean headline as crisp accurate text at top (clean modern Korean sans-serif, perfectly legible): "${design.headline_ko}".`,
  `Clean 3-up Korean text label row (text only, NO fabricated numbers/grades): "${(design.kpis_ko || []).join('", "')}".`,
  // ── 네거티브(실사) ──
  'AVOID: 3D rendering, CGI, video-game look, overly smooth/glossy surfaces, unrealistic shine, plastic look, artificial fan arrangement, fake certification marks, percentages, graphs.',
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
writeFileSync('_prototype_out/hero-food-photoreal.png', Buffer.from(b64, 'base64'));
console.log('✅ 저장: _prototype_out/hero-food-photoreal.png');
