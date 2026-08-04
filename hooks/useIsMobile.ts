'use client';

import { useState, useEffect } from 'react';

/** 모바일 분기 기준 폭 — useIsMobile과 "effect 발화 전 뷰포트 직접 확인" 가드가 같은 값을 쓰도록 단일 소스 */
export const MOBILE_BREAKPOINT = 768;

/**
 * @param freeze 마운트 때 한 번만 재고 이후 폭 변화를 무시한다.
 *   ★생성 화면(s7)처럼 '변형 하나가 곧 작업 1회'인 곳에서만 쓴다. 생성 중에 변형이 갈리면
 *   모바일→데스크톱은 파이프라인이 취소된 채 0%에서 멈추고, 데스크톱→모바일은 두 번째
 *   파이프라인이 새 멱등키로 시작돼 그대로 이중과금이 된다(2026-08-04).
 */
export function useIsMobile(breakpoint = MOBILE_BREAKPOINT, freeze = false) {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < breakpoint);
    check();
    if (freeze) return;
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, [breakpoint, freeze]);
  return isMobile;
}
