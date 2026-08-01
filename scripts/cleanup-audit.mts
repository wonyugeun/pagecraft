/**
 * 폴더 정리 감사 — 무엇이 무엇인지 알려주는 목록을 만든다(2026-08-01).
 *
 * ★아무것도 지우지 않는다. 판단 재료만 만든다.
 *   "뭘 알 수가 없으니 지울 수도 없다"(유근님)가 문제이므로, 각 항목이
 *   ①무엇인지 ②코드가 쓰는지 ③지우면 무슨 일이 생기는지를 함께 적는다.
 *
 * ★분류 기준:
 *   지켜야 함  — 코드가 참조하거나 git이 추적 중이거나 재생성 불가(유근님 원본 자료)
 *   재생성 가능 — 스크립트로 다시 만들 수 있는 산출물(테스트 결과·프로토타입 출력)
 *   확인 필요  — 참조가 없고 출처가 불분명. 유근님만 판단 가능
 *
 * 실행: npx --yes tsx scripts/cleanup-audit.mts
 * 출력: runs/cleanup-audit.html + 콘솔 요약
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const ROOT = process.cwd();
const CODE_DIRS = ['app', 'components', 'lib', 'data', 'store', 'scripts'];

/** 코드에서 이 파일명이 언급되는가 — 파일명만으로 grep(경로 표기가 제각각이라) */
function referenced(basename: string): string | null {
  if (basename.length < 4) return null;
  try {
    const out = execSync(
      `grep -rlF ${JSON.stringify(basename)} ${CODE_DIRS.join(' ')} 2>/dev/null | head -1`,
      { cwd: ROOT, encoding: 'utf8' },
    ).trim();
    return out || null;
  } catch { return null; }
}

function du(p: string): number {
  try {
    const out = execSync(`du -sk ${JSON.stringify(p)} 2>/dev/null`, { cwd: ROOT, encoding: 'utf8' });
    return parseInt(out.split('\t')[0], 10) * 1024;
  } catch { return 0; }
}
const mb = (b: number) => b >= 1024 ** 3 ? `${(b / 1024 ** 3).toFixed(1)}GB` : `${Math.round(b / 1024 ** 2)}MB`;

type Verdict = 'keep' | 'regen' | 'check';
interface Item { name: string; size: number; verdict: Verdict; what: string; risk: string }

const items: Item[] = [];

/* ── 큰 폴더 판정 ── */
const FOLDER_NOTES: Record<string, { verdict: Verdict; what: string; risk: string }> = {
  'node_modules': { verdict: 'keep', what: '의존성 패키지', risk: '지워도 npm install로 복구. 다만 지금 지울 이유 없음' },
  '.next': { verdict: 'regen', what: 'Next.js 빌드 캐시', risk: '지워도 다음 빌드에 자동 재생성' },
  '_prototype_out': { verdict: 'regen', what: '초기 프로토타입 산출물 — scripts/의 옛 실험 스크립트가 만든 이미지·HTML', risk: '옛 스크립트 3개가 경로를 참조하지만 다시 돌릴 일이 없다면 삭제 가능' },
  'runs': { verdict: 'regen', what: '테스트 실행 결과 — 다양성 테스트·카피 비교·요금제 분석 등', risk: '기록용. 스크립트로 다시 만들 수 있으나 생성 비용이 든다' },
  'public': { verdict: 'keep', what: '웹에 배포되는 정적 파일', risk: '⚠️여기 있는 건 전부 사용자에게 서빙된다 — 안 쓰는 이미지도 배포 용량에 포함' },
  'test-assets': { verdict: 'keep', what: '테스트용 상품 사진 — 하네스가 참조', risk: '지우면 다양성 테스트·색 검증을 못 돌린다' },
  'scripts': { verdict: 'keep', what: '검증·분석 스크립트', risk: '지우면 재검증 불가' },
};

for (const d of fs.readdirSync(ROOT)) {
  const full = path.join(ROOT, d);
  if (!fs.statSync(full).isDirectory()) continue;
  if (['.git', '.claude'].includes(d)) continue;
  const size = du(d);
  if (size < 1024 * 1024) continue;   // 1MB 미만은 목록에서 생략

  const note = FOLDER_NOTES[d];
  if (note) { items.push({ name: `${d}/`, size, ...note }); continue; }

  // 코드가 안 쓰는 폴더 = 유근님 자료일 가능성 — 함부로 지우라고 하지 않는다
  const tracked = (() => {
    try { return execSync(`git ls-files ${JSON.stringify(d)} | head -1`, { cwd: ROOT, encoding: 'utf8' }).trim() !== ''; }
    catch { return false; }
  })();
  items.push({
    name: `${d}/`, size,
    verdict: 'check',
    what: tracked ? '깃에 포함된 폴더' : '깃에 없는 폴더 — 유근님이 넣어둔 자료로 보임(레퍼런스·계약서 등)',
    risk: tracked ? '코드와 무관해 보이지만 추적 중이라 확인 필요' : '⚠️원본 자료면 복구 불가 — 반드시 직접 확인 후 결정',
  });
}

/* ── 루트에 흩어진 파일 ── */
const strays: Item[] = [];
for (const f of fs.readdirSync(ROOT)) {
  const full = path.join(ROOT, f);
  if (fs.statSync(full).isDirectory()) continue;
  if (!/\.(png|jpe?g|gif|mp4|pdf|brl|webp)$/i.test(f)) continue;
  const size = fs.statSync(full).size;
  const ref = referenced(f);
  strays.push({
    name: f, size,
    verdict: ref ? 'keep' : 'check',
    what: ref ? `코드에서 참조: ${ref}` : '코드 참조 없음 — 작업 중 만든 결과물/캡처로 보임',
    risk: ref ? '지우면 해당 코드가 깨질 수 있음' : '원본이 아니라면 삭제해도 무방',
  });
}
strays.sort((a, b) => b.size - a.size);

/* ── public 안에서 코드가 안 쓰는 이미지 ── */
const publicUnused: Item[] = [];
function walk(dir: string) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) { walk(full); continue; }
    if (!/\.(png|jpe?g|gif|mp4|webp|svg)$/i.test(e.name)) continue;
    if (referenced(e.name)) continue;
    publicUnused.push({
      name: path.relative(ROOT, full), size: fs.statSync(full).size,
      verdict: 'check', what: '코드에서 참조되지 않음',
      risk: '배포 용량에 포함되지만 화면에는 안 쓰임. 랜딩 이미지 등은 동적 경로일 수 있어 확인 필요',
    });
  }
}
if (fs.existsSync(path.join(ROOT, 'public'))) walk(path.join(ROOT, 'public'));
publicUnused.sort((a, b) => b.size - a.size);

/* ── 출력 ── */
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const BADGE: Record<Verdict, [string, string]> = {
  keep: ['지켜야 함', '#0B8A4B'], regen: ['재생성 가능', '#B07800'], check: ['확인 필요', '#C92A2A'],
};
const row = (i: Item) => `<tr>
  <td><code>${esc(i.name)}</code></td>
  <td class="sz">${mb(i.size)}</td>
  <td><span class="b" style="background:${BADGE[i.verdict][1]}18;color:${BADGE[i.verdict][1]}">${BADGE[i.verdict][0]}</span></td>
  <td>${esc(i.what)}</td><td class="dim">${esc(i.risk)}</td></tr>`;

const total = items.reduce((s, i) => s + i.size, 0);
const regenSize = items.filter(i => i.verdict === 'regen').reduce((s, i) => s + i.size, 0);
const straySize = strays.filter(i => i.verdict === 'check').reduce((s, i) => s + i.size, 0);
const pubSize = publicUnused.reduce((s, i) => s + i.size, 0);

const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8">
<title>Flik 폴더 정리 감사</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css">
<style>
 *{box-sizing:border-box;margin:0;padding:0}
 body{font-family:'Pretendard','Apple SD Gothic Neo',sans-serif;background:#F4F4F8;color:#191F28;padding:34px 20px 90px;line-height:1.6}
 .w{max-width:1080px;margin:0 auto} h1{font-size:24px;margin-bottom:5px}
 .sub{color:#8B95A1;font-size:13.5px;margin-bottom:22px;line-height:1.8}
 .card{background:#fff;border-radius:14px;padding:20px 22px;margin-bottom:16px;box-shadow:0 2px 10px rgba(0,0,0,.05)}
 h2{font-size:16px;margin-bottom:4px} .d{font-size:12.5px;color:#8B95A1;margin-bottom:14px;line-height:1.7}
 table{width:100%;border-collapse:collapse;font-size:12.5px}
 th{background:#F4F4F8;padding:9px 8px;font-size:11px;font-weight:800;color:#4E5968;text-align:left}
 td{padding:10px 8px;border-top:1px solid #F1F1F5;vertical-align:top}
 td.sz{white-space:nowrap;font-variant-numeric:tabular-nums;font-weight:700}
 code{background:#F4F4F8;border-radius:4px;padding:2px 6px;font-size:12px}
 .b{display:inline-block;border-radius:99px;padding:3px 9px;font-size:11px;font-weight:800;white-space:nowrap}
 .dim{color:#8B95A1;font-size:12px}
 .sum{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px;margin-bottom:6px}
 .si{background:#FAFAFC;border:1px solid #ECECF2;border-radius:11px;padding:13px 15px}
 .si b{display:block;font-size:20px} .si span{font-size:11.5px;color:#8B95A1}
 .warn{background:#FFF9E8;border:1px solid #FFE9A8;border-radius:10px;padding:13px 16px;font-size:12.5px;color:#7A5C00;line-height:1.8;margin-top:14px}
</style></head><body><div class="w">
<h1>Flik 폴더 정리 감사</h1>
<p class="sub">아무것도 지우지 않았습니다 — 무엇이 무엇인지 알려드리는 목록입니다.<br>
<b>지켜야 함</b> 코드가 쓰거나 복구 불가 · <b>재생성 가능</b> 스크립트로 다시 만들 수 있음 · <b>확인 필요</b> 유근님만 판단 가능</p>

<div class="card">
  <h2>한눈에</h2>
  <div class="sum">
    <div class="si"><b>${mb(total)}</b><span>주요 폴더 합계</span></div>
    <div class="si"><b>${mb(regenSize)}</b><span>재생성 가능 — 지워도 복구됨</span></div>
    <div class="si"><b>${mb(straySize)}</b><span>루트에 흩어진 파일(미참조)</span></div>
    <div class="si"><b>${mb(pubSize)}</b><span>public 미참조 — 배포에 포함됨</span></div>
  </div>
  <div class="warn">⚠️ <b>깃에 없는 폴더는 지우면 복구가 안 됩니다.</b> 레퍼런스·계약서 같은 원본 자료가 섞여 있으니
    '확인 필요'로 표시된 폴더는 반드시 직접 열어보고 결정해주세요. 저는 판단하지 않았습니다.</div>
</div>

<div class="card"><h2>폴더</h2>
  <p class="d">1MB 이상만 표시합니다.</p>
  <table><tr><th>이름</th><th>용량</th><th>판정</th><th>무엇인지</th><th>지우면</th></tr>
  ${items.sort((a, b) => b.size - a.size).map(row).join('')}</table></div>

<div class="card"><h2>루트에 흩어진 파일 ${strays.length}개</h2>
  <p class="d">프로젝트 최상단에 쌓인 이미지·문서입니다. 코드 참조 여부를 파일명으로 확인했습니다.</p>
  <table><tr><th>이름</th><th>용량</th><th>판정</th><th>무엇인지</th><th>지우면</th></tr>
  ${strays.map(row).join('')}</table></div>

<div class="card"><h2>public 안에서 코드가 안 쓰는 파일 ${publicUnused.length}개</h2>
  <p class="d">public은 전부 배포에 포함되어 사용자에게 서빙됩니다 — 안 쓰는 파일도 배포 용량을 차지합니다.
    다만 경로를 문자열로 조립해 쓰는 경우가 있어 '미참조'가 곧 '불필요'는 아닙니다.</p>
  <table><tr><th>이름</th><th>용량</th><th>판정</th><th>무엇인지</th><th>지우면</th></tr>
  ${publicUnused.slice(0, 60).map(row).join('')}</table>
  ${publicUnused.length > 60 ? `<p class="d" style="margin-top:10px">…외 ${publicUnused.length - 60}개</p>` : ''}</div>
</div></body></html>`;

fs.mkdirSync(path.join(ROOT, 'runs'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'runs', 'cleanup-audit.html'), html);

console.log('폴더 정리 감사 — 아무것도 삭제하지 않았습니다\n');
console.log(`  주요 폴더 합계        ${mb(total)}`);
console.log(`  재생성 가능(안전)     ${mb(regenSize)}`);
console.log(`  루트 흩어진 파일      ${mb(straySize)} (${strays.filter(s => s.verdict === 'check').length}개)`);
console.log(`  public 미참조         ${mb(pubSize)} (${publicUnused.length}개)`);
console.log(`\n보고서: runs/cleanup-audit.html`);
