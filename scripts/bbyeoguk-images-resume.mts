/**
 * 뼈국 런 이미지 전용 재개 — 카피(raw.json)는 그대로 두고 비어 있는 secNN.png만 생성.
 * OpenAI 이미지 API 장애(2026-07-25) 복구 후 재시도용. 성공한 파일은 건너뜀(멱등).
 *
 *   npx tsx scripts/bbyeoguk-images-resume.mts runs/뼈국-2026-07-25-11-20 --yes
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { encode } from 'next-auth/jwt';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
import { aspectRatioFor } from '../lib/sectionAspect';
import { runPool } from '../lib/asyncPool';
import type { Block } from '../store/AppContext';

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

interface RawSection {
  num: string; name: string; blocks?: Block[];
  imageBrief?: { prompt?: string; mood?: string };
}

async function main() {
  const runDir = process.argv[2];
  if (!runDir || !process.argv.includes('--yes')) throw new Error('사용법: ... <runs/뼈국-…> --yes');
  const outDir = path.resolve(ROOT, runDir);
  const raw = JSON.parse(fs.readFileSync(path.join(outDir, 'raw.json'), 'utf8')) as { sections: RawSection[] };

  const refs = ['ref3.jpg', 'ref-pouch.jpg'].map(f =>
    `data:image/jpeg;base64,${fs.readFileSync(path.join(REF_DIR, f)).toString('base64')}`);

  const { NEXTAUTH_SECRET } = loadEnv();
  const sessionToken = await encode({ token: { email: 'harness@flik.test', name: 'Flik Harness' }, secret: NEXTAUTH_SECRET! });
  const authHeaders = { Cookie: `next-auth.session-token=${sessionToken}` };

  const pending = raw.sections
    .map((sec, i) => ({ sec, i, file: `sec${String(i + 1).padStart(2, '0')}.png` }))
    .filter(({ file, sec }) => !fs.existsSync(path.join(outDir, file)) && (sec.imageBrief?.prompt || sec.imageBrief?.mood));
  console.log(`[resume] 대상 ${pending.length}장 (${outDir})`);
  if (!pending.length) { console.log('[resume] 생성할 이미지 없음'); return; }

  let fail = 0;
  const tasks = pending.map(({ sec, i, file }) => async () => {
    const res = await fetch(`${BASE_URL}/api/generate-image`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify({
        prompt: sec.imageBrief?.prompt || sec.imageBrief?.mood, sectionNum: sec.num,
        productImages: refs, outputType: 'blog',
        aspectRatio: aspectRatioFor(sec.name, undefined, 'blog'),
        jobKey: crypto.randomUUID(),
      }),
    });
    const data = await res.json() as { imageBase64?: string; error?: string };
    if (data.imageBase64) {
      fs.writeFileSync(path.join(outDir, file), Buffer.from(data.imageBase64, 'base64'));
      console.log(`  [img] ✅ ${i + 1}. ${sec.name}`);
    } else {
      fail++;
      console.log(`  [img] ❌ ${i + 1}. ${sec.name}: ${data.error}`);
    }
  });
  await runPool(tasks, 3);
  if (fail) { console.log(`[resume] ${fail}장 실패 — 재실행하면 실패분만 다시 시도`); process.exit(2); }
  console.log('[resume] 전부 완료');
}

main().catch(e => { console.error(e); process.exit(1); });
