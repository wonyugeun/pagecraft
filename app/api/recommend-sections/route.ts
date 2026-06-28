/**
 * 섹션 목록 AI 추천 API.
 *
 * 입력(body):
 *   - cat: 카테고리 (예: '화장품')
 *   - ch: 판매 채널 (예: '스마트스토어' | '쿠팡' | '와디즈' | '자사몰')
 *   - productName: 상품명
 *   - depth: '간결' | '풍부'  — 카테고리 기준값 분기
 *   - productExtra?: 상품 핵심 정보(선택)
 *
 * 처리: Claude가 카테고리·채널·상품·깊이를 보고 적정 섹션 이름 배열만 추천.
 *
 * ⚠️ 호출 시점 규칙 — 호출하는 쪽에서 지킬 것:
 *    레퍼런스(referenceAnalysis / captureAnalysis)가 없을 때만 부를 것.
 *    레퍼런스가 있으면 그 섹션 구조가 우선이므로 이 API를 호출하지 말 것.
 *
 * 출력: JSON 배열 — 섹션 "이름"만. 예) ["히어로", "피부고민 공감", ..., "FAQ", "CTA"]
 */

import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';
import { DEPTH_BASE } from '@/lib/sectionDepth';

export const maxDuration = 60;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

/* ─────────────────────────────────────────────
   카테고리별 섹션 수 기준(간결/풍부)은 lib/sectionDepth.ts로 단일 소스화 → import.
   (타입 화면 예시 개수도 같은 DEPTH_BASE를 사용 = 미리보기 = 실제 생성 개수)
───────────────────────────────────────────── */

/* ─────────────────────────────────────────────
   채널 가중치 (섹션 수에 곱)
───────────────────────────────────────────── */
const CHANNEL_WEIGHT: Record<string, number> = {
  스마트스토어: 1.0,
  와디즈:       1.4,
  자사몰:       0.9,
  쿠팡:         0.5,
};

function normalizeCat(cat: string): string {
  const c = cat?.split('/')[0]?.trim() ?? '';
  return DEPTH_BASE[c] ? c : '기타';
}

function computeTargetCount(cat: string, ch: string, depth: '간결' | '풍부'): number {
  const normCat = normalizeCat(cat);
  const base = DEPTH_BASE[normCat][depth];
  const weight = CHANNEL_WEIGHT[ch] ?? 1.0;
  const raw = Math.round(base * weight);
  return Math.min(50, Math.max(6, raw));
}

interface ReqBody {
  cat: string;
  ch: string;
  productName: string;
  depth: '간결' | '풍부';
  productExtra?: string;
}

export async function POST(req: NextRequest) {
  let body: ReqBody;
  try {
    body = await req.json() as ReqBody;
  } catch {
    return NextResponse.json({ error: '요청 본문 파싱 실패' }, { status: 400 });
  }

  const { cat, ch, productName, depth, productExtra } = body;

  if (!cat || !ch || !depth) {
    return NextResponse.json(
      { error: 'cat, ch, depth는 필수입니다.' },
      { status: 400 },
    );
  }
  if (depth !== '간결' && depth !== '풍부') {
    return NextResponse.json(
      { error: "depth는 '간결' 또는 '풍부'여야 합니다." },
      { status: 400 },
    );
  }

  const targetCount = computeTargetCount(cat, ch, depth);
  const normCat = normalizeCat(cat);

  const system = `당신은 대한민국 이커머스 상세페이지 기획 전문가입니다.
카테고리·채널·상품·깊이를 보고 그 상품에 가장 효과적인 상세페이지 섹션 구성을 추천합니다.

[섹션 이름 원칙]
- 한국어. 이커머스 상세페이지에 실제로 쓰이는 명칭.
- 헤더 카피가 아닌 "섹션의 역할 이름"(예: "히어로", "성분 신뢰", "비교표", "사용법", "후기", "FAQ", "CTA").
- 카테고리 특성을 반영한 특화 섹션 포함 (예: 화장품→성분 신뢰, 식품→원산지 스토리, 패션→코디 제안, 가전→스펙/성능).
- 상품 특성(상품명, 핵심 정보)을 보고 필요한 섹션을 정확히 골라 넣을 것.
- 동일·중복 섹션 금지.
- 한 섹션 이름은 12자 이내 권장.

[순서 원칙 — AIDA]
- Attention(시선 끌기) → Interest(흥미·고민 공감) → Desire(욕구·신뢰 형성) → Action(구매 행동)
- 첫 섹션은 보통 "히어로" 또는 "메인 후킹" 류.
- 마지막은 "CTA" 또는 그에 준하는 구매 유도 섹션.

[채널별 톤]
- 스마트스토어: 정보·신뢰 균형, 표준 길이.
- 쿠팡: 짧고 임팩트 위주, 이미지 중심 섹션 비중↑.
- 자사몰: 브랜드 세계관·감성 카피 비중↑.
- 와디즈: 스토리텔링·창업 동기·서포터 언어 비중↑.

[출력 규칙]
- 다른 텍스트 없이 JSON 배열만.
- 배열 길이는 ${targetCount}개에 정확히 맞춘다(±1 허용).
- 각 원소는 한국어 섹션 이름 문자열.`;

  const userPrompt = `다음 조건의 상품을 위한 섹션 구성을 ${targetCount}개로 추천해주세요.

[조건]
- 카테고리: ${cat} (정규화: ${normCat})
- 판매 채널: ${ch}
- 상품명: ${productName || '(미입력)'}
- 깊이: ${depth}
${productExtra ? `\n[상품 핵심 정보]\n${productExtra}\n` : ''}
[출력 형식]
다른 텍스트 없이 JSON 배열만 반환하세요. 예시 형식:
["히어로", "피부고민 공감", "성분 신뢰", "USP", "사용법", "비교표", "후기", "FAQ", "CTA"]`;

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 3000,
      system,
      messages: [{ role: 'user', content: userPrompt }],
    });

    if (!message.content || message.content.length === 0) {
      throw new Error('Claude 응답 비어있음');
    }
    const raw = message.content[0].type === 'text' ? message.content[0].text : '';
    console.log(`[recommend-sections] cat=${normCat} ch=${ch} depth=${depth} target=${targetCount} stop=${message.stop_reason}`);

    const first = raw.indexOf('[');
    const last  = raw.lastIndexOf(']');
    if (first === -1 || last === -1 || last < first) {
      console.error('[recommend-sections] JSON 배열 미발견. raw head:', raw.slice(0, 300));
      throw new Error('응답에서 JSON 배열을 찾을 수 없음');
    }
    const jsonText = raw.slice(first, last + 1);

    let sections: unknown;
    try {
      sections = JSON.parse(jsonText);
    } catch (parseErr) {
      const pmsg = parseErr instanceof Error ? parseErr.message : String(parseErr);
      console.error(`[recommend-sections] JSON.parse 실패: ${pmsg}\nraw:\n${jsonText.slice(0, 500)}`);
      throw new Error(`JSON 파싱 실패: ${pmsg}`);
    }

    if (!Array.isArray(sections)) {
      throw new Error(`JSON이 배열이 아님: ${typeof sections}`);
    }

    // 문자열만 + 중복 제거 + 빈 문자열 제거
    const cleaned = Array.from(new Set(
      (sections as unknown[])
        .filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
        .map(s => s.trim()),
    ));

    if (cleaned.length === 0) {
      throw new Error('유효한 섹션 이름이 없습니다.');
    }

    return NextResponse.json({
      sections: cleaned,
      targetCount,
      meta: { cat: normCat, ch, depth, weight: CHANNEL_WEIGHT[ch] ?? 1.0 },
    });
  } catch (err) {
    console.error('[recommend-sections] error:', err);
    const msg = err instanceof Error ? err.message : '알 수 없는 오류';
    return NextResponse.json(
      { error: `섹션 추천 실패: ${msg}` },
      { status: 500 },
    );
  }
}
