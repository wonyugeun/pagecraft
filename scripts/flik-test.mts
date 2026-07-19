/**
 * Flik 헤드리스 테스트 하네스 — 브라우저 없이 16섹션 풀 생성을 재현한다.
 *
 * 브라우저와 동일 경로: pipelineJob(runJob)이 dev 서버의 /api/strategy·structure·copy(병렬 청크)·
 * imagebrief를 호출하고, ResultScreen과 동일한 Clean Baseline 조립(/api/director 1회 →
 * buildSectionBrief 전 섹션)으로 /api/generate-image를 워커 3개로 호출한다(Phase C).
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
import { buildSectionBrief } from '../lib/adBrief';
import type { DirectorPlan } from '../lib/stages/director';
import { selectRequiredAssetIndex, buildPlatePrompt } from '../lib/sectionReference';
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
  /** Required Asset — 실제 포장/구성 사진(test-assets 상대경로). 포장 계열 섹션은 플레이트 모드로 분기(ResultScreen 미러). */
  packagingRef?: string;
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
  vitamin: {
    cat: '건강', ch: '스마트스토어',
    productName: '밸런스랩 데일리 멀티비타민 미네랄 90정',
    productExtra: [
      '브랜드: 밸런스랩 — 바쁜 일상을 위한 데일리 영양 설계',
      '차별점: 하루 1정으로 비타민 12종 + 미네랄 4종을 한 번에, 삼키기 쉬운 작은 정제',
      '기능성(식약처 고시형 원료): 비타민C·아연 — 정상적인 면역기능에 필요 / 비타민B1·B2 — 에너지 생성에 필요 / 비타민D — 칼슘과 인의 흡수와 이용에 필요',
      '특징: 1일 1정, 90정(3개월분), 국내 GMP 인증 시설 제조, 무착향·무착색',
      '가격: 정가 39000원 / 할인가 29000원',
      '섭취방법: 1일 1회, 1정을 충분한 물과 함께 섭취',
      '고객 후기: 아침에 한 알로 끝나서 꾸준히 먹게 돼요 - 박OO / 정제가 작아서 목넘김이 편해요 - 최OO',
    ].join('\n'),
    productForm: 'supplement_bottle', productVolume: '90정', productShapeProfile: 'squat_jar',
    refPrompt: 'Commercial product photo of a clean white HDPE supplement bottle with a matte silver screw cap, modern minimal label reading "BALANCELAB" small at top and "MULTI VITAMIN & MINERAL" in bold dark navy, with a thin yellow-orange accent stripe and "90정 · 1일 1정" small at the bottom of the label. Pure white studio background, soft shadow, crisp label text, premium supplement packshot.',
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
  galchi: {
    cat: '식품', ch: '스마트스토어',
    productName: '제주 은갈치 특대 1마리 600g',
    productExtra: [
      '브랜드: 제주바당 — 제주 산지직송 수산물 전문',
      '차별점: 새벽 경매 당일 손질 후 급냉 — 은빛 그대로, 비린내 없이 도착',
      '상품 구성: 특대 사이즈 1마리 600g 이상, 내장·지느러미 손질 후 4토막 진공포장',
      '원산지: 국내산(제주), 제주 서귀포항 위판장 직매입',
      '특징: 당일 손질, 급속 냉동(-40℃), 진공 포장, 아이스박스+드라이아이스 배송',
      '조리: 갈치구이, 갈치조림, 갈치국 — 해동 후 바로 조리 가능',
      '보관: 냉동 보관, 해동 후 재냉동 금지',
      '가격: 정가 42000원 / 할인가 34900원',
      '고객 후기: 살이 두툼하고 비린내가 진짜 없어요, 아이도 잘 먹어요 - 박OO / 은빛이 살아있어서 선물로 보냈는데 반응이 좋았습니다 - 최OO',
    ].join('\n'),
    refPrompt: 'Commercial food photography of a fresh whole Korean silver cutlassfish (galchi) with brilliant metallic silver skin, laid diagonally on crushed ice with a few pieces of cleaned cut portions beside it, glistening and pristine. Clean bright studio background, crisp detail, premium seafood market quality, no packaging, no text.',
    packagingRef: 'small/galchi-pack.jpg',   // ⚠️검증용 다운로드 이미지(타사 라벨) — 저장소 미커밋, 프로덕션은 셀러 본인 사진
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
    // ★크레딧 멱등키 — 서버 선차감 게이트용. dev에선 FLIK_BYPASS_CREDITS_IN_DEV=true(.env.local)로 우회 가능.
    jobKey: crypto.randomUUID(),
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

  // ResultScreen과 동일 조립(Phase C) — Creative Director 1회 → 섹션 브리프
  const dirRes = await httpCall('/api/director', {
    jobKey: job.input.jobKey, cat: preset.cat, ch: preset.ch,
    productName: preset.productName, productExtra: preset.productExtra,
    sections: sections.map(s => ({ name: s.name, headline: s.headline, subcopy: s.subcopy })),
    productImage: refDataUrl,
  }) as { plan?: DirectorPlan | null; error?: string };
  const director = dirRes.plan ?? null;
  if (director) {
    fs.writeFileSync(path.join(outDir, 'director.json'), JSON.stringify(director, null, 2));
    const matched = sections.filter((s, j) =>
      director.sections?.some(ds => ds.idx === j + 1 || ds.name === s.name)).length;
    console.log(`[run] 디렉터 컨셉: ${director.selected_concept.slice(0, 80)}... / 인물=${director.person?.use} / 섹션매칭 ${matched}/${sections.length}`);
    if (matched < sections.length) console.log(`[run] ⚠️섹션 매칭 누락 ${sections.length - matched}건 — director.json 확인`);
  } else {
    console.log(`[run] ⚠️디렉터 실패(${dirRes.error ?? '?'}) — 자유 브리프 폴백`);
  }

  // ★Required Asset — 포장 계열 섹션은 플레이트 모드(ResultScreen 미러). 합성은 후처리(Python, 동일 파라미터).
  const packFile = preset.packagingRef ? path.join(ASSETS, preset.packagingRef) : null;
  const packRef = packFile && fs.existsSync(packFile)
    ? `data:image/jpeg;base64,${fs.readFileSync(packFile).toString('base64')}`
    : null;

  // ★페이지당 최고점 1개 섹션만(과발동 핫픽스) — ResultScreen과 동일 판정
  const raIdx = packRef
    ? selectRequiredAssetIndex(sections.map((s, j) => ({ name: s.name, prompt: s.imageDesc, archetype: j === 0 ? 'hero' : classifyCutArchetype(s.name) })))
    : -1;
  if (raIdx >= 0) console.log(`[run] Required Asset 적용 섹션: ${raIdx + 1}. ${sections[raIdx].name}`);

  const promptLog: Record<string, unknown>[] = [];
  const t1 = Date.now();
  const tasks = sections.map((sec, i) => async () => {
    const aspect = aspectRatioFor(sec.name, undefined, 'slide');
    const isPlate = raIdx >= 0 && i === raIdx;
    const prompt = isPlate
      ? buildPlatePrompt(sec.headline, sec.subcopy, accent, { concept: director?.selected_concept, productName: preset.productName, sectionName: sec.name })
      : buildSectionBrief({
          productName: preset.productName, productForm: preset.productForm, productVolume: preset.productVolume,
          productExtra: preset.productExtra,
          headline: sec.headline, subcopy: sec.subcopy,
          visual: result.visual ? { primary_color: result.visual.primary_color, accent_color: result.visual.accent_color, soft_color: result.visual.soft_color } : undefined,
          director, sectionName: sec.name, sectionIndex: i,
        });
    promptLog.push({ idx: i + 1, name: sec.name, plateMode: isPlate || undefined, prompt });
    const res = await fetch(`${BASE_URL}/api/generate-image`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify(isPlate
        ? { prompt, sectionNum: sec.num, outputType: 'slide', aspectRatio: aspect, plateMode: true, jobKey: job.input.jobKey }
        : { prompt, sectionNum: sec.num, productImages: [refDataUrl], outputType: 'slide', aspectRatio: aspect, jobKey: job.input.jobKey }),
    });
    const data = await res.json() as { imageBase64?: string; error?: string };
    // 플레이트는 .plate.png로 저장 — 후처리 합성이 secNN.png를 만든다(합성 전 노출 방지)
    const file = path.join(outDir, `sec${String(i + 1).padStart(2, '0')}${isPlate ? '.plate' : ''}.png`);
    if (data.imageBase64) {
      fs.writeFileSync(file, Buffer.from(data.imageBase64, 'base64'));
      console.log(`  [img ${i + 1}/${sections.length}] ✅ ${sec.name}${isPlate ? ' (PLATE)' : ''}`);
    } else {
      fs.writeFileSync(`${file}.error.txt`, data.error ?? 'unknown');
      console.log(`  [img ${i + 1}/${sections.length}] ❌ ${sec.name}: ${data.error}`);
    }
  });
  await runPool(tasks, 3);
  fs.writeFileSync(path.join(outDir, 'prompts.json'), JSON.stringify(promptLog.sort((a, b) => (a.idx as number) - (b.idx as number)), null, 2));
  // 상세페이지처럼 세로 스크롤로 보는 한 페이지 뷰어(브라우저로 열기)
  const pageHtml = `<!doctype html><meta charset="utf-8"><title>Flik ${presetKey}</title><body style="margin:0;background:#eee"><div style="max-width:860px;margin:0 auto;box-shadow:0 0 24px rgba(0,0,0,.15)">${sections.map((s, i) => `<img src="sec${String(i + 1).padStart(2, '0')}.png" style="width:100%;display:block" alt="${s.name}">`).join('')}</div>`;
  fs.writeFileSync(path.join(outDir, 'page.html'), pageHtml);
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
