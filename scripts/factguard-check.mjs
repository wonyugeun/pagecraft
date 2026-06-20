/**
 * 식품 카피 수치 날조 차단 검증.
 * 각 케이스를 full /api/pipeline로 생성 후, 카피 전문(headline/subcopy/body/blocks)에서
 * 셀러 미입력 날조 마커(Brix·강분질·신품종·인증·이력·마블링 등)를 스캔.
 *   ① 단호박(보우짱) Brix 미입력 → 날조 0
 *   ② 단호박 Brix 입력      → Brix가 정상 사용(셀러 입력은 살아야)
 *   ③ 사과 미입력           → 날조 0
 *   ④ 리프그린(화장품)       → 기존 가드 유지(분자량/ppm 등 날조 0), 정상 생성
 *
 * 실행:  node scripts/factguard-check.mjs   (dev 서버 :3000 필요)
 */
import { Agent, setGlobalDispatcher } from 'undici';
setGlobalDispatcher(new Agent({ headersTimeout: 0, bodyTimeout: 0 }));
const BASE = process.env.BASE_URL || 'http://localhost:3000';

// 셀러 미입력 시 떠선 안 되는 날조 마커(식품)
const FOOD_FAB = [
  { name: 'Brix수치', re: /\d+\s*brix|당도\s*\d|브릭스\s*\d|\d+\s*브릭스/i },
  { name: '강분질', re: /강분질|분질감|점질/ },
  { name: '신품종', re: /신품종/ },
  { name: 'HACCP/GAP', re: /haccp|gap\b|우수농산물|위생안전\s*인증/i },
  { name: '생산이력', re: /생산\s*이력|이력\s*번호|이력\s*추적|추적\s*가능/ },
  { name: '마블링등급', re: /마블링|근내지방|1\+\+|투쁠/ },
  { name: '무농약/친환경인증', re: /무농약|친환경\s*인증/ },
];
// 화장품 미입력 날조 마커
const COSM_FAB = [
  { name: '분자량Da', re: /\d+\s*da\b|\d+\s*달톤/i },
  { name: 'ppm', re: /\d+\s*ppm/i },
  { name: 'OEM사', re: /코스맥스|콜마/i },
];

async function pipeline(input) {
  const t0 = Date.now();
  const res = await fetch(`${BASE}/api/pipeline`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) });
  const json = await res.json();
  return { json, sec: ((Date.now() - t0) / 1000).toFixed(0) };
}

function allCopyText(sections) {
  return (sections || []).map(s => [s.headline, s.subcopy, s.body, JSON.stringify(s.blocks || [])].join(' ')).join('\n');
}

function scan(text, markers) {
  return markers.filter(m => m.re.test(text));
}

const COMMON = { ch: '스마트스토어', out: 'blog', depth: '간결', sectionCount: 8, generateImages: false };

(async () => {
  let pass = true;

  // ① 단호박 Brix 미입력
  console.log('\n[① 보우짱 단호박 / Brix 미입력]');
  const r1 = await pipeline({ ...COMMON, cat: '식품', productName: '보우짱 밤호박 1kg',
    productExtra: ['브랜드: 보우짱', '정가 15,900원 / 판매가 11,900원', '국내산 밤호박, 전자레인지 3분 간편 조리', '2개입, 달콤하고 포슬한 식감'].join('\n') });
  const t1 = allCopyText(r1.json.sections);
  const h1 = scan(t1, FOOD_FAB);
  console.log(`  생성 ${r1.json.sections?.length}섹션 (${r1.sec}s). 날조 마커: ${h1.length === 0 ? '✓ 0건' : '✗ ' + h1.map(m => m.name).join(', ')}`);
  if (h1.length) { pass = false; h1.forEach(m => console.log(`     ! ${m.name}: "${(t1.match(m.re) || [])[0]}"`)); }

  // ② 단호박 Brix 입력 → 정상 사용 확인
  console.log('\n[② 보우짱 단호박 / Brix 20 입력 → 사용돼야]');
  const r2 = await pipeline({ ...COMMON, cat: '식품', productName: '보우짱 밤호박 1kg',
    productExtra: ['브랜드: 보우짱', '당도: 20Brix (당도 측정 완료)', 'HACCP 인증 시설 생산', '국내산, 2개입'].join('\n') });
  const t2 = allCopyText(r2.json.sections);
  const usesBrix = /20\s*brix|당도\s*20|brix/i.test(t2);
  const usesHaccp = /haccp/i.test(t2);
  console.log(`  생성 ${r2.json.sections?.length}섹션 (${r2.sec}s). 입력 Brix 사용: ${usesBrix ? '✓' : '✗(셀러 입력이 죽음)'} / HACCP 사용: ${usesHaccp ? '✓' : '—'}`);
  if (!usesBrix) pass = false;

  // ③ 사과 미입력
  console.log('\n[③ 사과 / 미입력]');
  const r3 = await pipeline({ ...COMMON, cat: '식품', productName: '청송 사과 5kg',
    productExtra: ['정가 29,900원 / 판매가 24,900원', '아삭하고 새콤달콤', '가정용'].join('\n') });
  const t3 = allCopyText(r3.json.sections);
  const h3 = scan(t3, FOOD_FAB);
  console.log(`  생성 ${r3.json.sections?.length}섹션 (${r3.sec}s). 날조 마커: ${h3.length === 0 ? '✓ 0건' : '✗ ' + h3.map(m => m.name).join(', ')}`);
  if (h3.length) { pass = false; h3.forEach(m => console.log(`     ! ${m.name}: "${(t3.match(m.re) || [])[0]}"`)); }

  // ④ 리프그린 화장품 — 가드 유지
  console.log('\n[④ 리프그린 / 화장품 — 기존 가드 유지]');
  const r4 = await pipeline({ ...COMMON, cat: '화장품', productName: '리프그린 시카 진정 토너 250ml',
    productExtra: ['브랜드: 리프그린', '정가 28,000원 / 판매가 19,900원', '병풀·판테놀, 무향·무색소', '피부과 테스트 완료, 250ml'].join('\n') });
  const t4 = allCopyText(r4.json.sections);
  const h4 = scan(t4, COSM_FAB);
  console.log(`  생성 ${r4.json.sections?.length}섹션 (${r4.sec}s). 화장품 날조 마커: ${h4.length === 0 ? '✓ 0건' : '✗ ' + h4.map(m => m.name).join(', ')}`);
  if (!r4.json.sections?.length) { pass = false; console.log('  ✗ 생성 실패'); }
  if (h4.length) { pass = false; h4.forEach(m => console.log(`     ! ${m.name}: "${(t4.match(m.re) || [])[0]}"`)); }

  console.log(`\n[결과] ${pass ? '✓ 통과 — 미입력 날조 0, 셀러 입력 수치 정상, 화장품 가드 유지' : '✗ 실패 항목 있음'}`);
  process.exit(pass ? 0 : 1);
})().catch(e => { console.error('FATAL:', e); process.exit(1); });
