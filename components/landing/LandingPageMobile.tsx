'use client';

import { useRouter } from 'next/navigation';
import {
  Menu,
  Sparkles,
  LayoutGrid,
  Home, SlidersHorizontal, Receipt, User,
} from 'lucide-react';

export default function LandingPageMobile() {
  const router = useRouter();
  return (
    <div style={{
      minHeight: '100vh',
      background: '#FAFAFC',
      fontFamily: 'Pretendard, sans-serif',
      paddingBottom: '80px',
    }}>

      {/* 1) 상단 바 */}
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '20px 24px',
      }}>
        <Menu size={24} color="#111" />
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '10px',
            background: '#6D4CFF', color: '#fff',
            fontSize: '18px', fontWeight: 800,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>P</div>
          <span style={{ fontSize: '20px', fontWeight: 700, color: '#111' }}>PageCraft</span>
        </div>
        <button style={{
          border: '1px solid #ECECF2', borderRadius: '12px',
          background: '#fff', color: '#111',
          padding: '8px 16px', fontSize: '14px', fontWeight: 600,
          cursor: 'pointer', fontFamily: 'inherit',
        }}>로그인</button>
      </header>

      {/* 2) 히어로 좌우 분할 — 좌:카피+버튼 / 우:제품카드 */}
      <section style={{ padding: '0 16px', marginTop: '16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', alignItems: 'start' }}>

          {/* 좌: 카피 + 버튼 */}
          <div>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '4px',
              background: '#F4F0FF', color: '#6D4CFF',
              fontSize: '11px', fontWeight: 600,
              borderRadius: '999px', padding: '5px 10px',
            }}>
              <Sparkles size={12} /> AI 상세페이지 자동 생성
            </span>

            <h1 style={{
              marginTop: '16px',
              fontSize: '24px', fontWeight: 800, lineHeight: 1.25,
              color: '#111', letterSpacing: '-0.02em',
            }}>
              AI가 만드는<br />
              고퀄리티 상세페이지,
            </h1>
            <h1 style={{
              marginTop: '6px',
              fontSize: '24px', fontWeight: 800, lineHeight: 1.25,
              color: '#111', letterSpacing: '-0.02em',
            }}>
              <span style={{ color: '#6D4CFF' }}>단 3분</span> 만에
            </h1>

            <p style={{
              marginTop: '14px',
              fontSize: '12px', fontWeight: 400, lineHeight: 1.55, color: '#666',
            }}>
              상품 정보만 입력하면 AI가 자동으로 매력적인 상세페이지를 완성해 드려요.
            </p>

            <div style={{ marginTop: '20px' }}>
              <button onClick={() => router.push('/login')} style={{
                width: '100%',
                background: '#6D4CFF', color: '#fff',
                fontSize: '14px', fontWeight: 700,
                borderRadius: '14px', border: 'none',
                padding: '14px',
                cursor: 'pointer', fontFamily: 'inherit',
                boxShadow: '0 8px 20px rgba(109,76,255,0.3)',
              }}>무료로 시작하기 →</button>
            </div>
          </div>

          {/* 우: 제품 미리보기 통이미지 */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/landing/hero-product.png"
            alt="제품 미리보기"
            style={{
              width: '100%', height: 'auto', display: 'block',
              borderRadius: '18px',
            }}
          />
        </div>
      </section>

      {/* 5+6+7) 신뢰배지 + 기능 + HowItWorks 통이미지 */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/landing/section-mid.png"
        alt="핵심 기능과 이용 방법"
        style={{
          width: '100%', height: 'auto', display: 'block',
          marginTop: '40px',
        }}
      />

      {/* 9) 하단 고정 탭바 */}
      <nav style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: '#fff', borderTop: '1px solid #ECECF2',
        padding: '10px 0',
        display: 'flex', justifyContent: 'space-around',
        zIndex: 100,
      }}>
        {[
          { Icon: Home,              label: '홈',     active: true  },
          { Icon: SlidersHorizontal, label: '기능',   active: false },
          { Icon: LayoutGrid,        label: '템플릿', active: false },
          { Icon: Receipt,           label: '요금제', active: false },
          { Icon: User,              label: '마이',   active: false },
        ].map(({ Icon, label, active }) => {
          const color = active ? '#6D4CFF' : '#999';
          return (
            <div key={label} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
            }}>
              <Icon size={22} color={color} fill={active ? '#6D4CFF' : 'none'} />
              <span style={{ fontSize: '11px', color, fontWeight: active ? 700 : 400 }}>{label}</span>
            </div>
          );
        })}
      </nav>

    </div>
  );
}
