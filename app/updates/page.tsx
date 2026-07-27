import MarketingPage from '@/components/landing/MarketingPage';
import { UPDATES } from '@/lib/updatesFeed';

/**
 * 업데이트 소식 — 내용은 lib/updatesFeed.ts 단일 소스(대시보드 새 소식 팝업과 공유).
 * 새 배포 시 updatesFeed의 UPDATES 맨 앞에 추가하면 팝업·페이지에 함께 반영된다.
 */
export const metadata = { title: '업데이트 소식 — Flik' };

export default function Page() {
  return (
    <MarketingPage
      title="업데이트 소식"
      intro="Flik이 어떻게 좋아지고 있는지 기록합니다. 셀러분들의 의견이 다음 줄이 됩니다."
    >
      {UPDATES.map(u => (
        <div key={u.id} style={{ marginBottom: 44 }}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: '#8B95A1', marginBottom: '6px' }}>{u.date}</div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#191F28', margin: '0 0 12px', letterSpacing: '-0.02em' }}>{u.title}</h2>
          <ul style={{ paddingLeft: '20px', margin: 0 }}>
            {u.items.map(it => (
              <li key={it} style={{ fontSize: '15px', lineHeight: 1.85, color: '#4E5968', marginBottom: '6px' }}>{it}</li>
            ))}
          </ul>
        </div>
      ))}
    </MarketingPage>
  );
}
