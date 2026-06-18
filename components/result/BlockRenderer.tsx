'use client';

import {
  Check, Star, Quote as QuoteIcon, ChevronDown, ArrowRight,
  Leaf, Droplets, Sparkles, ShieldCheck,
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
const DEFAULT_THEME: BlockTheme = {
  primary: COLORS.primary, accent: COLORS.primary, soft: COLORS.lightPurple, softBorder: COLORS.lightPurpleBorder,
};
const ThemeCtx = createContext<BlockTheme>(DEFAULT_THEME);
const useBlockTheme = () => useContext(ThemeCtx);

const ICONS = [Leaf, Droplets, Sparkles, ShieldCheck];

/* ─── hero (GPT Design System V1) ─── */
// 명세: gradient(soft→white) 컨테이너 + 중앙 대형 headline + subcopy.
// KPI Row / Product Image Area는 hero 블록 데이터에 값이 없으면 생략(미입력 날조 금지).
// 실제 KPI는 stats 블록, 제품 이미지는 image 블록/ImgSlot이 담당(이번 범위 외).
function HeroBlock({ title, subtitle, isMobile }: { title: string; subtitle?: string; isMobile?: boolean }) {
  const t = useBlockTheme();
  return (
    <section style={{
      maxWidth: 760, margin: '0 auto 32px',
      padding: isMobile ? 32 : 48,
      background: `linear-gradient(180deg, ${t.soft} 0%, ${COLORS.white} 100%)`,
      border: `1px solid ${t.softBorder}`, borderRadius: 32,
      textAlign: 'center',
    }}>
      <h1 style={{
        margin: '0 auto', maxWidth: 560,
        fontSize: isMobile ? 34 : 48, fontWeight: 800, lineHeight: 1.15, letterSpacing: '-0.04em',
        color: COLORS.text,
        whiteSpace: isMobile ? 'normal' : 'pre-line',
      }}>
        {title}
      </h1>
      {subtitle && (
        <p style={{
          margin: '16px auto 0', maxWidth: 560,
          fontSize: isMobile ? 16 : 18, lineHeight: 1.7, color: COLORS.text, opacity: 0.7,
          whiteSpace: isMobile ? 'normal' : 'pre-line',
        }}>
          {subtitle}
        </p>
      )}
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
function ChecklistBlock({ items }: { items: string[] }) {
  const t = useBlockTheme();
  return (
    <div style={{
      marginBottom: 32,
      borderRadius: 24, border: `1px solid ${COLORS.border}`, background: COLORS.white,
      padding: 20,
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {items.map((item, i) => (
          <div key={i} style={{ display: 'flex', gap: 12, fontSize: 15, lineHeight: 1.7, color: COLORS.text333 }}>
            <Check size={18} strokeWidth={2.5} style={{ marginTop: 4, flexShrink: 0, color: t.primary }} />
            <span>{item}</span>
          </div>
        ))}
      </div>
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
function IconCardsBlock({ cards, isMobile }: { cards: { title: string; desc?: string }[]; isMobile?: boolean }) {
  const t = useBlockTheme();
  const cols = isMobile ? 2 : (cards.length >= 4 ? 4 : Math.max(2, cards.length));
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
          case 'hero':      return <HeroBlock      key={i} title={b.title} subtitle={b.subtitle} isMobile={isMobile} />;
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
