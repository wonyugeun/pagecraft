/**
 * 메인 플로우 화면 일괄 스크린샷 — 폴리시 스프린트 진단용(임시 도구).
 *
 * 헤드리스 크롬 + CDP(내장 WebSocket)로 각 단계 화면을 풀페이지 캡처.
 * 인증: 하네스와 동일하게 next-auth JWT 쿠키 위조. 화면 진입: sessionStorage
 * pc_wizard_v1 시드(AppContext 새로고침 복원 경로) — 클릭 시뮬레이션 불필요.
 *
 *   npx tsx runs/screenshot-flow.mts <outDir>
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { encode } from 'next-auth/jwt';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = process.argv[2] ?? path.join(ROOT, 'runs', 'screens');
const BASE = 'http://localhost:3000';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9333;

function loadEnv(): Record<string, string> {
  const env: Record<string, string> = {};
  for (const line of fs.readFileSync(path.join(ROOT, '.env.local'), 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return env;
}

/* ── 시드 데이터: 뼈국 프리셋 축약 — 화면이 빈 껍데기로 안 보이게 ── */
const SEED_BASE = {
  cat: '식품', ch: '스마트스토어', type: '기본형', out: '블로그', imgMode: 'auto',
  secCnt: 8,
  productName: '제주 접짝뼈국 밀키트 800g (2~3인분)',
  productExtra: '',
  regularPrice: '16900', salePrice: '13900', showPrice: true,
  brand: '', diff: '제주 잔칫상에 오르던 접짝뼈국 — 진하고 걸쭉한 국물', brandIntro: '',
  extraNote: '', reviews: '진짜 제주 향토음식이라 좋았어요 - 원OO',
  productForm: '', productVolume: '800g', productShapeProfile: '',
  productOptions: [], answers: { f1: ['간편식/HMR'], f2: ['가족(아이 있음)', '1인가구'] },
  sectionStructure: ['히어로', '원산지 스토리', '맛/신선도', '레시피/보관법', '후기', 'FAQ', 'CTA'],
  originalSections: ['히어로', '원산지 스토리', '맛/신선도', '레시피/보관법', '후기', 'FAQ', 'CTA'],
  referenceAnalysis: null, captureAnalysis: null, generationJobKey: null,
};

const SHOTS: { name: string; screen: string; width?: number }[] = [
  { name: 'dash',      screen: 's-dash' },
  { name: 's1-cat',    screen: 's1' },
  { name: 's2-ch',     screen: 's2' },
  { name: 's3-type',   screen: 's3' },
  { name: 's3b-out',   screen: 's3b' },
  { name: 's5-prod',   screen: 's5' },
  { name: 's5b-struct',screen: 's5b' },
  { name: 's6-img',    screen: 's6' },
];

/* ── 미니 CDP 클라이언트 ── */
class CDP {
  private ws!: WebSocket;
  private id = 0;
  private pending = new Map<number, (v: any) => void>();
  async connect(url: string) {
    this.ws = new WebSocket(url);
    await new Promise<void>((res, rej) => {
      this.ws.addEventListener('open', () => res());
      this.ws.addEventListener('error', e => rej(e));
    });
    this.ws.addEventListener('message', ev => {
      const msg = JSON.parse(String(ev.data));
      if (msg.id && this.pending.has(msg.id)) {
        this.pending.get(msg.id)!(msg);
        this.pending.delete(msg.id);
      }
    });
  }
  send(method: string, params: Record<string, unknown> = {}, sessionId?: string): Promise<any> {
    const id = ++this.id;
    return new Promise(res => {
      this.pending.set(id, m => res(m.result ?? m.error));
      this.ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
    });
  }
  close() { this.ws.close(); }
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

async function main() {
  const { NEXTAUTH_SECRET } = loadEnv();
  if (!NEXTAUTH_SECRET) throw new Error('NEXTAUTH_SECRET 없음');
  const token = await encode({ token: { email: 'harness@flik.test', name: '유근' }, secret: NEXTAUTH_SECRET });

  fs.mkdirSync(OUT, { recursive: true });
  const profile = fs.mkdtempSync('/tmp/flik-shot-');
  const chrome = spawn(CHROME, [
    '--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`,
    '--no-first-run', '--no-default-browser-check', '--hide-scrollbars', '--window-size=1440,900',
  ], { stdio: 'ignore' });

  try {
    // 디버거 준비 대기
    let version: { webSocketDebuggerUrl?: string } = {};
    for (let i = 0; i < 40; i++) {
      try { version = await (await fetch(`http://localhost:${PORT}/json/version`)).json() as typeof version; break; }
      catch { await sleep(250); }
    }
    if (!version.webSocketDebuggerUrl) throw new Error('크롬 디버거 연결 실패');
    const cdp = new CDP();
    await cdp.connect(version.webSocketDebuggerUrl);

    for (const shot of SHOTS) {
      const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
      const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
      await cdp.send('Network.enable', {}, sessionId);
      await cdp.send('Page.enable', {}, sessionId);
      await cdp.send('Network.setCookie', {
        name: 'next-auth.session-token', value: token, url: BASE, path: '/',
      }, sessionId);
      await cdp.send('Emulation.setDeviceMetricsOverride', {
        width: shot.width ?? 1440, height: 900, deviceScaleFactor: 1, mobile: false,
      }, sessionId);
      // sessionStorage 시드 — 앱 스크립트보다 먼저 실행. 새 소식 팝업은 seen 처리로 억제(dash는 별도 샷).
      const persist = JSON.stringify({ ...SEED_BASE, screen: shot.screen });
      await cdp.send('Page.addScriptToEvaluateOnNewDocument', {
        source: `
          try {
            sessionStorage.setItem('pc_wizard_v1', ${JSON.stringify(persist)});
            localStorage.setItem('flik_seen_update', '__all__seen__${Date.now()}');
            localStorage.setItem('flik_seen_update', JSON.parse('"${'2026-07-27'}"'));
          } catch (e) {}
        `,
      }, sessionId);
      await cdp.send('Page.navigate', { url: `${BASE}/` }, sessionId);
      await sleep(4500);   // 하이드레이션 + 복원 + 세션 로드
      const shotRes = await cdp.send('Page.captureScreenshot', {
        format: 'jpeg', quality: 82, captureBeyondViewport: true,
      }, sessionId);
      if (shotRes?.data) {
        fs.writeFileSync(path.join(OUT, `${shot.name}.jpg`), Buffer.from(shotRes.data, 'base64'));
        console.log(`✅ ${shot.name}`);
      } else {
        console.log(`❌ ${shot.name}: ${JSON.stringify(shotRes).slice(0, 200)}`);
      }
      await cdp.send('Target.closeTarget', { targetId });
    }
    cdp.close();
  } finally {
    chrome.kill();
    fs.rmSync(profile, { recursive: true, force: true });
  }
  console.log(`완료 → ${OUT}`);
}

main().catch(e => { console.error(e); process.exit(1); });
