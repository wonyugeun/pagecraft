import Link from 'next/link';
import MarketingPage from '@/components/landing/MarketingPage';

/**
 * 문의하기 — 실제 존재하는 채널만 안내(허구 채널 금지). 이메일 문의는 사업자 등록 후
 * legalContent의 문의 이메일과 함께 확정해 추가한다.
 */
export const metadata = { title: '문의하기 — Flik' };

const CHANNELS = [
  {
    emoji: '❓',
    title: '자주 묻는 질문',
    desc: '크레딧·다운로드·법적 표시 등 대부분의 궁금증은 FAQ에 정리돼 있어요.',
    href: '/faq',
    cta: 'FAQ 보러 가기 →',
  },
  {
    emoji: '📖',
    title: '사용 가이드',
    desc: '입력부터 다운로드까지, 결과물을 잘 뽑는 방법을 단계별로 안내합니다.',
    href: '/guide',
    cta: '가이드 보러 가기 →',
  },
  {
    emoji: '🤖',
    title: '서비스 내 AI 도우미',
    desc: '로그인 후 화면 상단의 AI 도우미를 열면 이용 중 궁금한 점을 바로 확인할 수 있어요.',
    href: '/login',
    cta: '로그인하기 →',
  },
];

export default function Page() {
  return (
    <MarketingPage
      title="문의하기"
      intro="궁금한 점이 있으신가요? 아래 채널에서 대부분 바로 해결됩니다."
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {CHANNELS.map(c => (
          <Link key={c.title} href={c.href} style={{ textDecoration: 'none' }}>
            <div style={{
              display: 'flex', gap: '18px', alignItems: 'flex-start',
              border: '1px solid #ECECF2', borderRadius: '16px', padding: '20px 22px',
              background: '#fff',
            }}>
              <div style={{
                width: '44px', height: '44px', flexShrink: 0, borderRadius: '12px',
                background: '#F4F2FF', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '20px',
              }}>
                {c.emoji}
              </div>
              <div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: '#191F28', marginBottom: '4px' }}>{c.title}</div>
                <p style={{ fontSize: '14px', lineHeight: 1.7, color: '#4E5968', margin: '0 0 8px' }}>{c.desc}</p>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#6D4CFF' }}>{c.cta}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <p style={{ fontSize: '13px', color: '#8B95A1', lineHeight: 1.7, marginTop: '32px' }}>
        이메일 문의 채널은 준비 중입니다. 오픈되면 이 페이지와 이용약관에 함께 안내드릴게요.
      </p>
    </MarketingPage>
  );
}
