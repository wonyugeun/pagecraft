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

      <h2 style={sectionTitle}>요금은 어떻게 되나요?</h2>
      <p style={body}>
        신규 가입 시 체험 크레딧 10개를 드립니다(유효기간 7일) — 10섹션 페이지 1개를 직접 만들어볼 수 있는 양입니다.
        생성은 섹션 1개당 1크레딧이 차감되고, 결제 후에는 만든 결과물을 횟수 제한 없이 다운로드할 수 있습니다.
        체험 크레딧으로는 결과물을 화면에서 확인할 수 있고, 다운로드는 유료 플랜에서 가능합니다.
      </p>

      {/* 만든 사람의 인사 — 1인 개발이라는 사실을 숨기지 않고 신뢰 포인트로 */}
      <div style={{
        marginTop: 56, padding: '28px 26px',
        background: '#FBFAFE', border: '1px solid #ECEAF6', borderRadius: 16,
      }}>
        <h2 style={{ ...sectionTitle, margin: '0 0 14px' }}>만드는 사람의 인사</h2>
        <p style={body}>
          안녕하세요, Flik을 만들고 있는 개발자입니다.
        </p>
        <p style={body}>
          좋은 제품을 갖고도 상세페이지 앞에서 며칠씩 멈춰 있는 셀러분들을 보며 Flik을 시작했습니다.
          지금은 혼자 만들고 있는 작은 서비스이지만, 그래서 셀러 한 분 한 분의 의견이
          바로 다음 업데이트가 됩니다. 쓰시다가 이상한 점, 아쉬운 점이 있다면 주저 말고 알려주세요 —
          가장 빠르게 고치는 것으로 보답하겠습니다.
        </p>
        <p style={{ ...body, margin: 0 }}>
          여러분의 제품이 제값을 받는 페이지를 갖게 되는 것, 그게 Flik이 하고 싶은 일의 전부입니다.
        </p>
      </div>
    </MarketingPage>
  );
}
