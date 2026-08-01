import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';
import { consumeUsageQuota, verifyPaidJob, creditsBypassEnabled, checkRateLimit, clientIp, deductCreditsAtomic } from '@/lib/db';
import { calculateFreeRegenQuota } from '@/lib/pricing';
import { getSessionEmail } from '@/lib/authToken';
import { API_ERROR_CODES } from '@/lib/apiErrors';
import { resolveOutputType, OUTPUT_TYPE_LABEL } from '@/lib/outputType';
import { getCategoryCopyGuard } from '@/lib/copyGuards';
import { getCategoryConfig, COPY_PRINCIPLES } from '@/lib/categoryPrompts';
import { buildImagePromptRules, IMAGE_DESC_FIELD_SPEC } from '@/lib/imagePromptRules';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export const maxDuration = 60;   // ★배포 안정화: Claude 1회 호출 — 플랫폼 기본 한도에 잘리지 않게 명시

export async function POST(req: NextRequest) {
  const { cat, ch, type, out, productName, productExtra, sectionNum, sectionName, jobKey,
          chargeExtra, extraChargeKey } = await req.json();

  // ── ★유료 뒷문 가드(P0 2차) — Claude 호출 전: 결제된 jobKey 검증.
  //    이번 범위는 추가 차감 없음(기본 생성 크레딧 포함) — 추후 pricing 확장 슬롯
  //    regenerationCount로 별도 과금 전환 가능. jobKey 없는 과거 히스토리 요청은 차단(유예 없음). ──
  if (!creditsBypassEnabled()) {
    const email = await getSessionEmail(req);
    const rl = await checkRateLimit('llm', email, clientIp(req));
    if (!rl.allowed) {
      return NextResponse.json(
        { error: `요청이 많아요 — 잠시 후 다시 시도해주세요. (${rl.window}당 ${rl.limit}회)`, code: API_ERROR_CODES.rateLimited, limit: rl.limit, used: rl.used },
        { status: 429 },
      );
    }
    const check = await verifyPaidJob(email, jobKey);
    if (!check.ok) return NextResponse.json({ error: check.error, code: check.code }, { status: check.status });
    /* ★재생성 통합(2026-08-01) — 카피와 이미지가 무료 재생성 한 통(freeregen:{jobKey})을 나눠 쓴다.
     *  이전엔 카피만 섹션×3+10회가 사실상 공짜여서 원가가 샜고, 셀러도 "이미지는 5번, 카피는?"이 헷갈렸다.
     *  한도를 넘으면 이미지와 똑같이 1크레딧을 차감한다 — 다만 클라 확인 없이 돈이 빠지면 안 되므로
     *  1차 응답은 무과금 안내(quotaExhausted)로 돌려주고, 확인 후 chargeExtra로 다시 부른다. */
    const free = calculateFreeRegenQuota(check.paidSections);
    const cap = await consumeUsageQuota(`freeregen:${jobKey}`, 1, free);
    if (!cap.allowed) {
      if (!chargeExtra || typeof extraChargeKey !== 'string' || !extraChargeKey.trim() || !email) {
        return NextResponse.json(
          { error: '무료 재생성을 모두 사용했어요. 추가 재생성은 1크레딧이 차감돼요.',
            code: API_ERROR_CODES.quotaExhausted, quotaLimit: free, quotaUsed: cap.used, extraCost: 1 },
          { status: 429 },
        );
      }
      // ★키 재사용 차단 — 같은 키로 무한 재작성이 되지 않게 1회용 강제(이미지 경로와 동일 방식)
      const key = `copy-extra:${jobKey}:${extraChargeKey.trim().slice(0, 64)}`;
      const claim = await consumeUsageQuota(`copy-extra-use:${key}`, 1, 1);
      if (!claim.allowed) {
        return NextResponse.json({ error: '이미 사용된 추가 재생성 요청이에요. 다시 시도해주세요.' }, { status: 409 });
      }
      const r = await deductCreditsAtomic(email, 1, key, 'copy-regen-extra');
      if (r.status === 'insufficient') {
        return NextResponse.json(
          { error: `크레딧이 부족해요. (추가 재생성 1크레딧 / 보유 ${r.balance})`,
            code: API_ERROR_CODES.insufficientCredits, balance: r.balance },
          { status: 402 },
        );
      }
    }
  }

  const resolvedOut  = resolveOutputType(ch, out);
  const isBlogOutput = resolvedOut === 'blog';
  const outputType   = OUTPUT_TYPE_LABEL[resolvedOut];

  // generate route와 같은 lib 소스를 공유 — 본 생성과 재생성의 가드·미감 규칙이 어긋나지 않게.
  const { system } = getCategoryConfig(cat, ch);
  const copyGuard = getCategoryCopyGuard(cat);
  const imagePromptRules = buildImagePromptRules(cat, isBlogOutput);
  console.log(`[regen-section] cat=${cat} copyGuard=${copyGuard ? `active(${copyGuard.length}chars)` : 'none'} imageRules=${imagePromptRules.length}chars`);

  const productDetailBlock = productExtra
    ? `\n[상품 상세 정보 — 아래 내용을 카피에 반드시 반영하세요. 수치·인증·소재명이 있으면 헤드라인과 본문에 직접 녹이세요]\n${productExtra}\n`
    : '';

  const prompt = `아래 조건으로 상세페이지 섹션 하나를 새롭게 작성해주세요. 이전과 다른 각도와 표현을 사용하세요.

[생성 조건]
- 카테고리: ${cat}
- 판매 채널: ${ch}
- 타입: ${type}
- 출력 형태: ${outputType}
- 상품명: ${productName || '(미입력)'}
- 재생성할 섹션: ${sectionNum} — ${sectionName}
${productDetailBlock}${imagePromptRules}${copyGuard}
${COPY_PRINCIPLES}

[출력 형식] — 다른 텍스트 없이 아래 JSON 객체 하나만 반환하세요:
{
  "num": "${sectionNum}",
  "name": "${sectionName}",
  "headline": "새로운 헤드라인 카피 (이모지 포함, 업계 전문 용어·수치·차별점을 자연스럽게 반영, 구체적이고 설득력 있게)",
  "body": "새로운 본문 카피 (2~4문장, ${cat} 특성과 상품 정보 반영)",
  "imageLabel": "이미지 슬롯 라벨 (예: 📸 메인 이미지 슬롯)",
  "imageDesc": "${IMAGE_DESC_FIELD_SPEC}"
}`;

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-5',
      max_tokens: 2048,
      thinking: { type: 'disabled' },   // 단일 섹션 소규모 호출 — 사고 없이 빠르게(2048 상한 보호)
      system,
      messages: [{ role: 'user', content: prompt }],
    });

    const raw = message.content.find(b => b.type === 'text')?.text ?? '';
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found');
    const section = JSON.parse(jsonMatch[0]);
    return NextResponse.json({ section });
  } catch (err) {
    console.error('[regen-section] error:', err);   // ★상세는 서버 로그만 — 클라는 일반화 메시지
    return NextResponse.json({ error: '섹션 재생성에 실패했어요. 잠시 후 다시 시도해 주세요.' }, { status: 500 });
  }
}
