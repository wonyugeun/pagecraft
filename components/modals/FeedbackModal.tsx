'use client';

import { useEffect, useRef, useState } from 'react';
import { X, Star, ImagePlus, Send, Check } from 'lucide-react';
import { compressUpload } from '@/lib/imageCompress';

/**
 * 고객의 소리 — 결과 화면에서 여는 의견 창구(2026-07-30).
 *
 * ★설계: 보내는 마찰은 최소로(한 줄이라도 OK), 고치는 데 필요한 맥락은 자동으로.
 *   context는 부모가 넘긴 생성 설정·상품정보 스냅샷이며, 수집 사실을 화면에 명시한다.
 * ★이미지는 클라이언트에서 압축해서 보낸다(원본 그대로 보내면 전송 실패가 잦다).
 */
export default function FeedbackModal({
  open, onClose, context, getAutoImage,
}: {
  open: boolean;
  onClose: () => void;
  context: Record<string, unknown>;
  /** 결과 화면이 주는 '지금 만든 결과물' 캡처 — 있으면 열릴 때 자동 첨부(2026-08-05 유근님:
   *  다운받아 다시 첨부하는 이중 수고 제거). 실패해도 조용히 없이 진행. */
  getAutoImage?: () => Promise<string | null>;
}) {
  const [rating, setRating] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [autoAttached, setAutoAttached] = useState(false);
  const [autoLoading, setAutoLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const autoTriedRef = useRef(false);

  // 열릴 때 결과물 자동 첨부 — 한 번만 시도, 사용자가 X로 빼면 다시 붙이지 않는다
  useEffect(() => {
    if (!open) { autoTriedRef.current = false; return; }
    if (autoTriedRef.current || !getAutoImage) return;
    autoTriedRef.current = true;
    let cancelled = false;
    setAutoLoading(true);
    getAutoImage()
      .then(url => { if (!cancelled && url) { setImage(url); setAutoAttached(true); } })
      .catch(() => {})
      .finally(() => { if (!cancelled) setAutoLoading(false); });
    return () => { cancelled = true; };
  }, [open, getAutoImage]);

  if (!open) return null;

  const close = () => {
    onClose();
    // 닫은 뒤 초기화 — 다음에 열었을 때 이전 내용이 남지 않게
    setTimeout(() => { setSent(false); setMessage(''); setImage(null); setRating(null); setErr(''); }, 250);
  };

  const pickImage = async (file: File) => {
    setErr('');
    if (!file.type.startsWith('image/')) { setErr('이미지 파일만 첨부할 수 있어요.'); return; }
    if (file.size > 20 * 1024 * 1024) { setErr('20MB 이하 이미지만 첨부해주세요.'); return; }
    try {
      const raw = await new Promise<string>((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(String(r.result));
        r.onerror = () => rej(new Error('read'));
        r.readAsDataURL(file);
      });
      // ★서버 상한(약 1.5M자)을 넘으면 조용히 버려진다 — 상한에 들 때까지 단계적으로 줄이고,
      //   그래도 안 되면 사용자에게 말한다(조용한 실패 금지).
      let out = await compressUpload(raw, 900, 0.75);
      for (const [w, q] of [[700, 0.6], [520, 0.5]] as const) {
        if (out.length <= 3_300_000) break;
        out = await compressUpload(raw, w, q);
      }
      if (!/^data:image\/(jpeg|png|webp)/.test(out)) {
        setErr('이 형식은 첨부할 수 없어요 — 스크린샷(PNG/JPG)으로 다시 시도해주세요.'); return;
      }
      if (out.length > 3_300_000) {
        setErr('이미지가 너무 커서 첨부할 수 없어요 — 화면 일부만 잘라 다시 첨부해주세요.'); return;
      }
      setImage(out); setAutoAttached(false);
    } catch { setErr('이미지를 불러오지 못했어요.'); }
  };

  const send = async () => {
    if (sending) return;
    if (!message.trim()) { setErr('내용을 입력해주세요.'); return; }
    setSending(true); setErr('');
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: message.trim(), rating, context, image }),
      });
      const d = await res.json() as { error?: string };
      if (!res.ok) throw new Error(d.error ?? '전송에 실패했어요.');
      setSent(true);
    } catch (e) {
      setErr(e instanceof Error ? e.message : '전송에 실패했어요.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      onClick={close}
      style={{
        position: 'fixed', inset: 0, zIndex: 950, background: 'rgba(17,17,26,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 'min(460px, 100%)', maxHeight: '86vh', overflowY: 'auto',
          background: '#fff', borderRadius: 20, padding: '24px 24px 20px',
          boxShadow: '0 20px 60px rgba(17,17,26,0.25)', fontFamily: 'var(--f)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontSize: 17, fontWeight: 800, color: '#191F28', letterSpacing: '-0.02em' }}>
            {sent ? '보내주셔서 고맙습니다' : '이 결과, 어떠셨나요?'}
          </span>
          <button
            onClick={close} aria-label="닫기"
            style={{
              width: 30, height: 30, borderRadius: 8, border: 'none', background: '#F4F4F8',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: '#8B95A1', flexShrink: 0,
            }}
          ><X size={16} strokeWidth={2.2} /></button>
        </div>

        {sent ? (
          <div style={{ padding: '18px 0 6px' }}>
            <div style={{
              width: 46, height: 46, borderRadius: '50%', background: '#F0FDF4',
              display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14,
            }}>
              <Check size={24} color="#16A34A" strokeWidth={2.6} />
            </div>
            <p style={{ fontSize: 14.5, color: '#4E5968', lineHeight: 1.75, margin: 0 }}>
              보내주신 의견은 제가 직접 읽습니다. 고칠 수 있는 건 빠르게 고치고,
              시간이 걸리는 건 언제쯤 될지 알려드릴게요.
            </p>
            <button onClick={close} style={{
              marginTop: 20, width: '100%', border: 'none', borderRadius: 12, padding: '14px 0',
              background: '#6D4CFF', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
            }}>닫기</button>
          </div>
        ) : (
          <>
            <p style={{ fontSize: 13, color: '#8B95A1', margin: '0 0 16px', lineHeight: 1.65 }}>
              아쉬웠던 점도 편하게 적어주세요. 아직 부족한 게 많아서, 알려주시는 게 가장 큰 도움이 돼요.
            </p>

            {/* 별점(선택) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14 }}>
              {[1, 2, 3, 4, 5].map(n => (
                <button
                  key={n} onClick={() => setRating(n === rating ? null : n)}
                  aria-label={`${n}점`}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, lineHeight: 0 }}
                >
                  <Star
                    size={24}
                    color={rating !== null && n <= rating ? '#6D4CFF' : '#D7DBE0'}
                    fill={rating !== null && n <= rating ? '#6D4CFF' : 'none'}
                    strokeWidth={1.8}
                  />
                </button>
              ))}
              <span style={{ fontSize: 12, color: '#B0B8C1', marginLeft: 4 }}>선택</span>
            </div>

            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder={'어떤 점이 좋았고 어떤 점이 불편했는지 알려주세요.\n예: 카피는 마음에 드는데 이미지가 상품과 달라요'}
              style={{
                width: '100%', minHeight: 110, resize: 'vertical',
                border: '1px solid #ECECF2', borderRadius: 12, padding: '12px 13px',
                fontSize: 14, lineHeight: 1.7, color: '#191F28', fontFamily: 'inherit',
                outline: 'none', boxSizing: 'border-box',
              }}
            />

            {/* 이미지 첨부 */}
            <div style={{ marginTop: 10 }}>
              {autoLoading && !image && (
                <div style={{ fontSize: 12.5, color: '#8B95A1', padding: '6px 0' }}>결과물 이미지를 준비하고 있어요…</div>
              )}
              {image ? (
                <div style={{ position: 'relative', display: 'inline-block' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={image} alt="첨부" style={{ maxHeight: 120, borderRadius: 10, display: 'block', border: '1px solid #ECECF2' }} />
                  {autoAttached && (
                    <div style={{ fontSize: 11.5, color: '#8B95A1', marginTop: 5 }}>지금 보고 있는 결과물이 자동 첨부됐어요</div>
                  )}
                  <button
                    onClick={() => { setImage(null); setAutoAttached(false); }} aria-label="첨부 제거"
                    style={{
                      position: 'absolute', top: -7, right: -7, width: 24, height: 24, borderRadius: '50%',
                      background: '#191F28', color: '#fff', border: 'none', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  ><X size={13} strokeWidth={2.6} /></button>
                </div>
              ) : (
                <button
                  onClick={() => fileRef.current?.click()}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    background: '#F4F0FF', border: '1px solid #E6DEFF', color: '#5B3FD6',
                    borderRadius: 9, padding: '9px 14px', fontSize: 12.5, fontWeight: 700,
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  <ImagePlus size={15} strokeWidth={2.2} />
                  화면 캡처 첨부 <span style={{ fontWeight: 500, color: '#8B95A1' }}>선택</span>
                </button>
              )}
              <input
                ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
                onChange={e => { const f = e.target.files?.[0]; if (f) void pickImage(f); e.target.value = ''; }}
              />
            </div>

            {err && <div style={{ fontSize: 12.5, color: '#DC2626', marginTop: 10 }}>{err}</div>}

            {/* 수집 고지 — 조용히 가져가지 않는다 */}
            <div style={{ fontSize: 11.5, color: '#B0B8C1', marginTop: 14, lineHeight: 1.65 }}>
              빠르게 확인할 수 있도록, 입력하신 상품정보와 이번 생성 설정(카테고리·채널·타입·섹션 수·어투)이
              함께 전송돼요. 결제 정보나 비밀번호는 포함되지 않습니다.
            </div>

            <button
              onClick={send} disabled={sending}
              style={{
                marginTop: 16, width: '100%', border: 'none', borderRadius: 12, padding: '15px 0',
                background: sending ? '#EDE8FF' : '#6D4CFF', color: sending ? '#B0A0E8' : '#fff',
                fontSize: 15, fontWeight: 700, cursor: sending ? 'default' : 'pointer',
                fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
              }}
            >
              <Send size={16} strokeWidth={2.2} />
              {sending ? '보내는 중…' : '의견 보내기'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
