import Link from 'next/link';
import { CHANGELOG, PRODUCT_VERSION } from '@/data/version';

/**
 * 업데이트 내역(2026-08-04).
 *
 * ★버전 숫자만 있고 내용이 없으면 허세로 보인다. 한 줄씩이라도 적혀 있으면 근거가 된다.
 * ⚠️여기 적는 말은 셀러가 읽을 말이어야 한다 — 파이프라인·아키타입 같은 내부 용어 금지.
 *   "무엇이 좋아졌나"가 아니라 "무엇이 달라졌나"를 쓴다(성과 약속은 근거를 대야 한다).
 */
export const metadata = {
  title: '업데이트 내역 — Flik',
  description: 'Flik이 무엇을 바꿔왔는지 버전별로 정리했습니다.',
};

export default function ChangelogPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#FAFAFC', fontFamily: 'var(--f)' }}>
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '64px 24px 100px' }}>
        <Link href="/" style={{ fontSize: 13, color: '#6D4CFF', fontWeight: 700, textDecoration: 'none' }}>
          ← Flik으로 돌아가기
        </Link>

        <h1 style={{ fontSize: 34, fontWeight: 800, color: '#191F28', letterSpacing: '-0.03em', margin: '22px 0 8px' }}>
          업데이트 내역
        </h1>
        <p style={{ fontSize: 15, color: '#8B95A1', lineHeight: 1.7, marginBottom: 44 }}>
          버전 숫자는 상세페이지를 만드는 엔진이 실제로 바뀔 때만 올립니다.
          지금은 <b style={{ color: '#6D4CFF', fontWeight: 700 }}>{PRODUCT_VERSION}</b>입니다.
        </p>

        {CHANGELOG.map((r, i) => (
          <section key={r.version} style={{ marginBottom: 40 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 10 }}>
              <span style={{
                fontSize: 15, fontWeight: 800,
                color: i === 0 ? '#6D4CFF' : '#8B95A1',
                background: i === 0 ? '#F0ECFF' : '#F4F4F8',
                border: `1px solid ${i === 0 ? '#E6DEFF' : '#ECECF2'}`,
                borderRadius: 999, padding: '3px 12px',
              }}>{r.version}</span>
              <span style={{ fontSize: 12.5, color: '#B0B8C1' }}>{r.date}</span>
            </div>

            <h2 style={{ fontSize: 19, fontWeight: 700, color: '#191F28', marginBottom: 14, letterSpacing: '-0.02em', wordBreak: 'keep-all' }}>
              {r.title}
            </h2>

            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {r.items.map(it => (
                <li key={it} style={{
                  position: 'relative', paddingLeft: 18, marginBottom: 9,
                  fontSize: 14.5, lineHeight: 1.8, color: '#4E5968', wordBreak: 'keep-all',
                }}>
                  <span style={{ position: 'absolute', left: 2, top: 0, color: '#C3C8D0' }}>·</span>
                  {it}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
