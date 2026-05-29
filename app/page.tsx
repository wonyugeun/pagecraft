'use client';

import { useSession } from 'next-auth/react';
import LandingPage from '@/components/landing/LandingPage';
import { AppProvider, useApp } from '@/store/AppContext';
import TopBar from '@/components/layout/TopBar';
import ProgressBar from '@/components/layout/ProgressBar';
import ChatPanel from '@/components/layout/ChatPanel';
import LoginScreen from '@/components/screens/LoginScreen';
import DashboardScreen from '@/components/screens/DashboardScreen';
import CategoryScreen from '@/components/screens/CategoryScreen';
import ChannelScreen from '@/components/screens/ChannelScreen';
import TypeScreen from '@/components/screens/TypeScreen';
import ProductScreen from '@/components/screens/ProductScreen';
import ImageScreen from '@/components/screens/ImageScreen';
import GeneratingScreen from '@/components/screens/GeneratingScreen';
import ResultScreen from '@/components/screens/ResultScreen';
import ReferenceScreen from '@/components/screens/ReferenceScreen';
import SectionStructureScreen from '@/components/screens/SectionStructureScreen';
import CreditModal from '@/components/modals/CreditModal';
import QuickScreen from '@/components/screens/QuickScreen';
import ThumbScreen from '@/components/screens/ThumbScreen';
import OutputScreen from '@/components/screens/OutputScreen';
import { STEP_MAP } from '@/store/AppContext';

function App() {
  const { screen, chatOpen } = useApp();
  const isDash = screen === 's-dash';
  const hasProgress = Boolean(STEP_MAP[screen]);
  const paddingTop = isDash ? 0 : screen === 's0' ? 56 : hasProgress ? 106 : 56;

  const screenMap: Record<string, React.ReactNode> = {
    's0': <LoginScreen />,
    's-dash': <DashboardScreen />,
    's-quick': <QuickScreen />,
    's-thumb': <ThumbScreen />,
    's1': <CategoryScreen />,
    's2': <ChannelScreen />,
    's3': <TypeScreen />,
    's3b': <OutputScreen />,
    's5': <ProductScreen />,
    's5-5': <ReferenceScreen />,
    's5b': <SectionStructureScreen />,
    's6': <ImageScreen />,
    's7': <GeneratingScreen />,
    's8': <ResultScreen />,
  };

  return (
    <>
      {!isDash && <TopBar />}
      {hasProgress && <ProgressBar />}
      <div className={`main${chatOpen ? ' chat-open' : ''}`} style={{ paddingTop }}>
        <div className="scr">
          {screenMap[screen] || <LoginScreen />}
        </div>
      </div>
      <ChatPanel />
      <CreditModal />
    </>
  );
}

function PageRouter() {
  const { status } = useSession();

  // 로그인 여부 확인 전 로딩 중: 랜딩 표시 (깜빡임 방지)
  if (status === 'unauthenticated') return <LandingPage />;

  return (
    <AppProvider>
      <App />
    </AppProvider>
  );
}

export default function Page() {
  return <PageRouter />;
}
