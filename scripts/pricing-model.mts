/**
 * 요금제 수익 모델 — 결제 1건 기준으로 매출·원가·커미션·순수익을 본다(2026-08-01).
 *
 * ★관점이 중요하다: 매출은 '셀러가 결제한 금액'이다. 페이지당으로 쪼개면 플랜마다 매출이
 *   다른 것처럼 보여 판단이 흐려진다(1차 시안의 실수). 결제 1건 = 매출 1건으로 본다.
 *   커미션도 실제 결제액에 붙는다 — 인플루언서 소개로 MAX가 팔리면 119,000원의 X%다.
 *
 * ★원가는 전부 실측(추정이 섞이면 결론이 흔들린다):
 *   · LLM 953원   — dev 로그의 실제 토큰 수(전략·구조·카피 A/B·이미지브리프)
 *   · 이미지 900원 — 8장, 전부 medium(QUALITY_TEST_OVERRIDE), 크기별 90/135원
 *   · 재생성 89/113원 — 카피(3안)/이미지, 실측 출력 토큰 기준
 *
 * ★크레딧 소진율이 수익을 크게 좌우한다. 안 쓰고 만료된 크레딧은 원가가 0이라 그대로 이익이다.
 *   특히 대용량 플랜일수록 다 못 쓰는 경우가 많아, 100% 소진 가정은 가장 보수적인 시나리오다.
 *
 * 실행: npx --yes tsx scripts/pricing-model.mts
 * 출력: runs/pricing-model.html
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();

/* ── 실측 원가(원) ── */
const COST = {
  llm: 953,          // 전략 38 + 구조 66 + 카피A 558 + 카피B 136 + 이미지브리프 155
  image: 900,        // 8장: 1024x1024 4장×90 + 1.5배 크기 4장×135
  copyRegen: 89,     // 섹션 1개, 후보 3안 (입력 38 + 출력 51)
  imageRegen: 113,   // 8섹션 평균 장당
};

interface Plan { id: string; name: string; price: number; credits: number; months: number }
const CURRENT: Plan[] = [
  { id: 'light', name: 'LIGHT', price: 9900, credits: 20, months: 1 },
  { id: 'standard', name: 'STANDARD', price: 29000, credits: 70, months: 2 },
  { id: 'pro', name: 'PRO', price: 59000, credits: 160, months: 3 },
  { id: 'max', name: 'MAX', price: 119000, credits: 350, months: 6 },
];
/* ★신규 — 정가는 유지하고 '할인율'을 설계 변수로 삼는다.
   크레딧 수는 할인율에서 역산하며, 페이지 수가 정수로 떨어지도록 반올림한다
   (셀러가 '몇 장 만들 수 있나'를 바로 세는 게 결제 판단에 가장 중요하다).
   LIGHT를 기준(할인 0%)으로 두고 상위 플랜의 할인 폭을 화면에서 조정한다. */
const BASE_PLAN = { id: 'light', name: 'LIGHT', price: 9900, credits: 20, months: 1 };
const TIERS = [
  { id: 'standard', name: 'STANDARD', price: 29000, months: 2, disc: 16 },
  { id: 'pro', name: 'PRO', price: 59000, months: 3, disc: 22 },
  { id: 'max', name: 'MAX', price: 119000, months: 6, disc: 28 },
];

const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Flik 요금제 수익 모델</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css">
<style>
 *{box-sizing:border-box;margin:0;padding:0}
 body{font-family:'Pretendard','Apple SD Gothic Neo',sans-serif;background:#F4F4F8;color:#191F28;padding:32px 18px 80px;line-height:1.6}
 .w{max-width:1080px;margin:0 auto}
 h1{font-size:24px;margin-bottom:6px}
 .sub{color:#8B95A1;font-size:13.5px;margin-bottom:22px;line-height:1.8}
 .card{background:#fff;border-radius:16px;padding:22px 24px;margin-bottom:16px;box-shadow:0 2px 10px rgba(0,0,0,.05)}
 h2{font-size:16px;margin-bottom:4px}
 .h2sub{font-size:12.5px;color:#8B95A1;margin-bottom:16px;line-height:1.7}
 .ctrl{display:flex;flex-wrap:wrap;gap:22px;align-items:center;background:#FAFAFC;border:1px solid #ECECF2;border-radius:12px;padding:16px 18px;margin-bottom:18px}
 .ctrl label{font-size:13px;font-weight:700;color:#4E5968;display:flex;align-items:center;gap:9px}
 .ctrl input[type=range]{width:140px;accent-color:#6D4CFF}
 .val{display:inline-block;min-width:50px;font-weight:800;color:#6D4CFF;font-size:14px}
 table{width:100%;border-collapse:collapse;font-size:13px}
 th{background:#F4F4F8;padding:10px 9px;font-weight:800;color:#4E5968;font-size:11.5px;text-align:right;white-space:nowrap}
 th:first-child,td:first-child{text-align:left}
 td{padding:12px 9px;border-top:1px solid #F1F1F5;text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
 tr.rec td{background:#FBFAFF}
 .pn{font-weight:800;font-size:14px}
 .badge{display:inline-block;font-size:10px;font-weight:800;color:#6D4CFF;background:#F4F0FF;border-radius:99px;padding:2px 7px;margin-left:6px;vertical-align:middle}
 .pos{color:#0B8A4B;font-weight:700} .neg{color:#C92A2A;font-weight:800}
 .dim{color:#B0B8C1} .big{font-size:14px;font-weight:800}
 .costgrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px}
 .ci{background:#FAFAFC;border:1px solid #ECECF2;border-radius:11px;padding:13px 15px}
 .ci b{display:block;font-size:19px;color:#191F28;margin-bottom:2px}
 .ci span{font-size:11.5px;color:#8B95A1;line-height:1.5;display:block}
 .note{font-size:12.5px;color:#8B95A1;margin-top:14px;line-height:1.8;padding-top:14px;border-top:1px dashed #E5E5EC}
 .note b{color:#4E5968}
</style></head><body><div class="w">
<h1>Flik 요금제 수익 모델</h1>
<p class="sub"><b>결제 1건 기준</b>입니다 — 매출은 셀러가 실제로 낸 돈, 커미션은 그 결제액에 붙습니다.<br>
원가는 전부 실측입니다(dev 서버 토큰 로그 + 실제 이미지 크기 분포).</p>

<div class="card">
  <h2>페이지 1장(8섹션) 만드는 원가</h2>
  <p class="h2sub">이 값에 '셀러가 만든 페이지 수'를 곱한 것이 결제 1건의 총원가입니다.</p>
  <div class="costgrid">
    <div class="ci"><b>953원</b><span>LLM — 전략·구조·카피 A/B·이미지브리프</span></div>
    <div class="ci"><b>900원</b><span>이미지 8장 — 전부 medium, 90~135원</span></div>
    <div class="ci"><b>89 / 113원</b><span>재생성 1회 — 카피(3안) / 이미지</span></div>
    <div class="ci" id="ppc"><b>—</b><span>페이지 1장 총원가</span></div>
  </div>
</div>

<div class="card">
  <div class="ctrl">
    <label>8섹션 페이지당 크레딧 <input type="range" id="cr" min="8" max="14" step="1" value="10"><span class="val" id="crv">10</span></label>
    <label>인플루언서 커미션 <input type="range" id="cm" min="0" max="40" step="5" value="20"><span class="val" id="cmv">20%</span></label>
    <label>무료 재생성 사용 <input type="range" id="rg" min="0" max="5" step="1" value="3"><span class="val" id="rgv">3회</span></label>
    <label>크레딧 소진율 <input type="range" id="use" min="40" max="100" step="10" value="100"><span class="val" id="usev">100%</span></label>
  </div>
  <div class="ctrl" style="background:#F4F0FF;border-color:#E6DEFF">
    <span style="font-size:12.5px;font-weight:800;color:#5B3FD6">할인율 계단 &nbsp;·&nbsp; LIGHT 기준 0%</span>
    <label>STANDARD <input type="range" id="d0" min="0" max="35" step="1" value="10"><span class="val" id="d0v">10%</span></label>
    <label>PRO <input type="range" id="d1" min="0" max="35" step="1" value="15"><span class="val" id="d1v">15%</span></label>
    <label>MAX <input type="range" id="d2" min="0" max="35" step="1" value="21"><span class="val" id="d2v">21%</span></label>
  </div>
  <h2>신규안 — 정가 유지, 크레딧 조정</h2>
  <p class="h2sub">LIGHT의 크레딧 단가(495원)를 기준 0%로 두고, 상위 플랜은 '같은 돈에 크레딧을 몇 % 더 주는가'로 정의합니다.
    크레딧 수는 할인율에서 역산하며 5개 단위로만 반올림합니다.</p>
  <table id="tNew"></table>
  <div class="note" id="noteNew"></div>
</div>

<div class="card">
  <h2>현행안 — 비교용</h2>
  <p class="h2sub">같은 조건에서 지금 요금제가 어떻게 나오는지입니다.</p>
  <table id="tOld"></table>
</div>

<script>
const COST = ${JSON.stringify(COST)};
const BASE = ${JSON.stringify(BASE_PLAN)};
const TIERS = ${JSON.stringify(TIERS)};
const OLD = ${JSON.stringify(CURRENT)};
const won = n => Math.round(n).toLocaleString();
const cls = n => n < 0 ? 'neg' : 'pos';

function pageCost(rg) {
  // 재생성은 카피·이미지를 절반씩 섞어 쓴다고 본다
  return COST.llm + COST.image + ((COST.copyRegen + COST.imageRegen) / 2) * rg;
}

/** 할인율 → 크레딧 역산.
 * ⚠️한때 '페이지 수가 정수로 떨어지게' 크레딧을 cr 배수로 반올림했는데, 그 반올림이
 *   할인 계단을 망가뜨렸다(STANDARD 10%→16.3%로 튀고 MAX 21%→19.9%로 줄어 PRO가 역전).
 *   셀러 편의보다 가격 체계의 일관성이 우선이다. 5크레딧 단위로만 정리한다. */
function buildPlans(cr, discs) {
  const baseUnit = BASE.price / BASE.credits;
  return [BASE, ...TIERS.map((t, i) => {
    const targetUnit = baseUnit * (1 - discs[i] / 100);
    const credits = Math.round(t.price / targetUnit / 5) * 5;   // 5개 단위로만 반올림
    return { ...t, credits };
  })];
}

function rows(plans, cr, cm, rg, use) {
  const pc = pageCost(rg);
  return plans.map(p => {
    const pagesMax = p.credits / cr;          // 크레딧을 다 쓰면 만들 수 있는 장수
    const pagesUsed = pagesMax * use / 100;   // 실제로 만든 장수(소진율)
    const rev = p.price;                      // ★매출 = 결제액. 플랜마다 다름이 당연하다
    const cost = pc * pagesUsed;
    const comm = rev * cm / 100;              // ★커미션 = 결제액의 정률. 플랜 무관 동일 비율
    const net = rev - cost - comm;
    const unit = p.price / p.credits;
    const base = plans[0].price / plans[0].credits;
    return { p, unit, pagesMax, pagesUsed, rev, cost, comm, net, disc: (1 - unit / base) * 100 };
  });
}

function render(id, plans, cr, cm, rg, use) {
  const rs = rows(plans, cr, cm, rg, use);
  document.getElementById(id).innerHTML = \`
    <tr><th>플랜</th><th>매출<br>(결제액)</th><th>크레딧</th><th>크레딧<br>단가</th><th>할인<br>(누적/직전)</th>
    <th>만들 수 있는<br>페이지</th><th>실제 사용</th><th>원가</th>
    <th>커미션</th><th>순수익</th><th>수익률</th></tr>\` +
    rs.map(r => \`<tr class="\${r.p.id === 'pro' ? 'rec' : ''}">
      <td class="pn">\${r.p.name}\${r.p.id === 'pro' ? '<span class="badge">인기</span>' : ''}</td>
      <td class="big">\${won(r.rev)}원</td>
      <td>\${r.p.credits}개</td>
      <td>\${won(r.unit)}원</td>
      <td class="dim">\${r.disc < 0.5 ? '—' : r.disc.toFixed(0) + '%'}\${i > 0 ? ' <span style="color:#6D4CFF;font-weight:700">+' + (r.disc - rs[i-1].disc).toFixed(0) + '</span>' : ''}</td>
      <td>\${r.pagesMax.toFixed(r.pagesMax % 1 ? 1 : 0)}장</td>
      <td class="dim">\${r.pagesUsed.toFixed(1)}장</td>
      <td class="dim">-\${won(r.cost)}원</td>
      <td class="dim">-\${won(r.comm)}원</td>
      <td class="\${cls(r.net)} big">\${won(r.net)}원</td>
      <td class="\${cls(r.net)}">\${(r.net / r.rev * 100).toFixed(0)}%</td>
    </tr>\`).join('');
  return rs;
}

function update() {
  const cr = +document.getElementById('cr').value;
  const cm = +document.getElementById('cm').value;
  const rg = +document.getElementById('rg').value;
  const use = +document.getElementById('use').value;
  document.getElementById('crv').textContent = cr;
  document.getElementById('cmv').textContent = cm + '%';
  document.getElementById('rgv').textContent = rg + '회';
  document.getElementById('usev').textContent = use + '%';
  document.querySelector('#ppc b').textContent = won(pageCost(rg)) + '원';

  const discs = [0, 1, 2].map(i => {
    const v = +document.getElementById('d' + i).value;
    document.getElementById('d' + i + 'v').textContent = v + '%';
    return v;
  });
  const NEW = buildPlans(cr, discs);
  const rs = render('tNew', NEW, cr, cm, rg, use);
  render('tOld', OLD, cr, cm, rg, use);

  const worst = rs.reduce((a, b) => (a.net / a.rev) < (b.net / b.rev) ? a : b);
  const total = rs.reduce((s, r) => s + r.net, 0);
  document.getElementById('noteNew').innerHTML =
    (worst.net >= 0
      ? \`<b>전 플랜 흑자입니다.</b> 수익률이 가장 낮은 곳은 \${worst.p.name}으로 \${(worst.net / worst.rev * 100).toFixed(0)}%(\${won(worst.net)}원) 남습니다.\`
      : \`<b>\${worst.p.name}이 \${won(-worst.net)}원 적자입니다.</b> 크레딧을 줄이거나 커미션을 낮춰야 합니다.\`) +
    \`<br><b>수익률은 상위 플랜일수록 낮아지는 게 정상입니다</b> — 대량 구매 할인이니까요.
     다만 금액은 커집니다(\${rs[0].p.name} \${won(rs[0].net)}원 → \${rs[3].p.name} \${won(rs[3].net)}원).
     인플루언서가 큰 플랜을 물어올수록 우리도, 인플루언서도 버는 구조여야 광고가 돌아갑니다.
     <br>커미션은 <b>결제액의 \${cm}% 정률</b>이라 플랜과 무관하게 같은 비율입니다
     (\${rs[0].p.name} \${won(rs[0].comm)}원 → \${rs[3].p.name} \${won(rs[3].comm)}원).\`;
}
['cr', 'cm', 'rg', 'use', 'd0', 'd1', 'd2'].forEach(id => document.getElementById(id).addEventListener('input', update));
update();
</script></body></html>`;

fs.mkdirSync(path.join(ROOT, 'runs'), { recursive: true });
const out = path.join('runs', 'pricing-model.html');
fs.writeFileSync(out, html);
console.log(`완료 → ${out}`);
