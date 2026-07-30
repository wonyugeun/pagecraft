import Link from 'next/link';
import { Check } from 'lucide-react';
import LandingLayout from '@/components/landing/LandingLayout';
import { PLANS, COMMON_BENEFITS, planHighlights, currentPrice, PROMO } from '@/data/plans';

/**
 * 요금제 — 크레딧 충전(단건 결제). 가격은 data/plans.ts 단일 소스.
 *
 * ★PG 카드사 심사 요건: 실제 판매 가격·결제 방법 표시.
 * ★환불 규정 섹션은 2026-07-30 유근님 지시로 일시 제거 — PG 심사 피드백을 받고 조건을 확정한 뒤
 *   다시 넣는다. ⚠️전자상거래법상 청약철회 표시 의무가 있고 카드사 심사도 환불 규정을 확인하는
 *   경우가 많으므로, 결제 오픈 전에는 반드시 복원해야 한다(git 이력: 이 커밋의 직전 버전 참조).
 *   단 '생성 실패 시 크레딧 자동 환불'은 정책이 아니라 제품 동작이라 그대로 유지한다.
 * ★레이아웃(2026-07-30): AI 서비스 표준 3열 플랜 카드 — 큰 가격 + 카드별 CTA + 체크리스트.
 *   기능은 플랜별로 잠그지 않으므로(수량만 다름) 공통 혜택은 카드 아래에 한 번만 정리한다.
 * ★CTA: 결제 배관 오픈 전까지는 '무료로 시작하기'(체험 크레딧)로 연결한다 —
 *   결제가 안 되는데 '충전하기'를 보여주면 기만이 된다. PG 승인 후 결제 핸들러로 교체.
 */
export const metadata = { title: '요금제 — Flik' };

const MAX_W = 1200;   // 플랜 4종(LIGHT~MAX)이 한 줄에 들어가는 폭

export default function Page() {
  return (
    <LandingLayout>
      <div style={{
        maxWidth: MAX_W, margin: '0 auto', padding: '72px 24px 120px',
        fontFamily: "'Pretendard','Noto Sans KR',sans-serif", color: '#333D4B',
      }}>
        {/* 헤더 */}
        <div style={{ textAlign: 'center', marginBottom: 14 }}>
          <h1 style={{
            fontSize: 36, fontWeight: 800, color: '#191F28',
            letterSpacing: '-0.035em', lineHeight: 1.25, marginBottom: 14,
          }}>
            요금제
          </h1>
          <p style={{ fontSize: 17, lineHeight: 1.7, color: '#4E5968', margin: 0 }}>
            필요한 만큼만 충전해서 쓰세요. 크레딧 1개로 상세페이지 섹션 1개를 만듭니다.
          </p>
        </div>

        {/* 프로모션 + 구독 없음 배지 */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 40 }}>
          {PROMO.active && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 7,
              background: '#6D4CFF', borderRadius: 999,
              padding: '9px 18px', fontSize: 13.5, fontWeight: 700, color: '#fff',
            }}>
              {PROMO.label} · {PROMO.changesOn}부터 정가 적용
            </div>
          )}
        </div>

        {/* 플랜 카드 3열 */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(238px, 1fr))',
          gap: 16, alignItems: 'stretch', marginBottom: 56,
        }}>
          {PLANS.map(p => {
            const rec = !!p.recommended;
            return (
              <div
                key={p.id}
                style={{
                  position: 'relative',
                  background: '#fff',
                  border: `${rec ? 2 : 1}px solid ${rec ? '#6D4CFF' : '#ECECF2'}`,
                  borderRadius: 20, padding: '30px 24px 26px',
                  display: 'flex', flexDirection: 'column',
                  boxShadow: rec ? '0 12px 32px rgba(109,76,255,0.12)' : '0 1px 3px rgba(17,17,26,0.04)',
                }}
              >
                {/* 플랜명(영문 대문자) + 추천 배지 — ⚠️'인기'는 '다수가 선택했다'는 사실 주장이라
                    실사용 데이터가 쌓이기 전에는 쓰지 않는다(우리 추천이라는 뜻의 '추천'만 사용). */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 16 }}>
                  <div>
                    <div style={{
                      fontSize: 22, fontWeight: 800, color: '#191F28',
                      letterSpacing: '0.02em', lineHeight: 1.1,
                    }}>{p.nameEn}</div>
                    <div style={{ fontSize: 12.5, color: '#B0B8C1', marginTop: 3, fontWeight: 500 }}>{p.name}</div>
                  </div>
                  {rec && (
                    <span style={{
                      background: '#6D4CFF', color: '#fff',
                      fontSize: 11.5, fontWeight: 700, borderRadius: 999, padding: '5px 12px',
                      whiteSpace: 'nowrap', letterSpacing: '-0.01em',
                    }}>추천</span>
                  )}
                </div>

                {/* 가격 — ⚠️판매 이력 없는 정가에 취소선·할인율 금지(허위 할인 표시).
                    "언제부터 얼마로 조정"이라는 사실 예고로만 표기한다. */}
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 6 }}>
                  <span style={{
                    fontSize: 38, fontWeight: 800, color: '#191F28', letterSpacing: '-0.045em', lineHeight: 1,
                  }}>{currentPrice(p).toLocaleString('ko-KR')}</span>
                  <span style={{ fontSize: 18, fontWeight: 700, color: '#4E5968', marginLeft: 2 }}>원</span>
                </div>
                {PROMO.active && (
                  <div style={{ fontSize: 12, color: '#6D4CFF', fontWeight: 600, marginBottom: 8 }}>
                    {PROMO.changesOn}부터 {p.listPrice.toLocaleString('ko-KR')}원
                  </div>
                )}
                <p style={{ fontSize: 14, color: '#8B95A1', margin: '0 0 26px', lineHeight: 1.6, minHeight: 44 }}>
                  {p.tagline}
                </p>

                {/* CTA — 결제 화면으로. 비로그인은 결제 API가 401을 주므로 로그인으로 유도된다. */}
                <Link
                  href={`/checkout?plan=${p.id}`}
                  style={{
                    display: 'block', textAlign: 'center', textDecoration: 'none',
                    background: rec ? '#6D4CFF' : '#191F28', color: '#fff',
                    borderRadius: 12, padding: '15px 0',
                    fontSize: 15, fontWeight: 700, letterSpacing: '-0.01em',
                    marginBottom: 24,
                  }}
                >
                  결제하고 시작하기
                </Link>

                {/* 혜택 — 상위 플랜일수록 줄이 늘어나며 누적되는 게 보이게 */}
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 12 }}>
                  {planHighlights(p).map((h, i) => (
                    <li key={i} style={{
                      display: 'flex', alignItems: 'flex-start', gap: 9,
                      fontSize: 14, color: '#4E5968', lineHeight: 1.6, letterSpacing: '-0.01em',
                    }}>
                      <Check size={17} color="#6D4CFF" strokeWidth={2.6} style={{ flexShrink: 0, marginTop: 3 }} />
                      <span>
                        {h.pre}
                        <b style={{ fontWeight: 700, color: '#191F28' }}>{h.bold}</b>
                        {h.post}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        {/* 전 플랜 공통 */}
        <div style={{
          background: '#FAFAFC', border: '1px solid #ECECF2', borderRadius: 20,
          padding: '32px 30px', marginBottom: 20,
        }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#191F28', marginBottom: 6, letterSpacing: '-0.02em' }}>
            모든 플랜에 공통으로 포함돼요
          </div>
          <p style={{ fontSize: 14, color: '#8B95A1', margin: '0 0 22px' }}>
            Flik은 기능을 요금제로 잠그지 않아요. 플랜 차이는 크레딧 수량과 단가뿐입니다.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '13px 24px' }}>
            {COMMON_BENEFITS.map(b => (
              <div key={b} style={{ display: 'flex', alignItems: 'flex-start', gap: 9, fontSize: 14.5, color: '#4E5968', lineHeight: 1.6 }}>
                <Check size={17} color="#6D4CFF" strokeWidth={2.6} style={{ flexShrink: 0, marginTop: 3 }} />
                <span>{b}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 체험 안내 */}
        <div style={{
          background: '#F4F0FF', border: '1px solid #E6DEFF', borderRadius: 16,
          padding: '20px 24px', marginBottom: 56,
        }}>
          <div style={{ fontSize: 15.5, fontWeight: 700, color: '#5B3FD6', marginBottom: 5 }}>
            신규 가입 시 체험 크레딧 10개
          </div>
          <div style={{ fontSize: 14, color: '#6B6490', lineHeight: 1.7 }}>
            카드 등록 없이 10섹션 페이지 1개를 만들어볼 수 있어요. 유효기간은 7일이고, 결과물 다운로드는 유료 플랜에서 가능합니다.
          </div>
        </div>

        {/* 상세 규정 */}
        <Section title="크레딧은 어떻게 차감되나요?">
          <Bullets items={[
            ['상세페이지 생성', '섹션 1개당 1크레딧. 16섹션 페이지를 만들면 16크레딧이 차감돼요.'],
            ['섹션당 첫 이미지', '추가 비용 없이 포함됩니다.'],
            ['이미지 재생성', '생성 규모에 비례해 무료로 드려요(16섹션이면 10장, 32섹션이면 20장). 무료분을 다 쓰면 1장당 1크레딧이며, 차감 전 확인 창이 표시됩니다.'],
            ['카피 수정·다운로드', '추가 비용이 없습니다.'],
            ['생성 실패', '결과물이 나오지 않은 경우 크레딧이 자동으로 환불됩니다.'],
          ]} />
        </Section>

        <Section title="유효기간">
          <p style={{ ...bodyStyle, marginBottom: 12 }}>
            충전한 크레딧의 유효기간은 플랜에 따라 다릅니다. 기간이 지나면 잔여 크레딧은 소멸되며,
            소멸 예정 시 사전에 안내해 드립니다.
          </p>
          <div style={{ display: 'grid', gap: 8 }}>
            {PLANS.map(p => (
              <div key={p.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                gap: 12, fontSize: 14.5, color: '#4E5968',
                borderBottom: '1px solid #F4F4F8', paddingBottom: 8,
              }}>
                <span>{p.nameEn} · 크레딧 {p.credits}개</span>
                <b style={{ fontWeight: 700, color: '#191F28' }}>{p.validMonths}개월</b>
              </div>
            ))}
          </div>
        </Section>

        <Section title="결제·문의">
          <p style={bodyStyle}>
            표시 가격은 부가세 포함 금액입니다. 결제 수단은 신용·체크카드이며,
            결제 관련 문의는 <b>flik.support@gmail.com</b> 으로 보내주세요.
            사업자 정보는 페이지 하단에서 확인하실 수 있습니다.
          </p>
          {/* ★PG 결제 연동 완료 시 이 안내만 삭제하면 된다(가격·환불 규정은 그대로 유효). */}
          <p style={{ ...bodyStyle, fontSize: 13.5, color: '#8B95A1', marginTop: 14 }}>
            ※ 카드 결제는 결제대행사 승인 절차가 완료되는 대로 활성화됩니다. 그 전까지는 신규 가입 체험 크레딧으로 서비스를 이용하실 수 있습니다.
          </p>
        </Section>
      </div>
    </LandingLayout>
  );
}

/* ─── 하위 표현 컴포넌트 ─── */
const bodyStyle: React.CSSProperties = { fontSize: 15, lineHeight: 1.85, color: '#4E5968', margin: 0 };

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 40 }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: '#191F28', margin: '0 0 14px', letterSpacing: '-0.02em' }}>
        {title}
      </h2>
      {children}
    </div>
  );
}

function Bullets({ items }: { items: [string, string][] }) {
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {items.map(([label, desc]) => (
        <div key={label} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <Check size={17} color="#6D4CFF" strokeWidth={2.6} style={{ flexShrink: 0, marginTop: 4 }} />
          <div style={{ fontSize: 15, lineHeight: 1.75, color: '#4E5968' }}>
            <b style={{ fontWeight: 700, color: '#191F28' }}>{label}</b> — {desc}
          </div>
        </div>
      ))}
    </div>
  );
}
