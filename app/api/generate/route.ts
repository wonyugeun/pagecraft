import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';
import { resolveOutputType, OUTPUT_TYPE_LABEL } from '@/lib/outputType';
import { getCategoryCopyGuard } from '@/lib/copyGuards';
import { getCategoryConfig, COPY_PRINCIPLES } from '@/lib/categoryPrompts';
import { buildImagePromptRules, IMAGE_DESC_FIELD_SPEC } from '@/lib/imagePromptRules';

export const maxDuration = 300;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

interface ReferenceAnalysis {
  url: string;
  sections: string[];
  tone: string;
  headlinePattern: string;
  emphasisPoints: string[];
  summary: string;
}


/* ─────────────────────────────────────────────
   채널별 섹션 수 기본값
───────────────────────────────────────────── */
function getDefaultSecCnt(ch: string, secCnt: number): number {
  if (secCnt && secCnt > 0) return Math.min(secCnt, 50);
  if (ch === '와디즈') return 14;
  if (ch === '자사몰') return 10;
  if (ch === '쿠팡')   return 8;
  return 10;
}

/* ─────────────────────────────────────────────
   API 핸들러
───────────────────────────────────────────── */
interface CaptureAnalysisInput {
  전체톤: string;
  브랜드무드: string;
  섹션목록: Array<{ 타입: string; 핵심메시지: string; 카피톤?: string; 톤매너노트?: string; 사용된키워드?: string[] }>;
}

export async function POST(req: NextRequest) {
  const { cat, ch, type, out, secCnt, productName, productExtra, referenceAnalysis, sectionStructure, captureAnalysis } =
    await req.json() as {
      cat: string; ch: string; type: string; out: string;
      secCnt: number; productName: string; productExtra: string;
      referenceAnalysis?: ReferenceAnalysis;
      sectionStructure?: string[];
      captureAnalysis?: CaptureAnalysisInput;
    };

  const resolvedOut  = resolveOutputType(ch, out);
  const isBlogOutput = resolvedOut === 'blog';
  const outputType   = OUTPUT_TYPE_LABEL[resolvedOut];
  const count        = sectionStructure?.length || getDefaultSecCnt(ch, secCnt);
  const { system, sectionGuide } = getCategoryConfig(cat, ch);

  const hasPriceInfo = productExtra?.includes('가격 표시 여부:');
  const showPriceInCopy = productExtra?.includes('가격 표시 여부: 상세페이지에 표시');
  const priceGuide = hasPriceInfo
    ? showPriceInCopy
      ? `\n[가격 카피 지침: 정가·판매가·할인율 정보가 있습니다 — 해당 수치를 카피(헤드라인 또는 본문)에 자연스럽게 활용하세요.]\n`
      : `\n[가격 카피 지침: 가격 정보가 있으나 상세페이지에 표시하지 않습니다 — 카피에 구체적인 가격·할인율을 언급하지 마세요.]\n`
    : '';

  const hasOptions = productExtra?.includes('옵션:');
  const optionsGuide = hasOptions
    ? `\n[옵션 카피 지침: 옵션 정보가 있습니다 — 구성/선택 안내 섹션이나 비교표에 옵션 종류와 선택 방법을 자연스럽게 안내하세요.]\n`
    : '';

  const productDetailBlock = productExtra
    ? `\n[상품 상세 정보 — 아래 내용을 카피에 반드시 반영하세요. 수치·인증·소재명이 있으면 헤드라인과 본문에 직접 녹이세요]\n${productExtra}\n${priceGuide}${optionsGuide}`
    : '';

  const sectionBlock = sectionStructure?.length
    ? `\n[섹션 구조 — 반드시 아래 순서·이름·개수 그대로 생성하세요. 임의로 변경하거나 추가·삭제하지 마세요]\n${sectionStructure.map((s, i) => `${i + 1}. ${s}`).join('\n')}\n`
    : '';

  const referenceBlock = referenceAnalysis
    ? `\n[레퍼런스 스타일 — 아래 구조·톤을 참고해서 생성하세요]
- 참조 URL: ${referenceAnalysis.url}
- 섹션 구조: ${referenceAnalysis.sections.join(' → ')}
- 카피 톤앤매너: ${referenceAnalysis.tone}
- 헤드라인 패턴: ${referenceAnalysis.headlinePattern}
- 강조 포인트: ${referenceAnalysis.emphasisPoints.join(' / ')}
- 스타일 요약: ${referenceAnalysis.summary}
※ 위 레퍼런스의 구조·톤을 참고하되, 상품 정보는 아래 제공된 내용으로 새롭게 작성하세요.\n`
    : '';

  const captureBlock = captureAnalysis
    ? `\n[캡처 분석 레퍼런스 — 아래 톤·무드를 카피 전반에 반영하세요]
- 전체 카피 톤: ${captureAnalysis.전체톤}
- 브랜드 무드: ${captureAnalysis.브랜드무드}
- 섹션별 참고 톤매너:
${captureAnalysis.섹션목록.map(s => `  · ${s.타입}: ${s.톤매너노트 ?? s.카피톤 ?? ''} ${s.사용된키워드?.length ? `(키워드: ${s.사용된키워드.join(', ')})` : ''}`).filter(l => l.trim().length > 6).join('\n')}
※ 위 레퍼런스 톤을 바탕으로 카피를 작성하되, 상품 정보는 아래 제공된 내용으로 새롭게 작성하세요.\n`
    : '';

  const blocksGuide = isBlogOutput
    ? `
[블로그형 추가 출력 — blocks]
blog 형태에서는 각 섹션에 "blocks" 배열을 추가로 출력하세요.
blocks는 섹션 내용을 다양한 형태로 표현하는 단위입니다.
섹션 이름(역할)에 맞는 블록 타입을 선택하세요:

- 히어로/메인 섹션 → hero(title, subtitle) + image
- 고민/공감 섹션 → heading + checklist(items[]) + image(선택)
- 성분/특징 섹션 → heading + iconcards(cards[{title, desc}]) (3~4개)
- 수치/효과/증명 섹션 → heading + stats(items[{value, label}]) (2~4개)
- 사용법/방법 섹션 → heading + steps(items[{title, desc}]) + image(선택)
- 비교 섹션 → heading + compare(headers[], rows[])
- 후기/리뷰 섹션 → heading + quote(text, author, rating)
- FAQ/자주묻는질문 섹션 → heading + faq(items[{q, a}])
- 마지막 CTA/구매유도 섹션 → cta(text, button)
- 그 외 일반 설명 → heading + paragraph(text) + image(선택)

블록 타입별 형식:
{ "type": "hero", "title": "...", "subtitle": "..." }
{ "type": "heading", "text": "..." }
{ "type": "paragraph", "text": "..." }
{ "type": "checklist", "items": ["...", "..."] }
{ "type": "steps", "items": [{"title": "...", "desc": "..."}] }
{ "type": "iconcards", "cards": [{"title": "...", "desc": "..."}] }
{ "type": "stats", "items": [{"value": "95%", "label": "..."}] }
{ "type": "compare", "headers": ["항목", "우리제품", "일반제품"], "rows": [["병풀함량", "95%", "낮음"]] }
{ "type": "quote", "text": "...", "author": "...", "rating": 5 }
{ "type": "faq", "items": [{"q": "...", "a": "..."}] }
{ "type": "image", "label": "...", "desc": "이미지 생성 프롬프트" }
{ "type": "cta", "text": "...", "button": "지금 구매하기" }

각 섹션 JSON에 기존 headline, body, imageLabel, imageDesc도 그대로 포함하고, 추가로 blocks 배열을 넣으세요.
image 블록의 desc는 이미지 생성 프롬프트입니다(기존 imageDesc와 동일 역할).
`
    : '';

  const copyGuard = getCategoryCopyGuard(cat);
  console.log(`[generate] cat=${cat} copyGuard=${copyGuard ? `active(${copyGuard.length}chars)` : 'none'}`);
  const imagePromptRules = buildImagePromptRules(cat, isBlogOutput);

  const userPrompt = `다음 조건으로 상세페이지 섹션을 생성해주세요.

[생성 조건]
- 카테고리: ${cat}
- 판매 채널: ${ch}
- 타입: ${type}
- 출력 형태: ${outputType}
- 상품명: ${productName || '(미입력)'}
- 섹션 수: ${count}개

[섹션 기획 가이드]
${sectionGuide}
${productDetailBlock}${sectionBlock}${referenceBlock}${captureBlock}${blocksGuide}${imagePromptRules}${copyGuard}
${COPY_PRINCIPLES}

[출력 형식] — 다른 텍스트 없이 아래 JSON 배열만 반환하세요:
[
  {
    "num": "SECTION 01",
    "name": "섹션 이름 (예: 히어로 — 메인 후킹)",
    "headline": "헤드라인 카피 (이모지 포함, 업계 전문 용어·수치·차별점을 자연스럽게 반영, 구체적이고 설득력 있게)",
    "body": "본문 카피 (2~4문장, AIDA 흐름·업계 전문 용어·채널 최적화 적용, 상품 정보와 카테고리 특성 최대 반영)",
    "imageLabel": "이미지 슬롯 라벨 (예: 📸 메인 이미지 슬롯)",
    "imageDesc": "${IMAGE_DESC_FIELD_SPEC}"${isBlogOutput ? `,
    "blocks": [
      { "type": "hero", "title": "...", "subtitle": "..." }
    ]` : ''}
  }
]`;

  try {
    const stream = client.messages.stream({
      model:      'claude-sonnet-4-6',
      max_tokens: 32000,
      system,
      messages:   [{ role: 'user', content: userPrompt }],
    });
    const message = await stream.finalMessage();

    if (!message.content || message.content.length === 0) {
      throw new Error('Claude 응답 비어있음 (content 배열 길이 0)');
    }
    const raw = message.content[0].type === 'text' ? message.content[0].text : '';
    const stopReason = message.stop_reason;
    const usage = message.usage;
    console.log(`[generate] stop_reason=${stopReason} input=${usage?.input_tokens} output=${usage?.output_tokens} raw_len=${raw.length} isBlog=${isBlogOutput}`);
    if (stopReason === 'max_tokens') {
      console.error(`[generate] 응답 잘림 (max_tokens 도달). raw tail:\n${raw.slice(-400)}`);
      throw new Error('응답이 max_tokens(32000)에 도달해 잘렸어요. 섹션 수를 줄이거나 max_tokens를 더 늘려주세요.');
    }
    // 외부 배열만 추출 — 첫 '['부터 마지막 ']'까지 (nested array에 강함)
    const first = raw.indexOf('[');
    const last  = raw.lastIndexOf(']');
    if (first === -1 || last === -1 || last < first) {
      console.error(`[generate] JSON 배열 미발견. raw head:\n${raw.slice(0, 500)}`);
      throw new Error('응답에서 JSON 배열을 찾을 수 없음');
    }
    const jsonText = raw.slice(first, last + 1);
    let sections: unknown;
    try {
      sections = JSON.parse(jsonText);
    } catch (parseErr) {
      const pmsg = parseErr instanceof Error ? parseErr.message : String(parseErr);
      const pos = pmsg.match(/position (\d+)/)?.[1];
      const around = pos ? jsonText.slice(Math.max(0, +pos - 120), +pos + 120) : jsonText.slice(0, 300);
      console.error(`[generate] JSON.parse 실패: ${pmsg}\n주변 ±120자:\n${around}\nraw tail:\n${raw.slice(-400)}`);
      throw new Error(`JSON 파싱 실패: ${pmsg}`);
    }
    if (!Array.isArray(sections)) {
      throw new Error(`JSON이 배열이 아님: ${typeof sections}`);
    }
    const invalid = sections.findIndex(s => !s.num || !s.headline || !s.body);
    if (invalid !== -1) {
      console.error(`[generate] 섹션 ${invalid} 필수 필드 누락:`, JSON.stringify(sections[invalid]).slice(0, 200));
      throw new Error(`섹션 ${invalid + 1}에 필수 필드(num/headline/body) 누락`);
    }

    const VALID_BLOCK_TYPES = new Set([
      'hero', 'heading', 'paragraph', 'checklist', 'steps', 'iconcards',
      'stats', 'compare', 'quote', 'faq', 'image', 'cta',
    ]);
    const sanitizedSections = sections.map((s: Record<string, unknown>) => {
      const base = { ...s };
      if (isBlogOutput && Array.isArray(s.blocks)) {
        const validBlocks = (s.blocks as unknown[]).filter(b =>
          b !== null && typeof b === 'object' &&
          typeof (b as { type?: unknown }).type === 'string' &&
          VALID_BLOCK_TYPES.has((b as { type: string }).type),
        );
        if (validBlocks.length) base.blocks = validBlocks;
        else delete base.blocks;
      } else {
        delete base.blocks;
      }
      return base;
    });

    return NextResponse.json({ sections: sanitizedSections });
  } catch (err) {
    console.error('Generate error:', err);
    const msg = err instanceof Error ? err.message : '알 수 없는 오류';
    return NextResponse.json({ sections: [], error: `생성 중 오류가 발생했어요: ${msg}` }, { status: 500 });
  }
}
