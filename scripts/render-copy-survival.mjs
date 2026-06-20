/**
 * Before/After — ResultScreen 렌더 규칙(BlogSection)의 카피 생존율 비교.
 * 저장된 JSON 재사용(새 생성 0). 화면 코드의 분기 결정 로직만 재현해 headline/subcopy/body가
 * 화면에 "나오는가"를 OLD(기존 3분기) vs NEW(통합)로 카운트.
 *
 * 데이터: diag-stage3-original.json(v5 강아지, bodyFlow 없음=worst case + 전 섹션 blocks),
 *         pipeline-test.json(리프그린), factguard-case1.json(단호박).
 */
import { readFileSync } from 'node:fs';
const load = f => JSON.parse(readFileSync(`_prototype_out/${f}`, 'utf8'));

// OLD 규칙: 카피가 화면에 나오는가
function oldEmits(sec) {
  const hasBlocks = !!(sec.blocks && sec.blocks.length);
  if (sec.bodyFlow) return { headline: true, subcopy: !!sec.subcopy, body: !!sec.body };       // 분기①
  if (hasBlocks)    return { headline: false, subcopy: false, body: false };                     // 분기② 블록만
  return { headline: true, subcopy: false, body: !!sec.body };                                   // 분기③ subcopy 누락
}
// NEW 규칙: 분기 무관 항상 카피 렌더(첫 섹션 Hero도 headline/subcopy 포함)
function newEmits(sec) {
  return { headline: true, subcopy: !!sec.subcopy, body: !!sec.body };
}

function tally(name, secs) {
  const n = secs.length;
  const sum = (fn, k) => secs.filter(s => fn(s)[k]).length;
  const subcopyAvail = secs.filter(s => !!s.subcopy).length;
  console.log(`\n[${name}] ${n}섹션 (subcopy 원본 보유 ${subcopyAvail}/${n})`);
  console.log(`  OLD: headline ${sum(oldEmits,'headline')}/${n} · subcopy ${sum(oldEmits,'subcopy')}/${n} · body ${sum(oldEmits,'body')}/${n}`);
  console.log(`  NEW: headline ${sum(newEmits,'headline')}/${n} · subcopy ${sum(newEmits,'subcopy')}/${n} · body ${sum(newEmits,'body')}/${n}`);
}

// diag-stage3-original: raw Stage3 → 렌더 매핑 시 bodyFlow가 빠진 worst case(diag-resultscreen이 그 증거: bodyFlow 0). 재현.
const dog = load('diag-stage3-original.json').map(s => ({ ...s, bodyFlow: undefined }));
tally('v5 강아지(worst: bodyFlow 없음)', dog);

// 정상 신엔진 경로(bodyFlow=true)도 비교 — 리프그린/단호박
const lg = load('pipeline-test.json').sections.map(s => ({ ...s, bodyFlow: true }));
tally('리프그린(bodyFlow=true)', lg);
const hb = load('factguard-case1.json').sections.map(s => ({ ...s, bodyFlow: true }));
tally('단호박(bodyFlow=true)', hb);

// 신엔진인데 bodyFlow가 어쩌다 빠진 경우(복원 등) — 리프그린 worst
const lgWorst = load('pipeline-test.json').sections.map(s => ({ ...s, bodyFlow: undefined }));
tally('리프그린(worst: bodyFlow 없음)', lgWorst);
