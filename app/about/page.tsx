import MarketingPage from '@/components/landing/MarketingPage';

/**
 * 서비스 소개 — Flik. 내용은 실제 기능(랜딩·코드)에서만 가져옴. 없는 기능 광고 금지.
 */
export const metadata = { title: '서비스 소개 — Flik' };

const sectionTitle: React.CSSProperties = { fontSize: '20px', fontWeight: 700, color: '#191F28', margin: '40px 0 12px', letterSpacing: '-0.02em' };
const body: React.CSSProperties = { fontSize: '15px', lineHeight: 1.85, color: '#4E5968', margin: '0 0 10px' };
const li: React.CSSProperties = { fontSize: '15px', lineHeight: 1.85, color: '#4E5968', marginBottom: '6px' };

export default function Page() {
  return (
    <MarketingPage
      title="상품 정보만 입력하면, AI가 상세페이지를 완성합니다"
      intro="Flik은 카테고리별 전문 AI가 상품 정보를 분석해 판매 채널에 최적화된 상세페이지를 자동으로 만들어 주는 서비스입니다."
    >
      <h2 style={sectionTitle}>Flik은 어떤 서비스인가요?</h2>
      <p style={body}>
        상품명·카테고리·주요 특징 등 기본 정보를 입력하면, AI가 설득 구조(AIDA)에 맞춰
        섹션 구조와 카피를 자동으로 구성하고, 필요한 이미지까지 생성합니다.
        복잡한 기획 없이도 판매에 바로 쓸 수 있는 상세페이지를 빠르게 완성할 수 있습니다.
      </p>

      <h2 style={sectionTitle}>누구를 위한 서비스인가요?</h2>
      <ul style={{ paddingLeft: '20px', margin: '0 0 10px' }}>
        <li style={li}>상세페이지 외주나 디자인이 부담스러운 초보 셀러</li>
        <li style={li}>여러 상품을 빠르게 등록해야 하는 스토어 운영자·브랜드</li>
        <li style={li}>채널별로 형식이 다른 상세페이지를 매번 새로 만들기 번거로운 분</li>
      </ul>

      <h2 style={sectionTitle}>어떻게 작동하나요?</h2>
      <ul style={{ paddingLeft: '20px', margin: '0 0 10px' }}>
        <li style={li}><b>1. 상품 정보 입력</b> — 카테고리·채널·상품명·주요 특징을 입력합니다. 경쟁사 상세페이지를 캡처해 올리면 구조 분석에 반영됩니다.</li>
        <li style={li}><b>2. AI 자동 생성</b> — 카테고리 특성과 채널 알고리즘을 분석해 구조·카피·이미지를 생성합니다.</li>
        <li style={li}><b>3. 다운로드</b> — 블로그형·슬라이드형·HTML형 중 원하는 형태로 받아 판매 채널에 적용합니다.</li>
      </ul>

      <h2 style={sectionTitle}>Flik의 차별점</h2>
      <ul style={{ paddingLeft: '20px', margin: '0 0 10px' }}>
        <li style={li}><b>카테고리·채널별 기획 구조</b> — 화장품·식품·패션 등 카테고리와 판매 채널에 맞춰 섹션 구조를 다르게 구성합니다.</li>
        <li style={li}><b>캡처 분석</b> — 경쟁사 상세페이지를 캡처해 올리면 AI가 구조를 분석해 더 나은 구성을 제안합니다.</li>
        <li style={li}><b>표시광고법·화장품법 가드</b> — 셀러가 입력하지 않은 수치·효능·인증 등을 임의로 만들어내지 않도록 억제해, 허위·과장 표현 위험을 줄입니다. (다만 최종 검토 책임은 셀러에게 있습니다.)</li>
      </ul>

      <h2 style={sectionTitle}>어떤 채널·형태로 쓸 수 있나요?</h2>
      <p style={body}>
        스마트스토어·네이버블로그에 맞는 <b>블로그형</b>(텍스트 중심), 쿠팡 등에 맞는 <b>슬라이드형</b>(이미지 중심),
        자사몰·와디즈 등에 활용하는 <b>HTML형</b>을 지원합니다. 채널 선택에 따라 알맞은 형태를 추천합니다.
      </p>

      <h2 style={sectionTitle}>지금은 베타입니다</h2>
      <p style={body}>
        Flik은 현재 베타(시범) 단계로 무료로 이용하실 수 있으며, 신규 가입 시 30크레딧을 무료로 드립니다.
        생성 1회에 10크레딧이 차감되고, 만든 결과물의 다운로드는 무료입니다.
      </p>
    </MarketingPage>
  );
}
