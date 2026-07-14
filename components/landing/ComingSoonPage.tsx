import LandingLayout from './LandingLayout';

interface Props {
  title: string;
  description?: string;
  emoji?: string;
}

export default function ComingSoonPage({ title, description, emoji = '🚀' }: Props) {
  return (
    <LandingLayout>
      <div style={{
        maxWidth: '800px',
        margin: '0 auto',
        padding: '120px 36px 160px',
        textAlign: 'center',
        fontFamily: "'Pretendard','Noto Sans KR',sans-serif",
      }}>
        <div style={{ fontSize: '64px', marginBottom: '24px', lineHeight: 1 }}>{emoji}</div>
        <div style={{
          display: 'inline-block',
          background: '#F4F2FF', color: '#6D4CFF',
          fontSize: '12px', fontWeight: 700,
          padding: '5px 14px', borderRadius: '100px',
          marginBottom: '20px', letterSpacing: '0.05em',
        }}>
          COMING SOON
        </div>
        <h1 style={{
          fontSize: '42px', fontWeight: 700, color: '#191F28',
          letterSpacing: '-0.03em', lineHeight: 1.2, marginBottom: '16px',
        }}>
          {title}
        </h1>
        <p style={{
          fontSize: '17px', color: '#8B95A1', lineHeight: 1.7,
          maxWidth: '480px', margin: '0 auto',
        }}>
          {description ?? '준비 중입니다. 빠른 시일 내에 업데이트될 예정이에요.'}
        </p>
      </div>
    </LandingLayout>
  );
}
