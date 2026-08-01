/**
 * "다시 뽑기 → 3개 중 선택" 목업(2026-08-01).
 *
 * ★왜 목업인가: 말로 설명하면 감이 안 옵니다("어떤 느낌일지 감이 안 오네" — 유근님).
 *   실제 생성 없이 화면만 확인해서, 이상하면 코드를 건드리기 전에 버릴 수 있게 합니다.
 *
 * ★설계 근거 — 새 UI를 만들지 않고 '이미 있는 섹션별 재생성'의 동작만 바꾼다:
 *   지금 재생성은 누르면 바로 교체돼서 뭐가 나올지 모른 채 마음에 들 때까지 반복해야 한다.
 *   3개를 보여주고 고르게 하면 개념이 늘지 않으면서(버튼은 그대로) 선택권이 생긴다.
 *   전 섹션에 동일 적용이라 '히어로만 특별대우'라는 어색함도 없다.
 *
 * 데이터는 실제 생성 결과(runs/diversity-v3)를 쓴다 — 가짜 문장으로 만들면 느낌이 안 맞는다.
 * 후보 2·3안은 이 목업에서만 쓰는 예시 문장이다(실제로는 모델이 그 자리에서 생성).
 *
 * 실행: npx --yes tsx scripts/regen-mockup.mts
 * 출력: runs/regen-mockup.html
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const RAW = path.join(ROOT, 'runs', 'diversity-v3', '01-패션-니트가디건', 'raw.json');
if (!fs.existsSync(RAW)) { console.error('원본 결과가 없습니다:', RAW); process.exit(1); }

interface Sec { num: string; name: string; headline: string; subcopy?: string; body?: string; blocks?: unknown[] }
const raw = JSON.parse(fs.readFileSync(RAW, 'utf8')) as { visual?: { accent_color?: string; primary_color?: string; soft_color?: string }; sections: Sec[] };
const accent = raw.visual?.accent_color ?? '#6D4CFF';
const primary = raw.visual?.primary_color ?? '#6D4CFF';

/** 목업용 후보 — 히어로는 hook-candidates 실측 결과, 나머지는 각도만 바꾼 예시 */
const CANDIDATES: Record<string, { angle: string; headline: string; subcopy: string; body: string }[]> = {
  '1': [
    { angle: '통념 반박', headline: '니트는 붙어야 예쁘다는 착각',
      subcopy: '헐렁하게 걸쳤을 뿐인데 라인이 삽니다',
      body: '헐렁하게 걸쳤을 뿐인데, 라인이 산다.\n**FREE 사이즈** 하나로.' },
    { angle: '숫자 충돌', headline: '108cm인데 왜 날씬해 보일까',
      subcopy: '프리사이즈 오버핏의 착시',
      body: '가슴 **108cm**, 숫자만 보면 넉넉한데\n입으면 오히려 정리돼 보입니다.' },
    { angle: '해방', headline: '사이즈 고민, 이 옷엔 없다',
      subcopy: '프리 하나, 교환은 무료',
      body: '고를 사이즈가 하나뿐입니다.\n안 맞으면 **교환은 무료**고요.' },
  ],
};
/** 후보가 정의되지 않은 섹션은 원본 문장을 각도만 바꿔 흉내낸다(목업 표현용) */
function fallback(s: Sec) {
  return [
    { angle: '원본', headline: s.headline, subcopy: s.subcopy ?? '', body: s.body ?? '' },
    { angle: '다른 각도 A', headline: s.headline, subcopy: s.subcopy ?? '',
      body: (s.body ?? '').split('\n').slice(0, 3).join('\n') + '\n(이 자리에 두 번째 안이 생성됩니다)' },
    { angle: '다른 각도 B', headline: s.headline, subcopy: s.subcopy ?? '',
      body: (s.body ?? '').split('\n').slice(0, 2).join('\n') + '\n(이 자리에 세 번째 안이 생성됩니다)' },
  ];
}

const esc = (s: unknown) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const mark = (t: string) => esc(t)
  .replace(/\*\*([\s\S]+?)\*\*/g, '<b>$1</b>')
  .replace(/\(\(([\s\S]+?)\)\)/g, `<em style="font-style:normal;font-weight:700;color:${accent}">$1</em>`)
  .replace(/\n/g, '<br>');

const data = raw.sections.map(s => ({
  num: s.num, name: s.name,
  cands: (CANDIDATES[s.num] ?? fallback(s)).map(c => ({ ...c, html: mark(c.body), hl: mark(c.headline), sc: mark(c.subcopy) })),
  cur: { headline: mark(s.headline), subcopy: mark(s.subcopy ?? ''), body: mark(s.body ?? '') },
}));

const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>목업 — 다시 뽑기 3개 중 선택</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css">
<style>
 *{box-sizing:border-box;margin:0;padding:0}
 body{font-family:'Pretendard','Apple SD Gothic Neo',sans-serif;background:#F4F4F8;color:#191F28;padding:28px 16px 80px}
 .w{max-width:760px;margin:0 auto}
 .note{background:#fff;border-radius:14px;padding:18px 20px;margin-bottom:18px;font-size:13.5px;line-height:1.8;color:#4E5968}
 .note b{color:#191F28}
 .page{background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,.06)}
 .sec{padding:34px 32px;border-bottom:1px solid #F1F1F5;position:relative}
 .sec:last-child{border-bottom:none}
 .tag{display:inline-block;font-size:11.5px;font-weight:800;color:${primary};background:${raw.visual?.soft_color ?? '#F4F0FF'};border-radius:99px;padding:4px 11px;margin-bottom:12px}
 .hl{font-size:23px;font-weight:800;line-height:1.45;letter-spacing:-.4px;margin-bottom:8px}
 .sc{font-size:15px;font-weight:600;color:#5b5b66;margin-bottom:12px}
 .bd{font-size:15.5px;line-height:1.9;color:#34343c}
 .sec.center .hl,.sec.center .sc,.sec.center .bd,.sec.center{text-align:center}
 .regen{position:absolute;top:22px;right:24px;background:#fff;border:1px solid #E5E5EC;border-radius:9px;
   padding:7px 12px;font-size:12.5px;font-weight:700;color:#4E5968;cursor:pointer;font-family:inherit;display:flex;gap:5px;align-items:center}
 .regen:hover{border-color:${primary};color:${primary}}
 /* 후보 패널 */
 .panel{margin-top:20px;background:#FAFAFC;border:1px solid #ECECF2;border-radius:14px;padding:16px;display:none;text-align:left}
 .panel.on{display:block}
 .ptitle{font-size:12.5px;font-weight:800;color:#4E5968;margin-bottom:4px}
 .pdesc{font-size:12px;color:#8B95A1;margin-bottom:12px;line-height:1.6}
 .cand{background:#fff;border:2px solid #ECECF2;border-radius:11px;padding:14px 16px;margin-bottom:9px;cursor:pointer;transition:.12s}
 .cand:hover{border-color:#C9BDFF}
 .cand.sel{border-color:${primary};background:#FBFAFF}
 .cang{display:inline-block;font-size:10.5px;font-weight:800;color:${primary};background:#F4F0FF;border-radius:99px;padding:2px 9px;margin-bottom:7px}
 .chl{font-size:16px;font-weight:800;line-height:1.45;margin-bottom:4px}
 .csc{font-size:12.5px;color:#8B95A1;margin-bottom:6px;font-weight:600}
 .cbd{font-size:13.5px;line-height:1.8;color:#4E5968}
 .pact{display:flex;gap:8px;margin-top:12px}
 .btn{flex:1;border:none;border-radius:10px;padding:12px 0;font-size:13.5px;font-weight:700;cursor:pointer;font-family:inherit}
 .btn.p{background:${primary};color:#fff}
 .btn.g{background:#F1F1F5;color:#4E5968}
 .cost{font-size:11.5px;color:#B0B8C1;text-align:center;margin-top:9px}
</style></head><body><div class="w">
 <div class="note">
   <b>목업입니다 — 실제 생성은 일어나지 않습니다.</b><br>
   각 섹션 우측 상단 <b>다시 뽑기</b>를 눌러보세요. 지금은 누르면 바로 교체되는데,
   바꾸면 <b>3개가 뜨고 그중 하나를 고르는</b> 방식이 됩니다.<br>
   버튼은 그대로라 새로운 개념이 늘지 않고, <b>모든 섹션에 똑같이 적용</b>되므로
   히어로만 특별대우하는 어색함도 없습니다. (히어로 후보는 실제 생성 결과입니다)
 </div>
 <div class="page" id="page"></div>
</div>
<script>
const DATA = ${JSON.stringify(data)};
const page = document.getElementById('page');

function render() {
  page.innerHTML = DATA.map((s, i) => {
    const bodyLen = s.cur.body.replace(/<[^>]+>/g,'').length;
    return \`
    <div class="sec \${bodyLen <= 260 ? 'center' : ''}" data-i="\${i}">
      <button class="regen" onclick="toggle(\${i})">🔄 다시 뽑기</button>
      <span class="tag">\${s.name}</span>
      <div class="hl">\${s.cur.headline}</div>
      \${s.cur.subcopy ? '<div class="sc">' + s.cur.subcopy + '</div>' : ''}
      <div class="bd">\${s.cur.body}</div>
      <div class="panel" id="p\${i}">
        <div class="ptitle">다른 문장 3개를 뽑았어요</div>
        <div class="pdesc">마음에 드는 걸 고르세요. 지금 문장을 그대로 두려면 취소를 누르시면 됩니다.</div>
        \${s.cands.map((c, j) => \`
          <div class="cand" id="c\${i}_\${j}" onclick="pick(\${i},\${j})">
            <span class="cang">\${c.angle}</span>
            <div class="chl">\${c.hl}</div>
            \${c.sc ? '<div class="csc">' + c.sc + '</div>' : ''}
            <div class="cbd">\${c.html}</div>
          </div>\`).join('')}
        <div class="pact">
          <button class="btn g" onclick="toggle(\${i})">취소</button>
          <button class="btn p" onclick="apply(\${i})">이걸로 적용</button>
        </div>
        <div class="cost">이 섹션 다시 뽑기 · 크레딧 차감 없음</div>
      </div>
    </div>\`;
  }).join('');
}
let selected = {};
function toggle(i){ const p=document.getElementById('p'+i); p.classList.toggle('on'); }
function pick(i,j){
  selected[i]=j;
  DATA[i].cands.forEach((_,k)=>document.getElementById('c'+i+'_'+k).classList.toggle('sel',k===j));
}
function apply(i){
  const j = selected[i];
  if (j===undefined) { alert('먼저 후보를 하나 골라주세요.'); return; }
  const c = DATA[i].cands[j];
  DATA[i].cur = { headline: c.hl, subcopy: c.sc, body: c.html };
  selected = {}; render();
}
render();
</script></body></html>`;

fs.mkdirSync(path.join(ROOT, 'runs'), { recursive: true });
const out = path.join('runs', 'regen-mockup.html');
fs.writeFileSync(out, html);
console.log(`완료 → ${out}`);
