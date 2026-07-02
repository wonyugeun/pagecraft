/**
 * 미입력 사실 후처리 그물(최후 차단) — 프롬프트가 뭘 하든 카피 출력에서
 * 셀러가 입력하지 않은 위험 수치·품종 주장을 제거한다. 표시광고법 안전망.
 *
 * 판정 기준(allowed) = 셀러 "원입력"(productName + productExtra)만. 전략/카피가 오염돼도
 * 원입력에 없으면 제거. 셀러가 실제 입력한 값은 그대로 살린다.
 *
 * 대상: 당도(Brix, "약/대략" 헤지 포함) · 품종 특성(강분질/신품종/개량품종/분질/점질).
 * 전 카테고리 적용(현재는 식품 위주지만 카테고리 무관 안전).
 */
import type { Block } from '@/store/AppContext';

const VARIETY = ['강분질', '신품종', '개량품종', '분질질감', '분질', '점질'];

/**
 * 셀러가 실제 후기를 입력했는지 판정 — allow(원입력)에 후기/리뷰/평점 신호가 있으면
 * '진짜 후기 보유'로 보고 후기 스크럽 전체를 건너뛴다(셀러 실제 후기 오제거 방지).
 * 미입력이면(=대부분의 날조 케이스) 후기 스크럽을 적용한다.
 */
function sellerHasReviews(allow: string): boolean {
  return /후기|리뷰|고객\s*평|구매\s*평|평점|별점|사용\s*후기|추천사/i.test(allow);
}

/** 별점·평점 표기 제거(실제 후기 없을 때). 별 글리프 + 명시적 평점 패턴만 → 오제거 최소화. */
function stripRatings(text: string): string {
  return text
    .replace(/[★⭐✩✭✮⭑✰]/g, '')                                            // ★★★★★, ⭐ 등 별 글리프
    .replace(/(?:별점|평점)\s*[:\s]*\d(?:\.\d)?\s*(?:점|\/\s*5|만점)?/g, '')   // "별점 5", "평점 4.9점"
    .replace(/\d\.\d\s*\/\s*5(?:\.0)?/g, '')                                  // "4.9/5" (소수/5 = 평점 특정)
    .replace(/\d(?:\.\d)?\s*점\s*만점/g, '');                                 // "5점 만점"
}

/* ── 미검증 '주장형' 수치 그물 — slideBaked 수치 게이트와 동일 원칙(다자리 연속매칭) ──
 * 대상: 퍼센트(만족도 97%)·배수(2배 보습)·기간 주장(48시간 지속/2주 만에).
 * 비주장 수치(하루 2번·3단계·1+1)는 건드리지 않는다(카피 품질 보존).
 * 제거는 라인째(v5 호흡 = 짧은 줄 단위) — 수치만 빼서 어색한 빈자리를 만들지 않는다. */
/** knownFacts의 숫자 토큰 Set — 정확 매칭용("2배"의 "2"가 "200ml"의 부분 문자열로 오통과하지 않게) */
function collectFactNumbers(allow: string): Set<string> {
  return new Set((allow.match(/\d[\d,.]*\d|\d/g) ?? []).map(n => n.replace(/[,.]/g, '')));
}

function hasFabricatedClaimNumber(line: string, factNums: Set<string>): boolean {
  const bad = (num: string) => !factNums.has(num.replace(/[,.]/g, ''));
  // 퍼센트·배수 — 수치 자체가 주장(만족도/개선율/보습력 등)
  for (const re of [/(\d+(?:[.,]\d+)?)\s*%/g, /(\d+(?:[.,]\d+)?)\s*배/g]) {
    for (const m of line.matchAll(re)) {
      if (bad(m[1])) return true;
    }
  }
  // 기간 주장 — 숫자+기간 단위가 지속/유지/만에와 함께 쓰일 때만(배송·사용법 수치 오제거 방지)
  if (/(지속|유지|만에)/.test(line)) {
    for (const m of line.matchAll(/(\d+(?:[.,]\d+)?)\s*(?:시간|일|주일|주|개월|년)/g)) {
      if (bad(m[1])) return true;
    }
  }
  return false;
}

// 1인칭 과거형 경험담 라인 제거용 — 1인칭 marker와 과거 경험/칭찬을 '동시' 충족할 때만(오제거 최소화).
// 미래형 시나리오("만족하실 거예요")·대화체("~하지 않으셨나요?")·"우리 아이가 좋아하는 이유"는 걸리지 않는다.
const FIRST_PERSON = /저는|제가|우리\s*아이가|샀는데|샀어요|써\s*봤|써봤|사용해\s*봤|사용해봤|구매했|재구매/;
const PAST_PRAISE  = /좋았|만족했|효과.{0,4}봤|후회.{0,4}없었|잘\s*샀/;
function isTestimonialLine(line: string): boolean {
  return FIRST_PERSON.test(line) && PAST_PRAISE.test(line);
}

/** 셀러 원입력에 그 Brix 수치가 (당도/brix와 함께) 있으면 허용 — 셀러 입력값은 절대 막지 않도록 넉넉히 판정 */
function brixAllowed(num: string, allow: string): boolean {
  return new RegExp(`(?:당도[:\\s]*)?${num}\\s*(?:brix|브릭스)`, 'i').test(allow)
      || new RegExp(`당도[:\\s]*(?:약|대략|최대|최소|평균)?\\s*${num}`).test(allow)
      // 포맷이 달라도 셀러가 그 수치 + 당도/brix를 언급했으면 입력값으로 보고 허용(과차단 방지)
      || (new RegExp(`(?<!\\d)${num}(?!\\d)`).test(allow) && /brix|브릭스|당도/i.test(allow));
}

export function scrubText(text: string | undefined, allow: string): string {
  if (!text) return text ?? '';
  let out = text;

  // 1) Brix 수치(헤지 포함): "약 20Brix", "20 Brix", "20브릭스", "당도 약 20Brix" + 뒤 조사 흡수
  out = out.replace(
    /(?:당도\s*)?(?:약|대략|최대|최소|최고|평균|무려)?\s*(\d+(?:\.\d+)?)\s*(?:brix|브릭스)(?:의|은|는|이|가|로|으로|와|과|에|도)?/gi,
    (m, num) => (brixAllowed(num, allow) ? m : ''),
  );
  // 2) "당도 N(도)" — brix 단어 없이 수치만 단정. 미입력이면 수치만 제거(‘당도’ 단어는 정성표현으로 남김)
  out = out.replace(
    /당도[:\s]*(?:약|대략|최대|최소|평균)?\s*(\d+(?:\.\d+)?)\s*도?/g,
    (m, num) => (brixAllowed(num, allow) ? m : '당도'),
  );
  // 3) 품종 특성·등급 주장 — 미입력이면 단어 제거
  for (const w of VARIETY) {
    if (!allow.includes(w)) {
      out = out.replace(new RegExp(`\\s*${w}(?:의|인|한|감|적인|스러운)?`, 'g'), '');
    }
  }

  // 4) 미검증 주장형 수치(%·배·기간지속) — 라인째 드롭. 셀러 입력 수치(200ml·24,000원·할인율 등)는 통과.
  const factNums = collectFactNumbers(allow);
  out = out.split('\n').filter(l => !hasFabricatedClaimNumber(l, factNums)).join('\n');

  // 5) 가짜 후기/별점 — 셀러 실제 후기 미입력 시에만: 별점 표기 + 1인칭 과거 경험담 라인 제거.
  //    (실제 후기 있으면 skip → 오제거 방지. 미래형 시나리오·대화체는 조건 미충족이라 보존.)
  if (!sellerHasReviews(allow)) {
    out = stripRatings(out);
    out = out.split('\n').filter(l => !isTestimonialLine(l)).join('\n');
  }

  // 정리: 빈 괄호/대시 잔여·연속 공백·구두점 앞 공백·고아 기호 정리
  out = out
    .replace(/\(\s*\)/g, '')
    .replace(/—\s*(?=[,.\s]|$)/g, '')
    .replace(/\s+([,.!?·…])/g, '$1')
    .replace(/\s{2,}/g, ' ')
    .replace(/^[\s,·—–-]+/, '')
    .trim();
  return out;
}

function scrubBlock(b: Block, allow: string): Block | null {
  switch (b.type) {
    case 'stats': {
      // KPI 값에서 Brix가 제거돼 숫자가 사라지면 그 항목(가짜 KPI) 자체를 드롭
      const items = b.items
        .map(it => ({ value: scrubText(it.value, allow), label: scrubText(it.label, allow) }))
        .filter(it => it.value && it.value.trim().length > 0 && it.value.trim() !== '당도');
      return items.length ? { ...b, items } : null;
    }
    case 'iconcards':
      return { ...b, cards: b.cards.map(c => ({ title: scrubText(c.title, allow), desc: c.desc ? scrubText(c.desc, allow) : c.desc })) };
    case 'checklist':
      return { ...b, items: b.items.map(i => scrubText(i, allow)).filter(Boolean) };
    case 'steps':
      return { ...b, items: b.items.map(s => ({ title: scrubText(s.title, allow), desc: s.desc ? scrubText(s.desc, allow) : s.desc })) };
    case 'compare':
      return { ...b, rows: b.rows.map(r => r.map(c => scrubText(c, allow))) };
    case 'faq':
      return { ...b, items: b.items.map(q => ({ q: scrubText(q.q, allow), a: scrubText(q.a, allow) })) };
    case 'quote':
      // 셀러 실제 후기 미입력 → quote(후기 인용) 블록 자체가 날조(작성자·별점 포함) → 통째 드롭.
      //   (프롬프트도 미입력 시 quote 금지 지시 → 어겨서 나온 것을 출력단에서 최종 차단.)
      // 실제 후기 입력 시 → 보존하되 text의 미입력 수치(Brix 등)만 스크럽, author·rating은 유지.
      if (!sellerHasReviews(allow)) return null;
      return { ...b, text: scrubText(b.text, allow) };
    case 'heading':
      return { ...b, text: scrubText(b.text, allow) };
    case 'cta':
      return { ...b, text: scrubText(b.text, allow) };
    default:
      return b;
  }
}

interface CopyLike { headline: string; subcopy: string; body: string; blocks?: Block[]; [k: string]: unknown }

/** 카피 청크 결과에서 미입력 위험 사실을 제거. allowedRaw = 셀러 원입력(productName+productExtra). */
export function scrubCopyItems<T extends CopyLike>(items: T[], allowedRaw: string): T[] {
  const allow = (allowedRaw || '').toLowerCase();
  return items.map(it => ({
    ...it,
    headline: scrubText(it.headline, allow),
    subcopy: scrubText(it.subcopy, allow),
    body: scrubText(it.body, allow),
    blocks: it.blocks?.map(b => scrubBlock(b, allow)).filter((b): b is Block => b !== null),
  }));
}
