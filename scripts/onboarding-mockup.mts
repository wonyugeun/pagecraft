/**
 * 시작 화면 통합 목업(2026-08-02) — 9단계를 6단계로 줄이는 두 가지 방향.
 *
 * ★문제: 앞 네 화면(카테고리·채널·타입·출력형태)이 전부 '고르기'만 한다.
 *   셀러 입장에선 "아직 아무것도 안 했는데 벌써 네 번 눌렀네"가 된다.
 *   후커블이 빨라 보이는 건 화면 수가 적어서가 아니라 바로 타이핑을 시작하기 때문이다.
 *
 * ★단 후커블처럼 자유 입력 한 칸으로 가지는 않는다 — 구조화된 폼이 Flik의 차별점이다.
 *   (무엇이 셀러가 말한 사실인지 구분할 근거가 있어야 날조를 막을 수 있고,
 *    화장품법 고지·알레르기 같은 법적 필수 항목도 폼이라야 누락을 감지한다.)
 *   그래서 '고르기 네 화면'만 합치고 상품정보 폼은 그대로 둔다.
 *
 * A안 — 상품명 먼저: 첫 화면에서 상품명을 타이핑하게 하고, 그 아래에서 카테고리를 고른다.
 * B안 — 한 판에 전부: 카테고리·채널을 한 화면에 놓고 타입·출력형태는 추천값으로 접어둔다.
 *
 * 실행: npx --yes tsx scripts/onboarding-mockup.mts
 * 출력: runs/onboarding-mockup.html
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();

const CATS = [
  { id: '화장품', desc: '스킨케어·색조·선케어', ico: '✨', bg: '#F4F0FF', fg: '#6D4CFF' },
  { id: '식품', desc: '신선·가공식품·간편식', ico: '🍱', bg: '#FFF0F5', fg: '#FF4D8D' },
  { id: '패션', desc: '의류·신발·가방', ico: '👕', bg: '#E6F1FB', fg: '#378ADD' },
  { id: '생활', desc: '가구·소품·청소', ico: '🛋️', bg: '#FFF4DD', fg: '#F59E0B' },
  { id: '가전', desc: '전자기기·주변기기', ico: '📱', bg: '#E0F7F1', fg: '#1D9E75' },
  { id: '반려동물', desc: '사료·간식·용품', ico: '🐶', bg: '#FFFBEA', fg: '#EAB308' },
  { id: '스포츠', desc: '운동용품·아웃도어', ico: '🏐', bg: '#EAF3DE', fg: '#639922' },
  { id: '유아', desc: '유아동·출산용품', ico: '🧸', bg: '#FFF1F2', fg: '#F43F5E' },
  { id: '건강', desc: '건기식·의료기기', ico: '💊', bg: '#EEF2FF', fg: '#4F46E5' },
  { id: '자동차', desc: '차량용품·부품', ico: '🚗', bg: '#F1F5F9', fg: '#475569' },
  { id: '기타', desc: '그 외 모든 상품', ico: '📦', bg: '#F4F4F8', fg: '#64748B' },
];
/* ★채널별 추천과 '이유' — 셀러가 형태를 이해 못 해 대충 고르는 문제(유근님 지적)의 대응.
 *  용어만 던지지 않고 왜 그 형태인지, 무엇이 유리해지는지를 함께 보여준다. */
const CHANNELS = [
  {
    id: '스마트스토어', desc: '네이버 · 검색 유입이 많아요', rec: true,
    form: '블로그형', tag: 'SEO 검색노출 최적화',
    why: '네이버는 <b>이미지 속 글자를 읽지 못합니다.</b> 카피가 본문 텍스트로 있어야 검색에 걸려요.',
    gain: ['상품명·키워드가 본문에 노출', '네이버 쇼핑검색 유리', '글이 길어도 이탈이 적음'],
    ex: 'blog',
  },
  {
    id: '쿠팡', desc: '빠른 정보 전달이 중요해요',
    form: '슬라이드형', tag: '모바일 가독성 우선',
    why: '쿠팡은 <b>모바일에서 빠르게 훑는</b> 구매가 대부분입니다. 이미지에 핵심만 박아 한눈에 읽히게 해요.',
    gain: ['스크롤 몇 번에 핵심 전달', '작은 화면에서도 글자가 큼', '검색보다 비교·전환에 강함'],
    ex: 'slide',
  },
  {
    id: '자사몰', desc: '브랜드 톤을 살릴 수 있어요',
    form: '슬라이드형', tag: '브랜드 무드 강조',
    why: '자사몰은 <b>이미 브랜드를 보고 온 손님</b>이 많습니다. 검색보다 분위기와 완성도가 중요해요.',
    gain: ['디자인 톤을 일관되게', '브랜드 감성 전달에 유리', '이미지 중심 구성'],
    ex: 'slide',
  },
  {
    id: '와디즈', desc: '스토리로 설득하는 곳이에요',
    form: '블로그형', tag: '스토리텔링 설득',
    why: '와디즈는 <b>아직 없는 물건을 설득</b>하는 곳입니다. 왜 만들었는지 긴 호흡의 글이 필요해요.',
    gain: ['만든 이유·과정을 길게 서술', '신뢰 근거를 차곡차곡', '서포터 설득에 유리'],
    ex: 'blog',
  },
];

const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>시작 화면 통합 목업</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css">
<style>
 *{box-sizing:border-box;margin:0;padding:0}
 body{font-family:'Pretendard','Apple SD Gothic Neo',sans-serif;background:#F4F4F8;color:#191F28;padding:30px 18px 90px;line-height:1.6}
 .w{max-width:1180px;margin:0 auto}
 h1{font-size:23px;margin-bottom:5px}
 .lead{color:#8B95A1;font-size:13.5px;margin-bottom:22px;line-height:1.8}
 .cmp{display:grid;grid-template-columns:1fr 1fr;gap:18px;align-items:start}
 @media(max-width:1000px){.cmp{grid-template-columns:1fr}}
 .pane{background:#fff;border-radius:18px;overflow:hidden;box-shadow:0 2px 14px rgba(17,17,26,.06)}
 .ptop{padding:16px 22px;border-bottom:1px solid #F1F1F5;background:#FAFAFC}
 .ptop b{font-size:15px} .ptop span{display:block;font-size:12.5px;color:#8B95A1;margin-top:3px;line-height:1.65}
 .body{padding:26px 24px 30px}

 /* 단계 표시 */
 .steps{display:flex;align-items:center;gap:7px;justify-content:center;margin-bottom:26px;flex-wrap:wrap}
 .st{display:flex;align-items:center;gap:6px;font-size:12px;color:#B0B8C1}
 .st b{width:21px;height:21px;border-radius:999px;background:#EDF0F3;color:#8B95A1;display:grid;place-items:center;font-size:11px;font-weight:800}
 .st.on b{background:#6D4CFF;color:#fff} .st.on{color:#191F28;font-weight:700}
 .st i{width:14px;height:1px;background:#E5E8EB;display:block;font-style:normal}
 .old .st b{background:#EDF0F3}

 h2.q{font-size:22px;font-weight:800;letter-spacing:-.5px;margin-bottom:6px;text-align:center}
 h2.q em{font-style:normal;color:#6D4CFF}
 .qsub{font-size:13.5px;color:#8B95A1;text-align:center;margin-bottom:24px}

 .namebox{border:2px solid #6D4CFF;border-radius:14px;padding:15px 17px;display:flex;align-items:center;gap:11px;margin-bottom:9px;background:#FBFAFF}
 .namebox input{border:none;outline:none;font-size:16px;font-family:inherit;flex:1;background:transparent;color:#191F28}
 .namebox input::placeholder{color:#B0B8C1}
 .namehint{font-size:12px;color:#8B95A1;margin-bottom:24px;padding-left:3px}

 .lbl{font-size:12.5px;font-weight:800;color:#4E5968;margin-bottom:10px;display:flex;align-items:center;gap:6px}
 .lbl span{font-size:11px;font-weight:600;color:#B0B8C1}
 .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(102px,1fr));gap:8px;margin-bottom:22px}
 .cat{border:1.5px solid #ECECF2;border-radius:13px;padding:12px 9px;text-align:center;cursor:pointer;background:#fff;transition:.12s}
 .cat:hover{border-color:#C9BDFF}
 .cat.on{border-color:#6D4CFF;border-width:2px;background:#FBFAFF}
 .cat .ic{width:32px;height:32px;border-radius:10px;display:grid;place-items:center;margin:0 auto 7px;font-size:16px}
 .cat b{display:block;font-size:12.5px;font-weight:700}
 .cat span{display:block;font-size:10.5px;color:#8B95A1;margin-top:2px;line-height:1.4}

 .chs{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:20px}
 .ch{border:1.5px solid #ECECF2;border-radius:12px;padding:13px 14px;cursor:pointer;background:#fff;position:relative}
 .ch.on{border-color:#6D4CFF;border-width:2px;background:#FBFAFF}
 .ch b{font-size:13.5px} .ch span{display:block;font-size:11.5px;color:#8B95A1;margin-top:2px}
 .rec{position:absolute;top:10px;right:11px;font-size:10px;font-weight:800;color:#6D4CFF;background:#F0ECFF;border-radius:999px;padding:2px 7px}

 details.adv{border:1px solid #ECECF2;border-radius:12px;margin-bottom:22px;background:#FAFAFC}
 details.adv summary{cursor:pointer;padding:13px 16px;font-size:13px;font-weight:700;color:#4E5968;display:flex;justify-content:space-between;align-items:center}
 details.adv summary::-webkit-details-marker{display:none}
 details.adv summary .cur{font-weight:600;color:#6D4CFF;font-size:12.5px}
 .advbody{padding:2px 16px 16px}
 .row{display:flex;gap:8px;margin-bottom:10px}
 .opt{flex:1;border:1.5px solid #ECECF2;border-radius:10px;padding:10px 12px;font-size:12.5px;cursor:pointer;background:#fff}
 .opt.on{border-color:#6D4CFF;background:#FBFAFF;font-weight:700}
 .opt small{display:block;color:#8B95A1;font-size:11px;font-weight:500;margin-top:2px}

 .plan{border:1.5px solid #E6DEFF;background:#FBFAFF;border-radius:14px;padding:15px 17px;margin-bottom:10px}
 .planhead{display:flex;align-items:center;justify-content:space-between;margin-bottom:7px}
 .planhead b{font-size:13.5px;color:#5B3FD6}
 .chg{border:1px solid #D9CDFF;background:#fff;color:#6D4CFF;border-radius:8px;padding:5px 11px;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit}
 .planline{font-size:14px;line-height:1.75;color:#191F28}
 .planline b{font-weight:800}
 .cr{display:inline-block;font-size:11.5px;font-weight:800;color:#6D4CFF;background:#F0ECFF;border-radius:999px;padding:2px 8px;margin-left:2px}
 .row2{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-bottom:18px}
 .pick{border:1.5px solid #ECECF2;border-radius:13px;padding:13px;background:#fff;cursor:pointer}
 .pick.on{border-color:#6D4CFF;border-width:2px;background:#FBFAFF}
 .pick b{display:block;font-size:13px;margin-bottom:3px}
 .pick small{display:block;font-size:11.5px;color:#8B95A1;line-height:1.6}
 .thumb{height:64px;border-radius:9px;background:#F4F4F8;padding:7px;margin-bottom:9px;overflow:hidden}
 .thumb .tl{height:4px;background:#D7DBE0;border-radius:2px;margin-bottom:4px}
 .thumb .tl.s{width:60%}
 .thumb .timg{height:20px;background:#C9BDFF;border-radius:4px;margin:5px 0}
 .thumb.slide{display:flex;gap:4px}
 .thumb.slide .sc{flex:1;background:#C9BDFF;border-radius:4px;display:grid;place-items:center}
 .thumb.slide .sc span{font-size:8px;color:#fff;font-weight:800}
 .bars{display:flex;align-items:flex-end;gap:3px;height:26px;margin-bottom:9px}
 .bars i{flex:1;background:#C9BDFF;border-radius:2px}
 .more{text-align:center;font-size:12.5px;color:#6D4CFF;font-weight:700;padding:9px;border:1px dashed #D9CDFF;border-radius:10px;margin-bottom:22px;cursor:pointer}
 .after{margin-top:26px;padding-top:20px;border-top:1px dashed #E5E5EC}
 .afterlbl{font-size:11.5px;font-weight:800;color:#B0B8C1;margin-bottom:9px}
 .cta{width:100%;border:none;border-radius:13px;padding:16px 0;background:#6D4CFF;color:#fff;font-size:15px;font-weight:700;cursor:pointer;font-family:inherit}
 .cta.ghost{background:#F1F1F5;color:#8B95A1;cursor:default}
 .note{font-size:12px;color:#8B95A1;text-align:center;margin-top:11px;line-height:1.7}

 .plan .tag{font-size:11px;font-weight:800;color:#6D4CFF;background:#F0ECFF;border-radius:999px;padding:3px 9px}
 .why{font-size:13px;line-height:1.8;color:#34343c;margin-bottom:10px}
 .why b{font-weight:800}
 ul.gain{list-style:none;margin-bottom:13px}
 ul.gain li{font-size:12.5px;color:#4E5968;padding:3px 0 3px 18px;position:relative}
 ul.gain li:before{content:'✓';position:absolute;left:2px;color:#6D4CFF;font-weight:800}
 .planfoot{display:flex;gap:8px}
 .exbtn{flex:1;border:1px solid #6D4CFF;background:#6D4CFF;color:#fff;border-radius:9px;padding:9px 0;font-size:12.5px;font-weight:700;cursor:pointer;font-family:inherit}
 .exwrap{display:none;margin-top:14px;padding-top:14px;border-top:1px dashed #D9CDFF}
 .exwrap.on{display:block}
 .exlbl{font-size:12px;font-weight:800;color:#5B3FD6;margin-bottom:9px}
 .exrow{display:grid;grid-template-columns:1fr 1fr;gap:8px}
 .exrow img{width:100%;border-radius:9px;display:block;border:1px solid #E6DEFF}
 .exnote{font-size:11px;color:#B0B8C1;text-align:center;margin-top:8px}
 /* ★분량 미리보기 — 막대 그래프는 '몇 개'만 말하고 '어떤 페이지가 나오는지'는 못 말한다.
    종이 실루엣에 섹션을 실제로 쌓고, 넘치는 만큼 아래가 흐려지며 이어지게 해 길이를 체감시킨다. */
 .sheet{height:76px;background:#fff;border:1px solid #E9E9F0;border-radius:7px;padding:6px 7px;
        overflow:hidden;margin-bottom:10px;position:relative;
        -webkit-mask-image:linear-gradient(#000 62%,transparent 100%);mask-image:linear-gradient(#000 62%,transparent 100%)}
 .pick.on .sheet{border-color:#D9CDFF}
 .doc{display:flex;flex-direction:column;gap:3px}
 .doc .im{background:#DCD4F7;border-radius:3px}
 .doc .tx{background:#E9E9F0;border-radius:2px;height:3px}
 .doc .tx.s{width:62%}
 .pick.on .doc .im{background:#C4B5FD}
 .row3{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:10px}
 .row3 .pick{position:relative;padding:12px 10px;text-align:center}
 .row3 .pick b{font-size:13.5px}
 .row3 .bars{justify-content:center;height:22px}
 .rec2{position:absolute;top:-8px;left:50%;transform:translateX(-50%);font-size:10px;font-weight:800;color:#fff;background:#6D4CFF;border-radius:999px;padding:2px 9px;white-space:nowrap}
 .depthhint{font-size:11.5px;color:#8B95A1;line-height:1.7;margin-bottom:18px}
 .verdict{background:#fff;border-radius:14px;padding:18px 22px;margin-top:20px;font-size:13px;line-height:1.9;box-shadow:0 2px 10px rgba(0,0,0,.05)}
 .verdict b{color:#191F28}
 .verdict .t{font-size:15px;font-weight:800;margin-bottom:8px;display:block}
</style></head><body><div class="w">
<h1>시작 화면 통합 — A안 vs C안</h1>
<p class="lead">앞 네 화면(카테고리·채널·타입·출력형태)을 하나로 합쳐 <b>9단계 → 6단계</b>로 줄이는 안입니다.<br>
상품정보 폼은 그대로 둡니다 — 구조화된 입력이 날조를 막는 근거라 없앨 수 없습니다.</p>

<div class="cmp">

  <!-- ───────── A안 ───────── -->
  <div class="pane">
    <div class="ptop"><b>A안 · 상품명부터</b>
      <span>고르기 전에 <b>자기 일부터 시작</b>하게 합니다. 후커블이 빨라 보이는 이유가 이것 —
      화면 수가 아니라 바로 타이핑한다는 점입니다.</span></div>
    <div class="body">
      <div class="steps">
        <div class="st on"><b>1</b>시작</div><i></i>
        <div class="st"><b>2</b>상품정보</div><i></i>
        <div class="st"><b>3</b>섹션구조</div><i></i>
        <div class="st"><b>4</b>이미지</div><i></i>
        <div class="st"><b>5</b>생성</div><i></i>
        <div class="st"><b>6</b>결과물</div>
      </div>

      <h2 class="q">어떤 상품의 <em>상세페이지</em>를 만드시나요?</h2>
      <p class="qsub">상품명만 적으면 나머지는 저희가 추천해드려요</p>

      <div class="namebox">
        <span style="font-size:17px">🛍️</span>
        <input value="LEAFGREEN 시카 토너 250ml" readonly>
      </div>
      <div class="namehint">예) 제주 접짝뼈국 밀키트 800g · 오버핏 울 니트 가디건</div>

      <div class="lbl">카테고리 <span>상품명을 보고 추천했어요 — 다르면 바꿔주세요</span></div>
      <div class="grid">
        ${CATS.slice(0, 6).map(c => `<div class="cat${c.id === '화장품' ? ' on' : ''}">
          <div class="ic" style="background:${c.bg};color:${c.fg}">${c.ico}</div>
          <b>${c.id}</b><span>${c.desc}</span></div>`).join('')}
      </div>

      <div class="lbl">어디에 올리시나요? <span>채널에 맞는 형태를 추천해드려요</span></div>
      <div class="chs">
        ${CHANNELS.map((c, i) => `<div class="ch${i === 0 ? ' on' : ''}" onclick="pickCh(${i})" id="ch${i}">
          ${c.rec ? '<span class="rec">가장 많이 써요</span>' : ''}
          <b>${c.id}</b><span>${c.desc}</span></div>`).join('')}
      </div>

      <!-- ★채널을 고르면 이유와 함께 형태가 정해진다 -->
      <div class="plan">
        <div class="planhead">
          <b id="planTitle"></b>
          <span class="tag" id="planTag"></span>
        </div>
        <p class="why" id="planWhy"></p>
        <ul class="gain" id="planGain"></ul>
        <div class="planfoot">
          <button class="exbtn" onclick="toggleEx()">예시 보기</button>
          <button class="chg" onclick="document.getElementById('adv').open=!document.getElementById('adv').open">다른 형태로 바꾸기</button>
        </div>
        <div class="exwrap" id="exwrap">
          <div class="exlbl" id="exlbl"></div>
          <div class="exrow" id="exrow"></div>
          <p class="exnote">실제로 Flik이 만든 결과입니다</p>
        </div>
      </div>

      <details class="adv" id="adv">
        <summary>직접 고르기 <span class="cur">▾</span></summary>
        <div class="advbody">
          <div class="lbl">어떤 형태로 보여줄까요</div>
          <div class="row2">
            <div class="pick on">
              <b>블로그형</b>
              <small>글로 설명하고 사진을 곁들여요.<br>네이버 검색에 걸립니다.</small>
            </div>
            <div class="pick">
              <b>슬라이드형</b>
              <small>이미지에 글자를 넣어 만들어요.<br>모바일에서 눈에 잘 들어옵니다.</small>
            </div>
          </div>
          <div class="lbl">얼마나 길게 만들까요 <span id="depthNote">블로그형 기준</span></div>
          <div class="row3">
            <div class="pick" onclick="pickDepth(0)" id="dp0">
              <div class="sheet"><div class="doc" data-n="8"></div></div>
              <b>8섹션</b>
              <small>간단하게<br><span class="cr" id="cr0">10크레딧</span></small>
            </div>
            <div class="pick on" onclick="pickDepth(1)" id="dp1">
              <span class="rec2">추천</span>
              <div class="sheet"><div class="doc" data-n="16"></div></div>
              <b>16섹션</b>
              <small>대부분의 상품에<br><span class="cr" id="cr1">20크레딧</span></small>
            </div>
            <div class="pick" onclick="pickDepth(2)" id="dp2">
              <div class="sheet"><div class="doc" data-n="32"></div></div>
              <b>32섹션</b>
              <small>설명할 게 많을 때<br><span class="cr" id="cr2">40크레딧</span></small>
            </div>
          </div>
          <p class="depthhint" id="depthHint">상품이 단순하거나 빠르게 올려야 할 땐 8섹션으로 시작해도 충분해요.</p>
        </div>
      </details>

      <button class="cta">상품정보 입력하러 가기 →</button>
      <p class="note">지금 화면에서 <b>4단계가 1단계로</b> 합쳐졌습니다</p>
    </div>
  </div>

  <!-- ───────── C안 ───────── -->
  <div class="pane">
    <div class="ptop"><b>C안 · 두 가지만 묻기</b>
      <span>상품명과 카테고리만 받고 <b>나머지는 전부 알아서</b> 정합니다.
      채널·형태·분량은 결과를 본 뒤에 바꿀 수 있게 미룹니다.</span></div>
    <div class="body">
      <div class="steps">
        <div class="st on"><b>1</b>시작</div><i></i>
        <div class="st"><b>2</b>상품정보</div><i></i>
        <div class="st"><b>3</b>섹션구조</div><i></i>
        <div class="st"><b>4</b>이미지</div><i></i>
        <div class="st"><b>5</b>생성</div><i></i>
        <div class="st"><b>6</b>결과물</div>
      </div>

      <h2 class="q">어떤 상품의 <em>상세페이지</em>를 만드시나요?</h2>
      <p class="qsub">상품명만 적으면 시작할 수 있어요</p>

      <div class="namebox">
        <span style="font-size:17px">🛍️</span>
        <input value="LEAFGREEN 시카 토너 250ml" readonly>
      </div>
      <div class="namehint">예) 제주 접짝뼈국 밀키트 800g · 오버핏 울 니트 가디건</div>

      <div class="lbl">카테고리 <span>상품명을 보고 골라뒀어요</span></div>
      <div class="grid">
        ${CATS.slice(0, 6).map(c => `<div class="cat${c.id === '화장품' ? ' on' : ''}">
          <div class="ic" style="background:${c.bg};color:${c.fg}">${c.ico}</div>
          <b>${c.id}</b></div>`).join('')}
      </div>
      <div class="more">＋ 다른 카테고리 보기</div>

      <button class="cta">시작하기 →</button>
      <p class="note">판매 채널·형태·분량은 <b>결과 화면에서</b> 언제든 바꿀 수 있어요</p>

      <div class="after">
        <div class="afterlbl">결과 화면에서는 이렇게 보입니다</div>
        <div class="plan" style="margin:0">
          <div class="planhead">
            <b>스마트스토어 · 글 중심 · 16섹션</b>
            <button class="chg">바꾸기</button>
          </div>
          <p class="planline" style="font-size:12.5px;color:#8B95A1">
            다른 채널이나 형태로 다시 만들고 싶으면 여기서 바꾸면 돼요
          </p>
        </div>
      </div>
    </div>
  </div>
</div>

<div class="verdict">
  <span class="t">A안 vs C안</span>
  <b>A안</b>은 첫 화면에서 정할 것을 다 정합니다. 셀러가 통제권을 갖지만
  <b>결정할 게 많아 무겁습니다</b> — 상품명 + 카테고리 11개 + 채널 4개 + 형태/분량.
  네 화면을 한 화면에 모았을 뿐, 마주하는 결정의 양은 그대로입니다.<br><br>
  <b>C안</b>은 <b>두 가지만 묻습니다.</b> 채널·형태·분량은 카테고리 기준으로 추천값을 잡아두고,
  결과를 본 뒤에 바꾸게 미룹니다. 셀러 입장에서 "일단 만들어보자"의 문턱이 가장 낮습니다.<br><br>
  <b>C안의 위험</b> — 채널을 모르고 만들면 첫 결과가 안 맞을 수 있습니다. 다만 카테고리별로
  가장 많이 쓰는 채널이 정해져 있고(화장품·식품 → 스마트스토어), 바꾸면 카피만 다시 뽑으면 되므로
  손해가 크지 않습니다. <b>무엇보다 결과를 한 번 본 뒤에는 "무엇을 바꿔야 하는지" 판단이 쉬워집니다</b> —
  아무것도 안 본 상태에서 채널을 고르라는 것보다 훨씬 나은 질문 순서입니다.
</div></div>
</div>
<script>
const CH = ${JSON.stringify(CHANNELS)};
const EX = {
  blog:  { lbl: '블로그형 — 사진 아래 글로 설명합니다', imgs: ['mockup-assets/blog1.jpg', 'mockup-assets/blog2.jpg'] },
  slide: { lbl: '슬라이드형 — 이미지에 글자가 박혀 나옵니다', imgs: ['mockup-assets/slide1.jpg', 'mockup-assets/slide2.jpg'] },
};
function pickCh(i) {
  CH.forEach((_, k) => document.getElementById('ch' + k).classList.toggle('on', k === i));
  const c = CH[i];
  document.getElementById('planTitle').textContent = c.id + '엔 ' + c.form + '을 추천해요';
  document.getElementById('planTag').textContent = c.tag;
  document.getElementById('planWhy').innerHTML = c.why;
  document.getElementById('planGain').innerHTML = c.gain.map(g => '<li>' + g + '</li>').join('');
  curForm = c.form; refreshCredits();
  const e = EX[c.ex];
  document.getElementById('exlbl').textContent = e.lbl;
  document.getElementById('exrow').innerHTML = e.imgs.map(s => '<img src="' + s + '">').join('');
}
/* 크레딧 — 블로그형은 섹션당 1.25(올림), 슬라이드형은 1.0 */
const SECTIONS = [8, 16, 32];
const HINTS = [
  '상품이 단순하거나 빠르게 올려야 할 땐 8섹션으로 시작해도 충분해요.',
  '고민되면 이걸 고르세요. 대부분의 상품이 이 분량에서 가장 잘 나옵니다.',
  '성분·스펙·후기처럼 보여줄 게 많은 상품에 어울려요. 만드는 시간도 두 배입니다.',
];
let curForm = '블로그형', curDepth = 1;
function credits(n) { return curForm === '블로그형' ? Math.ceil(n * 1.25) : n; }
function refreshCredits() {
  SECTIONS.forEach((n, i) => { document.getElementById('cr' + i).textContent = credits(n) + '크레딧'; });
  document.getElementById('depthNote').textContent = curForm + ' 기준';
}
function pickDepth(i) {
  curDepth = i;
  [0, 1, 2].forEach(k => document.getElementById('dp' + k).classList.toggle('on', k === i));
  document.getElementById('depthHint').textContent = HINTS[i];
}
function toggleEx() { document.getElementById('exwrap').classList.toggle('on'); }
/* 섹션 수만큼 실제로 쌓는다 — 이미지 한 장 + 글 두 줄이 한 섹션 */
document.querySelectorAll('.doc').forEach(d => {
  const n = +d.dataset.n;
  const h = n <= 8 ? 13 : n <= 16 ? 9 : 6;          // 섹션이 많을수록 한 칸이 촘촘해진다
  d.innerHTML = Array.from({ length: n }, () =>
    '<div class="im" style="height:' + h + 'px"></div><div class="tx"></div><div class="tx s"></div>').join('');
});
pickCh(0);
</script>
</body></html>`;

fs.mkdirSync(path.join(ROOT, 'runs'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'runs', 'onboarding-mockup.html'), html);
console.log('완료 → runs/onboarding-mockup.html');
