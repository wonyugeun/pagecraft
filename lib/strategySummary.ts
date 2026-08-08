/**
 * 전략 요약본 — 카피 단계로 넘기는 압축 전략(2026-08-08 분리).
 *
 * ★왜 별도 파일인가: 이 함수가 lib/stages/copy.ts 안에 있었는데, 브라우저에서 도는
 *   lib/pipelineJob.ts가 그걸 값으로 import하는 순간 copy.ts 전체(모듈 최상단에서
 *   Anthropic SDK 인스턴스를 만든다)가 클라이언트 번들로 딸려 들어가 앱이 죽었다.
 *   ("It looks like you're running in a browser-like environment")
 *   그래서 SDK를 전혀 모르는 순수 모듈로 떼어낸다 — 서버·브라우저 어디서 import해도 안전하다.
 *
 * ⚠️여기 필드를 추가하면 카피 단계가 그 값을 받는다. 반대로 여기서 빠뜨리면 조용히 사라진다 —
 *   실제로 speech_level이 사본에서 누락돼 셀러가 고른 어투가 한 번도 전달되지 않았다.
 *   사본을 만들지 말고 이 파일 하나만 쓸 것.
 */

export interface StrategySummary {
  main_weapon?: string;
  concept?: string;
  hero_angle?: string;
  target_desire?: string;
  target_fear?: string;
  story_flow?: string;
  tone?: string;
  /** 셀러가 고른 카피 어투 — 카피 단계의 어투 강제 변환이 이 값으로 동작한다 */
  speech_level?: string;
}

/** dna + strategy에서 카피 단계가 쓸 필드만 추린다 */
export function buildStrategySummary(
  dna: Record<string, unknown> | undefined,
  strategy: Record<string, unknown> | undefined,
): StrategySummary {
  const s = (v: unknown) => (typeof v === 'string' ? v : undefined);
  return {
    main_weapon:   s(dna?.main_weapon),
    concept:       s(strategy?.concept),
    hero_angle:    s(strategy?.hero_angle),
    target_desire: s(dna?.target_desire),
    target_fear:   s(dna?.target_fear),
    story_flow:    s(strategy?.story_flow),
    tone:          s(strategy?.tone),
    speech_level:  s(strategy?.speech_level),
  };
}
