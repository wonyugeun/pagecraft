import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getSessionEmail } from '@/lib/authToken';
import { checkRateLimit, clientIp } from '@/lib/db';

/**
 * 상품명 → 카테고리 AI 폴백(2026-08-04).
 *
 * ★왜: 키워드 사전(lib/categoryGuess)은 구조적으로 어휘를 못 따라간다 — '그래놀라'가 없어서
 *   못 알아본 것처럼, 처음 보는 상품군은 계속 뚫린다(유근님: "다른 것들도 안 나오는 거 많겠네").
 *   사전이 먼저(즉시·무료), 사전이 모를 때만 이 API가 답한다.
 *
 * 비용: haiku 호출당 1원 미만, 크레딧 미차감. prep rate limit으로 남용 방지.
 * ⚠️확신 없으면 null을 돌려준다 — 틀리게 찍는 것이 못 찍는 것보다 나쁘다(사전과 같은 원칙).
 */
const CATS = ['화장품', '식품', '패션', '생활', '가전', '반려동물', '스포츠', '유아', '건강', '자동차', '기타'];
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export const maxDuration = 15;

export async function POST(req: NextRequest) {
  const email = await getSessionEmail(req);
  if (!email) return NextResponse.json({ error: '로그인이 필요해요.' }, { status: 401 });

  const rl = await checkRateLimit('prep', email, clientIp(req));
  if (!rl.allowed) return NextResponse.json({ cat: null });   // 조용히 — 편의 기능이라 실패해도 지장 없음

  const { productName } = await req.json() as { productName?: string };
  const name = (productName ?? '').trim().slice(0, 80);
  if (name.length < 4) return NextResponse.json({ cat: null });

  try {
    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 10,
      system: `한국 이커머스 상품명을 카테고리 하나로 분류한다. 다음 중 하나만 답하라(다른 말 금지): ${CATS.join(', ')}. 확신이 없으면 "모름"이라고만 답하라.`,
      messages: [{ role: 'user', content: name }],
    });
    const raw = msg.content[0]?.type === 'text' ? msg.content[0].text.trim() : '';
    const cat = CATS.find(c => raw.startsWith(c)) ?? null;
    return NextResponse.json({ cat });
  } catch (err) {
    console.error('[category-guess]', err);
    return NextResponse.json({ cat: null });
  }
}
