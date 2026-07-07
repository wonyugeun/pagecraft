'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useApp, HistoryItem } from '@/store/AppContext';
import {
  Zap, Image as ImageIcon, ChevronRight, MoreVertical,
  Sparkles, BarChart3, ArrowRight, ChevronDown,
  Home, FileText, LayoutGrid, BookOpen, Settings,
} from 'lucide-react';

/* ─── 헬퍼 ─── */
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

function getCatStyle(cat: string): { bg: string; emoji: string } {
  if (cat?.includes('화장품') || cat?.includes('미용')) return { bg: '#FDF2F8', emoji: '🧴' };
  if (cat?.includes('식품') || cat?.includes('음식')) return { bg: '#FEF3C7', emoji: '🍲' };
  if (cat?.includes('가구') || cat?.includes('인테리어')) return { bg: '#F0FDF4', emoji: '🪑' };
  if (cat?.includes('디지털') || cat?.includes('가전')) return { bg: '#EFF6FF', emoji: '📱' };
  if (cat?.includes('패션') || cat?.includes('잡화')) return { bg: '#FAF5FF', emoji: '👗' };
  return { bg: '#F4F0FF', emoji: '📄' };
}

const PLATFORM_CATS: { name: string; count: string; emoji: string }[] = [
  { name: '화장품/미용',  count: '12,408개', emoji: '🧴' },
  { name: '식품',         count: '8,721개',  emoji: '🥗' },
  { name: '가구/인테리어', count: '6,531개',  emoji: '🪑' },
  { name: '디지털/가전',  count: '4,982개',  emoji: '📱' },
  { name: '패션/잡화',    count: '3,652개',  emoji: '👗' },
];

const SAMPLE_HISTORY: HistoryItem[] = [
  { id: 'sample-1', productName: '데일리 수분 크림 상세페이지', cat: '화장품/미용', ch: '스마트스토어', type: '기본형', out: 'blog', secCnt: 16, createdAt: '2026-05-22T18:08:00', sections: [] },
  { id: 'sample-2', productName: '원목 의자 상세페이지',       cat: '가구/인테리어', ch: '스마트스토어', type: '기본형', out: 'slide', secCnt: 12, createdAt: '2026-05-22T17:48:00', sections: [] },
  { id: 'sample-3', productName: '닭가슴살 스테이크 상세페이지', cat: '식품',         ch: '자사몰',      type: '프리미엄형', out: 'blog', secCnt: 18, createdAt: '2026-05-22T17:35:00', sections: [] },
  { id: 'sample-4', productName: '미니 가습기 상세페이지',     cat: '디지털/가전',   ch: '쿠팡',        type: '기본형',  out: 'slide', secCnt: 10, createdAt: '2026-05-22T16:22:00', sections: [] },
];

function MiniBar({ counts }: { counts: number[] }) {
  const labels = ['월', '화', '수', '목', '금', '토', '일'];
  const max = Math.max(...counts, 1);
  const today = new Date().getDay();
  const todayIdx = today === 0 ? 6 : today - 1;
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 56 }}>
      {counts.map((v, i) => {
        const h = v === 0 ? 6 : Math.max(8, Math.round((v / max) * 44));
        const isToday = i === todayIdx;
        return (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flex: 1 }}>
            <div style={{
              width: '70%', height: h,
              background: isToday ? '#6D4CFF' : v === 0 ? '#EBEBF2' : '#C4B5FD',
              borderRadius: '3px 3px 0 0',
            }} />
            <span style={{ fontSize: 10, color: isToday ? '#6D4CFF' : '#999', fontWeight: isToday ? 700 : 400 }}>
              {labels[i]}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function formatTime(iso: string) {
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

/* ─── 메인 ─── */
export default function DashboardMobile() {
  const { startDetail, loadFromHistory, toggleChat, credits } = useApp();
  const { data: session } = useSession();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const email = session?.user?.email ?? 'guest';

  useEffect(() => {
    try {
      const s = localStorage.getItem(`pc_history_${email}`);
      if (s) setHistory(JSON.parse(s));
    } catch {}
  }, [email]);

  const stats = getWeeklyStats(history);
  const isEmpty = history.length === 0;
  const displayHistory = isEmpty ? SAMPLE_HISTORY : history.slice(0, 4);

  return (
    <div style={{
      minHeight: '100vh', background: '#FAFAFC',
      fontFamily: 'Pretendard, sans-serif',
      paddingBottom: '80px',
    }}>

      {/* 1) 상단 헤더 */}
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 20px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <img src="/images/logo-flik.png" alt="Flik" style={{ height: 30, width: "auto", objectFit: "contain", display: "block" }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button onClick={toggleChat} style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            background: '#fff', border: '1px solid #ECECF2', borderRadius: 999,
            padding: '6px 10px', fontSize: 12, fontWeight: 600, color: '#111',
            cursor: 'pointer', fontFamily: 'inherit',
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22C55E' }} />
            AI 도우미
          </button>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            background: '#fff', border: '1px solid #ECECF2', borderRadius: 999,
            padding: '6px 10px', fontSize: 12, fontWeight: 700, color: '#111',
          }}>
            <Zap size={12} color="#F59E0B" fill="#F59E0B" /> {credits}
          </div>
          <button style={{
            display: 'inline-flex', alignItems: 'center', gap: 2,
            background: '#6D4CFF', color: '#fff',
            border: 'none', borderRadius: 999,
            width: 36, height: 36,
            justifyContent: 'center',
            cursor: 'pointer',
          }}>
            <ChevronDown size={12} color="#fff" />
          </button>
        </div>
      </header>

      {/* 2) 인사말 */}
      <section style={{ padding: '4px 20px 16px' }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#111' }}>
          안녕하세요, 원사장님 <span>👋</span>
        </h1>
        <p style={{ margin: '6px 0 0', fontSize: 13, color: '#666' }}>
          오늘은 어떤 상세페이지를 만들어볼까요?
        </p>
      </section>

      {/* 3) 메인 카드 — 상세페이지 만들기 */}
      <section style={{ padding: '0 20px' }}>
        <div
          onClick={startDetail}
          style={{
            background: '#F4F0FF',
            borderRadius: 24, padding: '20px',
            position: 'relative', overflow: 'hidden',
            cursor: 'pointer',
          }}
        >
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            background: '#fff', color: '#6D4CFF',
            fontSize: 11, fontWeight: 700,
            borderRadius: 999, padding: '4px 10px',
          }}>
            <Sparkles size={10} /> AI가 구성해드려요
          </span>
          <h2 style={{ margin: '12px 0 0', fontSize: 24, fontWeight: 800, color: '#111' }}>
            상세페이지 만들기
          </h2>
          <p style={{ margin: '8px 0 0', fontSize: 12, color: '#666', lineHeight: 1.5 }}>
            카테고리·채널·타입 선택 →<br />AI가 카피+이미지 구조 완성
          </p>
          <div style={{ marginTop: 14, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {['기본형', '프리미엄형', '블로그형(글+그림) 포함'].map(c => (
              <span key={c} style={{
                background: '#fff', color: '#6D4CFF',
                fontSize: 11, fontWeight: 600,
                borderRadius: 999, padding: '5px 10px',
              }}>{c}</span>
            ))}
          </div>
          {/* GPT mockup 이미지 자리 */}
          <div style={{
            position: 'absolute', right: -20, top: 14,
            width: 140, height: 130,
            borderRadius: 12,
            background: 'linear-gradient(135deg, #DDD6FE, #fff)',
            opacity: 0.6,
          }} />
          {/* 보라 원형 화살표 */}
          <div style={{
            position: 'absolute', right: 16, top: 70,
            width: 52, height: 52, borderRadius: '50%',
            background: '#6D4CFF',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 20px rgba(109,76,255,0.35)',
          }}>
            <ArrowRight size={22} color="#fff" />
          </div>
          {/* AI 자동 완성 칩 (우하단) */}
          <span style={{
            position: 'absolute', right: 16, bottom: 16,
            display: 'inline-flex', alignItems: 'center', gap: 4,
            background: '#fff', color: '#6D4CFF',
            fontSize: 11, fontWeight: 700,
            borderRadius: 999, padding: '6px 12px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
          }}>
            AI 자동 완성 <Sparkles size={10} />
          </span>
        </div>
      </section>

      {/* 4) 빠른 제작 */}
      <section style={{ padding: '12px 20px 0' }}>
        <div
          style={{
            background: '#fff', borderRadius: 20, padding: 16,
            display: 'flex', alignItems: 'center', gap: 14,
            opacity: 0.55,
            border: '1px solid #F0F0F4',
          }}
        >{/* ★준비 중 — 무결제 비용 경로라 과금 흐름 설계 전까지 비활성 */}
          <div style={{
            width: 56, height: 56, borderRadius: 14,
            background: '#FEF3C7',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Zap size={26} color="#F59E0B" fill="#F59E0B" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#111' }}>빠른 제작<span style={{ marginLeft: 6, fontSize: 10, fontWeight: 600, color: '#9CA3AF', background: '#F3F4F6', borderRadius: 6, padding: '2px 6px', verticalAlign: 'middle' }}>준비 중</span></div>
            <div style={{ marginTop: 4, fontSize: 12, color: '#666', lineHeight: 1.45 }}>
              원하는 섹션 1장만 골라<br />카피+이미지를 즉시 생성
            </div>
          </div>
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            background: '#FEF3C7',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <ArrowRight size={16} color="#F59E0B" />
          </div>
        </div>
      </section>

      {/* 5) 썸네일 만들기 */}
      <section style={{ padding: '10px 20px 0' }}>
        <div
          style={{
            background: '#fff', borderRadius: 20, padding: 16,
            display: 'flex', alignItems: 'center', gap: 14,
            opacity: 0.55,
            border: '1px solid #F0F0F4',
          }}
        >{/* ★준비 중 — 무결제 비용 경로라 과금 흐름 설계 전까지 비활성 */}
          <div style={{
            width: 56, height: 56, borderRadius: 14,
            background: '#FCE7F3',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <ImageIcon size={26} color="#EC4899" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#111' }}>썸네일 만들기<span style={{ marginLeft: 6, fontSize: 10, fontWeight: 600, color: '#9CA3AF', background: '#F3F4F6', borderRadius: 6, padding: '2px 6px', verticalAlign: 'middle' }}>준비 중</span></div>
            <div style={{ marginTop: 4, fontSize: 12, color: '#666', lineHeight: 1.45 }}>
              채널 규격 자동 적용 ·<br />4가지 타입 썸네일 즉시 생성
            </div>
          </div>
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            background: '#FCE7F3',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <ArrowRight size={16} color="#EC4899" />
          </div>
        </div>
      </section>

      {/* 6) 최근 작업 */}
      <section style={{ padding: '14px 20px 0' }}>
        <div style={{ background: '#fff', borderRadius: 20, padding: 16, border: '1px solid #F0F0F4' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#111' }}>최근 작업</div>
            <button style={{
              display: 'inline-flex', alignItems: 'center', gap: 2,
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 12, fontWeight: 600, color: '#6D4CFF',
              fontFamily: 'inherit', padding: 0,
            }}>
              전체 보기 <ChevronRight size={12} />
            </button>
          </div>
          {displayHistory.map((item) => {
            const cat = getCatStyle(item.cat);
            const isSample = item.id.startsWith('sample-');
            return (
              <div key={item.id}
                onClick={() => !isSample && loadFromHistory(item)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 0',
                  borderBottom: '1px solid #F4F4F7',
                  cursor: isSample ? 'default' : 'pointer',
                }}
              >
                <div style={{
                  width: 44, height: 44, borderRadius: 8,
                  background: cat.bg, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 22,
                }}>{cat.emoji}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 13, fontWeight: 600, color: '#111',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>{item.productName}</div>
                  <div style={{ marginTop: 4, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 999, background: '#F4F0FF', color: '#6D4CFF', fontWeight: 600 }}>
                      {item.cat}
                    </span>
                    <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 999, background: '#F4F4F7', color: '#666', fontWeight: 600 }}>
                      {item.ch}
                    </span>
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 11, color: '#666', fontWeight: 600 }}>{item.secCnt}섹션</div>
                  <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>{formatTime(item.createdAt)}</div>
                </div>
                <MoreVertical size={16} color="#CCC" />
              </div>
            );
          })}
        </div>
      </section>

      {/* 7) AI 추천 카테고리 */}
      <section style={{ padding: '14px 20px 0' }}>
        <div style={{ background: '#fff', borderRadius: 20, padding: 16, border: '1px solid #F0F0F4' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Sparkles size={16} color="#6D4CFF" />
              <span style={{ fontSize: 15, fontWeight: 700, color: '#111' }}>AI 추천 카테고리</span>
            </div>
            <button style={{
              display: 'inline-flex', alignItems: 'center', gap: 2,
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 12, fontWeight: 600, color: '#6D4CFF',
              fontFamily: 'inherit', padding: 0,
            }}>
              더보기 <ChevronRight size={12} />
            </button>
          </div>
          <p style={{ margin: '4px 0 14px', fontSize: 11.5, color: '#666' }}>
            요즘 많이 만드는 카테고리를 확인해보세요.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
            {PLATFORM_CATS.map((c, i) => (
              <div key={c.name} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
              }}>
                <div style={{ fontSize: 10, color: '#999', fontWeight: 600 }}>{i + 1}</div>
                <div style={{
                  marginTop: 4, width: 36, height: 36, borderRadius: '50%',
                  background: '#F4F0FF',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 16,
                }}>{c.emoji}</div>
                <div style={{ marginTop: 6, fontSize: 10.5, fontWeight: 700, color: '#111' }}>
                  {c.name}
                </div>
                <div style={{ marginTop: 2, fontSize: 10, color: '#999' }}>{c.count}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 8) 이번 주 사용 리포트 */}
      <section style={{ padding: '14px 20px 0' }}>
        <div style={{ background: '#fff', borderRadius: 20, padding: 16, border: '1px solid #F0F0F4' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
            <BarChart3 size={16} color="#6D4CFF" />
            <span style={{ fontSize: 15, fontWeight: 700, color: '#111' }}>이번 주 사용 리포트</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16 }}>
            <div style={{ flex: 1.2 }}>
              <div style={{ fontSize: 11, color: '#666' }}>생성한 상세페이지 수</div>
              <div style={{ marginTop: 4, fontSize: 28, fontWeight: 800, color: '#111' }}>
                {stats.tw}개
              </div>
              <div style={{ marginTop: 4, fontSize: 11, color: '#666' }}>
                지난 주 대비{' '}
                <span style={{ color: stats.pct >= 0 ? '#22C55E' : '#EF4444', fontWeight: 700 }}>
                  {stats.pct >= 0 ? '↑' : '↓'} {Math.abs(stats.pct)}%
                </span>
              </div>
            </div>
            <div style={{ flex: 2 }}>
              <MiniBar counts={stats.counts} />
            </div>
          </div>
        </div>
      </section>

      {/* 9) AI 도우미 배너 */}
      <section style={{ padding: '14px 20px 0' }}>
        <div style={{
          background: '#F4F0FF', borderRadius: 20, padding: 18,
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{ flex: 1.4 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#111' }}>
              AI로 더 빠르게 작업하세요
            </div>
            <div style={{ marginTop: 4, fontSize: 11, color: '#666' }}>
              AI 도우미에게 작업을 맡겨보세요
            </div>
            <button onClick={toggleChat} style={{
              marginTop: 12,
              display: 'inline-flex', alignItems: 'center', gap: 4,
              background: '#fff', border: '1px solid #DDD6FE',
              color: '#6D4CFF',
              fontSize: 12, fontWeight: 700,
              borderRadius: 999, padding: '8px 14px',
              cursor: 'pointer', fontFamily: 'inherit',
            }}>
              AI 도우미 열기 <ArrowRight size={12} />
            </button>
          </div>
          {/* GPT 봇 일러스트 자리 */}
          <div style={{
            width: 76, height: 84, flexShrink: 0,
            borderRadius: 16,
            background: 'rgba(255,255,255,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 38,
          }}>🤖</div>
        </div>
      </section>

      {/* 10) 하단 고정 탭바 */}
      <nav style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: '#fff', borderTop: '1px solid #ECECF2',
        padding: '10px 0',
        display: 'flex', justifyContent: 'space-around',
        zIndex: 100,
      }}>
        {[
          { Icon: Home,       label: '홈',     active: true  },
          { Icon: FileText,   label: '내 작업', active: false },
          { Icon: LayoutGrid, label: '템플릿', active: false },
          { Icon: BookOpen,   label: '가이드', active: false },
          { Icon: Settings,   label: '설정',   active: false },
        ].map(({ Icon, label, active }) => {
          const color = active ? '#6D4CFF' : '#999';
          return (
            <div key={label} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
            }}>
              <Icon size={22} color={color} fill={active ? '#6D4CFF' : 'none'} />
              <span style={{ fontSize: 11, color, fontWeight: active ? 700 : 400 }}>{label}</span>
            </div>
          );
        })}
      </nav>

    </div>
  );
}
