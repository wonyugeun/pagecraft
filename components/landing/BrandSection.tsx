'use client';

const BRANDS = ['MONSTER LAB', 'comfy', 'BRIGHT MOOD', 'PURE DAILY', 'Greeny', 'MELLIFE'];

export default function BrandSection() {
  return (
    <section style={{
      padding: '60px 0',
      borderTop: '1px solid #F0EEF8',
      borderBottom: '1px solid #F0EEF8',
      fontFamily: "'Pretendard','Noto Sans KR',sans-serif",
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 36px' }}>
        <p style={{
          textAlign: 'center', fontSize: '14px',
          color: '#B0B8C1', marginBottom: '36px', letterSpacing: '-0.01em',
        }}>
          이미 많은 브랜드가 Flik와 함께하고 있습니다
        </p>
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '48px',
          flexWrap: 'wrap',
        }}>
          {BRANDS.map(b => (
            <span
              key={b}
              style={{
                fontSize: '16px',
                fontWeight: 700,
                color: '#C8CDD4',
                letterSpacing: b === 'comfy' ? '0.02em' : '0.05em',
                fontStyle: b === 'comfy' || b === 'Greeny' ? 'italic' : 'normal',
              }}
            >
              {b}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
