/**
 * 화면 전수 점검 크롤러(2026-08-04) — 오픈 전 "코드는 맞는데 화면이 깨진" 유형을 잡는다.
 *
 * ★왜: 훅 순서·레이아웃 눌림·자리표시자·로딩 중 잔상 — 오늘까지 잡은 버그 대부분이
 *   코드 리뷰가 아니라 '화면을 실제로 본' 순간 발견됐다. 그걸 자동화한다.
 *
 * 하는 일 (비용 0 — 생성 API는 호출하지 않는다):
 *  1. 세션 JWT를 구워 로그인 상태로 진입
 *  2. 데스크탑(1280)·모바일(430) 두 폭에서 실제 클릭으로 s1→s5→s5b→s6까지 전진
 *  3. 각 화면 스크린샷 + 콘솔 오류·페이지 예외·실패한 요청 수집
 *  4. ★뒤로가기/앞으로가기를 실제로 눌러 화면 전환·오류를 기록 (유근님이 겪은 그 경로)
 *
 * 실행: dev 서버 켠 상태에서  npx tsx scripts/screen-crawl.mts
 * 출력: runs/screen-crawl-<시각>/  스크린샷 + report.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { encode } from 'next-auth/jwt';
import puppeteer, { type Page, type ConsoleMessage } from 'puppeteer-core';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = 'http://localhost:3000';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const env: Record<string, string> = {};
for (const l of fs.readFileSync(path.join(ROOT, '.env.local'), 'utf8').split('\n')) {
  const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}

const stamp = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 16);
const OUT = path.join(ROOT, 'runs', `screen-crawl-${stamp}`);
fs.mkdirSync(OUT, { recursive: true });

interface Issue { where: string; kind: string; detail: string }
const issues: Issue[] = [];
const shots: string[] = [];

function note(where: string, kind: string, detail: string) {
  // 소음 필터 — 실서비스 판단에 안 쓰이는 것들
  if (/favicon|Download the React DevTools|hydrat.*Warning|net::ERR_ABORTED.*hot-update/i.test(detail)) return;
  issues.push({ where, kind, detail: detail.slice(0, 300) });
}

async function shot(page: Page, name: string) {
  const f = `${name}.png`;
  try {
    await page.screenshot({ path: path.join(OUT, f) as `${string}.png`, fullPage: false });
    shots.push(f);
  } catch (e) { note(name, 'screenshot', String(e).slice(0, 120)); }
}

/** 현재 화면 id — AppContext가 history.state에 남기는 값을 그대로 읽는다 */
const curScreen = async (page: Page): Promise<string> => {
  try {
    return await page.evaluate(() => (window.history.state as { screen?: string } | null)?.screen ?? '(없음)');
  } catch { return '(evaluate 실패)'; }
};

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

/** 텍스트로 버튼/요소 클릭 — 셀렉터가 없는 인라인 스타일 UI라 텍스트 매칭이 제일 안정적 */
async function clickText(page: Page, text: string, tag = '*'): Promise<boolean> {
  try {
    return await page.evaluate(({ text, tag }) => {
      const scope = tag === '*' ? 'button, a, [onclick], div, span, h2, b' : tag;
      const els = Array.from(document.querySelectorAll<HTMLElement>(scope));
      // 텍스트가 포함된 것 중 '가장 작은' 요소 = 실제 클릭 대상(부모 컨테이너 제외)
      const hits = els.filter(e => (e.textContent ?? '').includes(text));
      if (!hits.length) return false;
      hits.sort((a, b) => (a.textContent ?? '').length - (b.textContent ?? '').length);
      hits[0].click();
      return true;
    }, { text, tag });
  } catch { return false; }
}

async function crawlAt(width: number, label: string, cookie: string) {
  const browser = await puppeteer.launch({
    executablePath: CHROME, headless: true, protocolTimeout: 45_000,
    args: ['--no-first-run', '--disable-gpu', `--window-size=${width},1000`],
    defaultViewport: { width, height: 1000 },
  });
  const page = await browser.newPage();
  const here = () => `${label}`;

  page.on('console', (msg: ConsoleMessage) => {
    if (msg.type() === 'error') note(here(), 'console', msg.text());
  });
  page.on('pageerror', err => note(here(), 'pageerror', String(err)));
  page.on('requestfailed', req => note(here(), 'requestfailed', `${req.url()} — ${req.failure()?.errorText}`));
  page.on('response', res => {
    if (res.status() >= 400 && !/favicon/.test(res.url())) note(here(), `http ${res.status()}`, res.url());
  });

  await page.setCookie({ name: 'next-auth.session-token', value: cookie, domain: 'localhost', path: '/' });

  // ── 랜딩(비로그인 화면은 쿠키 있어도 접근 가능) + 체인지로그 ──
  await page.goto(`${BASE}/changelog`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await shot(page, `${label}-00-changelog`);

  // ── 앱 진입 → 대시보드 ──
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await sleep(3500);   // 세션 확인 → 대시보드 자동 전환까지
  await shot(page, `${label}-01-dash(${await curScreen(page)})`);

  // ── 상세페이지 만들기 → s1 ──
  const entered = await clickText(page, '상세페이지 만들기');
  await sleep(1200);
  if (!entered || (await curScreen(page)) === 's-dash') {
    note(here(), 'flow', `'상세페이지 만들기' 클릭 후에도 화면=${await curScreen(page)}`);
  }
  await shot(page, `${label}-02-start(${await curScreen(page)})`);

  // s1 채우기 — 상품명 입력 → 카테고리 자동선택 확인
  const typed = await page.evaluate(() => {
    const inp = document.querySelector<HTMLInputElement>('input[placeholder*="상품명"]');
    if (!inp) return false;
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!;
    setter.call(inp, '리프그린 시카 카밍 토너 250ml');
    inp.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  });
  if (!typed) note(here(), 'flow', 's1 상품명 입력창을 찾지 못함');
  await sleep(600);
  await shot(page, `${label}-03-s1-filled`);

  // 시작 버튼 → s5
  await clickText(page, '만들기', 'button');          // "이 설정으로 만들기 · N크레딧 →" / 모바일 CTA
  await sleep(1200);
  const s5 = await curScreen(page);
  if (s5 !== 's5') note(here(), 'flow', `시작 버튼 후 기대 s5, 실제 ${s5}`);
  await shot(page, `${label}-04-s5(${s5})`);

  // ── ★뒤로가기 → s1 → 앞으로가기 → s5 (유근님이 겪은 경로) ──
  await page.goBack(); await sleep(900);
  const back1 = await curScreen(page);
  if (back1 !== 's1') note(here(), 'back/forward', `s5에서 뒤로가기 → 기대 s1, 실제 ${back1}`);
  await shot(page, `${label}-05-back-to-s1(${back1})`);

  // 뒤로 갔을 때 s1 입력값이 남아 있는가(상태 유지 확인)
  const nameKept = await page.evaluate(() =>
    document.querySelector<HTMLInputElement>('input[placeholder*="상품명"]')?.value ?? '');
  if (!nameKept) note(here(), 'back/forward', 's1로 돌아왔는데 상품명이 비어 있음');

  await page.goForward(); await sleep(900);
  const fwd1 = await curScreen(page);
  if (fwd1 !== 's5') note(here(), 'back/forward', `앞으로가기 → 기대 s5, 실제 ${fwd1}`);
  await shot(page, `${label}-06-fwd-to-s5(${fwd1})`);

  // ── s5 → s5b (다음 단계로) — 카테고리 '기타'가 아니면 필수문항에 막힐 수 있으므로 결과만 기록 ──
  await clickText(page, '다음 단계로', 'button');
  await sleep(600);
  // 동의 체크가 필요하면 체크 후 재시도
  await page.evaluate(() => {
    const cb = document.querySelector<HTMLInputElement>('input[type="checkbox"]');
    if (cb && !cb.checked) cb.click();
  });
  await clickText(page, '다음 단계로', 'button');
  await sleep(2500);
  const s5b = await curScreen(page);
  await shot(page, `${label}-07-after-next(${s5b})`);
  if (s5b === 's5b') {
    // 추천 로딩이 끝날 때까지 (최대 90초) — 로딩 중 잔상·자리표시자 확인용으로 중간 샷도 남김
    await sleep(3000);
    await shot(page, `${label}-08-s5b-loading`);
    await page.waitForFunction(
      () => !document.body.textContent?.includes('구성하는 중'),
      { timeout: 90_000 }).catch(() => note(here(), 'flow', 's5b 추천이 90초 내에 안 끝남'));
    await sleep(800);
    await shot(page, `${label}-09-s5b-done`);

    const bodyTxt = await page.evaluate(() => document.body.innerText);
    if (/추가 섹션 \d/.test(bodyTxt)) note(here(), 'placeholder', 's5b에 "추가 섹션 N" 자리표시자 노출');
    if (/0번.*다음에 들어갑니다|\+0크레딧/.test(bodyTxt)) note(here(), 'placeholder', 's5b 추천 카드에 0번/+0크레딧 노출');

    // ★s5b에서 뒤로 → s5 → 다시 s5b 재진입 (편집 유지·재로딩 확인)
    await page.goBack(); await sleep(900);
    const b2 = await curScreen(page);
    if (b2 !== 's5') note(here(), 'back/forward', `s5b에서 뒤로가기 → 기대 s5, 실제 ${b2}`);
    await page.goForward(); await sleep(1500);
    const f2 = await curScreen(page);
    if (f2 !== 's5b') note(here(), 'back/forward', `s5b로 앞으로가기 → 실제 ${f2}`);
    await shot(page, `${label}-10-s5b-revisit(${f2})`);

    // s5b → s6
    await clickText(page, '이 구조로', 'button');
    await sleep(1500);
    const s6 = await curScreen(page);
    if (s6 !== 's6') note(here(), 'flow', `'이 구조로' 후 기대 s6, 실제 ${s6}`);
    await shot(page, `${label}-11-s6(${s6})`);

    // ★s6에서 두 번 연속 뒤로 → s5b → s5, 두 번 앞으로 복귀
    await page.goBack(); await sleep(700);
    await page.goBack(); await sleep(700);
    const deep = await curScreen(page);
    if (deep !== 's5') note(here(), 'back/forward', `s6에서 뒤로×2 → 기대 s5, 실제 ${deep}`);
    await page.goForward(); await sleep(700);
    await page.goForward(); await sleep(900);
    const deepF = await curScreen(page);
    if (deepF !== 's6') note(here(), 'back/forward', `앞으로×2 → 기대 s6, 실제 ${deepF}`);
    await shot(page, `${label}-12-s6-after-bf(${deepF})`);
  }

  // ── 새로고침 복원 — 어디까지 살아나는가 ──
  await page.reload({ waitUntil: 'domcontentloaded' }); await sleep(2000);
  await shot(page, `${label}-13-reload(${await curScreen(page)})`);

  await browser.close();
}

async function main() {
  const cookie = await encode({
    token: { email: env.CRAWL_EMAIL || 'harness@flik.test', name: 'Crawl' },
    secret: env.NEXTAUTH_SECRET,
  });

  for (const [w, l] of [[1280, 'pc'], [430, 'mo']] as const) {
    try { await crawlAt(w, l, cookie); }
    catch (e) { note(l, 'crash', String(e).slice(0, 200)); }
  }

  const lines = [
    `# 화면 전수 점검 — ${stamp}`, '',
    `스크린샷 ${shots.length}장 · 이슈 ${issues.length}건`, '',
    ...issues.map(i => `- [${i.where}] **${i.kind}** — ${i.detail}`),
    '', '## 스크린샷', ...shots.map(s => `- ${s}`),
  ];
  fs.writeFileSync(path.join(OUT, 'report.md'), lines.join('\n'));
  console.log(`\n완료 → ${path.relative(ROOT, OUT)}/report.md`);
  console.log(`이슈 ${issues.length}건:`);
  for (const i of issues) console.log(`  [${i.where}] ${i.kind}: ${i.detail.slice(0, 120)}`);
}

main().catch(err => { console.error(err); process.exit(1); });
