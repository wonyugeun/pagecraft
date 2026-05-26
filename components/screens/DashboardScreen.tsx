'use client';

import { useEffect, useState, useRef } from 'react';
import { useSession } from 'next-auth/react';
import {
  Home, FileText, LayoutGrid, BookOpen, Settings,
  Crown, Zap, Image as ImageIcon, ChevronRight,
  ArrowRight, Sparkles, Bot, TrendingUp, TrendingDown, Trash2, Ellipsis, Folder,
} from 'lucide-react';
import { useApp, HistoryItem } from '@/store/AppContext';

// ── 유틸 ─────────────────────────────────────────────────
function fmt(iso: string) {
  const d = new Date(iso);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mn = String(d.getMinutes()).padStart(2, '0');
  return `${d.getFullYear()}.${mm}.${dd} ${hh}:${mn}`;
}

function getWeeklyStats(history: HistoryItem[]) {
  const now = new Date();
  const dow = now.getDay();
  const mon = new Date(now);
  mon.setDate(now.getDate() - (dow === 0 ? 6 : dow - 1));
  mon.setHours(0, 0, 0, 0);
  const nextMon = new Date(mon); nextMon.setDate(mon.getDate() + 7);
  const prevMon = new Date(mon); prevMon.setDate(mon.getDate() - 7);

  const counts = [0, 0, 0, 0, 0, 0, 0];
  let tw = 0, lw = 0;
  history.forEach(h => {
    const d = new Date(h.createdAt);
    if (d >= mon && d < nextMon) { counts[d.getDay() === 0 ? 6 : d.getDay() - 1]++; tw++; }
    else if (d >= prevMon && d < mon) lw++;
  });
  const pct = lw === 0 ? (tw > 0 ? 100 : 0) : Math.round(((tw - lw) / lw) * 100);
  return { counts, tw, lw, pct };
}

const PLATFORM_CATS = [
  { name: '화장품/미용', count: '12,408개' },
  { name: '식품',       count: '8,721개' },
  { name: '가구/인테리어', count: '6,531개' },
  { name: '디지털/가전', count: '4,982개' },
  { name: '패션/잡화',  count: '3,652개' },
];

// ── SVG 막대 차트 ─────────────────────────────────────────
function BarChart({ counts }: { counts: number[] }) {
  const labels = ['월', '화', '수', '목', '금', '토', '일'];
  const max = Math.max(...counts, 1);
  const today = new Date().getDay();
  const todayIdx = today === 0 ? 6 : today - 1;

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 48 }}>
      {counts.map((v, i) => {
        const h = Math.max(3, Math.round((v / max) * 44));
        return (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, flex: 1 }}>
            <div style={{
              width: '100%', height: h,
              background: i === todayIdx ? '#6D4CFF' : '#EDE8FF',
              borderRadius: '4px 4px 0 0',
            }} />
            <span style={{ fontSize: 9, color: i === todayIdx ? '#6D4CFF' : '#CCC', fontWeight: i === todayIdx ? 700 : 400 }}>
              {labels[i]}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── 메인 액션 카드 목업 ───────────────────────────────────
function CardMockup() {
  return (
    <div style={{ position: 'relative', width: 200, height: 130, flexShrink: 0 }}>
      {/* 뒤 카드 */}
      <div style={{
        position: 'absolute', left: 0, top: 10,
        width: 140, height: 110,
        background: 'linear-gradient(135deg, #F4F0FF, #EDE8FF)',
        borderRadius: 14, border: '1px solid #DDD6FE',
        boxShadow: '0 4px 12px rgba(109,76,255,0.10)',
      }} />
      {/* 앞 카드 - 상품 목업 */}
      <div style={{
        position: 'absolute', left: 20, top: 0,
        width: 140, height: 110,
        background: '#fff', borderRadius: 14,
        border: '1px solid #EBEBF2',
        boxShadow: '0 6px 20px rgba(0,0,0,0.10)',
        overflow: 'hidden', padding: 12,
      }}>
        {/* 상품 이미지 placeholder */}
        <div style={{
          width: '100%', height: 56,
          background: 'linear-gradient(135deg, #F0EEFF 0%, #E8E4FF 100%)',
          borderRadius: 8, marginBottom: 8,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            width: 32, height: 32,
            background: 'linear-gradient(135deg, #C4B5FD, #A78BFA)',
            borderRadius: '50%', opacity: 0.6,
          }} />
        </div>
        {/* 텍스트 라인 */}
        <div style={{ height: 7, background: '#E8E4FF', borderRadius: 4, width: '75%', marginBottom: 5 }} />
        <div style={{ height: 6, background: '#F0EEFF', borderRadius: 4, width: '55%' }} />
      </div>
    </div>
  );
}

// ── 체크리스트 ────────────────────────────────────────────
function CheckList() {
  const items = ['카피 작성 완료', '이미지 구조 완성', '섹션 구성 완료'];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
      {items.map(t => (
        <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <div style={{
            width: 18, height: 18, background: '#6D4CFF', borderRadius: 5,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 10, color: '#fff', flexShrink: 0,
          }}>✓</div>
          <span style={{ fontSize: 12, color: '#444', whiteSpace: 'nowrap' }}>{t}</span>
        </div>
      ))}
      <div style={{
        marginTop: 4,
        display: 'inline-flex', alignItems: 'center', gap: 5,
        background: '#F4F0FF', borderRadius: 999,
        padding: '5px 12px', fontSize: 12, fontWeight: 600, color: '#6D4CFF',
        width: 'fit-content',
      }}>
        <Sparkles size={11} /> AI 자동 완성 ✨
      </div>
    </div>
  );
}

// ── 사이드바 메뉴 ─────────────────────────────────────────
const MENUS = [
  { icon: Home, label: '홈', active: true },
  { icon: FileText, label: '내 작업', active: false },
  { icon: LayoutGrid, label: '템플릿', active: false },
  { icon: BookOpen, label: '가이드', active: false },
  { icon: Settings, label: '설정', active: false },
];

// ── 메인 ─────────────────────────────────────────────────
export default function DashboardScreen() {
  const { startDetail, go, loadFromHistory, toggleChat, credits } = useApp();
  const { data: session } = useSession();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [hov, setHov] = useState<string | null>(null);
  const [hoverSidebar, setHoverSidebar] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const email = session?.user?.email ?? 'guest';
  const rawName = session?.user?.name ?? '';
  const displayName = rawName
    ? (rawName.length > 4 ? rawName.slice(0, 4) + '님' : rawName + '님')
    : '사장님';

  useEffect(() => {
    try {
      const s = localStorage.getItem(`pc_history_${email}`);
      if (s) setHistory(JSON.parse(s));
    } catch {}
  }, [email]);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpenMenu(null);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const deleteItem = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const upd = history.filter(h => h.id !== id);
    setHistory(upd);
    try { localStorage.setItem(`pc_history_${email}`, JSON.stringify(upd)); } catch {}
    setOpenMenu(null);
  };

  const stats = getWeeklyStats(history);

  // ── 스타일
  const card = (id: string, extra?: React.CSSProperties): React.CSSProperties => ({
    background: '#fff',
    border: `1.5px solid ${hov === id ? '#6D4CFF' : '#ECECF2'}`,
    borderRadius: 20,
    boxShadow: hov === id ? '0 8px 28px rgba(109,76,255,0.12)' : '0 2px 8px rgba(0,0,0,0.04)',
    transform: hov === id ? 'translateY(-2px)' : 'none',
    transition: 'all 180ms',
    cursor: 'pointer',
    ...extra,
  });

  return (
    <div style={{
      display: 'flex', height: 'calc(100vh - 56px)',
      background: '#FAFAFC', overflow: 'hidden',
      fontFamily: "'Pretendard','Noto Sans KR',sans-serif",
    }}>

      {/* ══════════ 사이드바 ══════════ */}
      <aside style={{
        width: 240, flexShrink: 0,
        background: '#fff', borderRight: '1px solid #ECECF2',
        display: 'flex', flexDirection: 'column',
        overflowY: 'auto',
      }}>
        {/* 로고 */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '24px 20px 20px',
          borderBottom: '1px solid #F4F4F6',
        }}>
          <div style={{
            width: 32, height: 32, background: '#6D4CFF', borderRadius: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, fontWeight: 800, color: '#fff',
          }}>P</div>
          <span style={{ fontSize: 16, fontWeight: 700, color: '#111', letterSpacing: '-0.02em' }}>PageCraft</span>
        </div>

        {/* 메뉴 */}
        <nav style={{ flex: 1, padding: '12px 8px' }}>
          {MENUS.map(m => {
            const Icon = m.icon;
            const isHov = hoverSidebar === m.label;
            return (
              <div
                key={m.label}
                onClick={() => go('s-dash')}
                onMouseEnter={() => setHoverSidebar(m.label)}
                onMouseLeave={() => setHoverSidebar(null)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '11px 14px', borderRadius: 10, cursor: 'pointer',
                  marginBottom: 2,
                  background: m.active ? '#F4F0FF' : isHov ? '#FAFAFC' : 'transparent',
                  color: m.active ? '#6D4CFF' : '#555',
                  fontSize: 14, fontWeight: m.active ? 600 : 400,
                  transition: 'background 100ms',
                }}
              >
                <Icon size={16} />
                {m.label}
              </div>
            );
          })}
        </nav>

        {/* 프로 플랜 카드 */}
        <div style={{ padding: '0 12px 20px' }}>
          <div style={{
            background: 'linear-gradient(135deg, #6D4CFF 0%, #4A33CC 100%)',
            borderRadius: 16, padding: '18px 16px', color: '#fff',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
              <Crown size={16} color="#FFD700" />
              <span style={{ fontSize: 13, fontWeight: 700 }}>프로 플랜 업그레이드</span>
            </div>
            <p style={{ fontSize: 12, opacity: 0.85, lineHeight: 1.65, marginBottom: 14 }}>
              더 많은 AI 기능과<br />프리미엄 템플릿을<br />무제한으로 이용하세요.
            </p>
            <button style={{
              width: '100%', background: '#fff', border: 'none',
              borderRadius: 10, padding: '9px 0',
              fontSize: 12, fontWeight: 700, color: '#6D4CFF',
              cursor: 'pointer', fontFamily: 'inherit',
            }}>
              업그레이드 하기 →
            </button>
          </div>
        </div>
      </aside>

      {/* ══════════ 메인 콘텐츠 ══════════ */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px 40px' }}>

        {/* 헤더 */}
        <div style={{
          display: 'flex', alignItems: 'flex-start',
          justifyContent: 'space-between', marginBottom: 24,
        }}>
          <div>
            <div style={{ fontSize: 26, fontWeight: 700, color: '#111', letterSpacing: '-0.03em', marginBottom: 4 }}>
              안녕하세요, {displayName} 👋
            </div>
            <div style={{ fontSize: 14, color: '#888' }}>오늘은 어떤 상세페이지를 만들어볼까요?</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#F0FDF4', borderRadius: 999, padding: '6px 12px', fontSize: 12, fontWeight: 600, color: '#16A34A' }}>
              <span style={{ width: 7, height: 7, background: '#22C55E', borderRadius: '50%', display: 'inline-block' }} />
              AI 도우미
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#FFF7E6', borderRadius: 999, padding: '6px 14px', fontSize: 13, fontWeight: 700, color: '#D97706' }}>
              <Zap size={13} /> {credits}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: '#fff', border: '1px solid #ECECF2', borderRadius: 999, padding: '6px 14px', fontSize: 13, color: '#333', cursor: 'default' }}>
              <div style={{ width: 24, height: 24, background: '#EDE8FF', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#6D4CFF' }}>
                {displayName[0]}
              </div>
              {displayName}
              <ChevronRight size={13} color="#BBB" />
            </div>
          </div>
        </div>

        {/* ── 2열 그리드 ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20, alignItems: 'start' }}>

          {/* ── 좌: 메인 영역 ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* 메인 액션 카드 */}
            <div
              style={{ ...card('main'), padding: '24px 28px', border: `2px solid ${hov === 'main' ? '#6D4CFF' : '#DDD6FE'}` }}
              onMouseEnter={() => setHov('main')}
              onMouseLeave={() => setHov(null)}
              onClick={startDetail}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                {/* 좌: 텍스트 */}
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: '#F4F0FF', borderRadius: 999, padding: '4px 12px', fontSize: 12, fontWeight: 600, color: '#6D4CFF', marginBottom: 10 }}>
                    AI가 구성해드려요
                    <span style={{ background: '#6D4CFF', borderRadius: '50%', width: 14, height: 14, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 9, marginLeft: 2 }}>+</span>
                  </div>
                  <div style={{ fontSize: 30, fontWeight: 800, color: '#111', letterSpacing: '-0.04em', lineHeight: 1.15, marginBottom: 8 }}>
                    상세페이지 만들기
                  </div>
                  <div style={{ fontSize: 13, color: '#888', lineHeight: 1.6, marginBottom: 14 }}>
                    카테고리·채널·타입 선택 → AI가 카피+이미지 구조 완성
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {['기본형', '프리미엄형', '블로그형(글+그림) 포함'].map(c => (
                      <span key={c} style={{ background: '#F4F0FF', borderRadius: 999, padding: '4px 10px', fontSize: 11, color: '#6D4CFF' }}>{c}</span>
                    ))}
                  </div>
                </div>

                {/* 중: 목업 */}
                <CardMockup />

                {/* 우: 체크리스트 */}
                <CheckList />

                {/* 화살표 */}
                <div style={{
                  width: 52, height: 52, flexShrink: 0,
                  background: '#6D4CFF', borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 4px 16px rgba(109,76,255,0.35)',
                  transition: 'transform 150ms',
                  transform: hov === 'main' ? 'scale(1.08)' : 'scale(1)',
                }}>
                  <ArrowRight size={22} color="#fff" />
                </div>
              </div>
            </div>

            {/* 서브 카드 2열 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              {/* 빠른 제작 */}
              <div
                style={{ ...card('quick'), padding: '20px 22px', display: 'flex', alignItems: 'center', gap: 16 }}
                onMouseEnter={() => setHov('quick')}
                onMouseLeave={() => setHov(null)}
                onClick={() => go('s-quick')}
              >
                <div style={{ width: 44, height: 44, background: '#FEF3C7', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>⚡</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: '#111', marginBottom: 4 }}>빠른 제작</div>
                  <div style={{ fontSize: 12, color: '#888', lineHeight: 1.5 }}>원하는 섹션 1장만 골라<br />카피+이미지를 즉시 생성</div>
                </div>
                <div style={{ width: 34, height: 34, background: '#FDE68A', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <ArrowRight size={15} color="#92400E" />
                </div>
              </div>

              {/* 썸네일 만들기 */}
              <div
                style={{ ...card('thumb'), padding: '20px 22px', display: 'flex', alignItems: 'center', gap: 16 }}
                onMouseEnter={() => setHov('thumb')}
                onMouseLeave={() => setHov(null)}
                onClick={() => go('s-thumb')}
              >
                <div style={{ width: 44, height: 44, background: '#FCE7F3', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>🖼️</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: '#111', marginBottom: 4 }}>썸네일 만들기</div>
                  <div style={{ fontSize: 12, color: '#888', lineHeight: 1.5 }}>채널 규격 자동 적용·<br />4가지 타입 썸네일 즉시 생성</div>
                </div>
                <div style={{ width: 34, height: 34, background: '#FBCFE8', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <ArrowRight size={15} color="#9D174D" />
                </div>
              </div>
            </div>

            {/* 최근 작업 */}
            <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #ECECF2', overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px 14px', borderBottom: '1px solid #F4F4F6' }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: '#111' }}>최근 작업</span>
                <button style={{ display: 'flex', alignItems: 'center', gap: 2, background: 'none', border: 'none', fontSize: 12, color: '#6D4CFF', cursor: 'pointer', fontFamily: 'inherit' }}>
                  전체 보기 <ChevronRight size={12} />
                </button>
              </div>

              <div ref={menuRef}>
                {history.length === 0 ? (
                  <div style={{ padding: '28px 20px', display: 'flex', alignItems: 'center', gap: 20 }}>
                    <div style={{ width: 44, height: 44, background: '#F4F0FF', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Sparkles size={20} color="#A78BFA" />
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 500, color: '#555', marginBottom: 3 }}>아직 작업이 없어요?</div>
                      <div style={{ fontSize: 12, color: '#AAA' }}>첫 상세페이지를 만들어보세요. AI가 도와드릴게요!</div>
                    </div>
                    <button
                      onClick={startDetail}
                      style={{
                        marginLeft: 'auto', flexShrink: 0,
                        background: '#6D4CFF', color: '#fff', border: 'none',
                        borderRadius: 12, padding: '10px 18px',
                        fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      상세페이지 만들기 →
                    </button>
                  </div>
                ) : (
                  <>
                    {history.slice(0, 4).map((item, idx) => (
                      <div
                        key={item.id}
                        onClick={() => loadFromHistory(item)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 14, padding: '12px 20px',
                          borderBottom: idx < Math.min(history.length, 4) - 1 ? '1px solid #F4F4F6' : 'none',
                          cursor: 'pointer', transition: 'background 100ms', position: 'relative',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#FAFAFC')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        <div style={{ width: 52, height: 52, flexShrink: 0, background: '#F4F0FF', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <ImageIcon size={20} color="#C4B5FD" />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 500, color: '#111', marginBottom: 5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {item.productName || '(상품명 없음)'}
                          </div>
                          <div style={{ display: 'flex', gap: 5 }}>
                            {[item.cat, item.ch].map(t => (
                              <span key={t} style={{ background: '#F4F4F6', borderRadius: 999, padding: '2px 8px', fontSize: 11, color: '#666' }}>{t}</span>
                            ))}
                            <span style={{ background: '#F4F4F6', borderRadius: 999, padding: '2px 8px', fontSize: 11, color: '#666' }}>{item.secCnt}섹션</span>
                          </div>
                        </div>
                        <div style={{ fontSize: 11, color: '#CCC', flexShrink: 0 }}>{fmt(item.createdAt)}</div>
                        <div style={{ position: 'relative', flexShrink: 0 }}>
                          <button
                            onClick={e => { e.stopPropagation(); setOpenMenu(openMenu === item.id ? null : item.id); }}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#CCC', display: 'flex', borderRadius: 6 }}
                          >
                            <Ellipsis size={16} />
                          </button>
                          {openMenu === item.id && (
                            <div style={{ position: 'absolute', right: 0, top: 28, background: '#fff', border: '1px solid #ECECF2', borderRadius: 10, padding: 4, boxShadow: '0 4px 16px rgba(0,0,0,0.12)', zIndex: 50, minWidth: 90 }}>
                              <button
                                onClick={e => deleteItem(e, item.id)}
                                style={{ display: 'flex', alignItems: 'center', gap: 7, width: '100%', background: 'none', border: 'none', padding: '8px 12px', fontSize: 13, color: '#EF4444', cursor: 'pointer', borderRadius: 7, fontFamily: 'inherit' }}
                                onMouseEnter={e => (e.currentTarget.style.background = '#FEF2F2')}
                                onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                              >
                                <Trash2 size={12} /> 삭제
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    {/* 빈 상태 배너 (작업 있어도 항상 표시) */}
                    <div style={{ padding: '14px 20px', background: '#FAFAFC', borderTop: '1px solid #F4F4F6', display: 'flex', alignItems: 'center', gap: 16 }}>
                      <div style={{ width: 36, height: 36, background: '#EDE8FF', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Sparkles size={16} color="#7C3AED" />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: '#555' }}>아직 작업이 없나요?</div>
                        <div style={{ fontSize: 11, color: '#AAA' }}>첫 상세페이지를 만들어보세요. AI가 도와드릴게요!</div>
                      </div>
                      <button onClick={startDetail} style={{ flexShrink: 0, background: '#6D4CFF', color: '#fff', border: 'none', borderRadius: 10, padding: '8px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
                        상세페이지 만들기 →
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* ── 우: 사이드 영역 ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* AI 추천 카테고리 */}
            <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #ECECF2', padding: '18px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#111' }}>✦ AI 추천 카테고리</span>
              </div>
              <p style={{ fontSize: 12, color: '#AAA', marginBottom: 14, lineHeight: 1.5 }}>
                요즘 많이 만드는 카테고리를 확인해보세요.
              </p>
              {PLATFORM_CATS.map((c, i) => (
                <div key={c.name} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 0',
                  borderBottom: i < 4 ? '1px solid #F5F5F7' : 'none',
                }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                    background: i === 0 ? '#6D4CFF' : '#F4F0FF',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 700,
                    color: i === 0 ? '#fff' : '#6D4CFF',
                  }}>{i + 1}</div>
                  <span style={{ flex: 1, fontSize: 13, color: '#333' }}>{c.name}</span>
                  <span style={{ fontSize: 11, color: '#AAA' }}>{c.count}</span>
                </div>
              ))}
            </div>

            {/* 이번 주 사용 리포트 */}
            <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #ECECF2', padding: '18px 20px' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#111', marginBottom: 4 }}>📊 이번 주 사용 리포트</div>
              <div style={{ fontSize: 11, color: '#AAA', marginBottom: 10 }}>생성한 상세페이지 수</div>

              {stats.tw === 0 ? (
                <div style={{ textAlign: 'center', padding: '8px 0 12px', color: '#AAA' }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: '#DDD', marginBottom: 6 }}>0개</div>
                  <div style={{ fontSize: 11, color: '#BBB', lineHeight: 1.5 }}>이번 주 첫 상세페이지를<br />만들어보세요!</div>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 32, fontWeight: 800, color: '#111', letterSpacing: '-0.04em', lineHeight: 1 }}>
                      {stats.tw}개
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6, fontSize: 12, fontWeight: 600, color: stats.pct >= 0 ? '#16A34A' : '#DC2626' }}>
                      {stats.pct >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                      지난 주 대비 {stats.pct >= 0 ? '↑' : '↓'} {Math.abs(stats.pct)}%
                    </div>
                  </div>
                  <div style={{ flex: 1, maxWidth: 100 }}>
                    <BarChart counts={stats.counts} />
                  </div>
                </div>
              )}
            </div>

            {/* AI 도우미 얼지 */}
            <div style={{ background: 'linear-gradient(135deg, #F4F0FF 0%, #EDE8FF 100%)', borderRadius: 20, border: '1.5px solid #DDD6FE', padding: '18px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#111', marginBottom: 2 }}>AI로 더 빠르게 작업하세요</div>
                  <div style={{ fontSize: 11, color: '#888' }}>AI 도우미에게 작업을 맡겨보세요</div>
                </div>
                <div style={{ width: 44, height: 44, background: '#6D4CFF', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Bot size={22} color="#fff" />
                </div>
              </div>
              <button
                onClick={toggleChat}
                style={{
                  width: '100%', background: '#fff', border: '1.5px solid #DDD6FE',
                  borderRadius: 12, padding: '9px 0',
                  fontSize: 13, fontWeight: 600, color: '#6D4CFF',
                  cursor: 'pointer', fontFamily: 'inherit',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}
              >
                <Bot size={14} /> AI 도우미 열기 →
              </button>
            </div>

          </div>
        </div>
      </div>

      <style>{`
        @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.css');
      `}</style>
    </div>
  );
}
