'use client';

import { useRouter } from 'next/navigation';
import {
  Sparkles,
  LayoutGrid,
  Zap, CreditCard, ShieldCheck, Wand2, Download, PencilLine, ChevronRight,
} from 'lucide-react';

const TRUST_BADGES = [
  { Icon: Zap, label: '회원가입 즉시 사용' },
  { Icon: CreditCard, label: '신용카드 등록 불필요' },
  { Icon: ShieldCheck, label: '고퀄리티 결과물 보장' },
];

const FEATURES = [
  { Icon: Sparkles, title: 'AI 자동 생성', desc: '상품 정보만 입력하면 AI가 최적의 레이아웃과 문구, 이미지를 자동으로 구성해 드려요.' },
  { Icon: LayoutGrid, title: '다양한 템플릿', desc: '업종별·상품별 맞춤 템플릿으로 브랜드에 딱 맞는 디자인을 선택할 수 있어요.' },
  { Icon: Wand2, title: '간편한 수정', desc: '생성된 상세페이지를 손쉽게 수정하고 나만의 콘텐츠로 바꿀 수 있어요.' },
  { Icon: Download, title: '바로 다운로드', desc: '완성된 상세페이지를 이미지 또는 PDF로 내려받아 바로 사용할 수 있어요.' },
];

const STEPS = [
  { Icon: PencilLine, title: '상품 정보 입력', desc: '상품명, 특징, 이미지 등 기본 정보를 입력해 주세요.' },
  { Icon: Sparkles, title: 'AI 자동 생성', desc: 'AI가 입력된 정보를 분석해 자동으로 상세페이지를 생성해요.' },
  { Icon: Download, title: '다운로드 & 활용', desc: '완성된 상세페이지를 다운받아 스마트스토어·자사몰 등에 활용하세요.' },
];

export default function LandingPageMobile() {
  const router = useRouter();
  return (
    <div style={{
      minHeight: '100vh',
      background: '#FAFAFC',
      fontFamily: 'Pretendard, sans-serif',
      paddingBottom: '32px',
    }}>

      {/* 1) 상단 바 */}
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '20px 24px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/logo-flik.png" alt="Flik" style={{ height: '32px', width: 'auto', objectFit: 'contain', display: 'block' }} />
        </div>
        <button onClick={() => router.push('/login')} style={{
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
              상세페이지,
            </h1>
            <h1 style={{
              marginTop: '6px',
              fontSize: '24px', fontWeight: 800, lineHeight: 1.25,
              color: '#111', letterSpacing: '-0.02em',
            }}>
              <span style={{ color: '#6D4CFF' }}>몇 분</span> 만에
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

      {/* 5) 신뢰배지 */}
      <section style={{ padding: '0 16px', marginTop: '40px' }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', gap: '8px',
          background: '#fff', border: '1px solid #ECECF2', borderRadius: '18px',
          padding: '16px 12px',
        }}>
          {TRUST_BADGES.map(({ Icon, label }) => (
            <div key={label} style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: '8px', textAlign: 'center',
            }}>
              <div style={{
                width: '36px', height: '36px', borderRadius: '10px',
                background: '#F4F0FF', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon size={18} color="#6D4CFF" />
              </div>
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#333', lineHeight: 1.3 }}>{label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* 6) 핵심 기능 */}
      <section style={{ padding: '0 16px', marginTop: '32px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#111', letterSpacing: '-0.02em' }}>
          <span style={{ color: '#6D4CFF' }}>Flik</span>의 핵심 기능
        </h2>
        <div style={{ marginTop: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          {FEATURES.map(({ Icon, title, desc }) => (
            <div key={title} style={{
              background: '#fff', border: '1px solid #ECECF2', borderRadius: '16px', padding: '16px',
            }}>
              <div style={{
                width: '40px', height: '40px', borderRadius: '12px',
                background: '#F4F0FF', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon size={20} color="#6D4CFF" />
              </div>
              <h3 style={{ marginTop: '12px', fontSize: '14px', fontWeight: 700, color: '#111' }}>{title}</h3>
              <p style={{ marginTop: '6px', fontSize: '12px', lineHeight: 1.5, color: '#666' }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 7) HOW IT WORKS */}
      <section style={{ padding: '0 16px', marginTop: '36px' }}>
        <span style={{ fontSize: '11px', fontWeight: 700, color: '#6D4CFF', letterSpacing: '0.06em' }}>HOW IT WORKS</span>
        <h2 style={{ marginTop: '6px', fontSize: '18px', fontWeight: 800, color: '#111', letterSpacing: '-0.02em' }}>
          단 3단계로 완성되는 상세페이지
        </h2>
        <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {STEPS.map(({ Icon, title, desc }, i) => (
            <div key={title} style={{
              display: 'flex', alignItems: 'flex-start', gap: '12px',
              background: '#fff', border: '1px solid #ECECF2', borderRadius: '16px', padding: '16px',
            }}>
              <div style={{
                width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0,
                background: '#6D4CFF', color: '#fff', fontSize: '13px', fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>{i + 1}</div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Icon size={16} color="#6D4CFF" />
                  <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#111' }}>{title}</h3>
                </div>
                <p style={{ marginTop: '4px', fontSize: '12px', lineHeight: 1.5, color: '#666' }}>{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 8) CTA */}
      <section style={{ padding: '0 16px', marginTop: '36px' }}>
        <div style={{
          background: 'linear-gradient(135deg, #6D4CFF 0%, #5A3EE0 100%)',
          borderRadius: '20px', padding: '28px 24px',
          boxShadow: '0 12px 28px rgba(109,76,255,0.28)',
        }}>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#fff', lineHeight: 1.35, letterSpacing: '-0.02em' }}>
            지금 바로 AI<br />상세페이지를 경험해 보세요
          </h2>
          <p style={{ marginTop: '10px', fontSize: '12px', color: 'rgba(255,255,255,0.85)' }}>
            회원가입만 하면 바로 무료로 시작할 수 있어요!
          </p>
          <button onClick={() => router.push('/login')} style={{
            marginTop: '18px', width: '100%',
            background: '#fff', color: '#6D4CFF',
            fontSize: '14px', fontWeight: 700, border: 'none', borderRadius: '14px',
            padding: '14px', cursor: 'pointer', fontFamily: 'inherit',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
          }}>
            무료로 시작하기 <ChevronRight size={16} />
          </button>
        </div>
      </section>

      {/* (하단 탭바 제거 — 홈 외 4개 탭이 목적지 없는 죽은 컨트롤이라 삭제. 로그인 전 랜딩이라 앱 네비 불필요) */}

    </div>
  );
}
