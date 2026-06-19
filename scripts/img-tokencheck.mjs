/**
 * imagebrief(Stage4 V2) max_tokens 잘림 수정 검증.
 * ① 보우짱 밤호박(식품) — full /api/pipeline (원 에러 경로 그대로 재현)
 * ② 리프그린(화장품) 16섹션 — /api/imagebrief (2청크)
 * ③ 풍부형 33섹션 — /api/imagebrief (5청크)
 * 각각: 잘림(max_tokens) 0건, JSON 정상 파싱, image_mission 7필드 유지 확인.
 *
 * 실행:  node scripts/img-tokencheck.mjs   (dev 서버 :3000 필요)
 */
import { Agent, setGlobalDispatcher } from 'undici';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// full pipeline은 수분 소요 → undici 기본 headers/body 타임아웃 해제 (pipeline-resume.ts와 동일)
setGlobalDispatcher(new Agent({ headersTimeout: 0, bodyTimeout: 0 }));

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const ROOT = process.cwd();
const IM_FIELDS = ['purpose', 'emotion', 'desired_reaction', 'target_desire_link', 'visual_focus', 'product_visibility', 'visual_priority'];

async function post(path, body) {
  const t0 = Date.now();
  const res = await fetch(`${BASE}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, json, sec: ((Date.now() - t0) / 1000).toFixed(1) };
}

function checkBriefs(briefs, label) {
  if (!Array.isArray(briefs) || briefs.length === 0) { console.log(`  ✗ ${label}: briefs 없음`); return false; }
  let im7 = 0;
  for (const b of briefs) {
    const im = b.image_mission || {};
    if (IM_FIELDS.every(f => f in im)) im7++;
  }
  const ok = im7 === briefs.length;
  console.log(`  ${ok ? '✓' : '✗'} ${label}: briefs=${briefs.length}, image_mission 7필드 완비=${im7}/${briefs.length}`);
  // 샘플 1개 출력
  const s = briefs[0];
  console.log(`     예) "${s.section}" vis=${s.image_mission?.product_visibility}% shot="${s.shot_type}"`);
  return ok;
}

(async () => {
  let allOk = true;

  // ① 밤호박 — full pipeline (식품)
  console.log('\n[① 보우짱 밤호박 / 식품 / full pipeline]');
  const food = await post('/api/pipeline', {
    cat: '식품', ch: '스마트스토어', out: 'blog', depth: '간결',
    productName: '보우짱 구운 밤호박 320g',
    productExtra: [
      '브랜드: 보우짱', '정가 15,900원 / 판매가 11,900원',
      '제주산 밤호박을 통째로 구워 급속냉동, 전자레인지 3분',
      '무첨가(설탕·보존료 무첨가), 1팩 2개입, 식이섬유·베타카로틴',
      '타겟: 다이어트/이유식/간식 찾는 2030 여성',
    ].join('\n'),
  });
  if (food.json.error) { console.log(`  ✗ 에러: ${food.json.error}`); allOk = false; }
  else {
    const briefs = (food.json.sections || []).map(s => s.imageBrief).filter(Boolean);
    console.log(`  pipeline 완주 (${food.sec}s) sections=${food.json.sections?.length} out=${food.json.meta?.out}`);
    allOk = checkBriefs(briefs, '밤호박') && allOk;
  }

  // ② 리프그린 16섹션 — imagebrief 직접 (2청크)
  console.log('\n[② 리프그린 / 화장품 / 16섹션 imagebrief]');
  const lg = JSON.parse(readFileSync(join(ROOT, '_prototype_out', 'pipeline-test.json'), 'utf8'));
  const lgRes = await post('/api/imagebrief', {
    dna: lg.dna, strategy: lg.strategy,
    sections: lg.sections.map(s => ({ name: s.name, role: s.role, mission: s.mission, emotion_goal: s.emotion_goal })),
    copy: lg.sections.map(s => ({ name: s.name, headline: s.headline, subcopy: s.subcopy, body: s.body })),
    cat: '화장품', ch: '스마트스토어', out: 'blog',
  });
  if (lgRes.json.error) { console.log(`  ✗ 에러: ${lgRes.json.error}`); allOk = false; }
  else { console.log(`  완료 (${lgRes.sec}s)`); allOk = checkBriefs(lgRes.json.briefs, '리프그린16') && allOk; }

  // ③ 풍부형 33섹션 — imagebrief 직접 (5청크)
  console.log('\n[③ 풍부형 / 화장품 / 33섹션 imagebrief]');
  const ab = JSON.parse(readFileSync(join(ROOT, '_prototype_out', 'pipeline-split-풍부.json'), 'utf8'));
  const abRes = await post('/api/imagebrief', {
    dna: ab.dna, strategy: ab.strategy,
    sections: ab.plan.map(s => ({ name: s.name, role: s.role, mission: s.mission, emotion_goal: s.emotion_goal })),
    copy: ab.copy.map(s => ({ name: s.name, headline: s.headline, subcopy: s.subcopy, body: s.body })),
    cat: '화장품', ch: '스마트스토어', out: 'blog',
  });
  if (abRes.json.error) { console.log(`  ✗ 에러: ${abRes.json.error}`); allOk = false; }
  else { console.log(`  완료 (${abRes.sec}s)`); allOk = checkBriefs(abRes.json.briefs, '풍부33') && allOk; }

  console.log(`\n[결과] ${allOk ? '✓ 전체 통과 — 잘림 0건, JSON 정상, image_mission 유지' : '✗ 실패 항목 있음'}`);
  process.exit(allOk ? 0 : 1);
})().catch(e => { console.error('FATAL:', e); process.exit(1); });
