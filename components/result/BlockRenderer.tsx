'use client';

import {
  Check, Star, Quote as QuoteIcon, ChevronDown, ArrowRight,
  Leaf, Droplets, Sparkles, ShieldCheck, Image as ImageIcon,
  Calendar, Coins, Package,
} from 'lucide-react';
import { createContext, useContext, type ReactNode } from 'react';
import { Block } from '@/store/AppContext';

export type BlockImgState = { loading: boolean; url: string | null; error: boolean; aspectRatio?: string };

const COLORS = {
  primary: '#6D4CFF',
  text: '#111111',
  text333: '#333333',
  textSub: '#666666',
  textMute: '#999999',
  border: '#ECECF2',
  bg: '#FAFAFC',
  lightPurple: '#F4F0FF',
  lightPurpleBorder: '#E6DEFF',
  comparePurpleSoft: '#FBFAFF',
  white: '#FFFFFF',
};
const SHADOW = '0 8px 24px rgba(0,0,0,0.04)';
const FONT_FAMILY = "var(--f), Pretendard, -apple-system, system-ui, sans-serif";
const PAD = 48;

/* ── 결과물 색상 테마 — 제품별 색(visual)을 Context로 주입. 미주입 시 브랜드 보라 폴백 ── */
interface BlockTheme { primary: string; accent: string; soft: string; softBorder: string; }
export const DEFAULT_THEME: BlockTheme = {
  primary: COLORS.primary, accent: COLORS.primary, soft: COLORS.lightPurple, softBorder: COLORS.lightPurpleBorder,
};
const ThemeCtx = createContext<BlockTheme>(DEFAULT_THEME);
const useBlockTheme = () => useContext(ThemeCtx);

const ICONS = [Leaf, Droplets, Sparkles, ShieldCheck];

/* ─── hero (GPT Design System V2 — GPT 제공 완성 코드 그대로) ─── */
// 색은 ThemeContext에서 받아 prop으로 주입(hex 하드코딩 금지). kpis/productImage는 hero 블록 데이터에
// 없으면 미전달 → KPI Row 생략, 이미지 placeholder(장식 원+아이콘) 표시. Confidence Line(headline 중복) 없음.
interface HeroKPI { value: string; label: string; }

// Hero 헤드라인 크기 — 공감(Problem) 헤드라인(23px)과 같은 급으로 통일.
function heroHeadlineSize(): string {
  return 'clamp(21px, 2.8vw, 24px)';
}
export function HeroBlock({ headline, subcopy, kpis = [], productImage, onImageClick, bodySlot, primary, accent, soft, softBorder }: {
  headline: string;
  subcopy?: string;
  kpis?: HeroKPI[];
  productImage?: string | null;
  onImageClick?: () => void;
  bodySlot?: ReactNode;     // 설명 본문 — 이미지 위(헤드라인→설명→이미지 순)에 렌더
  primary: string;
  accent: string;
  soft: string;
  softBorder: string;
}) {
  return (
    <section>
      {/* 박스 제거(A안) + 공감(Problem) 섹션과 동일 정렬: 태그·제목·설명 왼쪽 정렬, 이미지만 가운데.
          가로 패딩은 BlogSection의 hero 래퍼(데스크탑 36px)가 제공 → 여기선 세로 패딩만. */}
      <div className="pb-10 pt-6 md:pb-12">
        {/* 추천 상품 태그 — 공감 태그처럼 왼쪽 pill(soft 배경 + 점) */}
        <div className="inline-flex items-center gap-[7px] rounded-full border px-3.5 py-[7px] text-[13px] font-bold" style={{ background: soft, borderColor: softBorder, color: primary }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: primary, flexShrink: 0 }} />
          추천 상품
        </div>
        <h1
          className="mt-3.5 text-left font-bold text-zinc-900"
          style={{ fontSize: heroHeadlineSize(), fontWeight: 700, lineHeight: 1.45, letterSpacing: '-0.4px', wordBreak: 'keep-all', whiteSpace: 'pre-line' }}
        >
          {headline}
        </h1>
        {subcopy && (
          <p className="mt-5 text-left" style={{ fontSize: 16, fontWeight: 600, color: '#5b5b66', lineHeight: 1.6, letterSpacing: '-0.2px', wordBreak: 'keep-all' }}>
            {subcopy}
          </p>
        )}
        {/* 설명 본문 — 헤드라인 → 설명 → 이미지. 왼쪽 정렬 */}
        {bodySlot && (
          <div className="mt-5 text-left">{bodySlot}</div>
        )}
        {kpis.length > 0 && (
          <div className="mt-10 grid grid-cols-3 gap-3">
            {kpis.map((item, idx) => (
              <div key={idx} className="rounded-[22px] border bg-white p-4 text-center shadow-sm" style={{ borderColor: softBorder }}>
                <div className="text-[22px] font-extrabold md:text-[30px]" style={{ color: primary }}>{item.value}</div>
                <div className="mt-1 text-[12px] font-medium text-zinc-500 md:text-[13px]">{item.label}</div>
              </div>
            ))}
          </div>
        )}
        <div className="mt-9">
          {productImage ? (
            /* 이미지 — 흰 박스에 가두지 않고 자연스럽게(라운드만). 비율 유지(contain) + 반응형 크기. 클릭 시 확대. */
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={productImage} alt=""
              onClick={onImageClick}
              className="mx-auto block rounded-[24px]"
              style={{ width: '100%', maxWidth: 860, height: 'auto', objectFit: 'contain', cursor: onImageClick ? 'zoom-in' : 'default' }}
            />
          ) : (
            /* 미생성 placeholder — soft 톤의 가벼운 자리(흰 카드 아님) */
            <div className="relative flex h-[240px] flex-col items-center justify-center overflow-hidden rounded-[24px] md:h-[320px]" style={{ background: soft }}>
              <div className="absolute h-[200px] w-[200px] rounded-full opacity-10" style={{ background: primary }} />
              <div className="absolute h-[130px] w-[130px] rounded-full opacity-20" style={{ background: accent }} />
              <div className="relative flex flex-col items-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white" style={{ color: primary }}>
                  <ImageIcon size={30} />
                </div>
                <p className="mt-4 text-sm text-zinc-500">제품 이미지가 생성되면 여기에 표시됩니다</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

/* ─── heading ─── */
function HeadingBlock({ text }: { text: string }) {
  const t = useBlockTheme();
  return (
    <h2 style={{
      margin: '40px 0 16px',
      borderLeft: `4px solid ${t.primary}`,
      paddingLeft: 12,
      fontSize: 21, fontWeight: 700, lineHeight: 1.45, letterSpacing: '-0.03em',
      color: COLORS.text, whiteSpace: 'pre-line',
    }}>
      {text}
    </h2>
  );
}

/* ─── paragraph ─── */
function ParagraphBlock({ text }: { text: string }) {
  return (
    <p style={{
      margin: '0 0 24px',
      fontSize: 16, lineHeight: 1.9, color: COLORS.textSub, whiteSpace: 'pre-line',
    }}>
      {text}
    </p>
  );
}

/* ─── checklist ─── */
// 공감(Problem) 섹션 체크리스트 — 항목별 soft 테마 카드 + 원형 체크아이콘. 색은 ThemeContext.
function ChecklistBlock({ items }: { items: string[] }) {
  const t = useBlockTheme();
  return (
    <div style={{ marginBottom: 32, display: 'flex', flexDirection: 'column', gap: 10 }}>
      {items.map((item, i) => (
        <div key={i} style={{
          display: 'flex', gap: 12, alignItems: 'flex-start',
          background: t.soft, border: `1px solid ${t.softBorder}`,
          borderRadius: 16, padding: '14px 16px',
          fontSize: 15, lineHeight: 1.6, color: COLORS.text333,
        }}>
          <span style={{
            flexShrink: 0, marginTop: 1, width: 22, height: 22, borderRadius: '50%',
            background: t.primary, color: COLORS.white,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Check size={14} strokeWidth={3} />
          </span>
          <span>{item}</span>
        </div>
      ))}
    </div>
  );
}

/* ─── steps ─── */
function StepsBlock({ items }: { items: { title: string; desc?: string }[] }) {
  const t = useBlockTheme();
  return (
    <div style={{ marginBottom: 32, display: 'flex', flexDirection: 'column', gap: 12 }}>
      {items.map((step, i) => (
        <div key={i} style={{
          display: 'flex', gap: 16,
          borderRadius: 24, border: `1px solid ${COLORS.border}`, background: COLORS.white,
          padding: 20,
        }}>
          <div style={{
            width: 32, height: 32, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: '50%', background: t.primary,
            color: COLORS.white, fontSize: 14, fontWeight: 700,
          }}>
            {i + 1}
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: COLORS.text }}>{step.title}</div>
            {step.desc && (
              <div style={{ marginTop: 4, fontSize: 14, lineHeight: 1.7, color: COLORS.textSub }}>{step.desc}</div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── iconcards ─── */
// 솔루션(Feature) 성분/기능 카드 — 데스크탑 2x2(4개)·모바일 1열. 색은 ThemeContext.
function IconCardsBlock({ cards, isMobile }: { cards: { title: string; desc?: string }[]; isMobile?: boolean }) {
  const t = useBlockTheme();
  const cols = isMobile ? 1 : (cards.length >= 4 ? 2 : Math.max(2, cards.length));
  return (
    <div style={{
      marginBottom: 32,
      display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 12,
    }}>
      {cards.map((card, i) => {
        const Icon = ICONS[i % ICONS.length];
        return (
          <div key={i} style={{
            borderRadius: 24, border: `1px solid ${COLORS.border}`, background: COLORS.white,
            padding: 20, textAlign: 'center',
            boxShadow: SHADOW,
          }}>
            <div style={{
              margin: '0 auto 12px', width: 48, height: 48,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: '50%', background: t.soft, color: t.primary,
            }}>
              <Icon size={24} />
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.text }}>{card.title}</div>
            {card.desc && (
              <div style={{ marginTop: 4, fontSize: 13, lineHeight: 1.5, color: COLORS.textSub }}>{card.desc}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ─── stats (KPI) — 참고 이미지 스타일: 아이콘 원 → 값 → 라벨, 가로 배열, 배경 카드 없이 깔끔.
   값/라벨로 아이콘만 선택(데이터 생성 아님). 색은 ThemeContext. ─── */
function statIcon(value: string, label: string) {
  const s = `${value} ${label}`.toLowerCase();
  if (/일|개월|주|기간|day|개월|회/.test(s)) return Calendar;
  if (/원|가격|할인|₩|가성비|비용/.test(s)) return Coins;
  if (/ml|용량|대용량|리터|\bl\b|kg|\bg\b|중량/.test(s)) return Package;
  if (/등급|인증|안심|성분|ewg|무첨가|안전|테스트/.test(s)) return ShieldCheck;
  if (/방울|수분|보습|워터|함량%?/.test(s)) return Droplets;
  return Leaf;
}
function StatsBlock({ items, isMobile }: { items: { value: string; label: string }[]; isMobile?: boolean }) {
  const t = useBlockTheme();
  const cols = isMobile ? 2 : Math.min(items.length, 4);
  return (
    <div style={{
      marginBottom: 32,
      display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`,
      columnGap: isMobile ? 16 : 12, rowGap: isMobile ? 28 : 0,
    }}>
      {items.map((s, i) => {
        const Icon = statIcon(s.value, s.label);
        return (
          <div key={i} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
            padding: '22px 12px', borderRadius: 18, border: `1px solid ${t.softBorder}`, background: COLORS.white,
          }}>
            <div style={{
              width: 56, height: 56, borderRadius: '50%',
              background: t.soft, color: t.primary,
              display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12,
            }}>
              <Icon size={26} strokeWidth={1.8} />
            </div>
            <div style={{ fontSize: isMobile ? 19 : 21, fontWeight: 800, letterSpacing: '-0.03em', color: t.primary, lineHeight: 1.2 }}>
              {s.value}
            </div>
            <div style={{ marginTop: 6, fontSize: 13, fontWeight: 600, color: COLORS.text333, lineHeight: 1.45 }}>
              {s.label}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ─── compare (GPT Design System V1 — SaaS 표 금지, 2컬럼 카드) ─── */
// ⭐"우리 제품"을 데이터로 판정해 강조(추천 배지·primary·scale). 위치(좌/우)는 헤더 순서 유지.
// 일반/타사/시중 등 키워드가 있는 컬럼=일반, 나머지=우리. 둘 다 없으면 마지막 컬럼을 우리로(폴백).
const CMP_GEN_KW = ['일반', '타사', '타제품', '시중', '기존', '경쟁', '다른', '보통', '평범', '여타', '기타', '시판'];
const CMP_OUR_KW = ['우리', '이 제품', '본 제품', '자사', '추천', '저희'];
export function compareColumns(headers: string[]): { hasLabel: boolean; leftIdx: number; rightIdx: number; ourIdx: number } {
  const cols = headers.length;
  const hasLabel = cols >= 3;
  const prodCols: number[] = [];
  for (let i = hasLabel ? 1 : 0; i < cols; i++) prodCols.push(i);
  const has = (h: string, kws: string[]) => kws.some(k => (h || '').includes(k));
  let genIdx = -1, ourIdx = -1;
  for (const i of prodCols) {
    if (genIdx < 0 && has(headers[i], CMP_GEN_KW)) genIdx = i;
    if (ourIdx < 0 && has(headers[i], CMP_OUR_KW)) ourIdx = i;
  }
  if (genIdx >= 0 && ourIdx < 0) ourIdx = prodCols.find(i => i !== genIdx) ?? prodCols[prodCols.length - 1];
  if (ourIdx >= 0 && genIdx < 0) genIdx = prodCols.find(i => i !== ourIdx) ?? prodCols[0];
  if (ourIdx < 0) ourIdx = prodCols[prodCols.length - 1]; // 폴백: 우리=마지막 컬럼
  const leftIdx = prodCols[0];
  const rightIdx = prodCols[prodCols.length - 1];
  return { hasLabel, leftIdx, rightIdx, ourIdx };
}
function CompareBlock({ headers, rows, isMobile }: { headers: string[]; rows: string[][]; isMobile?: boolean }) {
  const t = useBlockTheme();
  const { hasLabel, leftIdx, rightIdx, ourIdx } = compareColumns(headers);

  const renderCard = (colIdx: number, mine: boolean) => (
    <div style={{
      position: 'relative',
      background: mine ? t.soft : COLORS.bg,
      opacity: mine ? 1 : 0.75,
      border: mine ? `2px solid ${t.primary}` : `1px solid ${COLORS.border}`,
      borderRadius: 28, padding: 28,
      transform: (!isMobile && mine) ? 'scale(1.03)' : 'none',
      boxShadow: mine ? '0 16px 40px rgba(0,0,0,.06)' : 'none',
    }}>
      {mine && (
        <div style={{
          position: 'absolute', top: -14, left: 28,
          background: t.primary, color: COLORS.white, borderRadius: 999,
          padding: '8px 14px', fontSize: 13, fontWeight: 700,
        }}>추천</div>
      )}
      <div style={{ fontSize: 16, fontWeight: 800, color: mine ? t.primary : COLORS.textSub, marginBottom: 6 }}>{headers[colIdx] ?? (mine ? '이 제품' : '일반 제품')}</div>
      {rows.map((r, i) => {
        const label = hasLabel ? (r[0] ?? '') : '';
        return (
          <div key={i} style={{
            height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
            borderTop: i > 0 ? `1px solid ${mine ? t.softBorder : COLORS.border}` : 'none',
          }}>
            {label && <span style={{ fontSize: 15, fontWeight: 600, color: COLORS.text }}>{label}</span>}
            <span style={{ fontSize: 15, fontWeight: mine ? 700 : 500, color: mine ? t.primary : COLORS.textSub, textAlign: 'right' }}>
              {r[colIdx] ?? ''}
            </span>
          </div>
        );
      })}
    </div>
  );

  return (
    <div style={{
      marginBottom: 32,
      display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
      gap: isMobile ? 28 : 20, alignItems: 'start',
      paddingTop: 14,  // 추천 뱃지(top:-14) 여백
    }}>
      {renderCard(leftIdx, leftIdx === ourIdx)}
      {renderCard(rightIdx, rightIdx === ourIdx)}
    </div>
  );
}

/* ─── quote ─── */
function QuoteBlock({ text, author, rating }: { text: string; author?: string; rating?: number }) {
  const t = useBlockTheme();
  const stars = typeof rating === 'number' && rating > 0 ? Math.min(5, Math.max(0, Math.round(rating))) : 5;
  return (
    <div style={{
      marginBottom: 32,
      borderRadius: 24, border: `1px solid ${t.softBorder}`, background: t.soft,
      padding: 24,
    }}>
      <QuoteIcon size={30} style={{ marginBottom: 16, color: t.primary }} />
      <p style={{
        margin: 0,
        fontSize: 16, lineHeight: 1.85, color: COLORS.text333, whiteSpace: 'pre-line',
      }}>
        {text}
      </p>
      <div style={{
        marginTop: 16,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
      }}>
        <div style={{ display: 'flex', color: t.accent }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} size={16} fill={i < stars ? t.accent : 'none'} color={t.accent} />
          ))}
        </div>
        {author && (
          <span style={{ fontSize: 13, color: COLORS.textSub }}>{author}</span>
        )}
      </div>
    </div>
  );
}

/* ─── faq ─── */
function FaqBlock({ items }: { items: { q: string; a: string }[] }) {
  return (
    <div style={{
      marginBottom: 32,
      borderRadius: 24, border: `1px solid ${COLORS.border}`, background: COLORS.white,
    }}>
      {items.map((f, i) => (
        <div key={i} style={{
          padding: 20,
          borderBottom: i !== items.length - 1 ? `1px solid ${COLORS.border}` : 'none',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.text }}>Q. {f.q}</div>
            <ChevronDown size={18} style={{ flexShrink: 0, color: COLORS.textMute }} />
          </div>
          <div style={{ marginTop: 8, fontSize: 14, lineHeight: 1.7, color: COLORS.textSub }}>{f.a}</div>
        </div>
      ))}
    </div>
  );
}

/* ─── image ─── */
function ImageBlock({ label, imgState, onLightbox, overlay }: { label: string; imgState?: BlockImgState; onLightbox?: () => void; overlay?: ReactNode }) {
  const t = useBlockTheme();
  // imgState.aspectRatio는 Gemini 포맷("4:5"/"16:9"/"1:1"). CSS는 "4/5" 같은 슬래시.
  const cssAspect = imgState?.aspectRatio ? imgState.aspectRatio.replace(':', '/') : '1/1';
  if (imgState?.url) {
    return (
      <div className="img-regen-wrap" style={{
        marginBottom: 32, overflow: 'hidden',
        borderRadius: 24, border: `1px solid ${COLORS.border}`,
      }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imgState.url}
          alt={label}
          onClick={onLightbox}
          style={{
            width: '100%', aspectRatio: cssAspect, objectFit: 'contain', display: 'block',
            background: COLORS.bg,
            cursor: onLightbox ? 'zoom-in' : 'default',
          }}
        />
        {overlay}
      </div>
    );
  }
  const loading = imgState?.loading;
  const error = imgState?.error;
  return (
    <div className="img-regen-wrap" style={{
      marginBottom: 32, aspectRatio: cssAspect, overflow: 'hidden',
      borderRadius: 24, border: `1px solid ${COLORS.border}`,
      background: `linear-gradient(135deg, ${t.soft} 0%, ${COLORS.white} 50%, ${COLORS.bg} 100%)`,
    }}>
      {overlay}
      <div style={{
        height: '100%',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10,
      }}>
        {loading && (
          <div style={{
            width: 28, height: 28, borderRadius: '50%',
            border: '3px solid #cbd5e1', borderTopColor: t.primary,
            animation: 'spin 0.8s linear infinite',
          }} />
        )}
        <div style={{
          padding: '8px 16px', borderRadius: 999,
          background: 'rgba(255,255,255,0.8)', boxShadow: SHADOW,
          fontSize: 13, fontWeight: 700, color: t.primary,
        }}>
          {loading ? '이미지 생성 중...' : label}
        </div>
        {error && <div style={{ fontSize: 11, color: '#ef4444' }}>생성 실패</div>}
      </div>
    </div>
  );
}

/* ─── cta (GPT Design System V1 — 배경 분리·종료감) ─── */
// 명세: soft 배경 컨테이너 + 중앙 대형 headline + 버튼.
// Subcopy는 cta 블록 데이터에 없어 생략. Trust Row(무료배송/안심포장/간편교환)는 셀러가 입력한
// 약속이 아니면 표시광고법상 허위 → 데이터 없으면 생략(임의 생성 금지).
function CtaBlock({ text, button, isMobile }: { text: string; button: string; isMobile?: boolean }) {
  const t = useBlockTheme();
  return (
    <div style={{
      maxWidth: 760, margin: '0 auto',
      padding: isMobile ? 36 : 56,
      borderRadius: 36, border: `1px solid ${t.softBorder}`, background: t.soft,
      textAlign: 'center',
    }}>
      <h2 style={{
        margin: 0,
        fontSize: isMobile ? 30 : 42, fontWeight: 800, lineHeight: 1.2, letterSpacing: '-0.04em',
        color: COLORS.text,
        whiteSpace: isMobile ? 'normal' : 'pre-line',
      }}>
        {text}
      </h2>
      <button
        onMouseEnter={e => { e.currentTarget.style.filter = 'brightness(0.95)'; }}
        onMouseLeave={e => { e.currentTarget.style.filter = 'none'; }}
        style={{
          marginTop: 40, height: 60,
          width: isMobile ? '100%' : 320,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          borderRadius: 18, background: t.primary, color: COLORS.white,
          border: 'none', fontSize: 18, fontWeight: 700, cursor: 'pointer',
          fontFamily: FONT_FAMILY,
        }}>
        {button}
        <ArrowRight size={18} />
      </button>
    </div>
  );
}

/* ─── 메인 렌더러 ─── */
export default function BlockRenderer({ blocks, sectionNum, blockImages, onLightboxBlock, isMobile, regenOverlay, primaryColor, accentColor, softColor, softBorder }: {
  blocks: Block[];
  sectionNum?: string;
  blockImages?: Record<string, BlockImgState>;
  onLightboxBlock?: (key: string) => void;
  isMobile?: boolean;
  /** 섹션 재생성 버튼 — 첫 image 블록 우상단에 오버레이로 렌더 (없으면 미표시) */
  regenOverlay?: ReactNode;
  /** 제품별 결과물 색(visual). 미지정 시 브랜드 보라 폴백 — Flik UI 색과 무관 */
  primaryColor?: string;
  accentColor?: string;
  softColor?: string;
  softBorder?: string;
}) {
  const pad = isMobile ? 16 : PAD;
  const firstImageIdx = blocks.findIndex(b => b.type === 'image');
  const theme: BlockTheme = {
    primary:    primaryColor ?? DEFAULT_THEME.primary,
    accent:     accentColor  ?? DEFAULT_THEME.accent,
    soft:       softColor    ?? DEFAULT_THEME.soft,
    softBorder: softBorder   ?? DEFAULT_THEME.softBorder,
  };
  return (
    <ThemeCtx.Provider value={theme}>
    <div style={{
      background: COLORS.white,
      padding: `${pad}px ${pad}px ${pad}px`,
      fontFamily: FONT_FAMILY,
      color: COLORS.text,
    }}>
      {blocks.map((b, i) => {
        switch (b.type) {
          case 'hero':      return <HeroBlock      key={i} headline={b.title} subcopy={b.subtitle} primary={theme.primary} accent={theme.accent} soft={theme.soft} softBorder={theme.softBorder} />;
          case 'heading':   return <HeadingBlock   key={i} text={b.text} />;
          case 'paragraph': return <ParagraphBlock key={i} text={b.text} />;
          case 'checklist': return <ChecklistBlock key={i} items={b.items} />;
          case 'steps':     return <StepsBlock     key={i} items={b.items} />;
          case 'iconcards': return <IconCardsBlock key={i} cards={b.cards} isMobile={isMobile} />;
          case 'stats':     return <StatsBlock     key={i} items={b.items} isMobile={isMobile} />;
          case 'compare':   return <CompareBlock   key={i} headers={b.headers} rows={b.rows} isMobile={isMobile} />;
          case 'quote':     return <QuoteBlock     key={i} text={b.text} author={b.author} rating={b.rating} />;
          case 'faq':       return <FaqBlock       key={i} items={b.items} />;
          case 'image': {
            const key = sectionNum ? `${sectionNum}#${i}` : '';
            const imgState = blockImages && key ? blockImages[key] : undefined;
            const onLightbox = imgState?.url && onLightboxBlock && key ? () => onLightboxBlock(key) : undefined;
            return <ImageBlock key={i} label={b.label} imgState={imgState} onLightbox={onLightbox} overlay={i === firstImageIdx ? regenOverlay : undefined} />;
          }
          case 'cta':       return <CtaBlock       key={i} text={b.text} button={b.button} isMobile={isMobile} />;
          default:          return null;
        }
      })}
    </div>
    </ThemeCtx.Provider>
  );
}
