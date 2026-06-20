/** 케이스① 단호박(Brix 미입력) 재생성 후, 의심 표현이 든 문장을 직접 출력해 사람이 판정. */
import { Agent, setGlobalDispatcher } from 'undici';
import { writeFileSync } from 'node:fs';
setGlobalDispatcher(new Agent({ headersTimeout: 0, bodyTimeout: 0 }));
const BASE = process.env.BASE_URL || 'http://localhost:3000';

const r = await (await fetch(`${BASE}/api/pipeline`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    cat: '식품', ch: '스마트스토어', out: 'blog', depth: '간결', sectionCount: 8, generateImages: false,
    productName: '보우짱 밤호박 1kg',
    productExtra: ['브랜드: 보우짱', '정가 15,900원 / 판매가 11,900원', '국내산 밤호박, 전자레인지 3분 간편 조리', '2개입, 달콤하고 포슬한 식감'].join('\n'),
  }),
})).json();

writeFileSync('_prototype_out/factguard-case1.json', JSON.stringify(r, null, 2));
const text = (r.sections || []).map(s => `${s.headline}\n${s.subcopy}\n${s.body}\n${JSON.stringify(s.blocks||[])}`).join('\n');
// 의심 표현 든 문장(구두점 단위) 추출
const SUS = /분질|포슬|품종|당도|brix|신품종|이력|인증|haccp|gap/i;
const sentences = text.split(/(?<=[.!?。\n])/).map(s => s.trim()).filter(Boolean);
console.log('=== 의심 표현 포함 문장 ===');
sentences.filter(s => SUS.test(s)).forEach(s => console.log('• ' + s.slice(0, 160)));
console.log('\n=== 법적 핵심 마커 카운트 ===');
[['Brix수치', /\d+\s*brix|당도\s*\d|\d+\s*브릭스/i], ['신품종', /신품종/], ['강분질(강+분질)', /강\s*분질|강한\s*분질/], ['HACCP/GAP', /haccp|gap\b|우수농산물/i], ['생산이력', /생산\s*이력|이력\s*번호|추적\s*가능/]]
  .forEach(([n, re]) => console.log(`${re.test(text) ? '✗' : '✓0'} ${n}`));
