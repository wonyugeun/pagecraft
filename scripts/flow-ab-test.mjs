/**
 * 카피 설득 흐름 A/B 테스트 — 격리(copy.ts 미접촉).
 *
 * 가설: 현재 카피는 Hero가 "제품 선언"부터 시작(writing_style=선언형).
 *       시작점을 "독자 상황·의심·경험"으로 바꾸고 제품(품종/식감)은 흐름 뒤에 배치하면 더 나은가?
 *
 * 방법:
 *  - OLD = 저장본(factguard-case1.json)의 Hero+공감+솔루션 3섹션 (API 호출 0)
 *  - NEW = 같은 전략/구조/입력사실로, "새 흐름" system 프롬프트만 바꿔 Anthropic 1회 호출
 *  - 같은 모델(claude-sonnet-4-6), 텍스트만, 이미지 0
 *  - 날조가드: 출력에 입력(DNA/strategy/OLD)에 없는 새 숫자가 등장하는지 자동 검사
 *
 * 실행: node scripts/flow-ab-test.mjs
 */
import Anthropic from '@anthropic-ai/sdk';
import { readFileSync, writeFileSync } from 'node:fs';
import { Agent, setGlobalDispatcher } from 'undici';
setGlobalDispatcher(new Agent({ headersTimeout: 0, bodyTimeout: 0 }));

// .env.local 수동 로드 (dotenv 미설치)
const env = readFileSync('.env.local', 'utf8');
const KEY = (env.match(/^ANTHROPIC_API_KEY=(.+)$/m) || [])[1]?.trim();
if (!KEY) { console.error('ANTHROPIC_API_KEY 없음(.env.local)'); process.exit(1); }
const client = new Anthropic({ apiKey: KEY });

// 인자: [1]=저장본 파일명(_prototype_out/ 기준), [2]=라벨(출력 파일 접미). 기본=단호박.
const CASE = process.argv[2] || 'factguard-case1.json';
const LABEL = process.argv[3] || 'bamhobak';
const j = JSON.parse(readFileSync(`_prototype_out/${CASE}`, 'utf8'));
const dna = j.dna, strat = j.strategy;
const old3 = j.sections.slice(0, 3);

// 전략 요약 7필드 (production과 동일 소스)
const ss = {
  main_weapon: dna.main_weapon, concept: strat.concept, hero_angle: strat.hero_angle,
  target_desire: dna.target_desire, target_fear: dna.target_fear,
  story_flow: strat.story_flow, tone: strat.tone,
};
const sects = old3.map(s => ({ name: s.name, role: s.role, mission: s.mission, emotion_goal: s.emotion_goal }));

// ── NEW-FLOW system 프롬프트 ── (production copy.ts 미접촉. 이 실험 전용)
const NEW_SYSTEM = `당신은 한국 이커머스 상세페이지 카피라이터입니다. 아래 전략과 섹션 계획에 맞춰 블로그형 본문 카피를 씁니다.

[이번 실험의 핵심 — 설득 시작점 전환]
기존 카피는 첫 섹션(Hero)에서 "제품이 무엇인지"를 선언하며 시작합니다(예: "전자레인지 3분, 국내산 밤호박 간편 조리"). 이번엔 그 반대로 씁니다.
- 시작점 = 제품이 아니라 "독자의 상황·감정·의심·경험·발견"입니다.
- 등장 순서: ① 독자 속마음/의심/경험 → ② 발견의 전환("그런데…") → ③ 그제서야 제품(품종·조리법·식감) 등장 → ④ 근거.
- 특히 Hero는 제품명을 첫 문장에 두지 마세요. 독자의 의심이나 흔한 경험으로 문을 엽니다(예: "전자레인지로 호박이 제대로 익겠어? 보통은 안 믿죠.").
- 제품 정보(품종·조리시간·식감·가격·중량)는 절대 빼지 마세요. "먼저"가 아니라 "흐름 뒤"에 배치할 뿐입니다. 정보 누락 0.

[Hero 길이 상한 — 엄수]
- Hero(첫 섹션)는 subcopy + body를 합쳐 3~4줄 이내로. 모바일 첫 화면처럼 타이트하게.
- 의심으로 여는 시작점은 유지하되, 늘어지지 마세요. 군더더기 문장 금지. 핵심만.
- (공감·솔루션 등 이후 섹션은 이 줄 수 제한 없음 — 자연스러운 호흡대로.)

[문체 — v5 유지]
- 짧은 문장이 줄바꿈(\\n)으로 끊겨 흐르는 대화체.
- 독자의 속마음을 대신 말해주듯. 친구가 말 걸듯.
- 과장·미사여구 금지. 담백하게.

[사실 가드 — 엄수]
- 아래 입력(전략·섹션)에 등장하는 사실·수치만 사용하세요.
- 입력에 없는 새 수치(당도/Brix/숫자), 없는 품종·원산지 주장을 만들지 마세요. 후기·별점·작성자명 날조 금지.
- 수사적 숫자 금지: 입력에 없는 시간·수치를 지어내지 마세요("20분", "30분", "한 시간" 등). "오래 걸린다", "한참 기다려야 한다"처럼 숫자 없이 표현하세요. (입력에 있는 "3분"은 사용 가능.)

[출력 형식] — 다른 텍스트 없이 JSON 배열만. 길이는 정확히 ${sects.length}개:
[
  { "name": "섹션 이름(입력과 동일)", "headline": "헤드라인", "subcopy": "서브카피 1줄", "body": "본문 — v5 호흡(짧은문장 \\n). 위 시작점 전환 규칙 적용" }
]`;

const USER = `[전략 요약]
${JSON.stringify(ss, null, 2)}

[섹션 계획] (이 순서·역할 그대로, 본문 흐름만 새 규칙으로)
${JSON.stringify(sects, null, 2)}`;

// 날조 검사 — "단위가 붙은 수치"만 본다(분/시간/원/kg/%/도/Brix/개입/일 등). "Step 1" 같은 순수 번호는 제외.
const UNIT = '분|시간|초|일|원|kg|g|개입|개|%|퍼센트|도|brix|Brix|당도';
function unitNums(str) {
  return new Set((String(str).match(new RegExp(`\\d[\\d,.]*\\s*(?:${UNIT})`, 'g')) || []).map(t => t.replace(/\s+/g, '')));
}
const allowed = unitNums(JSON.stringify(ss) + JSON.stringify(sects) + old3.map(s => `${s.headline}\n${s.subcopy}\n${s.body}`).join('\n'));

const run = async () => {
  console.log('[flow-ab] NEW 흐름 생성 중 (claude-sonnet-4-6, 3섹션, 텍스트만)…');
  const msg = await client.messages.create({
    model: 'claude-sonnet-4-6', max_tokens: 4000,
    system: NEW_SYSTEM, messages: [{ role: 'user', content: USER }],
  });
  const raw = msg.content[0]?.type === 'text' ? msg.content[0].text : '';
  const a = raw.indexOf('['), b = raw.lastIndexOf(']');
  const NEW = JSON.parse(raw.slice(a, b + 1));
  writeFileSync(`_prototype_out/flow-ab-${LABEL}.json`, JSON.stringify(NEW, null, 2));

  // 날조 숫자 검사
  const fabricated = [];
  for (const s of NEW) for (const n of unitNums(`${s.headline} ${s.subcopy} ${s.body}`)) if (!allowed.has(n)) fabricated.push(n);

  const sep = '═'.repeat(72);
  for (let i = 0; i < NEW.length; i++) {
    console.log('\n' + sep + `\n  [${i}] ${old3[i].name}  (writing_style: ${old3[i].writing_style?.split(' ')[0] || ''})\n` + sep);
    console.log('\n──── OLD (현재 = 제품 선언 시작) ────');
    console.log('H:', old3[i].headline);
    console.log('S:', old3[i].subcopy);
    console.log(old3[i].body);
    console.log('\n──── NEW (독자 의심/경험 시작) ────');
    console.log('H:', NEW[i].headline);
    console.log('S:', NEW[i].subcopy);
    console.log(NEW[i].body);
  }
  console.log('\n' + sep);
  console.log(fabricated.length ? `⚠️ 입력에 없는 숫자 발견: ${[...new Set(fabricated)].join(', ')}` : '✅ 날조 숫자 0 (입력에 없는 수치 없음)');
  console.log(`usage: in=${msg.usage?.input_tokens} out=${msg.usage?.output_tokens} | case=${CASE} | 저장: _prototype_out/flow-ab-${LABEL}.json`);
};
run().catch(e => { console.error(e); process.exit(1); });
