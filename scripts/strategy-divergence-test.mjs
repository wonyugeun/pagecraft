/**
 * Stage1(strategy route) 검증 — 카테고리가 다른 4개 제품으로 전략이 갈리는지 확인.
 * strategy 라우트만 호출(dna + strategy JSON). 카피·구조·이미지 생성 일절 없음.
 *
 * 사용: dev 서버 띄운 채  node scripts/strategy-divergence-test.mjs
 * 출력: 콘솔 표 + _prototype_out/strategy-divergence.json
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const OUT_DIR = join(process.cwd(), '_prototype_out');
mkdirSync(OUT_DIR, { recursive: true });

const PRODUCTS = [
  {
    key: 'A 시카토너',
    cat: '화장품', ch: '스마트스토어',
    productName: '리프그린 시카 진정 토너 250ml',
    productExtra: [
      '브랜드명: 리프그린(LEAFGREEN)',
      '[주요 성분]: 제주산 병풀(센텔라), 히알루론산, 판테놀',
      '[인증 및 특징]: 무향, 무색소, 피부과 테스트 완료',
      '경쟁 차별점: 제주산 병풀 함유, 무향·무색소 저자극, 끈적임 없는 워터리 제형, 250ml 대용량',
      '기타 요청사항: 20~30대 민감성 피부·직장인 여성 타겟, 자극 없이 매일 쓰는 진정 토너 컨셉',
    ].join('\n'),
  },
  {
    key: 'B 비타민세럼',
    cat: '화장품', ch: '스마트스토어',
    productName: '비타민C 브라이트닝 세럼 30ml',
    productExtra: [
      '[주요 성분]: 비타민C 유도체, 나이아신아마이드',
      '경쟁 차별점: 갈변 없는 안정화 처방, 끈적임 없는 흡수, 아침 사용 가능',
      '기타 요청사항: 칙칙한 피부 고민 30대, 매일 아침 생기 케어 루틴',
    ].join('\n'),
  },
  {
    key: 'C 강아지관절영양제',
    cat: '반려동물', ch: '스마트스토어',
    productName: '노령견 관절 츄어블 영양제',
    productExtra: [
      '[주요 성분]: 글루코사민, MSM, 녹색입홍합',
      '경쟁 차별점: 노령견 관절 케어, 계단 오르기 힘들어하는 노령견용, 기호성 좋은 츄어블 형태',
      '기타 요청사항: 7세 이상 노령견 보호자, 산책을 좋아하던 아이가 느려진 게 속상한 보호자',
    ].join('\n'),
  },
  {
    key: 'D 공기청정기',
    cat: '가전', ch: '스마트스토어',
    productName: '대용량 공기청정기 30평형',
    productExtra: [
      '[주요 특징]: H13 등급 헤파필터, 30평형 커버, 저소음 32dB, 필터 교체 알림',
      '경쟁 차별점: H13 헤파필터, 30평형 대용량, 저소음 32dB, 필터 교체 알림 기능',
      '기타 요청사항: 신생아·어린아이 키우는 집, 미세먼지·알러지 걱정하는 부모',
    ].join('\n'),
  },
];

const FIELDS = [
  ['main_weapon', 'dna'],
  ['concept', 'strategy'],
  ['hero_angle', 'strategy'],
  ['target_desire', 'dna'],
  ['target_fear', 'dna'],
  ['story_flow', 'strategy'],
];

async function call(body) {
  const res = await fetch(`${BASE}/api/strategy`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok || json.error) throw new Error(`HTTP ${res.status}: ${json.error || JSON.stringify(json).slice(0, 200)}`);
  return json;
}

// strategy 라우트는 max_tokens(1500)에 가끔 걸리므로 최대 3회 재시도
async function callWithRetry(body, label) {
  let lastErr;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const r = await call(body);
      console.log(`✓ ${label} (시도 ${attempt})`);
      return r;
    } catch (e) {
      lastErr = e;
      console.log(`… ${label} 시도 ${attempt} 실패: ${e.message}`);
    }
  }
  throw lastErr;
}

(async () => {
  console.log(`▶ Stage1 전략 분기 검증 — 4개 제품 (BASE=${BASE})\n`);
  const results = [];
  for (const p of PRODUCTS) {
    const r = await callWithRetry({ cat: p.cat, ch: p.ch, productName: p.productName, productExtra: p.productExtra }, p.key);
    results.push({ product: p, dna: r.dna || {}, strategy: r.strategy || {} });
  }

  // 항목별 4제품 비교 출력
  console.log('\n\n══════════════════ 4개 제품 × 6개 항목 비교 ══════════════════');
  for (const [field, src] of FIELDS) {
    console.log(`\n\n### ${field} ###`);
    for (const r of results) {
      const val = (src === 'dna' ? r.dna : r.strategy)[field] ?? '(없음)';
      console.log(`\n[${r.product.key}] (${r.product.cat})\n  ${val}`);
    }
  }

  writeFileSync(
    join(OUT_DIR, 'strategy-divergence.json'),
    JSON.stringify(results.map(r => ({ key: r.product.key, cat: r.product.cat, dna: r.dna, strategy: r.strategy })), null, 2),
    'utf-8',
  );
  console.log(`\n\n✅ 저장: ${join(OUT_DIR, 'strategy-divergence.json')}`);
})().catch((e) => { console.error('\n❌ 실패:', e.message); process.exit(1); });
