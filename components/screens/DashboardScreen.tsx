'use client';

import { useApp } from '@/store/AppContext';

export default function DashboardScreen() {
  const { startDetail, go } = useApp();

  return (
    <div className="dash-wrap">
      <div className="dash-hi">안녕하세요, 유근님 👋</div>
      <div className="dash-sub">무엇을 만들어볼까요?</div>

      <div className="dash-main-card" onClick={startDetail} style={{ borderLeft: '3px solid var(--ac)' }}>
        <div className="dmc-inner">
          <div className="dmc-ico" style={{ background: 'var(--al)' }}>📄</div>
          <div className="dmc-body">
            <div className="dmc-badge" style={{ background: 'var(--al)', color: 'var(--ac)' }}>완성형 상세페이지</div>
            <div className="dmc-title">상세페이지 만들기</div>
            <div className="dmc-desc">
              카테고리·채널·타입 선택 → AI가 카피+이미지 구조 완성<br />
              기본형 / 프리미엄형 · 블로그형(글+그림) 포함
            </div>
          </div>
          <div className="dmc-arr">→</div>
        </div>
      </div>

      <div className="dash-sub-grid">
        <div className="dash-sub-card" onClick={() => go('s-quick')}>
          <div className="dsc-badge" style={{ background: 'var(--aml)', color: 'var(--am)' }}>⚡ 빠른 제작</div>
          <div className="dsc-ico">🔖</div>
          <div className="dsc-title">빠른 제작</div>
          <div className="dsc-desc">위탁판매형 · 낱장형<br />채널 선택 없이 바로 시작</div>
        </div>
        <div className="dash-sub-card" onClick={() => go('s-thumb')}>
          <div className="dsc-badge" style={{ background: 'rgba(124,58,237,.08)', color: 'var(--pu)' }}>🖼️ 썸네일</div>
          <div className="dsc-ico">🖼️</div>
          <div className="dsc-title">썸네일 만들기</div>
          <div className="dsc-desc">채널 최적화 썸네일<br />1~3장 빠르게 생성</div>
        </div>
      </div>

      <div className="dash-hist-title">최근 작업</div>
      <div className="dash-empty">📂 아직 작업 이력이 없어요. 위에서 시작해보세요!</div>
    </div>
  );
}
