import LandingLayout from '@/components/landing/LandingLayout';
import LegalMarkdown from '@/components/landing/LegalMarkdown';
import { TERMS_CONTENT } from '@/data/legalContent';

/**
 * 이용약관 — Flik. 본문은 data/legalContent.ts(루트 Flik_이용약관_초안.md verbatim)를
 * LegalMarkdown으로 렌더. [   ] 미기재·시행일·표는 원문 그대로 유지.
 * ⚠️ 정식 출시(특히 유료 결제) 전 법률 전문가 검토 + [   ] 실제 값 교체 필요.
 */

export const metadata = { title: '이용약관 — Flik' };

export default function Page() {
  return (
    <LandingLayout>
      <LegalMarkdown content={TERMS_CONTENT} />
    </LandingLayout>
  );
}
