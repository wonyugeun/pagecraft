import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, clientIp } from '@/lib/db';
import { getSessionEmail } from '@/lib/authToken';
import { API_ERROR_CODES } from '@/lib/apiErrors';
import { SPEECH_LEVELS } from '@/data/speechLevels';

/**
 * 카피 어투 미리보기(2026-07-29) — 셀러가 상품정보에서 어투를 고를 때
 * "내 상품이면 어떤 느낌인지"를 실제 문장으로 보여준다.
 *
 * ★비용 설계: 5종을 각각 호출하지 않고 한 번의 호출로 전부 생성한다(입력 프롬프트 1회분).
 *   짧은 전용 프롬프트(전체 카피 파이프라인 미사용) + gpt-5.6-luna → 호출당 원가 10원 남짓.
 *   크레딧을 차감하지 않는다(구매 결정을 돕는 기능 — 과금하면 아무도 안 씀).
 * ★날조 가드: 셀러가 준 상품명·차별점 밖의 성분·수치·효능을 만들지 말라고 명시.
 *   결과는 미리보기 전용이며 실제 생성 카피로 재사용하지 않는다.
 */
export const maxDuration = 60;

const MODEL = 'gpt-5.6-luna';

export async function POST(req: NextRequest) {
  const email = await getSessionEmail(req);
  if (!email) return NextResponse.json({ error: '로그인이 필요해요.' }, { status: 401 });

  // 무과금 경로라 남용 방지는 rate limit으로만 — prep 등급(일 20회)
  const rl = await checkRateLimit('prep', email, clientIp(req));
  if (!rl.allowed) {
    return NextResponse.json(
      { error: `미리보기 요청이 많아요 — 잠시 후 다시 시도해주세요.`, code: API_ERROR_CODES.rateLimited },
      { status: 429 },
    );
  }

  const { productName, hint } = await req.json() as { productName?: string; hint?: string };
  if (!productName || !productName.trim()) {
    return NextResponse.json({ error: '상품명을 먼저 입력해주세요.' }, { status: 400 });
  }

  const levels = SPEECH_LEVELS.map(l => `- ${l.key}: ${l.rule}`).join('\n');
  const system = `당신은 한국 이커머스 상세페이지 카피라이터입니다.
아래 상품의 첫 화면(히어로) 카피를 어투별로 각각 1개씩 씁니다.

[어투 정의]
${levels}

[규칙]
- 각 어투마다 headline 1줄(20~35자)과 body 2줄을 씁니다. body의 줄바꿈은 \\n.
- 같은 메시지를 어투만 바꿔 표현하세요. 어미뿐 아니라 문장 길이·호흡도 어투에 맞게 바꿉니다.
- ⚠️셀러가 준 정보 밖의 성분·수치·효능·인증·후기를 절대 만들지 마세요. 주어진 사실만 사용합니다.
- 과장 최상급 표현(최고·1위·유일·100%) 금지.
- JSON 배열로만 출력: [{"level":"해요체","headline":"...","body":"...\\n..."}, ...] — ${SPEECH_LEVELS.length}개, 다른 텍스트 없이.`;

  const user = `[상품명] ${productName.trim()}
${hint?.trim() ? `[차별점·특징] ${hint.trim().slice(0, 400)}` : '(추가 정보 없음 — 상품명만으로 쓰되 없는 사실을 지어내지 마세요)'}`;

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
        max_completion_tokens: 2000,
      }),
      signal: AbortSignal.timeout(45_000),
    });
    const j = await res.json() as {
      choices?: Array<{ message?: { content?: string } }>;
      error?: { message?: string };
    };
    if (!res.ok) throw new Error(j?.error?.message ?? `OpenAI ${res.status}`);

    const raw = j.choices?.[0]?.message?.content ?? '';
    const first = raw.indexOf('['), last = raw.lastIndexOf(']');
    if (first === -1 || last === -1) throw new Error('응답에서 JSON 배열을 찾을 수 없어요.');
    const parsed = JSON.parse(raw.slice(first, last + 1)) as Array<{ level?: string; headline?: string; body?: string }>;
    if (!Array.isArray(parsed)) throw new Error('응답 형식 오류');

    // 정의된 어투 키만 통과 — 모델이 임의 어투를 만들어도 UI가 깨지지 않게
    const valid = new Set(SPEECH_LEVELS.map(l => l.key));
    const samples = parsed
      .filter(x => typeof x?.level === 'string' && valid.has(x.level))
      .map(x => ({
        level: x.level as string,
        headline: String(x.headline ?? '').slice(0, 60),
        body: String(x.body ?? '').slice(0, 200),
      }));

    return NextResponse.json({ samples });
  } catch (err) {
    const msg = err instanceof Error ? err.message : '알 수 없는 오류';
    console.error('[tone-preview]', msg);
    return NextResponse.json({ error: `미리보기 생성에 실패했어요: ${msg}` }, { status: 502 });
  }
}
