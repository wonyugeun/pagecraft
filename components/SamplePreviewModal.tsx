'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';

/**
 * 형태 예시 보기(2026-08-02) — 상품정보 화면 우측에 붙어 있던 작은 미리보기를 여기로 옮겼다.
 *
 * ★왜 옮겼나: 그건 다른 상품의 완성본이라 셀러가 채우는 정보와 아무 관계가 없었다.
 *   정보 입력 화면에서 곁눈질할 것이 아니라, 형태를 고르는 시작 화면에서 제대로 봐야 하는 것이다.
 *   290px 카드에 40%로 축소해 넣던 걸 전체 화면으로 띄운다.
 *
 * ⚠️'당신의 결과물'처럼 보이게 하지 말 것. 다른 상품으로 만든 실제 결과물이고,
 *   화면에도 그렇게 적는다. 셀러의 상품과 섞어 보이면 결과를 약속한 것이 된다.
 */

const BLOG_SAMPLE_HTML = '/previews/bochan-blog.html';            // 보우짱 밤호박 — 블로그형 실생성 HTML
const SLIDE_SAMPLE_IMG = '/images/landing/showcase-vitamin.jpg';  // 밸런스랩 멀티비타민 — 슬라이드형 실생성 통이미지

const META = {
  blog:  { name: '블로그형', product: '보우짱 밤호박', note: '글은 이미지가 아니라 진짜 텍스트로 만들어져요 — 그래서 네이버 검색에 걸립니다.' },
  slide: { name: '슬라이드형', product: '밸런스랩 멀티비타민', note: '글자가 이미지 안에 들어갑니다 — 작은 화면에서도 크게 읽혀요.' },
} as const;

export default function SamplePreviewModal({ tab, onTab, onClose }: {
  tab: 'blog' | 'slide';
  onTab: (t: 'blog' | 'slide') => void;
  onClose: () => void;
}) {
  // 열려 있는 동안 뒤쪽 스크롤을 막는다 — 안 막으면 모달 끝에서 배경이 밀린다
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', esc);
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', esc); };
  }, [onClose]);

  const m = META[tab];

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(15,15,25,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 560, maxHeight: '90vh', background: '#fff',
          borderRadius: 18, overflow: 'hidden', display: 'flex', flexDirection: 'column',
          fontFamily: 'var(--f)', boxShadow: '0 24px 70px rgba(0,0,0,0.28)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 18px 13px', borderBottom: '1px solid #F1F1F5' }}>
          <b style={{ fontSize: 15 }}>실제로 만든 예시</b>
          <span style={{ fontSize: 12, color: '#8B95A1' }}>{m.product}</span>
          <button
            onClick={onClose}
            style={{ marginLeft: 'auto', border: 'none', background: 'none', cursor: 'pointer', color: '#8B95A1', display: 'flex', padding: 4 }}
            aria-label="닫기"
          ><X size={19} /></button>
        </div>

        <div style={{ display: 'flex', gap: 6, padding: '12px 18px 0' }}>
          {(['blog', 'slide'] as const).map(t => (
            <button
              key={t} onClick={() => onTab(t)}
              style={{
                flex: 1, padding: '9px 0', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                borderRadius: 10, border: `1.5px solid ${tab === t ? '#6D4CFF' : '#ECECF2'}`,
                background: tab === t ? '#F7F4FF' : '#fff', color: tab === t ? '#6D4CFF' : '#8B95A1',
              }}
            >{META[t].name}</button>
          ))}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 18px 0', minHeight: 0 }}>
          {tab === 'blog' ? (
            <iframe
              src={BLOG_SAMPLE_HTML}
              title="블로그형 실제 생성 예시 — 보우짱 밤호박"
              style={{ width: '100%', height: '58vh', border: '1px solid #ECECF2', borderRadius: 12, display: 'block', background: '#fff' }}
            />
          ) : (
            <div style={{ border: '1px solid #ECECF2', borderRadius: 12, overflow: 'hidden' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={SLIDE_SAMPLE_IMG} alt="슬라이드형 실제 생성 예시 — 밸런스랩 멀티비타민" style={{ width: '100%', display: 'block' }} />
            </div>
          )}
          <p style={{ fontSize: 12.5, lineHeight: 1.7, color: '#4E5968', background: '#F7F6FD', borderRadius: 10, padding: '11px 14px', margin: '13px 0 18px' }}>
            {m.note}
          </p>
        </div>
      </div>
    </div>
  );
}
