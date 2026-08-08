/**
 * 파이프라인 경계 훑기(2026-08-08) — 아무도 안 밟은 조합을 의도적으로 밟는다.
 *
 * ★왜: 실제로 터진 버그들(35섹션 구조 잘림, 슬라이드 캡처 누락)의 공통점은 "안 밟아본 경로"였다.
 *   손으로 하나씩 돌려 우연히 발견하는 건 느리고 비싸고 피로하다. 기계가 훑게 한다.
 *
 * ★비용: 이미지를 만들지 않는다. 구조 단계 + 카피 1청크만 돌린다(장당 수백 원 수준).
 *   크레딧은 로컬(dev)에서 차감되지 않지만 AI 호출 비용은 실제로 나가므로, 조합은 최소로 잡는다.
 *
 * 사용: npx tsx scripts/sweep-pipeline.mts [--full]
 *   기본  = 구조 단계만 (섹션 수 × 카테고리)
 *   --full = 카피 단계까지 (출력형태별 1청크, 어투 변환 포함)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { encode } from 'next-auth/jwt';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = 'http://localhost:3000';

const env: Record<string, string> = {};
for (const l of fs.readFileSync(path.join(ROOT, '.env.local'), 'utf8').split('\n')) {
  const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}

const cookie = await encode({ token: { email: env.CRAWL_EMAIL || 'hanmeiligo1@gmail.com' }, secret: env.NEXTAUTH_SECRET });
const H = { 'Content-Type': 'application/json', cookie: `next-auth.session-token=${cookie}` };

/** 카테고리별 최소 재료 — 실제 셀러 입력 수준으로만(과하게 주면 경계가 안 드러난다) */
const FIXTURES = {
  화장품: {
    dna: { product_name: '리프그린 시카 토너 250ml', category: '화장품',
      main_weapon: '병풀 고함량 + 무알콜·무향료', target: '민감성 피부',
      key_facts: ['병풀 추출물', '판테놀', '무알콜', '무향료', '250ml'] },
    strategy: { tone: '담백한', hero_angle: '자극 없는 닦토', target_desire: '따갑지 않게 매일 쓰고 싶다', speech_level: '해요체' },
    facts: '병풀·판테놀 함유, 무알콜·무향료, 250ml',
  },
  식품: {
    dna: { product_name: '데일리핏 저당 오트 그래놀라 400g', category: '식품',
      main_weapon: '통귀리 100% + 무설탕 시럽', target: '아침을 거르는 직장인',
      key_facts: ['통귀리 100%', '무설탕 시럽', '크랜베리·아몬드·호박씨', '400g'] },
    strategy: { tone: '솔직한', hero_angle: '달지 않아도 맛있다', target_desire: '건강과 맛 둘 다', speech_level: '해요체' },
    facts: '통귀리 100%, 무설탕 시럽, 크랜베리·아몬드·호박씨, 400g',
  },
} as const;

const POOL = ['히어로','고민 공감','원인 진단','해결 선언','핵심 성분','성분 근거','저자극 검증','비교표','사용법','사용 순서',
  '타입별 안내','아침 루틴','저녁 루틴','텍스처 설명','흡수력','용량 안내','가격 근거','정기구독 안내','후기','후기 요약',
  'FAQ','배송 안내','교환·반품','브랜드 스토리','제조 공정','원료 수급','인증','함께 쓰면 좋은 것','보관법','주의사항',
  '전성분','샘플 안내','재구매 이유','이런 분께','한 줄 요약','신뢰 지표','사용 전후','원산지','포장 안내','선물 안내',
  '자주 하는 실수','대체재 비교','시작 가이드','관리 팁','품질 관리','고객 지원','환경 고려','수량 안내','묶음 구성','CTA'];
const namesFor = (n: number) => POOL.slice(0, Math.max(2, n - 1)).concat('CTA').slice(0, n);

interface Row { 조합: string; 결과: string; 요청: number; 응답: number; 초: number; 비고: string }
const rows: Row[] = [];

async function structureRun(cat: keyof typeof FIXTURES, n: number): Promise<Record<string, unknown>[] | null> {
  const f = FIXTURES[cat];
  const names = namesFor(n);
  const t0 = Date.now();
  try {
    const r = await fetch(`${BASE}/api/structure`, {
      method: 'POST', headers: H,
      body: JSON.stringify({ dna: f.dna, strategy: f.strategy, cat, ch: '스마트스토어',
        depth: n >= 16 ? '풍부' : '간결', sectionCount: n, sectionStructure: names }),
      signal: AbortSignal.timeout(600_000),
    });
    const d = await r.json() as { sections?: Record<string, unknown>[]; error?: string };
    const sec = Math.round((Date.now() - t0) / 1000);
    if (d.error) {
      rows.push({ 조합: `구조 ${cat} ${n}섹션`, 결과: '❌ 실패', 요청: n, 응답: 0, 초: sec, 비고: d.error.slice(0, 60) });
      return null;
    }
    const got = d.sections ?? [];
    const noMission = got.filter(s => !String(s.mission ?? '').trim()).length;
    const noEmotion = got.filter(s => !String(s.emotion_goal ?? '').trim()).length;
    const notes = [
      got.length !== n ? `개수 ${got.length}≠${n}` : '',
      noMission ? `mission 빈칸 ${noMission}` : '',
      noEmotion ? `emotion 빈칸 ${noEmotion}` : '',
    ].filter(Boolean).join(' · ');
    rows.push({ 조합: `구조 ${cat} ${n}섹션`, 결과: notes ? '⚠️ 이상' : '✅ 통과',
      요청: n, 응답: got.length, 초: sec, 비고: notes || '-' });
    return got;
  } catch (e) {
    rows.push({ 조합: `구조 ${cat} ${n}섹션`, 결과: '❌ 예외', 요청: n, 응답: 0,
      초: Math.round((Date.now() - t0) / 1000), 비고: String(e).slice(0, 60) });
    return null;
  }
}

async function copyRun(cat: keyof typeof FIXTURES, out: 'blog' | 'slide', plan: Record<string, unknown>[]) {
  const f = FIXTURES[cat];
  const chunk = plan.slice(0, 4);
  const t0 = Date.now();
  try {
    const r = await fetch(`${BASE}/api/copy`, {
      method: 'POST', headers: H,
      body: JSON.stringify({ strategySummary: f.strategy, strategy: f.strategy, sections: chunk,
        pageMap: plan.map(p => ({ name: p.name, mission: p.mission })), startIndex: 0,
        totalSections: plan.length, cat, ch: '스마트스토어', out, depth: '간결', knownFacts: f.facts }),
      signal: AbortSignal.timeout(600_000),
    });
    const d = await r.json() as { sections?: Record<string, string>[]; error?: string };
    const sec = Math.round((Date.now() - t0) / 1000);
    if (d.error) {
      rows.push({ 조합: `카피 ${cat} ${out}`, 결과: '❌ 실패', 요청: chunk.length, 응답: 0, 초: sec, 비고: d.error.slice(0, 60) });
      return;
    }
    const got = d.sections ?? [];
    // 어투(해요체) 반영 확인 — 본문 마지막 줄들의 종결을 본다
    const bodies = got.map(s => String(s.body ?? '')).join('\n');
    const haeyo = /(요|죠)[.!?]?\s*$/m.test(bodies);
    const empty = got.filter(s => !String(s.headline ?? '').trim()).length;
    const notes = [
      got.length !== chunk.length ? `개수 ${got.length}≠${chunk.length}` : '',
      empty ? `헤드라인 빈칸 ${empty}` : '',
      haeyo ? '' : '어투(해요체) 흔적 없음',
    ].filter(Boolean).join(' · ');
    rows.push({ 조합: `카피 ${cat} ${out}`, 결과: notes ? '⚠️ 이상' : '✅ 통과',
      요청: chunk.length, 응답: got.length, 초: sec, 비고: notes || '-' });
  } catch (e) {
    rows.push({ 조합: `카피 ${cat} ${out}`, 결과: '❌ 예외', 요청: 4, 응답: 0,
      초: Math.round((Date.now() - t0) / 1000), 비고: String(e).slice(0, 60) });
  }
}

const full = process.argv.includes('--full');
console.log(`파이프라인 훑기 시작 — ${full ? '구조 + 카피' : '구조만'}\n`);

const plans: Partial<Record<string, Record<string, unknown>[]>> = {};
for (const cat of ['화장품', '식품'] as const) {
  for (const n of [8, 16, 32, 50]) {
    process.stdout.write(`  ${cat} ${n}섹션 … `);
    const got = await structureRun(cat, n);
    console.log(rows[rows.length - 1].결과);
    if (n === 8 && got) plans[cat] = got;
  }
}
if (full) {
  for (const cat of ['화장품', '식품'] as const) {
    for (const out of ['blog', 'slide'] as const) {
      const plan = plans[cat];
      if (!plan) continue;
      process.stdout.write(`  카피 ${cat} ${out} … `);
      await copyRun(cat, out, plan);
      console.log(rows[rows.length - 1].결과);
    }
  }
}

console.log('\n' + '━'.repeat(78));
console.log('조합'.padEnd(22) + '결과'.padEnd(9) + '요청'.padEnd(6) + '응답'.padEnd(6) + '초'.padEnd(6) + '비고');
console.log('━'.repeat(78));
for (const r of rows) {
  console.log(String(r.조합).padEnd(22) + String(r.결과).padEnd(8) + String(r.요청).padEnd(6) +
    String(r.응답).padEnd(6) + String(r.초).padEnd(6) + r.비고);
}
const bad = rows.filter(r => !r.결과.startsWith('✅'));
console.log('━'.repeat(78));
console.log(bad.length ? `\n❗ 문제 ${bad.length}건 — 위 비고 확인` : '\n전부 통과 ✅');
