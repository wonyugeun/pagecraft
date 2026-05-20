'use client';

import { useState } from 'react';
import { useApp } from '@/store/AppContext';

const PLANS = [
  { id: 'p1', credits: 50,  price: '5,900',  perGen: 5,  badge: '' },
  { id: 'p2', credits: 120, price: '12,900', perGen: 12, badge: '인기' },
  { id: 'p3', credits: 300, price: '29,900', perGen: 30, badge: '베스트' },
];

export default function CreditModal() {
  const { credits, creditModalOpen, setCreditModalOpen } = useApp();
  const [selected, setSelected] = useState('p2');
  const [toast, setToast] = useState(false);

  if (!creditModalOpen) return null;

  const handleCharge = () => {
    setToast(true);
    setTimeout(() => setToast(false), 3000);
  };

  const isLow = credits < 20;

  return (
    <div className="modal-ov" onClick={() => setCreditModalOpen(false)}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        {/* 헤더 */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4 }}>
          <div className="modal-title">크레딧 충전</div>
          <button
            onClick={() => setCreditModalOpen(false)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#a8a59d', lineHeight: 1, padding: '2px 4px' }}
          >×</button>
        </div>

        {/* 현재 잔액 */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: isLow ? 'rgba(220,38,38,.06)' : 'rgba(124,58,237,.06)',
          border: `1px solid ${isLow ? 'rgba(220,38,38,.2)' : 'rgba(124,58,237,.15)'}`,
          borderRadius: 10, padding: '12px 16px', marginBottom: 20,
        }}>
          <span style={{ fontSize: 24 }}>{isLow ? '⚠️' : '⚡'}</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: isLow ? '#dc2626' : '#7c3aed' }}>
              현재 잔액 {credits} 크레딧
            </div>
            <div style={{ fontSize: 11, color: '#6b6860', marginTop: 2 }}>
              상세페이지 1회 생성 = 10 크레딧 · {Math.floor(credits / 10)}회 생성 가능
              {isLow && ' · 크레딧이 부족해요'}
            </div>
          </div>
        </div>

        {/* 충전 플랜 */}
        <div style={{ fontSize: 11, fontWeight: 700, color: '#a8a59d', letterSpacing: '0.05em', marginBottom: 10 }}>
          충전 플랜 선택
        </div>
        <div className="credit-plans">
          {PLANS.map(p => (
            <div
              key={p.id}
              className={`cplan${selected === p.id ? ' on' : ''}`}
              onClick={() => setSelected(p.id)}
            >
              <div>
                <div className="cplan-name">
                  ⚡ {p.credits} 크레딧
                  {p.badge && <span className="cplan-badge" style={{ marginLeft: 6 }}>{p.badge}</span>}
                </div>
                <div className="cplan-desc">상세페이지 {p.perGen}회 생성 가능</div>
              </div>
              <div className="cplan-price">₩{p.price}</div>
            </div>
          ))}
        </div>

        {/* 준비 중 토스트 */}
        {toast && (
          <div style={{
            background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 8,
            padding: '10px 14px', fontSize: 13, color: '#92400e',
            marginBottom: 12, textAlign: 'center', fontWeight: 600,
          }}>
            🔧 결제 기능은 준비 중이에요 — 곧 오픈됩니다!
          </div>
        )}

        <button
          className="modal-cta"
          onClick={handleCharge}
          style={{ opacity: 0.7, cursor: 'not-allowed' }}
        >
          충전하기 (결제 연동 준비 중)
        </button>
        <button className="modal-cancel" onClick={() => setCreditModalOpen(false)}>
          닫기
        </button>
      </div>
    </div>
  );
}
