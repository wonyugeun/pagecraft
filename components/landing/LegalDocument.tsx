import LandingLayout from './LandingLayout';

/**
 * 법적 문서(이용약관·개인정보처리방침) 공용 렌더 컴포넌트.
 * LandingLayout(nav/footer)을 그대로 사용 — 디자인 0접촉, 본문 텍스트만 채움.
 */

export type LegalBlock = string | { list: string[] };

export interface LegalSection {
  heading: string;
  blocks: LegalBlock[];
}

interface Props {
  title: string;
  effectiveDate: string;   // 시행일 (예: '2026년 6월 27일')
  intro?: string;
  sections: LegalSection[];
}

export default function LegalDocument({ title, effectiveDate, intro, sections }: Props) {
  return (
    <LandingLayout>
      <div style={{
        maxWidth: '800px', margin: '0 auto', padding: '72px 24px 140px',
        fontFamily: "'Pretendard','Noto Sans KR',sans-serif", color: '#333D4B',
      }}>
        <h1 style={{ fontSize: '32px', fontWeight: 700, color: '#191F28', letterSpacing: '-0.03em', marginBottom: '8px' }}>
          {title}
        </h1>
        <p style={{ fontSize: '13px', color: '#8B95A1', marginBottom: intro ? '24px' : '40px' }}>
          시행일: {effectiveDate}
        </p>
        {intro && (
          <p style={{ fontSize: '15px', lineHeight: 1.8, color: '#4E5968', marginBottom: '40px' }}>{intro}</p>
        )}

        {sections.map((sec, i) => (
          <section key={i} style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#191F28', marginBottom: '12px', letterSpacing: '-0.02em' }}>
              {sec.heading}
            </h2>
            {sec.blocks.map((b, j) =>
              typeof b === 'string' ? (
                <p key={j} style={{ fontSize: '15px', lineHeight: 1.8, color: '#4E5968', margin: '0 0 10px' }}>{b}</p>
              ) : (
                <ul key={j} style={{ margin: '0 0 10px', paddingLeft: '20px' }}>
                  {b.list.map((li, k) => (
                    <li key={k} style={{ fontSize: '15px', lineHeight: 1.8, color: '#4E5968', marginBottom: '4px' }}>{li}</li>
                  ))}
                </ul>
              ),
            )}
          </section>
        ))}
      </div>
    </LandingLayout>
  );
}
