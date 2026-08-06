import CreditsGrantClient from './CreditsGrantClient';

/**
 * 관리자 크레딧 지급 화면(2026-08-06) — 대면 테스트 중에 쓰는 것이라 손이 빨라야 한다.
 *
 * ★왜 화면으로 만드나: 개발자 도구 콘솔로 안내했더니 붙여넣기 차단·탭 찾기에서 막혔다.
 *   셀러를 앞에 앉혀두고 콘솔을 여는 상황 자체가 말이 안 된다. 폼 세 칸이면 될 일이다.
 * 권한은 서버(API)가 판단한다 — 이 화면은 주소를 알아도 관리자가 아니면 아무것도 못 한다.
 */
export const metadata = { title: '크레딧 지급 — 관리자' };

export default function Page() {
  return <CreditsGrantClient />;
}
