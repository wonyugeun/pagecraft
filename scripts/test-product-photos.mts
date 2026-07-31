/**
 * 테스트용 상품 참조 사진 10장 생성 — 다양성 테스트의 재료.
 *
 * ★왜 '광고컷'이 아니라 '셀러가 폰으로 찍은 사진'인가:
 *  실제 셀러가 올리는 사진은 조명이 고르지 않고 배경이 정리되어 있지 않다. 완벽한 스튜디오 컷으로
 *  테스트하면 결과가 실제보다 좋게 나와서, 정작 실사용에서 무너지는 지점을 못 본다.
 *  그래서 프롬프트에 '스마트폰·실내광·약간의 생활감'을 명시했다.
 *
 * ★참조 사진에는 글자가 없어야 한다. 라벨 문구가 박혀 있으면 이후 생성 이미지가 그 글자를
 *  베끼거나 변형해서 표시광고 리스크가 생긴다(갈치 A/B에서 확인된 문제).
 *
 * 실행: npx --yes tsx scripts/test-product-photos.mts
 * 출력: test-assets/diversity/<key>.png
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TEST_PRODUCTS } from './test-products';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'test-assets', 'diversity');

for (const line of fs.readFileSync(path.join(ROOT, '.env.local'), 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_0-9]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
}

const API_KEY = process.env.OPENAI_API_KEY;
if (!API_KEY) { console.error('❌ OPENAI_API_KEY 없음'); process.exit(1); }

fs.mkdirSync(OUT_DIR, { recursive: true });

const NO_TEXT = ' Absolutely no text, no letters, no numbers, no logos, no watermarks anywhere in the image.';

async function generate(p: typeof TEST_PRODUCTS[number]): Promise<boolean> {
  const dest = path.join(OUT_DIR, `${p.key}.png`);
  if (fs.existsSync(dest)) { console.log(`  ⏭  ${p.key} — 이미 있음`); return true; }

  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-image-2',
      prompt: p.photoPrompt + NO_TEXT,
      size: '1024x1024',
      quality: 'medium',
      n: 1,
    }),
    signal: AbortSignal.timeout(180_000),
  });

  if (!res.ok) {
    console.error(`  ❌ ${p.key} — HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
    return false;
  }
  const data = await res.json() as { data?: Array<{ b64_json?: string }> };
  const b64 = data.data?.[0]?.b64_json;
  if (!b64) { console.error(`  ❌ ${p.key} — 이미지 없음`); return false; }

  fs.writeFileSync(dest, Buffer.from(b64, 'base64'));
  console.log(`  ✅ ${p.key} — ${(Buffer.from(b64, 'base64').length / 1024).toFixed(0)}KB`);
  return true;
}

console.log(`상품 참조 사진 ${TEST_PRODUCTS.length}장 생성 → ${path.relative(ROOT, OUT_DIR)}/\n`);

// 동시 3개 — 레이트리밋 여유를 두면서 전체 시간을 줄인다
let ok = 0;
const queue = [...TEST_PRODUCTS];
await Promise.all(Array.from({ length: 3 }, async () => {
  for (;;) {
    const p = queue.shift();
    if (!p) return;
    if (await generate(p)) ok++;
  }
}));

console.log(`\n완료 — ${ok}/${TEST_PRODUCTS.length}장`);
process.exit(ok === TEST_PRODUCTS.length ? 0 : 1);
