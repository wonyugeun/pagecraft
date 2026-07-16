/**
 * Creative Director 스테이지 (Clean Baseline Phase B, 2026-07-16) — 페이지당 1회.
 *
 * 역할: 제품 사진을 '직접 보고' 상품정보만으로 페이지 광고 컨셉과 섹션별 목적을 결정한다.
 * 이 출력이 buildSectionBrief(lib/adBrief)의 입력이 되어 전 섹션 이미지 브리프를 이끈다.
 * 시스템은 사실·보존 가드만 통제하고, 구도·배치는 촬영 단계(gpt-image)가 판단한다
 * (Phase A 스크래치 검증: 제품별 컨셉 발산·섹션 멀티패널 자발 출현·페이지 세계관 연결 확인).
 *
 * 컨셉 시드 회전: 같은 제품이라도 jobKey가 다르면 후보 3개 중 다른 컨셉이 선택되도록
 * 결정적 시드(jobKey 해시)를 프롬프트에 지정한다 — 100페이지 동일 수렴 방지. 랜덤 없음:
 * 같은 jobKey(=무료 재시도)는 항상 같은 컨셉.
 */
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = 'claude-sonnet-4-6';
const MAX_TOKENS = 4000;

export interface DirectorSectionIn { name: string; headline?: string; subcopy?: string }

export interface DirectorPlan {
  product_understanding: string;
  concept_candidates: string[];
  selected_concept: string;
  person: { use: boolean; spec?: string };
  sections: {
    name: string;
    show: string;
    /** 이 섹션의 시각 단위(디렉터 결정) — 예: 질감 매크로, 제품+콜아웃, 타이포그래피 온리 */
    format?: string;
    /** 이 섹션에 인물이 등장하는가(섹션별 결정 — 인물 스펙은 페이지 수준 person.spec 공유) */
    person?: boolean;
  }[];
}

export interface DirectorInput {
  productName?: string;
  productExtra?: string;
  diff?: string;
  brand?: string;
  cat?: string;
  ch?: string;
  sections: DirectorSectionIn[];
  /** 셀러 제품 사진 1장(dataURL) — 디렉터가 직접 봄. 없으면 텍스트만으로 기획(폴백). */
  productImage?: string | null;
  /** 결제 멱등키 — 컨셉 시드 소스(결정적 회전) */
  jobKey?: string | null;
}

/** 결정적 문자열 해시 → 0..n-1 (FNV-1a 축약). 랜덤 금지 원칙 하의 컨셉 회전 시드. */
export function seedIndex(key: string | null | undefined, n: number): number {
  if (!key || n <= 1) return 0;
  let h = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return Math.abs(h) % n;
}

function parseDataUrl(dataUrl: string): { media: string; data: string } | null {
  const m = dataUrl.match(/^data:(image\/(?:png|jpeg|webp|gif));base64,(.+)$/);
  return m ? { media: m[1], data: m[2] } : null;
}

const ALLOWED_MEDIA = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'] as const;

export async function runDirector(input: DirectorInput): Promise<DirectorPlan> {
  const { productName, productExtra, diff, brand, cat, ch, sections, productImage, jobKey } = input;
  const seed = seedIndex(jobKey ?? productName ?? '', 3) + 1;   // 1..3

  const facts = [
    productName ? `제품명: ${productName}` : '',
    cat ? `카테고리: ${cat}` : '',
    ch ? `판매 채널: ${ch}` : '',
    productExtra ? `특징: ${productExtra}` : '',
    diff ? `차별점: ${diff}` : '',
    brand ? `브랜드: ${brand}` : '',
  ].filter(Boolean).join('\n');

  const sectionList = sections.map((s, i) =>
    `${i + 1}. ${s.name}${s.headline ? ` — 카피: "${s.headline.replace(/\n/g, ' ')}"${s.subcopy ? ` / "${s.subcopy}"` : ''}` : ''}`,
  ).join('\n');

  const prompt = `당신은 한국 이커머스 상세페이지의 크리에이티브 디렉터입니다. ${productImage ? '첨부된 제품 사진을 직접 보고, ' : ''}아래 상품정보만을 사실로 사용해 이 제품의 상세페이지 광고를 기획하세요.

출력은 JSON만:
{
 "product_understanding": "제품이 무엇이고, 누가, 왜 사는지 2~3문장",
 "concept_candidates": ["이 제품에 가능한 서로 확연히 다른 페이지 광고 컨셉 3개 — 각 1문장. 장면·세계관 아이디어이지 구도·배치가 아님"],
 "selected_concept": "선택한 컨셉을 2~3문장으로 구체화 — 왜 이 제품·이 구매자에게 설득력 있는지 포함",
 "person": { "use": true 또는 false, "spec": "페이지에서 인물을 한 번이라도 쓴다면 누구인지(성별·연령대·상황·분위기) 1문장 — 성별을 명시하세요. 페이지 전체에서 안 쓰면 빈 문자열" },
 "sections": [ { "name": "섹션명(입력과 동일)", "show": "이 섹션이 컨셉 세계관 안에서 말할 것 1~2문장", "format": "이 섹션의 시각 단위 1문장", "person": 이 섹션에 인물이 등장하면 true, 아니면 false } ]
}

규칙:
- 상품정보에 없는 효능·수치·인증·성분을 만들지 마세요.
- 구도·배치·중앙·좌우·존·카메라 같은 화면 설계 용어를 쓰지 마세요 — 그것은 촬영 단계가 판단합니다. format은 '무엇으로 보여줄지'(시각 단위)이지 '어디에 배치할지'가 아닙니다.
- ★각 섹션은 그 섹션의 질문 하나에 답하는 최소한의 시각 단위만 씁니다. 시각 단위의 예: 인물 화보 / 제품+성분·특징 콜아웃 / 질감·발림 매크로(손·표면, 얼굴 없음) / 문제 상태 증거 클로즈업 / 셀러 사실만으로 만든 도식·아이콘 정보그래픽 / 타이포그래피 온리(사진 없음) / 제품 단독 연출 — 이 예시에 없는 단위도 그 섹션에 더 적합하면 자유롭게 정하세요.
- ★인물은 사용하는 순간의 감정을 파는 소수 섹션에만 등장시키세요(전체 섹션의 1/3 이하). 성분·근거·사용법·FAQ·가격 같은 정보 섹션에 인물이 있을 이유가 없습니다. 좋은 상세페이지는 섹션마다 시각 단위가 달라집니다 — 같은 장면의 반복은 실패입니다.
- ★상품정보에 시험·임상 자료가 없는 한, 효능 실증형 비교 연출은 금지합니다 — 사용 전/후 피부 대비, 타제품 사용 시와의 피부 상태 대비 모두. '전후 비교' 같은 섹션명이 오더라도 그 섹션은 다른 방식(사용감·질감·저자극 처방의 근거 등)으로 재해석하세요.
- 다른 브랜드·라벨이 있는 용기는 절대 연출하지 마세요. 문제 상황 묘사에 필요하면 라벨 없는 무지 용기만 허용됩니다.
- 컨셉이 이 제품이어야만 하는 이유가 상품정보 안에 있어야 합니다(어느 제품에나 붙는 컨셉 금지).
- ★이번 페이지의 컨셉 시드는 ${seed}번입니다: 후보 3개를 만든 뒤 ${seed}번째 후보를 선택해 구체화하세요. 단 ${seed}번째가 이 제품에 명백히 부적합하다면 더 적합한 후보를 선택해도 됩니다(그 사유를 selected_concept 안에 한 문장으로).
- 섹션 목록의 모든 섹션에 대해 sections 항목을 만드세요.
- JSON 외 다른 텍스트 금지.

[상품정보]
${facts}

[섹션 목록]
${sectionList}`;

  const img = productImage ? parseDataUrl(productImage) : null;
  const content: Anthropic.MessageParam['content'] = img && (ALLOWED_MEDIA as readonly string[]).includes(img.media)
    ? [
        { type: 'image', source: { type: 'base64', media_type: img.media as typeof ALLOWED_MEDIA[number], data: img.data } },
        { type: 'text', text: prompt },
      ]
    : [{ type: 'text', text: prompt }];

  const msg = await client.messages.create({
    model: MODEL, max_tokens: MAX_TOKENS,
    messages: [{ role: 'user', content }],
  });
  const raw = msg.content[0]?.type === 'text' ? msg.content[0].text : '';
  const json = raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1);
  const plan = JSON.parse(json) as DirectorPlan;

  // 최소 형태 검증 — 깨진 출력이면 throw(라우트에서 폴백 처리)
  if (!plan.selected_concept || !Array.isArray(plan.sections) || plan.sections.length === 0) {
    throw new Error('디렉터 출력 형식 오류');
  }
  const personSections = plan.sections.filter(s => s.person).length;
  console.log(`[director] cat=${cat} seed=${seed} person=${plan.person?.use}(${personSections}/${plan.sections.length}섹션) concept="${plan.selected_concept.slice(0, 50)}..."`);
  return plan;
}
