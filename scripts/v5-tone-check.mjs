/**
 * v5 문체 복원 검증 — 같은 섹션(전략·구조·mission·emotion_goal·writing_style 고정)을
 * /api/copy(청크모드)로 재생성해 OLD(저장본) vs NEW(현재 프롬프트) 문체/정보 비교.
 * 문체만 바뀌고 정보는 동일해야 성공.
 */
import { Agent, setGlobalDispatcher } from 'undici';
import { readFileSync, writeFileSync } from 'node:fs';
setGlobalDispatcher(new Agent({ headersTimeout: 0, bodyTimeout: 0 }));
const BASE = process.env.BASE_URL || 'http://localhost:3000';
const load = f => JSON.parse(readFileSync(`_prototype_out/${f}`, 'utf8'));

function ssFrom(dna, strat) {
  return {
    main_weapon: dna.main_weapon, concept: strat.concept, hero_angle: strat.hero_angle,
    target_desire: dna.target_desire, target_fear: dna.target_fear,
    story_flow: strat.story_flow, tone: strat.tone,
  };
}
const sectFields = s => ({ name: s.name, role: s.role, mission: s.mission, emotion_goal: s.emotion_goal, writing_style: s.writing_style });

function metrics(body) {
  const nl = (body.match(/\n/g) || []).length;
  const q = (body.match(/\?/g) || []).length;
  const sentences = body.split(/[.?!\n]/).map(t => t.trim()).filter(Boolean);
  const avgLen = sentences.length ? Math.round(sentences.reduce((a, s) => a + s.length, 0) / sentences.length) : 0;
  const convo = (body.match(/있으시죠|하셨나요|않으셨나요|없으셨나요|거예요|괜찮을까|사실은|드셨나요|하지 않으셨/g) || []).length;
  return { nl, q, sentences: sentences.length, avgLen, convo };
}

async function regen(product, file, cat, N) {
  const j = load(file);
  const ss = ssFrom(j.dna, j.strategy);
  const sample = j.sections.slice(0, N);
  const res = await fetch(`${BASE}/api/copy`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ strategySummary: ss, startIndex: 0, totalSections: j.sections.length, sections: sample.map(sectFields), cat, ch: '스마트스토어', out: 'blog', depth: '간결' }),
  });
  const out = await res.json();
  if (out.error) { console.log(`✗ ${product}: ${out.error}`); return; }
  writeFileSync(`_prototype_out/v5tone-${product}.json`, JSON.stringify(out.sections, null, 2));
  console.log(`\n████ ${product} (${cat}) ████`);
  out.sections.forEach((nw, i) => {
    const old = j.sections[i];
    const mo = metrics(old.body), mn = metrics(nw.body);
    console.log(`\n── ${nw.name} ──`);
    console.log(`OLD m: \\n=${mo.nl} ?=${mo.q} 문장=${mo.sentences} 평균길이=${mo.avgLen} 대화체=${mo.convo}`);
    console.log(`NEW m: \\n=${mn.nl} ?=${mn.q} 문장=${mn.sentences} 평균길이=${mn.avgLen} 대화체=${mn.convo}`);
    console.log(`NEW body:\n${nw.body}`);
  });
}

await regen('leafgreen', 'pipeline-test.json', '화장품', 4);
await regen('bamhobak', 'factguard-case1.json', '식품', 4);
console.log('\n[완료] 저장: _prototype_out/v5tone-*.json');
