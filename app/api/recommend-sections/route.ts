/**
 * 섹션 목록 AI 추천 API.
 *
 * 입력(body):
 *   - cat: 카테고리 (예: '화장품')
 *   - ch: 판매 채널 (예: '스마트스토어' | '쿠팡' | '와디즈' | '자사몰')
 *   - productName: 상품명
 *   - sectionCount?: 셀러가 시작 화면에서 고른 섹션 수(8/16/32) — 있으면 이 값이 우선한다.
 *   - depth: '간결' | '풍부'  — sectionCount가 없을 때만 쓰는 카테고리 기준값 분기(구 흐름)
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
import { checkRateLimit, clientIp, creditsBypassEnabled } from '@/lib/db';
import { getSessionEmail } from '@/lib/authToken';
import { API_ERROR_CODES } from '@/lib/apiErrors';
import { DEPTH_BASE } from '@/lib/sectionDepth';
import { getCategoryCopyGuard } from '@/lib/copyGuards';

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
  sectionCount?: number;
  productExtra?: string;
  /** ★설명 채우기 모드(2026-08-06) — 이미 있는 구조의 desc·suggestions만 받는다.
   *  구조는 그대로 두고 설명만 만든다: 레퍼런스·임시저장 복원·폴백으로 만들어진 목록도
   *  셀러에게는 설명이 보여야 하기 때문(구조가 있으면 설명도 있어야 한다). */
  existingSections?: string[];
}

export async function POST(req: NextRequest) {
  let body: ReqBody;
  try {
    body = await req.json() as ReqBody;
  } catch {
    return NextResponse.json({ error: '요청 본문 파싱 실패' }, { status: 400 });
  }

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

  const { cat, ch, productName, depth, sectionCount, productExtra } = body;
  const existing = Array.isArray(body.existingSections)
    ? body.existingSections.map(x => String(x ?? '').trim()).filter(Boolean).slice(0, 50)
    : [];
  const describeOnly = existing.length > 0;

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

  /* ★셀러가 고른 개수가 있으면 그게 답이다(2026-08-02).
   *  전에는 카테고리 기준값 × 채널 가중치로 우리가 정했다 — 셀러가 시작 화면에서 16섹션을
   *  고르고 20크레딧을 확인했는데도 쿠팡이면 0.5가 곱해져 8개가 나왔다(반대로 와디즈는 1.4배).
   *  고른 값과 만들어지는 값이 다르면 화면에 적힌 크레딧이 거짓이 된다.
   *  구 9단계 흐름은 sectionCount를 안 보내므로 종전 계산을 그대로 쓴다. */
  const chosen = Number(sectionCount);
  const targetCount = describeOnly
    ? existing.length
    : Number.isFinite(chosen) && chosen >= 6 && chosen <= 50
      ? Math.round(chosen)
      : computeTargetCount(cat, ch, depth);
  const normCat = normalizeCat(cat);

  const systemBase = `당신은 대한민국 이커머스 상세페이지 기획 전문가입니다.
카테고리·채널·상품·깊이를 보고 그 상품에 가장 효과적인 상세페이지 섹션 구성을 추천합니다.

${getCategoryCopyGuard(cat || '')}

[섹션 이름 원칙]
- 한국어. 이커머스 상세페이지에 실제로 쓰이는 명칭.
- 헤더 카피가 아닌 "섹션의 역할 이름"(예: "히어로", "성분 신뢰", "비교표", "사용법", "후기", "FAQ", "CTA").
- 카테고리 특성을 반영한 특화 섹션 포함 (예: 화장품→성분 신뢰, 식품→원산지 스토리, 패션→코디 제안, 가전→스펙/성능).
- 상품 특성(상품명, 핵심 정보)을 보고 필요한 섹션을 정확히 골라 넣을 것.
- 동일·중복 섹션 금지.
- 한 섹션 이름은 12자 이내 권장.
- ⚠️이름은 '효과 단정'이 아니라 '다룰 주제'로. 이름이 카피의 방향을 정하기 때문입니다.
    ✗ "트러블 진정 효과" · "주름 개선 효과"      ✓ "진정 성분 이야기" · "탄력 관리 루틴"
- ⚠️셀러가 갖고 있지 않을 재료를 요구하는 이름을 만들지 마세요 — 그 이름을 받으면 카피가 지어냅니다.
    ✗ "전문가 추천 코멘트" · "별점·리뷰 요약" · "임상 시험 결과" · "수상 이력"
- ⚠️섹션마다 desc(셀러가 읽을 한 줄 설명)를 함께 쓰세요. 이름만으로는 '병풀 성분 심층'이
  무엇을 담는 섹션인지 셀러가 알 수 없습니다. 셀러는 이 설명만 보고 뺄지 말지를 정합니다.

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
- 다른 텍스트 없이 JSON 객체 하나만: {"sections": [...], "suggestions": [...]}
- sections 길이는 정확히 ${targetCount}개. 모자라거나 넘치면 안 된다.
  ⚠️${targetCount}개는 적은 수가 아닙니다. 큰 주제를 한 섹션에 몰지 말고 각도를 나누세요
  (예: 성분 → 핵심 성분 / 성분별 역할 / 배합 이유 / 안전성 근거). 개수를 못 맞추면 실패입니다.
  각 원소는 {"name": "섹션 이름", "desc": "셀러가 읽을 한 줄 설명"}.

[suggestions — 이 구성에 '더하면 좋을' 섹션. 최대 5개, 없으면 빈 배열]
셀러는 이미 ${targetCount}개를 골랐습니다. 섹션을 더하면 크레딧이 더 나갑니다 —
근거 없이 채우면 그건 조언이 아니라 영업입니다. 아래를 지키세요.
- ⭐1순위: 셀러가 알려준 정보 중 위 구성에서 안 쓰인 것. 셀러가 자기 무기를 안 쓰고 있는 자리입니다.
  (예: 상품 정보에 '무알콜·무향료'가 있는데 그걸 다루는 섹션이 없다 → 그 섹션을 제안)
- 2순위: 이 카테고리에서 빠지면 이상한 축(화장품이면 성분·사용법·안전 / 식품이면 원산지·보관법).
- ⛔셀러가 주지 않은 재료를 요구하는 섹션은 절대 제안하지 마세요 —
  전문가 추천·수상·특허·인증번호·임상 시험·실제 후기·교환반품 규정.
  제안받은 셀러가 그대로 넣으면 카피가 없는 사실을 지어내고, 책임은 셀러가 집니다.
- ⛔위 sections에 이미 있는 주제를 다른 이름으로 다시 제안하지 마세요.
- ⛔셀러가 알려주지 않은 '사용 방법·상황·조합'을 새로 만들어내는 섹션은 제안하지 마세요 —
  예: 사용 방법이 '화장솜에 적셔 닦아내기'뿐인데 "면봉 활용법"·"부위별 사용 팁"·"계절별 사용법".
  셀러가 말한 적 없는 사용법이라 카피가 지어내게 됩니다.
  ✅단, 셀러가 준 사실을 '정리·요약'하는 섹션은 괜찮습니다(예: 어떤 고민을 가진 분께 맞는지 정리).
  제안의 역할은 이미 말한 사실에 '자리를 만들어 주는 것'이지, 없는 내용을 만들 자리를 여는 게 아닙니다.
- 판단 기준은 개수가 아니라 근거입니다. 섹션이 이미 많아도(32개라도) 셀러가 준 정보 중
  안 쓰인 것이 남아 있으면 제안하세요 — '많으니 충분하겠지'로 건너뛰지 마세요.
  반대로 억지로 채우지도 마세요. 근거가 없으면 그만큼만 내면 됩니다.
- 각 원소: {"name": "...", "desc": "무엇이 담기는지 한 줄",
  "why": "왜 이 상품에 필요한지 — 셀러가 준 정보를 근거로 한 줄",
  "basedOn": "위 [상품 핵심 정보]에서 그대로 옮겨 적은 짧은 구절(5~20자). 지어내지 말고 원문 그대로.
             근거로 삼을 구절이 없으면 빈 문자열 — 그건 셀러가 말한 적 없는 내용이라는 뜻입니다.",
  "after": 이 섹션이 들어갈 자리(위 sections의 순번, 이 번호 '뒤'에 삽입. 1~${targetCount})}`;

  const describeRule = describeOnly ? `

[⚠️최우선 규칙 — 설명 채우기 모드]
sections의 name은 아래 목록을 '순서 그대로, 글자 그대로' 써야 합니다. 새로 만들거나 바꾸거나
빼지 마세요. 당신의 일은 각 섹션의 desc(셀러가 읽을 한 줄 설명)를 쓰는 것뿐입니다.
${existing.map((n, i) => `${i + 1}. ${n}`).join('\n')}
suggestions는 위 [suggestions] 규칙 그대로 만들면 됩니다.` : '';

  const userPrompt = describeOnly ? `아래 섹션 구성의 설명을 채워주세요(구성은 바꾸지 마세요).

[조건]
- 카테고리: ${cat} (정규화: ${normCat})
- 판매 채널: ${ch}
- 상품명: ${productName || '(미입력)'}
${productExtra ? `\n[상품 핵심 정보]\n${productExtra}\n` : ''}
[현재 구성 — 이름을 그대로 유지]
${existing.map((n, i) => `${i + 1}. ${n}`).join('\n')}

[출력 형식]
다른 텍스트 없이 JSON 객체만: {"sections":[{"name":"(위 이름 그대로)","desc":"셀러가 읽을 한 줄 설명"}],"suggestions":[...]}` : `다음 조건의 상품을 위한 섹션 구성을 ${targetCount}개로 추천해주세요.

[조건]
- 카테고리: ${cat} (정규화: ${normCat})
- 판매 채널: ${ch}
- 상품명: ${productName || '(미입력)'}
- 깊이: ${depth}
${productExtra ? `\n[상품 핵심 정보]\n${productExtra}\n` : ''}
[출력 형식]
다른 텍스트 없이 JSON 객체만 반환하세요. 예시 형식:
{"sections":[
  {"name":"히어로","desc":"첫 화면에서 이 상품이 무엇이고 왜 봐야 하는지 한눈에 보여줘요"},
  {"name":"성분 이야기","desc":"병풀·판테놀을 왜 넣었는지 근거와 함께 설명해요"}],
 "suggestions":[
  {"name":"무알콜·무향료 이야기","desc":"알코올과 향료를 뺀 이유와 그래서 무엇이 달라지는지 보여줘요",
   "why":"적어주신 '무알콜·무향료'가 지금 구성에 안 쓰였어요 — 민감 피부가 가장 먼저 확인하는 부분입니다","after":5}]}`;

  const system = systemBase + describeRule;

  try {
    const message = await client.messages.create({
      // ★모델 비교용 스위치(2026-08-04) — 미설정 시 종전 모델 그대로. 프로덕션 동작 불변.
      model: process.env.RECOMMEND_MODEL || 'claude-sonnet-4-6',
      /* ★섹션 수에 맞춰 늘린다(2026-08-03) — 3000 고정이던 때 32섹션 요청이 잘려
       *  JSON 파싱에 실패했고, 클라이언트가 폴백으로 '추가 섹션 2·3·4…'를 깔았다.
       *  이름만 받던 시절의 값이라 desc·suggestions가 붙은 지금은 턱없이 모자랐다. */
      max_tokens: Math.min(16000, 2000 + targetCount * 220),
      system,
      messages: [{ role: 'user', content: userPrompt }],
    });

    if (!message.content || message.content.length === 0) {
      throw new Error('Claude 응답 비어있음');
    }
    /* ★첫 블록만 보지 않는다(2026-08-04) — 모델에 따라 thinking 블록이 앞에 오면
     *  content[0]이 텍스트가 아니어서 빈 문자열이 되고 "JSON을 찾을 수 없음"으로 죽는다.
     *  모델을 바꿔 볼 때마다 이 자리에서 걸리므로 텍스트 블록을 찾아 쓴다. */
    const raw = message.content
      .map(b => (b.type === 'text' ? b.text : ''))
      .join('\n');
    // ★원가 확인용 — 이 호출은 크레딧을 차감하지 않으므로 우리 원가만 남는다(2026-08-04)
    console.log(`[recommend-sections] cat=${normCat} ch=${ch} target=${targetCount} stop=${message.stop_reason} tokens in=${message.usage?.input_tokens ?? '-'} out=${message.usage?.output_tokens ?? '-'}`);

    /* 객체({sections,suggestions})가 기본이고, 배열만 온 구버전 응답도 계속 받는다 */
    const ob = raw.indexOf('{'), oe = raw.lastIndexOf('}');
    const ab = raw.indexOf('['), ae = raw.lastIndexOf(']');
    const useObj = ob !== -1 && oe > ob && (ab === -1 || ob < ab);
    if (!useObj && (ab === -1 || ae < ab)) {
      console.error('[recommend-sections] JSON 미발견. raw head:', raw.slice(0, 300));
      throw new Error('응답에서 JSON을 찾을 수 없음');
    }
    const jsonText = useObj ? raw.slice(ob, oe + 1) : raw.slice(ab, ae + 1);

    /* 잘린 응답이라도 완성된 항목은 건진다 — 전부 버리고 폴백으로 가면
       화면에 뜻 없는 섹션이 깔린다(그게 셀러가 본 고장이다). */
    const salvage = (txt: string): Array<{ name: string; desc?: string }> => {
      const out: Array<{ name: string; desc?: string }> = [];
      for (const m of txt.matchAll(/\{\s*"name"\s*:\s*"([^"]{1,40})"(?:\s*,\s*"desc"\s*:\s*"([^"]{0,200})")?/g)) {
        out.push({ name: m[1].trim(), desc: m[2]?.trim() || undefined });
      }
      return out;
    };

    let parsedRoot: unknown;
    let suggestions: Array<{ name: string; desc?: string; why?: string; after?: number; basedOn?: string }> = [];
    try {
      parsedRoot = JSON.parse(jsonText);
    } catch (parseErr) {
      const pmsg = parseErr instanceof Error ? parseErr.message : String(parseErr);
      const saved = salvage(jsonText);
      if (saved.length >= 3) {
        console.warn(`[recommend-sections] JSON 잘림 — 완성된 ${saved.length}개만 살림: ${pmsg}`);
        parsedRoot = saved;
      } else {
        console.error(`[recommend-sections] JSON.parse 실패: ${pmsg}\nraw:\n${jsonText.slice(0, 500)}`);
        throw new Error(`JSON 파싱 실패: ${pmsg}`);
      }
    }

    let sections: unknown = parsedRoot;
    if (!Array.isArray(parsedRoot) && parsedRoot && typeof parsedRoot === 'object') {
      const root = parsedRoot as Record<string, unknown>;
      sections = root.sections;
      if (Array.isArray(root.suggestions)) {
        suggestions = (root.suggestions as unknown[])
          .map(x => (x && typeof x === 'object' ? x as Record<string, unknown> : null))
          .filter((x): x is Record<string, unknown> => !!x && typeof x.name === 'string' && String(x.name).trim().length > 0)
          .slice(0, 5)   // ★최대 5개 — 더 늘리면 '추천'이 아니라 또 하나의 목록이 된다
          .map(x => ({
            name: String(x.name).trim(),
            desc: x.desc ? String(x.desc).trim() : undefined,
            why:  x.why  ? String(x.why).trim()  : undefined,
            after: Number.isFinite(Number(x.after)) ? Math.round(Number(x.after)) : undefined,
            basedOn: x.basedOn ? String(x.basedOn).trim() : '',
          }));
      }
    }
    if (!Array.isArray(sections)) {
      throw new Error(`sections가 배열이 아님: ${typeof sections}`);
    }

    /* 객체({name,desc})와 문자열 양쪽을 받는다 — 모델이 형식을 어겨도 이름은 건진다 */
    const seen = new Set<string>();
    let items: Array<{ name: string; desc?: string }> = [];
    for (const raw of sections as unknown[]) {
      const name = typeof raw === 'string' ? raw.trim()
        : (raw && typeof raw === 'object' ? String((raw as Record<string, unknown>).name ?? '').trim() : '');
      if (!name || seen.has(name)) continue;
      seen.add(name);
      const desc = (raw && typeof raw === 'object')
        ? String((raw as Record<string, unknown>).desc ?? '').trim() : '';
      items.push(desc ? { name, desc } : { name });
    }
    const cleaned = items.map(i => i.name);

    if (cleaned.length === 0) {
      throw new Error('유효한 섹션 이름이 없습니다.');
    }

    /* ★개수를 코드로 확정한다 — 프롬프트만으로는 모델이 한두 개씩 어긋난다.
     *  셀러가 본 개수(=크레딧)와 실제 구성이 달라지면 안 되므로, 넘치면 뒤에서 자르되
     *  마지막 섹션(CTA)은 남기고, 모자라면 흔한 보강 섹션으로 채운다. */
    /* ★모자란 만큼 채울 때 뜻 없는 이름을 쓰지 않는다(2026-08-03).
     *  전엔 예비 8개를 쓴 뒤 '추가 섹션 2·3·4…'로 채웠다 — 32섹션에서 모델이 18개만 주자
     *  화면에 뜻 없는 자리표시자가 14개 깔렸다. 셀러에겐 그냥 고장으로 보인다.
     *  실제로 쓰이는 이름 풀에서 채우고, 그래도 모자라면 개수를 줄인다 —
     *  뜻 없는 섹션을 만들어 크레딧을 받느니 적게 만드는 편이 낫다. */
    const POOL = [
      '상세 스펙', '사용 시나리오', '자주 묻는 질문', '배송/교환 안내', '브랜드 소개', '비교표',
      '후기', '보관/관리', '구성품 안내', '사용 전 확인', '이런 분께', '재구매 이유',
      '색상·옵션 안내', '가격 안내', '주의사항', '사용 순서', '함께 쓰면 좋은 것', '브랜드 약속',
      '제품 특징 요약', '만족도 포인트', '선택 가이드', '사이즈·용량 안내', '관리 팁', '첫 사용 안내',
    ];
    let sized = cleaned;
    if (cleaned.length > targetCount) {
      const tail = cleaned[cleaned.length - 1];
      sized = [...cleaned.slice(0, targetCount - 1), tail];
    } else if (cleaned.length < targetCount) {
      sized = [...cleaned];
      const tail = sized.pop() as string;                 // 마지막(CTA)은 항상 끝에 둔다
      for (const f of POOL) {
        if (sized.length >= targetCount - 1) break;
        if (!sized.includes(f) && f !== tail) sized.push(f);
      }
      sized.push(tail);
      if (sized.length < targetCount) {
        console.warn(`[recommend-sections] ${targetCount}개 요청에 ${sized.length}개 — 뜻 없는 이름으로 채우지 않음`);
      }
    }

    /* ★설명 채우기 모드에선 이름을 코드가 고정한다 — 프롬프트로 "그대로 쓰라"고 해도 모델은
     *  다듬는다. 이름이 어긋나면 설명이 화면의 어느 섹션에도 안 붙어 '설명 없음'으로 되돌아간다.
     *  순번으로 맞추고, 개수가 모자라면 그만큼만 채운다. */
    if (describeOnly) {
      sized = [...existing];
      items = existing.map((name, i) => ({ name, desc: items[i]?.desc }));
    }

    const descByName: Record<string, string> = {};
    for (const it of items) if (it.desc) descByName[it.name] = it.desc;

    return NextResponse.json({
      sections: sized,
      // ★셀러가 '이게 뭔지' 판단하는 유일한 근거 — 용어집은 AI가 짓는 이름을 따라갈 수 없다
      sectionDescs: descByName,
      // ★'더하면 좋을' 섹션 — 이미 이 상품을 분석한 호출에 얹으므로 추가 원가 0
      /* ★근거를 코드가 확인한다(2026-08-03) — 프롬프트로 '응용하지 말라'고 해도 모델은
       *  "이미 주신 사용법을 구체화하는 자리"처럼 스스로 정당화한다(실측: 화장솜 선택 가이드).
       *  셀러 입력에 실제로 있는 구절인지 대조해, 없으면 '재료를 더 적어야 하는 제안'으로 표시한다.
       *  막지는 않는다 — 셀러가 그 정보를 갖고 있을 수도 있으니 판단은 셀러가 한다. */
      suggestions: suggestions.filter(x => !seen.has(x.name)).map(x => {
        const hay = `${productName ?? ''}\n${productExtra ?? ''}`.replace(/\s/g, '');
        const cite = (x.basedOn ?? '').replace(/\s/g, '');
        return { ...x, grounded: cite.length >= 2 && hay.includes(cite) };
      }),
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
