/**
 * 접짝뼈국 밀키트 블로그형 풀런 — flik-test.mts(슬라이드 하네스)의 블로그형 변형.
 *
 * 브라우저와 동일 경로: pipelineJob(runJob)이 dev 서버의 /api/strategy·structure·copy·imagebrief를
 * 호출하고, ResultScreen 블로그 경로와 동일하게 섹션 이미지(prompt=imageBrief.prompt, outputType blog)
 * + image 블록 이미지를 /api/generate-image 워커 3개로 생성한다.
 *
 * 실행 (dev 서버 켜진 상태): npx tsx scripts/bbyeoguk-blog-run.mts --yes
 * 출력: runs/뼈국-<타임스탬프>/index.html(블로그 렌더) + secNN.png + raw.json
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
const REF_DIR = '/private/tmp/claude-501/-Users-won-yugeun-Documents-Flik/3454abe9-22fc-4043-b1da-1362adaea000/scratchpad/bbyeoguk';

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

/* ── 상품 정보 v2 — 유근님 실제 폼 입력 기반(접짝뼈+도가니뼈·제주메밀·800g·냉장·주문 후 조리).
   국물 색은 실제 사진(뼈1·뼈3 = 진한 베이지빛 걸쭉) 기준으로 정정 — 이전 '붉은 국물' 문구가 텍스트-사진 충돌 원인. ── */
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
const SECTION_COUNT = 8;   // ★중요 섹션만 — 짧은 페이지 테스트

interface RunSection {
  num: string; name: string; headline: string; subcopy?: string; body?: string;
  blocks?: Block[]; imageDesc: string;
}

async function main() {
  if (!process.argv.includes('--yes')) throw new Error('비용 발생 — --yes 플래그 필요');
  const { NEXTAUTH_SECRET } = loadEnv();
  if (!NEXTAUTH_SECRET) throw new Error('.env.local에 NEXTAUTH_SECRET이 없습니다');

  // 실제 제품 사진 — 대표컷 = 완성 국물(뼈3, 음식이 아이덴티티), 보조컷 = 파우치(뼈2)
  const refs = ['ref3.jpg', 'ref-pouch.jpg'].map(f =>
    `data:image/jpeg;base64,${fs.readFileSync(path.join(REF_DIR, f)).toString('base64')}`);

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
  const outDir = path.join(ROOT, 'runs', `뼈국-${stamp}`);
  fs.mkdirSync(outDir, { recursive: true });

  console.log(`[run] 접짝뼈국 블로그형 — 카피 파이프라인 시작 (${BASE_URL})`);
  const t0 = Date.now();
  const job = createJob({
    cat: PRESET.cat, ch: PRESET.ch, out: 'blog',
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

  const accent = result.visual?.accent_color ?? '#8B5E3C';
  const sections: RunSection[] = result.sections.map(ps => ({
    num: ps.num, name: ps.name, headline: ps.headline, subcopy: ps.subcopy || undefined,
    body: ps.body || undefined, blocks: ps.blocks,
    imageDesc: ps.imageBrief?.prompt || ps.imageBrief?.mood || '',
  }));
  fs.writeFileSync(path.join(outDir, 'raw.json'), JSON.stringify({ visual: result.visual, sections: result.sections }, null, 2));
  console.log(`[run] 카피 완료 — ${sections.length}섹션, ${Math.round((Date.now() - t0) / 1000)}초`);

  /* ── 이미지 생성 — ResultScreen 블로그 경로 미러(섹션: imageDesc / 블록: desc, outputType 'blog') ── */
  const t1 = Date.now();
  interface ImgTask { key: string; file: string; prompt: string; aspect: string | undefined; label: string }
  const imgTasks: ImgTask[] = [];
  sections.forEach((sec, i) => {
    if (sec.imageDesc) {
      imgTasks.push({
        key: sec.num, file: `sec${String(i + 1).padStart(2, '0')}.png`,
        prompt: sec.imageDesc, aspect: aspectRatioFor(sec.name, undefined, 'blog'),
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
