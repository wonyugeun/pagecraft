'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useApp, ReferenceAnalysis, CaptureAnalysis, CaptureSection, CH_OUT_AUTO } from '@/store/AppContext';
import { inferOutFromSections } from '@/lib/outputType';
import { ArrowLeft, ArrowRight, Link2, Image as ImageIcon, Sparkles } from 'lucide-react';
import ReferenceMobile from './ReferenceMobile';
import { useIsMobile } from '@/hooks/useIsMobile';

type Tab = 'url' | 'capture';
type CaptureStage = 'idle' | 'stitching' | 'stage1' | 'stage2' | 'done' | 'error';

interface FileEntry { id: string; dataUrl: string }

/* ─── 공통 ─── */
export function ErrorBox({ msg }: { msg: string }) {
  return (
    <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: 8, padding: '12px 14px', fontSize: 13, color: '#be123c', lineHeight: 1.6 }}>
      ⚠️ {msg}
    </div>
  );
}
function AnalyzeBtn({ loading, disabled, onClick, label = '🔍 분석하기' }: { loading: boolean; disabled: boolean; onClick: () => void; label?: string }) {
  return (
    <button className="ref-analyze" onClick={onClick} disabled={loading || disabled} style={{ whiteSpace: 'nowrap', flexShrink: 0 }}>
      {loading
        ? <><span style={{ display: 'inline-block', width: 12, height: 12, border: '2px solid #c4b5fd', borderTopColor: '#6D4CFF', borderRadius: '50%', animation: 'spin 0.7s linear infinite', marginRight: 6, verticalAlign: 'middle' }} />분석 중...</>
        : label}
    </button>
  );
}

/* ─── URL / 텍스트 탭 공통 분석 결과 ─── */
export function AnalysisResult({ result, onReset }: { result: ReferenceAnalysis; onReset: () => void }) {
  return (
    <div className="ref-result" style={{ margin: '4px 0 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div className="ref-ok">✅ 구조 분석 완료 — 이 스타일로 참고해서 생성할게요</div>
        <button onClick={onReset} style={{ fontSize: 11, color: 'var(--tx3)', background: 'transparent', border: '1px solid var(--bd)', borderRadius: 6, padding: '3px 8px', cursor: 'pointer', fontFamily: 'var(--f)', flexShrink: 0 }}>초기화</button>
      </div>
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--tx3)', marginBottom: 6, letterSpacing: '0.05em' }}>섹션 구조</div>
        <div className="ref-sps">{result.sections.map((s, i) => <span key={i} className="ref-sp">{s}</span>)}</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
        <div className="ref-tone"><b>카피 톤:</b> {result.tone}</div>
        <div className="ref-tone"><b>헤드라인 패턴:</b> {result.headlinePattern}</div>
      </div>
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--tx3)', marginBottom: 6, letterSpacing: '0.05em' }}>주요 강조 포인트</div>
        <ul style={{ margin: 0, paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {result.emphasisPoints.map((p, i) => <li key={i} style={{ fontSize: 12, color: 'var(--tx2)', lineHeight: 1.6 }}>{p}</li>)}
        </ul>
      </div>
      <div style={{ background: 'var(--pl)', borderRadius: 6, padding: '8px 12px', fontSize: 12, color: 'var(--pu)', fontWeight: 600 }}>💡 {result.summary}</div>
      <div style={{ marginTop: 10, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 6, padding: '8px 12px', fontSize: 12, color: '#166534', fontWeight: 600 }}>
        📐 참고 페이지 구조가 반영됐어요. 다음 단계에서 수정할 수 있어요.
      </div>
    </div>
  );
}

/* ─── 캡처 가이드 모달 ─── */
function CaptureGuideModal({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: 16, padding: '28px 24px', maxWidth: 420, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', position: 'relative' }}
        onClick={e => e.stopPropagation()}>
        <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--tx3)', lineHeight: 1 }}>×</button>
        <div style={{ fontSize: 22, marginBottom: 8 }}>📸</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--tx1)', marginBottom: 4 }}>상세페이지 캡처하는 법</div>
        <div style={{ fontSize: 12, color: 'var(--tx3)', marginBottom: 20 }}>어떤 방법이든 OK — 여러 장도 괜찮아요!</div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ background: '#f8fafc', borderRadius: 10, padding: '14px 16px' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--pu)', marginBottom: 8 }}>💻 PC에서 (전체 스크롤 캡처 — 추천)</div>
            <div style={{ fontSize: 12, color: 'var(--tx2)', lineHeight: 1.8 }}>
              <b>GoFullPage</b> (크롬 확장) 설치 후<br />
              상세페이지에서 아이콘 클릭 → 자동으로 전체 캡처<br />
              <a
                href="https://chromewebstore.google.com/detail/gofullpage-full-page-scre/fdpohaocaechififmbbbbbknoalclacl"
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: 'inline-block', marginTop: 8, padding: '6px 12px', background: '#6D4CFF', color: '#fff', borderRadius: 6, fontSize: 11, fontWeight: 700, textDecoration: 'none' }}
              >
                GoFullPage 설치하기 →
              </a>
            </div>
          </div>

          <div style={{ background: '#f8fafc', borderRadius: 10, padding: '14px 16px' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#0891b2', marginBottom: 8 }}>📱 모바일에서 (스크롤 캡처)</div>
            <div style={{ fontSize: 12, color: 'var(--tx2)', lineHeight: 1.8 }}>
              <b>iPhone:</b> 스크린샷 후 좌하단 미리보기 탭 → "전체 페이지"<br />
              <b>Android:</b> 캡처 후 "스크롤 캡처" 버튼 (기종마다 다를 수 있어요)
            </div>
          </div>

          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '14px 16px' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#166534', marginBottom: 6 }}>✅ 일반 스크린샷 여러 장도 완전 OK!</div>
            <div style={{ fontSize: 12, color: '#166534', lineHeight: 1.8 }}>
              전체 캡처가 어려우면 상단부터 내리면서<br />
              여러 장으로 나눠 찍어 올리세요.<br />
              <b>AI가 자동으로 이어 붙여서 분석해요.</b>
            </div>
          </div>

          <div style={{ fontSize: 11, color: 'var(--tx3)', lineHeight: 1.7, padding: '0 2px' }}>
            💡 <b>팁:</b> 광고 배너나 추천상품 영역은 빼고 상세페이지 본문만 캡처하면 더 정확해요.
            정확하지 않아도 AI가 알아서 걸러내니 걱정 마세요.
          </div>
        </div>

        <button
          onClick={onClose}
          style={{ marginTop: 20, width: '100%', padding: '11px 0', background: 'var(--pu)', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--f)' }}
        >
          알겠어요!
        </button>
      </div>
    </div>
  );
}

/* ─── 섹션 크롭 미리보기 ─── */
function SectionCrop({ src, yStart, yEnd, onClick }: { src: string; yStart: number; yEnd: number; onClick?: () => void }) {
  const yCenter = (yStart + yEnd) / 2;
  return (
    <div
      onClick={onClick}
      title={onClick ? '클릭하면 분석 구간을 크게 볼 수 있어요' : undefined}
      style={{ width: 88, height: 60, overflow: 'hidden', borderRadius: 6, flexShrink: 0, border: '1px solid #e2e8f0', background: '#f8fafc', cursor: onClick ? 'zoom-in' : 'default', position: 'relative' }}
    >
      <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: `50% ${yCenter}%` }} />
      {onClick && (
        <span style={{ position: 'absolute', right: 3, bottom: 3, background: 'rgba(0,0,0,0.55)', color: '#fff', fontSize: 9, borderRadius: 4, padding: '1px 4px' }}>🔍</span>
      )}
    </div>
  );
}

/* ─── 분석 구간 확대 모달(2026-07-22) — 전체 스티치 이미지 위에 해당 섹션의 y구간을 하이라이트.
   "AI가 정확히 어디를 잘라 분석했는지" 셀러가 직접 검증할 수 있게. ─── */
function CropZoomModal({ src, section, onClose }: { src: string; section: CaptureSection; onClose: () => void }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const bandRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 열리자마자 하이라이트 구간으로 스크롤
    const t = setTimeout(() => bandRef.current?.scrollIntoView({ block: 'center' }), 60);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(17,17,17,0.72)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: '#fff', borderRadius: 16, width: 'min(680px, 94vw)', maxHeight: '88vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid #F0F0F5', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            <span style={{ fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: '#EDE9FE', color: '#6D4CFF', flexShrink: 0 }}>
              {section.순서}. {section.타입}
            </span>
            <span style={{ fontSize: 12.5, color: '#6B7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {section.핵심메시지}
            </span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 18, color: '#9CA3AF', cursor: 'pointer', fontFamily: 'var(--f)', padding: 4, flexShrink: 0 }}>✕</button>
        </div>
        <div ref={scrollRef} style={{ overflowY: 'auto', flex: 1, background: '#F7F6FB' }}>
          <div style={{ position: 'relative' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt="분석한 페이지 전체" style={{ width: '100%', display: 'block' }} />
            {/* 분석 구간 하이라이트 밴드 */}
            <div
              ref={bandRef}
              style={{
                position: 'absolute', left: 0, right: 0,
                top: `${section.y시작}%`, height: `${Math.max(section.y끝 - section.y시작, 1)}%`,
                border: '3px solid #6D4CFF', background: 'rgba(109,76,255,0.10)',
                boxSizing: 'border-box',
              }}
            />
            {/* 구간 밖 딤 처리 */}
            <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: `${section.y시작}%`, background: 'rgba(17,17,17,0.35)' }} />
            <div style={{ position: 'absolute', left: 0, right: 0, top: `${section.y끝}%`, bottom: 0, background: 'rgba(17,17,17,0.35)' }} />
          </div>
        </div>
        <div style={{ padding: '10px 18px', fontSize: 11.5, color: '#9CA3AF', borderTop: '1px solid #F0F0F5', flexShrink: 0 }}>
          보라색 구간이 이 섹션으로 인식된 영역이에요. 위치는 AI 추정이라 몇 % 오차가 있을 수 있고, 실제 생성은 섹션 순서·타입·톤만 사용해요.
        </div>
      </div>
    </div>
  );
}

/* ─── 섹션 타입 배지 색상 ─── */
const TYPE_COLOR: Record<string, { bg: string; color: string }> = {
  히어로:     { bg: '#ede9fe', color: '#6D4CFF' },
  공감:       { bg: '#dbeafe', color: '#1d4ed8' },
  USP:        { bg: '#d1fae5', color: '#065f46' },
  사용법:     { bg: '#fef3c7', color: '#92400e' },
  비교표:     { bg: '#fee2e2', color: '#991b1b' },
  후기:       { bg: '#e0f2fe', color: '#0369a1' },
  FAQ:        { bg: '#f3f4f6', color: '#374151' },
  CTA:        { bg: '#fdf4ff', color: '#86198f' },
  성분신뢰:   { bg: '#ecfdf5', color: '#14532d' },
  브랜드스토리:{ bg: '#fff7ed', color: '#c2410c' },
  배송포장:   { bg: '#f0f9ff', color: '#0c4a6e' },
  AS환불:     { bg: '#fafafa', color: '#525252' },
  인증특허:   { bg: '#f0fdf4', color: '#166534' },
  제조공정:   { bg: '#f5f3ff', color: '#5b21b6' },
  선물포장:   { bg: '#fff0f6', color: '#9d174d' },
};

/* ─── 캡처 분석 결과 뷰 ─── */
function CaptureResultView({
  result,
  stitchedImage,
  onReset,
  onUse,
}: {
  result: CaptureAnalysis;
  stitchedImage: string | null;
  onReset: () => void;
  onUse: () => void;
}) {
  const [zoomSec, setZoomSec] = useState<CaptureSection | null>(null);   // 분석 구간 확대 모달
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#065f46' }}>
            ✅ 분석 완료 — {result.총섹션수}개 섹션 추출
          </div>
          <div style={{ fontSize: 12, color: 'var(--tx3)', marginTop: 2 }}>
            전체 톤: <b>{result.전체톤}</b> · 브랜드 무드: <b>{result.브랜드무드}</b>
          </div>
        </div>
        <button onClick={onReset} style={{ fontSize: 11, color: 'var(--tx3)', background: 'transparent', border: '1px solid var(--bd)', borderRadius: 6, padding: '3px 8px', cursor: 'pointer', fontFamily: 'var(--f)', flexShrink: 0 }}>
          {stitchedImage ? '다시 업로드' : '다시 분석'}
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
        {result.섹션목록.map((sec: CaptureSection) => {
          const color = TYPE_COLOR[sec.타입] ?? { bg: '#f3f4f6', color: '#374151' };
          return (
            <div key={sec.순서} style={{ background: '#fff', border: '1px solid var(--bd)', borderRadius: 10, padding: '10px 12px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              {stitchedImage && <SectionCrop src={stitchedImage} yStart={sec.y시작} yEnd={sec.y끝} onClick={() => setZoomSec(sec)} />}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--tx3)' }}>{sec.순서}.</span>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: color.bg, color: color.color }}>
                    {sec.타입}
                  </span>
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--tx1)', marginBottom: 5, lineHeight: 1.4 }}>{sec.핵심메시지}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  <span style={{ fontSize: 10, background: '#f1f5f9', color: '#475569', borderRadius: 4, padding: '2px 6px' }}>{sec.카피톤}</span>
                  <span style={{ fontSize: 10, background: '#f1f5f9', color: '#475569', borderRadius: 4, padding: '2px 6px' }}>{sec.이미지무드}</span>
                  {sec.강조포인트 && (
                    <span style={{ fontSize: 10, background: 'var(--pl)', color: 'var(--pu)', borderRadius: 4, padding: '2px 6px', fontWeight: 600 }}>
                      {sec.강조포인트}
                    </span>
                  )}
                </div>
                {sec.톤매너노트 && (
                  <div style={{ fontSize: 11, color: 'var(--tx3)', marginTop: 4, lineHeight: 1.5, fontStyle: 'italic' }}>
                    💬 {sec.톤매너노트}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ marginBottom: 12, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#166534', fontWeight: 600 }}>
        📐 참고 페이지 구조가 반영됐어요. 섹션 구성은 &lsquo;섹션 구조&rsquo; 단계에서 수정할 수 있어요.
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={onReset}
          style={{ flex: 1, padding: '13px 0', background: '#fff', color: 'var(--tx2)', border: '1.5px solid var(--bd)', borderRadius: 10, fontSize: 13.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--f)' }}
        >
          🔄 다른 페이지 분석하기
        </button>
        <button
          onClick={onUse}
          style={{ flex: 1.6, padding: '13px 0', background: 'var(--pu)', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--f)' }}
        >
          ✨ 이 구조로 진행하기 →
        </button>
      </div>
      {result.총섹션수 <= 2 && (
        <div style={{ marginTop: 10, fontSize: 12, color: '#b45309', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '8px 12px', lineHeight: 1.6 }}>
          💡 {result.총섹션수}개 섹션만 추출됐어요. 다음 단계에서 직접 섹션을 추가할 수 있어요.
        </div>
      )}
      {zoomSec && stitchedImage && (
        <CropZoomModal src={stitchedImage} section={zoomSec} onClose={() => setZoomSec(null)} />
      )}
    </div>
  );
}

/* ─── 분석 진행 중 표시 ─── */
function CaptureProgress({ stage, chunkLabel }: { stage: CaptureStage; chunkLabel?: string }) {
  const steps: { key: CaptureStage; icon: string; label: string }[] = [
    { key: 'stitching', icon: '🖼️', label: '이미지 합치는 중...' },
    { key: 'stage1',    icon: '📸', label: chunkLabel ?? '1단계: 본문 영역 찾는 중...' },
    { key: 'stage2',    icon: '🔍', label: '2단계: 섹션별 디테일 분석 중...' },
  ];
  const activeIdx = steps.findIndex(s => s.key === stage);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 0 24px', gap: 20 }}>
      <div style={{ width: 48, height: 48, borderRadius: '50%', border: '3px solid #e9d5ff', borderTopColor: '#6D4CFF', animation: 'spin 0.8s linear infinite' }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', maxWidth: 280 }}>
        {steps.map((s, i) => {
          const isDone = i < activeIdx;
          const isActive = i === activeIdx;
          return (
            <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 10, opacity: isDone || isActive ? 1 : 0.35 }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                background: isDone ? '#d1fae5' : isActive ? '#ede9fe' : '#f3f4f6',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
                border: isActive ? '2px solid #6D4CFF' : 'none',
              }}>
                {isDone ? '✓' : s.icon}
              </div>
              <span style={{ fontSize: 13, fontWeight: isActive ? 700 : 400, color: isActive ? 'var(--pu)' : isDone ? '#065f46' : 'var(--tx3)' }}>
                {s.label}
              </span>
            </div>
          );
        })}
      </div>
      <div style={{ fontSize: 12, color: 'var(--tx3)', lineHeight: 1.6, textAlign: 'center' }}>
        AI가 상세페이지를 분석하고 있어요<br />
        보통 30~60초 소요돼요
      </div>
    </div>
  );
}

/* ─── 이미지 스티칭 (Canvas) ─── */
async function stitchImages(dataUrls: string[]): Promise<string> {
  const MAX_W = 1200;
  const QUALITY = 0.85;

  const imgs = await Promise.all(
    dataUrls.map(url => new Promise<HTMLImageElement>((res, rej) => {
      const img = new Image();
      img.onload = () => res(img);
      img.onerror = rej;
      img.src = url;
    }))
  );

  const scaled = imgs.map(img => {
    const scale = img.naturalWidth > MAX_W ? MAX_W / img.naturalWidth : 1;
    return { img, w: Math.round(img.naturalWidth * scale), h: Math.round(img.naturalHeight * scale) };
  });

  const totalW = Math.max(...scaled.map(s => s.w), 1);
  const totalH = scaled.reduce((sum, s) => sum + s.h, 0);

  const canvas = document.createElement('canvas');
  canvas.width = totalW;
  canvas.height = totalH;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, totalW, totalH);

  let y = 0;
  for (const { img, w, h } of scaled) {
    ctx.drawImage(img, 0, y, w, h);
    y += h;
  }

  const result = canvas.toDataURL('image/jpeg', QUALITY);
  console.log(`[stitchImages] output: ${totalW}×${totalH}px, base64 size ~${Math.round(result.length * 3/4/1024)} KB`);
  return result;
}

/* ─── 이미지 분할 ─── */
/* ─── 분석용 이미지 준비(2026-07-22) — "이어붙여 자르기"에서 "원본 그대로 멀티 이미지 1회 호출"로 전환.
   구 방식은 조각별 독립 분석이라 페이지 전체 맥락이 끊기고, 세로로 긴 조각이 비전 모델 내부 축소(최대 2048px)에서
   뭉개져 인식이 저조했음. 새 방식: 업로드 원본을 (필요 시에만) 읽기 좋은 크기로 나눠 전부 한 호출에 넣는다.
   - 각 조각은 폭 ≤900px(비전 내부 해상도에 충분) · 높이 ≤2400px(축소 후에도 텍스트 가독)
   - startPct/heightPct = 스티치 합성 이미지(크롭 표시 기준) 좌표계에서 이 조각이 차지하는 구간 */
interface ImageChunk { dataUrl: string; startPct: number; heightPct: number }

const STITCH_MAX_W = 1200;     // stitchImages와 동일해야 크롭 좌표가 맞음
const ANALYSIS_MAX_W = 900;
const PIECE_MAX_H = 2400;
const MAX_PIECES = 12;         // 페이로드·토큰 상한 (서버도 14장 캡)

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = dataUrl;
  });
}

async function prepareAnalysisImages(dataUrls: string[]): Promise<ImageChunk[]> {
  const imgs = await Promise.all(dataUrls.map(loadImage));

  // 스티치 좌표계(크롭 표시 기준)에서 각 원본이 차지하는 높이
  const stitchedHeights = imgs.map(img => img.naturalHeight * Math.min(1, STITCH_MAX_W / img.naturalWidth));
  const totalStitchedH = stitchedHeights.reduce((a, b) => a + b, 0);

  // 조각 높이: 총 조각 수가 MAX_PIECES를 넘지 않게 필요 시 상향
  const analysisHeights = imgs.map(img => img.naturalHeight * Math.min(1, ANALYSIS_MAX_W / img.naturalWidth));
  const totalAnalysisH = analysisHeights.reduce((a, b) => a + b, 0);
  const pieceMaxH = Math.max(PIECE_MAX_H, Math.ceil(totalAnalysisH / MAX_PIECES));

  const pieces: ImageChunk[] = [];
  let cumStitched = 0;
  imgs.forEach((img, idx) => {
    const aScale = Math.min(1, ANALYSIS_MAX_W / img.naturalWidth);
    const aW = Math.round(img.naturalWidth * aScale);
    const aH = Math.round(img.naturalHeight * aScale);
    const nPieces = Math.max(1, Math.ceil(aH / pieceMaxH));
    const pH = Math.ceil(aH / nPieces);
    for (let p = 0; p < nPieces; p++) {
      const y0 = p * pH;
      const h = Math.min(pH, aH - y0);
      if (h <= 0) continue;
      const cv = document.createElement('canvas');
      cv.width = aW; cv.height = h;
      cv.getContext('2d')!.drawImage(img, 0, y0 / aScale, img.naturalWidth, h / aScale, 0, 0, aW, h);
      const fracStart = y0 / aH;
      const fracEnd = (y0 + h) / aH;
      pieces.push({
        dataUrl: cv.toDataURL('image/jpeg', 0.8),
        startPct: ((cumStitched + fracStart * stitchedHeights[idx]) / totalStitchedH) * 100,
        heightPct: (((fracEnd - fracStart) * stitchedHeights[idx]) / totalStitchedH) * 100,
      });
    }
    cumStitched += stitchedHeights[idx];
  });

  console.log(`[prepareAnalysisImages] 원본 ${imgs.length}장 → 분석 이미지 ${pieces.length}장 (piece ≤${pieceMaxH}px)`);
  return pieces;
}

/* ─── 청크 경계 부근 중복 섹션 제거 ───
   ★개선(2026-07-22): 겹침(overlap) 청크에서 같은 섹션이 "경계 반토막 + 온전한 것"으로 두 번 나오면
   IoU만으로는 못 잡는다(작은 조각/큰 섹션 = IoU 낮음). 작은 쪽 기준 겹침 비율로 판정하고, 더 큰(온전한) 쪽을 남긴다. */
function deduplicateSections(sections: Array<Record<string, unknown>>): Array<Record<string, unknown>> {
  const out: Array<Record<string, unknown>> = [];
  for (const sec of sections) {
    const yS = sec['y시작'] as number;
    const yE = sec['y끝'] as number;
    const height = Math.max(yE - yS, 0.001);
    const dupIdx = out.findIndex(ex => {
      const eS = ex['y시작'] as number;
      const eE = ex['y끝'] as number;
      const exHeight = Math.max(eE - eS, 0.001);
      const inter = Math.max(0, Math.min(yE, eE) - Math.max(yS, eS));
      const union = Math.max(yE, eE) - Math.min(yS, eS);
      const iou = union > 0 ? inter / union : 0;
      const smallOverlap = inter / Math.min(height, exHeight);   // 작은 쪽이 얼마나 덮이나
      return iou > 0.4 || smallOverlap > 0.6;
    });
    if (dupIdx === -1) {
      out.push(sec);
    } else {
      const ex = out[dupIdx];
      const exHeight = (ex['y끝'] as number) - (ex['y시작'] as number);
      if (height > exHeight) out[dupIdx] = sec;   // 더 온전한(큰) 섹션으로 교체
    }
  }
  return out;
}

/* ─── 캡처 탭 ─── */
// ★분석 이미지 세션 캐시(2026-07-22) — 화면 이탈(언마운트) 후 복귀해도 결과 뷰의 섹션 크롭 이미지 유지.
//   컨텍스트 persist(sessionStorage)에 안 넣는 이유: base64 수 MB라 쿼터를 깨뜨림. 새로고침 시엔 소실(허용).
let stitchedImageCache: string | null = null;

export function CaptureTab({ onDone }: { onDone: (analysis: CaptureAnalysis, stitchedImage: string) => void }) {
  const { setCaptureAnalysis, setReferenceAnalysis, goAfterReference, captureAnalysis: ctxCaptureAnalysis } = useApp();
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [stage, setStage] = useState<CaptureStage>(ctxCaptureAnalysis ? 'done' : 'idle');
  const [stitchedImage, setStitchedImage] = useState<string | null>(ctxCaptureAnalysis ? stitchedImageCache : null);
  const [captureResult, setCaptureResult] = useState<CaptureAnalysis | null>(ctxCaptureAnalysis);
  const [captureError, setCaptureError] = useState('');
  const [chunkProgress, setChunkProgress] = useState<{ current: number; total: number } | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  useEffect(() => () => { abortRef.current?.abort(); }, []);

  const addFiles = useCallback((newFiles: File[]) => {
    const readers = newFiles.slice(0, 10 - files.length).map(file => {
      return new Promise<FileEntry>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve({ id: `${Date.now()}_${Math.random()}`, dataUrl: reader.result as string });
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    });
    Promise.all(readers).then(entries => setFiles(prev => [...prev, ...entries].slice(0, 10)));
  }, [files.length]);

  const removeFile = (id: string) => setFiles(f => f.filter(x => x.id !== id));

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const dropped = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    if (dropped.length) addFiles(dropped);
  };

  const handleThumbDragStart = (i: number) => setDraggingIdx(i);
  const handleThumbDragOver = (e: React.DragEvent, i: number) => { e.preventDefault(); setDragOverIdx(i); };
  const handleThumbDrop = (e: React.DragEvent, targetIdx: number) => {
    e.preventDefault();
    if (draggingIdx === null || draggingIdx === targetIdx) { setDraggingIdx(null); setDragOverIdx(null); return; }
    setFiles(prev => {
      const next = [...prev];
      const [item] = next.splice(draggingIdx, 1);
      next.splice(targetIdx, 0, item);
      return next;
    });
    setDraggingIdx(null);
    setDragOverIdx(null);
  };

  const analyze = async () => {
    if (!files.length) return;
    setCaptureError('');
    setChunkProgress(null);
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    let timedOut = false;

    try {
      setStage('stitching');
      const stitched = await stitchImages(files.map(f => f.dataUrl));
      if (ctrl.signal.aborted) return;
      setStitchedImage(stitched);
      stitchedImageCache = stitched;   // ★복귀 시 결과 뷰 이미지 유지

      // ★멀티 이미지 단일 호출(2026-07-22) — 원본들을 한 호출에 전부 넣어 전체 맥락으로 분석.
      //   모델은 섹션 위치를 (시작이미지·y시작, 끝이미지·y끝)으로 주고, 여기서 스티치 좌표계 %로 환산.
      const pieces = await prepareAnalysisImages(files.map(f => f.dataUrl));
      if (ctrl.signal.aborted) return;

      setStage('stage1');
      setChunkProgress(null);

      const tid = setTimeout(() => { timedOut = true; ctrl.abort(); }, 130_000);
      const res1 = await fetch('/api/analyze-reference-capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step: 1, images: pieces.map(p => p.dataUrl.split(',')[1]) }),
        signal: ctrl.signal,
      });
      clearTimeout(tid);
      if (!res1.ok) {
        const d = await res1.json().catch(() => ({})) as { error?: string };
        throw new Error(d.error ?? `분석 실패 (${res1.status})`);
      }
      const { stage1 } = await res1.json() as { stage1: { 섹션목록?: Array<Record<string, unknown>> } };
      const rawSecs = stage1?.섹션목록 ?? [];
      if (ctrl.signal.aborted) return;

      const clampIdx = (n: number) => Math.min(Math.max(n, 0), pieces.length - 1);
      const allSections = rawSecs.map(sec => {
        const si = clampIdx(Number(sec['시작이미지'] ?? 1) - 1);
        const ei = clampIdx(Math.max(Number(sec['끝이미지'] ?? sec['시작이미지'] ?? 1) - 1, si));
        const yS = Number(sec['y시작'] ?? 0);
        const yE = Number(sec['y끝'] ?? 100);
        const absStart = Math.round(pieces[si].startPct + (yS / 100) * pieces[si].heightPct);
        const absEnd = Math.round(pieces[ei].startPct + (yE / 100) * pieces[ei].heightPct);
        return {
          ...sec,
          y시작: absStart,
          y끝: Math.max(absEnd, absStart + 1),
        };
      });

      const deduped = deduplicateSections(allSections);
      deduped.sort((a, b) => (a['y시작'] as number) - (b['y시작'] as number));   // 겹침 dedup 교체로 흐트러질 수 있는 순서 보정
      deduped.forEach((s, i) => { s['순서'] = i + 1; });
      const mergedStage1 = { 총섹션수: deduped.length, 섹션목록: deduped };

      setStage('stage2');
      // ★2단계도 1단계와 같은 조각(pieces)을 그대로 전달(2026-07-22) — 통이미지 1장은 세로가
      //   Claude 한계(변당 8000px)를 넘어 400 → 조용한 기본값 폴백(전체톤 '직설' 등 고정값)이 나오던 버그.
      const tid2 = setTimeout(() => { timedOut = true; ctrl.abort(); }, 120_000);
      const res2 = await fetch('/api/analyze-reference-capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step: 2, images: pieces.map(p => p.dataUrl.split(',')[1]), stage1: mergedStage1 }),
        signal: ctrl.signal,
      });
      clearTimeout(tid2);
      if (!res2.ok) {
        const d = await res2.json().catch(() => ({})) as { error?: string };
        throw new Error(d.error ?? `디테일 분석 실패 (${res2.status})`);
      }
      const { analysis } = await res2.json() as { analysis: CaptureAnalysis };

      setCaptureResult(analysis);
      setCaptureAnalysis(analysis);
      setReferenceAnalysis(null);
      setStage('done');
    } catch (err) {
      if (ctrl.signal.aborted) {
        if (timedOut) {
          setCaptureError('분석 시간이 초과됐어요. 이미지 장수를 줄이거나 다시 시도해주세요.');
          setStage('error');
        }
        return;
      }
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[CaptureTab]', msg);
      setCaptureError(msg);
      setStage('error');
    }
  };

  const reset = () => {
    abortRef.current?.abort();
    setFiles([]);
    setStitchedImage(null);
    stitchedImageCache = null;
    setCaptureResult(null);
    setCaptureError('');
    setStage('idle');
    setCaptureAnalysis(null);
  };

  // ★새 흐름(2026-07-22): s5b 직행 제거 — 래퍼런스형은 분석 후 출력형태/상품정보 순서대로 진행.
  const handleUse = () => {
    if (captureResult && stitchedImage) onDone(captureResult, stitchedImage);
    else if (captureResult) setCaptureAnalysis(captureResult);
    goAfterReference();
  };

  if (stage === 'stitching' || stage === 'stage1' || stage === 'stage2') {
    const chunkLabel = stage === 'stage1' && chunkProgress && chunkProgress.total > 1
      ? `1단계: 본문 영역 찾는 중... (${chunkProgress.current}/${chunkProgress.total})`
      : undefined;
    return <CaptureProgress stage={stage} chunkLabel={chunkLabel} />;
  }

  if (stage === 'done' && captureResult) {
    return <CaptureResultView result={captureResult} stitchedImage={stitchedImage} onReset={reset} onUse={handleUse} />;
  }

  return (
    <div>
      <div style={{ background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#5b21b6', lineHeight: 1.7, marginBottom: 14 }}>
        💡 와디즈·스마트스토어·쿠팡 등 상세페이지를 캡처해서 올려주세요.<br />
        <b>한 장의 긴 캡처도 OK, 여러 장으로 나눠 찍은 것도 OK</b> — AI가 자동으로 이어 붙여요.
        <button
          onClick={() => setShowGuide(true)}
          style={{ marginLeft: 8, fontSize: 11, fontWeight: 700, color: 'var(--pu)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--f)', textDecoration: 'underline', padding: 0 }}
        >
          자세히 보기 →
        </button>
      </div>

      {files.length === 0 && (
        <div style={{ background: '#F4F0FF', border: '1px solid #DDD6FE', borderRadius: 16, padding: '18px 18px', marginBottom: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#4C1D95', marginBottom: 12 }}>💻 PC에서 전체 화면 캡처하는 법</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
            {([
              '크롬 브라우저에서 GoFullPage 확장 설치 (무료)',
              '상세페이지 열고 확장 아이콘 클릭 (또는 Alt+Shift+P)',
              '자동으로 전체 페이지 캡처 → 이미지 저장',
              '저장한 이미지를 아래에 업로드',
            ] as string[]).map((step, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#6D4CFF', color: '#fff', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>{i + 1}</div>
                <span style={{ fontSize: 12.5, color: '#4C1D95', lineHeight: 1.6 }}>{step}</span>
              </div>
            ))}
          </div>
          <a
            href="https://chromewebstore.google.com/detail/gofullpage-full-page-scre/fdpohaocaechififmbbbbbknoalclacl"
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 16px', background: '#6D4CFF', color: '#fff', borderRadius: 8, fontSize: 13, fontWeight: 700, textDecoration: 'none' }}
          >
            GoFullPage 설치하기 →
          </a>
          <div style={{ marginTop: 10, fontSize: 11.5, color: '#5b21b6', lineHeight: 1.6 }}>
            긴 페이지는 여러 장으로 나눠 올려도 AI가 자동으로 이어붙여요.<br />
            휴대폰은 스크롤 캡처 기능으로 찍어 올려주세요.
          </div>
        </div>
      )}

      {files.length === 0 && (
        <div
          ref={dropZoneRef}
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
          onClick={() => fileInputRef.current?.click()}
          style={{ border: '2px dashed var(--bd)', borderRadius: 12, padding: '36px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, cursor: 'pointer', background: '#fafafa', transition: 'border-color .15s' }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--pu)')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--bd)')}
        >
          <div style={{ fontSize: 36 }}>📸</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx1)' }}>이미지를 올려주세요</div>
          <div style={{ fontSize: 12, color: 'var(--tx3)', textAlign: 'center', lineHeight: 1.6 }}>
            클릭하거나 드래그&드롭<br />
            최대 10장 · JPG, PNG, WebP
          </div>
        </div>
      )}

      {files.length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--tx3)', marginBottom: 8 }}>
            {files.length}장 업로드됨 — 드래그로 순서 변경 가능
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 }}>
            {files.map((f, i) => (
              <div
                key={f.id}
                draggable
                onDragStart={() => handleThumbDragStart(i)}
                onDragOver={e => handleThumbDragOver(e, i)}
                onDrop={e => handleThumbDrop(e, i)}
                onDragEnd={() => { setDraggingIdx(null); setDragOverIdx(null); }}
                style={{
                  position: 'relative', borderRadius: 8, overflow: 'hidden',
                  aspectRatio: '3/4', cursor: 'grab',
                  border: dragOverIdx === i ? '2px solid var(--pu)' : '2px solid transparent',
                  opacity: draggingIdx === i ? 0.5 : 1,
                  transition: 'opacity .15s, border-color .1s',
                }}
              >
                <img src={f.dataUrl} alt={`캡처 ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <div style={{ position: 'absolute', top: 4, left: 4, background: 'rgba(0,0,0,0.55)', color: '#fff', fontSize: 10, fontWeight: 700, borderRadius: 4, padding: '2px 6px' }}>
                  {i + 1}
                </div>
                <button
                  onClick={() => removeFile(f.id)}
                  style={{ position: 'absolute', top: 4, right: 4, width: 22, height: 22, background: 'rgba(239,68,68,0.9)', color: '#fff', border: 'none', borderRadius: '50%', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--f)' }}
                >
                  ×
                </button>
              </div>
            ))}
            {files.length < 10 && (
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{ borderRadius: 8, border: '2px dashed var(--bd)', aspectRatio: '3/4', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', gap: 4, color: 'var(--tx3)' }}
              >
                <span style={{ fontSize: 22 }}>+</span>
                <span style={{ fontSize: 10 }}>추가</span>
              </div>
            )}
          </div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: 'none' }}
        onChange={e => {
          const picked = Array.from(e.target.files ?? []).filter(f => f.type.startsWith('image/'));
          if (picked.length) addFiles(picked);
          e.target.value = '';
        }}
      />

      {captureError && stage === 'error' && (
        <div style={{ marginBottom: 12 }}>
          <ErrorBox msg={captureError} />
        </div>
      )}

      {files.length > 0 && (
        <button
          onClick={analyze}
          style={{ width: '100%', padding: '13px 0', background: 'var(--pu)', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--f)', marginTop: 4 }}
        >
          🔍 분석 시작 ({files.length}장)
        </button>
      )}

      {showGuide && <CaptureGuideModal onClose={() => setShowGuide(false)} />}
    </div>
  );
}

/* ─── 메인 ─── */
export default function ReferenceScreen() {
  const isMobile = useIsMobile();
  const { go, setReferenceAnalysis, setCaptureAnalysis, captureAnalysis, referenceAnalysis, setSectionStructure, setOriginalSections, ch, setOut, setType, goAfterReference } = useApp();

  // ★래퍼런스형 전용 화면(2026-07-22) — 기본 탭 = 파일 업로드(스마트스토어·쿠팡은 봇 차단으로 URL 분석 불가가 대부분).
  const [tab, setTab]       = useState<Tab>(captureAnalysis ? 'capture' : referenceAnalysis ? 'url' : 'capture');
  const [url, setUrl]       = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ReferenceAnalysis | null>(null);
  const [error, setError]   = useState('');
  // ★품질 게이트 — 분석은 됐지만 참고 가치가 낮은 페이지(섹션 너무 적음·타입 단조) 경고. 진행은 막지 않음.
  const [weakRef, setWeakRef] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => { abortRef.current?.abort(); }, []);

  if (isMobile) return <ReferenceMobile />;

  const reset = () => { setResult(null); setReferenceAnalysis(null); setError(''); setWeakRef(false); };

  const switchTab = (t: Tab) => {
    setTab(t);
    reset();
  };

  // 참고 가치 판정 — 섹션 4개 미만이거나 타입이 2종 이하면 구조를 뽑을 재료가 부족한 페이지.
  const isWeakReference = (sections: string[]) =>
    sections.length < 4 || new Set(sections).size <= 2;

  const callApi = async (body: Record<string, string>) => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    let timedOut = false;
    const tid = setTimeout(() => { timedOut = true; ctrl.abort(); }, 40_000);

    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/crawl-reference', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body), signal: ctrl.signal,
      });
      clearTimeout(tid);
      const data = await res.json();
      if (!res.ok || data.error) { setError(data.error ?? '분석 실패'); return; }
      setResult(data.analysis);
      setReferenceAnalysis(data.analysis);
      setCaptureAnalysis(null);
      const refSections: string[] = data.analysis.sections ?? [];
      setSectionStructure(refSections);
      setWeakRef(isWeakReference(refSections));
      const inferred = inferOutFromSections(refSections);
      if (inferred && !CH_OUT_AUTO[ch || '']) setOut(inferred);
    } catch (err) {
      clearTimeout(tid);
      if ((err as Error).name === 'AbortError') {
        if (timedOut) setError('40초 초과 — 다시 시도해주세요.');
        return;
      }
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      if (!ctrl.signal.aborted || timedOut) setLoading(false);
    }
  };

  const analyzeUrl = () => {
    const trimmed = url.trim();
    if (!trimmed) return;
    const normalized = trimmed.startsWith('http') ? trimmed : `https://${trimmed}`;
    try { new URL(normalized); } catch {
      setError('올바른 URL 형식이 아니에요. https://로 시작하는 주소를 확인해주세요.'); return;
    }
    callApi({ url: trimmed });
  };

  const tabCardStyle = (active: boolean): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    padding: '14px 12px', borderRadius: 12,
    background: active ? '#fff' : '#FAFAFE',
    border: active ? '2px solid #6D4CFF' : '1.5px solid #E8E4F4',
    boxShadow: active ? '0 2px 12px rgba(109,76,255,0.12)' : 'none',
    fontSize: 13.5, fontWeight: active ? 700 : 600,
    color: active ? '#6D4CFF' : '#6B7280',
    cursor: 'pointer', fontFamily: 'var(--f)', transition: 'all .15s',
    position: 'relative', whiteSpace: 'nowrap',
  });

  const handleCaptureDone = (analysis: CaptureAnalysis, _stitchedImage: string) => {
    setCaptureAnalysis(analysis);
    setReferenceAnalysis(null);
    const capSections = analysis.섹션목록.map(s => s.타입);
    setSectionStructure(capSections);
    setWeakRef(isWeakReference(capSections));
    const inferred = inferOutFromSections(capSections);
    if (inferred && !CH_OUT_AUTO[ch || '']) setOut(inferred);
  };

  const hasAnalysis = Boolean(referenceAnalysis || captureAnalysis);

  // 래퍼런스 없이 진행 — 분석 자산 정리 후 기본형으로 전환(래퍼런스형인데 래퍼런스가 없는 어정쩡한 상태 방지).
  const proceedWithoutReference = () => {
    setCaptureAnalysis(null);
    setReferenceAnalysis(null);
    setSectionStructure([]);
    setOriginalSections([]);
    setType('기본형');
    goAfterReference();
  };

  return (
    <div style={{ maxWidth: 820, margin: '0 auto', padding: '40px 28px 100px', fontFamily: 'var(--f)' }}>

      {/* ★단일 컬럼(2026-07-22) — 우측 '실제 생성 결과' 패널 제거(화면 목적과 안 어울림) */}
      <div>
        <div>

          {/* 헤더 (좌측 정렬) */}
          <div style={{ marginBottom: 24 }}>
            <span style={{
              display: 'inline-block', padding: '4px 13px', marginBottom: 14,
              border: '1.5px solid #A8E8DD', borderRadius: 100, background: '#F0FBF9',
              fontSize: 11.5, fontWeight: 700, color: '#0B7A6E', letterSpacing: '0.04em',
            }}>래퍼런스형</span>
            <h1 style={{ fontSize: 30, fontWeight: 800, color: '#111', letterSpacing: '-0.04em', lineHeight: 1.25, marginBottom: 8 }}>
              닮고 싶은 <span style={{ color: '#6D4CFF' }}>상세페이지</span>를 보여주세요
            </h1>
            <p style={{ fontSize: 14, color: '#6B7280', lineHeight: 1.6 }}>
              AI가 섹션 구조와 카피 톤을 분석해 따라가요 — 문구·이미지 복제가 아니라, 내 제품 이야기로 다시 씁니다
            </p>
          </div>

          {/* 탭 카드 2개 — 파일 업로드가 기본(스마트스토어·쿠팡은 URL 크롤링 차단) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 16 }}>
            <button style={tabCardStyle(tab === 'capture')} onClick={() => switchTab('capture')}>
              <ImageIcon size={15} /> 파일 업로드
            </button>
            <button style={tabCardStyle(tab === 'url')} onClick={() => switchTab('url')}>
              <Link2 size={15} /> URL 분석
            </button>
          </div>

          {/* 콘텐츠 카드 */}
          <div style={{ background: '#fff', border: '1.5px solid #E8E4F4', borderRadius: 16, padding: 24 }}>

            {/* URL 탭 */}
            {tab === 'url' && (
              <div>
                {/* 큰 입력 박스 */}
                <div style={{
                  background: '#FAFBFC', border: '1.5px solid #F0EBFF', borderRadius: 14,
                  padding: '18px 18px', display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14,
                }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: '50%', background: '#EDE8FF',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <Link2 size={20} color="#6D4CFF" strokeWidth={2.2} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#111', marginBottom: 4 }}>상세페이지 URL을 입력해주세요</div>
                    <input
                      type="url"
                      placeholder="예) https://brand.com/product/..."
                      value={url}
                      onChange={e => { setUrl(e.target.value); reset(); }}
                      onKeyDown={e => e.key === 'Enter' && !loading && analyzeUrl()}
                      disabled={loading}
                      style={{
                        width: '100%', border: 'none', background: 'transparent',
                        fontSize: 13, color: '#6B7280', outline: 'none',
                        fontFamily: 'var(--f)', padding: 0,
                      }}
                    />
                  </div>
                  <button
                    onClick={analyzeUrl}
                    disabled={loading || !url.trim()}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6, padding: '13px 22px',
                      background: (loading || !url.trim()) ? '#EDE8FF' : '#6D4CFF',
                      color: (loading || !url.trim()) ? '#B0A0E8' : '#fff',
                      border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 700,
                      cursor: (loading || !url.trim()) ? 'not-allowed' : 'pointer',
                      boxShadow: (loading || !url.trim()) ? 'none' : '0 4px 14px rgba(109,76,255,0.30)',
                      flexShrink: 0, fontFamily: 'var(--f)',
                    }}
                  >
                    {loading ? (
                      <><span style={{ display: 'inline-block', width: 12, height: 12, border: '2px solid #c4b5fd', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /> 분석 중...</>
                    ) : (
                      <><Sparkles size={14} fill="#fff" /> AI 분석하기</>
                    )}
                  </button>
                </div>

                {/* 안내 */}
                <div style={{ background: '#F4F0FF', border: '1px solid #bfdbfe', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#1e40af', lineHeight: 1.7, marginBottom: 14 }}>
                  💡 <b>자사몰·해외몰</b>은 URL로 바로 분석 가능해요.{' '}
                  <b>스마트스토어·쿠팡·올리브영</b>은 봇 차단으로 크롤링이 제한됩니다 —{' '}
                  <button onClick={() => switchTab('capture')} style={{ fontWeight: 700, color: '#6D4CFF', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--f)', fontSize: 12, textDecoration: 'underline', padding: 0 }}>파일 업로드</button>를 이용해주세요.
                </div>

                {error && (
                  <>
                    <ErrorBox msg={error} />
                    <div style={{ marginTop: 12, background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: 10, padding: '14px 16px' }}>
                      <div style={{ fontSize: 12.5, color: '#5b21b6', lineHeight: 1.7, marginBottom: 10 }}>
                        스마트스토어·쿠팡 같은 페이지는 크롤링이 막혀 있어요.<br />
                        캡처 이미지로 분석해보세요.
                      </div>
                      <button
                        onClick={() => switchTab('capture')}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 16px', background: '#6D4CFF', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--f)' }}
                      >
                        파일 업로드로 분석하기 →
                      </button>
                    </div>
                  </>
                )}
                {result && <AnalysisResult result={result} onReset={reset} />}
              </div>
            )}

            {/* 캡처 분석 탭 */}
            {tab === 'capture' && (
              <CaptureTab onDone={handleCaptureDone} />
            )}

          </div>

          {/* ★품질 게이트 경고 — 분석은 성공했지만 참고 가치가 낮은 페이지. 진행은 막지 않고 보완 방식만 안내 */}
          {weakRef && hasAnalysis && (
            <div style={{
              marginTop: 14, background: '#FFFBEB', border: '1px solid #FDE68A',
              borderRadius: 10, padding: '12px 16px', fontSize: 12.5, color: '#92400E', lineHeight: 1.7,
            }}>
              ⚠️ 이 페이지는 뽑아낼 섹션 구조가 적어요. 부족한 부분은 AI가 카테고리 기본 구조로 보완해서 만들어드릴게요 —
              그대로 진행해도 괜찮고, 더 알찬 페이지 캡처로 다시 분석해도 좋아요.
            </div>
          )}

          {/* 하단 네비 */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', alignItems: 'center',
            marginTop: 20, paddingTop: 20,
          }}>
            <button onClick={() => go('s3')} style={{
              justifySelf: 'start',
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '11px 18px', background: '#fff', border: '1.5px solid #E5E7EB',
              borderRadius: 10, fontSize: 13.5, fontWeight: 600, color: '#6B7280',
              cursor: 'pointer', fontFamily: 'var(--f)',
            }}>
              <ArrowLeft size={15} /> 이전 단계
            </button>

            <button
              onClick={proceedWithoutReference}
              style={{
                justifySelf: 'center',
                fontSize: 12.5, color: '#9CA3AF', background: 'transparent',
                border: 'none', cursor: 'pointer', fontFamily: 'var(--f)', padding: '4px 8px',
              }}
            >
              래퍼런스 없이 기본형으로 진행
            </button>

            <button
              onClick={() => hasAnalysis && goAfterReference()}
              disabled={!hasAnalysis}
              style={{
                justifySelf: 'end',
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '12px 24px',
                background: hasAnalysis ? '#6D4CFF' : '#EDE8FF',
                color: hasAnalysis ? '#fff' : '#B0A0E8',
                border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 700,
                cursor: hasAnalysis ? 'pointer' : 'not-allowed',
                boxShadow: hasAnalysis ? '0 4px 14px rgba(109,76,255,0.30)' : 'none',
                fontFamily: 'var(--f)',
              }}
            >
              {hasAnalysis ? '이 구조로 다음 단계' : '분석하면 진행할 수 있어요'} <ArrowRight size={15} />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
