'use client';

import { useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import LandingPage from '@/components/landing/LandingPage';
import { AppProvider, useApp } from '@/store/AppContext';
import { USE_NEW_ENGINE } from '@/lib/engineFlag';
import { getActiveJobId, clearActiveJobId, markResumeIntent } from '@/lib/activeJob';
import { getJob } from '@/lib/historyDB';
import { isResumableJob, type JobState } from '@/lib/pipelineJob';
import TopBar from '@/components/layout/TopBar';
import ProgressBar from '@/components/layout/ProgressBar';
import { useIsMobile } from '@/hooks/useIsMobile';
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

// ★모바일 자체 헤더(로고·크레딧·스텝)를 렌더하는 화면들 — 이 화면들은 모바일에서 앱 레벨
//   데스크톱 크롬(TopBar/ProgressBar)을 렌더하면 헤더·스텝이 2중 표시된다. 모바일 변형이 없는
//   화면(s0 로그인·s-quick·s-thumb·s3b 아웃풋)은 앱 크롬이 유일한 크롬이므로 그대로 유지.
const SCREENS_WITH_MOBILE_VARIANT = new Set(['s-dash', 's1', 's2', 's3', 's5', 's5-5', 's5b', 's6', 's7', 's8']);

function App() {
  const { screen, go } = useApp();
  const isMobile = useIsMobile();

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
        // ★정상 진행 중 job만 자동 재개 — 실패/stale(구버전, jobKey 없음)/완료 job은 마커 정리 후 재개 안 함.
        //   (실패 job 무한재개 → 빈 결과·slide→blog·이중과금 유발하던 경로 차단. isResumableJob 참고)
        if (isResumableJob(job)) { markResumeIntent(); go('s7'); }
        else { clearActiveJobId(); }
      } catch { clearActiveJobId(); }
    })();
  }, [screen, go]);

  const isDash = screen === 's-dash';
  const hasProgress = Boolean(STEP_MAP[screen]);
  // ★모바일 크롬 중복 방지 — 모바일 변형 화면은 자체 헤더/스텝을 그리므로 앱 크롬을 끄고 상단 여백 0.
  const mobileOwnsChrome = isMobile && SCREENS_WITH_MOBILE_VARIANT.has(screen);
  const showTopBar = !isDash && !mobileOwnsChrome;
  const showProgress = hasProgress && !mobileOwnsChrome;
  const paddingTop = mobileOwnsChrome ? 0 : isDash ? 0 : screen === 's0' ? 56 : hasProgress ? 106 : 56;

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
      {showTopBar && <TopBar />}
      {showProgress && <ProgressBar />}
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
