'use client';

import { useEffect } from 'react';

/**
 * 타입 화면 실제 생성 예시 모달(2026-07-27) — 섹션 흐름 텍스트만으론 감이 안 와서,
 * Flik이 실제 생성한 페이지 전체를 스크롤로 보여준다. 이미지는 열 때만 로드(1.4MB).
 */
export default function TypeExampleModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  // 모달 열림 동안 배경 스크롤 잠금
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  if (!open) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(17, 17, 26, 0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 'min(560px, 100%)', height: 'min(86vh, 900px)',
          background: '#fff', borderRadius: 20, overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        }}
      >
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 18px', borderBottom: '1px solid #F0EFF5', flexShrink: 0,
        }}>
          <div>
            <div style={{ fontSize: 14.5, fontWeight: 800, color: '#191F28', letterSpacing: '-0.02em' }}>
              실제 생성 예시
            </div>
            <div style={{ fontSize: 11.5, color: '#8B95A1', marginTop: 2 }}>
              건강기능식품 · Flik으로 생성한 실제 결과물이에요 — 스크롤해서 전체를 확인해보세요
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 32, height: 32, borderRadius: 10, border: 'none',
              background: '#F4F3F8', color: '#666', fontSize: 15, fontWeight: 700,
              cursor: 'pointer', flexShrink: 0, fontFamily: 'inherit',
            }}
          >
            ✕
          </button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', background: '#FAFAFC' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/example-premium.jpg"
            alt="Flik 실제 생성 상세페이지 예시"
            style={{ width: '100%', display: 'block' }}
          />
        </div>
      </div>
    </div>
  );
}
