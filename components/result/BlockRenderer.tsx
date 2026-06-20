'use client';

import {
  Check, Star, Quote as QuoteIcon, ChevronDown, ArrowRight,
  Leaf, Droplets, Sparkles, ShieldCheck, Image as ImageIcon,
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

// Hero 헤드라인 글자수 기반 반응형 크기 — 짧으면 크게, 길면 자동 축소(긴 한글에서 3줄 터짐 방지).
// clamp(모바일 최소, 6.2vw, 데스크탑 최대): 폭에 따라 유동 + 길이로 상한 캡.
function heroHeadlineSize(headline: string): string {
  const len = (headline ?? '').replace(/\s/g, '').length; // 공백 제외 글자수
  const deskMax = len <= 13 ? 48 : len <= 20 ? 42 : len <= 28 ? 36 : 31;
  const mobMin  = len <= 13 ? 29 : len <= 20 ? 26 : len <= 28 ? 23 : 21;
  return `clamp(${mobMin}px, 6.2vw, ${deskMax}px)`;
}
export function HeroBlock({ headline, subcopy, kpis = [], productImage, primary, accent, soft, softBorder }: {
  headline: string;
  subcopy?: string;
  kpis?: HeroKPI[];
  productImage?: string | null;
  primary: string;
  accent: string;
  soft: string;
  softBorder: string;
}) {
  return (
    <section className="mx-auto max-w-[760px]">
      {/* 박스 제거(A안) — 바깥 그라데이션 카드/테두리 없이 첫 섹션 콘텐츠로 흐름. 요소는 유지. */}
      <div className="px-6 pb-10 pt-6 md:px-8 md:pb-12">
        <div className="flex justify-center">
          <div className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium" style={{ background: soft, borderColor: softBorder, color: primary }}>
            <Sparkles size={14} />
            추천 상품
          </div>
        </div>
        <h1
          className="mx-auto mt-6 max-w-[620px] text-center font-extrabold tracking-[-0.04em] text-zinc-900"
          style={{ fontSize: heroHeadlineSize(headline), lineHeight: 1.22, textWrap: 'balance' }}
        >
          {headline}
        </h1>
        {subcopy && (
          <p className="mx-auto mt-5 max-w-[560px] text-center text-[16px] leading-relaxed text-zinc-600 md:text-[18px]">
            {subcopy}
          </p>
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
            /* 이미지 — 흰 박스에 가두지 않고 자연스럽게(라운드만) */
            // eslint-disable-next-line @next/next/no-img-element
            <img src={productImage} alt="" className="mx-auto block max-h-[400px] w-auto rounded-[24px] object-contain" />
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

/* ─── stats ─── */
function StatsBlock({ items, isMobile }: { items: { value: string; label: string }[]; isMobile?: boolean }) {
  const t = useBlockTheme();
  const cols = isMobile ? 2 : items.length;
  return (
    <div style={{
      marginBottom: 32,
      display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`,
      overflow: 'hidden',
      borderRadius: 24, border: `1px solid ${t.softBorder}`,
      background: t.soft,
    }}>
      {items.map((s, i) => (
        <div key={i} style={{
          padding: 20, textAlign: 'center',
          borderRight: isMobile
            ? (i % cols !== cols - 1 ? `1px solid ${t.softBorder}` : 'none')
            : (i !== items.length - 1 ? `1px solid ${t.softBorder}` : 'none'),
          borderTop: isMobile && i >= cols ? `1px solid ${t.softBorder}` : 'none',
        }}>
          <div style={{ fontSize: 30, fontWeight: 900, letterSpacing: '-0.04em', color: t.primary }}>
            {s.value}
          </div>
          <div style={{ marginTop: 4, fontSize: 13, color: COLORS.textSub }}>{s.label}</div>
        </div>
      ))}
    </div>
  );
}

/* ─── compare (GPT Design System V1 — SaaS 표 금지, 2컬럼 카드) ─── */
// 데이터: headers=[구분?, 제품A, 제품B], rows=[[항목명?, A값, B값]]. 마지막 컬럼=우리(추천), 그 앞=일반.
// 모든 값은 compare 블록 데이터 그대로(임의 생성 없음). "추천"은 UI 강조 라벨.
function CompareBlock({ headers, rows, isMobile }: { headers: string[]; rows: string[][]; isMobile?: boolean }) {
  const t = useBlockTheme();
  const cols = headers.length;
  const hasLabel = cols >= 3;                 // 첫 컬럼이 항목명인지
  const genIdx = hasLabel ? 1 : 0;            // 일반(앞 제품)
  const ourIdx = cols - 1;                    // 우리(마지막 제품, 추천)
  const genName = headers[genIdx] ?? '일반 제품';
  const ourName = headers[ourIdx] ?? '이 제품';
  const items = rows.map(r => ({
    label: hasLabel ? (r[0] ?? '') : '',
    gen:   r[genIdx] ?? '',
    our:   r[ourIdx] ?? '',
  }));

  const renderCard = (name: string, mine: boolean) => (
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
      <div style={{ fontSize: 16, fontWeight: 800, color: mine ? t.primary : COLORS.textSub, marginBottom: 6 }}>{name}</div>
      {items.map((it, i) => (
        <div key={i} style={{
          height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
          borderTop: i > 0 ? `1px solid ${mine ? t.softBorder : COLORS.border}` : 'none',
        }}>
          {it.label && <span style={{ fontSize: 15, fontWeight: 600, color: COLORS.text }}>{it.label}</span>}
          <span style={{ fontSize: 15, fontWeight: mine ? 700 : 500, color: mine ? t.primary : COLORS.textSub, textAlign: 'right' }}>
            {mine ? it.our : it.gen}
          </span>
        </div>
      ))}
    </div>
  );

  return (
    <div style={{
      marginBottom: 32,
      display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
      gap: isMobile ? 28 : 20, alignItems: 'start',
      paddingTop: 14,  // 추천 뱃지(top:-14) 여백
    }}>
      {renderCard(genName, false)}
      {renderCard(ourName, true)}
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
