/**
 * 패션 — 여태 안 돌려본 섹션만 모아 돌리는 블로그형 풀런(2026-08-02).
 *
 * ★왜: 기본 구조에 든 섹션만 검증돼 있었다. 셀러가 '추가'로 넣는 섹션(코디 제안·스타일 비전·
 *   생산 과정·A/S 보증…)은 한 번도 생성해본 적이 없다. 컷 분류를 고친 직후라 실제로
 *   그렇게 나오는지 확인해야 한다 — 특히 in_use(코디·착용감)에서 옷이 보이는지.
 *
 * ★한 제품으로 전부 뽑는다 — 이 섹션은 니트, 저 섹션은 다른 옷이면 미리보기로 붙였을 때
 *   연결성이 없어 셀러가 "이게 뭐지" 한다. 미리보기 자산은 이 결과물에서 잘라 쓴다.
 *
 * 브라우저와 동일 경로: pipelineJob(runJob)이 dev 서버의 /api/strategy·structure·copy·imagebrief를
 * 호출하고, ResultScreen 블로그 경로와 동일하게 이미지를 생성한다.
 *
 * 실행 (dev 서버 켜진 상태): npx tsx scripts/fashion-untested-run.mts --yes
 * 출력: runs/패션-미검증섹션-<타임스탬프>/index.html + secNN.png + raw.json
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { encode } from 'next-auth/jwt';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
import { createJob, runJob, getJobResult } from '../lib/pipelineJob';
import type { StageCall } from '../lib/pipelineJob';
import { aspectRatioFor } from '../lib/sectionAspect';
import { runPool } from '../lib/asyncPool';
import type { Block } from '../store/AppContext';

const ROOT = path.resolve(__dirname, '..');
const BASE_URL = process.env.FLIK_BASE_URL ?? 'http://localhost:3000';
const REF_PATH = path.join(ROOT, 'test-assets', 'knit-cardigan.png');   // 없으면 이 스크립트가 먼저 만든다

/* ── .env.local 로더 ── */
function loadEnv(): Record<string, string> {
  const env: Record<string, string> = {};
  const p = path.join(ROOT, '.env.local');
  for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return env;
}

/* ── 상품 정보 — 실제 셀러가 폼에 넣을 법한 수준으로. 여기 적힌 것만 카피에 쓰인다. ── */
const PRESET = {
  cat: '패션', ch: '스마트스토어',
  productName: '오버핏 울 니트 가디건 (3color)',
  productExtra: [
    '[의류 종류]: 가디건/아우터',
    '[주요 타겟]: 20~30대 여성',
    '[소재]: 울 70%, 아크릴 30%',
    '[핏]: 오버핏 — 어깨가 내려오는 드롭숄더',
    '[사이즈]: FREE (총장 72cm, 가슴단면 58cm, 소매길이 60cm)',
    '[색상]: 오트밀, 차콜, 딥그린',
    '[세탁 방법]: 드라이클리닝 권장, 손세탁 시 찬물·중성세제',
    '[원산지]: 대한민국',
    '차별점: 어깨선을 낮춰 팔뚝이 드러나지 않고, 앞단추를 잠그면 재킷처럼 여며져 봄가을 겉옷으로도 입힌다',
    '구성: 가디건 1개',
    '가격: 정가 79000원 / 할인가 59000원',
    '고객 후기: 도톰한데 무겁지 않아서 좋아요. 오트밀 색이 사진보다 조금 밝은 편 - 김OO',
    '기타 요청사항: 실물 색은 채도가 낮은 뮤트 톤입니다. 쨍한 형광색으로 그리지 말 것.',
  ].join('\n'),
  productVolume: 'FREE',
};

/* ★여태 안 돌려본 섹션만. 과거 패션 런(runs/diversity-v3/01-패션-니트가디건)에서 이미 뽑은
   히어로·공감·핏·소재·세탁·컬러·후기·CTA는 제외한다 — 같은 걸 또 돈 주고 확인할 이유가 없다.
   ⚠️히어로와 CTA는 남긴다: 첫 섹션은 코드가 hero로 고정하고 마지막은 페이지의 뼈대라,
     빼면 나머지 섹션이 평소와 다른 자리에 놓여 검증이 오염된다. */
const SECTIONS = [
  '히어로',            // 뼈대(검증 대상 아님)
  '스타일 비전',        // editorial — 한 번도 안 뽑아봄
  '코디 제안',          // in_use ★오늘 고친 것 — 옷이 보이는지가 핵심
  '착용감',            // in_use ★
  '활동 시나리오',      // in_use ★
  '사이즈 가이드',      // clinical — 표·수치 컷
  '생산 과정',          // editorial
  '전문가 추천',        // clinical
  '비교표',            // clinical
  'SNS 공유컷',        // editorial
  '감성 카피',          // editorial
  'A/S 보증',          // clinical
  '관리법',            // texture
  'FAQ',              // clinical
  '법적 고지',          // open — 분류 근거 없는 쪽 확인
  'CTA',              // 뼈대(검증 대상 아님)
];
const SECTION_COUNT = SECTIONS.length;

interface RunSection {
  num: string; name: string; headline: string; subcopy?: string; body?: string;
  blocks?: Block[]; imageDesc: string; imageRatio?: string;
}

async function main() {
  if (!process.argv.includes('--yes')) throw new Error('비용 발생 — --yes 플래그 필요');
  const { NEXTAUTH_SECRET } = loadEnv();
  if (!NEXTAUTH_SECRET) throw new Error('.env.local에 NEXTAUTH_SECRET이 없습니다');

  /* 패션은 실제 제품 사진이 없다. 대표컷 한 장을 먼저 만들어 전 섹션의 레퍼런스로 쓴다 —
     이 한 장이 색·소재·핏의 기준이 되어야 섹션끼리 같은 옷으로 보인다. */
  const refs = [`data:image/png;base64,${fs.readFileSync(REF_PATH).toString('base64')}`];

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
  const outDir = path.join(ROOT, 'runs', `패션-미검증섹션-${stamp}`);
  fs.mkdirSync(outDir, { recursive: true });

  console.log(`[run] 패션 미검증 섹션 ${SECTIONS.length}개 — 카피 파이프라인 시작 (${BASE_URL})`);
  const t0 = Date.now();
  const job = createJob({
    cat: PRESET.cat, ch: PRESET.ch, out: 'blog',
    productName: PRESET.productName, productExtra: PRESET.productExtra,
    sectionCount: SECTION_COUNT, sectionStructure: SECTIONS, productVolume: PRESET.productVolume,
    jobKey: crypto.randomUUID(),
  });
  await runJob(job, {
    call: httpCall,
    onProgress: (_j, ev) => console.log(`  [${ev.stage}] ${ev.status}${ev.chunkStartIndex !== undefined ? ` @${ev.chunkStartIndex}` : ''}${ev.skipped ? ' (skip)' : ''}`),
  });
  const result = getJobResult(job);
  if (!result) throw new Error('파이프라인 결과 조립 실패');

  const accent = result.visual?.accent_color ?? '#8B5E3C';
  const sections: RunSection[] = result.sections.map(ps => ({
    num: ps.num, name: ps.name, headline: ps.headline, subcopy: ps.subcopy || undefined,
    body: ps.body || undefined, blocks: ps.blocks,
    imageDesc: ps.imageBrief?.prompt || ps.imageBrief?.mood || '', imageRatio: ps.imageBrief?.ratio,
  }));
  fs.writeFileSync(path.join(outDir, 'raw.json'), JSON.stringify({ visual: result.visual, sections: result.sections }, null, 2));
  console.log(`[run] 카피 완료 — ${sections.length}섹션, ${Math.round((Date.now() - t0) / 1000)}초`);

  if (process.argv.includes('--copy-only')) {
    console.log('[run] --copy-only — 이미지 생성 생략');
    return;
  }

  /* ── 이미지 생성 — ResultScreen 블로그 경로 미러(섹션: imageDesc / 블록: desc, outputType 'blog') ── */
  const t1 = Date.now();
  interface ImgTask { key: string; file: string; prompt: string; aspect: string | undefined; label: string }
  const imgTasks: ImgTask[] = [];
  sections.forEach((sec, i) => {
    if (sec.imageDesc) {
      imgTasks.push({
        key: sec.num, file: `sec${String(i + 1).padStart(2, '0')}.png`,
        prompt: sec.imageDesc, aspect: sec.imageRatio ?? aspectRatioFor(sec.name, undefined, 'blog'),   // 브리프 우선(리듬 보정 반영)
        label: `${i + 1}. ${sec.name}`,
      });
    }
    sec.blocks?.forEach((b, bi) => {
      if (b.type !== 'image') return;
      imgTasks.push({
        key: `${sec.num}#${bi}`, file: `sec${String(i + 1).padStart(2, '0')}-b${bi}.png`,
        prompt: b.desc, aspect: aspectRatioFor(sec.name, b.type),
        label: `${i + 1}. ${sec.name} [블록${bi}]`,
      });
    });
  });
  console.log(`[run] 이미지 ${imgTasks.length}장 생성 시작 (섹션 ${sections.length} + 블록 ${imgTasks.length - sections.length})`);

  const fileByKey: Record<string, string> = {};
  const tasks = imgTasks.map(t => async () => {
    const res = await fetch(`${BASE_URL}/api/generate-image`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify({
        prompt: t.prompt, sectionNum: t.key, productImages: refs,
        outputType: 'blog', aspectRatio: t.aspect, jobKey: job.input.jobKey,
      }),
    });
    const data = await res.json() as { imageBase64?: string; error?: string };
    if (data.imageBase64) {
      fs.writeFileSync(path.join(outDir, t.file), Buffer.from(data.imageBase64, 'base64'));
      fileByKey[t.key] = t.file;
      console.log(`  [img] ✅ ${t.label}`);
    } else {
      fs.writeFileSync(path.join(outDir, `${t.file}.error.txt`), data.error ?? 'unknown');
      console.log(`  [img] ❌ ${t.label}: ${data.error}`);
    }
  });
  await runPool(tasks, 3);
  console.log(`[run] 이미지 완료 — ${Math.round((Date.now() - t1) / 1000)}초`);

  /* ── 블로그 뷰어 — BlockRenderer 근사 렌더(검수용) ── */
  const esc = (s: string) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const renderBlock = (sec: RunSection, b: Block, bi: number): string => {
    switch (b.type) {
      case 'checklist': return `<ul class="ck">${b.items.map(i => `<li>${esc(i)}</li>`).join('')}</ul>`;
      case 'steps': return `<ol class="st">${b.items.map(s => `<li><b>${esc(s.title)}</b>${s.desc ? ` — ${esc(s.desc)}` : ''}</li>`).join('')}</ol>`;
      case 'iconcards': return `<div class="cards">${b.cards.map(c => `<div class="card"><b>${esc(c.title)}</b>${c.desc ? `<p>${esc(c.desc)}</p>` : ''}</div>`).join('')}</div>`;
      case 'stats': return `<div class="stats">${b.items.map(s => `<div><em>${esc(s.value)}</em><span>${esc(s.label)}</span></div>`).join('')}</div>`;
      case 'compare': return `<table class="cmp"><tr>${b.headers.map(h => `<th>${esc(h)}</th>`).join('')}</tr>${b.rows.map(r => `<tr>${r.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</table>`;
      case 'quote': return `<blockquote>${esc(b.text)}${b.author ? `<cite>— ${esc(b.author)}</cite>` : ''}</blockquote>`;
      case 'faq': return b.items.map(f => `<div class="faq"><b>Q. ${esc(f.q)}</b><p>A. ${esc(f.a)}</p></div>`).join('');
      case 'cta': return `<div class="cta"><p>${esc(b.text)}</p><span>${esc(b.button)}</span></div>`;
      case 'image': {
        const f = fileByKey[`${sec.num}#${bi}`];
        return f ? `<img src="${f}" alt="${esc(b.label)}">` : `<div class="miss">이미지 실패: ${esc(b.label)}</div>`;
      }
      case 'heading': return `<h3>${esc(b.text)}</h3>`;
      case 'paragraph': return `<p>${esc(b.text)}</p>`;
      default: return '';
    }
  };
  const html = `<!doctype html><meta charset="utf-8"><title>접짝뼈국 블로그형</title>
<style>
  body{margin:0;background:#f2f0ec;font-family:'Apple SD Gothic Neo',Pretendard,sans-serif;color:#222;line-height:1.7}
  .wrap{max-width:760px;margin:0 auto;background:#fff;padding:48px 40px;box-shadow:0 0 30px rgba(0,0,0,.08)}
  section{margin-bottom:64px}
  .tag{display:inline-block;font-size:12px;font-weight:700;color:${accent};border:1px solid ${accent};border-radius:99px;padding:2px 12px;margin-bottom:12px}
  h2{font-size:26px;line-height:1.35;letter-spacing:-.02em;margin:0 0 6px}
  .sub{font-size:15px;color:#777;margin:0 0 18px}
  img{width:100%;border-radius:12px;display:block;margin:18px 0}
  .body{font-size:15px;white-space:pre-line;margin:14px 0}
  .ck{list-style:none;padding:0}.ck li{padding:6px 0 6px 26px;position:relative}.ck li:before{content:'✓';position:absolute;left:2px;color:${accent};font-weight:800}
  .st{padding-left:20px}.st li{margin:8px 0}
  .cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px}.card{background:#faf8f5;border:1px solid #eee5da;border-radius:10px;padding:14px}.card p{margin:6px 0 0;font-size:13px;color:#666}
  .stats{display:flex;gap:10px}.stats>div{flex:1;background:#faf8f5;border-radius:10px;padding:14px;text-align:center}.stats em{display:block;font-style:normal;font-size:20px;font-weight:800;color:${accent}}.stats span{font-size:12px;color:#777}
  .cmp{width:100%;border-collapse:collapse;font-size:13.5px}.cmp th{background:${accent}18;padding:8px}.cmp td{border-top:1px solid #eee;padding:8px;text-align:center}
  blockquote{background:#faf8f5;border-left:3px solid ${accent};margin:14px 0;padding:14px 18px;border-radius:0 10px 10px 0}cite{display:block;font-size:12px;color:#999;margin-top:6px}
  .faq{margin:12px 0}.faq p{margin:4px 0 0;color:#555}
  .cta{background:${accent};color:#fff;border-radius:14px;padding:24px;text-align:center}.cta span{display:inline-block;background:#fff;color:${accent};font-weight:800;border-radius:99px;padding:10px 26px;margin-top:10px}
  .miss{background:#fee;color:#c00;padding:20px;border-radius:10px;text-align:center;font-size:13px}
</style>
<div class="wrap">
${sections.map((sec, i) => `<section>
  <span class="tag">${esc(sec.name)}</span>
  <h2>${esc(sec.headline)}</h2>
  ${sec.subcopy ? `<p class="sub">${esc(sec.subcopy)}</p>` : ''}
  ${fileByKey[sec.num] ? `<img src="${fileByKey[sec.num]}" alt="${esc(sec.name)}">` : ''}
  ${sec.body ? `<div class="body">${esc(sec.body)}</div>` : ''}
  ${(sec.blocks ?? []).map((b, bi) => renderBlock(sec, b, bi)).join('\n')}
</section>`).join('\n')}
</div>`;
  fs.writeFileSync(path.join(outDir, 'index.html'), html);
  console.log(`[run] 완료 → ${path.relative(ROOT, outDir)}/index.html`);
}

main().catch(e => { console.error(e); process.exit(1); });
