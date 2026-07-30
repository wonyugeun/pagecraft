'use client';

import { Zap, X, ArrowUpRight } from 'lucide-react';
import { useApp } from '@/store/AppContext';
import { PLANS, PROMO } from '@/data/plans';

/**
 * 내 크레딧 모달 — 상단바 크레딧 칩을 누르면 열린다.
 *
 * ★역할(2026-07-30 재설계): 잔액을 크게 보여주고 → 충전으로 넘긴다. 그게 전부다.
 *   기존엔 플랜 목록을 모달에 그대로 늘어놓아 요금제 페이지와 중복되고 초점이 흐렸다.
 * ★충전은 /pricing을 새 탭으로 연다 — 생성 중에 앱을 벗어나면 작업이 끊기므로.
 */
export default function CreditModal() {
  const { credits, creditModalOpen, setCreditModalOpen } = useApp();

  if (!creditModalOpen) return null;

  const isLow = credits < 16;   // 상세페이지 1회(16섹션) 미만이면 부족 안내
  const close = () => setCreditModalOpen(false);

  return (
    <div
      onClick={close}
      style={{
        position: 'fixed', inset: 0, zIndex: 900,
        background: 'rgba(17,17,26,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 'min(420px, 100%)', background: '#fff', borderRadius: 20,
          padding: '24px 24px 20px',
          boxShadow: '0 20px 60px rgba(17,17,26,0.25)',
          fontFamily: 'var(--f)',
        }}
      >
        {/* 헤더 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <span style={{ fontSize: 17, fontWeight: 800, color: '#191F28', letterSpacing: '-0.02em' }}>
            내 크레딧
          </span>
          <button
            onClick={close}
            aria-label="닫기"
            style={{
              width: 30, height: 30, borderRadius: 8, border: 'none', background: '#F4F4F8',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: '#8B95A1',
            }}
          >
            <X size={16} strokeWidth={2.2} />
          </button>
        </div>

        {/* 잔액 — 이 모달의 주인공 */}
        <div style={{
          background: '#FAFAFC', border: '1px solid #ECECF2', borderRadius: 16,
          padding: '26px 20px', textAlign: 'center', marginBottom: 18,
        }}>
          <div style={{ fontSize: 12.5, color: '#8B95A1', fontWeight: 600, marginBottom: 10 }}>
            보유 크레딧
          </div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 9 }}>
            <Zap size={26} color="#6D4CFF" fill="#6D4CFF" strokeWidth={1.5} />
            <span style={{
              fontSize: 40, fontWeight: 800, color: '#191F28',
              letterSpacing: '-0.04em', lineHeight: 1,
            }}>{credits}</span>
          </div>
        </div>

        {/* 사용 기준 */}
        <div style={{ display: 'grid', gap: 10, marginBottom: 18 }}>
          {[
            ['상세페이지 생성', '섹션 1개당 1크레딧'],
            ['섹션당 첫 이미지', '추가 비용 없이 포함'],
            // 유효기간은 플랜별로 다르므로 범위로 안내(정확한 값은 요금제 페이지)
            ['유효기간', `충전 플랜에 따라 ${Math.min(...PLANS.map(p => p.validMonths))}~${Math.max(...PLANS.map(p => p.validMonths))}개월`],
          ].map(([k, v]) => (
            <div key={k} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <span style={{ fontSize: 13, color: '#8B95A1' }}>{k}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#4E5968', textAlign: 'right' }}>{v}</span>
            </div>
          ))}
        </div>

        {isLow && (
          <div style={{
            background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 10,
            padding: '11px 14px', marginBottom: 16,
            fontSize: 12.5, color: '#92400E', lineHeight: 1.6,
          }}>
            상세페이지 1개(16섹션)를 만들기에 크레딧이 부족해요.
          </div>
        )}

        {/* 충전 — 새 탭으로 요금제 열기(생성 중 작업 끊김 방지) */}
        <a
          href="/pricing"
          target="_blank"
          rel="noopener noreferrer"
          onClick={close}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            background: '#6D4CFF', color: '#fff', textDecoration: 'none',
            borderRadius: 12, padding: '15px 0',
            fontSize: 15, fontWeight: 700, letterSpacing: '-0.01em',
          }}
        >
          충전하기
          <ArrowUpRight size={17} strokeWidth={2.4} />
        </a>

        {PROMO.active && (
          <div style={{ textAlign: 'center', fontSize: 12, color: '#6D4CFF', fontWeight: 600, marginTop: 11 }}>
            {PROMO.label} 진행 중 · {PROMO.changesOn}부터 정가 적용
          </div>
        )}
      </div>
    </div>
  );
}
