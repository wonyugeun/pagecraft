/**
 * 블로그형 콘텐츠 디렉터 A/B — 정형화(고정 블록 매핑) 해소 검증. 텍스트만(이미지 0장).
 *
 * 같은 strategy+structure 아래에서 카피를 2가지 프롬프트로 생성해 비교:
 *  - 현행: 역할→블록 1:1 고정 매핑(히어로=iconcards 필수, 공감=checklist …) — 페이지마다 같은 구조가 나오는 원인
 *  - 디렉터형: 고정 매핑을 걷어내고, 카피라이터가 콘텐츠 디렉터로서 페이지 리듬(블록 유무·종류·배치)을 직접 판단
 *
 * 제품 2종(비타민·밤호박)으로 돌려 "다른 제품인데 같은 구조" vs "제품마다 다른 구조"를 확인한다.
 *
 *   npx tsx scripts/blog-director-ab.mts --yes
 *
 * 출력: runs/블로그디렉터-<타임스탬프>/index.html + raw.json
 * 프로덕션 무영향 — 프롬프트는 buildCopyChunkPrompts 산출물을 국소 치환해 만든다(모델 동일 sonnet-5, 단일 호출 6섹션).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

/* ── .env.local 로더 — lib import 전에 주입 ── */
{
  const p = path.join(ROOT, '.env.local');
  if (fs.existsSync(p)) {
    for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  }
}

const { default: Anthropic } = await import('@anthropic-ai/sdk');
const { runStrategy } = await import('../lib/stages/strategy');
const { runStructure } = await import('../lib/stages/structure');
const { buildStrategySummary, buildCopyChunkPrompts, COPY_MODEL } = await import('../lib/stages/copy');
type CopyOut = import('../lib/stages/copy').CopyOut;
const { scrubCopyItems } = await import('../lib/factScrub');

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

/* ── 디렉터 지침 — 현행 프롬프트의 '역할→권장 블록 매핑' 구간만 이걸로 치환(스키마·가드는 그대로) ── */
const DIRECTOR_RHYTHM = `당신은 카피라이터이자 이 페이지의 콘텐츠 디렉터입니다. 블록 사용을 정해진 매핑 없이 섹션마다 스스로 판단하세요:
- 페이지 전체를 한 편의 글로 설계하세요. 어떤 섹션은 글만으로 승부하고(블록 0개 허용), 어떤 섹션은 시각 블록이 주인공입니다. 전체 섹션 중 블록 없는 순수 글 섹션을 1~2개 두어 읽는 리듬을 만드세요.
- 같은 블록 타입을 연속 섹션에서 반복하지 마세요. 페이지 전체에서 같은 타입은 최대 2회.
- 블록은 그 섹션의 내용이 '표·카드·체크리스트로 봐야 더 설득되는' 경우에만 쓰세요. 정보가 글로 더 잘 흐르면 글로 쓰세요.
- 첫(히어로) 섹션도 반드시 카드로 시작할 필요 없습니다 — 이 제품과 전략에 맞는 첫인상(강한 선언 한 줄, 장면 묘사, 수치 카드 등)을 직접 고르세요.
- 이 제품만의 이야기 구조가 드러나야 합니다. 다른 제품 페이지와 똑같은 블록 배치가 나오면 실패입니다.`;

interface VariantResult { copies?: CopyOut[]; error?: string; inTok: number; outTok: number; ms: number }

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function genCopy(system: string, user: string, expected: number, knownFacts: string): Promise<{ copies: CopyOut[]; inTok: number; outTok: number }> {
  let lastErr = '';
  for (let attempt = 1; attempt <= 2; attempt++) {
    const message = await anthropic.messages.create({
      model: COPY_MODEL, max_tokens: 16000, thinking: { type: 'adaptive' },
      system, messages: [{ role: 'user', content: user }],
    });
    const raw = message.content.find(b => b.type === 'text')?.text ?? '';
    const inTok = message.usage?.input_tokens ?? 0;
    const outTok = message.usage?.output_tokens ?? 0;
    try {
      const first = raw.indexOf('[');
      const last = raw.lastIndexOf(']');
      if (first === -1 || last <= first) throw new Error('JSON 배열 없음');
      const p = JSON.parse(raw.slice(first, last + 1));
      if (!Array.isArray(p) || p.length !== expected) throw new Error(`개수 불일치 ${Array.isArray(p) ? p.length : '?'}≠${expected}`);
      const mapped = (p as Record<string, unknown>[]).map(s => ({
        name: typeof s.name === 'string' ? s.name : '',
        headline: typeof s.headline === 'string' ? s.headline : '',
        subcopy: typeof s.subcopy === 'string' ? s.subcopy : '',
        body: typeof s.body === 'string' ? s.body : '',
        blocks: Array.isArray(s.blocks) ? (s.blocks as CopyOut['blocks']) : undefined,
      }));
      return { copies: scrubCopyItems(mapped as Array<CopyOut & Record<string, unknown>>, knownFacts) as CopyOut[], inTok, outTok };
    } catch (e) {
      lastErr = e instanceof Error ? e.message : String(e);
      console.warn(`  attempt=${attempt} 파싱 실패: ${lastErr}`);
    }
  }
  throw new Error(lastErr);
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function blockSeq(copies?: CopyOut[]): string[] {
  return (copies ?? []).map(c => (c.blocks?.length ? c.blocks.map(b => (b as { type?: string }).type ?? '?').join('+') : '글만'));
}
function renderBlocks(blocks: CopyOut['blocks']): string {
  if (!blocks?.length) return '';
  return blocks.map(b => {
    const t = b as Record<string, unknown>;
    switch (t.type) {
      case 'checklist': return `<ul class="bk">${((t.items as string[]) ?? []).map(i => `<li>✓ ${esc(String(i))}</li>`).join('')}</ul>`;
      case 'steps': return `<ol class="bk">${((t.items as Array<{ title?: string; desc?: string }>) ?? []).map(i => `<li><b>${esc(i.title ?? '')}</b> — ${esc(i.desc ?? '')}</li>`).join('')}</ol>`;
      case 'iconcards': return `<div class="cards">${((t.cards as Array<{ title?: string; desc?: string }>) ?? []).map(c => `<div class="card"><b>${esc(c.title ?? '')}</b><span>${esc(c.desc ?? '')}</span></div>`).join('')}</div>`;
      case 'stats': return `<div class="cards">${((t.items as Array<{ value?: string; label?: string }>) ?? []).map(i => `<div class="card"><b>${esc(i.value ?? '')}</b><span>${esc(i.label ?? '')}</span></div>`).join('')}</div>`;
      case 'compare': {
        const headers = (t.headers as string[]) ?? [];
        const rows = (t.rows as string[][]) ?? [];
        return `<table class="bk cmp"><tr>${headers.map(h => `<th>${esc(h)}</th>`).join('')}</tr>${rows.map(r => `<tr>${r.map(c => `<td>${esc(String(c))}</td>`).join('')}</tr>`).join('')}</table>`;
      }
      case 'quote': return `<blockquote class="bk">“${esc(String(t.text ?? ''))}”${t.author ? ` — ${esc(String(t.author))}` : ''}</blockquote>`;
      case 'faq': return `<div class="bk">${((t.items as Array<{ q?: string; a?: string }>) ?? []).map(i => `<p><b>Q. ${esc(i.q ?? '')}</b><br>A. ${esc(i.a ?? '')}</p>`).join('')}</div>`;
      case 'heading': return `<p class="bk"><b>${esc(String(t.text ?? ''))}</b></p>`;
      case 'cta': return `<p class="bk">${esc(String(t.text ?? ''))} <span class="btn">${esc(String(t.button ?? ''))}</span></p>`;
      default: return `<pre class="bk">${esc(JSON.stringify(t, null, 1))}</pre>`;
    }
  }).join('');
}

async function main() {
  if (!process.argv.includes('--yes')) {
    console.log('비용 발생(전부 텍스트, ~500원 미만). 실행하려면 --yes 를 붙이세요.');
    process.exit(1);
  }
  const t0 = Date.now();
  const out: Record<string, {
    sections: Array<{ name?: string; role?: string }>;
    variants: Record<'current' | 'director', VariantResult>;
  }> = {};

  for (const [key, preset] of Object.entries(PRESETS)) {
    console.log(`\n[dir-ab] ${key} — strategy/structure 생성…`);
    const { dna, strategy } = await runStrategy({ cat: preset.cat, ch: preset.ch, productName: preset.productName, productExtra: preset.productExtra });
    const structure = await runStructure({ dna, strategy, cat: preset.cat, ch: preset.ch, depth: '간결', sectionCount: 6 });
    const sections = structure.sections;
    const ss = buildStrategySummary(dna, strategy);
    const knownFacts = [preset.productName, preset.productExtra].join('\n');
    console.log(`[dir-ab] ${key} 섹션: ${sections.map(s => s.name).join(' / ')}`);

    // 현행 프롬프트(전 섹션 단일 호출 — 디렉터형과 동일 조건으로 공정 비교)
    const { composedSystem, userPrompt } = buildCopyChunkPrompts({
      strategySummary: ss, sections, startIndex: 0, totalSections: sections.length,
      cat: preset.cat, ch: preset.ch, out: 'blog', knownFacts,
    });

    // 디렉터형 = 현행 userPrompt에서 '역할→권장 블록 매핑' 구간만 치환(스키마·법적 가드·전략 주입은 동일)
    const mapStart = userPrompt.indexOf('역할 → 권장 블록 매핑:');
    const mapEnd = userPrompt.indexOf('블록 스키마(');
    if (mapStart === -1 || mapEnd === -1 || mapEnd <= mapStart) throw new Error('블록 매핑 구간을 찾지 못함 — copy.ts 프롬프트가 바뀌었는지 확인');
    const directorPrompt = userPrompt.slice(0, mapStart) + DIRECTOR_RHYTHM + '\n\n' + userPrompt.slice(mapEnd);

    out[key] = { sections, variants: {} as Record<'current' | 'director', VariantResult> };
    await Promise.all(([['current', userPrompt], ['director', directorPrompt]] as const).map(async ([variant, prompt]) => {
      const t = Date.now();
      const cell: VariantResult = { inTok: 0, outTok: 0, ms: 0 };
      out[key].variants[variant] = cell;
      try {
        const r = await genCopy(composedSystem, prompt, sections.length, knownFacts);
        cell.copies = r.copies; cell.inTok = r.inTok; cell.outTok = r.outTok;
        console.log(`[dir-ab] ✅ ${key}/${variant} (${((Date.now() - t) / 1000).toFixed(0)}s, out=${r.outTok}) 블록: ${blockSeq(r.copies).join(' | ')}`);
      } catch (e) {
        cell.error = e instanceof Error ? e.message : String(e);
        console.error(`[dir-ab] ❌ ${key}/${variant}: ${cell.error}`);
      }
      cell.ms = Date.now() - t;
    }));
  }

  /* ── 리포트 ── */
  const stamp = new Date().toISOString().slice(0, 16).replace(/[:T-]/g, '');
  const outDir = path.join(ROOT, 'runs', `블로그디렉터-${stamp}`);
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'raw.json'), JSON.stringify(out, null, 2));

  const seqTable = Object.entries(out).map(([key, d]) => {
    const cur = blockSeq(d.variants.current?.copies);
    const dir = blockSeq(d.variants.director?.copies);
    return `<tr><td rowspan="2"><b>${key}</b></td><td>현행</td>${cur.map(s => `<td>${esc(s)}</td>`).join('')}</tr>
      <tr><td><b>디렉터</b></td>${dir.map(s => `<td class="d">${esc(s)}</td>`).join('')}</tr>`;
  }).join('');

  const productHtml = Object.entries(out).map(([key, d]) => {
    const perSection = d.sections.map((sec, si) => {
      const cols = (['current', 'director'] as const).map(variant => {
        const cell = d.variants[variant];
        if (cell.error) return `<div class="col err">실패: ${esc(cell.error.slice(0, 150))}</div>`;
        const c = cell.copies?.[si];
        if (!c) return `<div class="col err">섹션 누락</div>`;
        return `<div class="col">
          <h3>${esc(c.headline)}</h3>
          <p class="sub">${esc(c.subcopy)}</p>
          <p class="body">${esc(c.body).replace(/\n/g, '<br>')}</p>
          ${renderBlocks(c.blocks)}
        </div>`;
      }).join('');
      return `<h2>${si + 1}. ${esc(sec.name ?? '')} <small>${esc(sec.role ?? '')}</small></h2>
        <div class="modelnames"><div>현행 (고정 매핑)</div><div>디렉터형 (리듬 자유)</div></div>
        <div class="grid">${cols}</div>`;
    }).join('');
    return `<section><h1>${key} — ${esc(PRESETS[key].productName)}</h1>${perSection}</section>`;
  }).join('<hr>');

  const html = `<!doctype html><meta charset="utf-8"><title>블로그 콘텐츠 디렉터 A/B</title>
<style>
  body{font-family:-apple-system,'Apple SD Gothic Neo',sans-serif;margin:24px;background:#fafafa;color:#222}
  h1{font-size:20px;border-bottom:2px solid #333;padding-bottom:8px}
  h2{font-size:15px;margin:26px 0 6px} h2 small{color:#888;font-weight:400;font-size:12px}
  table.seq{border-collapse:collapse;margin:14px 0;font-size:12px}
  table.seq td,table.seq th{border:1px solid #ddd;padding:5px 9px}
  table.seq td.d{background:#f3efff}
  .modelnames{display:grid;grid-template-columns:1fr 1fr;gap:10px;font-weight:700;font-size:12px;color:#555;margin-bottom:4px}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;align-items:start}
  .col{background:#fff;border:1px solid #e5e5e5;border-radius:10px;padding:12px;font-size:12.5px;line-height:1.55}
  .col h3{font-size:14px;margin:0 0 4px} .col .sub{color:#666;font-style:italic;margin:0 0 8px}
  .col.err{background:#fff4f4;color:#a33}
  .bk{background:#f6f7f9;border-radius:8px;padding:8px 10px;margin:8px 0;font-size:12px}
  ul.bk,ol.bk{padding-left:22px}
  .cards{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0}
  .card{background:#f6f7f9;border-radius:8px;padding:6px 9px;font-size:11.5px;display:flex;flex-direction:column;min-width:80px}
  table.cmp{border-collapse:collapse;width:100%} table.cmp th,table.cmp td{border:1px solid #ddd;padding:4px 6px;font-size:11px}
  blockquote.bk{margin:8px 0;font-style:italic}
  .btn{background:#333;color:#fff;border-radius:6px;padding:2px 8px;font-size:11px}
  hr{margin:40px 0;border:none;border-top:2px dashed #ccc}
</style>
<h1>블로그 콘텐츠 디렉터 A/B — 블록 구조 비교</h1>
<p>핵심 확인 포인트: <b>블록 시퀀스 표</b>에서 "다른 두 제품이 같은 구조"(현행)인지 "제품마다 다른 구조"(디렉터)인지. 모델 동일(${COPY_MODEL}), 전략·구조 동일, 프롬프트의 블록 지시만 다름.</p>
<table class="seq"><tr><th>제품</th><th>안</th>${out[Object.keys(out)[0]].sections.map((_, i) => `<th>섹션${i + 1}</th>`).join('')}</tr>${seqTable}</table>
${productHtml}`;

  fs.writeFileSync(path.join(outDir, 'index.html'), html);
  console.log(`\n[dir-ab] 완료 (${((Date.now() - t0) / 1000).toFixed(0)}s) → ${path.join(outDir, 'index.html')}`);
}

await main();
