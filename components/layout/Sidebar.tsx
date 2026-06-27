'use client';

import { useRouter } from 'next/navigation';
import { Home, FileText, BookOpen, Crown, ChevronLeft, ChevronRight } from 'lucide-react';
import { useApp, ScreenId } from '@/store/AppContext';
import { useState } from 'react';

const MENUS = [
  { icon: Home,     label: '홈',    screenId: 's-dash' as ScreenId, path: null,        soon: false },
  { icon: FileText, label: '내 작업', screenId: null,               path: '/my-works', soon: false },
  { icon: BookOpen, label: '가이드', screenId: null,               path: '/guide',    soon: true },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  activeScreen?: ScreenId;
}

export default function Sidebar({ collapsed, onToggle, activeScreen }: SidebarProps) {
  const { go } = useApp();
  const router = useRouter();
  const [hov, setHov] = useState<string | null>(null);

  const W = collapsed ? 72 : 240;

  return (
    <aside data-sidebar style={{
      width: W, flexShrink: 0,
      background: '#fff', borderRight: '1px solid #ECECF2',
      display: 'flex', flexDirection: 'column',
      overflowY: 'auto', overflowX: 'hidden',
      transition: 'width 200ms ease',
      position: 'relative',
    }}>
      {/* 로고 */}
      <div style={{
        display: 'flex', alignItems: 'center',
        gap: collapsed ? 0 : 10,
        padding: collapsed ? '24px 0 20px' : '24px 20px 20px',
        justifyContent: collapsed ? 'center' : 'flex-start',
        borderBottom: '1px solid #F4F4F6',
        transition: 'padding 200ms ease',
      }}>
        {/* 접힘: 폭 34로 자르면 로고 왼쪽 심볼(막대)만 보임 / 펼침: 전체 워드마크. */}
        <div style={{ height: 28, width: collapsed ? 30 : 'auto', overflow: 'hidden', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/logo-flik.png" alt="Flik" style={{ height: 24, width: 'auto', maxWidth: 'none', display: 'block' }} />
        </div>
      </div>

      {/* 메뉴 */}
      <nav style={{ flex: 1, padding: collapsed ? '12px 4px' : '12px 8px' }}>
        {MENUS.map(m => {
          const Icon = m.icon;
          const isActive = m.screenId === 's-dash' && (!activeScreen || activeScreen === 's-dash');
          const isHov = hov === m.label;
          return (
            <div
              key={m.label}
              title={collapsed ? m.label : undefined}
              onClick={() => {
                if (m.screenId) go(m.screenId);
                else if (m.path) router.push(m.path);
              }}
              onMouseEnter={() => setHov(m.label)}
              onMouseLeave={() => setHov(null)}
              style={{
                display: 'flex', alignItems: 'center',
                gap: collapsed ? 0 : 10,
                justifyContent: collapsed ? 'center' : 'flex-start',
                padding: collapsed ? '11px 0' : '11px 14px',
                borderRadius: 10, cursor: 'pointer', marginBottom: 2,
                background: isActive ? '#F4F0FF' : isHov ? '#FAFAFC' : 'transparent',
                color: isActive ? '#6D4CFF' : '#555',
                fontSize: 14, fontWeight: isActive ? 600 : 400,
                transition: 'background 100ms',
              }}
            >
              <Icon size={16} style={{ flexShrink: 0 }} />
              {!collapsed && <span style={{ whiteSpace: 'nowrap' }}>{m.label}</span>}
              {!collapsed && m.soon && (
                <span style={{
                  marginLeft: 'auto', fontSize: 10, fontWeight: 700, color: '#9B8CFF',
                  background: '#F4F0FF', borderRadius: 6, padding: '2px 6px', whiteSpace: 'nowrap',
                }}>준비중</span>
              )}
            </div>
          );
        })}
      </nav>

      {/* 업그레이드 카드 (펼침 상태만) */}
      {!collapsed && (
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
            {/* 결제 미연동 — 죽은 버튼 대신 '출시 예정' 비활성(클릭 무반응 방지). 결제 연동 시 활성화. */}
            <button
              disabled
              title="유료 플랜은 준비 중이에요"
              style={{
                width: '100%', background: 'rgba(255,255,255,0.4)', border: 'none',
                borderRadius: 10, padding: '9px 0',
                fontSize: 12, fontWeight: 700, color: '#fff',
                cursor: 'default', fontFamily: 'inherit',
              }}
            >
              출시 예정
            </button>
          </div>
        </div>
      )}

      {/* 토글 버튼 */}
      <button
        onClick={onToggle}
        title={collapsed ? '사이드바 펼치기' : '사이드바 접기'}
        style={{
          position: 'absolute', right: -12, top: 72,
          width: 24, height: 24, borderRadius: '50%',
          background: '#fff', border: '1.5px solid #ECECF2',
          boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', zIndex: 10,
        }}
      >
        {collapsed
          ? <ChevronRight size={12} color="#888" />
          : <ChevronLeft  size={12} color="#888" />}
      </button>
    </aside>
  );
}
