'use client';

import { useEffect, useState, useRef } from 'react';
import { useSession } from 'next-auth/react';
import {
  Home, FileText, LayoutGrid, BookOpen, Settings,
  Crown, Zap, Image as ImageIcon, ChevronRight,
  ArrowRight, Sparkles, Bot, TrendingUp, Folder, Trash2, Ellipsis,
} from 'lucide-react';
import { useApp, HistoryItem } from '@/store/AppContext';

// ── 날짜 유틸 ────────────────────────────────────────────
function formatDate(iso: string) {
  const d = new Date(iso);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${mm}.${dd} ${hh}:${min}`;
}

function getMondayOf(d: Date) {
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1;
  const m = new Date(d);
  m.setHours(0, 0, 0, 0);
  m.setDate(d.getDate() - diff);
  return m;
}

function getWeeklyStats(history: HistoryItem[]) {
  const now = new Date();
  const monday = getMondayOf(now);
  const nextMonday = new Date(monday); nextMonday.setDate(monday.getDate() + 7);
  const prevMonday = new Date(monday); prevMonday.setDate(monday.getDate() - 7);

  const counts = [0, 0, 0, 0, 0, 0, 0]; // Mon–Sun
  let thisWeek = 0, lastWeek = 0;

  history.forEach(item => {
    const d = new Date(item.createdAt);
    if (d >= monday && d < nextMonday) {
      const idx = d.getDay() === 0 ? 6 : d.getDay() - 1;
      counts[idx]++;
      thisWeek++;
    } else if (d >= prevMonday && d < monday) {
      lastWeek++;
    }
  });

  const pct = lastWeek === 0
    ? (thisWeek > 0 ? 100 : 0)
    : Math.round(((thisWeek - lastWeek) / lastWeek) * 100);

  return { counts, thisWeek, lastWeek, pct };
}

const DEFAULT_CATS = ['화장품/미용', '식품', '가구/인테리어', '디지털/가전', '패션/잡화'];

function getCategoryRank(history: HistoryItem[]) {
  const m: Record<string, number> = {};
  history.forEach(h => { if (h.cat) m[h.cat] = (m[h.cat] || 0) + 1; });
  const sorted = Object.entries(m).sort((a, b) => b[1] - a[1]).map(([c]) => c);
  const result = [...sorted];
  DEFAULT_CATS.forEach(d => { if (!result.includes(d)) result.push(d); });
  return result.slice(0, 5);
}

// ── SVG 막대 차트 ────────────────────────────────────────
function BarChart({ counts }: { counts: number[] }) {
  const labels = ['월', '화', '수', '목', '금', '토', '일'];
  const max = Math.max(...counts, 1);
  const H = 72, barW = 20, gap = 10;
  const total = labels.length;
  const svgW = total * (barW + gap) - gap;

  return (
    <svg width="100%" viewBox={`0 0 ${svgW} ${H + 18}`} style={{ display: 'block' }}>
      {counts.map((v, i) => {
        const barH = Math.max(3, Math.round((v / max) * H));
        const x = i * (barW + gap);
        const y = H - barH;
        const isToday = new Date().getDay() === (i === 6 ? 0 : i + 1);
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={barH}
              rx={6} fill={isToday ? '#6D4CFF' : '#EDE8FF'} />
            <text x={x + barW / 2} y={H + 14} textAnchor="middle"
              fontSize="10" fill={isToday ? '#6D4CFF' : '#AAAAAA'} fontWeight={isToday ? 700 : 400}>
              {labels[i]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ── 사이드바 메뉴 아이템 ─────────────────────────────────
const MENU_ITEMS = [
  { icon: Home, label: '홈', id: 's-dash' as const },
  { icon: FileText, label: '내 작업', id: 's-dash' as const },
  { icon: LayoutGrid, label: '템플릿', id: 's-dash' as const },
  { icon: BookOpen, label: '가이드', id: 's-dash' as const },
  { icon: Settings, label: '설정', id: 's-dash' as const },
];

// ── 메인 컴포넌트 ─────────────────────────────────────────
export default function DashboardScreen() {
  const { startDetail, go, loadFromHistory, toggleChat, credits } = useApp();
  const { data: session } = useSession();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [hoverCard, setHoverCard] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const email = session?.user?.email ?? 'guest';
  const fullName = session?.user?.name ?? '';
  const displayName = fullName
    ? (fullName.length > 4 ? fullName.slice(0, 4) + '님' : fullName + '님')
    : '사장님';

  useEffect(() => {
    try {
      const stored = localStorage.getItem(`pc_history_${email}`);
      if (stored) setHistory(JSON.parse(stored));
    } catch {}
  }, [email]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const deleteItem = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const updated = history.filter(h => h.id !== id);
    setHistory(updated);
    try { localStorage.setItem(`pc_history_${email}`, JSON.stringify(updated)); } catch {}
    setOpenMenuId(null);
  };

  const stats = getWeeklyStats(history);
  const catRank = getCategoryRank(history);

  const S = {
    root: {
      display: 'flex', height: 'calc(100vh - 56px)',
      background: '#FAFAFC', overflow: 'hidden',
      fontFamily: "'Pretendard','Noto Sans KR',sans-serif",
    } as React.CSSProperties,

    // ── 사이드바
    sidebar: {
      width: 240, flexShrink: 0,
      background: '#FFFFFF', borderRight: '1px solid #ECECF2',
      display: 'flex', flexDirection: 'column' as const,
      padding: '24px 0', overflowY: 'auto' as const,
    },
    logo: {
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '0 20px 24px', borderBottom: '1px solid #F4F4F6',
      marginBottom: 8, textDecoration: 'none',
    },
    logoBox: {
      width: 32, height: 32, background: '#6D4CFF', borderRadius: 8,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 16, fontWeight: 800, color: '#fff',
    },
    logoText: { fontSize: 16, fontWeight: 700, color: '#111', letterSpacing: '-0.02em' },

    menuItem: (active: boolean, hov: boolean) => ({
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '11px 20px', cursor: 'pointer', borderRadius: 10,
      margin: '1px 8px',
      background: active ? '#F4F0FF' : hov ? '#FAFAFC' : 'transparent',
      color: active ? '#6D4CFF' : '#555',
      fontSize: 14, fontWeight: active ? 600 : 400,
      transition: 'background 100ms',
    }) as React.CSSProperties,

    proCard: {
      margin: '16px 12px 0',
      background: 'linear-gradient(135deg, #6D4CFF 0%, #4A33CC 100%)',
      borderRadius: 16, padding: 20, color: '#fff',
    },
    proBtn: {
      display: 'block', width: '100%', marginTop: 16,
      background: '#fff', border: 'none', borderRadius: 12,
      padding: '10px 0', fontSize: 13, fontWeight: 700,
      color: '#6D4CFF', cursor: 'pointer', textAlign: 'center' as const,
    },

    // ── 메인
    main: { flex: 1, overflowY: 'auto' as const, padding: '32px 36px' },

    // 헤더
    header: {
      display: 'flex', alignItems: 'flex-start',
      justifyContent: 'space-between', marginBottom: 32,
    },
    greeting: { fontSize: 28, fontWeight: 700, color: '#111', letterSpacing: '-0.03em', marginBottom: 4 },
    greetSub: { fontSize: 14, color: '#888' },
    headerRight: { display: 'flex', alignItems: 'center', gap: 10 },
    creditPill: {
      display: 'flex', alignItems: 'center', gap: 5,
      background: '#F4F0FF', borderRadius: 999,
      padding: '6px 14px', fontSize: 13, fontWeight: 600, color: '#6D4CFF',
    },
    profilePill: {
      display: 'flex', alignItems: 'center', gap: 6,
      background: '#fff', border: '1px solid #ECECF2',
      borderRadius: 999, padding: '6px 14px',
      fontSize: 13, fontWeight: 500, color: '#111', cursor: 'default',
    },

    // 메인 액션 카드
    mainCard: (hov: boolean) => ({
      display: 'flex', alignItems: 'center', gap: 24,
      background: '#fff', border: `2px solid ${hov ? '#6D4CFF' : '#ECECF2'}`,
      borderRadius: 24, padding: '28px 32px', marginBottom: 16,
      cursor: 'pointer',
      boxShadow: hov ? '0 8px 32px rgba(109,76,255,0.12)' : '0 2px 8px rgba(0,0,0,0.04)',
      transform: hov ? 'translateY(-2px)' : 'none',
      transition: 'all 200ms',
    }) as React.CSSProperties,

    badge: {
      display: 'inline-flex', alignItems: 'center', gap: 4,
      background: '#F4F0FF', borderRadius: 999,
      padding: '4px 12px', fontSize: 12, fontWeight: 600,
      color: '#6D4CFF', marginBottom: 10,
    },
    mainCardTitle: { fontSize: 28, fontWeight: 700, color: '#111', letterSpacing: '-0.03em', marginBottom: 8 },
    mainCardDesc: { fontSize: 13, color: '#888', lineHeight: 1.6, marginBottom: 14 },

    chip: {
      display: 'inline-flex', alignItems: 'center',
      background: '#F4F0FF', borderRadius: 999,
      padding: '4px 12px', fontSize: 12, color: '#6D4CFF',
      marginRight: 6,
    },

    arrowCircle: (color: string, hov: boolean) => ({
      width: 52, height: 52, flexShrink: 0,
      background: hov ? color : color,
      borderRadius: '50%', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      boxShadow: `0 4px 12px ${color}66`,
      transition: 'transform 150ms',
      transform: hov ? 'scale(1.08)' : 'scale(1)',
    }) as React.CSSProperties,

    // 서브 카드
    subGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 32 },

    subCard: (hov: boolean) => ({
      background: '#fff', border: '1.5px solid #ECECF2',
      borderRadius: 24, padding: '22px 24px',
      display: 'flex', alignItems: 'center', gap: 16,
      cursor: 'pointer',
      boxShadow: hov ? '0 8px 24px rgba(0,0,0,0.08)' : '0 2px 8px rgba(0,0,0,0.03)',
      transform: hov ? 'translateY(-2px)' : 'none',
      transition: 'all 180ms',
    }) as React.CSSProperties,

    iconBox: (bg: string) => ({
      width: 48, height: 48, flexShrink: 0,
      background: bg, borderRadius: 14,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 22,
    }) as React.CSSProperties,

    // 컨텐츠 그리드
    contentGrid: { display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20 },

    section: {
      background: '#fff', borderRadius: 20,
      border: '1px solid #ECECF2', padding: '24px',
      marginBottom: 16,
    },
    sectionHeader: {
      display: 'flex', alignItems: 'center',
      justifyContent: 'space-between', marginBottom: 18,
    },
    sectionTitle: { fontSize: 15, fontWeight: 700, color: '#111' },
    seeAll: {
      display: 'flex', alignItems: 'center', gap: 2,
      fontSize: 12, color: '#6D4CFF', cursor: 'pointer',
      background: 'none', border: 'none', fontFamily: 'inherit',
    },
  };

  const [hoverMenu, setHoverMenu] = useState<string | null>(null);

  return (
    <div style={S.root}>

      {/* ─── 사이드바 ─── */}
      <aside style={S.sidebar}>
        {/* 로고 */}
        <div style={S.logo as React.CSSProperties}>
          <div style={S.logoBox}>P</div>
          <span style={S.logoText}>PageCraft</span>
        </div>

        {/* 메뉴 */}
        <nav style={{ flex: 1 }}>
          {MENU_ITEMS.map((item, i) => {
            const Icon = item.icon;
            const isActive = i === 0;
            return (
              <div
                key={item.label}
                style={S.menuItem(isActive, hoverMenu === item.label)}
                onMouseEnter={() => setHoverMenu(item.label)}
                onMouseLeave={() => setHoverMenu(null)}
                onClick={() => go('s-dash')}
              >
                <Icon size={16} />
                <span>{item.label}</span>
              </div>
            );
          })}
        </nav>

        {/* 프로 플랜 카드 */}
        <div style={{ padding: '0 0' }}>
          <div style={S.proCard}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <Crown size={18} color="#FFD700" />
              <span style={{ fontSize: 13, fontWeight: 700 }}>프로 플랜 업그레이드</span>
            </div>
            <p style={{ fontSize: 12, opacity: 0.85, lineHeight: 1.6 }}>
              더 많은 AI 기능과<br />프리미엄 템플릿을<br />무제한으로 이용하세요.
            </p>
            <button style={S.proBtn}>업그레이드 하기 →</button>
          </div>
        </div>
      </aside>

      {/* ─── 메인 ─── */}
      <main style={S.main}>

        {/* 헤더 */}
        <div style={S.header}>
          <div>
            <div style={S.greeting}>안녕하세요, {displayName} 👋</div>
            <div style={S.greetSub}>오늘은 어떤 상세페이지를 만들어볼까요?</div>
          </div>
          <div style={S.headerRight}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#F0FDF4', borderRadius: 999, padding: '6px 14px', fontSize: 12, fontWeight: 600, color: '#16A34A' }}>
              <Bot size={14} />
              AI 도우미 활성화
            </div>
            <div style={S.creditPill}>
              <Zap size={13} />
              {credits}
            </div>
            <div style={S.profilePill}>
              {displayName}
              <ChevronRight size={14} color="#AAA" />
            </div>
          </div>
        </div>

        {/* 메인 액션 카드 */}
        <div
          style={S.mainCard(hoverCard === 'main')}
          onMouseEnter={() => setHoverCard('main')}
          onMouseLeave={() => setHoverCard(null)}
          onClick={startDetail}
        >
          <div style={{ flex: 1 }}>
            <div style={S.badge}>
              <Sparkles size={12} />
              AI가 구성해드려요 ✨
            </div>
            <div style={S.mainCardTitle}>상세페이지 만들기</div>
            <div style={S.mainCardDesc}>
              카테고리·채널·타입 선택 → AI가 카피+이미지 구조 완성
            </div>
            <div>
              {['기본형', '프리미엄형', '블로그형(글+그림)'].map(c => (
                <span key={c} style={S.chip}>{c}</span>
              ))}
            </div>
          </div>

          {/* 미리보기 목업 */}
          <div style={{ width: 160, height: 110, position: 'relative', flexShrink: 0 }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{
                position: 'absolute',
                top: i * 8, left: i * 10,
                width: 130, height: 90,
                background: i === 2 ? '#fff' : `rgba(109,76,255,${0.06 + i * 0.06})`,
                border: `1.5px solid ${i === 2 ? '#ECECF2' : '#E8E4FF'}`,
                borderRadius: 12,
                display: 'flex', flexDirection: 'column',
                padding: 10, gap: 6,
              }}>
                {i === 2 && <>
                  <div style={{ height: 8, width: '60%', background: '#E8E4FF', borderRadius: 4 }} />
                  <div style={{ height: 36, background: '#F4F0FF', borderRadius: 6 }} />
                  <div style={{ height: 6, width: '80%', background: '#F0EEF8', borderRadius: 4 }} />
                  <div style={{ height: 6, width: '50%', background: '#F0EEF8', borderRadius: 4 }} />
                </>}
              </div>
            ))}
          </div>

          <div style={S.arrowCircle('#6D4CFF', hoverCard === 'main')}>
            <ArrowRight size={22} color="#fff" />
          </div>
        </div>

        {/* 서브 카드 그리드 */}
        <div style={S.subGrid}>
          {/* 빠른 제작 */}
          <div
            style={S.subCard(hoverCard === 'quick')}
            onMouseEnter={() => setHoverCard('quick')}
            onMouseLeave={() => setHoverCard(null)}
            onClick={() => go('s-quick')}
          >
            <div style={S.iconBox('#FEF3C7')}>⚡</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#111', marginBottom: 4 }}>빠른 제작</div>
              <div style={{ fontSize: 12, color: '#888', lineHeight: 1.5 }}>원하는 섹션 1장만 골라 카피+이미지를 즉시 생성</div>
            </div>
            <div style={{ width: 36, height: 36, background: '#FDE68A', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <ArrowRight size={16} color="#92400E" />
            </div>
          </div>

          {/* 썸네일 만들기 */}
          <div
            style={S.subCard(hoverCard === 'thumb')}
            onMouseEnter={() => setHoverCard('thumb')}
            onMouseLeave={() => setHoverCard(null)}
            onClick={() => go('s-thumb')}
          >
            <div style={S.iconBox('#FCE7F3')}>🖼️</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#111', marginBottom: 4 }}>썸네일 만들기</div>
              <div style={{ fontSize: 12, color: '#888', lineHeight: 1.5 }}>채널 규격 자동 적용·4가지 타입 썸네일 즉시 생성</div>
            </div>
            <div style={{ width: 36, height: 36, background: '#FBCFE8', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <ArrowRight size={16} color="#9D174D" />
            </div>
          </div>
        </div>

        {/* 컨텐츠 그리드 */}
        <div style={S.contentGrid}>

          {/* 좌: 최근 작업 */}
          <div>
            <div style={S.section}>
              <div style={S.sectionHeader}>
                <span style={S.sectionTitle}>최근 작업</span>
                <button style={S.seeAll}>전체 보기 <ChevronRight size={12} /></button>
              </div>

              {history.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 0', color: '#AAA' }}>
                  <Folder size={40} color="#DDD" style={{ margin: '0 auto 12px' }} />
                  <div style={{ fontSize: 14, fontWeight: 500, color: '#AAA', marginBottom: 6 }}>
                    아직 작업이 없어요.
                  </div>
                  <div style={{ fontSize: 12, color: '#BBB', marginBottom: 20 }}>
                    첫 상세페이지를 만들어보세요!
                  </div>
                  <button
                    onClick={startDetail}
                    style={{
                      background: '#6D4CFF', color: '#fff', border: 'none',
                      borderRadius: 12, padding: '10px 20px',
                      fontSize: 13, fontWeight: 600, cursor: 'pointer',
                      fontFamily: 'inherit',
                    }}
                  >
                    상세페이지 만들기 →
                  </button>
                </div>
              ) : (
                <div ref={menuRef}>
                  {history.slice(0, 8).map(item => (
                    <div
                      key={item.id}
                      onClick={() => loadFromHistory(item)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 14,
                        padding: '14px 0', borderBottom: '1px solid #F5F5F7',
                        cursor: 'pointer', position: 'relative',
                        transition: 'background 100ms',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#FAFAFC')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      {/* 썸네일 */}
                      <div style={{
                        width: 52, height: 52, flexShrink: 0,
                        background: '#F4F0FF', borderRadius: 10,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <ImageIcon size={20} color="#C4B5FD" />
                      </div>

                      {/* 정보 */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 500, color: '#111', marginBottom: 5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.productName || '(상품명 없음)'}
                        </div>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {[item.cat, item.ch, `${item.secCnt}섹션`].map(tag => (
                            <span key={tag} style={{
                              background: '#F4F4F6', borderRadius: 999,
                              padding: '2px 8px', fontSize: 11, color: '#666',
                            }}>{tag}</span>
                          ))}
                        </div>
                      </div>

                      <div style={{ fontSize: 11, color: '#CCC', flexShrink: 0 }}>
                        {formatDate(item.createdAt)}
                      </div>

                      {/* ⋮ 메뉴 */}
                      <div style={{ position: 'relative', flexShrink: 0 }}>
                        <button
                          onClick={e => { e.stopPropagation(); setOpenMenuId(openMenuId === item.id ? null : item.id); }}
                          style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            padding: 4, color: '#AAA', display: 'flex', borderRadius: 6,
                          }}
                        >
                          <Ellipsis size={16} />
                        </button>
                        {openMenuId === item.id && (
                          <div style={{
                            position: 'absolute', right: 0, top: 28,
                            background: '#fff', border: '1px solid #ECECF2',
                            borderRadius: 10, padding: '4px',
                            boxShadow: '0 4px 16px rgba(0,0,0,0.12)', zIndex: 50, minWidth: 100,
                          }}>
                            <button
                              onClick={e => deleteItem(e, item.id)}
                              style={{
                                display: 'flex', alignItems: 'center', gap: 8,
                                width: '100%', background: 'none', border: 'none',
                                padding: '8px 12px', fontSize: 13, color: '#EF4444',
                                cursor: 'pointer', borderRadius: 7, fontFamily: 'inherit',
                              }}
                              onMouseEnter={e => (e.currentTarget.style.background = '#FEF2F2')}
                              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                            >
                              <Trash2 size={13} /> 삭제
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 우: 사이드 패널 */}
          <div>
            {/* AI 추천 카테고리 */}
            <div style={S.section}>
              <div style={{ ...S.sectionHeader, marginBottom: 6 }}>
                <span style={S.sectionTitle}>✨ AI 추천 카테고리</span>
              </div>
              <p style={{ fontSize: 12, color: '#AAA', marginBottom: 16 }}>
                요즘 많이 만드는 카테고리를 확인해보세요.
              </p>
              {catRank.map((cat, i) => (
                <div key={cat} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '8px 0',
                  borderBottom: i < 4 ? '1px solid #F5F5F7' : 'none',
                }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                    background: i === 0 ? '#6D4CFF' : '#F4F0FF',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 700,
                    color: i === 0 ? '#fff' : '#6D4CFF',
                  }}>
                    {i + 1}
                  </div>
                  <span style={{ fontSize: 13, color: '#333' }}>{cat}</span>
                </div>
              ))}
            </div>

            {/* 이번 주 사용 리포트 */}
            <div style={S.section}>
              <div style={{ ...S.sectionHeader, marginBottom: 4 }}>
                <span style={S.sectionTitle}>📊 이번 주 사용 리포트</span>
              </div>
              <div style={{ fontSize: 11, color: '#AAA', marginBottom: 14 }}>생성한 상세페이지 수</div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, marginBottom: 16 }}>
                <span style={{ fontSize: 36, fontWeight: 800, color: '#111', letterSpacing: '-0.04em' }}>
                  {stats.thisWeek}개
                </span>
                {stats.lastWeek > 0 || stats.thisWeek > 0 ? (
                  <span style={{
                    display: 'flex', alignItems: 'center', gap: 3,
                    fontSize: 12, fontWeight: 600, marginBottom: 6,
                    color: stats.pct >= 0 ? '#16A34A' : '#DC2626',
                  }}>
                    <TrendingUp size={13} />
                    {stats.pct >= 0 ? '+' : ''}{stats.pct}%
                  </span>
                ) : null}
              </div>
              <BarChart counts={stats.counts} />
            </div>

            {/* AI 도우미 얼지 */}
            <div style={{
              ...S.section,
              background: 'linear-gradient(135deg, #F4F0FF 0%, #EDE8FF 100%)',
              border: '1.5px solid #DDD6FE',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                <div style={{
                  width: 40, height: 40, background: '#6D4CFF', borderRadius: 12,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Bot size={20} color="#fff" />
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#111' }}>AI 도우미 얼지</div>
                  <div style={{ fontSize: 11, color: '#888' }}>더 빠른 작업의 시작</div>
                </div>
              </div>
              <p style={{ fontSize: 12, color: '#666', lineHeight: 1.6, marginBottom: 14 }}>
                AI 도우미에게 작업을 맡겨보세요. 원하는 결과물을 대화로 만들어드려요.
              </p>
              <button
                onClick={toggleChat}
                style={{
                  width: '100%', background: '#6D4CFF', border: 'none',
                  borderRadius: 12, padding: '10px 0',
                  fontSize: 13, fontWeight: 600, color: '#fff',
                  cursor: 'pointer', fontFamily: 'inherit',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}
              >
                <Bot size={14} /> AI 도우미 얼지
              </button>
            </div>
          </div>
        </div>
      </main>

      <style>{`
        @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.css');
      `}</style>
    </div>
  );
}
