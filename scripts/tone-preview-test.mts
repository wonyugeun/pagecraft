/**
 * 어투 미리보기 품질 검증 — 라우트와 같은 프롬프트를 그대로 써서 실제 문장을 뽑아 본다.
 * 재료 없음(상품명만) / 재료 있음 두 경우를 나란히 보고, 양식 설명형 문장이 사라졌는지 확인.
 *   npx tsx scripts/tone-preview-test.mts
 */
import { readFileSync } from 'node:fs';
import { SPEECH_LEVELS } from '../data/speechLevels';

for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_0-9]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}

const MODEL = 'gpt-5.6-luna';
const levels = SPEECH_LEVELS.map(l => `- ${l.key}: ${l.rule}`).join('\n');

const system = `당신은 한국 이커머스 상세페이지 카피라이터입니다.
아래 상품의 첫 화면(히어로) 카피를 어투별로 각각 1개씩 씁니다.

[어투 정의]
${levels}

[규칙]
- 각 어투마다 headline 1줄(20~35자)과 body 2줄을 씁니다. body의 줄바꿈은 \\n.
- 같은 메시지를 어투만 바꿔 표현하세요. 어미뿐 아니라 문장 길이·호흡도 어투에 맞게 바꿉니다.
- ⚠️상품이 아니라 화면·양식을 설명하는 문장은 카피가 아닙니다. 아래는 전부 금지:
  "제품 정보를 확인합니다" / "제품명은 ○○, 용량은 ○○입니다" / "제품 기본 정보" /
  "상품 정보를 확인하시기 바랍니다" — 정보를 나열하지 말고, 그 정보가 손님에게 무엇인지를 쓰세요.
- headline은 손님이 얻는 것이나 손님이 처한 상황으로 시작합니다.
  상품명·용량을 나열하며 시작하지 마세요(상품명은 필요할 때 한 번만, 자연스럽게).
- ⚠️셀러가 준 정보 밖의 성분·수치·효능·인증·후기를 절대 만들지 마세요.
  다만 상품 종류에서 누구나 아는 사용 맥락(크림은 바른다, 밀키트는 끓인다)은 써도 됩니다.
  재료가 적으면 짧고 담백하게 쓰세요 — 없는 사실로 길이를 채우지 마세요.
- 과장 최상급 표현(최고·1위·유일·100%) 금지.
- JSON 배열로만 출력: [{"level":"해요체","headline":"...","body":"...\\n..."}, ...] — ${SPEECH_LEVELS.length}개, 다른 텍스트 없이.`;

function buildUser(productName: string, facts: Array<[string, string]>) {
  const lines = facts.map(([l, v]) => `- ${l}: ${v}`);
  const thin = lines.length < 3;
  return {
    thin,
    text: `[상품명] ${productName}
${lines.length ? `[셀러가 알려준 정보]\n${lines.join('\n')}` : '(상품명 외에 알려준 정보가 없습니다)'}
${thin ? '\n※ 재료가 적습니다. 없는 사실을 채워 넣지 말고, 짧더라도 손님에게 말을 거는 문장으로 쓰세요.' : ''}`,
  };
}

/** 양식 설명형 — 상품이 아니라 화면을 설명하는 문장(이번에 없애려는 것) */
const META = /제품\s*정보|상품\s*정보|제품명은|용량은\s*\d|기본\s*정보|확인하시기\s*바랍|확인해\s*보세요\.?$/;

const CASES: Array<{ title: string; name: string; facts: Array<[string, string]> }> = [
  { title: '재료 없음 — 상품명만', name: '닥터자르트 크림 50ml', facts: [] },
  {
    title: '재료 있음 — 폼을 채운 상태', name: '닥터자르트 크림 50ml',
    facts: [
      ['카테고리', '화장품'], ['제형/형태', '크림'], ['용량/사이즈', '50ml'],
      ['화장품 종류', '수분크림'], ['주요 피부 고민', '건조함, 각질, 민감함'],
      ['핵심 성분', '판테놀, 세라마이드, 히알루론산'],
      ['사용 방법', '세안 후 토너 다음 단계에 소량 도포'],
      ['차별점', '끈적임 없이 얇게 발려서 아침 메이크업 전에도 쓸 수 있음'],
    ],
  },
  {
    title: '다른 카테고리 — 식품', name: '제주 접짝뼈국 밀키트 800g',
    facts: [
      ['카테고리', '식품'], ['용량/사이즈', '800g (2인분)'],
      ['보관 방법', '냉동 보관, 해동 후 15분 끓이기'],
      ['원산지', '제주산 돼지 등뼈'],
      ['차별점', '제주 향토음식점 레시피 그대로, 조미료 없이 뼈만 12시간 우림'],
    ],
  },
];

for (const c of CASES) {
  const u = buildUser(c.name, c.facts);
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: 'system', content: system }, { role: 'user', content: u.text }],
      max_completion_tokens: 2000,
    }),
  });
  const j = await res.json() as any;
  const raw = j.choices?.[0]?.message?.content ?? '';
  if (!raw) { console.log(`\n### ${c.title}\n실패:`, JSON.stringify(j).slice(0, 300)); continue; }
  const arr = JSON.parse(raw.slice(raw.indexOf('['), raw.lastIndexOf(']') + 1)) as Array<{ level: string; headline: string; body: string }>;

  console.log(`\n${'='.repeat(70)}\n### ${c.title}  (재료 ${c.facts.length}개${u.thin ? ' · thin' : ''})\n${'='.repeat(70)}`);
  let bad = 0;
  for (const x of arr) {
    const hit = META.test(x.headline) || META.test(x.body);
    if (hit) bad++;
    console.log(`\n[${x.level}]${hit ? '  ⚠️양식 설명형' : ''}\n  ${x.headline}\n${x.body.split('\n').map(l => '  ' + l).join('\n')}`);
  }
  console.log(`\n→ 양식 설명형 ${bad}/${arr.length}`);
}
