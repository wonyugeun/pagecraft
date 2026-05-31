'use client';

import { Check, Star } from 'lucide-react';
import { Block } from '@/store/AppContext';

export type BlockImgState = { loading: boolean; url: string | null; error: boolean };

const COLORS = {
  primary: '#6D4CFF',
  text: '#111',
  textSub: '#666',
  textMute: '#999',
  border: '#ECECF2',
  lightPurple: '#F4F0FF',
  white: '#fff',
};

const PAD_X = 36;

/* ─── hero ─── */
function HeroBlock({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div style={{ padding: `48px ${PAD_X}px 0`, textAlign: 'left' }}>
      <div style={{ fontSize: 30, fontWeight: 800, color: COLORS.text, lineHeight: 1.3, letterSpacing: '-0.5px', whiteSpace: 'pre-line' }}>
        {title}
      </div>
      {subtitle && (
        <div style={{ marginTop: 12, fontSize: 16, color: COLORS.textSub, lineHeight: 1.6, whiteSpace: 'pre-line' }}>
          {subtitle}
        </div>
      )}
    </div>
  );
}

/* ─── heading ─── */
function HeadingBlock({ text }: { text: string }) {
  return (
    <div style={{ padding: `40px ${PAD_X}px 0`, fontSize: 21, fontWeight: 700, color: COLORS.text, lineHeight: 1.55, letterSpacing: '-0.4px', textAlign: 'left', whiteSpace: 'pre-line' }}>
      {text}
    </div>
  );
}

/* ─── paragraph ─── */
function ParagraphBlock({ text }: { text: string }) {
  return (
    <div style={{ padding: `20px ${PAD_X}px 0`, fontSize: 16, color: '#333', lineHeight: 1.9, textAlign: 'left', whiteSpace: 'pre-line' }}>
      {text}
    </div>
  );
}

/* ─── checklist ─── */
function ChecklistBlock({ items }: { items: string[] }) {
  return (
    <div style={{ padding: `28px ${PAD_X}px 0`, display: 'flex', flexDirection: 'column', gap: 12 }}>
      {items.map((item, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ width: 24, height: 24, borderRadius: '50%', background: COLORS.lightPurple, color: COLORS.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
            <Check size={14} strokeWidth={3} />
          </div>
          <span style={{ fontSize: 15, color: '#333', lineHeight: 1.7 }}>{item}</span>
        </div>
      ))}
    </div>
  );
}

/* ─── steps ─── */
function StepsBlock({ items }: { items: { title: string; desc?: string }[] }) {
  return (
    <div style={{ padding: `28px ${PAD_X}px 0`, display: 'flex', flexDirection: 'column', gap: 18 }}>
      {items.map((step, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: COLORS.primary, color: '#fff', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {i + 1}
          </div>
          <div style={{ flex: 1, paddingTop: 4 }}>
            <div style={{ fontSize: 15.5, fontWeight: 700, color: COLORS.text, marginBottom: 4, lineHeight: 1.5 }}>{step.title}</div>
            {step.desc && <div style={{ fontSize: 14, color: COLORS.textSub, lineHeight: 1.7 }}>{step.desc}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── iconcards ─── */
function IconCardsBlock({ cards }: { cards: { title: string; desc?: string }[] }) {
  return (
    <div style={{ padding: `28px ${PAD_X}px 0`, display: 'grid', gridTemplateColumns: `repeat(${Math.min(cards.length, 3)}, 1fr)`, gap: 12 }}>
      {cards.map((c, i) => (
        <div key={i} style={{ border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: '20px 14px', textAlign: 'center', background: COLORS.white }}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', background: COLORS.lightPurple, margin: '0 auto 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>✦</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.text, marginBottom: 6, lineHeight: 1.5 }}>{c.title}</div>
          {c.desc && <div style={{ fontSize: 12.5, color: COLORS.textSub, lineHeight: 1.6 }}>{c.desc}</div>}
        </div>
      ))}
    </div>
  );
}

/* ─── stats ─── */
function StatsBlock({ items }: { items: { value: string; label: string }[] }) {
  return (
    <div style={{ padding: `28px ${PAD_X}px 0`, display: 'grid', gridTemplateColumns: `repeat(${Math.min(items.length, 4)}, 1fr)`, gap: 10 }}>
      {items.map((s, i) => (
        <div key={i} style={{ background: COLORS.lightPurple, borderRadius: 12, padding: '20px 12px', textAlign: 'center' }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: COLORS.primary, lineHeight: 1.2, letterSpacing: '-0.5px' }}>{s.value}</div>
          <div style={{ marginTop: 6, fontSize: 12, color: COLORS.textSub, fontWeight: 600 }}>{s.label}</div>
        </div>
      ))}
    </div>
  );
}

/* ─── compare ─── */
function CompareBlock({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div style={{ padding: `28px ${PAD_X}px 0` }}>
      <div style={{ border: `1px solid ${COLORS.border}`, borderRadius: 10, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr>
              {headers.map((h, i) => (
                <th key={i} style={{
                  padding: '12px 10px',
                  background: i === 1 ? COLORS.lightPurple : '#FAFAFC',
                  color: i === 1 ? COLORS.primary : COLORS.text,
                  fontWeight: 700,
                  fontSize: 13,
                  textAlign: i === 0 ? 'left' : 'center',
                  borderBottom: `1px solid ${COLORS.border}`,
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri}>
                {row.map((cell, ci) => (
                  <td key={ci} style={{
                    padding: '11px 10px',
                    color: ci === 1 ? COLORS.text : COLORS.textSub,
                    fontWeight: ci === 0 ? 600 : ci === 1 ? 700 : 400,
                    textAlign: ci === 0 ? 'left' : 'center',
                    borderTop: ri === 0 ? 'none' : `1px solid ${COLORS.border}`,
                    background: ci === 1 ? '#FBFAFF' : 'transparent',
                  }}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─── quote ─── */
function QuoteBlock({ text, author, rating }: { text: string; author?: string; rating?: number }) {
  return (
    <div style={{ padding: `28px ${PAD_X}px 0` }}>
      <div style={{ background: COLORS.lightPurple, borderRadius: 12, padding: '22px 22px' }}>
        {typeof rating === 'number' && rating > 0 && (
          <div style={{ display: 'flex', gap: 2, marginBottom: 10 }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} size={14} fill={i < rating ? COLORS.primary : 'none'} color={i < rating ? COLORS.primary : '#D8D2EE'} strokeWidth={2} />
            ))}
          </div>
        )}
        <div style={{ fontSize: 15, color: '#2B1B5E', lineHeight: 1.75, fontStyle: 'italic' }}>
          “{text}”
        </div>
        {author && (
          <div style={{ marginTop: 12, fontSize: 12.5, color: COLORS.primary, textAlign: 'right', fontWeight: 600 }}>
            — {author}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── faq ─── */
function FaqBlock({ items }: { items: { q: string; a: string }[] }) {
  return (
    <div style={{ padding: `28px ${PAD_X}px 0`, display: 'flex', flexDirection: 'column', gap: 0 }}>
      {items.map((f, i) => (
        <div key={i} style={{ padding: '16px 0', borderTop: i === 0 ? `1px solid ${COLORS.border}` : 'none', borderBottom: `1px solid ${COLORS.border}` }}>
          <div style={{ fontSize: 14.5, fontWeight: 700, color: COLORS.text, marginBottom: 8, lineHeight: 1.55 }}>
            <span style={{ color: COLORS.primary, marginRight: 8 }}>Q.</span>{f.q}
          </div>
          <div style={{ fontSize: 14, color: COLORS.textSub, lineHeight: 1.8, paddingLeft: 22 }}>
            {f.a}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── image ─── */
function ImageBlock({ label, imgState }: { label: string; imgState?: BlockImgState }) {
  if (imgState?.url) {
    return (
      <div style={{ padding: `28px ${PAD_X}px 0` }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imgState.url} alt={label} style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', borderRadius: 8, display: 'block' }} />
      </div>
    );
  }
  const loading = imgState?.loading;
  const error = imgState?.error;
  return (
    <div style={{ padding: `28px ${PAD_X}px 0` }}>
      <div style={{ width: '100%', aspectRatio: '4/3', background: '#f4f6f8', borderRadius: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color: '#64748b' }}>
        {loading ? (
          <>
            <div style={{ width: 28, height: 28, border: '3px solid #cbd5e1', borderTopColor: '#6D4CFF', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <div style={{ fontSize: 12, fontWeight: 700 }}>이미지 생성 중...</div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 28 }}>📸</div>
            <div style={{ fontSize: 12, fontWeight: 700 }}>{label}</div>
            {error && <div style={{ fontSize: 11, color: '#ef4444' }}>생성 실패</div>}
          </>
        )}
      </div>
    </div>
  );
}

/* ─── cta ─── */
function CtaBlock({ text, button }: { text: string; button: string }) {
  return (
    <div style={{ padding: `36px ${PAD_X}px 0`, textAlign: 'center' }}>
      <div style={{ background: COLORS.lightPurple, borderRadius: 14, padding: '28px 20px' }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: COLORS.text, lineHeight: 1.5, marginBottom: 18, whiteSpace: 'pre-line' }}>
          {text}
        </div>
        <button style={{ padding: '12px 28px', background: COLORS.primary, color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--f)', boxShadow: '0 4px 14px rgba(109,76,255,0.30)' }}>
          {button}
        </button>
      </div>
    </div>
  );
}

/* ─── 메인 렌더러 ─── */
export default function BlockRenderer({ blocks, sectionNum, blockImages }: {
  blocks: Block[];
  sectionNum?: string;
  blockImages?: Record<string, BlockImgState>;
}) {
  return (
    <div style={{ background: '#fff', paddingBottom: 40 }}>
      {blocks.map((b, i) => {
        switch (b.type) {
          case 'hero':      return <HeroBlock      key={i} title={b.title} subtitle={b.subtitle} />;
          case 'heading':   return <HeadingBlock   key={i} text={b.text} />;
          case 'paragraph': return <ParagraphBlock key={i} text={b.text} />;
          case 'checklist': return <ChecklistBlock key={i} items={b.items} />;
          case 'steps':     return <StepsBlock     key={i} items={b.items} />;
          case 'iconcards': return <IconCardsBlock key={i} cards={b.cards} />;
          case 'stats':     return <StatsBlock     key={i} items={b.items} />;
          case 'compare':   return <CompareBlock   key={i} headers={b.headers} rows={b.rows} />;
          case 'quote':     return <QuoteBlock     key={i} text={b.text} author={b.author} rating={b.rating} />;
          case 'faq':       return <FaqBlock       key={i} items={b.items} />;
          case 'image':     return <ImageBlock     key={i} label={b.label} imgState={sectionNum && blockImages ? blockImages[`${sectionNum}#${i}`] : undefined} />;
          case 'cta':       return <CtaBlock       key={i} text={b.text} button={b.button} />;
          default:          return null;
        }
      })}
    </div>
  );
}
