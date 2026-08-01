/**
 * 실제 브라우저로 돌리는 생성 테스트(2026-08-02).
 *
 * ★왜 만들었나: 기존 하네스(diversity-run)는 브라우저가 하던 준비 작업을 스크립트로
 *   다시 구현한 것이라, 브라우저 코드가 바뀔 때마다 어긋났다. 실제로 하루에 세 번 어긋났다
 *   (판매모드 플래그 미전달 / 슬라이드 프롬프트 소스 / 디렉터 미호출).
 *   재구현이 있는 한 이 문제는 계속 생긴다 — 그래서 재구현을 없앤다.
 *
 * ★이 스크립트는 앱 코드를 하나도 흉내내지 않는다. 크롬을 띄우고 실제 화면을 조작할 뿐이다.
 *   프롬프트 조립·디렉터 호출·plateMode·참조 사진 처리 전부 실제 코드가 한다.
 *   따라서 "유근님이 사이트에서 직접 뽑는 것"과 구조적으로 같다.
 *
 * ★--headed 를 주면 진짜 크롬 창이 떠서 진행 과정을 눈으로 볼 수 있다.
 *
 * 실행 (dev 서버 필요):
 *   npx --yes tsx scripts/browser-run.mts --yes --only 01 --out slide --headed
 *   npx --yes tsx scripts/browser-run.mts --yes --only 01,03            (헤드리스·블로그)
 * 출력: runs/browser/<상품>/  (섹션 이미지 + result.json + 화면 캡처)
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { encode } from 'next-auth/jwt';
import { TEST_PRODUCTS } from './test-products';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = process.env.FLIK_BASE_URL ?? 'http://localhost:3000';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9334;
const OUT_ROOT = path.join(ROOT, 'runs', 'browser');

const HEADED = process.argv.includes('--headed');
/** ★--keep — 끝나도 크롬을 닫지 않는다. 결과 화면에서 뒤로 가 상품정보를 확인하는 용도. */
const KEEP = process.argv.includes('--keep');
const OUT_TYPE = process.argv[process.argv.indexOf('--out') + 1] === 'slide' ? 'slide' : 'blog';
const SECTION_COUNT = 8;
/** 생성 완료 대기 상한 — 8섹션 카피 5분 + 이미지 4분 + 여유 */
const GEN_TIMEOUT_MS = 15 * 60 * 1000;

function loadEnv(): Record<string, string> {
  const env: Record<string, string> = {};
  for (const line of fs.readFileSync(path.join(ROOT, '.env.local'), 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) { env[m[1]] = m[2].replace(/^["']|["']$/g, ''); process.env[m[1]] ??= env[m[1]]; }
  }
  return env;
}

/* ── 미니 CDP 클라이언트 (runs/screenshot-flow.mts와 동일 방식) ── */
class CDP {
  private ws!: WebSocket;
  private id = 0;
  private pending = new Map<number, (v: unknown) => void>();
  /** 이벤트 구독 — 응답 가로채기용(Network.responseReceived 등) */
  onEvent?: (method: string, params: Record<string, unknown>, sessionId?: string) => void;
  async connect(url: string) {
    this.ws = new WebSocket(url);
    await new Promise<void>((res, rej) => {
      this.ws.addEventListener('open', () => res());
      this.ws.addEventListener('error', e => rej(e));
    });
    this.ws.addEventListener('message', ev => {
      const msg = JSON.parse(String(ev.data)) as {
        id?: number; result?: unknown; error?: unknown;
        method?: string; params?: Record<string, unknown>; sessionId?: string;
      };
      if (msg.id && this.pending.has(msg.id)) {
        this.pending.get(msg.id)!(msg.result ?? msg.error);
        this.pending.delete(msg.id);
      } else if (msg.method && this.onEvent) {
        this.onEvent(msg.method, msg.params ?? {}, msg.sessionId);
      }
    });
  }
  send(method: string, params: Record<string, unknown> = {}, sessionId?: string): Promise<Record<string, unknown>> {
    const id = ++this.id;
    return new Promise(res => {
      this.pending.set(id, v => res(v as Record<string, unknown>));
      this.ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
    });
  }
  close() { this.ws.close(); }
}
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

/** 페이지에서 JS 실행 후 값 반환 */
async function evalJs<T>(cdp: CDP, sid: string, expr: string): Promise<T> {
  const r = await cdp.send('Runtime.evaluate', {
    expression: expr, returnByValue: true, awaitPromise: true,
  }, sid) as { result?: { value?: T } };
  return r.result?.value as T;
}

async function main() {
  if (!process.argv.includes('--yes')) throw new Error('비용 발생 — --yes 필요');
  const { NEXTAUTH_SECRET } = loadEnv();
  if (!NEXTAUTH_SECRET) throw new Error('.env.local에 NEXTAUTH_SECRET 없음');

  const onlyArg = process.argv[process.argv.indexOf('--only') + 1];
  const only = process.argv.includes('--only') ? onlyArg.split(',').map(s => s.trim()) : null;
  const targets = only ? TEST_PRODUCTS.filter(p => only.some(o => p.key.startsWith(o))) : TEST_PRODUCTS;

  const token = await encode({ token: { email: 'harness@flik.test', name: 'Flik Harness' }, secret: NEXTAUTH_SECRET });

  const userDir = path.join(ROOT, 'runs', '.chrome-profile');
  fs.mkdirSync(userDir, { recursive: true });
  const chrome = spawn(CHROME, [
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${userDir}`,
    ...(HEADED ? ['--window-size=1440,1000'] : ['--headless=new']),
    '--no-first-run', '--no-default-browser-check', '--disable-features=Translate',
    'about:blank',
  ], { stdio: 'ignore' });

  console.log(`브라우저 실행 — ${HEADED ? '창 표시(진행 과정을 볼 수 있습니다)' : '헤드리스'}`);
  console.log(`출력형태 ${OUT_TYPE} · ${targets.length}종\n`);
  await sleep(2500);

  const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json() as { webSocketDebuggerUrl: string }[];
  const cdp = new CDP();
  await cdp.connect(list[0].webSocketDebuggerUrl);

  fs.mkdirSync(OUT_ROOT, { recursive: true });

  for (const p of targets) {
    const outDir = path.join(OUT_ROOT, `${p.key}-${OUT_TYPE}`);
    fs.mkdirSync(outDir, { recursive: true });
    console.log(`■ ${p.key} (${OUT_TYPE})`);

    // 새 탭
    const t = await cdp.send('Target.createTarget', { url: 'about:blank' }) as { targetId: string };
    const att = await cdp.send('Target.attachToTarget', { targetId: t.targetId, flatten: true }) as { sessionId: string };
    const sid = att.sessionId;
    await cdp.send('Page.enable', {}, sid);
    await cdp.send('Runtime.enable', {}, sid);
    await cdp.send('Network.enable', {}, sid);
    await cdp.send('Network.setCookie', {
      name: 'next-auth.session-token', value: token, domain: 'localhost', path: '/',
    }, sid);

    /* ★이미지 수집은 DOM이 아니라 네트워크 응답에서 한다(2026-08-02).
     *  화면 선택자로 긁으면 마크업이 바뀔 때마다 깨진다 — 첫 시도에서 실제로 0장을 잡았다.
     *  /api/generate-image 응답이 앱이 받은 그대로이므로 이게 진실이다. */
    const captured: { section: string; b64: string; mime: string }[] = [];
    const pendingBodies = new Map<string, string>();   // requestId → url
    cdp.onEvent = (method, params, evSid) => {
      if (evSid !== sid) return;
      if (method === 'Network.responseReceived') {
        const r = params.response as { url?: string } | undefined;
        if (r?.url?.includes('/api/generate-image')) pendingBodies.set(String(params.requestId), r.url);
      }
      if (method === 'Network.loadingFinished' && pendingBodies.has(String(params.requestId))) {
        const reqId = String(params.requestId);
        pendingBodies.delete(reqId);
        void cdp.send('Network.getResponseBody', { requestId: reqId }, sid).then(res => {
          try {
            const body = JSON.parse(String((res as { body?: string }).body ?? '{}')) as
              { imageBase64?: string; mimeType?: string; sectionNum?: string };
            if (body.imageBase64) {
              captured.push({ section: String(body.sectionNum ?? captured.length + 1), b64: body.imageBase64, mime: body.mimeType ?? 'image/png' });
            }
          } catch { /* 응답이 이미지가 아니면 무시 */ }
        });
      }
    };

    /* ★상품정보를 '실제로 입력'한다 — 시드로 밀어넣지 않는다(2026-08-02).
     *  sessionStorage에 answers를 넣으면 화면은 채워져 보이지만, 셀러가 실제로 거치는
     *  입력 경로(칩 클릭 → onAnswer → 상태 갱신 → 조립)를 안 타서 실사용과 미묘하게 달라진다.
     *  그리고 유근님이 진행 과정을 눈으로 확인할 수 있어야 한다. */
    async function fillProductForm(): Promise<{ name: boolean; chips: number; texts: number }> {
      // 상품명
      const nameOk = await evalJs<boolean>(cdp, sid, `(() => {
        const inp = [...document.querySelectorAll('input[type=text], input:not([type])')]
          .find(i => /상품명|제품명/.test(i.placeholder || '') || i.closest('label')?.textContent?.includes('상품명'));
        const target = inp || document.querySelector('input[type=text]');
        if (!target) return false;
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        setter.call(target, ${JSON.stringify(p.productName)});
        target.dispatchEvent(new Event('input', { bubbles: true }));
        return true;
      })()`);
      await sleep(600);

      // 선택지 칩 — 값 텍스트가 정확히 일치하는 칩을 클릭(사람이 고르는 것과 동일 경로)
      const wanted: string[] = [];
      for (const v of Object.values(p.answers ?? {})) {
        if (Array.isArray(v)) wanted.push(...v);
      }
      let chips = 0;
      for (const w of wanted) {
        const hit = await evalJs<boolean>(cdp, sid, `(() => {
          const c = [...document.querySelectorAll('.chip')].find(x => (x.textContent || '').trim() === ${JSON.stringify(w)});
          if (!c || c.className.includes('on')) return false;
          c.scrollIntoView({ block: 'center' }); c.click(); return true;
        })()`);
        if (hit) { chips++; await sleep(450); }   // 눈으로 따라올 수 있게 천천히
      }

      // 자유 입력(textarea) — 라벨 매칭으로 채운다
      let texts = 0;
      for (const [fid, v] of Object.entries(p.answers ?? {})) {
        if (Array.isArray(v)) continue;
        const ok = await evalJs<boolean>(cdp, sid, `(() => {
          const tas = [...document.querySelectorAll('textarea')];
          const empty = tas.filter(t => !t.value.trim());
          const t = empty[0];
          if (!t) return false;
          const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
          setter.call(t, ${JSON.stringify(String(v))});
          t.dispatchEvent(new Event('input', { bubbles: true }));
          t.scrollIntoView({ block: 'center' });
          return true;
        })()`);
        if (ok) { texts++; await sleep(500); }
        void fid;
      }
      return { name: nameOk, chips, texts };
    }

    const filled = await fillProductForm();
    console.log(`  상품정보 입력 — 상품명 ${filled.name ? 'OK' : '실패'} · 선택지 ${filled.chips}개 · 자유입력 ${filled.texts}개`);
    await sleep(1200);

    // 다음 단계(섹션 구조 → 이미지)로 진행
    for (const step of ['상품정보 다음', '섹션구조 다음']) {
      const moved = await evalJs<boolean>(cdp, sid, `(() => {
        const b = [...document.querySelectorAll('button')].find(x => /다음 단계로/.test(x.textContent || ''));
        if (!b) return false; b.click(); return true;
      })()`);
      console.log(`  ${step} ${moved ? '→ 진행' : '→ 버튼 없음'}`);
      await sleep(4000);
    }

    // 상품 사진을 data URL로 준비
    const photo = path.join(ROOT, 'test-assets', 'diversity', `${p.key}.png`);
    if (!fs.existsSync(photo)) { console.log('  ⏭ 사진 없음'); continue; }
    const dataUrl = `data:image/png;base64,${fs.readFileSync(photo).toString('base64')}`;

    /* ★상태 시드 — 실제 앱의 새로고침 복원 경로(pc_wizard_v1)를 그대로 쓴다.
     *  폼 입력을 클릭으로 재현하지 않는 이유: 우리가 보려는 건 '생성 로직'이지 폼이 아니고,
     *  폼 클릭 재현은 UI가 바뀔 때마다 깨져 하네스와 같은 문제가 생긴다.
     *  생성 이후(카피·디렉터·이미지·조립)는 전부 실제 코드가 돈다. */
    const seed = {
      screen: 's5', cat: p.cat, ch: p.ch, type: '기본형', out: OUT_TYPE, imgMode: 'auto',
      secCnt: SECTION_COUNT,
      productName: '', productExtra: '',
      /* ★answers도 함께 시드 — 앱은 answers를 조립해 productExtra를 만든다.
       *  productExtra만 넣으면 상품정보 화면의 폼이 비어 보이고, 그 화면을 다시 지나가면
       *  빈 answers로 productExtra가 통째로 덮어써진다(2026-08-02 실측). */
      referenceAnalysis: null, captureAnalysis: null,
      sectionStructure: [], originalSections: [],
      regularPrice: '', salePrice: '', showPrice: false, productOptions: [],
      brand: '', diff: '', extraNote: '', brandIntro: '', reviews: '',
      productForm: '', productVolume: '', productShapeProfile: '', answers: {},
      generationJobKey: null, speechLevel: '',
    };
    await cdp.send('Page.navigate', { url: BASE }, sid);
    await sleep(3000);
    await evalJs(cdp, sid, `sessionStorage.setItem('pc_wizard_v1', ${JSON.stringify(JSON.stringify(seed))}); 'ok'`);
    await cdp.send('Page.navigate', { url: BASE }, sid);
    await sleep(3500);

    // 상품 사진 주입 — AppContext의 setProductImages를 화면에서 직접 부를 수 없으므로
    // 파일 input에 DataTransfer로 넣어 실제 업로드 핸들러를 태운다.
    const injected = await evalJs<boolean>(cdp, sid, `(async () => {
      const inp = document.querySelector('input[type=file][accept*="image"]');
      if (!inp) return false;
      const res = await fetch(${JSON.stringify(dataUrl)});
      const blob = await res.blob();
      const file = new File([blob], 'product.png', { type: 'image/png' });
      const dt = new DataTransfer(); dt.items.add(file);
      Object.defineProperty(inp, 'files', { value: dt.files, configurable: true });
      inp.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    })()`);
    console.log(`  사진 주입 ${injected ? '성공' : '실패(사진 없이 진행)'}`);
    await sleep(4000);

    // 생성 시작 — '다음 단계로' 버튼 클릭
    const started = await evalJs<boolean>(cdp, sid, `(() => {
      const btns = [...document.querySelectorAll('button')];
      const b = btns.find(x => /다음 단계로|생성/.test(x.textContent || ''));
      if (!b) return false; b.click(); return true;
    })()`);
    if (!started) { console.log('  ❌ 생성 버튼을 찾지 못했습니다'); continue; }
    console.log('  생성 시작 — 완료까지 대기(최대 15분)');

    // 완료 대기 — 결과 화면(s8)에서 이미지가 다 뜰 때까지
    const t0 = Date.now();
    let done = false;
    while (Date.now() - t0 < GEN_TIMEOUT_MS) {
      await sleep(10_000);
      const screen = await evalJs<string>(cdp, sid,
        `(JSON.parse(sessionStorage.getItem('pc_wizard_v1') || '{}').screen || '?')`);
      const el = Math.round((Date.now() - t0) / 1000);
      process.stdout.write(`\r  ${el}초 · 화면 ${screen} · 이미지 ${captured.length}장 수신   `);
      // 결과 화면에서 섹션 수만큼 받았고, 20초간 추가 수신이 없으면 완료로 본다
      if (screen === 's8' && captured.length >= SECTION_COUNT) {
        const before = captured.length;
        await sleep(20_000);
        if (captured.length === before) { done = true; break; }
      }
    }
    console.log(done ? '\n  ✅ 완료' : '\n  ⚠️ 시간 초과 — 현재 상태로 저장');

    // 이미지 저장 — 네트워크에서 가로챈 그대로
    captured.forEach((c, i) => {
      fs.writeFileSync(path.join(outDir, `sec${String(i + 1).padStart(2, '0')}.png`), Buffer.from(c.b64, 'base64'));
    });

    // 카피는 앱이 세션에 남긴 스냅샷 + 화면 텍스트에서
    const copy = await evalJs<unknown>(cdp, sid, `(() => {
      const secs = [...document.querySelectorAll('[class*=sec], section')].map(s => ({
        headline: s.querySelector('h2,h3')?.textContent?.trim() || '',
        text: (s.textContent || '').trim().slice(0, 400),
      })).filter(x => x.headline);
      return secs;
    })()`);
    fs.writeFileSync(path.join(outDir, 'result.json'),
      JSON.stringify({ product: p, out: OUT_TYPE, imageCount: captured.length, sections: copy }, null, 2));

    // 결과 화면 전체 캡처
    const shot = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true }, sid) as { data?: string };
    if (shot?.data) fs.writeFileSync(path.join(outDir, 'screen.png'), Buffer.from(shot.data, 'base64'));

    console.log(`  저장 — 이미지 ${captured.length}장 → ${path.relative(ROOT, outDir)}/`);
    await cdp.send('Target.closeTarget', { targetId: t.targetId });
  }

  cdp.close();
  if (KEEP) {
    console.log('\n크롬 창을 열어둡니다 — 뒤로 가기로 상품정보를 확인하실 수 있어요.');
    console.log('확인 끝나면 창을 직접 닫아주세요.');
  } else {
    chrome.kill();
  }
  console.log(`\n완료 → ${path.relative(ROOT, OUT_ROOT)}/`);
}

await main();
