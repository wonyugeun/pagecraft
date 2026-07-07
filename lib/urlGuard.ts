/**
 * SSRF 가드 — crawl-reference의 사용자 제공 URL 검증(2026-07-08, 진단 M3 수정).
 *
 * 차단: https 외 모든 프로토콜(http/file/ftp/data/gopher 등), localhost 계열,
 *   0.0.0.0, 루프백, 사설 대역(10/172.16-31/192.168), link-local·클라우드 메타데이터(169.254),
 *   CGNAT(100.64-127), IPv6 루프백/ULA/link-local.
 * 리다이렉트: 매 hop의 Location을 같은 규칙으로 재검증(fetchWithSsrfGuard).
 *
 * 알려진 한계(문서화): 호스트명이 사설 IP로 해석되는 DNS 리바인딩은 리터럴 검사로 못 막음 —
 *   완전 방어는 resolve+핀닝 필요(후속). 현 단계는 메타데이터·내부망 직접 조회의 주 경로를 차단.
 */

const BLOCKED_HOSTNAME = /^(localhost|.+\.localhost|0\.0\.0\.0)$/i;

/** IPv4/IPv6 리터럴이 내부·예약 대역인지 */
export function isPrivateAddress(hostname: string): boolean {
  const host = hostname.replace(/^\[|\]$/g, '').toLowerCase();
  const m = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (m) {
    const a = Number(m[1]), b = Number(m[2]);
    if (a === 0 || a === 127 || a === 10) return true;                 // 예약·루프백·사설
    if (a === 172 && b >= 16 && b <= 31) return true;                  // 사설
    if (a === 192 && b === 168) return true;                           // 사설
    if (a === 169 && b === 254) return true;                           // link-local + 클라우드 메타데이터
    if (a === 100 && b >= 64 && b <= 127) return true;                 // CGNAT
    return false;
  }
  // IPv6 리터럴
  if (host === '::' || host === '::1') return true;
  if (host.startsWith('fc') || host.startsWith('fd') || host.startsWith('fe80')) return true;   // ULA·link-local
  if (host.startsWith('::ffff:')) {
    // IPv4-mapped — URL 파서가 16진(::ffff:7f00:1)으로 정규화하므로 두 형식 모두 처리
    const rest = host.slice(7);
    if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(rest)) return isPrivateAddress(rest);
    const parts = rest.split(':');
    if (parts.length === 2) {
      const hi = parseInt(parts[0], 16), lo = parseInt(parts[1], 16);
      if (Number.isFinite(hi) && Number.isFinite(lo)) {
        return isPrivateAddress(`${hi >> 8}.${hi & 255}.${lo >> 8}.${lo & 255}`);
      }
    }
    return true;   // 판별 불가한 IPv4-mapped → 보수적으로 차단
  }
  return false;
}

export type UrlCheck = { ok: true; url: string } | { ok: false; error: string };

/** 크롤링 허용 URL 검증 — https 전용 + 내부망·메타데이터 차단 */
export function validateCrawlUrl(raw: string): UrlCheck {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return { ok: false, error: '올바른 URL이 아니에요.' };
  }
  if (u.protocol !== 'https:') {
    return { ok: false, error: 'https 주소만 분석할 수 있어요.' };   // http·file·ftp·data·gopher 등 전부 차단
  }
  if (BLOCKED_HOSTNAME.test(u.hostname) || isPrivateAddress(u.hostname)) {
    return { ok: false, error: '허용되지 않는 주소예요.' };
  }
  return { ok: true, url: u.toString() };
}

/** 리다이렉트 hop마다 재검증하는 fetch — 최종 URL 포함 전 구간이 validateCrawlUrl을 통과해야 함 */
export async function fetchWithSsrfGuard(startUrl: string, init: RequestInit, maxHops = 3): Promise<Response> {
  let current = startUrl;
  for (let hop = 0; hop <= maxHops; hop++) {
    const res = await fetch(current, { ...init, redirect: 'manual' });
    if ([301, 302, 303, 307, 308].includes(res.status)) {
      const loc = res.headers.get('location');
      if (!loc) throw new Error('리다이렉트 주소가 없어요.');
      const next = new URL(loc, current).toString();
      const v = validateCrawlUrl(next);
      if (!v.ok) throw new Error('리다이렉트 대상이 허용되지 않는 주소예요.');
      current = v.url;
      continue;
    }
    return res;
  }
  throw new Error('리다이렉트가 너무 많아요.');
}
