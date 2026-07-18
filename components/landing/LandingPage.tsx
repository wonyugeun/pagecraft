'use client';

import LandingNav from './LandingNav';
import HeroSection from './HeroSection';
import ShowcaseSection from './ShowcaseSection';
import FeaturesSection from './FeaturesSection';
import HowItWorksSection from './HowItWorksSection';
import CTASection from './CTASection';
import LandingFooter from './LandingFooter';
import LandingPageMobile from './LandingPageMobile';
import { useIsMobile } from '@/hooks/useIsMobile';

export default function LandingPage() {
  const isMobile = useIsMobile();
  if (isMobile) return <LandingPageMobile />;
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
          /* 히어로: 이미지 먼저, 카피 아래 */
          .hero-grid {
            grid-template-columns: 1fr !important;
            gap: 40px !important;
          }
          .hero-grid > *:first-child { order: 2; }
          .hero-card-wrap { order: 1; width: 100%; max-width: 600px; margin: 0 auto; }

          .hiw-img-wrap { max-width: 100% !important; }
          .landing-nav-menu { display: none !important; }
          .landing-hamburger { display: flex !important; }
          .features-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .hiw-grid { grid-template-columns: 1fr !important; gap: 48px !important; }
          .cta-grid { grid-template-columns: 1fr !important; padding: 48px 36px !important; text-align: center; }
          .footer-grid { grid-template-columns: 1fr 1fr !important; gap: 32px !important; }
        }

        @media (max-width: 768px) {
          .hero-grid { padding: 0 !important; }
          .hero-copy { padding-left: 0 !important; }
          .hero-grid h1 { font-size: 36px !important; }
          .hero-grid p { font-size: 14px !important; }
          .hero-card-wrap { max-width: 100% !important; }
          .features-grid { grid-template-columns: 1fr !important; }
          .hiw-grid { gap: 40px !important; }
          .cta-grid { padding: 40px 24px !important; }
          .cta-grid h2 { font-size: 28px !important; }
          .footer-grid { grid-template-columns: 1fr !important; }
        }

        @media (max-width: 480px) {
          .hero-grid h1 { font-size: 28px !important; }
        }
      `}</style>

      <div className="landing-root">
        <LandingNav />
        <main style={{ paddingTop: '64px' }}>
          <HeroSection />
          <ShowcaseSection />
          <FeaturesSection />
          <HowItWorksSection />
          <CTASection />
        </main>
        <LandingFooter />
      </div>
    </>
  );
}
