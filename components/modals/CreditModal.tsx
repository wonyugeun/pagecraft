'use client';

import { useApp } from '@/store/AppContext';
import { PLANS, pricePerCredit } from '@/data/plans';

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

        {/* ★요금제 확정(2026-07-29) — 가격은 data/plans.ts 단일 소스.
            결제 배관(PG)은 승인 절차 진행 중이라 '충전' 버튼 대신 안내만 표시한다.
            PG 연동 완료 시 각 카드에 결제 요청 핸들러만 붙이면 된다. */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: '#111', marginBottom: 8 }}>
            크레딧 충전
          </div>
          <div style={{ display: 'grid', gap: 8 }}>
            {PLANS.map(pl => (
              <div
                key={pl.id}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
                  border: `1px solid ${pl.recommended ? '#D8CFFF' : '#ECECF2'}`,
                  background: pl.recommended ? '#F8F6FF' : '#fff',
                  borderRadius: 10, padding: '11px 13px',
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#191F28' }}>
                    {pl.name}
                    {pl.recommended && (
                      <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 700, color: '#6D4CFF', background: '#EDE8FF', borderRadius: 999, padding: '2px 7px' }}>추천</span>
                    )}
                  </div>
                  <div style={{ fontSize: 11.5, color: '#8B95A1', marginTop: 2 }}>
                    크레딧 {pl.credits}개 · 개당 {pricePerCredit(pl).toLocaleString('ko-KR')}원
                  </div>
                </div>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#191F28', whiteSpace: 'nowrap' }}>
                  {pl.price.toLocaleString('ko-KR')}원
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{
          background: '#F4F0FF', border: '1px solid rgba(109,76,255,.15)', borderRadius: 10,
          padding: '13px 15px', marginBottom: 16,
        }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: '#6D4CFF', marginBottom: 4 }}>
            {isLow ? '체험 크레딧을 모두 사용하셨어요' : '🎁 신규 가입 체험 크레딧 16개'}
          </div>
          <div style={{ fontSize: 12, color: '#6b6860', lineHeight: 1.6 }}>
            섹션 1개당 1크레딧이 차감돼요. 카드 결제는 승인 절차가 끝나는 대로 열립니다 — 준비되면 바로 안내드릴게요.
          </div>
        </div>

        <button className="modal-cancel" onClick={() => setCreditModalOpen(false)}>
          닫기
        </button>
      </div>
    </div>
  );
}
