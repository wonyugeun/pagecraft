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

/** 셀러 원입력에 그 Brix 수치가 (당도/brix와 함께) 있으면 허용 */
function brixAllowed(num: string, allow: string): boolean {
  return new RegExp(`(?:당도[:\\s]*)?${num}\\s*(?:brix|브릭스)`, 'i').test(allow)
      || new RegExp(`당도[:\\s]*(?:약|대략|최대|최소|평균)?\\s*${num}`).test(allow);
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
