'use client';

import { useEffect, useState } from 'react';
import { Zap, X, ArrowUpRight } from 'lucide-react';
import { useApp } from '@/store/AppContext';
import { PLANS, PROMO } from '@/data/plans';

interface Lot {
  amount: number; remaining: number; kind: string; planId: string | null;
  chargedAt: string | null; expiresAt: string | null;
}

/** 남은 일수 — 0 이하면 오늘 만료 */
function daysLeft(iso: string | null): number | null {
  if (!iso) return null;
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
}
function fmtDate(iso: string | null): string {
  if (!iso) return '-';
  const d = new Date(iso);
  return `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}.`;
}
function kindLabel(kind: string, planId: string | null): string {
  if (kind === 'trial') return '체험 크레딧';
  if (kind === 'refund') return '환불 크레딧';
  const plan = PLANS.find(p => p.id === planId);
  return plan ? `${plan.nameEn} 충전` : '충전';
}

/**
 * 내 크레딧 모달 — 상단바 크레딧 칩을 누르면 열린다.
 *
 * ★역할(2026-07-30 재설계): 잔액을 크게 보여주고 → 충전으로 넘긴다. 그게 전부다.
 *   기존엔 플랜 목록을 모달에 그대로 늘어놓아 요금제 페이지와 중복되고 초점이 흐렸다.
 * ★충전은 /pricing을 새 탭으로 연다 — 생성 중에 앱을 벗어나면 작업이 끊기므로.
 */

/** 원장 reason → 셀러가 읽을 말. 모르는 값은 원문 그대로(숨기지 않는다). */
function reasonLabel(type: string, reason: string): string {
  const m = reason.match(/^generation:?(\d+)?/);
  if (m) return m[1] ? `상세페이지 생성 (${m[1]}섹션)` : '상세페이지 생성';
  if (reason.startsWith('image-extra')) return '이미지 추가 생성';
  if (reason.startsWith('copy-regen-extra')) return '카피 추가 재생성';
  if (reason.startsWith('purchase:')) return '크레딧 충전';
  if (reason.startsWith('signup')) return '가입 무료 크레딧';
  if (reason.startsWith('refund:zero-output')) return '생성 실패 자동 환불';
  if (type === 'refund') return '환불';
  if (type === 'grant') return '지급';
  return reason || '사용';
}

export default function CreditModal() {
  const { credits, creditModalOpen, setCreditModalOpen } = useApp();
  // ★충전 내역·유효기간(2026-07-30) — "언제 충전한 게 언제까지인지"를 셀러가 볼 수 있게.
  const [lots, setLots] = useState<Lot[] | null>(null);
  /* ★사용 내역(2026-08-04 유근님) — 잔액만 보이면 "차감이 없었는지, 있었는데 못 봤는지"를
     셀러가 구분할 수 없다. 오늘 "차감이 안 된다"는 오해가 정확히 여기서 났다. */
  const [ledger, setLedger] = useState<Array<{ type: string; amount: number; reason: string; at: string }> | null>(null);

  useEffect(() => {
    fetch('/api/credits/ledger')
      .then(r => (r.ok ? r.json() : null))
      .then(d => setLedger(d?.items ?? []))
      .catch(() => setLedger([]));
  }, []);
  const [unlinked, setUnlinked] = useState(0);   // lot 도입 이전 크레딧(무기한)

  useEffect(() => {
    if (!creditModalOpen) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/credits/lots');
        if (!res.ok) { if (!cancelled) setLots([]); return; }
        const d = await res.json() as { lots?: Lot[]; unlinked?: number };
        if (!cancelled) { setLots(d.lots ?? []); setUnlinked(d.unlinked ?? 0); }
      } catch { if (!cancelled) setLots([]); }
    })();
    return () => { cancelled = true; };
  }, [creditModalOpen]);

  if (!creditModalOpen) return null;

  const isLow = credits < 10;   // 체험 1회 분량(10섹션) 미만이면 부족 안내
  const close = () => setCreditModalOpen(false);

  return (
    <div
      onClick={close}
      style={{
        position: 'fixed', inset: 0, zIndex: 900,
        background: 'rgba(17,17,26,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 'min(420px, 100%)', background: '#fff', borderRadius: 20,
          padding: '24px 24px 20px',
          boxShadow: '0 20px 60px rgba(17,17,26,0.25)',
          fontFamily: 'var(--f)',
        }}
      >
        {/* 헤더 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <span style={{ fontSize: 17, fontWeight: 800, color: '#191F28', letterSpacing: '-0.02em' }}>
            내 크레딧
          </span>
          <button
            onClick={close}
            aria-label="닫기"
            style={{
              width: 30, height: 30, borderRadius: 8, border: 'none', background: '#F4F4F8',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: '#8B95A1',
            }}
          >
            <X size={16} strokeWidth={2.2} />
          </button>
        </div>

        {/* 잔액 — 이 모달의 주인공 */}
        <div style={{
          background: '#FAFAFC', border: '1px solid #ECECF2', borderRadius: 16,
          padding: '26px 20px', textAlign: 'center', marginBottom: 18,
        }}>
          <div style={{ fontSize: 12.5, color: '#8B95A1', fontWeight: 600, marginBottom: 10 }}>
            보유 크레딧
          </div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 9 }}>
            <Zap size={26} color="#6D4CFF" fill="#6D4CFF" strokeWidth={1.5} />
            <span style={{
              fontSize: 40, fontWeight: 800, color: '#191F28',
              letterSpacing: '-0.04em', lineHeight: 1,
            }}>{credits}</span>
          </div>
        </div>

        {/* 충전 내역 — 묶음별 남은 수량·만료일. 만료 임박한 것부터 먼저 사용된다. */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: '#191F28', marginBottom: 9 }}>충전 내역</div>
          {lots === null ? (
            <div style={{ fontSize: 12.5, color: '#B0B8C1', padding: '10px 0' }}>불러오는 중…</div>
          ) : lots.length === 0 && unlinked === 0 ? (
            <div style={{ fontSize: 12.5, color: '#B0B8C1', padding: '10px 0' }}>사용 가능한 크레딧이 없어요.</div>
          ) : (
            <div style={{ display: 'grid', gap: 8 }}>
              {lots.map((lot, i) => {
                const d = daysLeft(lot.expiresAt);
                const urgent = d !== null && d <= 3;
                return (
                  <div key={i} style={{
                    border: '1px solid #ECECF2', borderRadius: 10, padding: '11px 13px',
                    background: urgent ? '#FFFBEB' : '#FAFAFC',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#191F28' }}>
                        {kindLabel(lot.kind, lot.planId)}
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#6D4CFF' }}>
                        {lot.remaining}개 남음
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 5 }}>
                      <span style={{ fontSize: 11.5, color: '#8B95A1' }}>
                        {fmtDate(lot.chargedAt)} 충전 · 총 {lot.amount}개
                      </span>
                      <span style={{ fontSize: 11.5, fontWeight: 600, color: urgent ? '#B45309' : '#8B95A1' }}>
                        {d === null ? '무기한' : `${fmtDate(lot.expiresAt)}까지 (D-${Math.max(0, d)})`}
                      </span>
                    </div>
                  </div>
                );
              })}
              {unlinked > 0 && (
                <div style={{ border: '1px solid #ECECF2', borderRadius: 10, padding: '11px 13px', background: '#FAFAFC' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#191F28' }}>기존 크레딧</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#6D4CFF' }}>{unlinked}개 남음</span>
                  </div>
                  <div style={{ fontSize: 11.5, color: '#8B95A1', marginTop: 5 }}>유효기간 없음 · 만료되지 않아요</div>
                </div>
              )}
            </div>
          )}
          <div style={{ fontSize: 11.5, color: '#B0B8C1', marginTop: 8, lineHeight: 1.6 }}>
            유효기간이 짧은 크레딧부터 먼저 사용돼요 · 상세페이지는 섹션 1개당 1크레딧
          </div>
        </div>

        {/* 사용 내역 — 어디에 얼마가 나갔는지. 스크롤 박스(최근 40건) */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: '#191F28', marginBottom: 9 }}>사용 내역</div>
          {ledger === null ? (
            <div style={{ fontSize: 12.5, color: '#B0B8C1', padding: '10px 0' }}>불러오는 중…</div>
          ) : ledger.length === 0 ? (
            <div style={{ fontSize: 12.5, color: '#B0B8C1', padding: '10px 0' }}>아직 사용 내역이 없어요.</div>
          ) : (
            <div style={{ border: '1px solid #ECECF2', borderRadius: 10, maxHeight: 210, overflowY: 'auto' }}>
              {ledger.map((it, i) => {
                const minus = it.amount < 0;
                const d = new Date(it.at);
                const when = `${d.getMonth() + 1}.${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
                return (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 13px',
                    borderTop: i ? '1px solid #F4F4F8' : 'none',
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 600, color: '#191F28' }}>{reasonLabel(String(it.type), it.reason)}</div>
                      <div style={{ fontSize: 11, color: '#B0B8C1', marginTop: 2 }}>{when}</div>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 800, color: minus ? '#DC2626' : '#16A34A', flexShrink: 0 }}>
                      {minus ? '' : '+'}{it.amount}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {isLow && (
          <div style={{
            background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 10,
            padding: '11px 14px', marginBottom: 16,
            fontSize: 12.5, color: '#92400E', lineHeight: 1.6,
          }}>
            페이지 1개를 만들기에 크레딧이 부족해요. 충전하면 바로 이어서 만들 수 있어요.
          </div>
        )}

        {/* 충전 — 새 탭으로 요금제 열기(생성 중 작업 끊김 방지) */}
        <a
          href="/pricing"
          target="_blank"
          rel="noopener noreferrer"
          onClick={close}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            background: '#6D4CFF', color: '#fff', textDecoration: 'none',
            borderRadius: 12, padding: '15px 0',
            fontSize: 15, fontWeight: 700, letterSpacing: '-0.01em',
          }}
        >
          충전하기
          <ArrowUpRight size={17} strokeWidth={2.4} />
        </a>

        {PROMO.active && (
          <div style={{ textAlign: 'center', fontSize: 12, color: '#6D4CFF', fontWeight: 600, marginTop: 11 }}>
            {PROMO.label} 진행 중 · {PROMO.changesOn}부터 정가 적용
          </div>
        )}
      </div>
    </div>
  );
}
