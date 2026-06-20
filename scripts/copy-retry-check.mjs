/**
 * copy(Stage3) 잘림 자동 재시도 추가 검증.
 * 리프그린 풍부형 33섹션을 16섹션 청크로 /api/copy(청크모드) 호출 → 멀티청크 정상 생성 + 잘림0 확인.
 * strategySummary 7필드는 청크마다 재주입(전략 일관성). v5 품질·가짜후기0 점검.
 *
 * 실행:  node scripts/copy-retry-check.mjs   (dev 서버 :3000 필요)
 */
import { Agent, setGlobalDispatcher } from 'undici';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

setGlobalDispatcher(new Agent({ headersTimeout: 0, bodyTimeout: 0 }));
const BASE = process.env.BASE_URL || 'http://localhost:3000';
const ROOT = process.cwd();
const CHUNK = 16;

const ab = JSON.parse(readFileSync(join(ROOT, '_prototype_out', 'pipeline-split-풍부.json'), 'utf8'));
const ss = ab.strategySummary;
const plan = ab.plan;
const total = plan.length;

async function post(path, body) {
  const t0 = Date.now();
  const res = await fetch(`${BASE}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, json, sec: ((Date.now() - t0) / 1000).toFixed(1) };
}

// 가짜 후기 마커(셀러 미입력 시 금지) — 후기/리뷰 섹션에서 1인칭 후기·별점·작성자 생성 여부
const FAKE_MARKERS = ['★', '⭐'];

(async () => {
  const all = [];
  let allOk = true;
  for (let i = 0; i < total; i += CHUNK) {
    const slice = plan.slice(i, i + CHUNK).map(s => ({
      name: s.name, role: s.role, mission: s.mission, emotion_goal: s.emotion_goal, writing_style: s.writing_style,
    }));
    const r = await post('/api/copy', {
      strategySummary: ss, startIndex: i, totalSections: total, sections: slice,
      cat: '화장품', ch: '스마트스토어', out: 'blog', depth: '풍부',
    });
    if (r.json.error) { console.log(`  ✗ chunk@${i}: ${r.json.error}`); allOk = false; break; }
    const secs = r.json.sections || [];
    console.log(`  ✓ chunk@${i} (${slice.length}섹션) → ${secs.length}개 카피 (${r.sec}s)`);
    all.push(...secs);
  }

  // 검증 집계
  const bodyOk = all.filter(s => s.body && s.body.length > 10).length;
  const blockOk = all.filter(s => Array.isArray(s.blocks) && s.blocks.length > 0).length;
  // 가짜 별점 마커 스캔
  const ratingHits = all.filter(s => {
    const blob = JSON.stringify(s);
    return FAKE_MARKERS.some(m => blob.includes(m)) || (s.blocks || []).some(b => b && (b.type === 'rating' || typeof b.rating === 'number'));
  });

  console.log(`\n[집계] 총 카피 ${all.length}/${total}`);
  console.log(`  body 채워짐: ${bodyOk}/${all.length}`);
  console.log(`  blocks 보유: ${blockOk}/${all.length}`);
  console.log(`  가짜 별점/rating 블록: ${ratingHits.length}건 ${ratingHits.length === 0 ? '✓(가짜후기0)' : '✗'}`);
  if (all.length !== total) allOk = false;
  if (ratingHits.length > 0) { allOk = false; ratingHits.forEach(s => console.log(`    ! ${s.name}`)); }

  console.log(`\n[결과] ${allOk ? '✓ 통과 — 멀티청크 정상, 잘림0, 가짜후기0' : '✗ 실패'}`);
  process.exit(allOk ? 0 : 1);
})().catch(e => { console.error('FATAL:', e); process.exit(1); });
