/**
 * 결제 대사 실행 — 우리 DB와 포트원 원장을 맞춰본다.
 *   진단만: npx --yes tsx scripts/reconcile-run.mts
 *   교정까지: npx --yes tsx scripts/reconcile-run.mts --apply
 * (같은 일을 관리자 API로도 할 수 있다: GET/POST /api/admin/reconcile)
 */
import { readFileSync } from 'node:fs';
const env = readFileSync('.env.local', 'utf8');
for (const line of env.split('\n')) {
  const m = line.match(/^([A-Z_0-9]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
}

const { reconcilePayments } = await import('../lib/reconcile');

const doApply = process.argv.includes('--apply');
const r = await reconcilePayments({ doApply, includeAll: true });

console.log(`\n모드: ${r.mode} / 검사 ${r.checked}건`);
console.log('요약:', r.summary);
console.log('\n=== 전체 ===');
console.table((r.all ?? []).map(d => ({
  결제ID: d.paymentId.slice(0, 20),
  우리: d.ours, 포트원: d.portone,
  판정: d.plan, 조치: d.applied ?? '-', 비고: d.note,
})));
process.exit(0);
