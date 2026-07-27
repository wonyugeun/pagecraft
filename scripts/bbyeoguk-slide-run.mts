/**
 * 접짝뼈국 슬라이드형 풀런 — flik-test.mts(검증된 슬라이드 하네스)의 실사진 프리셋 버전.
 * 블로그형 v3와 동일한 상품정보로 슬라이드형 결과를 비교하기 위한 테스트.
 *
 * 경로(브라우저 동일): pipelineJob(runJob, out='slide') → /api/director 1회 →
 * buildSectionBrief 전 섹션 → /api/generate-image (workers 3, 레퍼런스 = 뼈3+파우치).
 *
 *   npx tsx scripts/bbyeoguk-slide-run.mts --yes
 * 출력: runs/뼈국슬라이드-<타임스탬프>/secNN.png + page.html + raw.json
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { encode } from 'next-auth/jwt';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
import { createJob, runJob, getJobResult } from '../lib/pipelineJob';
import type { StageCall } from '../lib/pipelineJob';
import { buildSectionBrief } from '../lib/adBrief';
import type { DirectorPlan } from '../lib/stages/director';
import { aspectRatioFor } from '../lib/sectionAspect';
import { runPool } from '../lib/asyncPool';

const ROOT = path.resolve(__dirname, '..');
const BASE_URL = process.env.FLIK_BASE_URL ?? 'http://localhost:3000';
const REF_DIR = '/private/tmp/claude-501/-Users-won-yugeun-Documents-Flik/3454abe9-22fc-4043-b1da-1362adaea000/scratchpad/bbyeoguk';

function loadEnv(): Record<string, string> {
  const env: Record<string, string> = {};
  for (const line of fs.readFileSync(path.join(ROOT, '.env.local'), 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return env;
}

/* ── 상품 정보 — 블로그형 v3와 완전 동일(bbyeoguk-blog-run.mts PRESET) ── */
const PRESET = {
  cat: '식품', ch: '스마트스토어',
  productName: '제주 접짝뼈국 밀키트 800g (2~3인분)',
  productExtra: [
    '[식품 종류]: 간편식/HMR',
    '[주요 타겟]: 가족(아이 있음), 1인가구',
    '[인증/특징]: 국내산, 무첨가(방부제·색소)',
    '[판매 포인트]: 산지직거래',
    '[원산지 정보]: 국내산 — 돼지고기(국내산)',
    '[보관 방법]: 냉장보관(0~10℃), 진공포장 유지',
    '[알레르기 유발 원료]: 메밀, 돼지고기 함유',
    '차별점: 제주 잔칫상에 오르던 접짝뼈국 — 제주산 접짝뼈와 도가니뼈를 오래 고아내고 제주메밀을 더해, 뽀얀 사골이 아닌 진하고 걸쭉한 국물. 냄비에 붓고 끓이기만 하면 완성',
    '구성: 접짝뼈·도가니뼈 곰국물 800g (2~3인분 넉넉히)',
    '조리법: 봉지째 중탕 또는 냄비에 붓고 15분 끓이면 완성',
    '특징: 미리 만들어 쌓아두지 않고 주문 후 직접 조리 — 갓 끓인 국물을 진공 포장, 아이스박스에 담아 제주에서 산지직송',
    '가격: 정가 16900원 / 할인가 13900원',
    '기타 요청사항: 국물 색은 업로드한 사진 그대로(진한 베이지빛의 걸쭉한 국물) — 붉은 국물이나 뽀얀 흰 사골국으로 그리지 말 것. 국물 표면은 거품 없이 정갈하게 연출.',
    '고객 후기: 진짜 제주 향토음식이라 좋았고, 자극적이지 않은 맛인데 자꾸 생각나요. 메밀이 소화가 잘되는건 덤 - 원OO',
  ].join('\n'),
  productVolume: '800g',
};
const SECTION_COUNT = 8;

async function main() {
  if (!process.argv.includes('--yes')) throw new Error('비용 발생 — --yes 필요');
  const { NEXTAUTH_SECRET } = loadEnv();
  if (!NEXTAUTH_SECRET) throw new Error('.env.local에 NEXTAUTH_SECRET이 없습니다');

  // 레퍼런스 — 대표컷 = 완성 국물(뼈3), 보조컷 = 파우치(뼈2). 블로그 v3와 동일.
  const refs = ['ref3.jpg', 'ref-pouch.jpg'].map(f =>
    `data:image/jpeg;base64,${fs.readFileSync(path.join(REF_DIR, f)).toString('base64')}`);

  const sessionToken = await encode({ token: { email: 'harness@flik.test', name: 'Flik Harness' }, secret: NEXTAUTH_SECRET });
  const authHeaders = { Cookie: `next-auth.session-token=${sessionToken}` };
  const httpCall: StageCall = async (p, body) => {
    const res = await fetch(`${BASE_URL}${p}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders }, body: JSON.stringify(body),
    });
    return res.json() as Promise<{ error?: string; [k: string]: unknown }>;
  };

  const stamp = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 16);
  const outDir = path.join(ROOT, 'runs', `뼈국슬라이드-${stamp}`);
  fs.mkdirSync(outDir, { recursive: true });

  console.log(`[slide] 접짝뼈국 슬라이드형 — 카피 파이프라인 시작 (${BASE_URL})`);
  const t0 = Date.now();
  const job = createJob({
    cat: PRESET.cat, ch: PRESET.ch, out: 'slide',
    productName: PRESET.productName, productExtra: PRESET.productExtra,
    sectionCount: SECTION_COUNT, productVolume: PRESET.productVolume,
    jobKey: crypto.randomUUID(),
  });
  await runJob(job, {
    call: httpCall,
    onProgress: (_j, ev) => console.log(`  [${ev.stage}] ${ev.status}${ev.chunkStartIndex !== undefined ? ` @${ev.chunkStartIndex}` : ''}${ev.skipped ? ' (skip)' : ''}`),
  });
  const result = getJobResult(job);
  if (!result) throw new Error('파이프라인 결과 조립 실패');
  const sections = result.sections.map(ps => ({
    num: ps.num, name: ps.name, headline: ps.headline, subcopy: ps.subcopy || undefined,
  }));
  fs.writeFileSync(path.join(outDir, 'raw.json'), JSON.stringify({ visual: result.visual, sections: result.sections }, null, 2));
  console.log(`[slide] 카피 완료 — ${sections.length}섹션, ${Math.round((Date.now() - t0) / 1000)}초`);

  // Creative Director 1회 — ResultScreen 슬라이드 경로와 동일
  const dirRes = await httpCall('/api/director', {
    jobKey: job.input.jobKey, cat: PRESET.cat, ch: PRESET.ch,
    productName: PRESET.productName, productExtra: PRESET.productExtra,
    sections: sections.map(s => ({ name: s.name, headline: s.headline, subcopy: s.subcopy })),
    productImage: refs[0],
  }) as { plan?: DirectorPlan | null; error?: string };
  const director = dirRes.plan ?? null;
  if (director) {
    fs.writeFileSync(path.join(outDir, 'director.json'), JSON.stringify(director, null, 2));
    console.log(`[slide] 디렉터 컨셉: ${director.selected_concept.slice(0, 80)}… / 인물=${director.person?.use}`);
  } else {
    console.log(`[slide] ⚠️디렉터 실패(${dirRes.error ?? '?'}) — 자유 브리프 폴백`);
  }

  const t1 = Date.now();
  const promptLog: Record<string, unknown>[] = [];
  const tasks = sections.map((sec, i) => async () => {
    const prompt = buildSectionBrief({
      productName: PRESET.productName, productVolume: PRESET.productVolume,
      productExtra: PRESET.productExtra,
      headline: sec.headline, subcopy: sec.subcopy,
      visual: result.visual ? { primary_color: result.visual.primary_color, accent_color: result.visual.accent_color, soft_color: result.visual.soft_color } : undefined,
      director, sectionName: sec.name, sectionIndex: i,
      auxRefCount: 1,
    });
    promptLog.push({ idx: i + 1, name: sec.name, prompt });
    const res = await fetch(`${BASE_URL}/api/generate-image`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify({
        prompt, sectionNum: sec.num, productImages: refs,
        outputType: 'slide', aspectRatio: aspectRatioFor(sec.name, undefined, 'slide'),
        jobKey: job.input.jobKey,
      }),
    });
    const data = await res.json() as { imageBase64?: string; error?: string };
    const file = path.join(outDir, `sec${String(i + 1).padStart(2, '0')}.png`);
    if (data.imageBase64) {
      fs.writeFileSync(file, Buffer.from(data.imageBase64, 'base64'));
      console.log(`  [img ${i + 1}/${sections.length}] ✅ ${sec.name}`);
    } else {
      fs.writeFileSync(`${file}.error.txt`, data.error ?? 'unknown');
      console.log(`  [img ${i + 1}/${sections.length}] ❌ ${sec.name}: ${data.error}`);
    }
  });
  await runPool(tasks, 3);
  fs.writeFileSync(path.join(outDir, 'prompts.json'), JSON.stringify(promptLog.sort((a, b) => (a.idx as number) - (b.idx as number)), null, 2));
  const pageHtml = `<!doctype html><meta charset="utf-8"><title>접짝뼈국 슬라이드형</title><body style="margin:0;background:#eee"><div style="max-width:760px;margin:0 auto;box-shadow:0 0 24px rgba(0,0,0,.15)">${sections.map((s, i) => `<img src="sec${String(i + 1).padStart(2, '0')}.png" style="width:100%;display:block" alt="${s.name}">`).join('')}</div>`;
  fs.writeFileSync(path.join(outDir, 'page.html'), pageHtml);
  console.log(`[slide] 완료 — 이미지 ${Math.round((Date.now() - t1) / 1000)}초. 출력: ${path.relative(ROOT, outDir)}/page.html`);
}

main().catch(e => { console.error(e); process.exit(1); });
