'use client';

import {
  Check, Star, Quote as QuoteIcon, ChevronDown, ArrowRight,
  Leaf, Droplets, Sparkles, ShieldCheck,
} from 'lucide-react';
import { Block } from '@/store/AppContext';

export type BlockImgState = { loading: boolean; url: string | null; error: boolean };

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

const ICONS = [Leaf, Droplets, Sparkles, ShieldCheck];

/* ─── hero ─── */
function HeroBlock({ title, subtitle, isMobile }: { title: string; subtitle?: string; isMobile?: boolean }) {
  return (
    <section style={{ marginBottom: 32, textAlign: 'left' }}>
      <h1 style={{
        margin: 0,
        fontSize: 34, fontWeight: 900, lineHeight: 1.35, letterSpacing: '-0.04em',
        color: COLORS.text,
        whiteSpace: isMobile ? 'normal' : 'pre-line',
      }}>
        {title}
      </h1>
      {subtitle && (
        <p style={{
          margin: '20px 0 0',
          fontSize: 16, lineHeight: 1.9, color: COLORS.textSub,
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
  return (
    <h2 style={{
      margin: '40px 0 16px',
      borderLeft: `4px solid ${COLORS.primary}`,
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
  return (
    <div style={{
      marginBottom: 32,
      borderRadius: 24, border: `1px solid ${COLORS.border}`, background: COLORS.white,
      padding: 20,
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {items.map((item, i) => (
          <div key={i} style={{ display: 'flex', gap: 12, fontSize: 15, lineHeight: 1.7, color: COLORS.text333 }}>
            <Check size={18} strokeWidth={2.5} style={{ marginTop: 4, flexShrink: 0, color: COLORS.primary }} />
            <span>{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── steps ─── */
function StepsBlock({ items }: { items: { title: string; desc?: string }[] }) {
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
            borderRadius: '50%', background: COLORS.primary,
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
              borderRadius: '50%', background: COLORS.lightPurple, color: COLORS.primary,
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
  const cols = isMobile ? 2 : items.length;
  return (
    <div style={{
      marginBottom: 32,
      display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`,
      overflow: 'hidden',
      borderRadius: 24, border: `1px solid ${COLORS.lightPurpleBorder}`,
      background: COLORS.lightPurple,
    }}>
      {items.map((s, i) => (
        <div key={i} style={{
          padding: 20, textAlign: 'center',
          borderRight: isMobile
            ? (i % cols !== cols - 1 ? `1px solid ${COLORS.lightPurpleBorder}` : 'none')
            : (i !== items.length - 1 ? `1px solid ${COLORS.lightPurpleBorder}` : 'none'),
          borderTop: isMobile && i >= cols ? `1px solid ${COLORS.lightPurpleBorder}` : 'none',
        }}>
          <div style={{ fontSize: 30, fontWeight: 900, letterSpacing: '-0.04em', color: COLORS.primary }}>
            {s.value}
          </div>
          <div style={{ marginTop: 4, fontSize: 13, color: COLORS.textSub }}>{s.label}</div>
        </div>
      ))}
    </div>
  );
}

/* ─── compare ─── */
function CompareBlock({ headers, rows, isMobile }: { headers: string[]; rows: string[][]; isMobile?: boolean }) {
  const cols = headers.length;
  return (
    <div style={{
      marginBottom: 32,
      overflow: isMobile ? 'auto' : 'hidden',
      borderRadius: 24, border: `1px solid ${COLORS.border}`,
    }}>
      <div style={{
        display: 'grid', gridTemplateColumns: `repeat(${cols}, ${isMobile ? '120px' : '1fr'})`,
        background: COLORS.bg, textAlign: 'center', fontSize: 14, fontWeight: 700,
        minWidth: isMobile ? cols * 120 : undefined,
      }}>
        {headers.map((h, i) => (
          <div key={i} style={{
            padding: 16,
            background: i === 1 ? COLORS.primary : 'transparent',
            color: i === 1 ? COLORS.white : COLORS.text,
          }}>
            {h}
          </div>
        ))}
      </div>
      {rows.map((row, ri) => (
        <div key={ri} style={{
          display: 'grid', gridTemplateColumns: `repeat(${row.length}, ${isMobile ? '120px' : '1fr'})`,
          borderTop: `1px solid ${COLORS.border}`,
          textAlign: 'center', fontSize: 14,
          minWidth: isMobile ? row.length * 120 : undefined,
        }}>
          {row.map((cell, ci) => (
            <div key={ci} style={{
              padding: 16,
              fontWeight: ci === 1 ? 700 : ci === 0 ? 500 : 400,
              color: ci === 1 ? COLORS.primary : ci === 0 ? COLORS.text : COLORS.textSub,
              background: ci === 1 ? COLORS.comparePurpleSoft : 'transparent',
            }}>
              {ci === 1 && <Check size={16} style={{ display: 'block', margin: '0 auto 4px' }} />}
              {cell}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

/* ─── quote ─── */
function QuoteBlock({ text, author, rating }: { text: string; author?: string; rating?: number }) {
  const stars = typeof rating === 'number' && rating > 0 ? Math.min(5, Math.max(0, Math.round(rating))) : 5;
  return (
    <div style={{
      marginBottom: 32,
      borderRadius: 24, border: `1px solid ${COLORS.lightPurpleBorder}`, background: COLORS.lightPurple,
      padding: 24,
    }}>
      <QuoteIcon size={30} style={{ marginBottom: 16, color: COLORS.primary }} />
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
        <div style={{ display: 'flex', color: COLORS.primary }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} size={16} fill={i < stars ? COLORS.primary : 'none'} color={COLORS.primary} />
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
function ImageBlock({ label, imgState, onLightbox }: { label: string; imgState?: BlockImgState; onLightbox?: () => void }) {
  if (imgState?.url) {
    return (
      <div style={{
        marginBottom: 32, overflow: 'hidden',
        borderRadius: 24, border: `1px solid ${COLORS.border}`,
      }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imgState.url}
          alt={label}
          onClick={onLightbox}
          style={{
            width: '100%', aspectRatio: '4/3', objectFit: 'cover', display: 'block',
            cursor: onLightbox ? 'zoom-in' : 'default',
          }}
        />
      </div>
    );
  }
  const loading = imgState?.loading;
  const error = imgState?.error;
  return (
    <div style={{
      marginBottom: 32, aspectRatio: '4/3', overflow: 'hidden',
      borderRadius: 24, border: `1px solid ${COLORS.border}`,
      background: `linear-gradient(135deg, ${COLORS.lightPurple} 0%, ${COLORS.white} 50%, ${COLORS.bg} 100%)`,
    }}>
      <div style={{
        height: '100%',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10,
      }}>
        {loading && (
          <div style={{
            width: 28, height: 28, borderRadius: '50%',
            border: '3px solid #cbd5e1', borderTopColor: COLORS.primary,
            animation: 'spin 0.8s linear infinite',
          }} />
        )}
        <div style={{
          padding: '8px 16px', borderRadius: 999,
          background: 'rgba(255,255,255,0.8)', boxShadow: SHADOW,
          fontSize: 13, fontWeight: 700, color: COLORS.primary,
        }}>
          {loading ? '이미지 생성 중...' : label}
        </div>
        {error && <div style={{ fontSize: 11, color: '#ef4444' }}>생성 실패</div>}
      </div>
    </div>
  );
}

/* ─── cta ─── */
function CtaBlock({ text, button, isMobile }: { text: string; button: string; isMobile?: boolean }) {
  return (
    <div style={{
      borderRadius: 24, border: `1px solid ${COLORS.lightPurpleBorder}`, background: COLORS.lightPurple,
      padding: isMobile ? 20 : 32,
      textAlign: isMobile ? 'left' : 'center',
    }}>
      <h2 style={{
        margin: 0,
        fontSize: 24, fontWeight: 900, lineHeight: 1.45, letterSpacing: '-0.04em',
        color: COLORS.text,
        whiteSpace: isMobile ? 'normal' : 'pre-line',
      }}>
        {text}
      </h2>
      <button style={{
        marginTop: 24,
        display: isMobile ? 'flex' : 'inline-flex',
        width: isMobile ? '100%' : 'auto',
        height: 48, padding: '0 24px',
        alignItems: 'center', justifyContent: 'center', gap: 8,
        borderRadius: 16, background: COLORS.primary, color: COLORS.white,
        border: 'none', fontSize: 15, fontWeight: 700, cursor: 'pointer',
        fontFamily: FONT_FAMILY,
      }}>
        {button}
        <ArrowRight size={16} />
      </button>
    </div>
  );
}

/* ─── 메인 렌더러 ─── */
export default function BlockRenderer({ blocks, sectionNum, blockImages, onLightboxBlock, isMobile }: {
  blocks: Block[];
  sectionNum?: string;
  blockImages?: Record<string, BlockImgState>;
  onLightboxBlock?: (key: string) => void;
  isMobile?: boolean;
}) {
  const pad = isMobile ? 16 : PAD;
  return (
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
            return <ImageBlock key={i} label={b.label} imgState={imgState} onLightbox={onLightbox} />;
          }
          case 'cta':       return <CtaBlock       key={i} text={b.text} button={b.button} isMobile={isMobile} />;
          default:          return null;
        }
      })}
    </div>
  );
}
