/**
 * Flik 헤드리스 테스트 하네스 — 브라우저 없이 16섹션 풀 생성을 재현한다.
 *
 * 브라우저와 동일 경로: pipelineJob(runJob)이 dev 서버의 /api/strategy·structure·copy(병렬 청크)·
 * imagebrief를 호출하고, ResultScreen과 동일한 조립(classifyCutArchetype + selectPageStyle +
 * assignInfoLayouts + buildSlideBakedText)으로 /api/generate-image를 워커 3개로 호출한다.
 *
 * 사용법 (dev 서버 켜진 상태에서):
 *   npx tsx scripts/flik-test.mts assets                  # 가상 제품 레퍼런스 사진 생성(없는 것만, 1회성)
 *   npx tsx scripts/flik-test.mts run --preset leafgreen --yes   # 풀 생성(비용 발생 — --yes 필수)
 *   presets: leafgreen(화장품) | granola(식품) | cleaner(가전) | gold(럭셔리 화장품)
 *
 * 출력: _prototype_out/headless/<preset>-<타임스탬프>/sec01.png … + prompts.json(섹션별 최종 프롬프트)
 * ⚠️비용: run 1회 ≈ 이미지 16장(medium ~90원) + 카피 파이프라인 ~1,000원 ≈ 회당 약 2,500원.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { encode } from 'next-auth/jwt';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
import { createJob, runJob, getJobResult } from '../lib/pipelineJob';
import type { StageCall } from '../lib/pipelineJob';
import { classifyCutArchetype } from '../lib/sectionArchetype';
import { selectPageStyle } from '../lib/pageStyleContract';
import { assignInfoLayouts, assignViewpoints, assignTreatments, assignLighting } from '../lib/infoLayout';
import { buildSlideBakedText } from '../lib/slideBaked';
import { aspectRatioFor } from '../lib/sectionAspect';
import { runPool } from '../lib/asyncPool';

const ROOT = path.resolve(__dirname, '..');
const ASSETS = path.join(ROOT, 'test-assets');
const OUT_BASE = path.join(ROOT, '_prototype_out', 'headless');
const BASE_URL = process.env.FLIK_BASE_URL ?? 'http://localhost:3000';

/* ── .env.local 로더(dotenv 미의존) ── */
function loadEnv(): Record<string, string> {
  const env: Record<string, string> = {};
  const p = path.join(ROOT, '.env.local');
  if (!fs.existsSync(p)) return env;
  for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return env;
}

/* ── 프리셋 4종 — 스타일 계약 4종(derma/vivid/minimal/luxury)을 각각 발동시키는 조합 ── */
interface HarnessPreset {
  cat: string; ch: string;
  productName: string; productExtra: string;
  productForm?: string; productVolume?: string; productShapeProfile?: string;
  refPrompt: string;   // 가상 제품 레퍼런스 사진 생성 프롬프트(1회성)
}
const PRESETS: Record<string, HarnessPreset> = {
  leafgreen: {
    cat: '화장품', ch: '스마트스토어',
    productName: '리프그린 시카 카밍 토너 250ml',
    productExtra: [
      '브랜드: 리프그린 — 민감성 피부를 위한 더마 코스메틱',
      '차별점: 병풀 추출물 고함량 + 무알콜 저자극 처방으로 민감 피부도 따갑지 않게',
      '핵심 성분: 병풀 추출물(진정), 마데카소사이드(재생), 판테놀(수분/진정)',
      '특징: 무알콜, 무향, 피부과 테스트 완료, 국내 제조',
      '스토리: 아토피로 고생하던 창업자가 병풀 성분을 3년간 연구해 만든 저자극 진정 토너',
      '가격: 정가 32000원 / 할인가 24000원(25% 할인)',
      '사용법: 아침저녁 세안 후 화장솜 또는 손으로 얼굴 전체에 부드럽게 흡수',
      // 고객 후기는 마지막 줄 — copy 단계의 후기 추출 마커("고객 후기:")가 이 위치·형식을 기대함
      '고객 후기: 민감한데 안 따가워서 매일 써요 - 김OO / 트러블 올라올 때 진정용으로 최고 - 이OO',
    ].join('\n'),
    productForm: 'toner_bottle', productVolume: '250ml', productShapeProfile: 'slim_tall',
    refPrompt: 'Commercial product photo of a slim tall transparent toner bottle with pale green liquid, white flip cap, clean white label reading "LEAFGREEN" small at top and "CICA TONER" large in green, subline "Soothing & Hydrating", small centella leaf line icon, "250ml / 8.45 fl. oz." at bottom. Pure white studio background, soft shadow, crisp label text.',
  },
  granola: {
    cat: '식품', ch: '스마트스토어',
    productName: '데일리핏 저당 오트 그래놀라 400g',
    productExtra: [
      '브랜드: 데일리핏 — 부담 없는 아침을 만드는 건강 간편식',
      '차별점: 설탕 대신 알룰로스, 통귀리 60% 함유로 저당인데 고소하고 바삭함',
      '구성: 통귀리, 아몬드, 호박씨, 크랜베리 / 400g 대용량 지퍼백',
      '특징: 저당 설계, 국내 생산, 방부제 무첨가',
      '가격: 정가 15900원 / 할인가 12900원',
      '보관: 직사광선을 피해 서늘한 곳, 개봉 후 지퍼 밀봉',
    ].join('\n'),
    refPrompt: 'Commercial product photo of a kraft-paper stand-up pouch of granola with a clear window showing oat clusters and cranberries, clean modern label reading "DAILYFIT" at top and "저당 오트 그래놀라" in bold Korean, "400g" at bottom corner. Warm white studio background, soft shadow, crisp label.',
  },
  cleaner: {
    cat: '가전', ch: '스마트스토어',
    productName: '에어젯 프로 무선청소기 AJ-900',
    productExtra: [
      '브랜드: 에어젯 — 합리적인 프리미엄 생활가전',
      '차별점: 900g 초경량 + 저소음 55dB 설계, 원룸·차량 겸용',
      '스펙: 무게 900g, 소음 55dB, 사용 시간 40분, USB-C 충전, 헤파필터',
      '구성: 본체, 틈새 노즐, 브러시 노즐, 거치대',
      '가격: 정가 129000원 / 할인가 99000원',
      '보증: 1년 무상 A/S, 국내 공식 수입',
    ].join('\n'),
    refPrompt: 'Commercial product photo of a sleek modern cordless stick vacuum cleaner in matte light grey and white, minimal design, small "AIRJET" logo on the body, standing upright. Clean white studio background, soft shadow, premium tech product shot.',
  },
  gold: {
    cat: '화장품', ch: '스마트스토어',
    productName: '오뜨 골드 리페어 앰플 30ml',
    productExtra: [
      '브랜드: 오뜨(HAUTE) — 프리미엄 안티에이징 부티크 브랜드',
      '차별점: 골드 펩타이드 콤플렉스와 명품 선물 패키지 — 럭셔리 기프트 수요 겨냥',
      '핵심 성분: 골드 펩타이드, 나이아신아마이드, 히알루론산',
      '특징: 고급 유리 용기, 선물 포장 기본 제공, 한정판 골드 에디션',
      '가격: 정가 89000원 / 할인가 69000원',
    ].join('\n'),
    productForm: 'ampoule_bottle', productVolume: '30ml',
    refPrompt: 'Luxury product photo of a small amber-gold glass dropper ampoule bottle, gold cap, elegant minimal label reading "HAUTE" in thin serif letters and "GOLD REPAIR AMPOULE 30ml" small beneath. Deep warm beige backdrop, soft dramatic lighting, expensive prestige cosmetic shot.',
  },
};

/* ── 가상 제품 레퍼런스 사진 생성(1회성, 없는 것만) — OpenAI 직접 호출(dev 서버 불필요) ── */
async function ensureAssets(only?: string) {
  const { OPENAI_API_KEY } = loadEnv();
  if (!OPENAI_API_KEY) throw new Error('.env.local에 OPENAI_API_KEY가 없습니다');
  fs.mkdirSync(ASSETS, { recursive: true });
  for (const [key, p] of Object.entries(PRESETS)) {
    if (only && key !== only) continue;
    const file = path.join(ASSETS, `${key}.png`);
    if (fs.existsSync(file)) { console.log(`[assets] ${key}.png 있음 — 스킵`); continue; }
    console.log(`[assets] ${key}.png 생성 중…`);
    const res = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_API_KEY}` },
      body: JSON.stringify({ model: 'gpt-image-2', prompt: p.refPrompt, size: '1024x1024', quality: 'medium', n: 1 }),
    });
    const data = await res.json() as { data?: { b64_json?: string }[]; error?: { message?: string } };
    if (!res.ok || !data.data?.[0]?.b64_json) throw new Error(`[assets] ${key} 실패: ${data.error?.message ?? res.status}`);
    fs.writeFileSync(file, Buffer.from(data.data[0].b64_json, 'base64'));
    console.log(`[assets] 저장 → test-assets/${key}.png`);
  }
}

/* ── 풀 생성 실행 — 브라우저(runClientPipeline + ResultScreen)와 동일 흐름 ── */
async function runFull(presetKey: string, sectionCount: number) {
  const preset = PRESETS[presetKey];
  if (!preset) throw new Error(`알 수 없는 프리셋: ${presetKey} (${Object.keys(PRESETS).join('/')})`);
  const refFile = path.join(ASSETS, `${presetKey}.png`);
  if (!fs.existsSync(refFile)) throw new Error(`레퍼런스 사진 없음 — 먼저 실행: npx tsx scripts/flik-test.mts assets`);
  const refDataUrl = `data:image/png;base64,${fs.readFileSync(refFile).toString('base64')}`;

  // API 로그인 가드(middleware) 통과 — 같은 NEXTAUTH_SECRET으로 유효한 세션 JWT를 발급해 쿠키로 전송.
  // 앱의 가드 로직은 무접촉(프로덕션 보호 그대로) — 하네스가 '로그인한 사용자'가 되는 방식.
  const { NEXTAUTH_SECRET } = loadEnv();
  if (!NEXTAUTH_SECRET) throw new Error('.env.local에 NEXTAUTH_SECRET이 없습니다');
  const sessionToken = await encode({
    token: { email: 'harness@flik.test', name: 'Flik Harness' },
    secret: NEXTAUTH_SECRET,
  });
  const authHeaders = { Cookie: `next-auth.session-token=${sessionToken}` };

  const httpCall: StageCall = async (p, body) => {
    const res = await fetch(`${BASE_URL}${p}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders }, body: JSON.stringify(body),
    });
    return res.json() as Promise<{ error?: string; [k: string]: unknown }>;
  };

  const stamp = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 16);
  const outDir = path.join(OUT_BASE, `${presetKey}-${stamp}`);
  fs.mkdirSync(outDir, { recursive: true });

  console.log(`[run] ${presetKey} — 카피 파이프라인 시작 (${BASE_URL})`);
  const t0 = Date.now();
  const job = createJob({
    cat: preset.cat, ch: preset.ch, out: 'slide',
    productName: preset.productName, productExtra: preset.productExtra,
    sectionCount,
    productForm: preset.productForm, productVolume: preset.productVolume,
    productShapeProfile: preset.productShapeProfile,
  });
  await runJob(job, {
    call: httpCall,
    onProgress: (_j, ev) => console.log(`  [${ev.stage}] ${ev.status}${ev.chunkStartIndex !== undefined ? ` @${ev.chunkStartIndex}` : ''}${ev.skipped ? ' (skip)' : ''}`),
  });
  const result = getJobResult(job);
  if (!result) throw new Error('파이프라인 결과 조립 실패');
  // runClientPipeline과 동일 매핑 — imageDesc = 브리프 prompt, accent = 페이지 공통 비주얼
  const accent = result.visual?.accent_color;
  const sections = result.sections.map(ps => ({
    num: ps.num, name: ps.name, headline: ps.headline, subcopy: ps.subcopy || undefined,
    blocks: ps.blocks, imageDesc: ps.imageBrief?.prompt || ps.imageBrief?.mood || '',
  }));
  console.log(`[run] 카피 완료 — ${sections.length}섹션, ${Math.round((Date.now() - t0) / 1000)}초`);

  // ResultScreen과 동일 조립 — 계약·InfoLayout·baked
  const knownFacts = [preset.productName, preset.productExtra].filter(Boolean).join('\n');
  const pageStyle = selectPageStyle({ category: preset.cat, channel: preset.ch, moodText: knownFacts });
  const infoLayouts = assignInfoLayouts(
    sections.map((s, i) => ({ name: s.name, blocks: s.blocks, archetype: i === 0 ? 'hero' as const : classifyCutArchetype(s.name) })),
    knownFacts,
  );
  const pageArchetypes = sections.map((s, i) => i === 0 ? 'hero' as const : classifyCutArchetype(s.name));
  const viewpoints = assignViewpoints(pageArchetypes, infoLayouts);
  const treatments = assignTreatments(pageArchetypes, infoLayouts);
  const lightings = assignLighting(pageArchetypes);
  console.log(`[run] 계약=${pageStyle.style_id} / 레이아웃: ${infoLayouts.join(' → ')}`);

  const promptLog: Record<string, unknown>[] = [];
  const t1 = Date.now();
  const tasks = sections.map((sec, i) => async () => {
    const archetype = i === 0 ? 'hero' as const : classifyCutArchetype(sec.name);
    const aspect = aspectRatioFor(sec.name, undefined, 'slide');
    const prompt = `${sec.imageDesc}. ${buildSlideBakedText(sec.headline, sec.subcopy, knownFacts, sec.blocks, archetype, accent, preset.productName, pageStyle, infoLayouts[i], viewpoints[i] || undefined, treatments[i] || undefined, lightings[i] || undefined)}`;
    promptLog.push({ idx: i + 1, name: sec.name, archetype, infoLayout: infoLayouts[i], viewpoint: viewpoints[i], treatment: treatments[i], lighting: lightings[i], prompt });
    const res = await fetch(`${BASE_URL}/api/generate-image`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify({ prompt, sectionNum: sec.num, productImages: [refDataUrl], outputType: 'slide', aspectRatio: aspect }),
    });
    const data = await res.json() as { imageBase64?: string; error?: string };
    const file = path.join(outDir, `sec${String(i + 1).padStart(2, '0')}.png`);
    if (data.imageBase64) {
      fs.writeFileSync(file, Buffer.from(data.imageBase64, 'base64'));
      console.log(`  [img ${i + 1}/${sections.length}] ✅ ${sec.name} (${infoLayouts[i]})`);
    } else {
      fs.writeFileSync(`${file}.error.txt`, data.error ?? 'unknown');
      console.log(`  [img ${i + 1}/${sections.length}] ❌ ${sec.name}: ${data.error}`);
    }
  });
  await runPool(tasks, 3);
  fs.writeFileSync(path.join(outDir, 'prompts.json'), JSON.stringify(promptLog.sort((a, b) => (a.idx as number) - (b.idx as number)), null, 2));
  console.log(`[run] 이미지 완료 — ${Math.round((Date.now() - t1) / 1000)}초. 출력: ${path.relative(ROOT, outDir)}`);
}

/* ── CLI ── */
const [cmd, ...rest] = process.argv.slice(2);
const flag = (name: string) => { const i = rest.indexOf(`--${name}`); return i >= 0 ? rest[i + 1] : undefined; };
(async () => {
  if (cmd === 'assets') {
    await ensureAssets(flag('preset'));
  } else if (cmd === 'run') {
    if (!rest.includes('--yes')) {
      console.log('⚠️ 실행 시 비용이 발생합니다(16섹션 medium ≈ 2,500원). 동의하면 --yes를 붙이세요.');
      process.exit(1);
    }
    await runFull(flag('preset') ?? 'leafgreen', Number(flag('sections') ?? 16));
  } else {
    console.log('사용법: npx tsx scripts/flik-test.mts assets | run --preset <key> [--sections 16] --yes');
  }
})().catch(e => { console.error('실패:', e instanceof Error ? e.message : e); process.exit(1); });
