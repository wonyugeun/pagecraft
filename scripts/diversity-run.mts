/**
 * 다양성 테스트 — 신규 상품 10종 × 블로그형 8섹션 풀런(2026-07-31).
 *
 * ★목적 두 가지:
 *   1) 품질 — 한 번도 안 써본 카테고리(패션·생활·가전·반려동물·유아·자동차)에서 결과가 버티는가.
 *      기존 상품으로 테스트하면 그동안 그 상품에 맞춰 손본 결과를 다시 보는 셈이라 의미가 없다.
 *   2) 원가 — 섹션당 이미지 장수·크기 분포를 실측해 블로그형 마진 논의의 근거를 만든다.
 *
 * ★브라우저와 같은 경로를 탄다(pipelineJob → dev 서버 API). 하네스 전용 우회로를 만들면
 *   실사용에서만 터지는 문제를 놓친다.
 *
 * ★중단·재개 가능 — 이미 결과가 있는 상품은 건너뛴다. 10개를 한 번에 못 끝내도 이어서 돌린다.
 *
 * 실행 (dev 서버 필요): npx --yes tsx scripts/diversity-run.mts --yes
 *      특정 상품만:      npx --yes tsx scripts/diversity-run.mts --yes --only 01,03
 *      카피만(이미지 X): npx --yes tsx scripts/diversity-run.mts --yes --copy-only
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { encode } from 'next-auth/jwt';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const BASE_URL = process.env.FLIK_BASE_URL ?? 'http://localhost:3000';
const PHOTO_DIR = path.join(ROOT, 'test-assets', 'diversity');
const OUT_ROOT = path.join(ROOT, 'runs', 'diversity');

import { createJob, runJob, getJobResult } from '../lib/pipelineJob';
import type { StageCall } from '../lib/pipelineJob';
import { aspectRatioFor } from '../lib/sectionAspect';
import { runPool } from '../lib/asyncPool';
import { TEST_PRODUCTS, type TestProduct } from './test-products';

const SECTION_COUNT = 8;

function loadEnv(): Record<string, string> {
  const env: Record<string, string> = {};
  for (const line of fs.readFileSync(path.join(ROOT, '.env.local'), 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return env;
}

/** 이미지 크기별 상대원가 — 1024x1024를 1로 두고 픽셀 비례. 절대금액이 아니라 비교용. */
const SIZE_UNIT: Record<string, number> = { '1024x1024': 1, '1024x1536': 1.5, '1536x1024': 1.5 };
function sizeOf(aspect: string): string {
  return aspect === '4:5' ? '1024x1536' : aspect === '16:9' ? '1536x1024' : '1024x1024';
}

interface Metric {
  key: string; cat: string; density: string; productName: string;
  sections: number; images: number; imagesFailed: number;
  costUnits: number;              // 상대원가 합계
  sizeDist: Record<string, number>;
  collageSections: number;        // 프롬프트에 콜라주 지시가 반영된 섹션 수
  bodyLens: number[];
  copySec: number; imageSec: number;
  error?: string;
}

async function runOne(p: TestProduct, authHeaders: Record<string, string>, copyOnly: boolean): Promise<Metric> {
  const outDir = path.join(OUT_ROOT, p.key);
  fs.mkdirSync(outDir, { recursive: true });

  const m: Metric = {
    key: p.key, cat: p.cat, density: p.density, productName: p.productName,
    sections: 0, images: 0, imagesFailed: 0, costUnits: 0, sizeDist: {},
    collageSections: 0, bodyLens: [], copySec: 0, imageSec: 0,
  };

  const photo = path.join(PHOTO_DIR, `${p.key}.png`);
  if (!fs.existsSync(photo)) { m.error = '상품 사진 없음'; return m; }
  const refs = [`data:image/png;base64,${fs.readFileSync(photo).toString('base64')}`];

  const httpCall: StageCall = async (pathname, body) => {
    const res = await fetch(`${BASE_URL}${pathname}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify(body),
    });
    return res.json() as Promise<{ error?: string; [k: string]: unknown }>;
  };

  /* ── 1. 카피 파이프라인 ── */
  const t0 = Date.now();
  const job = createJob({
    cat: p.cat, ch: p.ch, out: 'blog',
    productName: p.productName, productExtra: p.fields.join('\n'),
    sectionCount: SECTION_COUNT,
    jobKey: crypto.randomUUID(),
  });
  try {
    await runJob(job, { call: httpCall, onProgress: () => {} });
  } catch (e) {
    m.error = `파이프라인 실패: ${e instanceof Error ? e.message : String(e)}`;
    return m;
  }
  const result = getJobResult(job);
  if (!result) { m.error = '결과 조립 실패'; return m; }
  m.copySec = Math.round((Date.now() - t0) / 1000);

  fs.writeFileSync(
    path.join(outDir, 'raw.json'),
    JSON.stringify({ product: p, visual: result.visual, sections: result.sections }, null, 2),
  );

  m.sections = result.sections.length;
  m.bodyLens = result.sections.map(s => (s.body ?? '').length);
  // ⚠️'panel'·'grid' 단독 매칭은 오탐이 많다("chest panel", "front panel", "grid pattern").
  //   실제 3분할 콜라주 지시만 잡도록 결합어로 판정한다.
  m.collageSections = result.sections.filter(s => {
    const t = (s.imageBrief?.prompt ?? '').toLowerCase();
    return /collage|three-panel|split[- ]screen|triptych/.test(t);
  }).length;

  if (copyOnly) return m;

  /* ── 2. 이미지 — ResultScreen 블로그 경로 미러 ── */
  const t1 = Date.now();
  interface Task { key: string; file: string; prompt: string; aspect: string; label: string }
  const tasks: Task[] = [];
  result.sections.forEach((sec, i) => {
    const prompt = sec.imageBrief?.prompt || sec.imageBrief?.mood || '';
    if (prompt) {
      tasks.push({
        key: sec.num, file: `sec${String(i + 1).padStart(2, '0')}.png`, prompt,
        // 브리프 우선 — imagebrief가 페이지 전체를 보고 넣은 리듬 보정을 그대로 쓴다
        aspect: (sec.imageBrief?.ratio as string | undefined) ?? aspectRatioFor(sec.name, undefined, 'blog'),
        label: `${i + 1}.${sec.name}`,
      });
    }
    sec.blocks?.forEach((b, bi) => {
      if (b.type !== 'image') return;
      tasks.push({
        key: `${sec.num}#${bi}`, file: `sec${String(i + 1).padStart(2, '0')}-b${bi}.png`,
        prompt: b.desc, aspect: aspectRatioFor(sec.name, b.type), label: `${i + 1}.${sec.name}[b${bi}]`,
      });
    });
  });

  await runPool(tasks.map(t => async () => {
    const dest = path.join(outDir, t.file);
    if (fs.existsSync(dest)) { m.images++; return; }   // 재개 시 재생성 방지
    const res = await fetch(`${BASE_URL}/api/generate-image`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify({
        prompt: t.prompt, sectionNum: t.key, productImages: refs,
        outputType: 'blog', aspectRatio: t.aspect, jobKey: job.input.jobKey,
      }),
    });
    const data = await res.json() as { imageBase64?: string; error?: string };
    if (data.imageBase64) {
      fs.writeFileSync(dest, Buffer.from(data.imageBase64, 'base64'));
      m.images++;
    } else {
      fs.writeFileSync(path.join(outDir, `${t.file}.error.txt`), data.error ?? 'unknown');
      m.imagesFailed++;
      console.log(`    ❌ ${t.label}: ${data.error}`);
    }
  }), 3);

  for (const t of tasks) {
    const size = sizeOf(t.aspect);
    m.sizeDist[size] = (m.sizeDist[size] ?? 0) + 1;
    m.costUnits += SIZE_UNIT[size] ?? 1;
  }
  m.imageSec = Math.round((Date.now() - t1) / 1000);
  return m;
}

async function main() {
  if (!process.argv.includes('--yes')) throw new Error('비용 발생 — --yes 플래그가 필요합니다');
  const copyOnly = process.argv.includes('--copy-only');

  const onlyArg = process.argv[process.argv.indexOf('--only') + 1];
  const only = process.argv.includes('--only') ? onlyArg.split(',').map(s => s.trim()) : null;
  const targets = only
    ? TEST_PRODUCTS.filter(p => only.some(o => p.key.startsWith(o)))
    : TEST_PRODUCTS;

  const { NEXTAUTH_SECRET } = loadEnv();
  if (!NEXTAUTH_SECRET) throw new Error('.env.local에 NEXTAUTH_SECRET이 없습니다');
  const sessionToken = await encode({
    token: { email: 'harness@flik.test', name: 'Flik Harness' },
    secret: NEXTAUTH_SECRET,
  });
  const authHeaders = { Cookie: `next-auth.session-token=${sessionToken}` };

  fs.mkdirSync(OUT_ROOT, { recursive: true });
  console.log(`다양성 테스트 — ${targets.length}종 × ${SECTION_COUNT}섹션 (${BASE_URL})\n`);

  const metrics: Metric[] = [];
  for (const [i, p] of targets.entries()) {
    console.log(`[${i + 1}/${targets.length}] ${p.key} — ${p.productName}`);
    const m = await runOne(p, authHeaders, copyOnly);
    metrics.push(m);
    console.log(m.error
      ? `  ⚠️ ${m.error}`
      : `  ✅ ${m.sections}섹션 / 이미지 ${m.images}장(실패 ${m.imagesFailed}) / 콜라주 ${m.collageSections} / 카피 ${m.copySec}초 · 이미지 ${m.imageSec}초`);
    fs.writeFileSync(path.join(OUT_ROOT, 'metrics.json'), JSON.stringify(metrics, null, 2));
  }

  /* ── 요약 ── */
  const okAll = metrics.filter(x => !x.error);
  const allBody = okAll.flatMap(x => x.bodyLens);
  console.log('\n────────── 요약 ──────────');
  console.table(okAll.map(x => ({
    상품: x.key, 카테고리: x.cat, 정보량: x.density,
    섹션: x.sections, 이미지: x.images, 실패: x.imagesFailed,
    콜라주: x.collageSections,
    상대원가: x.costUnits.toFixed(2),
    '본문평균(자)': x.bodyLens.length ? Math.round(x.bodyLens.reduce((a, b) => a + b, 0) / x.bodyLens.length) : 0,
    '초': x.copySec + x.imageSec,
  })));
  if (allBody.length) {
    const sorted = [...allBody].sort((a, b) => a - b);
    console.log(`본문 글자수 — 평균 ${Math.round(allBody.reduce((a, b) => a + b, 0) / allBody.length)} / `
      + `중앙 ${sorted[Math.floor(sorted.length / 2)]} / 최소 ${sorted[0]} / 최대 ${sorted[sorted.length - 1]}`);
  }
  const totalImgs = okAll.reduce((a, x) => a + x.images, 0);
  const totalUnits = okAll.reduce((a, x) => a + x.costUnits, 0);
  console.log(`이미지 총 ${totalImgs}장 / 상대원가 ${totalUnits.toFixed(1)}단위 `
    + `(섹션당 ${(totalUnits / Math.max(1, okAll.reduce((a, x) => a + x.sections, 0))).toFixed(2)}단위)`);
  console.log(`콜라주 채택 — ${okAll.reduce((a, x) => a + x.collageSections, 0)}섹션 / 전체 ${okAll.reduce((a, x) => a + x.sections, 0)}섹션`);
  console.log(`\n결과: ${path.relative(ROOT, OUT_ROOT)}/`);
}

await main();
