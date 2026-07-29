/**
 * 카피 어투(speech level) 정의 — 단일 소스(2026-07-29).
 *
 * 셀러가 상품정보 화면에서 고르고, strategy 단계에서 AI 선택을 덮어쓴다.
 * 미선택 시엔 AI가 타겟·포지션을 보고 고른다.
 *
 * ★sample은 API 호출 없이 즉시 보여주는 정적 예시(감을 잡는 용도).
 *   "내 상품으로 미리보기"를 누르면 /api/tone-preview가 실제 상품 카피로 교체한다.
 */
export interface SpeechLevel {
  key: string;
  label: string;
  /** 셀러에게 보여줄 짧은 설명 */
  desc: string;
  /** 정적 예시 — 같은 메시지를 어투만 바꿔 쓴 것 */
  sample: string;
  /** 모델에게 주는 규칙(프롬프트에 그대로 들어감) */
  rule: string;
}

export const SPEECH_LEVELS: SpeechLevel[] = [
  {
    key: '해요체',
    label: '해요체',
    desc: '친근한 존댓말 · 가장 무난해요',
    sample: '매일 아침이 훨씬 편해져요.',
    rule: '친근한 존댓말. "~해요/~어요/~죠" 어미. 대화하듯 부드럽게.',
  },
  {
    key: '합니다체',
    label: '합니다체',
    desc: '정중하고 전문적 · 신뢰가 필요할 때',
    sample: '매일 아침이 훨씬 편해집니다.',
    rule: '정중하고 전문적인 존댓말. "~합니다/~습니다" 어미. 문장이 조금 길어도 됨.',
  },
  {
    key: '단정형',
    label: '단정형',
    desc: '광고 카피처럼 짧고 단단하게',
    sample: '매일 아침이 달라진다.',
    rule: '~다체. 광고 카피 어조로 짧고 단단하게. 존댓말 어미를 쓰지 말 것.',
  },
  {
    key: '명사형',
    label: '명사형',
    desc: '절제된 미니멀 · 여백이 있는 브랜드',
    sample: '한결 가벼워진 아침.',
    rule: '체언(명사)으로 문장을 끊어 절제된 리듬. 서술어를 최소화.',
  },
  {
    key: '반말친근체',
    label: '반말체',
    desc: '캐주얼 · 20대 타겟 브랜드',
    sample: '아침이 훨씬 편해지거든.',
    rule: '무례하지 않은 캐주얼 반말. "~야/~지/~거든" 어미. 20대 타겟 브랜드 전용.',
  },
];

export const SPEECH_LEVEL_KEYS = SPEECH_LEVELS.map(l => l.key);
