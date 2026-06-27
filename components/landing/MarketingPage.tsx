import LandingLayout from './LandingLayout';

/**
 * 마케팅 정적 페이지(소개·FAQ 등) 공용 틀. LandingLayout(nav/footer) 재사용 — 디자인 0접촉, 본문만.
 */
export default function MarketingPage({
  title, intro, children,
}: { title: string; intro?: string; children: React.ReactNode }) {
  return (
    <LandingLayout>
      <div style={{
        maxWidth: '760px', margin: '0 auto', padding: '72px 24px 140px',
        fontFamily: "'Pretendard','Noto Sans KR',sans-serif", color: '#333D4B',
      }}>
        <h1 style={{ fontSize: '34px', fontWeight: 700, color: '#191F28', letterSpacing: '-0.03em', marginBottom: intro ? '14px' : '36px', lineHeight: 1.25 }}>
          {title}
        </h1>
        {intro && (
          <p style={{ fontSize: '17px', lineHeight: 1.8, color: '#4E5968', marginBottom: '44px' }}>{intro}</p>
        )}
        {children}
      </div>
    </LandingLayout>
  );
}
