import MarketingPage from '@/components/landing/MarketingPage';

/**
 * 회사 소개 — 미션·철학 중심. ★사실 확정 전 항목(연혁·인원·투자·사업자 정보) 기재 금지 —
 * 사업자 등록 후 legalContent와 함께 채운다.
 */
export const metadata = { title: '회사 소개 — Flik' };

const sectionTitle: React.CSSProperties = { fontSize: '20px', fontWeight: 700, color: '#191F28', margin: '40px 0 12px', letterSpacing: '-0.02em' };
const body: React.CSSProperties = { fontSize: '15px', lineHeight: 1.85, color: '#4E5968', margin: '0 0 10px' };

export default function Page() {
  return (
    <MarketingPage
      title="좋은 제품이 좋은 페이지를 갖게"
      intro="Flik은 디자이너 없이 장사하는 셀러를 위해 만들어졌습니다."
    >
      <h2 style={sectionTitle}>왜 만들었나요</h2>
      <p style={body}>
        좋은 제품을 파는 셀러가 상세페이지 때문에 밀리는 경우를 너무 많이 봤습니다.
        외주를 맡기면 건당 수십만 원, 직접 만들면 며칠 — 그리고 상품이 바뀔 때마다 처음부터 다시.
        저희는 이 반복을 AI가 대신할 수 있다고 믿고 Flik을 만들고 있습니다.
      </p>

      <h2 style={sectionTitle}>무엇을 다르게 하나요</h2>
      <p style={body}>
        예쁘기만 한 페이지가 아니라 <b>팔리는 구조</b>와 <b>지킬 수 있는 표현</b>을 함께 고민합니다.
        AI가 페이지 구조를 설계하되, 판매자가 입력하지 않은 수치·인증·효능은 만들지 않는 것 —
        이 원칙이 Flik의 기본값입니다. 과장으로 얻은 클릭은 셀러의 리스크로 돌아온다고 생각하기 때문입니다.
      </p>

      <h2 style={sectionTitle}>지금, 그리고 다음</h2>
      <p style={body}>
        지금은 화장품·식품·건강기능식품 등 한국 이커머스의 주요 카테고리와 스마트스토어 중심으로
        서비스를 다듬고 있습니다. 더 많은 카테고리, 더 정교한 이미지, 더 편한 수정 경험이 다음 목표입니다.
        만들면서 배운 것은 가이드와 템플릿 갤러리에 계속 공개하겠습니다.
      </p>

      <h2 style={sectionTitle}>함께 만들어 주세요</h2>
      <p style={body}>
        Flik은 셀러의 피드백으로 자라는 서비스입니다. 쓰다가 이상한 점, 아쉬운 점이 있다면
        FAQ 페이지와 서비스 내 AI 도우미로 알려주세요. 가장 빠르게 고치겠습니다.
      </p>
    </MarketingPage>
  );
}
