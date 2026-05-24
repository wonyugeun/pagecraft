'use client';

import LandingNav from './LandingNav';
import HeroSection from './HeroSection';
import BrandSection from './BrandSection';
import FeaturesSection from './FeaturesSection';
import HowItWorksSection from './HowItWorksSection';
import CTASection from './CTASection';
import LandingFooter from './LandingFooter';

export default function LandingPage() {
  return (
    <>
      <style>{`
        @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.css');

        .landing-root * { box-sizing: border-box; margin: 0; padding: 0; }
        .landing-root {
          font-family: 'Pretendard', 'Noto Sans KR', sans-serif;
          color: #191F28;
          -webkit-font-smoothing: antialiased;
        }

        /* 햄버거 메뉴: 모바일만 노출 */
        .landing-hamburger { display: none !important; }

        /* 반응형 */
        @media (max-width: 1024px) {
          .hero-grid {
            grid-template-columns: 1fr !important;
            gap: 48px !important;
          }
          .hero-card-wrap {
            max-width: 480px;
            margin: 0 auto;
            width: 100%;
          }
          .landing-nav-menu { display: none !important; }
          .landing-hamburger { display: flex !important; }
          .features-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
          .hiw-grid {
            grid-template-columns: 1fr !important;
            gap: 48px !important;
          }
          .cta-grid {
            grid-template-columns: 1fr !important;
            padding: 48px 36px !important;
            text-align: center;
          }
          .footer-grid {
            grid-template-columns: 1fr 1fr !important;
            gap: 32px !important;
          }
        }

        @media (max-width: 768px) {
          .hero-grid h1 { font-size: 34px !important; }
          .features-grid {
            grid-template-columns: 1fr !important;
          }
          .hiw-grid { gap: 40px !important; }
          .cta-grid { padding: 40px 24px !important; }
          .cta-grid h2 { font-size: 28px !important; }
          .footer-grid {
            grid-template-columns: 1fr !important;
          }
        }

        @media (max-width: 480px) {
          .hero-grid h1 { font-size: 28px !important; }
        }
      `}</style>

      <div className="landing-root">
        <LandingNav />
        <main style={{ paddingTop: '64px' }}>
          <HeroSection />
          <BrandSection />
          <FeaturesSection />
          <HowItWorksSection />
          <CTASection />
        </main>
        <LandingFooter />
      </div>
    </>
  );
}
