'use client';

import { useApp } from '@/store/AppContext';

export default function CreditModal() {
  const { credits, creditModalOpen, setCreditModalOpen } = useApp();

  if (!creditModalOpen) return null;

  const isLow = credits < 20;

  return (
    <div className="modal-ov" onClick={() => setCreditModalOpen(false)}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        {/* 헤더 */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4 }}>
          <div className="modal-title">크레딧 안내</div>
          <button
            onClick={() => setCreditModalOpen(false)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#a8a59d', lineHeight: 1, padding: '2px 4px' }}
          >×</button>
        </div>

        {/* 현재 잔액 */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: isLow ? 'rgba(220,38,38,.06)' : 'rgba(109,76,255,.06)',
          border: `1px solid ${isLow ? 'rgba(220,38,38,.2)' : 'rgba(109,76,255,.15)'}`,
          borderRadius: 10, padding: '12px 16px', marginBottom: 20,
        }}>
          <span style={{ fontSize: 24 }}>{isLow ? '⚠️' : '⚡'}</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: isLow ? '#dc2626' : '#6D4CFF' }}>
              현재 잔액 {credits} 크레딧
            </div>
            <div style={{ fontSize: 11, color: '#6b6860', marginTop: 2 }}>
              상세페이지는 섹션 1개당 1크레딧이 차감돼요
              {isLow && ' · 크레딧이 부족해요'}
            </div>
          </div>
        </div>

        {/* ★결제 미연동(무료 베타) — 가격표·충전 CTA 제거. 결제 붙일 때 플랜 UI 복원 예정.
            가격표가 뜨는데 결제가 안 되면 혼란 → '요금제 준비 중'으로 정직하게 안내. */}
        <div style={{
          background: '#F4F0FF', border: '1px solid rgba(109,76,255,.15)', borderRadius: 10,
          padding: '14px 16px', marginBottom: 16,
        }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#6D4CFF', marginBottom: 4 }}>
            🎁 지금은 베타 무료 기간이에요
          </div>
          <div style={{ fontSize: 12, color: '#6b6860', lineHeight: 1.6 }}>
            {isLow
              ? '무료 크레딧을 모두 사용하셨어요. 정식 요금제는 준비 중이며, 도입 시 미리 안내드릴게요.'
              : '정식 요금제(크레딧 충전)는 준비 중이에요. 도입 시 미리 안내드릴게요.'}
          </div>
        </div>

        <button className="modal-cancel" onClick={() => setCreditModalOpen(false)}>
          닫기
        </button>
      </div>
    </div>
  );
}
