/**
 * 섹션 개수 일치 검증 — 셀러가 고른 8/16/32가 끝까지 유지되는지 전 범위로 본다.
 * 한 조합만 맞추는 게 아니라 카테고리 11 × 채널 4 × 분량 3 = 132개를 전부 확인한다.
 *   npx tsx scripts/section-count-test.mts
 */
import { DEPTH_BASE } from '../lib/sectionDepth';
import { calculateGenerationCost } from '../lib/pricing';

const CHANNEL_WEIGHT: Record<string, number> = { 스마트스토어: 1.0, 와디즈: 1.4, 자사몰: 0.9, 쿠팡: 0.5 };
const CATS = Object.keys(DEPTH_BASE);
const CHS = Object.keys(CHANNEL_WEIGHT);
const DEPTHS = [8, 16, 32];

/** 고치기 전: 셀러 선택을 무시하고 카테고리 기준값 × 채널 가중치로 우리가 정했다 */
function before(cat: string, ch: string, chosen: number): number {
  const depth: '간결' | '풍부' = chosen >= 32 ? '풍부' : '간결';
  const base = DEPTH_BASE[cat][depth];
  return Math.min(50, Math.max(6, Math.round(base * (CHANNEL_WEIGHT[ch] ?? 1))));
}

/** 고친 후: sectionCount가 오면 그 값이 곧 targetCount(6~50 범위 검사만) */
function after(chosen: number): number {
  return Number.isFinite(chosen) && chosen >= 6 && chosen <= 50 ? Math.round(chosen) : -1;
}

let mismatchBefore = 0, mismatchAfter = 0;
const worst: string[] = [];

for (const cat of CATS) {
  for (const ch of CHS) {
    for (const d of DEPTHS) {
      const b = before(cat, ch, d);
      const a = after(d);
      if (b !== d) {
        mismatchBefore++;
        const shownBlog = calculateGenerationCost({ sectionCount: d, out: 'blog' });
        const realBlog = calculateGenerationCost({ sectionCount: b, out: 'blog' });
        if (Math.abs(shownBlog - realBlog) >= 8) {
          worst.push(`  ${cat}×${ch} ${d}섹션 선택 → 실제 ${b}섹션 (표시 ${shownBlog}크레딧 → 실제 ${realBlog}크레딧)`);
        }
      }
      if (a !== d) mismatchAfter++;
    }
  }
}

const total = CATS.length * CHS.length * DEPTHS.length;
console.log(`조합 ${total}개 (카테고리 ${CATS.length} × 채널 ${CHS.length} × 분량 ${DEPTHS.length})\n`);
console.log(`고치기 전 — 고른 개수와 다르게 만들어짐: ${mismatchBefore}/${total}`);
console.log(`고친 후   — 고른 개수와 다르게 만들어짐: ${mismatchAfter}/${total}`);
console.log(`\n크레딧이 8 이상 어긋나던 조합 ${worst.length}건 중 앞 12건:`);
console.log(worst.slice(0, 12).join('\n'));

console.log('\n8섹션과 16섹션이 같은 결과였던 조합(선택이 아예 무의미했던 곳):');
const same: string[] = [];
for (const cat of CATS) for (const ch of CHS) {
  if (before(cat, ch, 8) === before(cat, ch, 16)) same.push(`${cat}×${ch}`);
}
console.log(`  ${same.length}/${CATS.length * CHS.length}개 — ${same.slice(0, 6).join(', ')} …`);

if (mismatchAfter > 0) process.exit(1);
