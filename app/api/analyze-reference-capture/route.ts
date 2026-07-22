import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { checkRateLimit, clientIp, creditsBypassEnabled } from '@/lib/db';
import { getSessionEmail } from '@/lib/authToken';
import { API_ERROR_CODES } from '@/lib/apiErrors';

// ★2026-07-22: 60→120초 상향 — 여러 장 캡처(긴 스티치 이미지)는 vision 분석이 55초를 넘겨
//   "aborted due to timeout"으로 전멸하던 문제. 아래 요청 타임아웃도 함께 상향.
export const maxDuration = 120;

// ★vision 분석 모델 Gemini→GPT→Claude(2026-07-22) — gpt-5.5가 한국 커머스 페이지 섹션 분류를
//   반복적으로 오독(리뷰→브랜드스토리 등). 카피 파이프라인과 동일한 Sonnet 5로 통일. 프롬프트 텍스트는 불변.
const VISION_MODEL = 'claude-sonnet-5';
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function parseFirstJson(text: string): Record<string, unknown> | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try { return JSON.parse(match[0]); } catch { return null; }
}

// ★멀티 이미지 지원(2026-07-22) — 캡처 원본들을 한 호출에 전부 넣어 전체 맥락으로 분석.
//   (구 방식: 이어붙인 뒤 잘라 조각별 독립 분석 → 맥락 단절 + 해상도 뭉개짐으로 인식 저조)
async function claudeVision(
  imagesBase64: string[],
  prompt: string,
  retry = true,
): Promise<Record<string, unknown>> {
  const callOnce = async (p: string): Promise<string> => {
    const message = await anthropic.messages.create({
      model: VISION_MODEL,
      max_tokens: 8192,   // 섹션구조 JSON 잘리지 않게 충분히
      // 추출 작업이라 thinking 불필요 — 비용·지연 차단(품질 부족하면 adaptive로 한 줄 전환)
      thinking: { type: 'disabled' },
      messages: [{
        role: 'user',
        content: [
          ...imagesBase64.map(b64 => ({
            type: 'image' as const,
            source: { type: 'base64' as const, media_type: 'image/jpeg' as const, data: b64 },
          })),
          { type: 'text' as const, text: p },
        ],
      }],
    }, { timeout: 100_000 });   // ★100s — 대형 이미지 분석 시간 확보(maxDuration 120 안)

    const textBlock = message.content.find(b => b.type === 'text');
    const content = textBlock?.type === 'text' ? textBlock.text : '';
    // ★빈 출력 과금 가드 — 과금됐는데 내용이 없으면 로그로 드러내고(파싱 단계에서 retry/throw로 이어짐).
    if (!content.trim()) console.warn(`[capture] Claude 빈 출력(과금됨) stop_reason=${message.stop_reason ?? '?'}`);
    return content;
  };

  const text = await callOnce(prompt);
  const parsed = parseFirstJson(text);
  if (parsed) return parsed;

  if (retry) {
    const retryText = await callOnce(
      prompt + '\n\n★ 중요: 순수 JSON만 응답하세요. { 로 시작해서 } 로 끝나는 JSON 외 어떤 텍스트도 포함하지 마세요.',
    );
    const retryParsed = parseFirstJson(retryText);
    if (retryParsed) return retryParsed;
  }

  throw new Error('JSON 파싱 실패 — 분석 응답에서 JSON을 찾지 못했어요.');
}

const STAGE1_PROMPT = `한국 이커머스 상세페이지 캡처입니다.

★ 이미지가 여러 장이면: 위→아래 순서로 이어지는 "한 페이지"입니다. 전부 이어붙여 하나의 상세페이지로 보고 섹션을 나누세요.
  - 이미지 경계는 섹션 경계가 아닙니다 — 섹션이 이미지 사이에 걸쳐 있을 수 있습니다.
  - 각 섹션의 위치는 "몇 번째 이미지의 어느 높이에서 시작해 몇 번째 이미지의 어느 높이에서 끝나는지"로 표기합니다.

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
      "시작이미지": 1,
      "y시작": 0,
      "끝이미지": 1,
      "y끝": 45,
      "핵심메시지": "제품 핵심 가치를 한 줄로",
      "카피톤": "감성",
      "이미지무드": "라이프스타일"
    }
  ]
}

타입 (반드시 이 중 하나만): 히어로, 공감, USP, 사용법, 비교표, 후기, FAQ, CTA, 성분신뢰, 브랜드스토리, 배송포장, AS환불, 인증특허, 제조공정, 선물포장, 반박형, 레시피, 감성컷, 펀딩계획, 카테고리교육
카피톤 (반드시 이 중 하나만): 감성, 직설, 위트, 전문가, 친근
이미지무드 (반드시 이 중 하나만): 라이프스타일, 제품독립, 인포그래픽, 모델사용, 디테일클로즈업
시작이미지 / 끝이미지: 섹션이 시작·끝나는 이미지 번호 (첫 번째 이미지=1). 한 이미지 안에서 끝나면 두 값이 같습니다.
y시작: 시작이미지 높이 기준 0~100 정수 (맨 위=0) / y끝: 끝이미지 높이 기준 0~100 정수 (맨 아래=100)
이미지가 1장뿐이면 모든 섹션의 시작이미지=끝이미지=1입니다.

★★ 복제 금지 (절대 규칙): 레퍼런스에서는 "섹션 구조·레이아웃·디자인 톤(how)"만 추출하세요. 레퍼런스 제품의 상품 주장·수치·효능·성분·브랜드명·구체 문구·전략은 절대 복제하지 마세요. 실제 카피 내용은 이후 단계에서 입력된 셀러 상품 정보로만 작성됩니다.`;

function buildStage2Prompt(stage1Json: string) {
  return `앞서 파악한 섹션 구조를 기반으로, 각 섹션을 Flik 카피 생성용으로 상세 분석하세요.

★ 절대 규칙: 아래 섹션 구조의 "순서" 번호를 절대 변경하지 마세요. 섹션을 추가하거나 삭제하지 마세요. 입력된 섹션 수와 동일한 수의 섹션상세를 반환하세요.

섹션 구조:
${stage1Json}

아래 JSON 형식으로만 응답하세요. 다른 텍스트, 마크다운 코드블록 절대 금지:
{
  "섹션상세": [
    {
      "순서": 1,
      "카피구조": "헤드라인 + 서브헤드 + CTA 형식으로 구성",
      "사용된키워드": ["주요 키워드1", "키워드2"],
      "강조포인트": "이 섹션의 핵심 차별화 메시지",
      "이미지스타일": "밝은 배경, 클로즈업, 따뜻한 색감 등 구체적으로",
      "톤매너노트": "셀러가 따라야 할 카피 톤의 핵심 (예: 전문 용어 사용, 숫자 강조 등)"
    }
  ],
  "전체톤": "감성적",
  "브랜드무드": "프리미엄"
}

★★ 복제 금지 (절대 규칙): 위 분석은 "카피 구조·톤·이미지 스타일(how)"만 뽑는 것입니다.
- "강조포인트"는 그 섹션이 무엇을 강조하는지의 "형식/패턴"만 적고, 레퍼런스 제품의 구체적 주장·수치·문구를 그대로 복제하지 마세요.
- "사용된키워드"도 일반적 분류 키워드만, 레퍼런스 고유의 브랜드명·제품명·과장 문구는 넣지 마세요.
- 실제 카피 내용·수치·주장은 이후 단계에서 입력된 셀러 상품 정보로만 작성됩니다.`;
}

export async function POST(req: NextRequest) {
  // ★images[](멀티 이미지)가 새 기본. image(단수)는 하위호환.
  const body = await req.json() as { step: 1 | 2; image?: string; images?: string[]; stage1?: unknown };
  const imageList: string[] = (body.images?.length ? body.images : body.image ? [body.image] : []).slice(0, 14);

  // ── ★prep rate limit(배포 전 방어) — 외부 Claude 호출 전. production 우회 불가. ──
  if (!creditsBypassEnabled()) {
    const email = await getSessionEmail(req);
    const rl = await checkRateLimit('prep', email, clientIp(req));
    if (!rl.allowed) {
      return NextResponse.json(
        { error: `요청이 많아요 — 잠시 후 다시 시도해주세요. (${rl.window}당 ${rl.limit}회)`, code: API_ERROR_CODES.rateLimited, limit: rl.limit, used: rl.used },
        { status: 429 },
      );
    }
  }

  if (imageList.length === 0) {
    return NextResponse.json({ error: '이미지 데이터가 필요해요.' }, { status: 400 });
  }
  if (body.step !== 1 && body.step !== 2) {
    return NextResponse.json({ error: 'step은 1 또는 2여야 해요.' }, { status: 400 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY가 설정되지 않았어요.' }, { status: 500 });
  }

  // ── Stage 1: 구조 분석 ──
  if (body.step === 1) {
    const totalKb = Math.round(imageList.reduce((s, i) => s + i.length, 0) * 3 / 4 / 1024);
    console.log(`[capture/stage1] images: ${imageList.length}장, total base64: ${totalKb} KB (~${Math.round(totalKb / 1024 * 10) / 10} MB)`);

    let parsed: Record<string, unknown>;
    try {
      parsed = await claudeVision(imageList, STAGE1_PROMPT);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[capture/stage1]', msg);
      return NextResponse.json({ error: `구조 분석 실패: ${msg}` }, { status: 500 });
    }

    console.log('[capture/stage1] raw parsed:', JSON.stringify(parsed, null, 2));

    const sections = parsed['섹션목록'];
    console.log(`[capture/stage1] extracted section count: ${Array.isArray(sections) ? sections.length : 'N/A (not array)'}`);
    if (Array.isArray(sections)) {
      (sections as Array<Record<string, unknown>>).forEach((s, i) =>
        console.log(`  [${i + 1}] 타입=${s['타입']} img${s['시작이미지']}:${s['y시작']} → img${s['끝이미지']}:${s['y끝']} msg="${s['핵심메시지']}"`)
      );
    }

    if (!Array.isArray(sections) || sections.length === 0) {
      return NextResponse.json({
        error: '본문을 인식하지 못했어요. 광고·리뷰·추천상품 영역을 제외하고 상세페이지 본문만 캡처해서 다시 시도해주세요.',
      }, { status: 422 });
    }

    return NextResponse.json({ stage1: parsed });
  }

  // ── Stage 2: 디테일 추출 ──
  const s1 = body.stage1 as { 섹션목록: Array<Record<string, unknown>> };
  console.log(`[capture/stage2] stage1 input section count: ${s1.섹션목록?.length ?? 'N/A'}`);

  const stage1Json = JSON.stringify(body.stage1, null, 2);
  let parsed: Record<string, unknown>;
  try {
    parsed = await claudeVision(imageList, buildStage2Prompt(stage1Json));
  } catch (err) {
    console.warn('[capture/stage2] 실패, 기본값 사용:', err);
    parsed = { 섹션상세: [], 전체톤: '직설', 브랜드무드: '실용적' };
  }

  const s2Details = (parsed['섹션상세'] as Array<Record<string, unknown>>) ?? [];
  console.log(`[capture/stage2] s2 detail count: ${s2Details.length}`);

  const merged = s1.섹션목록.map(sec => {
    const detail = s2Details.find(d => d['순서'] === sec['순서']) ?? {};
    return {
      ...sec,
      카피구조: detail['카피구조'],
      사용된키워드: detail['사용된키워드'] ?? [],
      강조포인트: detail['강조포인트'],
      이미지스타일: detail['이미지스타일'],
      톤매너노트: detail['톤매너노트'],
    };
  });
  console.log(`[capture/stage2] final merged section count: ${merged.length}`);

  return NextResponse.json({
    analysis: {
      총섹션수: merged.length,
      섹션목록: merged,
      전체톤: parsed['전체톤'] ?? '직설',
      브랜드무드: parsed['브랜드무드'] ?? '실용적',
    },
  });
}
