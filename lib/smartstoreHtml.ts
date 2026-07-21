import type { Section, Block } from '@/store/AppContext';
import { compareColumns } from '@/components/result/BlockRenderer';

/**
 * 스마트스토어 "HTML 작성" 탭 전용 HTML 생성 (2026-07-21).
 *
 * 상품등록 화면의 HTML 작성 모드는 legacy 지원이라 제약이 있다(화면 경고문 기준):
 *  - "일부 스크립트 및 태그는 자동 삭제" → <style>/<script>/class 의존 금지. 모든 스타일 인라인.
 *  - 레이아웃은 삭제 내성이 가장 좋은 table/div/p/span/img/strong/br 만 사용. SVG·아이콘폰트 금지(텍스트 기호로 대체).
 *  - 권장 크기 가로 860px → max-width 860 중앙 정렬.
 *  - 이미지는 data URL로 임베드(1차 실험) — 네이버가 거부하면 이미지 호스팅 경로로 전환 필요.
 *
 * 텍스트가 텍스트로 들어가므로 검색 노출에 잡히고, 디자인(제품색 pill·KPI·비교표)은 인라인 스타일로 재현.
 */

const FONT = "'Pretendard', -apple-system, 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif";

interface Theme { p: string; soft: string; sb: string }
const DEFAULT: Theme = { p: '#6D4CFF', soft: '#F4F0FF', sb: '#E6DEFF' };

function esc(s: string): string {
  return (s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function nl2br(s: string): string {
  return esc(s).replace(/\n/g, '<br/>');
}

/* ResultScreen.sectionDesignKind와 동일 판정(이름 키워드) — 섹션 상단 pill 문구 */
const PROBLEM_KEYS = ['공감', '고민', '일상', '불편', '걱정', '망설'];
const FEATURE_KEYS = ['솔루션', '해결', '성분', '제형', '특징', '효능', '원료'];
function pillLabel(sec: Section, isFirst: boolean, isLast: boolean): string | null {
  if (isFirst) return '추천 상품';
  if (isLast) return null;
  if (sec.blocks?.some(b => b.type === 'compare')) return null;
  const name = (sec.name ?? '').toLowerCase();
  if (PROBLEM_KEYS.some(k => name.includes(k))) return '이런 고민, 있으셨나요?';
  if (FEATURE_KEYS.some(k => name.includes(k))) return '이렇게 해결합니다';
  return null;
}

function blockHtml(b: Block, t: Theme, imgUrl?: string | null): string {
  switch (b.type) {
    case 'heading':
      return `<p style="margin:36px 0 12px;border-left:4px solid ${t.p};padding-left:12px;font-size:21px;font-weight:700;color:#111;line-height:1.45;">${nl2br(b.text)}</p>`;
    case 'paragraph':
      return `<p style="margin:14px 0 0;font-size:16px;color:#34343c;line-height:1.85;">${nl2br(b.text)}</p>`;
    case 'checklist':
      return (b.items ?? []).map(item =>
        `<div style="margin:10px 0 0;background:${t.soft};border:1px solid ${t.sb};border-radius:14px;padding:14px 16px;font-size:15px;color:#333;line-height:1.6;"><strong style="color:${t.p};">✓</strong>&nbsp; ${nl2br(item)}</div>`
      ).join('');
    case 'steps':
      return (b.items ?? []).map((it, i) =>
        `<div style="margin:10px 0 0;border:1px solid #ECECF2;border-radius:14px;padding:14px 16px;font-size:15px;color:#333;line-height:1.6;"><strong style="color:${t.p};">${i + 1}.</strong>&nbsp; <strong>${esc(it.title ?? '')}</strong>${it.desc ? ` — ${nl2br(it.desc)}` : ''}</div>`
      ).join('');
    case 'iconcards': {
      const cards = b.cards ?? [];
      // ⚠️네이버 SmartEditor ONE 변환기 내성(2026-07-21 실검증):
      //  - 둥근 배경 div(아이콘 원)는 변환 시 스타일이 벗겨짐 → 원 없이 큰 색 기호(✦)로 대체
      //  - 스페이서 td는 간격 배분이 틀어짐 → cellspacing으로 간격, 카드 td에 균등 width 명시
      const w = Math.floor(100 / Math.max(cards.length, 1));
      const cells = cards.map(c =>
        `<td width="${w}%" style="background:${t.soft};border:1px solid ${t.sb};border-radius:18px;padding:20px 12px;text-align:center;vertical-align:top;"><p style="margin:0 0 8px;font-size:21px;line-height:1;color:${t.p};">✦</p><p style="margin:0;font-size:15px;font-weight:700;color:#111;">${esc(c.title ?? '')}</p>${c.desc ? `<p style="margin:6px 0 0;font-size:13px;color:#666;line-height:1.5;">${nl2br(c.desc)}</p>` : ''}</td>`
      ).join('');
      return `<table width="100%" cellpadding="0" cellspacing="6" style="margin:14px 0 0;"><tr>${cells}</tr></table>`;
    }
    case 'stats': {
      const items = b.items ?? [];
      const cells = items.map(s =>
        `<td width="${Math.floor(100 / Math.max(items.length, 1))}%" style="text-align:center;padding:20px 8px;"><p style="margin:0;font-size:12.5px;font-weight:700;color:#666;">${esc(s.label ?? '')}</p><p style="margin:7px 0 0;font-size:28px;font-weight:800;color:${t.p};line-height:1.15;">${esc(s.value ?? '')}</p></td>`
      ).join('');
      return `<table width="100%" cellpadding="0" cellspacing="0" style="margin:18px 0 0;background:${t.soft};border:1px solid ${t.sb};border-radius:20px;"><tr>${cells}</tr></table>`;
    }
    case 'compare': {
      const headers = b.headers ?? [];
      const rows = b.rows ?? [];
      const { ourIdx } = compareColumns(headers);
      const th = headers.map((h, i) =>
        `<th style="padding:12px 10px;font-size:14px;border-bottom:2px solid ${i === ourIdx ? t.p : '#ECECF2'};color:${i === ourIdx ? t.p : '#666'};font-weight:${i === ourIdx ? 800 : 600};text-align:center;">${esc(h)}</th>`
      ).join('');
      const trs = rows.map(r =>
        `<tr>${r.map((c, i) => `<td style="padding:12px 10px;font-size:14px;border-bottom:1px solid #F0F0F4;text-align:center;color:${i === ourIdx ? t.p : '#444'};font-weight:${i === ourIdx ? 700 : 400};background:${i === ourIdx ? t.soft : '#fff'};">${esc(String(c))}</td>`).join('')}</tr>`
      ).join('');
      return `<table width="100%" cellpadding="0" cellspacing="0" style="margin:18px 0 0;border-collapse:collapse;">${th ? `<tr>${th}</tr>` : ''}${trs}</table>`;
    }
    case 'quote':
      return `<div style="margin:18px 0 0;border-left:3px solid ${t.p};padding:6px 0 6px 16px;font-size:15.5px;color:#444;line-height:1.7;font-style:italic;">“${nl2br(b.text)}”${b.author ? ` <span style="color:#999;font-style:normal;">— ${esc(b.author)}</span>` : ''}</div>`;
    case 'faq':
      return (b.items ?? []).map(it =>
        `<div style="margin:14px 0 0;"><p style="margin:0;font-size:15.5px;font-weight:700;color:#111;"><span style="color:${t.p};">Q.</span> ${nl2br(it.q ?? '')}</p><p style="margin:6px 0 0;font-size:15px;color:#555;line-height:1.7;"><span style="font-weight:700;color:#999;">A.</span> ${nl2br(it.a ?? '')}</p></div>`
      ).join('');
    case 'cta':
      return `<div style="margin:28px 0 0;background:${t.soft};border:1px solid ${t.sb};border-radius:28px;padding:40px 24px;text-align:center;"><p style="margin:0;font-size:26px;font-weight:800;color:#111;line-height:1.35;">${nl2br(b.text)}</p>${b.button ? `<p style="margin:16px 0 0;font-size:17px;font-weight:700;color:${t.p};">${nl2br(b.button)}</p>` : ''}</div>`;
    case 'image':
      return imgUrl ? `<img src="${imgUrl}" alt="" style="display:block;width:100%;border-radius:16px;margin:20px 0 0;"/>` : '';
    case 'hero':
      return `<p style="margin:24px 0 0;font-size:22px;font-weight:700;color:#111;">${nl2br(b.title ?? '')}</p>${b.subtitle ? `<p style="margin:8px 0 0;font-size:16px;color:#5b5b66;">${nl2br(b.subtitle)}</p>` : ''}`;
    default:
      return '';
  }
}

/** 최종 섹션 배열(표시 순서·숨김·수정 반영본) → 스마트스토어 HTML 작성 탭에 붙여넣는 단일 HTML.
 *  blockShot: 디자인 블록(KPI·체크리스트·비교표…)을 Flik 화면 그대로 찍은 캡처 이미지(data URL).
 *  ⚠️SmartEditor ONE 변환기가 border-radius·간격을 벗겨내 CSS로는 블록 디자인 재현 불가(2026-07-21 실검증,
 *  KPI가 각진 상자로 변함) — 반면 이미지는 완벽 보존되므로, 글은 텍스트(검색 노출)·블록은 캡처 이미지로 넣는다.
 *  캡처가 없는 블록만 인라인 HTML 폴백. */
export function buildSmartstoreHtml(
  sections: Section[],
  imgUrl: (secNum: string) => string | null,
  blockImgUrl: (secNum: string, blockIdx: number) => string | null,
  blockShot?: (secNum: string, blockIdx: number) => string | null,
): string {
  const parts = sections.map((sec, i) => {
    const t: Theme = {
      p:    sec.visual?.primary_color ?? DEFAULT.p,
      soft: sec.visual?.soft_color   ?? DEFAULT.soft,
      sb:   sec.visual?.soft_border  ?? DEFAULT.sb,
    };
    const isFirst = i === 0;
    const isLast = i === sections.length - 1;
    const pill = pillLabel(sec, isFirst, isLast);
    const own = imgUrl(sec.num);

    const chunks: string[] = [];
    if (pill) chunks.push(`<p style="margin:0;"><span style="display:inline-block;padding:7px 14px;border-radius:999px;background:${t.soft};border:1px solid ${t.sb};font-size:13px;font-weight:700;color:${t.p};">● ${esc(pill)}</span></p>`);
    if (sec.headline) chunks.push(`<p style="margin:${pill ? 14 : 0}px 0 0;font-size:${isFirst ? 25 : 22}px;font-weight:700;color:#111;line-height:1.45;">${nl2br(sec.headline)}</p>`);
    if (sec.subcopy) chunks.push(`<p style="margin:16px 0 0;font-size:16px;font-weight:600;color:#5b5b66;line-height:1.6;">${nl2br(sec.subcopy)}</p>`);
    if (sec.body) chunks.push(`<p style="margin:18px 0 0;font-size:16px;color:#34343c;line-height:1.85;">${nl2br(sec.body)}</p>`);
    if (own) chunks.push(`<img src="${own}" alt="${esc(sec.name ?? '')}" style="display:block;width:100%;border-radius:20px;margin:22px 0 0;"/>`);
    (sec.blocks ?? []).forEach((b, bi) => {
      // 디자인 블록은 캡처 이미지 우선(Flik 디자인 100% 보존) — 캡처 실패 시에만 인라인 HTML 폴백
      const shot = b.type !== 'image' ? blockShot?.(sec.num, bi) : null;
      if (shot) {
        chunks.push(`<img src="${shot}" alt="" style="display:block;width:100%;margin:18px 0 0;"/>`);
      } else {
        chunks.push(blockHtml(b, t, b.type === 'image' ? blockImgUrl(sec.num, bi) : undefined));
      }
    });

    return `<div style="padding:${isFirst ? 8 : 44}px 0 0;">${chunks.join('')}</div>`;
  });

  return `<div style="max-width:860px;margin:0 auto;font-family:${FONT};color:#111;background:#ffffff;">${parts.join('')}<div style="height:40px;"></div></div>`;
}
