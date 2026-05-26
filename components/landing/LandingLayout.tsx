import LandingNav from './LandingNav';
import LandingFooter from './LandingFooter';

export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontFamily: "'Pretendard','Noto Sans KR',sans-serif",
      background: '#ffffff',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <LandingNav />
      <main style={{ paddingTop: '64px', flex: 1 }}>
        {children}
      </main>
      <LandingFooter />
    </div>
  );
}
