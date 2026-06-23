/**
 * 레퍼런스 + 셀러제품 2장 → 슬라이드 Hero (images/edits 멀티 입력 동작 검증).
 * image[] = [test1(레퍼런스 레이아웃), test2(셀러 제품: 리프그린 시카토너)]
 * 실행: node scripts/hero-ref2-test.mjs
 * 산출: _prototype_out/hero-ref2-test.png
 */
import { readFileSync, writeFileSync } from 'node:fs';

const env = readFileSync('.env.local', 'utf8');
const KEY = (env.match(/^OPENAI_API_KEY=(.+)$/m) || [])[1]?.trim();
if (!KEY) { console.error('OPENAI_API_KEY 없음'); process.exit(1); }

const HEADLINE = '예민한 피부, 오늘부터 편안하게';

const prompt = [
  'Create a vertical 2:3 Korean skincare SLIDE ADVERTISEMENT.',
  'Follow the LAYOUT, composition, mood and visual style of the FIRST image (a clean Korean cosmetic slide ad: headline area at the top, product as hero, a simple feature/benefit row below).',
  'The PRODUCT must be EXACTLY the bottle shown in the SECOND image — the LEAFGREEN CICA TONER: match its bottle shape, green-tinted translucent liquid, cap, and the "LEAFGREEN / CICA TONER" label precisely. Do NOT invent or substitute a different product.',
  `Render this Korean headline as crisp, accurate, correctly-spelled text at the top (clean modern Korean sans-serif like Pretendard, perfectly legible, no broken glyphs): "${HEADLINE}".`,
  'Premium clean cica mood, soft green / beige palette, soft daylight. No fake certification marks, percentages, or graphs.',
].join(' ');

async function fileBlob(path, name) {
  const buf = readFileSync(path);
  return new File([buf], name, { type: 'image/png' });
}

async function run() {
  const fd = new FormData();
  fd.append('model', 'gpt-image-2');
  fd.append('prompt', prompt);
  fd.append('size', '1024x1536');
  fd.append('quality', 'high');
  fd.append('n', '1');
  // image[] 순서 = [레퍼런스, 셀러제품]
  fd.append('image[]', await fileBlob('_prototype_out/test1.png', 'reference.png'));
  fd.append('image[]', await fileBlob('_prototype_out/test2.png', 'product.png'));

  console.log('[hero-ref2] images/edits 2장 입력 생성 중 (gpt-image-2, 1024x1536, high)…');
  const res = await fetch('https://api.openai.com/v1/images/edits', {
    method: 'POST',
    headers: { Authorization: `Bearer ${KEY}` },   // multipart는 Content-Type 자동
    body: fd,
    signal: AbortSignal.timeout(180_000),
  });
  const text = await res.text();
  if (!res.ok) { console.error(`OpenAI 오류 ${res.status}:`, text.slice(0, 800)); process.exit(1); }
  const data = JSON.parse(text);
  console.log('[응답] keys:', Object.keys(data).join(','), '| output_format:', data.output_format, '| size:', data.size);
  const b64 = data.data?.[0]?.b64_json;
  if (!b64) { console.error('b64_json 없음:', text.slice(0, 400)); process.exit(1); }
  writeFileSync('_prototype_out/hero-ref2-test.png', Buffer.from(b64, 'base64'));
  console.log('✅ 저장: _prototype_out/hero-ref2-test.png');
}
run().catch(e => { console.error(e); process.exit(1); });
