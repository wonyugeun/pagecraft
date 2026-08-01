/**
 * 요금제 최종 정리 — 블로그형·슬라이드형, 커미션 유무를 한 화면에서 본다(2026-08-01).
 *
 * ★두 출력형태는 원가 구조가 다르다:
 *   블로그형 — 카피 2안(A안 소넷5 + B안 루나)을 다 만들고 본문이 길다. 이미지는 비율이 섞여 싸다.
 *   슬라이드형 — B안이 없고 본문이 1~2문장이라 카피가 싸다. 대신 전 섹션 4:5라 이미지가 비싸다.
 *   합치면 슬라이드가 조금 싸다 — 그래서 크레딧도 다르게 매길 근거가 있다.
 *
 * ★원가는 전부 실측 기반(dev 토큰 로그 + 실제 이미지 크기 분포). 슬라이드 카피 출력만
 *   실측 본문 길이(평균 53자 vs 블로그 147자)로 환산해 추정했다.
 *
 * 실행: npx --yes tsx scripts/pricing-summary.mts
 * 출력: runs/pricing-summary.html
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();

/* ── 확정 요금제(할인 10/15/21%, LIGHT 495원 기준) ── */
const PLANS = [
  { id: 'light', name: 'LIGHT', price: 9900, credits: 20, months: 1, disc: 0 },
  { id: 'standard', name: 'STANDARD', price: 29000, credits: 65, months: 2, disc: 10 },
  { id: 'pro', name: 'PRO', price: 59000, credits: 140, months: 3, disc: 15 },
  { id: 'max', name: 'MAX', price: 119000, credits: 305, months: 6, disc: 21 },
];

/* ── 출력형태별 원가(8섹션 1장 기준, 원) ── */
const FORMS = [
  {
    id: 'blog', name: '블로그형', creditPerSection: 1.25, sections: 8,
    llm: { strategy: 38, structure: 66, copyA: 558, copyB: 136, imagebrief: 155 },
    image: 900,   // 1024x1024 4장×90 + 1.5배 4장×135
    imageNote: '비율 혼합 — 90~135원',
    copyNote: 'A안(소넷5) + B안(루나) 둘 다 생성',
  },
  {
    id: 'slide', name: '슬라이드형', creditPerSection: 1.0, sections: 8,
    llm: { strategy: 38, structure: 66, copyA: 305, copyB: 0, imagebrief: 155 },
    image: 1080,  // 전 섹션 4:5 → 1024x1536 × 135원
    imageNote: '전 섹션 4:5 — 135원 고정',
    copyNote: 'A안만 · 본문 1~2문장(평균 53자)',
  },
];

const REGEN = { copy: 89, image: 113 };

const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Flik 요금제 최종 정리</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css">
<style>
 *{box-sizing:border-box;margin:0;padding:0}
 body{font-family:'Pretendard','Apple SD Gothic Neo',sans-serif;background:#F4F4F8;color:#191F28;padding:32px 18px 90px;line-height:1.6}
 .w{max-width:1120px;margin:0 auto}
 h1{font-size:25px;margin-bottom:6px}
 .sub{color:#8B95A1;font-size:13.5px;margin-bottom:22px;line-height:1.8}
 .card{background:#fff;border-radius:16px;padding:22px 24px;margin-bottom:16px;box-shadow:0 2px 10px rgba(0,0,0,.05)}
 h2{font-size:17px;margin-bottom:4px}
 .h2sub{font-size:12.5px;color:#8B95A1;margin-bottom:16px;line-height:1.7}
 .ctrl{display:flex;flex-wrap:wrap;gap:24px;align-items:center;background:#F4F0FF;border:1px solid #E6DEFF;border-radius:12px;padding:15px 18px;margin-bottom:20px}
 .ctrl label{font-size:13px;font-weight:700;color:#4E5968;display:flex;align-items:center;gap:9px}
 .ctrl input[type=range]{width:150px;accent-color:#6D4CFF}
 .val{display:inline-block;min-width:52px;font-weight:800;color:#6D4CFF;font-size:14px}
 table{width:100%;border-collapse:collapse;font-size:13px}
 th{background:#F4F4F8;padding:10px 9px;font-weight:800;color:#4E5968;font-size:11.5px;text-align:right;white-space:nowrap;vertical-align:bottom}
 th:first-child,td:first-child{text-align:left}
 td{padding:12px 9px;border-top:1px solid #F1F1F5;text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
 tr.rec td{background:#FBFAFF}
 .pn{font-weight:800;font-size:14px}
 .badge{display:inline-block;font-size:10px;font-weight:800;color:#6D4CFF;background:#F4F0FF;border-radius:99px;padding:2px 7px;margin-left:6px;vertical-align:middle}
 .pos{color:#0B8A4B;font-weight:700} .neg{color:#C92A2A;font-weight:800} .dim{color:#B0B8C1}
 .big{font-size:14px;font-weight:800}
 .split{display:grid;grid-template-columns:1fr 1fr;gap:16px}
 @media(max-width:900px){.split{grid-template-columns:1fr}}
 .fh{display:flex;align-items:baseline;gap:9px;margin-bottom:3px}
 .fh b{font-size:16px}
 .fh span{font-size:12px;color:#8B95A1}
 .brk{display:grid;grid-template-columns:1fr auto;gap:2px 12px;font-size:12.5px;margin:12px 0 0;padding-top:12px;border-top:1px dashed #E5E5EC}
 .brk div{padding:3px 0} .brk .r{text-align:right;font-variant-numeric:tabular-nums;color:#4E5968}
 .brk .tot{font-weight:800;color:#191F28;border-top:1px solid #ECECF2;margin-top:5px;padding-top:8px}
 .note{font-size:12.5px;color:#8B95A1;margin-top:16px;line-height:1.8;padding-top:14px;border-top:1px dashed #E5E5EC}
 .note b{color:#4E5968}
 .trial{background:#FFF9E8;border:1px solid #FFE9A8;border-radius:12px;padding:14px 17px;font-size:13px;line-height:1.85;color:#7A5C00}
 .trial b{color:#5C4500}
</style></head><body><div class="w">
<h1>Flik 요금제 최종 정리</h1>
<p class="sub"><b>결제 1건 기준</b> — 매출은 셀러가 낸 돈, 커미션은 그 결제액의 정률입니다.<br>
원가는 실측입니다(dev 토큰 로그 + 실제 이미지 크기 분포).</p>

<div class="ctrl">
  <label>인플루언서 커미션 <input type="range" id="cm" min="0" max="40" step="5" value="20"><span class="val" id="cmv">20%</span></label>
  <label>무료 재생성 사용 <input type="range" id="rg" min="0" max="5" step="1" value="3"><span class="val" id="rgv">3회</span></label>
  <label>크레딧 소진율 <input type="range" id="use" min="40" max="100" step="10" value="100"><span class="val" id="usev">100%</span></label>
</div>

<div class="card">
  <h2>1. 출력형태별 원가 — 8섹션 1장</h2>
  <p class="h2sub">두 형태는 원가 구조가 반대입니다. 블로그는 카피가 비싸고, 슬라이드는 이미지가 비쌉니다.</p>
  <div class="split" id="formCost"></div>
</div>

<div class="card">
  <h2>2. 요금제 — 확정안</h2>
  <p class="h2sub">LIGHT 크레딧 단가 495원을 기준 0%로 두고, 상위 플랜은 '같은 돈에 크레딧을 몇 % 더 주는가'입니다.</p>
  <table id="tPlans"></table>
</div>

<div class="card">
  <h2>3. 블로그형 수익 — 8섹션 = 10크레딧</h2>
  <p class="h2sub">셀러가 크레딧을 전부 블로그형에 쓴 경우입니다.</p>
  <table id="tBlog"></table>
</div>

<div class="card">
  <h2>4. 슬라이드형 수익 — 8섹션 = 8크레딧</h2>
  <p class="h2sub">슬라이드는 원가가 낮아 크레딧을 섹션당 1개로 유지합니다.</p>
  <table id="tSlide"></table>
</div>

<div class="card">
  <h2>5. 체험 계정</h2>
  <p class="h2sub">가입 시 10크레딧 지급 · 7일 유효.</p>
  <div class="trial" id="trial"></div>
</div>

<script>
const PLANS = ${JSON.stringify(PLANS)};
const FORMS = ${JSON.stringify(FORMS)};
const REGEN = ${JSON.stringify(REGEN)};
const won = n => Math.round(n).toLocaleString();
const cls = n => n < 0 ? 'neg' : 'pos';

function formCost(f, rg) {
  const llm = Object.values(f.llm).reduce((a, b) => a + b, 0);
  const regen = ((REGEN.copy + REGEN.image) / 2) * rg;
  return { llm, image: f.image, regen, total: llm + f.image + regen };
}

function renderFormCards(rg) {
  document.getElementById('formCost').innerHTML = FORMS.map(f => {
    const c = formCost(f, rg);
    return \`<div>
      <div class="fh"><b>\${f.name}</b><span>섹션당 \${f.creditPerSection}크레딧</span></div>
      <div class="brk">
        <div>전략 · 구조</div><div class="r">\${won(f.llm.strategy + f.llm.structure)}원</div>
        <div>카피 <span class="dim">\${f.copyNote}</span></div><div class="r">\${won(f.llm.copyA + f.llm.copyB)}원</div>
        <div>이미지브리프</div><div class="r">\${won(f.llm.imagebrief)}원</div>
        <div>이미지 8장 <span class="dim">\${f.imageNote}</span></div><div class="r">\${won(f.image)}원</div>
        <div>무료 재생성 \${rg}회</div><div class="r">\${won(c.regen)}원</div>
        <div class="tot">합계</div><div class="r tot">\${won(c.total)}원</div>
      </div></div>\`;
  }).join('');
}

function renderPlans() {
  const base = PLANS[0].price / PLANS[0].credits;
  document.getElementById('tPlans').innerHTML =
    '<tr><th>플랜</th><th>정가</th><th>크레딧</th><th>크레딧 단가</th><th>할인</th><th>유효기간</th>' +
    '<th>블로그 8섹션<br>몇 장</th><th>슬라이드 8섹션<br>몇 장</th></tr>' +
    PLANS.map(p => \`<tr class="\${p.id === 'pro' ? 'rec' : ''}">
      <td class="pn">\${p.name}\${p.id === 'pro' ? '<span class="badge">인기</span>' : ''}</td>
      <td class="big">\${won(p.price)}원</td><td>\${p.credits}개</td>
      <td>\${won(p.price / p.credits)}원</td>
      <td class="dim">\${p.disc ? p.disc + '%' : '—'}</td>
      <td class="dim">\${p.months}개월</td>
      <td>\${(p.credits / 10).toFixed(1)}장</td>
      <td>\${(p.credits / 8).toFixed(1)}장</td>
    </tr>\`).join('');
}

function renderRevenue(id, form, cm, rg, use) {
  const c = formCost(form, rg);
  const creditsPerPage = form.sections * form.creditPerSection;
  document.getElementById(id).innerHTML =
    '<tr><th>플랜</th><th>매출<br>(결제액)</th><th>만들 수 있는<br>페이지</th><th>실제 사용</th><th>원가</th>' +
    '<th>커미션 없을 때<br>순수익</th><th>수익률</th><th>커미션 -<span id="cmL' + id + '">' + cm + '</span>%</th>' +
    '<th>최종 순수익</th><th>수익률</th></tr>' +
    PLANS.map(p => {
      const pagesMax = p.credits / creditsPerPage;
      const pagesUsed = pagesMax * use / 100;
      const cost = c.total * pagesUsed;
      const gross = p.price - cost;
      const comm = p.price * cm / 100;
      const net = gross - comm;
      return \`<tr class="\${p.id === 'pro' ? 'rec' : ''}">
        <td class="pn">\${p.name}</td>
        <td class="big">\${won(p.price)}원</td>
        <td>\${pagesMax.toFixed(1)}장</td>
        <td class="dim">\${pagesUsed.toFixed(1)}장</td>
        <td class="dim">-\${won(cost)}원</td>
        <td class="\${cls(gross)}">\${won(gross)}원</td>
        <td class="\${cls(gross)}">\${(gross / p.price * 100).toFixed(0)}%</td>
        <td class="dim">-\${won(comm)}원</td>
        <td class="\${cls(net)} big">\${won(net)}원</td>
        <td class="\${cls(net)}">\${(net / p.price * 100).toFixed(0)}%</td>
      </tr>\`;
    }).join('');
}

function renderTrial(rg) {
  const b = formCost(FORMS[0], rg), s = formCost(FORMS[1], rg);
  document.getElementById('trial').innerHTML = \`
    체험 10크레딧으로 만들 수 있는 것 —
    <b>블로그형 8섹션 1장</b>(10크레딧) 또는 <b>슬라이드형 10섹션 1장</b>(10크레딧).<br>
    이때 우리가 부담하는 원가는 블로그 <b>\${won(b.total)}원</b> / 슬라이드 <b>\${won(s.total * 10 / 8)}원</b>입니다.
    체험은 전액 우리 부담이므로, 가입자 1명당 이 금액이 마케팅 비용으로 나갑니다.<br>
    LIGHT 한 건(순수익 기준)이면 체험 <b>약 \${Math.floor((9900 - b.total * 2 - 9900 * 0.2) / b.total)}명</b>분을 메웁니다.\`;
}

function update() {
  const cm = +document.getElementById('cm').value;
  const rg = +document.getElementById('rg').value;
  const use = +document.getElementById('use').value;
  document.getElementById('cmv').textContent = cm + '%';
  document.getElementById('rgv').textContent = rg + '회';
  document.getElementById('usev').textContent = use + '%';
  renderFormCards(rg);
  renderPlans();
  renderRevenue('tBlog', FORMS[0], cm, rg, use);
  renderRevenue('tSlide', FORMS[1], cm, rg, use);
  renderTrial(rg);
}
['cm', 'rg', 'use'].forEach(id => document.getElementById(id).addEventListener('input', update));
update();
</script></body></html>`;

fs.mkdirSync(path.join(ROOT, 'runs'), { recursive: true });
const out = path.join('runs', 'pricing-summary.html');
fs.writeFileSync(out, html);
console.log(`완료 → ${out}`);
