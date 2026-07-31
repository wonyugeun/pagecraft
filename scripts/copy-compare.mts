/**
 * 카피 A/B 비교 페이지 — 기존 vs salesMode(판매 디렉팅 강화)를 섹션별로 나란히 놓는다.
 *
 * ★수치만으로는 판단이 안 된다. "무난하다"는 감각의 문제라 문장을 나란히 봐야 결론이 난다.
 * ★입력에 없는 표현은 빨갛게 표시한다 — 판매력을 올리면 날조 압력도 같이 올라가므로,
 *   개선과 부작용을 같은 화면에서 봐야 한다.
 *
 * 실행: npx --yes tsx scripts/copy-compare.mts <before디렉터리> <after디렉터리>
 */
import fs from 'node:fs';
import path from 'node:path';

const [beforeDir, afterDir] = process.argv.slice(2);
if (!beforeDir || !afterDir) { console.error('사용법: copy-compare.mts <before> <after>'); process.exit(1); }

const esc = (s: unknown) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

interface Sec { num: string; name: string; headline: string; subcopy?: string; body?: string }
interface Raw { product: { productName: string; fields: string[] }; sections: Sec[] }

const A = JSON.parse(fs.readFileSync(path.join(beforeDir, 'raw.json'), 'utf8')) as Raw;
const B = JSON.parse(fs.readFileSync(path.join(afterDir, 'raw.json'), 'utf8')) as Raw;

/** 셀러 입력 원문 — 이 안에 없는 구체어가 카피에 나오면 날조 후보 */
const SRC = [A.product.productName, ...A.product.fields].join(' ');

/** 검사 대상: 상품 고유의 구체적 명사·주장. 일반 표현은 제외(모든 카피가 빨개지면 의미가 없다). */
const SUSPECTS = [
  '드롭숄더', '소매 여유량', '기장 밸런스', '자연광 컷', '실내조명 컷', '베이지',
  '설계했', '직접 입어', '직접 이렇게도', '공정', '특허', '테스트를 거쳐',
];

function markup(text: string): string {
  let html = esc(text).replace(/\n/g, '<br>');
  // 강조 마킹 렌더
  html = html
    .replace(/\*\*([\s\S]+?)\*\*/g, '<b class="bold">$1</b>')
    .replace(/\(\(([\s\S]+?)\)\)/g, '<em class="point">$1</em>');
  // 입력에 없는 표현 하이라이트
  for (const w of SUSPECTS) {
    if (SRC.includes(w)) continue;
    html = html.split(esc(w)).join(`<span class="fab" title="셀러 입력에 없는 표현">${esc(w)}</span>`);
  }
  return html;
}

const bodyLen = (s: Sec) => (s.body ?? '').length;
const rows = Math.max(A.sections.length, B.sections.length);

const cell = (s: Sec | undefined) => s ? `
    <div class="sec">
      <div class="nm">${esc(s.name)} <span class="len">${bodyLen(s)}자</span></div>
      <div class="h">${markup(s.headline)}</div>
      ${s.subcopy ? `<div class="s">${markup(s.subcopy)}</div>` : ''}
      <div class="b">${markup(s.body ?? '')}</div>
    </div>` : '<div class="sec empty">—</div>';

const stat = (d: Raw) => {
  const lens = d.sections.map(bodyLen);
  const pts = d.sections.filter(s => /\(\([\s\S]+?\)\)/.test(s.body ?? '')).length;
  return `히어로 ${lens[0]}자 · 평균 ${Math.round(lens.reduce((x, y) => x + y, 0) / lens.length)}자 · 편차 ${Math.max(...lens) - Math.min(...lens)} · 포인트컬러 ${pts}곳`;
};

const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8">
<title>카피 비교 — ${esc(A.product.productName)}</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css">
<style>
 body{margin:0;background:#F4F4F8;font-family:'Pretendard','Apple SD Gothic Neo',sans-serif;color:#191F28;padding:32px 20px}
 .w{max-width:1280px;margin:0 auto}
 h1{font-size:22px;margin:0 0 4px} .sub{color:#8B95A1;font-size:13.5px;margin:0 0 20px;line-height:1.7}
 .legend{background:#fff;border-radius:12px;padding:14px 18px;font-size:13px;margin-bottom:20px;line-height:1.9}
 .grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;align-items:start}
 .colhead{position:sticky;top:0;background:#F4F4F8;padding:8px 0 10px;z-index:2}
 .colhead b{font-size:15px} .colhead .m{display:block;font-size:12px;color:#8B95A1;margin-top:3px}
 .sec{background:#fff;border-radius:12px;padding:16px 18px;margin-bottom:12px;box-shadow:0 1px 4px rgba(0,0,0,.05)}
 .sec.empty{color:#ccc;text-align:center;padding:40px}
 .nm{font-size:11.5px;font-weight:800;color:#6D4CFF;background:#F4F0FF;display:inline-block;border-radius:99px;padding:3px 10px;margin-bottom:10px}
 .len{color:#8B95A1;font-weight:600}
 .h{font-size:17px;font-weight:800;line-height:1.5;margin-bottom:6px}
 .s{font-size:13.5px;color:#5b5b66;margin-bottom:10px;font-weight:600}
 .b{font-size:14px;line-height:1.85;color:#34343c}
 .bold{color:#111;font-weight:800}
 .point{font-style:normal;font-weight:700;color:#6D4CFF}
 .fab{background:#FFE3E3;color:#C92A2A;border-radius:3px;padding:0 3px;font-weight:700}
 details{background:#fff;border-radius:12px;padding:0;margin-bottom:20px}
 summary{cursor:pointer;padding:14px 18px;font-size:13.5px;font-weight:700;color:#4E5968}
 .fields{padding:0 18px 18px;font-size:13px} .fields div{padding:5px 0;border-top:1px dashed #E5E5EC}
</style></head><body><div class="w">
 <h1>카피 비교 — ${esc(A.product.productName)}</h1>
 <p class="sub">왼쪽은 기존, 오른쪽은 판매 디렉팅 강화(히어로 분리 · 킬러 라인 1곳 · 분량 차등).</p>
 <div class="legend">
   <b class="bold">굵은 글씨</b> = **볼드** 마킹 &nbsp;·&nbsp;
   <em class="point">보라 글씨</em> = ((포인트 컬러)) 마킹 &nbsp;·&nbsp;
   <span class="fab">빨간 배경</span> = 셀러가 입력하지 않은 표현(날조 후보)
 </div>
 <details>
   <summary>▸ 셀러가 입력한 상품정보 (${A.product.fields.length}개)</summary>
   <div class="fields"><div><b>상품명</b> — ${esc(A.product.productName)}</div>${
     A.product.fields.map(f => `<div>${esc(f)}</div>`).join('')}</div>
 </details>
 <div class="grid">
  <div><div class="colhead"><b>BEFORE — 기존</b><span class="m">${stat(A)}</span></div>
   ${Array.from({ length: rows }, (_, i) => cell(A.sections[i])).join('')}</div>
  <div><div class="colhead"><b>AFTER — 판매 디렉팅 강화</b><span class="m">${stat(B)}</span></div>
   ${Array.from({ length: rows }, (_, i) => cell(B.sections[i])).join('')}</div>
 </div>
</div></body></html>`;

const out = path.join('runs', 'copy-compare.html');
fs.writeFileSync(out, html);
console.log(`완료 → ${out}`);
