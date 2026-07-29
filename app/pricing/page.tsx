import MarketingPage from '@/components/landing/MarketingPage';
import { PLANS, pricePerCredit, pagesPerPlan, CREDIT_VALID_MONTHS } from '@/data/plans';

/**
 * 요금제 — 크레딧 충전(단건 결제). 가격은 data/plans.ts 단일 소스.
 * ★PG 카드사 심사 요건: 실제 판매 가격·결제 방법·환불 규정이 표시되어야 한다.
 */
export const metadata = { title: '요금제 — Flik' };

const sectionTitle: React.CSSProperties = { fontSize: '20px', fontWeight: 700, color: '#191F28', margin: '48px 0 12px', letterSpacing: '-0.02em' };
const body: React.CSSProperties = { fontSize: '15px', lineHeight: 1.85, color: '#4E5968', margin: '0 0 10px' };
const li: React.CSSProperties = { fontSize: '15px', lineHeight: 1.85, color: '#4E5968', marginBottom: '6px' };

export default function Page() {
  return (
    <MarketingPage
      title="필요한 만큼만 충전해서 쓰세요"
      intro="크레딧 1개로 상세페이지 섹션 1개를 만듭니다. 월 구독 없이, 쓴 만큼만 결제하세요."
    >
      {/* 체험 안내 */}
      <div style={{
        background: '#F4F0FF', border: '1px solid #E6DEFF', borderRadius: 14,
        padding: '18px 20px', marginBottom: 8,
      }}>
        <div style={{ fontSize: '15px', fontWeight: 700, color: '#5B3FD6', marginBottom: 4 }}>
          🎁 신규 가입 시 체험 크레딧 16개
        </div>
        <div style={{ fontSize: '14px', color: '#6B6490', lineHeight: 1.7 }}>
          결제 없이 상세페이지 1개(16섹션)를 직접 만들어볼 수 있는 양이에요. 카드 등록도 필요 없습니다.
        </div>
      </div>

      {/* 요금제 카드 */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
        gap: 14, margin: '28px 0 8px',
      }}>
        {PLANS.map(p => (
          <div
            key={p.id}
            style={{
              position: 'relative',
              background: p.recommended ? '#F8F6FF' : '#fff',
              border: `${p.recommended ? 2 : 1}px solid ${p.recommended ? '#6D4CFF' : '#ECECF2'}`,
              borderRadius: 16, padding: '24px 20px',
              display: 'flex', flexDirection: 'column', gap: 6,
            }}
          >
            {p.recommended && (
              <span style={{
                position: 'absolute', top: -11, left: 20,
                background: '#6D4CFF', color: '#fff', fontSize: 11, fontWeight: 700,
                borderRadius: 999, padding: '4px 12px',
              }}>추천</span>
            )}
            <div style={{ fontSize: 15, fontWeight: 800, color: '#191F28' }}>{p.name}</div>
            <div style={{ fontSize: 12.5, color: '#8B95A1', minHeight: 34, lineHeight: 1.5 }}>{p.tagline}</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: '#191F28', letterSpacing: '-0.03em', marginTop: 6 }}>
              {p.price.toLocaleString('ko-KR')}<span style={{ fontSize: 15, fontWeight: 700 }}>원</span>
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#6D4CFF' }}>
              크레딧 {p.credits}개
            </div>
            <div style={{ fontSize: 12, color: '#8B95A1', lineHeight: 1.6, marginTop: 4 }}>
              크레딧당 {pricePerCredit(p).toLocaleString('ko-KR')}원<br />
              16섹션 페이지 약 {pagesPerPlan(p)}개 분량
            </div>
          </div>
        ))}
      </div>
      <p style={{ fontSize: '12.5px', color: '#8B95A1', margin: '0 0 4px' }}>
        표시 가격은 부가세 포함 금액입니다. 결제 수단: 신용·체크카드
      </p>

      <h2 style={sectionTitle}>크레딧은 어떻게 차감되나요?</h2>
      <ul style={{ paddingLeft: '20px', margin: '0 0 10px' }}>
        <li style={li}><b>상세페이지 생성</b> — 섹션 1개당 1크레딧. 16섹션 페이지를 만들면 16크레딧이 차감돼요.</li>
        <li style={li}><b>섹션당 첫 이미지</b> — 추가 비용 없이 포함됩니다.</li>
        <li style={li}><b>이미지 재생성</b> — 생성 규모에 비례해 무료로 드려요(16섹션이면 10장, 32섹션이면 20장). 무료분을 다 쓰면 1장당 1크레딧이며, 차감 전 확인 창이 표시됩니다.</li>
        <li style={li}><b>카피 수정·결과물 다운로드</b> — 추가 비용이 없습니다.</li>
        <li style={li}><b>생성 실패</b> — 결과물이 나오지 않은 경우 크레딧이 자동으로 환불됩니다.</li>
      </ul>

      <h2 style={sectionTitle}>유효기간</h2>
      <p style={body}>
        충전한 크레딧의 유효기간은 충전일로부터 {CREDIT_VALID_MONTHS}개월입니다.
        기간이 지나면 잔여 크레딧은 소멸되며, 소멸 예정 시 사전에 안내해 드립니다.
      </p>

      <h2 style={sectionTitle}>환불 규정</h2>
      <ul style={{ paddingLeft: '20px', margin: '0 0 10px' }}>
        <li style={li}>결제 후 <b>사용하지 않은 크레딧</b>은 결제일로부터 7일 이내에 전액 환불받을 수 있습니다.</li>
        <li style={li}>일부를 사용한 경우, 사용한 크레딧을 결제 단가로 차감한 잔액을 환불해 드립니다.</li>
        <li style={li}>생성이 정상적으로 완료된 결과물에 사용된 크레딧은 디지털 콘텐츠 특성상 환불 대상에서 제외됩니다(전자상거래법 제17조 제2항).</li>
        <li style={li}>환불은 고객문의 이메일로 신청하실 수 있으며, 영업일 기준 3일 이내에 처리됩니다.</li>
      </ul>

      <h2 style={sectionTitle}>결제·문의</h2>
      <p style={body}>
        결제나 환불에 관한 문의는 <b>flik.support@gmail.com</b> 으로 보내주세요.
        사업자 정보는 페이지 하단에서 확인하실 수 있습니다.
      </p>
      {/* ★PG 결제 연동 완료 시 이 안내만 삭제하면 된다(가격·환불 규정은 그대로 유효). */}
      <p style={{ ...body, fontSize: '13px', color: '#8B95A1', marginTop: 18 }}>
        ※ 카드 결제는 결제대행사 승인 절차가 완료되는 대로 활성화됩니다. 그 전까지는 신규 가입 체험 크레딧으로 서비스를 이용하실 수 있습니다.
      </p>
    </MarketingPage>
  );
}
