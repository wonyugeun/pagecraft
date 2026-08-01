/**
 * 요금제 수익 모델 — 원가·마진·인플루언서 커미션을 한 화면에서 본다(2026-08-01).
 *
 * ★왜 만드는가: 크레딧 단가를 얼마로 잡아야 인플루언서에게 커미션을 주고도 남는지를
 *   감이 아니라 숫자로 결정하기 위해서. 지금 요금제는 PRO·MAX에서 커미션 20%를 주면 적자다.
 *
 * ★원가는 전부 실측이다(추정이 섞이면 결론이 흔들린다):
 *   · LLM 953원  — dev 로그의 실제 토큰 수(전략·구조·카피 A/B·이미지브리프)
 *   · 이미지 900원 — 8장, 전부 medium(QUALITY_TEST_OVERRIDE), 크기별 90/135원
 *   · 카피 재생성 89원, 이미지 재생성 113원 — 실측 출력 토큰 기준
 *
 * ★커미션·크레딧 수를 화면에서 바꿔가며 볼 수 있게 한다 — 한 벌만 계산해두면
 *   "그럼 30%면?"에 다시 사람이 계산해야 한다.
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
  freeRegens: 5,     // 카피+이미지 통합 무료 횟수
};

/* ── 현행 / 신규 요금제 ── */
interface Plan { id: string; name: string; price: number; credits: number; months: number }
const CURRENT: Plan[] = [
  { id: 'light', name: 'LIGHT', price: 9900, credits: 20, months: 1 },
  { id: 'standard', name: 'STANDARD', price: 29000, credits: 70, months: 2 },
  { id: 'pro', name: 'PRO', price: 59000, credits: 160, months: 3 },
  { id: 'max', name: 'MAX', price: 119000, credits: 350, months: 6 },
];
/* ★신규 — 가격은 그대로 두고 크레딧만 조정한다(정가를 올리면 이미 본 사람이 인상으로 받아들인다).
   할인 폭을 31%→22%로 좁혀 상위 플랜이 구조적으로 적자가 되는 것을 막는다.
   페이지 수가 딱 떨어지게 맞춰 셀러가 "몇 장 만들 수 있는지"를 바로 계산하게 했다. */
const PROPOSED: Plan[] = [
  { id: 'light', name: 'LIGHT', price: 9900, credits: 20, months: 1 },
  { id: 'standard', name: 'STANDARD', price: 29000, credits: 70, months: 2 },
  { id: 'pro', name: 'PRO', price: 59000, credits: 150, months: 3 },
  { id: 'max', name: 'MAX', price: 119000, credits: 310, months: 6 },
];

const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Flik 요금제 수익 모델</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css">
<style>
 *{box-sizing:border-box;margin:0;padding:0}
 body{font-family:'Pretendard','Apple SD Gothic Neo',sans-serif;background:#F4F4F8;color:#191F28;padding:32px 18px 80px;line-height:1.6}
 .w{max-width:1120px;margin:0 auto}
 h1{font-size:24px;margin-bottom:6px}
 .sub{color:#8B95A1;font-size:13.5px;margin-bottom:22px;line-height:1.8}
 .card{background:#fff;border-radius:16px;padding:22px 24px;margin-bottom:16px;box-shadow:0 2px 10px rgba(0,0,0,.05)}
 h2{font-size:16px;margin-bottom:4px}
 .h2sub{font-size:12.5px;color:#8B95A1;margin-bottom:16px;line-height:1.7}
 .ctrl{display:flex;flex-wrap:wrap;gap:22px;align-items:center;background:#FAFAFC;border:1px solid #ECECF2;border-radius:12px;padding:16px 18px;margin-bottom:18px}
 .ctrl label{font-size:13px;font-weight:700;color:#4E5968;display:flex;align-items:center;gap:9px}
 .ctrl input[type=range]{width:150px;accent-color:#6D4CFF}
 .val{display:inline-block;min-width:52px;font-weight:800;color:#6D4CFF;font-size:14px}
 table{width:100%;border-collapse:collapse;font-size:13px}
 th{background:#F4F4F8;padding:10px 8px;font-weight:800;color:#4E5968;font-size:11.5px;text-align:right;white-space:nowrap}
 th:first-child,td:first-child{text-align:left}
 td{padding:11px 8px;border-top:1px solid #F1F1F5;text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
 tr.rec td{background:#FBFAFF}
 .pn{font-weight:800;font-size:14px}
 .badge{display:inline-block;font-size:10px;font-weight:800;color:#6D4CFF;background:#F4F0FF;border-radius:99px;padding:2px 7px;margin-left:6px;vertical-align:middle}
 .pos{color:#0B8A4B;font-weight:700} .neg{color:#C92A2A;font-weight:800}
 .dim{color:#B0B8C1}
 .costgrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin-top:6px}
 .ci{background:#FAFAFC;border:1px solid #ECECF2;border-radius:11px;padding:13px 15px}
 .ci b{display:block;font-size:19px;color:#191F28;margin-bottom:2px}
 .ci span{font-size:11.5px;color:#8B95A1;line-height:1.5;display:block}
 .note{font-size:12.5px;color:#8B95A1;margin-top:14px;line-height:1.8;padding-top:14px;border-top:1px dashed #E5E5EC}
 .note b{color:#4E5968}
</style></head><body><div class="w">
<h1>Flik 요금제 수익 모델</h1>
<p class="sub">원가는 전부 실측입니다 — dev 서버 토큰 로그와 실제 이미지 크기 분포에서 뽑았습니다.<br>
아래 슬라이더로 <b>페이지당 크레딧</b>과 <b>인플루언서 커미션</b>을 바꾸면 표가 즉시 다시 계산됩니다.</p>

<div class="card">
  <h2>페이지 1개(8섹션) 원가</h2>
  <p class="h2sub">한 장 만드는 데 우리가 실제로 지출하는 돈입니다.</p>
  <div class="costgrid">
    <div class="ci"><b>953원</b><span>LLM — 전략·구조·카피 A/B·이미지브리프</span></div>
    <div class="ci"><b>900원</b><span>이미지 8장 — 전부 medium, 90~135원</span></div>
    <div class="ci"><b>1,853원</b><span>기본 합계</span></div>
    <div class="ci"><b>89 / 113원</b><span>재생성 1회 — 카피(3안) / 이미지</span></div>
  </div>
  <div class="note">
    <b>재생성 무료 5회는 카피·이미지 통합</b>입니다. 최악의 경우(5회 전부 이미지)에도
    565원만 추가되어 총 2,418원입니다. 카피 재생성이 이미지보다 싸서, 카피를 많이 쓰는 셀러일수록 우리에게 유리합니다.
  </div>
</div>

<div class="card">
  <div class="ctrl">
    <label>8섹션 페이지당 크레딧 <input type="range" id="cr" min="8" max="14" step="1" value="10"><span class="val" id="crv">10</span></label>
    <label>인플루언서 커미션 <input type="range" id="cm" min="0" max="40" step="5" value="20"><span class="val" id="cmv">20%</span></label>
    <label>커미션 기준
      <select id="cb" style="font-family:inherit;font-size:13px;font-weight:700;color:#4E5968;border:1px solid #E5E5EC;border-radius:8px;padding:6px 10px;background:#fff">
        <option value="rev">매출 기준 (일반적)</option>
        <option value="margin">순수익 기준</option>
      </select>
    </label>
    <label>무료 재생성 사용 <input type="range" id="rg" min="0" max="5" step="1" value="3"><span class="val" id="rgv">3회</span></label>
  </div>
  <h2>신규안 — 가격 유지, 크레딧 조정</h2>
  <p class="h2sub">정가를 올리면 이미 페이지를 본 사람에게 인상으로 읽힙니다. 대신 크레딧 수를 줄여
    할인 폭을 <b>31% → 22%</b>로 좁혔습니다. 상위 플랜이 구조적으로 적자가 되던 원인이 그 할인 폭이었습니다.</p>
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
const NEW = ${JSON.stringify(PROPOSED)};
const OLD = ${JSON.stringify(CURRENT)};
const won = n => Math.round(n).toLocaleString();
const cls = n => n < 0 ? 'neg' : 'pos';

function rows(plans, cr, cm, rg, cb) {
  // 재생성은 카피·이미지 절반씩 섞어 쓴다고 본다(카피 89 / 이미지 113)
  const regenUnit = (COST.copyRegen + COST.imageRegen) / 2;
  const cost = COST.llm + COST.image + regenUnit * rg;
  return plans.map(p => {
    const unit = p.price / p.credits;
    const pages = p.credits / cr;
    const rev = unit * cr;                 // 페이지 1장당 매출
    const margin = rev - cost;
    // ★커미션 기준 — 제휴 마케팅은 보통 '판매액(매출)' 기준으로 정산한다.
    //   순수익 기준은 상대가 우리 원가를 알아야 하고 원가 변동 시 정산액도 흔들려 실무에서 잘 안 쓴다.
    //   매출 기준이 더 보수적이므로 이쪽으로도 남으면 어느 방식이든 남는다.
    const commBase = cb === 'margin' ? Math.max(0, margin) : rev;
    const comm = commBase * cm / 100;
    const net = margin - comm;
    const base = plans[0].price / plans[0].credits;   // LIGHT 단가 기준 할인율
    return { p, unit, pages, rev, cost, margin, comm, net, disc: (1 - unit / base) * 100 };
  });
}

function render(id, plans, cr, cm, rg, cb) {
  const rs = rows(plans, cr, cm, rg, cb);
  document.getElementById(id).innerHTML = \`
    <tr><th>플랜</th><th>정가</th><th>크레딧</th><th>크레딧단가</th><th>할인</th><th>만들 수 있는 페이지</th>
    <th>페이지당 매출</th><th>원가</th><th>마진</th><th id="thComm">커미션</th><th>최종 수익</th><th>수익률</th></tr>\` +
    rs.map(r => \`<tr class="\${r.p.id === 'pro' ? 'rec' : ''}">
      <td class="pn">\${r.p.name}\${r.p.id === 'pro' ? '<span class="badge">인기</span>' : ''}</td>
      <td>\${won(r.p.price)}원</td>
      <td>\${r.p.credits}개</td>
      <td>\${won(r.unit)}원</td>
      <td class="dim">\${r.disc < 0.5 ? '—' : r.disc.toFixed(0) + '%'}</td>
      <td>\${r.pages.toFixed(r.pages % 1 ? 1 : 0)}장</td>
      <td>\${won(r.rev)}원</td>
      <td class="dim">\${won(r.cost)}원</td>
      <td class="\${cls(r.margin)}">\${won(r.margin)}원</td>
      <td class="dim">-\${won(r.comm)}원</td>
      <td class="\${cls(r.net)}">\${won(r.net)}원</td>
      <td class="\${cls(r.net)}">\${(r.net / r.rev * 100).toFixed(0)}%</td>
    </tr>\`).join('');
  return rs;
}

function update() {
  const cr = +document.getElementById('cr').value;
  const cm = +document.getElementById('cm').value;
  const rg = +document.getElementById('rg').value;
  document.getElementById('crv').textContent = cr;
  document.getElementById('cmv').textContent = cm + '%';
  document.getElementById('rgv').textContent = rg + '회';
  const cb = document.getElementById('cb').value;
  const rs = render('tNew', NEW, cr, cm, rg, cb);
  render('tOld', OLD, cr, cm, rg, cb);
  const worst = rs.reduce((a, b) => a.net < b.net ? a : b);
  document.getElementById('noteNew').innerHTML =
    worst.net >= 0
      ? \`<b>전 플랜 흑자입니다.</b> 가장 얇은 곳은 \${worst.p.name}으로 페이지당 <b>\${won(worst.net)}원</b>(\${(worst.net / worst.rev * 100).toFixed(0)}%) 남습니다.\`
      : \`<b>\${worst.p.name}이 페이지당 \${won(-worst.net)}원 적자입니다.</b> 크레딧을 올리거나 커미션을 낮춰야 합니다.\`;
  document.getElementById('noteNew').innerHTML +=
    \`<br>커미션은 <b>\${cb === 'margin' ? '순수익' : '매출'} 기준 \${cm}%</b>로 계산했습니다.\` +
    (cb === 'margin' ? ' 순수익 기준은 상대가 우리 원가를 알아야 해서 실무에서는 드뭅니다.' : '');
}
['cr', 'cm', 'rg', 'cb'].forEach(id => document.getElementById(id).addEventListener('input', update));
document.getElementById('cb').addEventListener('change', update);
update();
</script></body></html>`;

fs.mkdirSync(path.join(ROOT, 'runs'), { recursive: true });
const out = path.join('runs', 'pricing-model.html');
fs.writeFileSync(out, html);
console.log(`완료 → ${out}`);
