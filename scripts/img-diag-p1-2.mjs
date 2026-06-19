/**
 * P1-2 검증 — Stage4 V2(image_mission 기반) 재생성. P1-1과 동일 평가표.
 *
 * 흐름: 실제 V2 엔드포인트 /api/imagebrief 로 image_mission+brief 생성(현 코드 그대로)
 *       → 각 brief.prompt를 /api/generate-image 로 (out=blog, 레퍼런스 주입 B조건)
 * 입력 카피/구조: pipeline-test.json(같은 제품)의 Stage2 mission + emotion_goal + Stage3 카피(headline/body) 그대로.
 * 대표 5섹션: ①공감(#2) ②원인(#3) ③솔루션(#4) ④신뢰(#8) ⑤CTA(#16)
 *
 * 실행:  node scripts/img-diag-p1-2.mjs   (dev 서버 :3000 필요)
 */
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const ROOT = process.cwd();
const OUT_DIR = join(ROOT, '_prototype_out', 'img-diag-p1-2');
mkdirSync(OUT_DIR, { recursive: true });

const pipe = JSON.parse(readFileSync(join(ROOT, '_prototype_out', 'pipeline-test.json'), 'utf8'));
const PICK = [
  { n: 2, role: '①공감' }, { n: 3, role: '②원인' }, { n: 4, role: '③솔루션' },
  { n: 8, role: '④신뢰' }, { n: 16, role: '⑤CTA' },
];

// V2 입력 — Stage2 plan(mission/emotion_goal) + Stage3 copy(headline/body) 그대로 재사용
const sel = PICK.map(p => pipe.sections[p.n - 1]);
const dna = pipe.dna || {};
const strategy = pipe.strategy || {};
const sectionsForBrief = sel.map(s => ({ name: s.name, role: s.role, mission: s.mission, emotion_goal: s.emotion_goal }));
const copyForBrief = sel.map(s => ({ name: s.name, headline: s.headline, subcopy: s.subcopy, body: s.body }));

// 레퍼런스 (P1-0 단독컷 = 셀러 업로드 시뮬레이션)
const refPath = join(ROOT, '_prototype_out', 'img-diag', '1_히어로_메인_—_제품_단독컷.jpg');
const refDataUrl = 'data:image/jpeg;base64,' + readFileSync(refPath).toString('base64');

async function postJSON(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, json };
}

(async () => {
  const t0 = Date.now();
  console.log('[p1-2] STEP A — /api/imagebrief (V2, out=blog)');
  const briefRes = await postJSON('/api/imagebrief', {
    dna, strategy, sections: sectionsForBrief, copy: copyForBrief, cat: '화장품', ch: '스마트스토어', out: 'blog',
  });
  if (!briefRes.ok || !briefRes.json.briefs?.length) {
    console.error('[p1-2] ✗ V2 브리프 실패:', briefRes.status, JSON.stringify(briefRes.json).slice(0, 800));
    process.exit(1);
  }
  const briefs = briefRes.json.briefs;
  writeFileSync(join(OUT_DIR, 'briefs.json'), JSON.stringify(briefRes.json, null, 2));
  console.log(`[p1-2] ✓ V2 브리프 ${briefs.length}컷`);

  const report = [];
  for (let i = 0; i < briefs.length; i++) {
    const b = briefs[i];
    const role = PICK[i].role;
    const im = b.image_mission || {};
    console.log(`\n[p1-2] ${role} #${PICK[i].n} ${b.section} | ratio=${b.ratio} | vis=${im.product_visibility}% | focus=${im.visual_focus}`);
    console.log(`  shot_type: ${b.shot_type}`);
    const gT0 = Date.now();
    const imgRes = await postJSON('/api/generate-image', {
      prompt: b.prompt, sectionNum: String(PICK[i].n), outputType: 'blog', aspectRatio: b.ratio,
      productImages: [refDataUrl],
    });
    const el = ((Date.now() - gT0) / 1000).toFixed(1);
    const slug = `${PICK[i].n}_${role}`.replace(/[\/\s]+/g, '_');
    const entry = { role, num: PICK[i].n, section: b.section, ratio: b.ratio, image_mission: im,
      shot_type: b.shot_type, mood: b.mood, palette: b.palette, props: b.props, prompt: b.prompt, elapsedSec: +el };
    if (imgRes.ok && imgRes.json.imageBase64) {
      const file = `${slug}.jpg`;
      writeFileSync(join(OUT_DIR, file), Buffer.from(imgRes.json.imageBase64, 'base64'));
      entry.file = file;
      console.log(`  ✓ ${file} (${el}s)`);
    } else {
      entry.error = imgRes.json.error || imgRes.status;
      console.error(`  ✗ ${imgRes.status}: ${JSON.stringify(imgRes.json).slice(0, 200)}`);
    }
    report.push(entry);
  }

  // HTML 비교 (image_mission + brief + 이미지)
  const esc = s => String(s ?? '').replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  const rows = report.map(r => {
    const im = r.image_mission || {};
    const img = r.file ? `<img src="${r.file}" />` : `<div class="err">생성 실패: ${esc(r.error)}</div>`;
    return `<section>
  <h2>${r.role} <span class="sn">#${r.num} ${esc(r.section)}</span> <span class="ratio">${r.ratio} · 제품노출 ${im.product_visibility}%</span></h2>
  <div class="cols">
    <div class="meta">
      <p class="im"><b>image_mission</b></p>
      <p><b>purpose</b> ${esc(im.purpose)}</p>
      <p><b>emotion</b> ${esc(im.emotion)}</p>
      <p><b>desired_reaction</b> ${esc(im.desired_reaction)}</p>
      <p><b>target_desire_link</b> ${esc(im.target_desire_link)}</p>
      <p><b>visual_focus</b> ${esc(im.visual_focus)}</p>
      <p><b>visual_priority</b> ${esc((im.visual_priority || []).join(' → '))}</p>
      <p class="brief"><b>shot_type</b> ${esc(r.shot_type)}</p>
      <p class="brief"><b>prompt</b> ${esc(r.prompt)}</p>
    </div>
    <figure>${img}</figure>
  </div>
</section>`;
  }).join('\n');

  const html = `<!doctype html><meta charset="utf-8"><title>P1-2 Stage4 V2 정합성</title>
<style>
 body{font-family:-apple-system,'Apple SD Gothic Neo',sans-serif;max-width:1180px;margin:0 auto;padding:24px;background:#fafafa;color:#1a1a1a}
 h1{font-size:22px} h2{font-size:18px;margin:0 0 10px;border-bottom:2px solid #222;padding-bottom:6px}
 .sn{font-weight:400;color:#666;font-size:14px} .ratio{float:right;font-size:12px;color:#999}
 section{background:#fff;border:1px solid #e5e5e5;border-radius:10px;padding:18px;margin:18px 0}
 .cols{display:grid;grid-template-columns:1fr 1fr;gap:16px}
 .meta p{margin:3px 0;font-size:13px;line-height:1.5} .meta b{color:#0a7;display:inline-block;min-width:120px;vertical-align:top}
 .im b{color:#c0392b} .brief b{color:#a70}
 img{width:100%;border-radius:8px;border:1px solid #ddd;display:block}
 .err{padding:30px;background:#fee;color:#900;text-align:center;border-radius:8px}
</style>
<h1>P1-2 Stage4 V2 (image_mission 기반) — 리프그린 시카토너 / out=blog / 레퍼런스 주입</h1>
<p style="font-size:13px;color:#666">결정 순서: image_mission → shot_type(결과값). 제품노출%는 코드가 섹션 role 기반으로 clamp.</p>
${rows}`;
  writeFileSync(join(OUT_DIR, 'compare.html'), html);
  writeFileSync(join(OUT_DIR, 'report.json'), JSON.stringify({ generatedAt: new Date().toISOString(), totalSec: +((Date.now() - t0) / 1000).toFixed(1), items: report }, null, 2));

  const ok = report.filter(r => r.file).length;
  console.log(`\n[p1-2] ✓ DONE — 성공 ${ok}/${report.length}, 총 ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  console.log(`[p1-2] HTML: ${join(OUT_DIR, 'compare.html')}`);
})().catch(e => { console.error('[p1-2] FATAL:', e); process.exit(1); });
