/**
 * 11번 방식 격리 재현 — 2단계: 레퍼런스를 '구조 텍스트'로 변환 → 제품만 이미지로 재생성.
 * 핵심: 레퍼런스(test1)를 이미지로 직접 넣으면 모델까지 카피됨 → 구조만 텍스트로 추출해 넣어 '새 인물' 생성.
 * 실행: node scripts/hero-2stage-test.mjs  → _prototype_out/hero-2stage-test.png
 *
 * [1단계] test1 → gemini-3.5-flash Vision으로 '구조 설계도'만 JSON 추출(모델외형·제품·문구 제외).
 * [2단계] 구조 텍스트 + test2(셀러 제품) 이미지 → gpt-image-2 edits → 새 광고컷.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const env = readFileSync('.env.local', 'utf8');
const OPENAI = (env.match(/^OPENAI_API_KEY=(.+)$/m) || [])[1]?.trim();
const GEMINI = (env.match(/^GEMINI_API_KEY=(.+)$/m) || [])[1]?.trim();
if (!OPENAI || !GEMINI) { console.error('키 없음(OPENAI/GEMINI)'); process.exit(1); }

const HEADLINE = '예민한 피부, 오늘부터 편안하게';
const KPIS = ['진정 케어', '수분 충전', '저자극 테스트 완료'];

// ── 1단계: 구조만 분석 (모델 외형·제품·구체 문구 제외) ──
async function analyzeStructure() {
  const b64 = readFileSync('_prototype_out/test1.png').toString('base64');
  const prompt = `이 광고 이미지의 "구조 설계도"만 분석해 JSON으로 출력하세요.
★ 모델의 외형(얼굴/머리/포즈 디테일), 제품의 외형, 구체적 카피 문구는 절대 묘사하지 마세요. 오직 추상적 '구조'만:
{
  "layout": "영역 구분과 세로 비율(예: 상단 N% 헤드라인존 / 중앙 N% 인물+제품 / 하단 N% 기능행)",
  "composition": "구도(인물/제품 배치, 시점, 크기 관계 — 외형 말고 배치만)",
  "mood": "색감·조명·톤·서체 느낌(추상적으로)",
  "gaze_flow": "시선이 흐르는 순서",
  "elements": "들어가는 구성요소 종류(예: 모델, 제품, 헤드라인, 기능아이콘 N개, 푸터) — 종류만, 내용 말고"
}
순수 JSON만.`;
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${GEMINI}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ inlineData: { mimeType: 'image/png', data: b64 } }, { text: prompt }] }],
      // gemini-3.5-flash는 thinking 모델 → 추론 토큰 여유 + JSON 출력분까지 넉넉히
      generationConfig: { temperature: 0.1, maxOutputTokens: 8192 },
    }), signal: AbortSignal.timeout(80_000),
  });
  if (!res.ok) { console.error('Vision 오류', res.status, (await res.text()).slice(0, 400)); process.exit(1); }
  const cand = (await res.json()).candidates?.[0];
  const t = cand?.content?.parts?.map(p => p.text).filter(Boolean).join('') ?? '';
  const j = t.slice(t.indexOf('{'), t.lastIndexOf('}') + 1);
  if (!j || j.length < 20) {
    console.error(`구조분석 실패(finish=${cand?.finishReason}) — 이미지 생성 중단(과금 방지). raw:`, t.slice(0, 200));
    process.exit(1);
  }
  return j;
}

// ── 2단계: 구조 텍스트 + 제품 이미지 → 재생성 ──
async function regenerate(structureJson) {
  const prompt = [
    'Create a vertical 2:3 Korean skincare SLIDE ADVERTISEMENT (premium beauty editorial, Medihael-grade).',
    'Follow ONLY this abstract STRUCTURE BLUEPRINT (layout zones, composition, mood, gaze flow, element types) — do NOT copy any specific person or product from it:',
    structureJson,
    '★ Generate a BRAND-NEW Korean female model (a fresh person — do NOT replicate any reference model\'s face/appearance). The model presents the product naturally.',
    'The PRODUCT must be EXACTLY the bottle in the PROVIDED image — the LEAFGREEN CICA TONER: match bottle shape, green translucent liquid, cap, and the "LEAFGREEN / CICA TONER" label precisely. Do NOT substitute a different product.',
    `Render this Korean headline as crisp accurate text at the top (clean modern Korean sans-serif, perfectly legible, no broken glyphs): "${HEADLINE}".`,
    `Include a 3-up benefit row near the bottom with these Korean labels and simple icons: "${KPIS.join('", "')}".`,
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
    method: 'POST', headers: { Authorization: `Bearer ${OPENAI}` }, body: fd,
    signal: AbortSignal.timeout(180_000),
  });
  const text = await res.text();
  if (!res.ok) { console.error('OpenAI 오류', res.status, text.slice(0, 800)); process.exit(1); }
  const b64 = JSON.parse(text).data?.[0]?.b64_json;
  if (!b64) { console.error('b64 없음:', text.slice(0, 400)); process.exit(1); }
  writeFileSync('_prototype_out/hero-2stage-test.png', Buffer.from(b64, 'base64'));
  console.log('✅ 저장: _prototype_out/hero-2stage-test.png');
}

async function run() {
  console.log('[1단계] test1 구조 분석(Vision)…');
  const structure = await analyzeStructure();
  console.log('── 추출된 구조 설계도 ──\n' + structure + '\n');
  writeFileSync('_prototype_out/hero-2stage-structure.json', structure);
  console.log('[2단계] 구조 텍스트 + 제품(test2) → 재생성(gpt-image-2 edits)…');
  await regenerate(structure);
}
run().catch(e => { console.error(e); process.exit(1); });
