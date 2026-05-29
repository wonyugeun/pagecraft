'use client';

import { useRouter } from 'next/navigation';
import { Home, FileText, BookOpen, Crown, ChevronLeft, ChevronRight } from 'lucide-react';
import { useApp, ScreenId } from '@/store/AppContext';
import { useState } from 'react';

const MENUS = [
  { icon: Home,     label: '홈',    screenId: 's-dash' as ScreenId, path: null },
  { icon: FileText, label: '내 작업', screenId: null,               path: '/my-works' },
  { icon: BookOpen, label: '가이드', screenId: null,               path: '/guide' },
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
    <aside style={{
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
        <div style={{
          width: 32, height: 32, background: '#6D4CFF', borderRadius: 8, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16, fontWeight: 800, color: '#fff',
        }}>P</div>
        {!collapsed && (
          <span style={{ fontSize: 16, fontWeight: 700, color: '#111', letterSpacing: '-0.02em', whiteSpace: 'nowrap' }}>
            PageCraft
          </span>
        )}
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
