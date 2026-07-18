import ComingSoonPage from '@/components/landing/ComingSoonPage';

/**
 * 요금제 — 가격 정책 미정. ★가격표/숫자 만들지 않음. "무료 이용" 프레이밍 금지(어뷰징 유인) —
 * 신규 체험 크레딧 안내 + 준비 중만.
 */
export const metadata = { title: '요금제 — Flik' };

export default function Page() {
  return (
    <ComingSoonPage
      title="요금제"
      emoji="💎"
      description="신규 가입 시 체험 크레딧 16개를 드려요 — 상세페이지 1회(16섹션)를 직접 만들어볼 수 있는 양이에요. 상세페이지 생성은 섹션 1개당 1크레딧이 차감됩니다. 정식 요금제는 준비 중이며, 도입 시 미리 안내해 드립니다."
    />
  );
}
