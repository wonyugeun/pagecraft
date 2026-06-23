/**
 * 슬라이드 엔진 식품 검증 — ★레퍼런스 없이 엔진 자체 구조 설계.
 * 입력: 갈치.png(날것 원물) + 제품정보 텍스트. 레퍼런스 이미지 없음.
 * [1] 제품 인지(Vision): 식품/수산물 인식 + product_form/allowed/forbidden/food_context
 * [2] 전략·구조 자체 설계(텍스트, 레퍼런스 0): main_weapon/hero_type/mood/props/composition/layout/headline/kpis
 * [3] 재생성(edits, 제품=갈치.png): 자체설계대로 식품답게 — 날것 원물 → 먹음직 광고
 * 실행: node scripts/hero-food-test.mjs → _prototype_out/hero-food-test.png
 */
import { readFileSync, writeFileSync } from 'node:fs';

const env = readFileSync('.env.local', 'utf8');
const OPENAI = (env.match(/^OPENAI_API_KEY=(.+)$/m) || [])[1]?.trim();
const GEMINI = (env.match(/^GEMINI_API_KEY=(.+)$/m) || [])[1]?.trim();
if (!OPENAI || !GEMINI) { console.error('키 없음'); process.exit(1); }

// 셀러 상품 정보 (이미지에서 읽힌 사실 + 태스크 힌트, 날조 없이 일반)
const PRODUCT_NAME = '제주 갈치';
const PRODUCT_INFO = '카테고리: 식품 > 수산물 > 생선(갈치). 산지: 제주. 형태: 손질 전 통갈치 원물(은빛 생물). 용도: 구이·조림. (수치·등급 등 미입력 — 날조 금지)';

const geminiFlash = async (prompt, imgB64) => {
  const parts = imgB64 ? [{ inlineData: { mimeType: 'image/png', data: imgB64 } }, { text: prompt }] : [{ text: prompt }];
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${GEMINI}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ role: 'user', parts }], generationConfig: { temperature: 0.3, maxOutputTokens: 8192 } }),
    signal: AbortSignal.timeout(80_000),
  });
  if (!res.ok) { console.error('Gemini 오류', res.status, (await res.text()).slice(0, 300)); process.exit(1); }
  const cand = (await res.json()).candidates?.[0];
  const t = cand?.content?.parts?.map(p => p.text).filter(Boolean).join('') ?? '';
  const j = t.slice(t.indexOf('{'), t.lastIndexOf('}') + 1);
  if (!j || j.length < 20) { console.error(`분석 실패(finish=${cand?.finishReason})`); process.exit(1); }
  return JSON.parse(j);
};

// ── [1] 제품 인지 (이미지 + 정보) ──
async function recognize() {
  const b64 = readFileSync('_prototype_out/갈치.png').toString('base64');
  return geminiFlash(`상품 이미지와 정보를 보고 "제품 인지" JSON만 출력. 이건 식품일 수 있음 — 화장품 가정 금지.
상품명: ${PRODUCT_NAME}
정보: ${PRODUCT_INFO}
{
  "category": "대분류(예: 식품/수산물, 화장품 등)",
  "product_form": "제형/형태 한 줄(예: 날것 통갈치 원물, 은빛 생물)",
  "allowed_props": ["이 제품에 자연스러운 소품(식품 맥락: 접시/도마/레몬/식탁 등)"],
  "forbidden_props": ["이 제품엔 안 맞는 잔재(예: 화장솜, 스포이드, 화장품 용기, 클리니컬 클린 톤, 뷰티 모델 화보 강요)"],
  "food_context": "원물을 먹음직스럽게 보여줄 방법(구이/조림 플레이팅 등) — 식품이 아니면 빈 문자열"
}
순수 JSON만.`, b64);
}

// ── [2] 전략·구조 자체 설계 (레퍼런스 이미지 없음 — 카테고리 문법으로 스스로) ──
async function designStructure(recog) {
  return geminiFlash(`당신은 한국 ${recog.category} 상세페이지 아트디렉터입니다. ★참고 레퍼런스 이미지 없이, 이 카테고리의 광고 문법으로 슬라이드 Hero 구조를 '스스로' 설계하세요.
제품: ${PRODUCT_NAME} / ${recog.product_form} / food_context: ${recog.food_context}
- hero_type은 직접 판단: "Result Dominant"(먹음직 요리/플레이팅이 주인공) vs "Product Dominant"(신선 원물이 주인공). 식품 식욕 자극에 더 맞는 쪽 선택+이유.
- 화장품 문법(모델 뷰티 화보·클린 클리니컬·화장솜) 강요 금지. 식품 문법(식욕 도는 따뜻한 톤·식탁/플레이팅·신선 연출)으로.
{
  "main_weapon": "이 제품을 어떻게 파나(신선도/제주산/크기/손질 등 — 입력 사실 범위)",
  "hero_type": "Result Dominant | Product Dominant",
  "hero_type_reason": "왜",
  "mood": "색·조명·톤(식품 식욕 문법)",
  "props": ["식품 소품"],
  "composition": "구도/배치/시점",
  "gaze_flow": "시선 순서",
  "layout": "세로 영역 비율 구성",
  "headline_ko": "한글 헤드라인(식품답게, 날조 수치 금지)",
  "kpis_ko": ["3개 한글 라벨(서술형, 날조 숫자/등급 금지 — 예: 제주산/구이·조림/은빛 선도)"]
}
순수 JSON만.`);
}

// ── [3] 재생성 (제품=갈치 이미지) ──
async function regenerate(recog, design) {
  const prompt = [
    'Create a vertical 2:3 Korean FOOD e-commerce SLIDE ADVERTISEMENT — appetizing, premium seafood detail-page hero.',
    `Self-designed STRUCTURE (no reference image used): ${JSON.stringify(design)}.`,
    `★ Transform the raw product in the PROVIDED image into an APPETIZING FOOD AD per hero_type "${design.hero_type}". The provided image is a RAW silver hairtail (갈치) — do NOT show it as a raw fish in a plastic box; present it appetizingly as ${recog.food_context}. Keep it the same fish species (silver hairtail / cutlassfish), fresh and premium.`,
    `Food styling: warm, appetizing food lighting and tones (NOT clinical/cosmetic). Props ALLOWED: ${JSON.stringify(recog.allowed_props)}.`,
    `★ FORBIDDEN (never render): ${JSON.stringify(recog.forbidden_props)}. No cosmetic props, no cotton pad, no dropper, no beauty-model glamour shot, no clinical white clinical mood.`,
    `Render this Korean headline as crisp accurate text at the top (clean modern Korean sans-serif, perfectly legible): "${design.headline_ko}".`,
    `Include a clean 3-up label row with these Korean text labels (text only, NO fabricated numbers/grades): "${(design.kpis_ko || []).join('", "')}".`,
    'Make it look genuinely delicious and premium, like a top Korean seafood brand ad. No fake certification marks, percentages, or graphs.',
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
  writeFileSync('_prototype_out/hero-food-test.png', Buffer.from(b64, 'base64'));
  console.log('✅ 저장: _prototype_out/hero-food-test.png');
}

async function run() {
  console.log('[1] 제품 인지…');
  const recog = await recognize();
  console.log(JSON.stringify(recog, null, 2));
  console.log('\n[2] 전략·구조 자체 설계(레퍼런스 없이)…');
  const design = await designStructure(recog);
  console.log(JSON.stringify(design, null, 2));
  writeFileSync('_prototype_out/hero-food-meta.json', JSON.stringify({ recog, design }, null, 2));
  console.log('\n[3] 재생성(식품답게)…');
  await regenerate(recog, design);
}
run().catch(e => { console.error(e); process.exit(1); });
