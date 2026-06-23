/**
 * 슬라이드 생성 + "제품 인지" 앞단 추가 (땜질 아님 — 생성 전에 제형/소품을 판단해 처음부터 정확히).
 * [1] 제품 인지: 상품정보+test2(제품이미지) → product_form / allowed_props / forbidden_props 판단
 * [2] 구조 분석: test1(레퍼런스) → 구조 설계도(외형·제품·문구 제외)  ※ 다른 제형이면 그 소품은 forbidden로 강제
 * [3] 재생성: 구조텍스트 + 제품인지 + test2 → gpt-image-2 edits
 * 실행: node scripts/hero-3stage-test.mjs → _prototype_out/hero-3stage-test.png
 */
import { readFileSync, writeFileSync } from 'node:fs';

const env = readFileSync('.env.local', 'utf8');
const OPENAI = (env.match(/^OPENAI_API_KEY=(.+)$/m) || [])[1]?.trim();
const GEMINI = (env.match(/^GEMINI_API_KEY=(.+)$/m) || [])[1]?.trim();
if (!OPENAI || !GEMINI) { console.error('키 없음'); process.exit(1); }

// 셀러 상품 정보(실제 입력 가정)
const PRODUCT_NAME = 'LEAFGREEN 시카 토너 (CICA TONER)';
const PRODUCT_INFO = '제주 병풀(센텔라) 진정 토너. 무향·무색소·워터리 제형. 250ml 플라스틱 토너 병. 피부과 테스트 완료.';
const HEADLINE = '예민한 피부, 오늘부터 편안하게';
const KPIS = ['진정 케어', '수분 충전', '저자극 테스트 완료'];

const geminiVision = async (b64, prompt) => {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${GEMINI}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ inlineData: { mimeType: 'image/png', data: b64 } }, { text: prompt }] }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 8192 },  // thinking 모델 → 넉넉히
    }), signal: AbortSignal.timeout(80_000),
  });
  if (!res.ok) { console.error('Vision 오류', res.status, (await res.text()).slice(0, 300)); process.exit(1); }
  const cand = (await res.json()).candidates?.[0];
  const t = cand?.content?.parts?.map(p => p.text).filter(Boolean).join('') ?? '';
  const j = t.slice(t.indexOf('{'), t.lastIndexOf('}') + 1);
  if (!j || j.length < 20) { console.error(`분석 실패(finish=${cand?.finishReason})`); process.exit(1); }
  return JSON.parse(j);
};

// ── [1] 제품 인지 ──
async function recognizeProduct() {
  const b64 = readFileSync('_prototype_out/test2.png').toString('base64');
  const prompt = `상품 정보와 이미지를 보고 "제품 인지" 결과만 JSON으로 출력하세요.
상품명: ${PRODUCT_NAME}
상품정보: ${PRODUCT_INFO}
판단 기준: 이 제품의 실제 제형/용기와, 광고컷에 자연스러운 소품 vs 이 제품엔 없는 소품을 구분.
{
  "product_form": "제형/용기 한 줄(예: 플라스틱 토너 병, 펌프, 튜브, 파우치)",
  "dispense_method": "사용 방식(예: 손/화장솜에 덜어 바름 — 스포이드 아님)",
  "allowed_props": ["이 제품에 자연스러운 소품 배열(예: 화장솜, 시카 잎, 물방울)"],
  "forbidden_props": ["이 제품엔 없는 소품 배열(예: dropper, pipette, 스포이드, 앰플 용기)"]
}
순수 JSON만.`;
  return geminiVision(b64, prompt);
}

// ── [2] 구조 분석 (외형·제품·문구 제외) ──
async function analyzeStructure(productForm) {
  const b64 = readFileSync('_prototype_out/test1.png').toString('base64');
  const prompt = `이 광고의 "구조 설계도"만 JSON으로. ★모델 외형·제품 외형·구체 문구는 제외. 추상 구조만.
또한 이 레퍼런스 제품의 제형이 우리 제품("${productForm}")과 다르면, 레퍼런스에만 있는 사용소품(스포이드 등)은 구조에 포함하지 마세요.
{
  "layout": "영역 구분과 세로 비율",
  "composition": "구도(배치/시점/크기관계 — 외형 말고 배치만)",
  "mood": "색·조명·서체 느낌(추상)",
  "gaze_flow": "시선 순서",
  "elements": ["구성요소 종류만(예: 모델, 제품, 헤드라인, 기능아이콘 3개, 푸터)"]
}
순수 JSON만.`;
  return geminiVision(b64, prompt);
}

// ── [3] 재생성 ──
async function regenerate(recog, structure) {
  const prompt = [
    'Create a vertical 2:3 Korean skincare SLIDE ADVERTISEMENT (premium beauty editorial, Medihael-grade).',
    'Follow ONLY this abstract STRUCTURE BLUEPRINT (layout/composition/mood/gaze/element types) — do NOT copy any specific person or product from the reference:',
    JSON.stringify(structure),
    '★ Generate a BRAND-NEW Korean female model (fresh person, do NOT replicate any reference model).',
    `★ PRODUCT RECOGNITION (obey strictly): product form = "${recog.product_form}"; dispense = "${recog.dispense_method}".`,
    `ALLOWED props only: ${JSON.stringify(recog.allowed_props)}.`,
    `FORBIDDEN props — NEVER render these: ${JSON.stringify(recog.forbidden_props)}. The model must NOT hold a dropper/pipette/spoid; she holds or presents the toner bottle itself, or uses a cotton pad.`,
    'The PRODUCT must be EXACTLY the bottle in the PROVIDED image — LEAFGREEN CICA TONER: match bottle shape, green translucent liquid, cap, and the "LEAFGREEN / CICA TONER" label precisely.',
    `Render this Korean headline as crisp accurate text at the top (clean modern Korean sans-serif, perfectly legible): "${HEADLINE}".`,
    `Include a clean 3-up benefit row with these Korean text labels and simple icons (text labels only, NO fabricated numbers/percentages): "${KPIS.join('", "')}".`,
    'Premium clean cica mood, soft green/beige, soft daylight. No fake certification marks, percentages, or graphs.',
  ].join(' ');

  const fd = new FormData();
  fd.append('model', 'gpt-image-2');
  fd.append('prompt', prompt);
  fd.append('size', '1024x1536');
  fd.append('quality', 'high');
  fd.append('n', '1');
  fd.append('image[]', new File([readFileSync('_prototype_out/test2.png')], 'product.png', { type: 'image/png' }));

  const res = await fetch('https://api.openai.com/v1/images/edits', {
    method: 'POST', headers: { Authorization: `Bearer ${OPENAI}` }, body: fd, signal: AbortSignal.timeout(180_000),
  });
  const text = await res.text();
  if (!res.ok) { console.error('OpenAI 오류', res.status, text.slice(0, 600)); process.exit(1); }
  const b64 = JSON.parse(text).data?.[0]?.b64_json;
  if (!b64) { console.error('b64 없음'); process.exit(1); }
  writeFileSync('_prototype_out/hero-3stage-test.png', Buffer.from(b64, 'base64'));
  console.log('✅ 저장: _prototype_out/hero-3stage-test.png');
}

async function run() {
  console.log('[1] 제품 인지…');
  const recog = await recognizeProduct();
  console.log(JSON.stringify(recog, null, 2));
  console.log('\n[2] 구조 분석…');
  const structure = await analyzeStructure(recog.product_form);
  console.log(JSON.stringify(structure, null, 2));
  writeFileSync('_prototype_out/hero-3stage-meta.json', JSON.stringify({ recog, structure }, null, 2));
  console.log('\n[3] 재생성(제품인지 주입)…');
  await regenerate(recog, structure);
}
run().catch(e => { console.error(e); process.exit(1); });
