'use client';

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
import { STEP_MAP } from '@/store/AppContext';

function QuickScreen() {
  const { go } = useApp();
  return (
    <div className="inner">
      <div className="stitle">빠른 제작</div>
      <div className="ssub">채널 선택 없이 바로 시작하는 두 가지 방식이에요</div>
      <div className="type-list">
        <div className="tc" onClick={() => alert('위탁판매형 플로우로 이동')}>
          <div className="tc-ico" style={{ background: '#fffbeb' }}>⚡</div>
          <div style={{ flex: 1 }}>
            <div className="tc-name">위탁판매형 <span className="tc-badge" style={{ background: '#fffbeb', color: 'var(--am)' }}>빠른 제작</span></div>
            <div className="tc-desc">중국 소싱 페이지나 타 쇼핑몰 URL을 넣으면 한국어 번역 + 핵심만 1~3장으로 압축합니다</div>
            <div className="tc-feats"><span className="feat">URL 자동번역</span><span className="feat">1~3섹션</span><span className="feat">빠른 업로드용</span></div>
          </div>
        </div>
        <div className="tc" onClick={() => alert('낱장형 플로우로 이동')}>
          <div className="tc-ico" style={{ background: 'var(--gl)' }}>🔖</div>
          <div style={{ flex: 1 }}>
            <div className="tc-name">낱장형 <span className="tc-badge" style={{ background: 'var(--gl)', color: 'var(--gn)' }}>필요한 것만</span></div>
            <div className="tc-desc">전체 상세페이지가 아닌, 내가 필요한 섹션 1~5장만 골라서 뽑습니다.</div>
            <div className="tc-feats"><span className="feat">섹션 직접 선택</span><span className="feat">1~5장</span><span className="feat">기존 페이지 보완</span></div>
          </div>
        </div>
      </div>
      <div className="cta-row">
        <button className="btn-back" onClick={() => go('s-dash')}>← 대시보드</button>
      </div>
    </div>
  );
}

function ThumbScreen() {
  const { go } = useApp();
  return (
    <div className="inner">
      <div className="stitle">썸네일 만들기</div>
      <div className="ssub">채널을 선택하면 최적 사이즈로 자동 생성됩니다 (추후 업데이트)</div>
      <div className="cta-row">
        <button className="btn-back" onClick={() => go('s-dash')}>← 대시보드</button>
      </div>
    </div>
  );
}

function BlogMockup() {
  return (
    <div style={{ height: 130, overflow: 'hidden', background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 6, padding: '10px 12px', width: '100%', boxSizing: 'border-box' }}>
      {/* 제목막대 */}
      <div style={{ height: 10, width: '70%', background: '#333', borderRadius: 3, marginBottom: 8 }} />
      {/* 이미지박스 */}
      <div style={{ height: 55, background: '#dbeafe', borderRadius: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginBottom: 8, gap: 3 }}>
        <span style={{ fontSize: 14 }}>📷</span>
        <span style={{ fontSize: 9, color: '#3b82f6', fontWeight: 600 }}>대표이미지</span>
      </div>
      {/* 텍스트 2줄 */}
      <div style={{ height: 7, width: '90%', background: '#ccc', borderRadius: 2, marginBottom: 5 }} />
      <div style={{ height: 7, width: '70%', background: '#ccc', borderRadius: 2 }} />
    </div>
  );
}

function SlideMockup() {
  return (
    <div style={{ height: 130, overflow: 'hidden', width: '100%', boxSizing: 'border-box', padding: '10px 2px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
        {[0, 1, 2, 3].map(i => (
          <div key={i} style={{ background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 4, overflow: 'hidden' }}>
            {/* 이미지영역 */}
            <div style={{ height: 40, background: i % 2 === 0 ? '#dbeafe' : '#ede9fe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 13 }}>📷</span>
            </div>
            {/* 텍스트막대 */}
            <div style={{ padding: '5px 6px' }}>
              <div style={{ height: 5, background: '#d1d5db', borderRadius: 2, marginBottom: 3 }} />
              <div style={{ height: 5, background: '#e5e7eb', borderRadius: 2, width: '62%' }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function OutputScreen() {
  const { ch, type, out, setOut, go } = useApp();
  return (
    <div className="inner">
      <div className="stitle">어떤 형태로 출력할까요?</div>
      <div className="ssub">{ch} · {type} — 출력 형태를 선택해주세요 — 나중에 변경도 가능합니다</div>
      <div className="output-grid">
        <div className={`oc${out === 'blog' ? ' on' : ''}`} onClick={() => setOut('blog')}>
          <div className="oc-ck">✓</div>
          <div className="oc-preview" style={{ padding: '10px 10px 4px' }}>
            <BlogMockup />
          </div>
          <div className="oc-body">
            {ch === '스마트스토어' && <div className="oc-rec">스마트스토어 추천</div>}
            <div className="oc-title">블로그형 (글+그림)</div>
            <div className="oc-desc">텍스트 카피와 이미지가 함께 나오는 블로그 스타일. 네이버 SEO에 유리하고 신뢰감이 높아요.</div>
          </div>
        </div>
        <div className={`oc${out === 'slide' ? ' on' : ''}`} onClick={() => setOut('slide')}>
          <div className="oc-ck">✓</div>
          <div className="oc-preview" style={{ padding: '10px 10px 4px' }}>
            <SlideMockup />
          </div>
          <div className="oc-body">
            <div className="oc-title">이미지 슬라이드형</div>
            <div className="oc-desc">이미지 위에 텍스트가 올라가는 형태. 시각적 임팩트가 강하고 쿠팡에 적합해요.</div>
          </div>
        </div>
      </div>
      <div className="cta-row">
        <button className="btn-back" onClick={() => go('s3')}>← 이전</button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="sel-hint" style={{ visibility: out ? 'visible' : 'hidden' }}>
            선택: <span className="hint-tag">{out === 'blog' ? '블로그형 (글+그림)' : '이미지 슬라이드형'}</span>
          </div>
          <button className="btn-next" disabled={!out} onClick={() => go('s4')}>상품 정보 입력 →</button>
        </div>
      </div>
    </div>
  );
}

function App() {
  const { screen, chatOpen } = useApp();
  const hasProgress = Boolean(STEP_MAP[screen]);
  const paddingTop = screen === 's0' ? 56 : hasProgress ? 106 : 56;

  const screenMap: Record<string, React.ReactNode> = {
    's0': <LoginScreen />,
    's-dash': <DashboardScreen />,
    's-quick': <QuickScreen />,
    's-thumb': <ThumbScreen />,
    's1': <CategoryScreen />,
    's2': <ChannelScreen />,
    's3': <TypeScreen />,
    's3b': <OutputScreen />,
    's4': <ProductScreen />,
    's5': <ImageScreen />,
    's5-5': <ReferenceScreen />,
    's6': <GeneratingScreen />,
    's7': <ResultScreen />,
  };

  return (
    <>
      <TopBar />
      {hasProgress && <ProgressBar />}
      <div className={`main${chatOpen ? ' chat-open' : ''}`} style={{ paddingTop }}>
        <div className="scr">
          {screenMap[screen] || <LoginScreen />}
        </div>
      </div>
      <ChatPanel />
    </>
  );
}

export default function Page() {
  return (
    <AppProvider>
      <App />
    </AppProvider>
  );
}
