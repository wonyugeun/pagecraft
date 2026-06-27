import MarketingPage from '@/components/landing/MarketingPage';

/**
 * FAQ — Flik. 답변은 실제 서비스/약관/개인정보처리방침과 일치하도록 작성(모순·허위 금지).
 */
export const metadata = { title: '자주 묻는 질문 — Flik' };

interface QA { q: string; a: React.ReactNode }

const FAQS: QA[] = [
  {
    q: 'Flik은 어떤 서비스인가요?',
    a: '상품 정보를 입력하면 AI가 설득 구조(AIDA)에 맞춰 섹션 구조와 카피를 구성하고 이미지까지 생성해, 판매 채널에 바로 쓸 수 있는 상세페이지를 자동으로 만들어 주는 서비스입니다.',
  },
  {
    q: '어떤 판매 채널에 쓸 수 있나요?',
    a: '스마트스토어·네이버블로그(블로그형), 쿠팡(슬라이드형), 자사몰·와디즈(HTML형) 등에 활용할 수 있습니다. 선택한 채널에 맞는 형태를 추천해 드립니다.',
  },
  {
    q: '결과물은 어떤 형태로 받나요?',
    a: '블로그형(텍스트 중심), 슬라이드형(이미지 중심), HTML형 중에서 원하는 형태로 다운로드할 수 있습니다.',
  },
  {
    q: '생성한 상세페이지의 저작권·사용권은 누구에게 있나요?',
    a: <>회원이 입력한 콘텐츠와 그로부터 생성된 결과물의 이용 권한은 이를 생성한 회원에게 귀속됩니다. 자세한 내용은 <a href="/terms" style={{ color: '#6E5BFB', fontWeight: 600 }}>이용약관</a> 제9조를 참고해 주세요.</>,
  },
  {
    q: '입력한 정보는 안전하게 처리되나요?',
    a: <>서비스 제공을 위해 회원이 입력한 콘텐츠는 콘텐츠 생성 과정에서 AI API(Anthropic·OpenAI·Google)로 전송·처리되며, 이 사업자들은 국외에 소재할 수 있습니다. 어떤 정보가 어떻게 처리되는지는 <a href="/privacy" style={{ color: '#6E5BFB', fontWeight: 600 }}>개인정보처리방침</a>에서 투명하게 안내합니다. 민감하거나 비밀로 유지되어야 하는 정보는 입력하지 않으시길 권장합니다.</>,
  },
  {
    q: '크레딧은 어떻게 되나요?',
    a: '신규 가입 시 30크레딧을 무료로 드립니다. 상세페이지 1회 생성에 10크레딧이 차감되며, 만든 결과물의 다운로드는 무료입니다.',
  },
  {
    q: '베타 기간에는 무료인가요?',
    a: '네, 현재 베타(시범) 단계로 무료로 이용하실 수 있습니다. 정식 유료 요금제는 준비 중이며, 도입 시 미리 안내하고 별도의 동의를 받습니다.',
  },
  {
    q: '생성물의 정확성·광고 표현에 대한 책임은 누구에게 있나요?',
    a: <>Flik은 입력한 정보를 바탕으로 결과물을 만들어 주는 보조 도구입니다. 상품 정보·수치·효능·원산지 등 사실관계의 정확성과 「표시·광고의 공정화에 관한 법률」 등 관련 법령 준수 책임은 결과물을 게시·사용하는 회원에게 있습니다. 반드시 사용 전 내용을 직접 검토·수정해 주세요. (<a href="/terms" style={{ color: '#6E5BFB', fontWeight: 600 }}>이용약관</a> 제8조)</>,
  },
];

export default function Page() {
  return (
    <MarketingPage title="자주 묻는 질문" intro="Flik 이용 중 자주 궁금해하시는 점을 모았습니다.">
      <div>
        {FAQS.map((item, i) => (
          <div key={i} style={{ padding: '22px 0', borderTop: i === 0 ? '1px solid #EBEEF2' : 'none', borderBottom: '1px solid #EBEEF2' }}>
            <h2 style={{ fontSize: '17px', fontWeight: 700, color: '#191F28', margin: '0 0 10px', letterSpacing: '-0.02em' }}>
              Q. {item.q}
            </h2>
            <p style={{ fontSize: '15px', lineHeight: 1.85, color: '#4E5968', margin: 0 }}>{item.a}</p>
          </div>
        ))}
      </div>
    </MarketingPage>
  );
}
