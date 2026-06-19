/**
 * P1-1 정합성 진단 — "카피+이미지 정합성" 검증 (사진 품질 아님).
 *
 * 대상: 리프그린 시카토너. 기존 실제 파이프라인 결과(pipeline-test.json)의
 *   Stage2 mission + Stage3 카피 + Stage4 브리프를 그대로 사용(현 상태 검증, 텍스트 재생성 없음).
 * 대표 5섹션: ①공감(#2) ②원인(#3) ③솔루션(#4) ④신뢰(#8) ⑤CTA(#16)
 *
 * 각 브리프를 Gemini로 2번 생성:
 *   A) 레퍼런스 없음 (현재 상태)
 *   B) 제품사진 1장 주입 (P1-0의 단독컷을 셀러 업로드로 시뮬레이션)
 * → 제품 일관성 A vs B 비교. 최대 10장.
 *
 * 실행:  node scripts/img-diag-p1-1.mjs   (dev 서버 :3000 필요)
 */
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const ROOT = process.cwd();
const OUT_DIR = join(ROOT, '_prototype_out', 'img-diag-p1-1');
mkdirSync(OUT_DIR, { recursive: true });

// 1) 5섹션 추출 (실제 파이프라인 결과 재사용)
const pipe = JSON.parse(readFileSync(join(ROOT, '_prototype_out', 'pipeline-test.json'), 'utf8'));
const PICK = [
  { n: 2, role: '①공감' },
  { n: 3, role: '②원인' },
  { n: 4, role: '③솔루션' },
  { n: 8, role: '④신뢰' },
  { n: 16, role: '⑤CTA' },
];
const sections = PICK.map(p => {
  const s = pipe.sections[p.n - 1];
  return {
    role: p.role, num: p.n, name: s.name, mission: s.mission,
    headline: s.headline, body: s.body, brief: s.imageBrief,
  };
});

// 2) 레퍼런스 이미지 (P1-0 단독컷) → dataURL
const refPath = join(ROOT, '_prototype_out', 'img-diag', '1_히어로_메인_—_제품_단독컷.jpg');
const refDataUrl = 'data:image/jpeg;base64,' + readFileSync(refPath).toString('base64');
console.log(`[p1-1] ref image: ${refPath} (${(readFileSync(refPath).length / 1024).toFixed(0)}KB)`);

async function genImage(prompt, sectionNum, ratio, withRef) {
  const body = { prompt, sectionNum: String(sectionNum), outputType: 'blog', aspectRatio: ratio };
  if (withRef) body.productImages = [refDataUrl];
  const res = await fetch(`${BASE}/api/generate-image`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, json };
}

(async () => {
  const t0 = Date.now();
  const report = [];
  for (const s of sections) {
    const slug = `${s.num}_${s.role}`.replace(/[\/\s]+/g, '_');
    console.log(`\n[p1-1] === ${s.role} #${s.num} ${s.name} (ratio=${s.brief.ratio}) ===`);

    for (const variant of [{ k: 'A', ref: false }, { k: 'B', ref: true }]) {
      const gT0 = Date.now();
      const r = await genImage(s.brief.prompt, s.num, s.brief.ratio, variant.ref);
      const el = ((Date.now() - gT0) / 1000).toFixed(1);
      const fileBase = `${slug}_${variant.k}${variant.ref ? '_ref' : '_noref'}`;
      if (r.ok && r.json.imageBase64) {
        const ext = (r.json.mimeType || 'image/png').includes('jpeg') ? 'jpg' : 'png';
        const fp = join(OUT_DIR, `${fileBase}.${ext}`);
        writeFileSync(fp, Buffer.from(r.json.imageBase64, 'base64'));
        console.log(`  ${variant.k}(${variant.ref ? 'ref' : 'noref'}) ✓ ${fp.split('/').pop()} (${el}s)`);
        report.push({ ...meta(s), variant: variant.k, ref: variant.ref, file: `${fileBase}.${ext}`, elapsedSec: +el });
      } else {
        console.error(`  ${variant.k} ✗ ${r.status}: ${JSON.stringify(r.json).slice(0, 200)}`);
        report.push({ ...meta(s), variant: variant.k, ref: variant.ref, error: r.json.error || r.status, elapsedSec: +el });
      }
    }
  }

  function meta(s) {
    return {
      role: s.role, num: s.num, name: s.name, mission: s.mission,
      headline: s.headline, body: s.body,
      ratio: s.brief.ratio, shot_type: s.brief.shot_type, mood: s.brief.mood, prompt: s.brief.prompt,
    };
  }

  // 3) HTML 비교 페이지
  const rows = sections.map(s => {
    const slug = `${s.num}_${s.role}`.replace(/[\/\s]+/g, '_');
    const a = report.find(r => r.num === s.num && r.variant === 'A');
    const b = report.find(r => r.num === s.num && r.variant === 'B');
    const img = (r) => r?.file ? `<img src="${r.file}" />` : `<div class="err">생성 실패: ${r?.error ?? '?'}</div>`;
    return `<section>
  <h2>${s.role} <span class="sn">#${s.num} ${esc(s.name)}</span> <span class="ratio">${s.brief.ratio}</span></h2>
  <div class="copy">
    <p><b>mission</b> ${esc(s.mission)}</p>
    <p><b>headline</b> ${esc(s.headline)}</p>
    <p><b>body</b> ${esc((s.body || '').slice(0, 220))}…</p>
    <p class="brief"><b>shot_type</b> ${esc(s.brief.shot_type)} · <b>mood</b> ${esc(s.brief.mood)}</p>
    <p class="brief"><b>prompt</b> ${esc(s.brief.prompt)}</p>
  </div>
  <div class="imgs">
    <figure><figcaption>A · 레퍼런스 없음</figcaption>${img(a)}</figure>
    <figure><figcaption>B · 레퍼런스 주입</figcaption>${img(b)}</figure>
  </div>
</section>`;
  }).join('\n');

  const html = `<!doctype html><meta charset="utf-8"><title>P1-1 카피+이미지 정합성</title>
<style>
  body{font-family:-apple-system,'Apple SD Gothic Neo',sans-serif;max-width:1100px;margin:0 auto;padding:24px;color:#1a1a1a;background:#fafafa}
  h1{font-size:22px} h2{font-size:18px;margin:0 0 8px;border-bottom:2px solid #222;padding-bottom:6px}
  .sn{font-weight:400;color:#666;font-size:14px} .ratio{float:right;font-size:12px;color:#999}
  section{background:#fff;border:1px solid #e5e5e5;border-radius:10px;padding:18px;margin:18px 0}
  .copy p{margin:4px 0;font-size:13px;line-height:1.5} .copy b{color:#0a7;display:inline-block;min-width:64px}
  .brief{color:#555;font-size:12px} .brief b{color:#a70}
  .imgs{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:14px}
  figure{margin:0} figcaption{font-size:12px;font-weight:600;margin-bottom:6px;color:#444}
  img{width:100%;border-radius:8px;border:1px solid #ddd;display:block}
  .err{padding:30px;background:#fee;color:#900;text-align:center;border-radius:8px}
</style>
<h1>P1-1 카피+이미지 정합성 진단 — 리프그린 시카토너 (out=blog)</h1>
<p style="font-size:13px;color:#666">대표 5섹션 · 각 섹션 A(레퍼런스 없음) vs B(P1-0 단독컷 주입) · 브리프/모델/엔진 현 상태</p>
${rows}`;
  writeFileSync(join(OUT_DIR, 'compare.html'), html);
  writeFileSync(join(OUT_DIR, 'report.json'), JSON.stringify({ generatedAt: new Date().toISOString(), totalSec: +((Date.now() - t0) / 1000).toFixed(1), items: report }, null, 2));

  const ok = report.filter(r => r.file).length;
  console.log(`\n[p1-1] ✓ DONE — 성공 ${ok}/${report.length}, 총 ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  console.log(`[p1-1] HTML: ${join(OUT_DIR, 'compare.html')}`);
})().catch(e => { console.error('[p1-1] FATAL:', e); process.exit(1); });

function esc(s) { return String(s ?? '').replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c])); }
