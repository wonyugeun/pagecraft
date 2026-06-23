/**
 * 시도 A — edits 2장 + 프롬프트로 모델 강제(인물 화보 구도 유지).
 * image[] = [test1(모델 화보 레퍼런스), test2(셀러 제품 리프그린 토너)]
 * 실행: node scripts/hero-ref2-model-A.mjs  → _prototype_out/hero-ref2-A.png
 */
import { readFileSync, writeFileSync } from 'node:fs';

const env = readFileSync('.env.local', 'utf8');
const KEY = (env.match(/^OPENAI_API_KEY=(.+)$/m) || [])[1]?.trim();
if (!KEY) { console.error('OPENAI_API_KEY 없음'); process.exit(1); }

const HEADLINE = '예민한 피부, 오늘부터 편안하게';

const prompt = [
  'Create a vertical 2:3 Korean skincare SLIDE ADVERTISEMENT — a beauty model EDITORIAL hero shot.',
  'CRITICAL: a human FEMALE MODEL must be present and prominent, holding/presenting the product, exactly like the FIRST image. Follow the FIRST image\'s model pose, framing, composition, lighting and overall editorial style. Do NOT remove the model. Do NOT turn this into a product-only still life.',
  'The PRODUCT the model holds/shows must be EXACTLY the bottle in the SECOND image — the LEAFGREEN CICA TONER: match bottle shape, green translucent liquid, cap, and the "LEAFGREEN / CICA TONER" label precisely. Only the product is swapped to the second image; the human model and ad layout stay.',
  `Render this Korean headline as crisp accurate text at the top (clean modern Korean sans-serif, perfectly legible): "${HEADLINE}".`,
  'Premium clean cica mood, soft green/beige. No fake certification marks, percentages, or graphs.',
].join(' ');

const file = (p, n) => new File([readFileSync(p)], n, { type: 'image/png' });

async function run() {
  const fd = new FormData();
  fd.append('model', 'gpt-image-2');
  fd.append('prompt', prompt);
  fd.append('size', '1024x1536');
  fd.append('quality', 'high');
  fd.append('n', '1');
  fd.append('image[]', file('_prototype_out/test1.png', 'reference.png'));
  fd.append('image[]', file('_prototype_out/test2.png', 'product.png'));

  console.log('[A] 모델 강제 + edits 2장 생성 중…');
  const res = await fetch('https://api.openai.com/v1/images/edits', {
    method: 'POST', headers: { Authorization: `Bearer ${KEY}` }, body: fd,
    signal: AbortSignal.timeout(180_000),
  });
  const text = await res.text();
  if (!res.ok) { console.error(`오류 ${res.status}:`, text.slice(0, 800)); process.exit(1); }
  const b64 = JSON.parse(text).data?.[0]?.b64_json;
  if (!b64) { console.error('b64 없음:', text.slice(0, 400)); process.exit(1); }
  writeFileSync('_prototype_out/hero-ref2-A.png', Buffer.from(b64, 'base64'));
  console.log('✅ 저장: _prototype_out/hero-ref2-A.png');
}
run().catch(e => { console.error(e); process.exit(1); });
