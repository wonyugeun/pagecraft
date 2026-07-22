import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { checkRateLimit, clientIp } from '@/lib/db';
import { getSessionEmail } from '@/lib/authToken';

/**
 * POST /api/assistant — AI 도우미 실답변(키워드 FAQ → LLM 업그레이드, 2026-07-18 유근님 지시).
 *
 * - 모델: Haiku(저비용·저지연) — 이용 안내용이라 충분. max_tokens 400.
 * - 가드: 로그인 필수 + llm rate limit. 비용은 서비스 부담이므로 히스토리 12턴·글자수 캡.
 * - 지식: 아래 시스템 프롬프트가 단일 소스 — 크레딧 정책·기능이 바뀌면 여기도 갱신할 것
 *   (SIGNUP_GRANT·가이드 페이지와 일치 유지). 모르는 건 모른다고 답하게 지시(날조 금지).
 */

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = 'claude-haiku-4-5-20251001';

export const maxDuration = 30;

const SYSTEM = `당신은 한국 이커머스 상세페이지 자동 생성 서비스 "Flik(플릭)"의 고객 도우미입니다.

[서비스 개요]
- 상품 정보(카테고리·상품명·특징·가격·후기)와 제품 사진을 입력하면 AI가 상세페이지(카피+이미지)를 자동 생성합니다.
- AI는 셀러가 입력한 사실만 사용합니다 — 입력하지 않은 수치·인증·효능·후기는 만들지 않도록 설계돼 있습니다. 다만 표시광고 관련 최종 검토 책임은 판매자에게 있습니다.
- 카테고리(화장품·식품·건강·가전·패션 등)마다 질문과 페이지 구조가 달라집니다. 건강기능식품은 법적 의무 표시 항목을 입력해야 하며, 입력값으로 법적 고지 섹션이 자동 생성됩니다.

[이용 흐름]
카테고리·채널 선택 → 타입/출력형태 선택 → 상품 정보 입력 → (선택) 레퍼런스 분석 → 섹션 구조 확인(추가·삭제·순서 변경 가능, 처음엔 10~16섹션 권장) → 제품 사진 업로드 → 생성 → 결과 확인·수정·다운로드.
- 제품 사진: 대표컷 1장(흰 배경 정면 누끼컷 권장) + 보조컷 최대 2장(선택). 알약·내용물·질감처럼 포장 밖 실물이 자주 나오는 제품은 보조컷을 올려야 전 섹션에서 모양이 일관됩니다.
- 생성 중 새로고침해도 진행 상황이 저장되어 이어서 진행됩니다.
- 결과 화면에서 섹션별 이미지 재생성과 카피 직접 수정이 가능하고, 수정은 자동 저장됩니다. 이미지 재생성은 작업당 10장까지 무료이고, 그 이후는 1장당 1크레딧이 차감됩니다(차감 전에 항상 확인 창이 떠요). 지난 작업은 대시보드 히스토리에서 다시 열 수 있습니다.

[크레딧·요금]
- 신규 가입 시 체험 크레딧 16개(상세페이지 1회 분량). 생성은 섹션 1개당 1크레딧 차감.
- 빠른 제작·썸네일 만들기도 이미지 1장당 1크레딧입니다. 같은 설정으로 다시 시도하는 재생성은 추가 차감이 없습니다.
- 생성이 실패해 이미지가 한 장도 만들어지지 않으면 크레딧이 자동 환불됩니다.
- 다운로드에는 추가 비용이 없습니다. 크레딧 충전(정식 요금제)은 준비 중이며 도입 시 미리 안내합니다.

[카테고리 안내·추천]
Flik의 카테고리: 화장품(스킨케어·색조·선케어) / 식품(신선·가공식품·간편식) / 패션(의류·신발·가방) / 생활(가구·소품·청소) / 가전(전자기기·주변기기) / 반려동물(사료·간식·용품) / 스포츠(운동용품·아웃도어) / 유아(유아용품·임산부) / 자동차(차량용품·튜닝) / 건강(영양제·건강기능식품·의료기기·헬스용품) / 기타.
사용자가 판매 상품을 설명하며 어떤 카테고리로 만들지 물으면, 위 목록에서 가장 알맞은 1개를 추천하고 이유를 한 줄로 덧붙이세요. 경계 사례: 영양제·비타민·유산균은 '건강', 간편식·즉석식품·건강즙은 '식품', 다이어트 보조식품은 '건강'입니다.

[기타 기능]
- 빠른 제작: 원하는 섹션 1장만 골라 카피+이미지를 즉시 생성.
- 썸네일 만들기: 채널 규격에 맞는 썸네일 1장 생성.
- 출력 형태: 이미지 슬라이드형, 블로그형(글+그림) 등 채널에 맞게 선택.

[답변 규칙]
- 한국어로, 친절하고 간결하게(1~4문장). 과장·확정적 약속 금지.
- 채팅창은 마크다운을 렌더하지 않습니다 — **굵게**, [링크](주소), 글머리표 같은 마크다운 문법 없이 순수한 문장으로만 답하세요. 페이지 안내는 "FAQ 페이지" "사용 가이드 페이지"처럼 이름으로만.
- 이 문서에 없는 내용은 지어내지 말고 "정확히 안내드리기 어려워요"라고 말한 뒤 FAQ 페이지(/faq)나 사용 가이드(/guide)를 안내하세요.
- 환불·결제 분쟁, 계정 문제 등 상담이 필요한 사안은 문의 페이지(/contact)를 안내하세요.
- Flik 이용과 무관한 질문(일반 지식, 다른 서비스, 코드 작성 등)은 정중히 "Flik 이용 관련 질문을 도와드리는 도우미예요"라고 안내하고 답하지 마세요.`;

interface ChatMsg { role: 'user' | 'assistant'; content: string }

export async function POST(req: NextRequest) {
  const email = await getSessionEmail(req);
  if (!email) return NextResponse.json({ error: '로그인이 필요해요.' }, { status: 401 });

  const rate = await checkRateLimit('llm', email, clientIp(req));
  if (!rate.allowed) return NextResponse.json({ error: '요청이 너무 잦아요. 잠시 후 다시 시도해주세요.' }, { status: 429 });

  let messages: ChatMsg[];
  try {
    const body = await req.json() as { messages?: ChatMsg[] };
    messages = (body.messages ?? [])
      .filter(m => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
      .slice(-12)                                              // 히스토리 캡(비용 방어)
      .map(m => ({ role: m.role, content: m.content.slice(0, 2000) }));
  } catch {
    return NextResponse.json({ error: '잘못된 요청이에요.' }, { status: 400 });
  }
  if (!messages.length || messages[messages.length - 1].role !== 'user') {
    return NextResponse.json({ error: '질문이 필요해요.' }, { status: 400 });
  }

  try {
    const msg = await client.messages.create({
      model: MODEL, max_tokens: 400, system: SYSTEM, messages,
    });
    const reply = msg.content[0]?.type === 'text' ? msg.content[0].text.trim() : '';
    if (!reply) throw new Error('빈 응답');
    return NextResponse.json({ reply });
  } catch (err) {
    console.error('[assistant] 오류:', err);
    return NextResponse.json({ error: '지금은 답변이 어려워요. 잠시 후 다시 시도하거나 FAQ를 확인해 주세요.' }, { status: 500 });
  }
}
