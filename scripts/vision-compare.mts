/**
 * Vision 정확도 비교 — Gemini(gemini-3.5-flash) vs GPT(gpt-4o). 같은 캡처·같은 STAGE1_PROMPT.
 * 섹션 추출(개수·타입·순서) + JSON 파싱 안정성. 텍스트 분석 1장 = 저비용.
 * 실행: npx --yes tsx scripts/vision-compare.mts
 */
import { readFileSync } from 'node:fs';
const env = readFileSync('.env.local', 'utf8');
for (const line of env.split('\n')) { const m = line.match(/^([A-Z_]+)=(.*)$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, ''); }

const IMG_PATH = 'public/images/landing/section-mid.png';
const b64 = readFileSync(IMG_PATH).toString('base64');
const MIME = 'image/png';

// route의 STAGE1_PROMPT 그대로(불변) — 양쪽에 동일 전송
const STAGE1_PROMPT = `이 이미지는 한국 이커머스 상세페이지 캡처입니다.

★ 중요 제외 규칙: 아래 영역은 절대 본문으로 분류하지 마세요.
  - 사이트 상단 네비게이션 / 헤더
  - 광고 배너 / 팝업
  - 사이트 하단 푸터
  - 추천상품 / 연관상품 영역
  - 구매자 리뷰 목록 (리뷰 박스)
  - 와디즈 달성률 / 펀딩 현황 위젯

★ 분석 대상: 판매자가 직접 작성한 '상세페이지 본문' (제품 스토리, 성분/소재, 사용법, USP, FAQ, CTA 등)만 분석하세요.

★ 섹션 분리 기준 — 아래 유형은 반드시 각각 별도 섹션으로 추출하세요 (비슷해 보여도 내용이 다르면 분리):
  - 비교표: 경쟁 제품·기존 방식과 표/격자 형태로 비교하는 섹션
  - 반박형: "냉동 괜찮을까?", "정말 효과 있나요?" 등 고객 의심·우려를 반박하는 섹션
  - 레시피: 조리법, 활용법, 사용 레시피를 카드형으로 나열하는 섹션
  - 제조공정: 생산 단계별(1단계→2단계→…) 설명이 별도 블록으로 나열된 섹션
  - 펀딩계획: 와디즈 펀딩 자금 사용 계획, 로드맵, 목표금액 활용 내용
  - 카테고리교육: 성분·원료·기술 원리를 설명해 독자를 교육하는 섹션
  - 감성컷: 제품 없이 감성 이미지·슬로건·무드만으로 구성된 전환 섹션
  → 위 유형은 인접 섹션과 합치지 말고 무조건 별도 추출하세요.

아래 JSON 형식으로만 응답하세요. 다른 텍스트, 설명, 마크다운 코드블록 절대 금지:
{
  "총섹션수": 5,
  "섹션목록": [
    {
      "순서": 1,
      "타입": "히어로",
      "y시작": 0,
      "y끝": 18,
      "핵심메시지": "제품 핵심 가치를 한 줄로",
      "카피톤": "감성",
      "이미지무드": "라이프스타일"
    }
  ]
}

타입 (반드시 이 중 하나만): 히어로, 공감, USP, 사용법, 비교표, 후기, FAQ, CTA, 성분신뢰, 브랜드스토리, 배송포장, AS환불, 인증특허, 제조공정, 선물포장, 반박형, 레시피, 감성컷, 펀딩계획, 카테고리교육
카피톤 (반드시 이 중 하나만): 감성, 직설, 위트, 전문가, 친근
이미지무드 (반드시 이 중 하나만): 라이프스타일, 제품독립, 인포그래픽, 모델사용, 디테일클로즈업
y시작 / y끝: 이 이미지(청크) 전체 높이 기준 0~100 정수 (맨 위=0, 맨 아래=100)`;

function parseFirstJson(t: string): Record<string, unknown> | null {
  const m = t.match(/\{[\s\S]*\}/); if (!m) return null;
  try { return JSON.parse(m[0]); } catch { return null; }
}

async function gemini(): Promise<{ raw: string; sections: Record<string, unknown>[] }> {
  const key = process.env.GEMINI_API_KEY!;
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${key}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ role: 'user', parts: [{ inlineData: { mimeType: MIME, data: b64 } }, { text: STAGE1_PROMPT }] }], generationConfig: { temperature: 0.1, maxOutputTokens: 4096 } }),
    signal: AbortSignal.timeout(55_000),
  });
  const d = await res.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
  const raw = d.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  const p = parseFirstJson(raw);
  return { raw, sections: (p?.['섹션목록'] as Record<string, unknown>[]) ?? [] };
}

async function gpt(): Promise<{ raw: string; sections: Record<string, unknown>[] }> {
  const key = process.env.OPENAI_API_KEY!;
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: 'gpt-5.5', messages: [{ role: 'user', content: [{ type: 'text', text: STAGE1_PROMPT }, { type: 'image_url', image_url: { url: `data:${MIME};base64,${b64}` } }] }], max_completion_tokens: 8192 }),
    signal: AbortSignal.timeout(55_000),
  });
  const d = await res.json() as { choices?: Array<{ message?: { content?: string }; finish_reason?: string }> };
  const raw = d.choices?.[0]?.message?.content ?? '';
  const p = parseFirstJson(raw);
  return { raw, sections: (p?.['섹션목록'] as Record<string, unknown>[]) ?? [] };
}

const show = (label: string, r: { raw: string; sections: Record<string, unknown>[] }) => {
  console.log(`\n■ ${label} — 섹션 ${r.sections.length}개`);
  r.sections.forEach((s, i) => console.log(`  ${i + 1}. [${s['타입']}] y=${s['y시작']}~${s['y끝']} 톤=${s['카피톤']} "${String(s['핵심메시지']).slice(0, 40)}"`));
  // JSON 파싱 안정성: 펜스/서론 붙었나
  const hasFence = /```/.test(r.raw);
  const hasPrologue = !r.raw.trimStart().startsWith('{');
  console.log(`  파싱: 마크다운펜스 ${hasFence ? '있음' : '없음'} / JSON앞 서론 ${hasPrologue ? '있음' : '없음'} → 추출 ${r.sections.length > 0 ? '✅성공' : '❌실패'}`);
};

console.log(`이미지: ${IMG_PATH} (Flik 랜딩 섹션 — 기능그리드/3단계/CTA)`);
const [g, o] = await Promise.all([gemini(), gpt()]);
show('Gemini gemini-3.5-flash', g);
show('GPT gpt-5.5', o);

console.log('\n──── 비교 ────');
console.log(`  섹션 개수: Gemini ${g.sections.length} vs GPT ${o.sections.length}`);
const typesG = g.sections.map(s => s['타입']).join(' → ');
const typesO = o.sections.map(s => s['타입']).join(' → ');
console.log(`  타입순서 Gemini: ${typesG}`);
console.log(`  타입순서 GPT   : ${typesO}`);
console.log(`  GPT 파싱 성공: ${o.sections.length > 0 ? '✅' : '❌'} / 빈출력 가드 대상(빈응답): ${o.raw.trim() ? '아니오' : '⚠️예'}`);
