/**
 * P1-0 이미지 진단 — 현재 Stage4 브리프 그대로 Gemini로 블로그형 이미지 실제 생성.
 *
 * 병목이 "브리프"냐 "모델"이냐 판별용. Stage4/브리프/엔진 수정 없음.
 * 동작: 실행 중인 dev 서버(.env.local 로드됨)의 HTTP 엔드포인트를 그대로 호출.
 *   1) /api/imagebrief  — 현재 Stage4(runImagebrief) 그대로, out='blog'
 *   2) /api/generate-image — 각 브리프의 prompt를 그대로 Gemini로 (outputType='blog')
 * 결과 PNG + 사용한 브리프(프롬프트)를 _prototype_out/img-diag/ 에 저장.
 *
 * 실행:  node scripts/img-diag.mjs   (dev 서버가 :3000 떠 있어야 함)
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const OUT_DIR = join(process.cwd(), '_prototype_out', 'img-diag');
mkdirSync(OUT_DIR, { recursive: true });

// 리프그린 시카토너 — 전략(Stage1 톤/컨셉을 대표값으로 제공. 브리프 품질의 입력 맥락)
const strategy = {
  concept: '제주산 병풀로 매일 진정하는 무자극 워터리 토너 — 민감성 피부의 데일리 루틴',
  tone: '깨끗하고 차분한, 워터리하고 투명한, K-beauty 에디토리얼',
  story_flow: '민감 자극 공감 → 제주 병풀 진정력 → 끈적임 없는 워터리 제형 → 매일 쓰는 루틴',
  hero_angle: '무향·무색소 저자극, 끈적임 없는 진정 토너',
};
const dna = { main_weapon: '제주산 병풀(센텔라) 진정 + 끈적임 없는 워터리 제형' };

// 4컷 — 섹션명이 sectionAspect 키워드를 타도록 구성(제품단독=4:5, 성분=1:1, 텍스처=16:9, 사용=16:9)
const sections = [
  { name: '히어로 메인 — 제품 단독컷', role: '제품 단독 후킹', mission: '제품을 주인공으로 단독 제시' },
  { name: '핵심 성분 — 제주 병풀 성분컷', role: '성분 신뢰', mission: '병풀 원료의 진정력을 시각화' },
  { name: '워터리 제형 텍스처컷', role: '제형/질감', mission: '끈적임 없는 워터리 질감을 클로즈업' },
  { name: '매일 사용 장면컷', role: '사용 장면', mission: '얼굴 없이 손/피부 클로즈업으로 사용 순간' },
];
const copy = [
  { name: sections[0].name, headline: '매일, 자극 없이 진정' },
  { name: sections[1].name, headline: '제주 병풀이 답이다' },
  { name: sections[2].name, headline: '끈적임 없는 워터리' },
  { name: sections[3].name, headline: '아침저녁 데일리 루틴' },
];

async function postJSON(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { _raw: text.slice(0, 500) }; }
  return { ok: res.ok, status: res.status, json };
}

function ts() { return new Date().toISOString(); }

(async () => {
  const t0 = Date.now();
  console.log(`[img-diag] ▶ ${ts()} BASE=${BASE}`);

  // ── 1) Stage4 브리프 생성 (현 상태 그대로, out='blog') ──
  console.log('[img-diag] STEP A — /api/imagebrief (out=blog) 호출');
  const briefRes = await postJSON('/api/imagebrief', {
    dna, strategy, sections, copy,
    cat: '화장품', ch: '스마트스토어', out: 'blog',
  });
  if (!briefRes.ok || !briefRes.json.briefs?.length) {
    console.error('[img-diag] ✗ 브리프 생성 실패:', briefRes.status, JSON.stringify(briefRes.json).slice(0, 600));
    process.exit(1);
  }
  const briefs = briefRes.json.briefs;
  console.log(`[img-diag] ✓ 브리프 ${briefs.length}컷 (out=${briefRes.json.meta?.out}, label=${briefRes.json.meta?.outputTypeLabel})`);
  writeFileSync(join(OUT_DIR, 'briefs.json'), JSON.stringify(briefRes.json, null, 2));

  // ── 2) 각 브리프 prompt를 그대로 Gemini로 (outputType='blog') ──
  const report = [];
  for (let i = 0; i < briefs.length; i++) {
    const b = briefs[i];
    const label = `${i + 1}_${b.section}`.replace(/[\/\s]+/g, '_');
    console.log(`\n[img-diag] STEP B${i + 1} — generate-image  [${b.section}]  ratio=${b.ratio}`);
    console.log(`  prompt: ${b.prompt.slice(0, 120)}...`);

    const gT0 = Date.now();
    const imgRes = await postJSON('/api/generate-image', {
      prompt: b.prompt,
      sectionNum: String(i + 1),
      outputType: 'blog',
      aspectRatio: b.ratio,
      // productImages 없음 — 레퍼런스 이미지가 저장소에 없어 보존 규칙은 미적용(브리프 텍스트 보존 지시는 유지)
    });
    const elapsed = ((Date.now() - gT0) / 1000).toFixed(1);

    const entry = {
      idx: i + 1, section: b.section, ratio: b.ratio,
      shot_type: b.shot_type, mood: b.mood, palette: b.palette, props: b.props,
      prompt: b.prompt,
      elapsedSec: Number(elapsed),
      status: imgRes.status, ok: imgRes.ok,
    };

    // 사용 브리프 텍스트 항상 저장
    const briefTxt =
`# ${i + 1}. ${b.section}
ratio: ${b.ratio}
shot_type: ${b.shot_type}
mood: ${b.mood}
palette: ${b.palette}
props: ${b.props}

--- PROMPT (Gemini로 그대로 전송) ---
${b.prompt}
`;
    writeFileSync(join(OUT_DIR, `${label}.brief.txt`), briefTxt);

    if (imgRes.ok && imgRes.json.imageBase64) {
      const buf = Buffer.from(imgRes.json.imageBase64, 'base64');
      const ext = (imgRes.json.mimeType || 'image/png').includes('jpeg') ? 'jpg' : 'png';
      const fp = join(OUT_DIR, `${label}.${ext}`);
      writeFileSync(fp, buf);
      entry.file = fp;
      entry.bytes = buf.length;
      console.log(`  ✓ 저장: ${fp} (${(buf.length / 1024).toFixed(0)}KB, ${elapsed}s)`);
    } else {
      entry.error = imgRes.json.error || imgRes.json._raw || 'unknown';
      console.error(`  ✗ 실패 (${imgRes.status}, ${elapsed}s): ${JSON.stringify(imgRes.json).slice(0, 300)}`);
    }
    report.push(entry);
  }

  const totalSec = ((Date.now() - t0) / 1000).toFixed(1);
  const ok = report.filter(r => r.file).length;
  const summary = {
    generatedAt: ts(),
    outputType: 'blog',
    model: 'gemini-3.1-flash-image-preview',
    product: '리프그린 시카 진정 토너 250ml',
    totalSec: Number(totalSec),
    success: ok, fail: report.length - ok, count: report.length,
    items: report,
  };
  writeFileSync(join(OUT_DIR, 'report.json'), JSON.stringify(summary, null, 2));

  console.log(`\n[img-diag] ✓ DONE — 성공 ${ok}/${report.length}, 총 ${totalSec}s`);
  console.log(`[img-diag] 결과 폴더: ${OUT_DIR}`);
})().catch(e => { console.error('[img-diag] FATAL:', e); process.exit(1); });
