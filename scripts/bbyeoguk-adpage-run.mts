/**
 * 접짝뼈국 광고형 템플릿 페이지 — GPT식 구조(HERO/PROBLEM/HOOK/SOLUTION/WHY/TRUST/CONVENIENCE) 실험.
 * 카피는 고정(하네스에 내장), 이미지 23장을 generate-image 라우트(레퍼런스 동일)로 생성 후
 * "가운데 정렬 + 포인트 강조" 레이아웃으로 조립 — 사이트 렌더 개선안 미리보기 겸용.
 *
 *   npx tsx scripts/bbyeoguk-adpage-run.mts --yes        (전체)
 *   npx tsx scripts/bbyeoguk-adpage-run.mts --yes <dir>  (기존 디렉토리 이어서 — 빈 이미지만)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { encode } from 'next-auth/jwt';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
import { runPool } from '../lib/asyncPool';

const ROOT = path.resolve(__dirname, '..');
const BASE_URL = process.env.FLIK_BASE_URL ?? 'http://localhost:3000';
const REF_DIR = '/private/tmp/claude-501/-Users-won-yugeun-Documents-Flik/3454abe9-22fc-4043-b1da-1362adaea000/scratchpad/bbyeoguk';
const ACCENT = '#8B5E3C';

interface Sec { id: string; tag: string; lines: string[]; prompts: string[]; withRef: boolean[] }
/** lines: **굵은 포인트**·((포인트 컬러)) 마크업. withRef[i]: 해당 이미지에 제품 레퍼런스 첨부 여부(라이프스타일 컷은 제외) */
const SECTIONS: Sec[] = [
  {
    id: 'hero', tag: 'HERO',
    lines: ['((뽀얀 사골도, 붉은 육개장도 아닙니다.))', '제주 사람들은 잔칫날 **이 국**을 끓였습니다.'],
    prompts: [
      'Overhead-angled hero shot of Jeju jeopjjak bone soup in a black earthenware ttukbaegi - thick beige broth, tender pork rib chunks with bone, fresh chopped scallions on top, steam rising. Warm dark wood table, linen cloth, moody window light. Premium Korean food photography, no text.',
      'The silver vacuum pouch with Korean label standing beside the finished bowl of beige soup, dried botanicals in background, warm rustic mood. Product and result in one frame, no text.',
      'Extreme close-up of a spoon lifting thick beige broth with a piece of fall-apart pork, viscous texture visible, steam, shallow depth of field. Appetizing macro food shot, no text.',
      'Family dinner table scene from eye level - the ttukbaegi of beige bone soup at center, rice bowls and simple side dishes around, one pair of chopsticks reaching in. Cozy evening home lighting, lived-in feel, no text.',
    ],
    withRef: [true, true, true, true],
  },
  {
    id: 'problem', tag: 'PROBLEM',
    lines: ['퇴근하고 냄비 앞에 서면 막막하죠.', '국 하나 끓이는 데 **재료 손질만 삼십 분**.', '그렇다고 시켜 먹자니 또 그 맛.', '제주에서 먹었던 그 국물이 문득 생각나는 날.', '((여기선 팔지도 않더라고요.))'],
    prompts: [
      'A tired person standing in front of an open refrigerator in evening kitchen light, back view, contemplating what to cook. Muted realistic tones, everyday documentary mood, no text.',
      'Cluttered kitchen counter with half-prepped ingredients - green onions, cutting board, pot waiting on stove. Slightly messy, relatable weeknight cooking scene, natural light, no text.',
      'A person scrolling a food delivery app on phone at a dim kitchen table, warm low light, unenthusiastic mood. Lifestyle photo, no text.',
    ],
    withRef: [false, false, false],
  },
  {
    id: 'hook', tag: 'HOOK',
    lines: ['그런데 이 국물, **색부터 낯설죠**.', '하얗지도 않고 빨갛지도 않은 국.', '숟가락을 넣으면 걸쭉하게 따라 올라옵니다.', '사골도 아니고 곰탕도 아니라면 —', '((이 국의 정체가 뭘까요?))'],
    prompts: [
      'Mysterious close-up of thick beige-tan broth surface in dark earthenware, ladle half-submerged, texture rich and opaque, dramatic side lighting on dark background. Intriguing food still life, no text.',
      'A spoonful of viscous beige broth held up against soft window light, slow drip visible, dark moody backdrop. Macro shot emphasizing unusual thickness, no text.',
      'The soup bowl seen from directly above on dark slate, broth color distinctly beige - halfway between milky white and red-brown. Minimal top-down composition, no text.',
    ],
    withRef: [true, true, true],
  },
  {
    id: 'solution', tag: 'SOLUTION',
    lines: ['**접짝뼈국.**', '돼지 앞다리 어깨 쪽, 접짝뼈로 끓이는 제주 향토 국입니다.', '잔칫날 큰 솥에서 온 동네가 나눠 먹던 그 국.', '접짝뼈와 도가니뼈를 오래 고아내고', '((제주메밀을 풀어 걸쭉하게 마무리합니다.))', '그 국을 800g, 냄비 하나 분량으로 담았습니다.'],
    prompts: [
      'Raw pork shoulder bones and knee cartilage bones neatly arranged on butcher paper with a small dish of buckwheat flour beside them, clean bright preparation scene. Honest ingredient photography, no text.',
      'Large traditional pot of bone broth simmering, steam clouds, warm kitchen atmosphere suggesting long slow cooking. Documentary style, no text.',
      'The finished beige soup being ladled into a serving bowl, buckwheat-thickened texture clinging to the ladle, warm inviting light, no text.',
    ],
    withRef: [false, false, true],
  },
  {
    id: 'why', tag: 'WHY',
    lines: ['이 색과 농도는 흉내가 아니라 **재료에서 옵니다**.', '뼈를 오래 고면 국물이 진해집니다.', '거기에 제주메밀이 들어가면 —', '묵직하게 걸쭉해지고, 고소함이 붙습니다.', '첨가물로 낸 색이 아니라', '((뼈와 메밀로만 낸 색입니다.))'],
    prompts: [
      'Buckwheat grains and buckwheat flour in a shallow wooden bowl on dark wood, a few scattered grains, soft directional light. Simple ingredient close-up, no text.',
      'Two small bowls side by side on neutral background - one with clear thin broth, one with thick opaque beige buckwheat-finished broth, showing the difference. Clean comparison shot, no text.',
      'Cross-section view of dense opaque beige broth in a glass bowl with meat pieces suspended. Bright clean studio food shot, no text.',
    ],
    withRef: [false, true, true],
  },
  {
    id: 'trust', tag: 'TRUST',
    lines: ['미리 끓여 쌓아두지 않습니다.', '주문이 들어오면 **그때 끓입니다**.', '갓 끓인 국물을 김이 가시기 전에 진공 포장.', '((방부제도, 색소도 넣을 이유가 없습니다.))', '아이스박스에 담아 제주에서 냉장으로 출발합니다.'],
    prompts: [
      'Clean stainless commercial kitchen, a cook in apron and gloves stirring a large pot of broth, bright hygienic atmosphere. Trust-building process photo, no text.',
      'The silver vacuum pouch being sealed, tight packaging detail, slight condensation hinting the soup was just cooked. Close-up process shot, no text.',
      'Styrofoam cooler box open with silver pouches and ice packs neatly packed inside, ready for shipping. Bright daylight, honest packing photo, no text.',
      'The silver pouch label in focus held in a hand in front of a home refrigerator. Simple authentic snapshot style, no text.',
    ],
    withRef: [false, true, true, true],
  },
  {
    id: 'convenience', tag: 'CONVENIENCE',
    lines: ['조리라고 부르기 민망합니다.', '봉지를 뜯고, 냄비에 붓고, **15분**.', '간은 소금 살짝. 끝입니다.', '썰 것도 다듬을 것도 없습니다.', '((제주까지 가는 대신, 냄비 하나면 됩니다.))', '오늘 저녁 밥상 위에 올려보세요.'],
    prompts: [
      'Hands cutting open a silver pouch over a pot on a home gas stove, soup starting to pour, bright everyday kitchen. Step-by-step feel, no text.',
      'The pot gently boiling with beige broth and meat chunks, kitchen timer beside the stove implying a short wait. Warm practical scene, no text.',
      'Final table setting - steaming ttukbaegi of beige bone soup with scallion topping, bowl of rice, one side dish, evening home light. Satisfying end-result shot, no text.',
    ],
    withRef: [true, true, true],
  },
];

function loadEnv(): Record<string, string> {
  const env: Record<string, string> = {};
  for (const line of fs.readFileSync(path.join(ROOT, '.env.local'), 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return env;
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
/** **볼드** → <b>, ((포인트)) → accent 컬러 강조 */
const markup = (s: string) => esc(s)
  .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
  .replace(/\(\((.+?)\)\)/g, `<em class="pt">$1</em>`);

async function main() {
  if (!process.argv.includes('--yes')) throw new Error('비용 발생 — --yes 필요');
  const dirArg = process.argv.find(a => a.startsWith('runs/'));
  const stamp = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 16);
  const outDir = dirArg ? path.resolve(ROOT, dirArg) : path.join(ROOT, 'runs', `뼈국광고형-${stamp}`);
  fs.mkdirSync(outDir, { recursive: true });

  const refs = ['ref3.jpg', 'ref-pouch.jpg'].map(f =>
    `data:image/jpeg;base64,${fs.readFileSync(path.join(REF_DIR, f)).toString('base64')}`);

  const { NEXTAUTH_SECRET } = loadEnv();
  const sessionToken = await encode({ token: { email: 'harness@flik.test', name: 'Flik Harness' }, secret: NEXTAUTH_SECRET! });
  const authHeaders = { Cookie: `next-auth.session-token=${sessionToken}` };

  interface Task { file: string; prompt: string; withRef: boolean; label: string }
  const all: Task[] = [];
  SECTIONS.forEach(sec => sec.prompts.forEach((p, i) =>
    all.push({ file: `${sec.id}-${i + 1}.png`, prompt: p, withRef: sec.withRef[i], label: `${sec.tag} ${i + 1}` })));
  const pending = all.filter(t => !fs.existsSync(path.join(outDir, t.file)));
  console.log(`[adpage] 이미지 ${pending.length}/${all.length}장 생성 (${outDir})`);

  let fail = 0;
  await runPool(pending.map(t => async () => {
    const res = await fetch(`${BASE_URL}/api/generate-image`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify({
        prompt: t.prompt, sectionNum: t.file,
        productImages: t.withRef ? refs : undefined,
        outputType: 'blog', aspectRatio: '4:5', jobKey: crypto.randomUUID(),
      }),
    });
    const data = await res.json() as { imageBase64?: string; error?: string };
    if (data.imageBase64) {
      fs.writeFileSync(path.join(outDir, t.file), Buffer.from(data.imageBase64, 'base64'));
      console.log(`  ✅ ${t.label}`);
    } else { fail++; console.log(`  ❌ ${t.label}: ${data.error}`); }
  }), 3);

  /* ── 조립 — 가운데 정렬 + 포인트 강조 레이아웃(사이트 렌더 개선안 미리보기) ── */
  const secHtml = SECTIONS.map(sec => {
    const imgs = sec.prompts.map((_, i) => {
      const f = `${sec.id}-${i + 1}.png`;
      return fs.existsSync(path.join(outDir, f)) ? `<img src="${f}" alt="">` : '';
    }).join('');
    const [first, ...rest] = sec.lines;
    return `<section>
  <h2>${markup(first)}</h2>
  <div class="copy">${rest.map(l => `<p>${markup(l)}</p>`).join('')}</div>
  <div class="imgs">${imgs}</div>
</section>`;
  }).join('\n');

  const html = `<!doctype html><meta charset="utf-8"><title>접짝뼈국 광고형(센터+포인트)</title>
<style>
  body{margin:0;background:#f4f1ec;font-family:'Apple SD Gothic Neo',Pretendard,sans-serif;color:#2a2622;line-height:1.9}
  .wrap{max-width:720px;margin:0 auto;background:#fff;box-shadow:0 0 30px rgba(0,0,0,.07)}
  section{padding:72px 36px 0;text-align:center}
  section:last-child{padding-bottom:72px}
  .tag{font-size:11px;font-weight:800;letter-spacing:.25em;color:${ACCENT};margin-bottom:18px}
  h2{font-size:32px;line-height:1.45;letter-spacing:-.02em;margin:0 0 18px;font-weight:800}
  .copy p{font-size:17.5px;margin:0 0 6px;color:#4a443d}
  .copy b{color:#2a2622}
  em.pt{font-style:normal;color:${ACCENT};font-weight:800}
  .imgs{margin-top:32px}
  .imgs img{width:100%;display:block;margin:0 0 14px;border-radius:14px}
</style>
<div class="wrap">${secHtml}</div>`;
  fs.writeFileSync(path.join(outDir, 'index.html'), html);
  console.log(`[adpage] 완료${fail ? ` (실패 ${fail}장 — 재실행하면 채움)` : ''} → ${path.relative(ROOT, outDir)}/index.html`);
  if (fail) process.exit(2);
}

main().catch(e => { console.error(e); process.exit(1); });
