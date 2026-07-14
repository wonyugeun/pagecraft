import ComingSoonPage from '@/components/landing/ComingSoonPage';

/**
 * 요금제 — 가격 정책 미정. ★가격표/숫자 만들지 않음. 베타 무료 + 준비 중 안내만.
 */
export const metadata = { title: '요금제 — Flik' };

export default function Page() {
  return (
    <ComingSoonPage
      title="요금제"
      emoji="💎"
      description="현재 Flik은 베타 기간으로 무료로 이용하실 수 있어요. (신규 가입 시 30크레딧 무료 · 상세페이지 생성은 섹션 1개당 1크레딧) 정식 요금제는 준비 중이며, 도입 시 미리 안내해 드립니다."
    />
  );
}
