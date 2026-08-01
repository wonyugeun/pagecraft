/**
 * 제품 색 재현 검증 — 참조 사진의 색이 생성 이미지에 그대로 남는지(2026-08-01).
 *
 * ★한 상품만 보고 판단하지 않는다. 페이지 팔레트가 제품을 덮어쓰던 버그는
 *   '실제 색 ≠ 전략이 지어낸 팔레트'인 모든 상품에서 나므로, 색이 서로 다른 여러 상품으로 확인한다.
 *   (무쇠팬·가습기는 팔레트와 우연히 맞아 멀쩡했다 — 그래서 못 잡고 넘어갔다)
 *
 * ★검증 방식: 참조 사진과 생성 이미지의 '제품 영역 평균색'을 비교한다.
 *   배경까지 섞이면 판정이 흐려지므로, 가장자리(배경 추정)를 뺀 중앙부만 본다.
 *   완벽한 측정은 아니지만 '베이지 → 회색'처럼 큰 이탈은 확실히 잡힌다.
 *
 * 실행: npx --yes tsx scripts/color-fidelity-test.mts --yes
 * 출력: runs/color-fidelity/ + 콘솔 판정
 */
import fs from 'node:fs';
import path from 'node:path';
import { encode } from 'next-auth/jwt';

const ROOT = process.cwd();
const BASE = process.env.FLIK_BASE_URL ?? 'http://localhost:3000';
const OUT = path.join(ROOT, 'runs', 'color-fidelity');

for (const l of fs.readFileSync(path.join(ROOT, '.env.local'), 'utf8').split('\n')) {
  const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) process.env[m[1]] ??= m[2].replace(/^["']|["']$/g, '');
}

if (!process.argv.includes('--yes')) { console.error('비용 발생 — --yes 필요'); process.exit(1); }

/* ── 색이 뚜렷하게 다른 상품들. 팔레트와 어긋날 가능성이 높은 것 위주로 고른다 ── */
const CASES = [
  { key: '01-패션-니트가디건', label: '니트 가디건(베이지)',
    prompt: 'The cardigan from the reference laid flat on a pale linen surface, soft diffused daylight, minimal styling, no text' },
  { key: '08-식품-약과', label: '약과(진한 갈색)',
    prompt: 'The yakgwa cookies from the reference arranged on a small ceramic plate, warm indoor light, wooden table, no text' },
  { key: '10-스포츠-요가매트', label: '요가매트(청록)',
    prompt: 'The yoga mat from the reference partially unrolled on a wooden floor, natural window light, clean minimal room, no text' },
];

/** 페이지 팔레트를 일부러 제품과 다른 색으로 넣어 '팔레트가 제품을 덮는지' 시험한다 */
const HOSTILE_PALETTE = 'on a #4B5563 slate grey background with cool grey linen props, muted charcoal mood, soft diffused daylight';

/* ── 이미지 중앙부 평균색 (배경 영향 최소화) ── */
async function centerColor(buf: Buffer): Promise<{ r: number; g: number; b: number }> {
  const sharp = (await import('sharp')).default;
  const img = sharp(buf);
  const { width = 0, height = 0 } = await img.metadata();
  const w = Math.floor(width * 0.5), h = Math.floor(height * 0.5);
  const { data } = await img
    .extract({ left: Math.floor((width - w) / 2), top: Math.floor((height - h) / 2), width: w, height: h })
    .resize(1, 1, { fit: 'fill' }).raw().toBuffer({ resolveWithObject: true });
  return { r: data[0], g: data[1], b: data[2] };
}
const hex = (c: { r: number; g: number; b: number }) =>
  '#' + [c.r, c.g, c.b].map(v => v.toString(16).padStart(2, '0')).join('');
/** 색 거리 — 채도가 낮은(=회색으로 빠진) 이탈을 특히 크게 잡는다 */
function distance(a: { r: number; g: number; b: number }, b: { r: number; g: number; b: number }) {
  const d = Math.sqrt((a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2);
  const sat = (c: typeof a) => Math.max(c.r, c.g, c.b) - Math.min(c.r, c.g, c.b);
  return { rgb: Math.round(d), satRef: sat(a), satGen: sat(b) };
}

const token = await encode({ token: { email: 'harness@flik.test', name: 'H' }, secret: process.env.NEXTAUTH_SECRET! });
const headers = { 'Content-Type': 'application/json', Cookie: `next-auth.session-token=${token}` };

fs.mkdirSync(OUT, { recursive: true });
console.log(`제품 색 재현 검증 — ${CASES.length}종\n적대적 팔레트를 일부러 주입해 제품이 물드는지 본다.\n`);

let pass = true;
for (const c of CASES) {
  const ref = path.join(ROOT, 'test-assets', 'diversity', `${c.key}.png`);
  if (!fs.existsSync(ref)) { console.log(`⏭  ${c.label} — 참조 사진 없음`); continue; }
  const refBuf = fs.readFileSync(ref);

  const res = await fetch(`${BASE}/api/generate-image`, {
    method: 'POST', headers,
    body: JSON.stringify({
      prompt: `${c.prompt}, ${HOSTILE_PALETTE}`,
      sectionNum: c.key, productImages: [`data:image/png;base64,${refBuf.toString('base64')}`],
      outputType: 'blog', aspectRatio: '1:1',
    }),
  });
  const data = await res.json() as { imageBase64?: string; error?: string };
  if (!data.imageBase64) { console.log(`❌ ${c.label} — 생성 실패: ${data.error}`); pass = false; continue; }

  const genBuf = Buffer.from(data.imageBase64, 'base64');
  fs.writeFileSync(path.join(OUT, `${c.key}.png`), genBuf);

  const [a, b] = [await centerColor(refBuf), await centerColor(genBuf)];
  const d = distance(a, b);
  // 거리 60 이상이면 사람이 봐도 '다른 색'. 채도가 절반 이하로 죽으면 회색화 의심.
  const drift = d.rgb >= 60;
  const desat = d.satRef >= 25 && d.satGen < d.satRef * 0.5;
  const ok = !drift && !desat;
  if (!ok) pass = false;

  console.log(`${ok ? '✅' : '⚠️ '} ${c.label}`);
  console.log(`    참조 ${hex(a)} (채도 ${d.satRef})  →  생성 ${hex(b)} (채도 ${d.satGen})   거리 ${d.rgb}`);
  if (drift) console.log(`    └ 색이 크게 이탈했습니다`);
  if (desat) console.log(`    └ 채도가 죽었습니다 — 회색 팔레트에 물든 것으로 보입니다`);
}

console.log(`\n${pass ? '✅ 전부 통과 — 적대적 팔레트에도 제품 색 유지' : '⚠️ 이탈 있음'}`);
console.log(`이미지: ${path.relative(ROOT, OUT)}/`);
