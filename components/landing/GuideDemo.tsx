'use client';

import { useEffect, useRef } from 'react';

/**
 * 가이드 페이지 인터랙티브 데모 — "구체적으로 입력할수록 좋은 결과"를 30초 루프로 시연.
 * ①상품명 타이핑 → 칩 클릭(가짜 커서) → 가격·할인율 → 상세정보 4줄 타이핑 → 사진 업로드
 *   (입력 완성도 게이지 0→100%) ②생성 진행(섹션 썸네일 채움) ③완성(폰 프레임 스크롤).
 * 자산: public/images/landing/demo-*.jpg + showcase-vitamin.jpg (전부 경량 웹용).
 * 좁은 화면(<760px)에서는 레이아웃이 깨져 표시하지 않는다(가이드 본문이 대체).
 */

const NAME = '밸런스랩 데일리 멀티비타민 미네랄 90정';
const DETAIL_LINES = [
  '핵심 성분: 비타민C·아연 — 정상적인 면역기능에 필요',
  '비타민B1·B2 — 에너지 생성에 필요 (식약처 고시형)',
  '특징: 90정(3개월분) · 국내 GMP 인증 시설 제조',
  '고객 후기: "아침에 한 알로 끝나서 꾸준히 먹게 돼요" — 박OO',
];
const LABELS = ['광고 컨셉 결정 중…', '섹션 구조 설계 중…', '카피 작성 중…', '이미지 생성 중…'];
const THUMBS = [1, 2, 3, 4, 5, 6].map(n => `/images/landing/demo-sec-${n}.jpg`);

const CSS = `
  .gd-root { margin: 8px 0 44px; }
  .gd-browser {
    width: 100%; border-radius: 16px; overflow: hidden;
    box-shadow: 0 20px 50px rgba(25,31,40,.13), 0 3px 12px rgba(25,31,40,.07);
    border: 1px solid #E5E5EE; background: #fff;
  }
  .gd-bar { height: 40px; background: #F2F2F7; border-bottom: 1px solid #E5E5EE; display: flex; align-items: center; padding: 0 14px; gap: 7px; }
  .gd-dot { width: 11px; height: 11px; border-radius: 50%; }
  .gd-url { flex: 1; max-width: 300px; margin: 0 auto; height: 24px; background: #fff; border-radius: 7px; display: flex; align-items: center; justify-content: center; font-size: 11.5px; color: #8B95A1; }
  .gd-stage { position: relative; height: 560px; overflow: hidden; }
  .gd-phase { position: absolute; inset: 0; opacity: 0; transform: translateX(24px); transition: opacity .5s, transform .5s; pointer-events: none; }
  .gd-phase.on { opacity: 1; transform: none; }
  .gd-stepper { position: absolute; bottom: 0; left: 0; right: 0; height: 46px; display: flex; align-items: center; justify-content: center; gap: 24px; background: rgba(255,255,255,.94); border-top: 1px solid #F0F0F6; z-index: 5; }
  .gd-step { display: flex; align-items: center; gap: 7px; font-size: 12px; font-weight: 700; color: #B8B8C7; transition: color .3s; }
  .gd-step .n { width: 18px; height: 18px; border-radius: 50%; background: #EEEEF4; color: #9A9AAB; display: flex; align-items: center; justify-content: center; font-size: 10px; transition: all .3s; }
  .gd-step.act { color: #191F28; }
  .gd-step.act .n { background: #6D4CFF; color: #fff; }
  #gd-cursor { position: absolute; z-index: 9; width: 18px; height: 18px; pointer-events: none; transition: left .5s cubic-bezier(.5,0,.3,1), top .5s cubic-bezier(.5,0,.3,1); filter: drop-shadow(0 2px 4px rgba(0,0,0,.3)); opacity: 0; }
  #gd-cursor.click { animation: gdClick .3s; }
  @keyframes gdClick { 50% { transform: scale(.72); } }

  .gd-pa { padding: 20px 26px; }
  .gd-pa-head { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 12px; gap: 12px; }
  .gd-pa h4 { font-size: 11.5px; color: #6D4CFF; letter-spacing: .08em; margin: 0 0 5px; }
  .gd-pa h3 { font-size: 18px; color: #191F28; letter-spacing: -0.02em; margin: 0; }
  .gd-hint { font-size: 11.5px; color: #8B95A1; margin-top: 4px; }
  .gd-meter { text-align: right; flex-shrink: 0; }
  .gd-meter .pct { font-size: 19px; font-weight: 800; color: #B8B8C7; transition: color .3s; }
  .gd-meter .pct.mid { color: #6D4CFF; }
  .gd-meter .pct.high { color: #16A34A; }
  .gd-meter .cap { font-size: 10.5px; color: #8B95A1; }
  .gd-meter .track { width: 104px; height: 5px; background: #EEEEF4; border-radius: 4px; margin-top: 5px; overflow: hidden; }
  .gd-meter .track div { height: 100%; width: 0%; background: #6D4CFF; border-radius: 4px; transition: width .5s, background .3s; }
  .gd-meter .track div.high { background: #16A34A; }
  .gd-grid { display: grid; grid-template-columns: 330px 1fr; gap: 16px; }
  .gd-lbl { font-size: 10.5px; font-weight: 700; color: #4E5968; margin: 0 0 5px; }
  .gd-input { height: 38px; border: 1.5px solid #E5E5EE; border-radius: 10px; display: flex; align-items: center; padding: 0 12px; font-size: 12.5px; color: #191F28; background: #fff; transition: all .3s; margin-bottom: 10px; white-space: nowrap; overflow: hidden; }
  .gd-input.focus { border-color: #6D4CFF; box-shadow: 0 0 0 3px rgba(109,76,255,.12); }
  .gd-caret { display: inline-block; width: 2px; height: 15px; background: #6D4CFF; margin-left: 2px; animation: gdBlink 1s step-end infinite; flex-shrink: 0; }
  @keyframes gdBlink { 50% { opacity: 0; } }
  .gd-chips { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 10px; }
  .gd-chip { padding: 6px 11px; border-radius: 999px; background: #fff; color: #8B95A1; border: 1.5px solid #E5E5EE; font-size: 11.5px; font-weight: 700; transition: all .25s; }
  .gd-chip.on { background: #F4F2FF; color: #6D4CFF; border-color: #C9BAFF; transform: scale(1.04); }
  .gd-prices { display: flex; gap: 7px; align-items: center; margin-bottom: 10px; flex-wrap: wrap; }
  .gd-price { height: 38px; border: 1.5px solid #E5E5EE; border-radius: 10px; display: flex; align-items: center; padding: 0 11px; font-size: 12px; color: #191F28; background: #fff; transition: border-color .3s; }
  .gd-price.focus { border-color: #6D4CFF; }
  .gd-price .ph { color: #B8B8C7; font-size: 10.5px; margin-right: 6px; }
  .gd-disc { font-size: 10.5px; font-weight: 800; color: #E11D48; background: #FFF1F2; border-radius: 999px; padding: 5px 9px; opacity: 0; transform: scale(.6); transition: all .35s cubic-bezier(.2,1.4,.4,1); }
  .gd-disc.on { opacity: 1; transform: scale(1); }
  .gd-photos { display: flex; gap: 10px; }
  .gd-photo { width: 78px; height: 78px; border-radius: 12px; border: 2px dashed #D8D2FF; display: flex; align-items: center; justify-content: center; overflow: hidden; position: relative; background: #FDFCFF; }
  .gd-photo img { max-width: 88%; max-height: 74%; opacity: 0; transform: scale(.6) translateY(12px); transition: all .4s cubic-bezier(.2,1.4,.4,1); }
  .gd-photo.on { border-style: solid; border-color: #6D4CFF; }
  .gd-photo.on img { opacity: 1; transform: none; }
  .gd-photo .check { position: absolute; top: 4px; right: 4px; width: 16px; height: 16px; border-radius: 50%; background: #22C55E; color: #fff; font-size: 10px; display: flex; align-items: center; justify-content: center; opacity: 0; transform: scale(0); transition: all .3s .15s; }
  .gd-photo.on .check { opacity: 1; transform: scale(1); }
  .gd-photo .plbl { position: absolute; bottom: 3px; left: 0; right: 0; text-align: center; font-size: 8.5px; color: #8B95A1; background: rgba(255,255,255,.88); padding: 1px 0; }
  .gd-detail-card { border: 1.5px solid #E5E5EE; border-radius: 12px; background: #fff; padding: 11px 13px; transition: all .3s; }
  .gd-detail-card.focus { border-color: #6D4CFF; box-shadow: 0 0 0 3px rgba(109,76,255,.12); }
  .gd-detail-card .gd-lbl { display: flex; justify-content: space-between; gap: 8px; }
  .gd-detail-card .gd-lbl em { font-style: normal; color: #16A34A; font-weight: 700; font-size: 10px; opacity: 0; transition: opacity .4s; }
  .gd-detail-card .gd-lbl em.on { opacity: 1; }
  #gd-detail { font-size: 11.5px; color: #333D4B; line-height: 1.8; min-height: 220px; }
  .gd-tip { margin-top: 8px; font-size: 10.5px; color: #8B95A1; line-height: 1.55; border-top: 1px dashed #ECECF2; padding-top: 8px; }
  .gd-tip b { color: #4E5968; }

  .gd-pb { padding: 36px 40px; }
  .gd-pb h3 { font-size: 20px; color: #191F28; margin: 0 0 5px; }
  .gd-pb .sub { font-size: 12.5px; color: #8B95A1; margin-bottom: 20px; }
  .gd-barwrap { width: 100%; height: 9px; background: #EEEEF6; border-radius: 8px; overflow: hidden; margin-bottom: 9px; }
  .gd-barwrap > div { height: 100%; width: 0%; background: linear-gradient(90deg, #6D4CFF, #9C7DFF); border-radius: 8px; transition: width .5s; }
  .gd-plabel { font-size: 12.5px; color: #6D4CFF; font-weight: 700; min-height: 18px; margin-bottom: 16px; }
  .gd-thumbs { display: grid; grid-template-columns: repeat(6, 1fr); gap: 8px; }
  .gd-thumb { aspect-ratio: 2/3; border-radius: 9px; background: #F2F2F8; overflow: hidden; position: relative; }
  .gd-thumb::after { content: ''; position: absolute; inset: 0; background: linear-gradient(100deg, transparent 30%, rgba(255,255,255,.7) 50%, transparent 70%); animation: gdShimmer 1.2s infinite; }
  @keyframes gdShimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
  .gd-thumb img { width: 100%; height: 100%; object-fit: cover; opacity: 0; transform: scale(1.1); transition: all .5s; }
  .gd-thumb.done::after { display: none; }
  .gd-thumb.done img { opacity: 1; transform: none; }

  .gd-pc { display: flex; align-items: center; justify-content: center; gap: 36px; background: linear-gradient(135deg, #F4F2FF, #FBFAFF); }
  .gd-pc .copy { max-width: 280px; }
  .gd-pc .tag { font-size: 11px; font-weight: 700; color: #6D4CFF; letter-spacing: .08em; }
  .gd-pc h3 { font-size: 22px; color: #191F28; letter-spacing: -0.02em; line-height: 1.3; margin: 8px 0 10px; }
  .gd-pc p { font-size: 13px; color: #4E5968; line-height: 1.7; margin: 0; }
  .gd-stats { display: flex; gap: 8px; margin-top: 14px; }
  .gd-stats div { background: #fff; border: 1px solid #ECECF2; border-radius: 10px; padding: 8px 11px; font-size: 10.5px; color: #4E5968; opacity: 0; transform: translateY(10px); transition: all .4s; }
  .gd-stats div b { display: block; font-size: 14px; color: #191F28; }
  .gd-pc.on .gd-stats div { opacity: 1; transform: none; }
  .gd-pc.on .gd-stats div:nth-child(2) { transition-delay: .15s; }
  .gd-pc.on .gd-stats div:nth-child(3) { transition-delay: .3s; }
  .gd-device { width: 220px; height: 400px; border-radius: 24px; border: 6px solid #191F28; overflow: hidden; background: #fff; box-shadow: 0 20px 40px rgba(25,31,40,.26); flex-shrink: 0; }
  .gd-device img { width: 100%; display: block; }
  .gd-device.scrolling img { animation: gdScroll 6.5s cubic-bezier(.4,0,.4,1) infinite; }
  @keyframes gdScroll { 0%,4% { transform: translateY(0); } 96%,100% { transform: translateY(calc(-100% + 388px)); } }

  @media (max-width: 760px) { .gd-root { display: none; } }
`;

export default function GuideDemo() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const $ = (id: string) => root.querySelector<HTMLElement>(`#${id}`);
    const $$ = (sel: string) => Array.from(root.querySelectorAll<HTMLElement>(sel));
    const cursor = $('gd-cursor');
    let timers: ReturnType<typeof setTimeout>[] = [];
    let intervals: ReturnType<typeof setInterval>[] = [];
    const at = (ms: number, fn: () => void) => timers.push(setTimeout(fn, ms));

    const moveCursor = (el: HTMLElement | null, dx = 8, dy = 8) => {
      const stage = root.querySelector('.gd-stage');
      if (!el || !stage || !cursor) return;
      const s = stage.getBoundingClientRect();
      const r = el.getBoundingClientRect();
      cursor.style.left = (r.left - s.left + r.width / 2 + dx) + 'px';
      cursor.style.top = (r.top - s.top + r.height / 2 + dy) + 'px';
    };
    const clickFx = () => { if (!cursor) return; cursor.classList.remove('click'); void cursor.offsetWidth; cursor.classList.add('click'); };
    const setPhase = (onId: string) => {
      $$('.gd-phase').forEach(p => p.classList.toggle('on', p.id === onId));
      $('gd-st1')?.classList.toggle('act', onId === 'gd-pa');
      $('gd-st2')?.classList.toggle('act', onId === 'gd-pb');
      $('gd-st3')?.classList.toggle('act', onId === 'gd-pc');
    };
    const setMeter = (pct: number) => {
      const p = $('gd-pct'), t = $('gd-ptrack');
      if (!p || !t) return;
      p.textContent = pct + '%';
      t.style.width = pct + '%';
      p.className = 'pct' + (pct >= 85 ? ' high' : pct >= 40 ? ' mid' : '');
      t.className = pct >= 85 ? 'high' : '';
    };
    const typeInto = (el: HTMLElement | null, text: string, speed: number, done?: () => void) => {
      if (!el) return;
      let i = 0;
      const t = setInterval(() => {
        el.textContent = text.slice(0, ++i);
        if (i >= text.length) { clearInterval(t); done?.(); }
      }, speed);
      intervals.push(t);
    };

    const runLoop = () => {
      timers.forEach(clearTimeout); intervals.forEach(clearInterval);
      timers = []; intervals = [];
      setPhase('gd-pa'); setMeter(0);
      ['gd-typed', 'gd-pv1', 'gd-pv2'].forEach(id => { const el = $(id); if (el) el.textContent = ''; });
      const det = $('gd-detail'); if (det) det.innerHTML = '';
      if (cursor) cursor.style.opacity = '0';
      $$('.gd-chip, .gd-photo').forEach(el => el.classList.remove('on'));
      ['gd-finput', 'gd-p1', 'gd-p2', 'gd-dcard'].forEach(id => $(id)?.classList.remove('focus'));
      $('gd-disc')?.classList.remove('on'); $('gd-dgood')?.classList.remove('on');
      const fill = $('gd-fill'); if (fill) fill.style.width = '0%';
      const tb = $('gd-thumbs');
      if (tb) tb.innerHTML = THUMBS.map(s => `<div class="gd-thumb"><img src="${s}" alt=""></div>`).join('');
      $('gd-device')?.classList.remove('scrolling');

      // ① 상품명
      $('gd-finput')?.classList.add('focus');
      typeInto($('gd-typed'), NAME, 42, () => { $('gd-finput')?.classList.remove('focus'); setMeter(18); });
      // ② 칩
      const chips = $$('.gd-chip');
      at(1300, () => { if (cursor) cursor.style.opacity = '1'; });
      chips.forEach((c, k) => {
        at(1400 + k * 430, () => moveCursor(c));
        at(1690 + k * 430, () => { clickFx(); c.classList.add('on'); });
      });
      at(3200, () => setMeter(38));
      // ③ 가격
      at(3400, () => moveCursor($('gd-p1')));
      at(3700, () => { clickFx(); $('gd-p1')?.classList.add('focus'); typeInto($('gd-pv1'), '39,000원', 55); });
      at(4400, () => { $('gd-p1')?.classList.remove('focus'); $('gd-p2')?.classList.add('focus'); moveCursor($('gd-p2')); typeInto($('gd-pv2'), '29,000원', 55); });
      at(5200, () => { $('gd-p2')?.classList.remove('focus'); $('gd-disc')?.classList.add('on'); setMeter(52); });
      // ④ 상세 정보
      at(5600, () => moveCursor($('gd-dcard'), -50, -60));
      at(5900, () => { clickFx(); $('gd-dcard')?.classList.add('focus'); if (cursor) cursor.style.opacity = '0'; });
      DETAIL_LINES.forEach((line, k) => {
        at(6100 + k * 1500, () => {
          const div = document.createElement('div');
          $('gd-detail')?.appendChild(div);
          typeInto(div, line, 26);
          setMeter(Math.min(84, 52 + (k + 1) * 8));
        });
      });
      at(6100 + DETAIL_LINES.length * 1500, () => { $('gd-dcard')?.classList.remove('focus'); $('gd-dgood')?.classList.add('on'); });
      // ⑤ 사진
      const T5 = 6400 + DETAIL_LINES.length * 1500;
      at(T5, () => { if (cursor) cursor.style.opacity = '1'; moveCursor($('gd-ph1'), 0, 0); });
      at(T5 + 350, () => { clickFx(); $('gd-ph1')?.classList.add('on'); setMeter(92); });
      at(T5 + 950, () => moveCursor($('gd-ph2'), 0, 0));
      at(T5 + 1300, () => { clickFx(); $('gd-ph2')?.classList.add('on'); setMeter(100); });
      at(T5 + 1900, () => { if (cursor) cursor.style.opacity = '0'; });
      // Phase B
      const TB = T5 + 2400;
      at(TB, () => setPhase('gd-pb'));
      LABELS.forEach((t, k) => at(TB + 200 + k * 800, () => {
        const l = $('gd-plabel'); if (l) l.textContent = t;
        const f = $('gd-fill'); if (f) f.style.width = (k + 1) * 18 + '%';
      }));
      for (let k = 0; k < THUMBS.length; k++) {
        at(TB + 3400 + k * 550, () => {
          $$('.gd-thumb')[k]?.classList.add('done');
          const f = $('gd-fill'); if (f) f.style.width = Math.min(100, 72 + (k + 1) * 5) + '%';
          const l = $('gd-plabel'); if (l) l.textContent = `이미지 생성 중… ${k + 1}/6 섹션`;
        });
      }
      // Phase C
      at(TB + 7400, () => { setPhase('gd-pc'); $('gd-device')?.classList.add('scrolling'); });
    };

    runLoop();
    const loop = setInterval(runLoop, 30000);
    return () => { clearInterval(loop); timers.forEach(clearTimeout); intervals.forEach(clearInterval); };
  }, []);

  return (
    <div className="gd-root" ref={rootRef}>
      <style>{CSS}</style>
      <div className="gd-browser">
        <div className="gd-bar">
          <span className="gd-dot" style={{ background: '#FF5F57' }} />
          <span className="gd-dot" style={{ background: '#FEBC2E' }} />
          <span className="gd-dot" style={{ background: '#28C840' }} />
          <div className="gd-url">🔒 flik.kr</div>
          <span style={{ width: 48 }} />
        </div>
        <div className="gd-stage">
          <svg id="gd-cursor" viewBox="0 0 24 24"><path d="M5 3l14 8-6.5 1.5L9 19z" fill="#191F28" stroke="#fff" strokeWidth="1.5" /></svg>

          <div className="gd-phase gd-pa on" id="gd-pa">
            <div className="gd-pa-head">
              <div>
                <h4>STEP 1 · 상품 정보</h4>
                <h3>구체적으로 적을수록, 페이지가 풍부해져요</h3>
                <div className="gd-hint">AI는 입력한 사실만 사용합니다 — 성분·특징·후기를 정성껏 채워주세요</div>
              </div>
              <div className="gd-meter">
                <span className="pct" id="gd-pct">0%</span>
                <div className="cap">입력 완성도</div>
                <div className="track"><div id="gd-ptrack" /></div>
              </div>
            </div>
            <div className="gd-grid">
              <div>
                <div className="gd-lbl">상품명</div>
                <div className="gd-input" id="gd-finput"><span id="gd-typed" /><span className="gd-caret" /></div>
                <div className="gd-lbl">상품 특징 (선택형)</div>
                <div className="gd-chips">
                  <span className="gd-chip">건강기능식품</span>
                  <span className="gd-chip">GMP 인증</span>
                  <span className="gd-chip">1일 1정</span>
                  <span className="gd-chip">무착향·무착색</span>
                </div>
                <div className="gd-lbl">판매 가격</div>
                <div className="gd-prices">
                  <div className="gd-price" id="gd-p1"><span className="ph">정가</span><span id="gd-pv1" /></div>
                  <div className="gd-price" id="gd-p2"><span className="ph">판매가</span><span id="gd-pv2" /></div>
                  <span className="gd-disc" id="gd-disc">26% 할인 자동계산</span>
                </div>
                <div className="gd-lbl">제품 사진</div>
                <div className="gd-photos">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <div className="gd-photo" id="gd-ph1"><img src="/images/landing/demo-bottle.jpg" alt="대표컷" /><span className="check">✓</span><span className="plbl">대표컷</span></div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <div className="gd-photo" id="gd-ph2"><img src="/images/landing/demo-pill.jpg" alt="보조컷" /><span className="check">✓</span><span className="plbl">보조컷(내용물)</span></div>
                </div>
              </div>
              <div className="gd-detail-card" id="gd-dcard">
                <div className="gd-lbl">상세 정보 <em id="gd-dgood">✓ 좋아요, 이만큼 구체적이면 충분해요</em></div>
                <div id="gd-detail" />
                <div className="gd-tip">
                  💡 <b>&ldquo;성분 좋음&rdquo;보다 &ldquo;비타민C·아연 — 정상적인 면역기능에 필요&rdquo;</b>처럼
                  항목을 나눠 적으면 성분 섹션·정보그래픽이 훨씬 정확해집니다.
                </div>
              </div>
            </div>
          </div>

          <div className="gd-phase gd-pb" id="gd-pb">
            <h3>AI가 페이지를 설계하고 있어요</h3>
            <div className="sub">입력하신 사실만으로 — 광고 컨셉 → 섹션 구성 → 카피·이미지</div>
            <div className="gd-barwrap"><div id="gd-fill" /></div>
            <div className="gd-plabel" id="gd-plabel">광고 컨셉 결정 중…</div>
            <div className="gd-thumbs" id="gd-thumbs" />
          </div>

          <div className="gd-phase gd-pc" id="gd-pc">
            <div className="copy">
              <span className="tag">DONE ✦ 무편집 결과물</span>
              <h3>입력한 정보가<br />전부 페이지가 됐어요</h3>
              <p>성분은 정보그래픽으로, 후기는 원문 그대로,<br />가격은 할인율까지 — 지어낸 건 없습니다.</p>
              <div className="gd-stats">
                <div><b>16</b>섹션 생성</div>
                <div><b>1:1</b>크레딧 = 섹션</div>
                <div><b>0원</b>실패 시 자동환불</div>
              </div>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <div className="gd-device" id="gd-device"><img src="/images/landing/showcase-vitamin.jpg" alt="완성 상세페이지" /></div>
          </div>

          <div className="gd-stepper">
            <span className="gd-step act" id="gd-st1"><span className="n">1</span>정보 입력</span>
            <span className="gd-step" id="gd-st2"><span className="n">2</span>AI 생성</span>
            <span className="gd-step" id="gd-st3"><span className="n">3</span>완성</span>
          </div>
        </div>
      </div>
      <p style={{ textAlign: 'center', fontSize: 12, color: '#8B95A1', marginTop: 10 }}>
        30초 데모 — 입력부터 완성까지 실제 흐름 그대로 반복 재생됩니다
      </p>
    </div>
  );
}
