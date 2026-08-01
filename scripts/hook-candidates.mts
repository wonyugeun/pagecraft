/**
 * 훅·킬러라인 후보 생성 — "한 번에 하나만 쓰니 무난한 게 나온다"에 대한 실험(2026-08-01).
 *
 * ★설계 의도:
 *  지금 파이프라인은 히어로 훅도, 킬러 라인도 딱 한 번 생성해서 그걸 씁니다. 좋은 카피는
 *  원래 여러 개 써보고 고르는 건데, 한 번에 하나만 뽑으면 평균값이 나올 수밖에 없습니다.
 *  같은 재료로 각도를 달리해 N개를 한 번에 뽑으면 그중 하나는 평균을 넘습니다.
 *
 * ★한 번의 호출로 N개를 뽑는 이유: 따로 N번 호출하면 서로를 못 봐서 비슷한 게 나옵니다.
 *  한 화면에 놓고 쓰게 하면 모델이 스스로 겹치는 걸 피합니다(콜라주·킬러라인에서 확인된 원리).
 *
 * ★판단은 사람이 합니다 — 점수를 매겨 자동 선택하지 않고 후보를 전부 보여줍니다.
 *  후보 5개가 전부 밋밋하면 '재료가 부족하다'는 결론이고(→ 입력 항목 보강),
 *  그중 하나가 확 살아나면 '뽑기 횟수가 부족했다'는 결론입니다. 어느 쪽인지 눈으로 갈립니다.
 *
 * 실행: npx --yes tsx scripts/hook-candidates.mts [상품키앞자리]   예) ... 01
 * 출력: runs/hook-candidates.html
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
for (const l of fs.readFileSync(path.join(ROOT, '.env.local'), 'utf8').split('\n')) {
  const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) process.env[m[1]] ??= m[2].replace(/^["']|["']$/g, '');
}

const { callCopyModel, COPY_MODEL } = await import('../lib/stages/copy');
const { TEST_PRODUCTS } = await import('./test-products');

const keyPrefix = process.argv[2] ?? '01';
const p = TEST_PRODUCTS.find(x => x.key.startsWith(keyPrefix));
if (!p) { console.error(`상품을 찾을 수 없습니다: ${keyPrefix}`); process.exit(1); }

/* ★내부로는 넉넉히 뽑고, 밖으로는 추려서 보여준다.
 *   6개를 늘어놓으면 고르는 사람이 지친다("너무 많음" — 유근님). 그렇다고 처음부터 3개만
 *   요구하면 시도 횟수가 줄어 평균값이 나온다. 그래서 6개를 만들게 한 뒤 같은 호출 안에서
 *   가장 센 3개만 남기게 한다(각도가 겹치는 것부터 탈락). */
const GEN = 6;
const N = 3;
const MATERIALS = [p.productName, ...p.fields].join('\n');

const SYSTEM = `당신은 한국 이커머스 상세페이지 카피라이터입니다.
상품 상세페이지의 첫 화면(히어로)에서 스크롤을 멈추게 하는 훅, 그리고 페이지 중반에서
독자가 캡처해가고 싶어지는 한 문장을 씁니다.

⛔ 절대 규칙 — 아래 '재료'에 없는 사실을 만들면 실패입니다.
셀러가 말하지 않은 성분·공정·설계·수치·인증·경험을 지어내면, 이 카피를 쓴 셀러가
표시광고법 위반으로 처벌받습니다. 강한 카피보다 정확한 카피가 우선입니다.

✅ 대신 이런 것은 자유롭게 써도 됩니다(상품 사실이 아니므로):
 · 독자의 상황·감정·혼잣말
 · 일반적으로 알려진 상식·통념
 · 셀러가 밝힌 단점을 먼저 인정하기`;

const USER = `[상품 재료 — 이것이 당신이 아는 전부입니다]
${MATERIALS}

[요청 — 2단계로 진행하세요]
1단계: 아래 두 가지를 각각 ${GEN}개씩, 서로 최대한 다른 각도로 머릿속에서 써보세요.
2단계: 그중 ★가장 강한 ${N}개만 골라 출력하세요. 나머지는 버립니다.

고르는 기준(이 순서대로):
 · 읽는 순간 멈칫하게 하는가 — 무난하게 좋은 것보다 하나라도 튀는 것.
 · 이 상품이 아니면 못 쓰는 문장인가 — 아무 상품에나 갖다 붙일 수 있으면 탈락.
 · ${N}개의 각도가 서로 겹치지 않는가 — 비슷한 둘이 있으면 약한 쪽을 버리고 다른 각도로 교체.
출력에는 고른 ${N}개만 넣으세요(탈락한 후보는 쓰지 마세요).

1) 히어로 훅 (headline + body)
   · 상세페이지 첫 화면. 3초 안에 계속 볼지 나갈지 결정되는 자리입니다.
   · body는 공백 포함 60자 이내. 짧을수록 셉니다.
   · ★이 자리의 임무는 단 하나 — 끌어당기기. 독자가 "어, 뭐지" 하고 더 보게 만드는 것.
   · ⛔ 금지: "~부터 보여드릴게요/말씀드릴게요" 같은 예고, 카테고리+장점 나열,
     "이 사진처럼/저 체형도" 같이 특정 이미지를 전제하는 표현.
   · ⛔⛔ 히어로에서 단점·주의사항·리스크를 먼저 꺼내지 마세요(수축·오차·관리 어려움 등).
     단점을 장점의 증거로 뒤집는 건 좋은 기술이지만 그건 '이미 끌린 사람을 붙잡는' 중반의 무기입니다.
     첫 화면에서 망설일 이유를 주면 그 사람은 스크롤을 내리지 않습니다. 순서가 반대면 안 됩니다.
   · 각도는 서로 다르게 — 전부 '끌어당기는' 계열로:
     장면(그 옷을 입은 순간) / 욕망 결과(뭐가 좋아지는가) / 통념 반박 / 숫자 충돌 /
     속마음 인용 / 대비 / 해방(안 해도 되는 것).

2) 킬러 라인 (한 문장) — ★페이지 중반, 이미 스크롤을 내리고 있는 사람이 읽는 자리
   · 이 문장만 따로 캡처해도 상품이 설명되는 문장.
   · 정보 요약이 아니라, 읽는 순간 '어' 하고 멈추게 하는 문장.
   · 짧게. 수식어 없이. 한 문장으로.
   · ★여기서는 단점을 장점의 증거로 뒤집는 각도가 강하게 먹힙니다(히어로와 달리 이미 관심이 생긴 뒤라
     솔직함이 신뢰로 읽힙니다). 단, 그 각도만 반복하지 말고 각도를 다양하게 가져가세요.

[출력 형식] 다른 텍스트 없이 아래 JSON만:
{
  "hooks": [ { "angle": "각도 이름", "headline": "...", "body": "...", "why": "이걸 고른 이유 한 줄" } ],
  "killers": [ { "angle": "각도 이름", "line": "...", "why": "이걸 고른 이유 한 줄" } ]
}`;

console.log(`훅·킬러라인 후보 ${N}개씩 생성 — ${p.productName} (${COPY_MODEL})\n`);
const r = await callCopyModel(COPY_MODEL, SYSTEM, USER);
const jsonText = r.raw.replace(/^```(?:json)?\s*|\s*```$/g, '').trim();
let parsed: { hooks: { angle: string; headline: string; body: string; why?: string }[]; killers: { angle: string; line: string; why?: string }[] };
try {
  parsed = JSON.parse(jsonText.slice(jsonText.indexOf('{'), jsonText.lastIndexOf('}') + 1));
} catch {
  console.error('JSON 파싱 실패. 원문 앞부분:\n', r.raw.slice(0, 600));
  process.exit(1);
}

/* ── 재료에 없는 표현 표시 — 후보가 세 보이는 이유가 '날조'면 안 되므로 같이 검사 ── */
const SRC = MATERIALS;
const SUSPECT = /(설계|공정|특허|임상|테스트를 거|직접 입어|직접 써|자연광 컷|실내조명 컷|드롭숄더|밸런스)/g;
const flag = (t: string) => t.replace(SUSPECT, m => (SRC.includes(m) ? m : `<span class="fab">${m}</span>`));
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8">
<title>훅·킬러라인 후보 — ${esc(p.productName)}</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css">
<style>
 body{margin:0;background:#F4F4F8;font-family:'Pretendard','Apple SD Gothic Neo',sans-serif;color:#191F28;padding:36px 20px}
 .w{max-width:860px;margin:0 auto} h1{font-size:22px;margin:0 0 4px}
 .sub{color:#8B95A1;font-size:13.5px;margin:0 0 24px;line-height:1.75}
 h2{font-size:16px;margin:28px 0 12px}
 .c{background:#fff;border-radius:12px;padding:16px 18px;margin-bottom:10px;box-shadow:0 1px 4px rgba(0,0,0,.05)}
 .ang{display:inline-block;font-size:11px;font-weight:800;color:#6D4CFF;background:#F4F0FF;border-radius:99px;padding:3px 10px;margin-bottom:9px}
 .hl{font-size:18px;font-weight:800;line-height:1.5;margin-bottom:7px}
 .bd{font-size:14.5px;line-height:1.85;color:#34343c;white-space:pre-line}
 .kl{font-size:17px;font-weight:700;line-height:1.6;color:#191F28}
 .len{float:right;font-size:11.5px;color:#B0B8C1;font-weight:600}
 .why{margin-top:9px;font-size:12.5px;color:#8B95A1;line-height:1.6;border-top:1px dashed #ECECF2;padding-top:9px}
 .fab{background:#FFE3E3;color:#C92A2A;border-radius:3px;padding:0 3px;font-weight:700}
 details{background:#fff;border-radius:12px;margin-bottom:8px}
 summary{cursor:pointer;padding:13px 18px;font-size:13px;font-weight:700;color:#4E5968}
 .fields{padding:0 18px 16px;font-size:12.5px} .fields div{padding:4px 0;border-top:1px dashed #E5E5EC}
</style></head><body><div class="w">
<h1>훅·킬러라인 후보 — ${esc(p.productName)}</h1>
<p class="sub">같은 재료로 ${GEN}개씩 만든 뒤 가장 센 ${N}개만 추렸습니다. 점수를 매기지 않았습니다 — 직접 보고 고르세요.<br>
후보가 전부 밋밋하면 <b>재료가 부족한 것</b>이고, 하나가 확 살아나면 <b>뽑기 횟수가 부족했던 것</b>입니다.<br>
<span class="fab">빨간 표시</span>는 셀러 입력에 없는 표현입니다(있으면 안 됩니다).</p>
<details><summary>▸ 셀러가 입력한 재료 (${p.fields.length}개)</summary>
<div class="fields">${p.fields.map(f => `<div>${esc(f)}</div>`).join('')}</div></details>

<h2>히어로 훅 ${parsed.hooks.length}개</h2>
${parsed.hooks.map((h, i) => `<div class="c">
  <span class="ang">${i + 1}. ${esc(h.angle)}</span><span class="len">${h.body.length}자</span>
  <div class="hl">${flag(esc(h.headline))}</div>
  <div class="bd">${flag(esc(h.body))}</div>${h.why ? `<div class="why">${esc(h.why)}</div>` : ''}
</div>`).join('')}

<h2>킬러 라인 ${parsed.killers.length}개</h2>
${parsed.killers.map((k, i) => `<div class="c">
  <span class="ang">${i + 1}. ${esc(k.angle)}</span>
  <div class="kl">${flag(esc(k.line))}</div>${k.why ? `<div class="why">${esc(k.why)}</div>` : ''}
</div>`).join('')}
</div></body></html>`;

fs.mkdirSync(path.join(ROOT, 'runs'), { recursive: true });
const out = path.join('runs', 'hook-candidates.html');
fs.writeFileSync(out, html);

console.log('■ 히어로 훅');
parsed.hooks.forEach((h, i) => console.log(`  ${i + 1}. [${h.angle}] ${h.headline}\n     ${h.body.replace(/\n/g, ' / ')} (${h.body.length}자)`));
console.log('\n■ 킬러 라인');
parsed.killers.forEach((k, i) => console.log(`  ${i + 1}. [${k.angle}] ${k.line}`));
console.log(`\n완료 → ${out}`);
