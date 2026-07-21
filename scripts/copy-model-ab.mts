/**
 * 카피 모델 A/B 하네스 — 텍스트만 생성(이미지 0장, 비용 ~1천원 미만).
 *
 * 같은 입력(프리셋) → strategy+structure 1회 공유 → copy 스테이지만 모델별로 생성해
 * 슬라이드형·블로그형 카피를 4열로 나란히 비교하는 HTML 리포트를 만든다.
 *
 *   npx tsx scripts/copy-model-ab.mts --yes            # vitamin 프리셋, 6섹션
 *   npx tsx scripts/copy-model-ab.mts --yes --sections 8
 *
 * 출력: runs/카피모델비교-<타임스탬프>/index.html + raw.json
 * 프로덕션 코드 무영향 — copy.ts의 buildCopyChunkPrompts(프롬프트만)를 재사용한다.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

/* ── .env.local 로더(dotenv 미의존, flik-test.mts와 동일) — lib import 전에 주입 ── */
{
  const p = path.join(ROOT, '.env.local');
  if (fs.existsSync(p)) {
    for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  }
}

// env 주입 후 동적 import — 스테이지 모듈이 로드 시점에 Anthropic 클라이언트를 만들기 때문.
const { default: Anthropic } = await import('@anthropic-ai/sdk');
const { runStrategy } = await import('../lib/stages/strategy');
const { runStructure } = await import('../lib/stages/structure');
const { buildStrategySummary, buildCopyChunkPrompts, COPY_CHUNK_SIZE } = await import('../lib/stages/copy');
type CopyOut = import('../lib/stages/copy').CopyOut;
const { scrubCopyItems } = await import('../lib/factScrub');

/* ── 설정 ── */
const PRESETS: Record<string, { cat: string; ch: string; productName: string; productExtra: string }> = {
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
  },
  // 농산물 — 후기 미입력(가짜 후기 날조 가드를 모델별로 비교하는 케이스)
  pumpkin: {
    cat: '식품', ch: '스마트스토어',
    productName: '보우짱 밤호박 미니 단호박 3kg (5~7통)',
    productExtra: [
      '브랜드: 산들팜 — 산지에서 바로 보내는 제철 농산물',
      '차별점: 보우짱 품종 미니 밤호박 — 일반 단호박보다 밤처럼 포슬포슬한 식감과 진한 단맛',
      '특징: 개당 400~600g 손바닥 크기, 국내산, 수확 후 후숙을 거쳐 당도가 오른 상태로 발송',
      '조리: 통째로 전자레인지 6~7분이면 완성, 찜기·에어프라이어 조리 가능',
      '보관: 서늘한 실온 보관, 컷팅 후에는 랩핑해 냉장 보관',
      '가격: 정가 19900원 / 할인가 15900원',
    ].join('\n'),
  },
};

interface ModelCfg {
  key: string;
  label: string;
  kind: 'anthropic' | 'openai';
  model: string;
  temperature?: number;   // anthropic 전용 — 지정 시에만 전송(Opus 4.8은 temperature 자체가 400)
  adaptiveThinking?: boolean; // anthropic 전용 — Opus 4.8은 명시해야 thinking이 켜짐
  priceIn: number;        // $/1M tokens (리포트 추정용)
  priceOut: number;
  priceNote?: string;
}

const MODELS: ModelCfg[] = [
  { key: 'sonnet46', label: 'Sonnet 4.6 (현행)', kind: 'anthropic', model: 'claude-sonnet-4-6', temperature: 1, priceIn: 3, priceOut: 15 },
  { key: 'sonnet5',  label: 'Sonnet 5',          kind: 'anthropic', model: 'claude-sonnet-5', priceIn: 2, priceOut: 10, priceNote: '프로모션가(~8/31), 이후 $3/$15' },
  { key: 'opus48',   label: 'Opus 4.8',          kind: 'anthropic', model: 'claude-opus-4-8', adaptiveThinking: true, priceIn: 5, priceOut: 25 },
  { key: 'terra',    label: 'GPT-5.6 Terra',     kind: 'openai',    model: 'gpt-5.6-terra', priceIn: 2.5, priceOut: 15 },
];

const FORMS: Array<{ out: 'slide' | 'blog'; label: string }> = [
  { out: 'blog',  label: '블로그형' },
  { out: 'slide', label: '슬라이드형' },
];

const MAX_ATTEMPTS = 2;

/* ── 모델 호출 ── */
interface CallResult { raw: string; inTok: number; outTok: number; stop?: string }

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function callClaude(cfg: ModelCfg, system: string, user: string): Promise<CallResult> {
  const message = await anthropic.messages.create({
    model: cfg.model,
    max_tokens: 16000,
    ...(cfg.temperature !== undefined ? { temperature: cfg.temperature } : {}),
    ...(cfg.adaptiveThinking ? { thinking: { type: 'adaptive' as const } } : {}),
    system,
    messages: [{ role: 'user', content: user }],
  } as Parameters<typeof anthropic.messages.create>[0]) as import('@anthropic-ai/sdk/resources/messages').Message;
  const raw = message.content.find(b => b.type === 'text')?.text ?? '';
  return { raw, inTok: message.usage?.input_tokens ?? 0, outTok: message.usage?.output_tokens ?? 0, stop: message.stop_reason ?? undefined };
}

async function callOpenAI(cfg: ModelCfg, system: string, user: string): Promise<CallResult> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: JSON.stringify({
      model: cfg.model,
      messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
      max_completion_tokens: 16000,
    }),
  });
  const j = await res.json() as {
    choices?: Array<{ message?: { content?: string }; finish_reason?: string }>;
    usage?: { prompt_tokens?: number; completion_tokens?: number };
    error?: { message?: string };
  };
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${j?.error?.message ?? JSON.stringify(j).slice(0, 200)}`);
  return {
    raw: j.choices?.[0]?.message?.content ?? '',
    inTok: j.usage?.prompt_tokens ?? 0,
    outTok: j.usage?.completion_tokens ?? 0,
    stop: j.choices?.[0]?.finish_reason,
  };
}

/* ── 파싱(프로덕션 runCopyChunk와 동일 규칙: [ ] 추출 → 배열 → 개수 일치) ── */
function parseChunk(raw: string, expected: number): CopyOut[] {
  const first = raw.indexOf('[');
  const last  = raw.lastIndexOf(']');
  if (first === -1 || last === -1 || last < first) throw new Error('응답에서 JSON 배열을 찾을 수 없음');
  const p = JSON.parse(raw.slice(first, last + 1));
  if (!Array.isArray(p)) throw new Error(`JSON이 배열이 아님: ${typeof p}`);
  if (p.length !== expected) throw new Error(`개수 불일치 — 요청 ${expected} ↔ 응답 ${p.length}`);
  return (p as Record<string, unknown>[]).map(s => ({
    name:     typeof s.name === 'string' ? s.name : '',
    headline: typeof s.headline === 'string' ? s.headline : '',
    subcopy:  typeof s.subcopy === 'string' ? s.subcopy : '',
    body:     typeof s.body === 'string' ? s.body : '',
    blocks:   Array.isArray(s.blocks) ? (s.blocks as CopyOut['blocks']) : undefined,
  }));
}

/* ── HTML 렌더(간단 블록 렌더러) ── */
function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function renderBlocks(blocks: CopyOut['blocks']): string {
  if (!blocks?.length) return '';
  return blocks.map(b => {
    const t = b as Record<string, unknown>;
    switch (t.type) {
      case 'checklist': return `<ul class="bk">${(t.items as string[] ?? []).map(i => `<li>✓ ${esc(String(i))}</li>`).join('')}</ul>`;
      case 'steps': return `<ol class="bk">${((t.items as Array<{title?: string; desc?: string}>) ?? []).map(i => `<li><b>${esc(i.title ?? '')}</b> — ${esc(i.desc ?? '')}</li>`).join('')}</ol>`;
      case 'iconcards': return `<div class="cards">${((t.cards as Array<{title?: string; desc?: string}>) ?? []).map(c => `<div class="card"><b>${esc(c.title ?? '')}</b><span>${esc(c.desc ?? '')}</span></div>`).join('')}</div>`;
      case 'stats': return `<div class="cards">${((t.items as Array<{value?: string; label?: string}>) ?? []).map(i => `<div class="card"><b>${esc(i.value ?? '')}</b><span>${esc(i.label ?? '')}</span></div>`).join('')}</div>`;
      case 'compare': {
        const headers = (t.headers as string[]) ?? [];
        const rows = (t.rows as string[][]) ?? [];
        return `<table class="bk cmp"><tr>${headers.map(h => `<th>${esc(h)}</th>`).join('')}</tr>${rows.map(r => `<tr>${r.map(c => `<td>${esc(String(c))}</td>`).join('')}</tr>`).join('')}</table>`;
      }
      case 'quote': return `<blockquote class="bk">“${esc(String(t.text ?? ''))}”${t.author ? ` — ${esc(String(t.author))}` : ''}</blockquote>`;
      case 'faq': return `<div class="bk">${((t.items as Array<{q?: string; a?: string}>) ?? []).map(i => `<p><b>Q. ${esc(i.q ?? '')}</b><br>A. ${esc(i.a ?? '')}</p>`).join('')}</div>`;
      case 'heading': return `<p class="bk"><b>${esc(String(t.text ?? ''))}</b></p>`;
      case 'cta': return `<p class="bk">${esc(String(t.text ?? ''))} <span class="btn">${esc(String(t.button ?? ''))}</span></p>`;
      default: return `<pre class="bk">${esc(JSON.stringify(t, null, 1))}</pre>`;
    }
  }).join('');
}

/* ── 메인 ── */
async function main() {
  if (!process.argv.includes('--yes')) {
    console.log('비용 발생(전부 텍스트, 총 ~1천원 미만). 실행하려면 --yes 를 붙이세요.');
    process.exit(1);
  }
  const secFlagIdx = process.argv.indexOf('--sections');
  const sectionCount = secFlagIdx > -1 ? Number(process.argv[secFlagIdx + 1]) : 6;
  const presetIdx = process.argv.indexOf('--preset');
  const presetKey = presetIdx > -1 ? process.argv[presetIdx + 1] : 'vitamin';
  const PRESET = PRESETS[presetKey];
  if (!PRESET) { console.error(`알 수 없는 프리셋: ${presetKey} (${Object.keys(PRESETS).join('/')})`); process.exit(1); }

  const knownFacts = [PRESET.productName, PRESET.productExtra].join('\n');
  const t0 = Date.now();

  console.log(`[ab] strategy 생성 중… (공유 1회, ${PRESET.productName})`);
  const { dna, strategy } = await runStrategy({ cat: PRESET.cat, ch: PRESET.ch, productName: PRESET.productName, productExtra: PRESET.productExtra });
  console.log(`[ab] structure 생성 중… (${sectionCount}섹션)`);
  const structure = await runStructure({ dna, strategy, cat: PRESET.cat, ch: PRESET.ch, depth: '간결', sectionCount });
  const sections = structure.sections;
  const ss = buildStrategySummary(dna, strategy);
  console.log(`[ab] 섹션 ${sections.length}개: ${sections.map(s => s.name).join(' / ')}`);

  // 청크 분할(프로덕션과 동일 크기)
  const starts: number[] = [];
  for (let i = 0; i < sections.length; i += COPY_CHUNK_SIZE) starts.push(i);

  interface Cell { copies?: CopyOut[]; error?: string; inTok: number; outTok: number; ms: number }
  const results: Record<string, Record<string, Cell>> = {}; // form → modelKey → Cell

  const jobs: Array<Promise<void>> = [];
  for (const form of FORMS) {
    results[form.out] = {};
    for (const cfg of MODELS) {
      const cell: Cell = { inTok: 0, outTok: 0, ms: 0 };
      results[form.out][cfg.key] = cell;
      jobs.push((async () => {
        const t = Date.now();
        try {
          const chunkOuts = await Promise.all(starts.map(async i => {
            const items = sections.slice(i, i + COPY_CHUNK_SIZE);
            const { composedSystem, userPrompt } = buildCopyChunkPrompts({
              strategySummary: ss, sections: items, startIndex: i, totalSections: sections.length,
              cat: PRESET.cat, ch: PRESET.ch, out: form.out, knownFacts,
            });
            let lastErr = '';
            for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
              try {
                const r = cfg.kind === 'anthropic'
                  ? await callClaude(cfg, composedSystem, userPrompt)
                  : await callOpenAI(cfg, composedSystem, userPrompt);
                cell.inTok += r.inTok; cell.outTok += r.outTok;
                const parsed = parseChunk(r.raw, items.length);
                // CopyOut은 인덱스 시그니처가 없어 CopyLike 제네릭에 직접 안 맞음 — 구조는 동일하므로 캐스팅
                return scrubCopyItems(parsed as Array<CopyOut & Record<string, unknown>>, knownFacts) as CopyOut[];
              } catch (e) {
                lastErr = e instanceof Error ? e.message : String(e);
                console.warn(`[ab] ${cfg.label} ${form.label} chunk@${i} attempt=${attempt} 실패: ${lastErr.slice(0, 160)}`);
              }
            }
            throw new Error(`chunk@${i}: ${lastErr}`);
          }));
          cell.copies = chunkOuts.flat();
          console.log(`[ab] ✅ ${cfg.label} · ${form.label} (${((Date.now() - t) / 1000).toFixed(0)}s, in=${cell.inTok} out=${cell.outTok})`);
        } catch (e) {
          cell.error = e instanceof Error ? e.message : String(e);
          console.error(`[ab] ❌ ${cfg.label} · ${form.label}: ${cell.error.slice(0, 200)}`);
        }
        cell.ms = Date.now() - t;
      })());
    }
  }
  await Promise.all(jobs);

  /* ── 리포트 ── */
  const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '').replace(/-/g, '');
  const outDir = path.join(ROOT, 'runs', `카피모델비교-${presetKey}-${stamp}`);
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'raw.json'), JSON.stringify({ preset: PRESET, dna, strategy, sections, results }, null, 2));

  const summaryRows = MODELS.map(cfg => {
    const cells = FORMS.map(f => results[f.out][cfg.key]);
    const inTok = cells.reduce((a, c) => a + c.inTok, 0);
    const outTok = cells.reduce((a, c) => a + c.outTok, 0);
    const usd = inTok / 1e6 * cfg.priceIn + outTok / 1e6 * cfg.priceOut;
    const errs = cells.filter(c => c.error).length;
    const secs = Math.max(...cells.map(c => c.ms)) / 1000;
    return `<tr><td><b>${cfg.label}</b><br><code>${cfg.model}</code></td>
      <td>$${cfg.priceIn} / $${cfg.priceOut}${cfg.priceNote ? `<br><small>${cfg.priceNote}</small>` : ''}</td>
      <td>${inTok.toLocaleString()} / ${outTok.toLocaleString()}</td>
      <td>$${usd.toFixed(3)} (약 ${(usd * 1400).toFixed(0)}원)</td>
      <td>${secs.toFixed(0)}s</td>
      <td>${errs ? `⚠️ ${errs}건 실패` : '✅'}</td></tr>`;
  }).join('');

  const formHtml = FORMS.map(f => {
    const perSection = sections.map((sec, si) => {
      const cols = MODELS.map(cfg => {
        const cell = results[f.out][cfg.key];
        if (cell.error) return `<div class="col err">생성 실패<br><small>${esc(cell.error.slice(0, 200))}</small></div>`;
        const c = cell.copies?.[si];
        if (!c) return `<div class="col err">섹션 누락</div>`;
        return `<div class="col">
          <h3>${esc(c.headline)}</h3>
          <p class="sub">${esc(c.subcopy)}</p>
          <p class="body">${esc(c.body).replace(/\n/g, '<br>')}</p>
          ${renderBlocks(c.blocks)}
        </div>`;
      }).join('');
      return `<h2>${si + 1}. ${esc(sec.name ?? '섹션')} <small>${esc(sec.role ?? '')}</small></h2>
        <div class="modelnames">${MODELS.map(m => `<div>${m.label}</div>`).join('')}</div>
        <div class="grid">${cols}</div>`;
    }).join('');
    return `<section><h1>${f.label}</h1>${perSection}</section>`;
  }).join('<hr>');

  const html = `<!doctype html><meta charset="utf-8"><title>카피 모델 A/B — ${esc(PRESET.productName)}</title>
<style>
  body{font-family:-apple-system,'Apple SD Gothic Neo',sans-serif;margin:24px;background:#fafafa;color:#222}
  h1{font-size:22px;border-bottom:2px solid #333;padding-bottom:8px}
  h2{font-size:16px;margin:28px 0 6px}
  h2 small{color:#888;font-weight:400;font-size:12px}
  table.sum{border-collapse:collapse;margin:12px 0;font-size:13px}
  table.sum td,table.sum th{border:1px solid #ddd;padding:6px 10px;text-align:left;vertical-align:top}
  .modelnames{display:grid;grid-template-columns:repeat(${MODELS.length},1fr);gap:10px;font-weight:700;font-size:12px;color:#555;margin-bottom:4px}
  .grid{display:grid;grid-template-columns:repeat(${MODELS.length},1fr);gap:10px;align-items:start}
  .col{background:#fff;border:1px solid #e5e5e5;border-radius:10px;padding:12px;font-size:12.5px;line-height:1.55}
  .col h3{font-size:14px;margin:0 0 4px}
  .col .sub{color:#666;font-style:italic;margin:0 0 8px}
  .col .body{white-space:normal}
  .col.err{background:#fff4f4;color:#a33}
  .bk{background:#f6f7f9;border-radius:8px;padding:8px 10px;margin:8px 0;font-size:12px}
  ul.bk,ol.bk{padding-left:22px}
  .cards{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0}
  .card{background:#f6f7f9;border-radius:8px;padding:6px 9px;font-size:11.5px;display:flex;flex-direction:column;min-width:80px}
  .card b{font-size:12px}
  table.cmp{border-collapse:collapse;width:100%}
  table.cmp th,table.cmp td{border:1px solid #ddd;padding:4px 6px;font-size:11px}
  blockquote.bk{margin:8px 0;font-style:italic}
  .btn{background:#333;color:#fff;border-radius:6px;padding:2px 8px;font-size:11px}
  hr{margin:40px 0;border:none;border-top:2px dashed #ccc}
</style>
<h1>카피 모델 A/B — ${esc(PRESET.productName)}</h1>
<p>같은 strategy·structure(${sections.length}섹션, Sonnet 4.6로 1회 생성·전 모델 공유) 아래에서 <b>copy 스테이지만</b> 모델 교체. 생성 시각: ${new Date().toLocaleString('ko-KR')}</p>
<table class="sum"><tr><th>모델</th><th>단가(입력/출력, 1M)</th><th>토큰(입력/출력)</th><th>이번 생성 비용(2형태 합)</th><th>소요</th><th>상태</th></tr>${summaryRows}</table>
${formHtml}`;

  fs.writeFileSync(path.join(outDir, 'index.html'), html);
  console.log(`\n[ab] 완료 (${((Date.now() - t0) / 1000).toFixed(0)}s) → ${path.join(outDir, 'index.html')}`);
}

await main();
