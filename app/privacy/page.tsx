import LandingLayout from '@/components/landing/LandingLayout';
import LegalMarkdown from '@/components/landing/LegalMarkdown';
import { PRIVACY_CONTENT } from '@/data/legalContent';

/**
 * 개인정보처리방침 — Flik. 본문은 data/legalContent.ts(루트 Flik_개인정보처리방침_초안.md verbatim)를
 * LegalMarkdown으로 렌더. [   ] 미기재·시행일·표(국외이전·처리위탁)는 원문 그대로 유지.
 * ⚠️ 개인정보보호법상 의무 게시. 정식 출시 전 전문가 검토 + [   ] 실제 값(보호책임자 등) 교체 필요.
 */

export const metadata = { title: '개인정보처리방침 — Flik' };

export default function Page() {
  return (
    <LandingLayout>
      <LegalMarkdown content={PRIVACY_CONTENT} />
    </LandingLayout>
  );
}
