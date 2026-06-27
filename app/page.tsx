'use client';

import { useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import LandingPage from '@/components/landing/LandingPage';
import { AppProvider, useApp } from '@/store/AppContext';
import { USE_NEW_ENGINE } from '@/lib/engineFlag';
import { getActiveJobId, clearActiveJobId, markResumeIntent } from '@/lib/activeJob';
import { getJob } from '@/lib/historyDB';
import type { JobState } from '@/lib/pipelineJob';
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
  const { screen, go } = useApp();

  // 재진입 복구: 새로고침/탭 이탈 후, IndexedDB에 미완료 파이프라인 job이 있으면 s7로 돌려 마지막 지점부터 재개.
  const resumedRef = useRef(false);
  useEffect(() => {
    if (resumedRef.current || !USE_NEW_ENGINE) return;
    const id = getActiveJobId();
    if (!id || screen === 's7') return;
    resumedRef.current = true;
    (async () => {
      try {
        const job = await getJob<JobState>(id);
        const incomplete = !!job && job.stages.imagebrief.status !== 'done';
        if (incomplete) { markResumeIntent(); go('s7'); }
        else { clearActiveJobId(); }   // 완료됐거나 사라진 job → 마커 정리(자동 재개 안 함)
      } catch { clearActiveJobId(); }
    })();
  }, [screen, go]);

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
      {/* ★도우미는 본문에 영향 0인 순수 오버레이. .main에 chat-open 클래스를 붙이지 않는다 →
          도우미를 열어도 본문(미리보기·카드)의 width/margin이 전혀 바뀌지 않음. 도우미는 fixed로 본문 위에 뜸. */}
      <div className="main" style={{ paddingTop }}>
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
