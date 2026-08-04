'use client';

import { PRODUCT_VERSION } from '@/data/version';

/**
 * 버전 뱃지(2026-08-04) — 로고 옆에 붙는 작은 표식. 누르면 업데이트 내역으로 간다.
 *
 * ★한 곳에서만 정의한다. 같은 것을 여러 화면에 각자 그리면 반드시 갈라진다
 *   (오늘만 단계 표시·컷 목록·블록 렌더러에서 세 번 겪었다).
 * ★로고 이미지에는 넣지 않는다 — 버전을 올릴 때마다 로고를 다시 만들어야 하고,
 *   그러면 귀찮아서 안 올리게 되어 오히려 '멈춘 서비스'로 보인다.
 *
 * 생김새 기준(유근님 확정):
 *  - 보라를 쓰지 않는다. 화면에 이미 보라가 많아(버튼·크레딧·강조) 뱃지까지 보라면
 *    어디를 봐야 할지 흐려진다. 회색이면 로고를 방해하지 않는다.
 *  - 모서리를 각지게(5px) — 알약은 캐주얼하고, 각진 사각이 도구 같은 인상을 준다.
 *  - 모노스페이스 — v3.1·v3.12로 길어져도 폭이 흔들리지 않는다.
 */
export default function VersionBadge({ size = 10 }: { size?: number }) {
  return (
    <a
      href="/changelog"
      target="_blank"
      rel="noopener noreferrer"
      onClick={e => e.stopPropagation()}
      title={`Flik v${PRODUCT_VERSION} — 무엇이 바뀌었는지 보기`}
      style={{
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
        fontSize: size, fontWeight: 600, color: '#8B95A1',
        background: '#F4F4F8', borderRadius: 5, padding: '3px 7px',
        letterSpacing: '0.02em', lineHeight: 1.2,
        textDecoration: 'none', flexShrink: 0, whiteSpace: 'nowrap',
      }}
    >v{PRODUCT_VERSION}</a>
  );
}
