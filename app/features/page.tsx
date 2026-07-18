import MarketingPage from '@/components/landing/MarketingPage';

/**
 * 핵심 기능 — 실제 구현된 기능만 소개(없는 기능 광고 금지). about 페이지와 톤 일치.
 */
export const metadata = { title: '기능 — Flik' };

const FEATURES = [
  {
    emoji: '🎬',
    title: 'AI가 페이지 구조부터 설계',
    desc: '고정 템플릿에 내용을 채우는 방식이 아닙니다. AI가 상품 정보와 제품 사진을 읽고 광고 컨셉을 정한 뒤, 섹션마다 어떤 시각 구성(인물 컷·정보그래픽·질감 클로즈업·타이포)이 맞는지 직접 판단합니다. 같은 제품도 페이지마다 다른 구성이 나옵니다.',
  },
  {
    emoji: '🛡️',
    title: '표시광고 세이프가드',
    desc: '입력하지 않은 수치·인증·효능·후기를 만들어내지 않도록 생성 전 과정에 안전장치를 두었습니다. 건강기능식품은 식약처 고시형 문구 기준을 따르고, 의무 표시 항목으로 법적 고지 섹션이 자동 생성됩니다. (최종 검토 책임은 판매자에게 있습니다.)',
  },
  {
    emoji: '📸',
    title: '제품 원형 보존',
    desc: '업로드한 제품 사진의 형태·라벨을 기준으로 모든 섹션 이미지를 생성합니다. 보조컷(내용물·질감 실물)을 함께 올리면 알약·내용물 같은 요소도 전 섹션에서 같은 모양으로 유지됩니다.',
  },
  {
    emoji: '🧩',
    title: '카테고리 특화 입력',
    desc: '화장품·식품·건강·가전 등 카테고리마다 질문과 페이지 구조가 달라집니다. 건강기능식품의 기능성 표시, 식품의 보관·원산지처럼 그 카테고리에서 실제로 중요한 정보를 묻습니다.',
  },
  {
    emoji: '✏️',
    title: '섹션별 재생성·카피 수정',
    desc: '완성 후에도 섹션 단위로 이미지를 다시 생성하고(같은 작업 내 한도 제공), 헤드라인·본문을 직접 수정할 수 있습니다. 수정 내용은 자동 저장되고 히스토리에서 언제든 다시 열 수 있습니다.',
  },
  {
    emoji: '💳',
    title: '투명한 크레딧',
    desc: '섹션 1개당 1크레딧 — 만든 만큼만 차감됩니다. 생성이 실패해 이미지가 한 장도 만들어지지 않으면 자동 환불됩니다. 신규 가입 시 체험 크레딧 16개(상세페이지 1회 분량)를 드립니다.',
  },
];

const sectionTitle: React.CSSProperties = { fontSize: '20px', fontWeight: 700, color: '#191F28', margin: '0 0 8px', letterSpacing: '-0.02em' };

export default function Page() {
  return (
    <MarketingPage
      title="핵심 기능"
      intro="Flik은 '템플릿 채우기'가 아니라 '페이지 설계'를 자동화합니다. 실제로 구현되어 있는 기능만 소개합니다."
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '36px' }}>
        {FEATURES.map(f => (
          <div key={f.title} style={{ display: 'flex', gap: '18px', alignItems: 'flex-start' }}>
            <div style={{
              width: '48px', height: '48px', flexShrink: 0, borderRadius: '14px',
              background: '#F4F2FF', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '22px',
            }}>
              {f.emoji}
            </div>
            <div>
              <h2 style={sectionTitle}>{f.title}</h2>
              <p style={{ fontSize: '15px', lineHeight: 1.85, color: '#4E5968', margin: 0 }}>{f.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </MarketingPage>
  );
}
