import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  const { cat, ch, type, out, productName, productExtra, sectionNum, sectionName } = await req.json();

  const outputType = out === 'blog' ? '블로그형 (글+그림)' : out === 'slide' ? '이미지 슬라이드형' : 'HTML 섹션형';

  const productDetailBlock = productExtra
    ? `\n상품 상세 정보:\n${productExtra}\n`
    : '';

  const prompt = `당신은 한국 이커머스 상세페이지 전문 카피라이터입니다.
아래 조건으로 상세페이지 섹션 하나를 새롭게 작성해주세요. 이전과 다른 각도와 표현을 사용하세요.

조건:
- 카테고리: ${cat}
- 판매 채널: ${ch}
- 타입: ${type}
- 출력 형태: ${outputType}
- 상품명: ${productName || '(미입력)'}
- 재생성할 섹션: ${sectionNum} — ${sectionName}
${productDetailBlock}
아래 JSON 형식으로 딱 하나의 섹션 객체만 반환하세요. 다른 텍스트 없이 JSON만:
{
  "num": "${sectionNum}",
  "name": "${sectionName}",
  "headline": "새로운 헤드라인 카피 (이모지 포함, 구체적이고 설득력 있게)",
  "body": "새로운 본문 카피 (2~4문장, ${cat} 특성과 상품 정보 반영)",
  "imageLabel": "이미지 슬롯 라벨",
  "imageDesc": "이미지 설명 (촬영 방향, 분위기, 구도 등)"
}`;

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });

    const raw = message.content[0].type === 'text' ? message.content[0].text : '';
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found');
    const section = JSON.parse(jsonMatch[0]);
    return NextResponse.json({ section });
  } catch (err) {
    console.error('[regen-section] error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
