import MarketingPage from '@/components/landing/MarketingPage';
import GuideDemo from '@/components/landing/GuideDemo';

/**
 * 사용 가이드 — 실제 생성 플로우(카테고리→상품정보→이미지→생성→결과) 기준으로만 작성.
 * 없는 기능 안내 금지. 크레딧 수치는 서버 정책(SIGNUP_GRANT=16, 섹션당 1)과 일치시킬 것.
 */
export const metadata = { title: '사용 가이드 — Flik' };

const sectionTitle: React.CSSProperties = { fontSize: '20px', fontWeight: 700, color: '#191F28', margin: '40px 0 12px', letterSpacing: '-0.02em' };
const body: React.CSSProperties = { fontSize: '15px', lineHeight: 1.85, color: '#4E5968', margin: '0 0 10px' };
const li: React.CSSProperties = { fontSize: '15px', lineHeight: 1.85, color: '#4E5968', marginBottom: '6px' };
const tipBox: React.CSSProperties = {
  background: '#F4F2FF', border: '1px solid rgba(109,76,255,.15)', borderRadius: '12px',
  padding: '16px 20px', margin: '14px 0', fontSize: '14px', lineHeight: 1.75, color: '#4E5968',
};

export default function Page() {
  return (
    <MarketingPage
      title="사용 가이드"
      intro="가입부터 다운로드까지 10분이면 충분합니다. 순서대로 따라오시면 첫 상세페이지가 완성돼요."
    >
      {/* 30초 인터랙티브 데모 — 입력→생성→완성 흐름 자동 재생(모바일<760px 미표시) */}
      <GuideDemo />

      <h2 style={sectionTitle}>1. 카테고리·채널 선택</h2>
      <p style={body}>
        판매하는 상품의 카테고리(화장품·식품·건강 등)와 판매 채널(스마트스토어 등)을 고르면,
        이후 모든 질문과 페이지 구조가 그 카테고리에 맞게 바뀝니다. 실제 판매 카테고리와 같게 선택하는 것이 결과물 품질의 시작입니다.
      </p>

      <h2 style={sectionTitle}>2. 상품 정보 입력 — 결과물 품질의 8할</h2>
      <p style={body}>
        AI는 <b>입력된 사실만</b> 사용해 페이지를 만듭니다. 입력하지 않은 수치·인증·효능은 지어내지 않도록 설계돼 있어서,
        정보를 구체적으로 줄수록 페이지가 풍부해집니다.
      </p>
      <ul style={{ paddingLeft: '20px', margin: '0 0 10px' }}>
        <li style={li}><b>선택지(칩)</b> — 상품 종류·특징·인증 등은 해당하는 것만 선택하세요. 선택한 내용이 곧 페이지의 근거가 됩니다.</li>
        <li style={li}><b>가격</b> — 정가와 판매가를 입력하면 할인율이 자동 계산되어 가격 섹션에 반영됩니다.</li>
        <li style={li}><b>고객 후기</b> — 실제 후기를 원문 그대로 입력하세요. 입력한 후기만, 입력한 개수만큼만 페이지에 실립니다.</li>
        <li style={li}><b>법적 고지(해당 카테고리)</b> — 건강기능식품 등은 의무 표시 항목을 입력해야 진행됩니다. 입력값으로 법적 고지 섹션이 자동 생성됩니다.</li>
        <li style={li}><b>기타 추가 정보</b> — 위 선택지에 없는 정보만 적으면 됩니다. 이미 선택한 내용을 다시 쓸 필요는 없어요.</li>
      </ul>
      <div style={tipBox}>
        💡 <b>팁</b> — &ldquo;병풀 추출물 고함량&rdquo;보다 &ldquo;핵심 성분: 병풀 추출물(진정), 판테놀(수분)&rdquo;처럼 항목을 나눠 적으면
        AI가 성분 섹션·정보그래픽을 훨씬 정확하게 구성합니다.
      </div>

      <h2 style={sectionTitle}>3. 섹션 구조 확인</h2>
      <p style={body}>
        AI가 제안한 섹션 구성을 확인하고, 필요하면 추가·삭제·순서 변경할 수 있습니다.
        섹션 1개당 1크레딧이 차감되니, 처음에는 10~16섹션 정도를 권장합니다.
      </p>

      <h2 style={sectionTitle}>4. 제품 사진 업로드</h2>
      <ul style={{ paddingLeft: '20px', margin: '0 0 10px' }}>
        <li style={li}><b>대표컷</b> — 흰 배경 정면 사진(누끼컷)이 가장 좋습니다. 이 사진의 형태·라벨을 기준으로 모든 섹션 이미지가 생성됩니다.</li>
        <li style={li}><b>보조컷(선택, 최대 2장)</b> — 알약·내용물·질감처럼 <b>포장 밖 실물</b>이 자주 나오는 제품이라면 실물 컷을 함께 올려주세요.
          없으면 AI가 내용물 모양을 추측해서 섹션마다 달라질 수 있습니다.</li>
      </ul>
      <div style={tipBox}>
        💡 <b>팁</b> — 영양제라면 알약 1알 클로즈업, 식품이라면 내용물·조리컷을 보조컷으로 올리면
        전 섹션에서 같은 모양으로 일관되게 나옵니다.
      </div>

      <h2 style={sectionTitle}>5. 생성과 크레딧</h2>
      <ul style={{ paddingLeft: '20px', margin: '0 0 10px' }}>
        <li style={li}>생성은 <b>섹션 1개당 1크레딧</b>이 차감됩니다(신규 가입 시 체험 크레딧 16개 제공).</li>
        <li style={li}>생성 중 오류로 이미지가 한 장도 만들어지지 않으면 <b>크레딧은 자동 환불</b>됩니다.</li>
        <li style={li}>생성 중 새로고침해도 진행 상황이 저장되어 이어서 진행됩니다.</li>
      </ul>

      <h2 style={sectionTitle}>6. 결과 확인·수정·다운로드</h2>
      <ul style={{ paddingLeft: '20px', margin: '0 0 10px' }}>
        <li style={li}><b>섹션별 재생성</b> — 마음에 안 드는 섹션은 이미지를 클릭해 다시 생성할 수 있습니다(같은 생성 작업 안에서는 추가 크레딧 없이 한도 내 재생성).</li>
        <li style={li}><b>카피 수정</b> — 헤드라인·본문은 직접 수정할 수 있고, 수정 내용은 자동 저장됩니다.</li>
        <li style={li}><b>다운로드</b> — 완성본은 이미지로 저장해 판매 채널에 바로 등록하면 됩니다. 지난 작업은 대시보드 히스토리에서 다시 열 수 있어요.</li>
      </ul>

      <h2 style={sectionTitle}>결과물 검토는 꼭 해주세요</h2>
      <p style={body}>
        Flik은 입력하지 않은 수치·인증·효능을 만들지 않도록 설계돼 있지만, 표시광고 관련 최종 확인 책임은 판매자에게 있습니다.
        게시 전 상품 정보와 결과물이 일치하는지 한 번 검토하는 것을 권장합니다.
      </p>
    </MarketingPage>
  );
}
