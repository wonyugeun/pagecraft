'use client';

import { useState, useEffect } from 'react';

/** 모바일 분기 기준 폭 — useIsMobile과 "effect 발화 전 뷰포트 직접 확인" 가드가 같은 값을 쓰도록 단일 소스 */
export const MOBILE_BREAKPOINT = 768;

export function useIsMobile(breakpoint = MOBILE_BREAKPOINT) {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < breakpoint);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, [breakpoint]);
  return isMobile;
}
