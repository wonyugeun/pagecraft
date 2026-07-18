'use client';

import { useState, useRef, useEffect, type CSSProperties } from 'react';
import { useApp } from '@/store/AppContext';
import { calculateGenerationCost } from '@/lib/pricing';
import { buildThumbBrief } from '@/lib/adBrief';

// ★디자인 통일 — 구 토큰(파랑+베이지) → Flik 토큰(#6D4CFF 보라+화이트). QuickScreen과 동일 스코프 오버라이드.
const FLIK_TOKENS = {
  '--ac': '#6D4CFF',
  '--al': 'rgba(109,76,255,0.08)',
  '--bd': '#ECECF2',
  '--sf': '#F4F0FF',
  '--r': '16px',
  '--rs': '10px',
} as unknown as CSSProperties;

// ── 스튜디오 스타일(QuickScreen과 동일 `.quick-studio` 시스템으로 통일) ──
const STUDIO_CSS = `
.quick-studio{ background:#FAFAFC; min-height:100%; }
.quick-studio .q-wrap{ max-width:1180px; margin:0 auto; padding:56px 32px 40px; }
.quick-studio .q-title{ font-size:30px; font-weight:800; color:#111; letter-spacing:-0.03em; margin-bottom:8px; }
.quick-studio .q-sub{ font-size:15px; color:#666; line-height:1.6; margin-bottom:28px; }
.quick-studio .q-steps{ display:flex; align-items:center; gap:12px; margin-bottom:28px; flex-wrap:wrap; }
.quick-studio .q-step{ display:inline-flex; align-items:center; gap:8px; font-size:13px; font-weight:600; color:#B8B8C7; }
.quick-studio .q-step .q-stepno{ width:24px; height:24px; border-radius:50%; display:inline-flex; align-items:center; justify-content:center; font-size:12px; font-weight:700; background:#ECECF2; color:#B8B8C7; }
.quick-studio .q-step.on{ color:#6D4CFF; }
.quick-studio .q-step.on .q-stepno{ background:#6D4CFF; color:#fff; }
.quick-studio .q-stepline{ flex:1; min-width:16px; height:2px; background:#ECECF2; border-radius:2px; }
.quick-studio .q-grid{ display:grid; grid-template-columns:minmax(0,1fr) 340px; gap:24px; align-items:start; }
.quick-studio .q-card{ background:#fff; border:1px solid #ECECF2; border-radius:28px; box-shadow:0 16px 40px rgba(17,17,17,0.04); padding:32px; }
.quick-studio .q-card + .q-card{ margin-top:20px; }
.quick-studio .q-cardtitle{ font-size:17px; font-weight:700; color:#111; letter-spacing:-0.02em; margin-bottom:20px; }
.quick-studio .q-fg{ margin-bottom:22px; }
.quick-studio .q-fg:last-child{ margin-bottom:0; }
.quick-studio .q-label{ font-size:13px; font-weight:700; color:#111; margin-bottom:10px; display:flex; align-items:center; gap:6px; }
.quick-studio .q-opt{ font-size:11px; font-weight:500; color:#B8B8C7; }
.quick-studio .q-req{ font-size:11px; font-weight:700; color:#6D4CFF; }
.quick-studio .q-input{ width:100%; padding:13px 16px; background:#fff; border:1px solid #ECECF2; border-radius:14px; font-size:14px; color:#111; outline:none; font-family:inherit; transition:border-color .15s; }
.quick-studio .q-input:focus{ border-color:#6D4CFF; }
.quick-studio .q-input::placeholder{ color:#B8B8C7; }
.quick-studio .q-chips{ display:flex; flex-wrap:wrap; gap:8px; }
.quick-studio .q-chip{ height:36px; padding:0 15px; border-radius:999px; border:1px solid #ECECF2; background:#fff; color:#666; font-size:13px; font-weight:500; cursor:pointer; transition:all .15s; font-family:inherit; }
.quick-studio .q-chip:hover{ border-color:#D8CEFF; }
.quick-studio .q-chip.on{ background:#F4F0FF; border-color:#6D4CFF; color:#6D4CFF; font-weight:700; }
.quick-studio .q-hint{ font-size:12px; color:#8B8B99; margin-top:10px; line-height:1.6; }
.quick-studio .q-up{ background:linear-gradient(180deg,#FFFFFF 0%,#F7F4FF 100%); border:1.5px dashed #C8BAFF; border-radius:24px; padding:44px 32px; text-align:center; cursor:pointer; transition:all .18s; }
.quick-studio .q-up:hover{ border-color:#6D4CFF; background:#FBFAFF; }
.quick-studio .q-up.sm{ padding:28px 24px; }
.quick-studio .q-upbtn{ display:inline-block; margin-top:16px; background:#6D4CFF; color:#fff; border:none; border-radius:14px; padding:10px 22px; font-size:13px; font-weight:700; cursor:pointer; font-family:inherit; }
.quick-studio .q-thumbs{ display:grid; grid-template-columns:repeat(5,1fr); gap:8px; margin-top:14px; }
.quick-studio .q-thumb{ position:relative; aspect-ratio:1; border-radius:14px; overflow:hidden; border:1px solid #ECECF2; background:#F4F0FF; }
.quick-studio .q-thumb img{ width:100%; height:100%; object-fit:cover; display:block; }
.quick-studio .q-thumb-rm{ position:absolute; top:4px; right:4px; width:20px; height:20px; border:none; border-radius:50%; background:rgba(17,17,17,0.6); color:#fff; font-size:10px; cursor:pointer; display:flex; align-items:center; justify-content:center; }
.quick-studio .q-secgrid{ display:grid; grid-template-columns:repeat(3,1fr); gap:12px; }
.quick-studio .q-secgrid.two{ grid-template-columns:repeat(2,1fr); }
.quick-studio .q-sec{ position:relative; background:#fff; border:1px solid #ECECF2; border-radius:20px; padding:20px 18px; cursor:pointer; transition:all .18s ease; }
.quick-studio .q-sec:hover{ transform:translateY(-2px); border-color:#D8CEFF; background:#FBFAFF; box-shadow:0 12px 32px rgba(17,17,17,0.06); }
.quick-studio .q-sec.sel{ border:2px solid #6D4CFF; padding:19px 17px; background:linear-gradient(180deg,#FFFFFF 0%,#F4F0FF 100%); box-shadow:0 12px 32px rgba(109,76,255,0.16); }
.quick-studio .q-sec.off{ opacity:0.5; cursor:default; background:#FAFAFC; }
.quick-studio .q-sec.off:hover{ transform:none; border-color:#ECECF2; background:#FAFAFC; box-shadow:none; }
.quick-studio .q-sec-badge{ position:absolute; top:12px; right:12px; width:24px; height:24px; border-radius:50%; background:#6D4CFF; color:#fff; display:none; align-items:center; justify-content:center; font-size:12px; }
.quick-studio .q-sec.sel .q-sec-badge{ display:flex; }
.quick-studio .q-sec-ico{ font-size:22px; margin-bottom:10px; }
.quick-studio .q-sec-name{ font-size:14px; font-weight:700; color:#111; margin-bottom:5px; }
.quick-studio .q-sec-desc{ font-size:11.5px; color:#8B8B99; line-height:1.5; }
.quick-studio .q-summary{ position:sticky; top:88px; background:#fff; border:1px solid #ECECF2; border-radius:28px; padding:24px; box-shadow:0 16px 40px rgba(17,17,17,0.05); }
.quick-studio .q-sum-row{ display:flex; justify-content:space-between; align-items:baseline; gap:12px; padding:10px 0; border-bottom:1px solid #F4F4F6; }
.quick-studio .q-sum-row:last-child{ border-bottom:none; }
.quick-studio .q-sum-k{ font-size:12.5px; color:#8B8B99; flex-shrink:0; }
.quick-studio .q-sum-v{ font-size:13px; font-weight:600; color:#111; text-align:right; }
.quick-studio .q-sum-v.muted{ color:#B8B8C7; font-weight:500; }
.quick-studio .q-preview{ margin-top:16px; border:1px solid #ECECF2; border-radius:20px; overflow:hidden; background:#fff; }
.quick-studio .q-preview-hero{ aspect-ratio:1; display:flex; align-items:center; justify-content:center; text-align:center; padding:20px; background:linear-gradient(160deg,#EDE7FF 0%,#F7F4FF 60%,#fff 100%); color:#8B7FD0; font-size:13px; font-weight:600; }
.quick-studio .q-samples{ display:grid; grid-template-columns:1fr 1fr; gap:8px; }
.quick-studio .q-sample{ aspect-ratio:1; border-radius:14px; overflow:hidden; position:relative; border:1px solid #ECECF2; display:flex; align-items:center; justify-content:center; }
.quick-studio .q-sample-cap{ position:absolute; left:6px; bottom:6px; font-size:9px; font-weight:700; padding:2px 6px; border-radius:6px; background:rgba(255,255,255,0.82); color:#6D4CFF; backdrop-filter:blur(2px); }
.quick-studio .q-cta{ position:sticky; bottom:0; background:rgba(255,255,255,0.86); backdrop-filter:blur(16px); -webkit-backdrop-filter:blur(16px); border-top:1px solid #ECECF2; }
.quick-studio .q-cta-inner{ max-width:1180px; margin:0 auto; padding:16px 32px; display:flex; align-items:center; justify-content:space-between; gap:16px; }
.quick-studio .q-cta-next{ height:52px; padding:0 36px; border:none; border-radius:16px; font-size:15px; font-weight:700; color:#fff; background:#6D4CFF; cursor:pointer; font-family:inherit; transition:background .15s; display:inline-flex; align-items:center; gap:8px; }
.quick-studio .q-cta-next:hover{ background:#5B3EE0; }
.quick-studio .q-cta-next:disabled{ background:#D9D9E3; cursor:default; }
.quick-studio .q-cta-back{ height:52px; padding:0 22px; border:1px solid #ECECF2; border-radius:16px; font-size:14px; font-weight:600; color:#666; background:#fff; cursor:pointer; font-family:inherit; }
@media (max-width:980px){
  .quick-studio .q-grid{ grid-template-columns:1fr; }
  .quick-studio .q-secgrid{ grid-template-columns:repeat(2,1fr); }
  .quick-studio .q-card{ padding:22px; border-radius:22px; }
  .quick-studio .q-summary{ position:static; }
}
@media (max-width:560px){
  .quick-studio .q-wrap{ padding:32px 16px 32px; }
  .quick-studio .q-secgrid{ grid-template-columns:1fr 1fr; }
  .quick-studio .q-cta-inner{ padding:14px 16px; }
  .quick-studio .q-cta-back{ display:none; }
  .quick-studio .q-cta-next{ flex:1; padding:0; justify-content:center; }
}
`;

// 썸네일 타입 카드 아이콘(표시용) — 로직 무관.
const THUMB_ICO: Record<string, string> = {
  white: '🤍', concept: '🎨', text_overlay: '🔤', ref_copy: '📐', ref_vibe: '🌈', sale: '🏷️', model: '👤',
};

// 예시 썸네일 4종 — 셀러가 폴더에 넣은 실제 썸네일 이미지(public/images/thumb-sample-1~4).
const SAMPLE_THUMBS = [
  '/images/thumb-sample-1.png',
  '/images/thumb-sample-2.png',
  '/images/thumb-sample-3.png',
  '/images/thumb-sample-4.png',
];

// 1개 크게 + 좌우 화살표·점·스와이프로 4개 넘겨보는 캐러셀.
function SampleCarousel() {
  const [idx, setIdx] = useState(0);
  const touchX = useRef<number | null>(null);
  const n = SAMPLE_THUMBS.length;
  const move = (d: number) => setIdx(i => (i + d + n) % n);
  const navBtn: CSSProperties = {
    position: 'absolute', top: '50%', transform: 'translateY(-50%)',
    width: 34, height: 34, borderRadius: '50%', border: 'none',
    background: 'rgba(255,255,255,0.92)', boxShadow: '0 2px 10px rgba(17,17,17,0.18)',
    color: '#6D4CFF', fontSize: 20, lineHeight: 1, cursor: 'pointer', zIndex: 2,
    display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit',
  };
  return (
    <div
      style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', border: '1px solid #ECECF2', background: '#F4F0FF' }}
      onTouchStart={e => { touchX.current = e.touches[0].clientX; }}
      onTouchEnd={e => { if (touchX.current == null) return; const dx = e.changedTouches[0].clientX - touchX.current; if (Math.abs(dx) > 40) move(dx < 0 ? 1 : -1); touchX.current = null; }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={SAMPLE_THUMBS[idx]} alt={`예시 썸네일 ${idx + 1}`} style={{ width: '100%', aspectRatio: '1 / 1', objectFit: 'cover', display: 'block' }} />
      <button aria-label="이전 예시" onClick={() => move(-1)} style={{ ...navBtn, left: 8 }}>‹</button>
      <button aria-label="다음 예시" onClick={() => move(1)} style={{ ...navBtn, right: 8 }}>›</button>
      <div style={{ position: 'absolute', bottom: 10, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 5, zIndex: 2 }}>
        {SAMPLE_THUMBS.map((_, i) => (
          <button
            key={i}
            aria-label={`${i + 1}번째 예시`}
            onClick={() => setIdx(i)}
            style={{ width: i === idx ? 18 : 6, height: 6, borderRadius: 999, border: 'none', padding: 0, cursor: 'pointer', background: i === idx ? '#6D4CFF' : 'rgba(255,255,255,0.85)', boxShadow: '0 1px 3px rgba(17,17,17,0.15)', transition: 'all .2s' }}
          />
        ))}
      </div>
    </div>
  );
}

/* ─── 카테고리 ─── */
const CATS = [
  { key: '화장품', ico: '✨' }, { key: '식품',   ico: '🍱' }, { key: '패션', ico: '👔' },
  { key: '생활',   ico: '🛋️' }, { key: '가전',   ico: '📱' }, { key: '반려동물', ico: '🐶' },
  { key: '스포츠', ico: '⚽' }, { key: '유아',   ico: '🧸' }, { key: '건강', ico: '💪' },
  { key: '자동차', ico: '🚙' }, { key: '기타',   ico: '🎁' },
];

/* ─── 채널 ─── */
const CHANNELS = ['스마트스토어', '쿠팡', '와디즈', '자사몰'] as const;
type Channel = typeof CHANNELS[number];

// ★안내=산출물 일치 — gpt-image-2 실제 지원 규격은 1024²(1:1)·1536×1024(가로)·1024×1536(세로)뿐.
//   따라서 채널별로 generate-image에 넘길 aspectRatio와, 그 결과 '실제로' 생성되는 px(out)를 함께 정의.
//   과거엔 플랫폼 권장치(1200×675 등)를 안내했지만 산출물은 1024² 정사각이라 불일치 → out을 실제값으로 통일.
const CH_SPEC: Record<Channel, { ratio: string; out: string; orient: string }> = {
  스마트스토어: { ratio: '1:1',  out: '1024×1024', orient: '정사각' },
  쿠팡:         { ratio: '1:1',  out: '1024×1024', orient: '정사각' },
  와디즈:       { ratio: '16:9', out: '1536×1024', orient: '가로형' },
  자사몰:       { ratio: '16:9', out: '1536×1024', orient: '가로형' },
};

/* ─── 썸네일 타입 ─── */
interface ThumbType {
  key: string;
  label: string;
  desc: string;
  prompt: string;
  needsRef: boolean;
  disabled: boolean;
}

const THUMB_TYPES: ThumbType[] = [
  {
    key: 'white', label: '흰배경 단독컷', needsRef: false, disabled: false,
    desc: '제품만 깔끔하게, 메인 썸네일용',
    prompt: '순백색 배경에 제품만 중앙에 배치한 이커머스 썸네일. 제품 형태가 선명하게 보이도록 고른 조명 처리.',
  },
  {
    key: 'concept', label: '컨셉컷', needsRef: false, disabled: false,
    desc: '라이프스타일 연출, 브랜드 무드',
    prompt: '브랜드 무드와 카테고리에 어울리는 감성 배경에 제품을 자연스럽게 합성한 이커머스 썸네일. 색감과 분위기를 제품과 조화롭게 연출.',
  },
  {
    key: 'text_overlay', label: '텍스트오버레이컷', needsRef: false, disabled: false,
    desc: '혜택/USP 텍스트 강조',
    prompt: '제품 이미지 위에 한국어 핵심 카피를 굵은 폰트로 오버레이한 이커머스 썸네일. 고대비 색상과 명확한 가독성 강조.',
  },
  {
    key: 'ref_copy', label: '레퍼런스 이미지 카피컷', needsRef: true, disabled: false,
    desc: '구도 그대로, 제품만 우리 걸로',
    prompt: '레퍼런스 이미지의 구도, 배경, 소품 배치를 최대한 유지하고 제품만 교체한 이커머스 썸네일. 레이아웃과 배경은 레퍼런스 그대로.',
  },
  {
    key: 'ref_vibe', label: '레퍼런스 느낌 카피컷', needsRef: true, disabled: false,
    desc: '분위기/색감만 따라, 새로 연출',
    prompt: '레퍼런스 이미지의 색감, 분위기, 무드만 분석하여 새로운 구도로 제품을 연출한 이커머스 썸네일. 분위기는 레퍼런스를 따르되 구도는 새롭게.',
  },
  {
    key: 'sale', label: '세일/이벤트컷', needsRef: false, disabled: false,
    desc: '할인율/이벤트 강조, 빨간 배경',
    prompt: '강렬한 빨간색 또는 채도 높은 배경에 할인율·이벤트 텍스트를 크게 오버레이한 이커머스 썸네일. 높은 시각적 주목도와 구매 긴박감 강조.',
  },
  {
    key: 'model', label: '모델 사용컷', needsRef: false, disabled: true,
    desc: 'AI 모델이 제품 사용/착용 (추후 활성화)',
    prompt: '',
  },
];

/* ─── 라이트박스 ─── */
function ThumbLightbox({ url, onClose }: { url: string; onClose: () => void }) {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => { document.body.style.overflow = ''; window.removeEventListener('keydown', handler); };
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.88)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt="썸네일 확대"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: '100%', maxHeight: '88vh', borderRadius: 8, boxShadow: '0 8px 48px rgba(0,0,0,.6)', display: 'block' }}
      />
      <button
        onClick={onClose}
        aria-label="닫기"
        style={{ position: 'absolute', top: 16, right: 20, fontSize: 28, color: '#fff', background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1, fontFamily: 'var(--f)' }}
      >
        ✕
      </button>
    </div>
  );
}

interface ImgFile { url: string; file: File; }

export default function ThumbScreen() {
  const { go, setCredits, setCreditModalOpen, saveHistory, updateLatestHistoryImages } = useApp();
  const jobKeyRef = useRef<string>('');   // ★결제 멱등키 — charge가 이 키로 원자 차감, 이후 verify-only. 타입/채널 바뀌면 새 키(새 과금).

  const [productName, setProductName]   = useState('');
  const [copyText, setCopyText]         = useState('');   // ★썸네일 문구 — 이미지 내 유일 허용 텍스트
  const [cat, setCat]                   = useState('');
  const [ch, setCh]                     = useState<Channel | ''>('');
  const [selectedType, setSelectedType] = useState('');

  const [productImgs, setProductImgs]   = useState<ImgFile[]>([]);
  const [dragging, setDragging]         = useState(false);
  const productInputRef                 = useRef<HTMLInputElement>(null);

  const [refImg, setRefImg]             = useState<ImgFile | null>(null);
  const [draggingRef, setDraggingRef]   = useState(false);
  const refInputRef                     = useRef<HTMLInputElement>(null);

  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState('');
  const [resultUrl, setResultUrl]       = useState('');
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const currentTypeDef = THUMB_TYPES.find(t => t.key === selectedType) ?? null;
  const needsRef = currentTypeDef?.needsRef ?? false;
  const isDisabled = !ch || !selectedType || loading || (needsRef && !refImg);

  // ★무과금 재생성 누수 차단 — 생성 입력(상품명·카테고리·채널·타입·상품사진·레퍼런스) 중 하나라도 바뀌면
  //   새 jobKey 발급(=새 charge). 아무것도 안 바꾸고 '다시 생성'만 하면 deps 불변 → 같은 키 = 무료 재시도(C정책).
  //   productImgs/refImg는 add·remove마다 참조가 바뀌므로 사진 교체도 새 과금으로 잡힘.
  useEffect(() => { jobKeyRef.current = ''; }, [selectedType, ch, productName, copyText, cat, productImgs, refImg]);

  const estCost = selectedType ? calculateGenerationCost({ sectionCount: 1 }) : 0;   // 예상 차감(하드코딩 X, 서버와 동일 함수)
  const activeStep = resultUrl ? 3 : loading ? 2 : 1;   // 01 타입선택 → 02 이미지생성 → 03 결과확인
  const recSpec = ch ? CH_SPEC[ch as Channel] : null;

  /* ─── helpers ─── */
  const toBase64 = (objectUrl: string): Promise<string> =>
    fetch(objectUrl).then(r => r.blob()).then(blob => new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload  = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    }));

  const addProductFiles = (files: FileList | null) => {
    if (!files) return;
    const remaining = 5 - productImgs.length;
    if (remaining <= 0) { alert('최대 5장까지 업로드할 수 있어요.'); return; }
    if (files.length > remaining) alert(`최대 5장까지 업로드할 수 있어요. ${remaining}장만 추가됩니다.`);
    const newItems: ImgFile[] = Array.from(files).slice(0, remaining).map(f => ({ url: URL.createObjectURL(f), file: f }));
    setProductImgs(p => [...p, ...newItems]);
  };

  const removeProductImg = (i: number) => {
    URL.revokeObjectURL(productImgs[i].url);
    setProductImgs(p => p.filter((_, j) => j !== i));
  };

  const setRefFile = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    if (refImg) URL.revokeObjectURL(refImg.url);
    setRefImg({ url: URL.createObjectURL(files[0]), file: files[0] });
  };

  const removeRefImg = () => {
    if (refImg) URL.revokeObjectURL(refImg.url);
    setRefImg(null);
  };

  /* ─── generate ─── */
  const generate = async () => {
    if (isDisabled || !currentTypeDef) return;
    // ★결제 게이트 — 생성 첫 동작. jobKey 발급(1회) → charge가 유일 차감·발급 지점(단일 CTE 원자성).
    //   deducted|duplicate일 때만 generate-image 진행. 순서 불가침(생성→차감 금지).
    if (!jobKeyRef.current) jobKeyRef.current = crypto.randomUUID();
    setLoading(true);
    setError('');
    setResultUrl('');
    setLightboxOpen(false);

    try {
      const chargeRes = await fetch('/api/thumb/charge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobKey: jobKeyRef.current, sectionCount: 1 }),
      });
      const chargeData = await chargeRes.json().catch(() => ({}));
      if (!chargeRes.ok) {
        if (chargeRes.status === 402) { setCreditModalOpen(true); setLoading(false); return; }   // 크레딧 부족 — 생성 중단
        setError(chargeData.error || '크레딧 처리 중 오류가 발생했어요.'); setLoading(false); return;
      }
      if (typeof chargeData.balance === 'number') setCredits(chargeData.balance);   // 헤더 크레딧 갱신
    } catch {
      setError('크레딧 처리 중 오류가 발생했어요.'); setLoading(false); return;
    }

    try {
      const spec   = CH_SPEC[ch as Channel];   // ch는 isDisabled 게이트에서 필수 검증됨
      // ★Clean 전환(2026-07-18) — 구 한 줄 프롬프트를 buildThumbBrief로 교체:
      //   텍스트=셀러 입력 문구만(카피·할인율 날조 차단), 제품 보존·수치 금지 가드 동일 적용.
      const prompt = buildThumbBrief({
        typeKey: selectedType,
        productName,
        cat,
        copyText,
        hasRef: needsRef && !!refImg,
      });

      const sourceImgs = productImgs.slice(0, 5);
      const productBase64s: string[] = sourceImgs.length > 0
        ? await Promise.all(sourceImgs.map(img => toBase64(img.url)))
        : [];

      // ★레퍼런스 전달 보장 — 서버가 MAX_REF_IMAGES(4)로 '앞에서부터' 자르므로 ref를 뒤에 push하면
      //   상품사진 4장일 때 잘려 항상 누락됨(레퍼런스 타입인데 레퍼런스 없이 생성=기능 미작동+과금).
      //   ref를 배열 맨 앞에 두어 잘림에서 우선 생존시킴.
      const base64s: string[] = (needsRef && refImg)
        ? [await toBase64(refImg.url), ...productBase64s]
        : productBase64s;

      // ★채널 규격을 실제로 전달 — aspectRatio로 채널 비율(정사각/가로) 반영. 미전달 시 서버가 1:1 정사각 폴백.
      const body: Record<string, unknown> = { prompt, sectionNum: `thumb_${selectedType}`, jobKey: jobKeyRef.current, aspectRatio: spec.ratio };
      if (base64s.length > 0) body.productImages = base64s;

      const res  = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(130_000),
      });
      const data = await res.json();
      if (data.imageBase64) {
        const finalUrl = `data:${data.mimeType};base64,${data.imageBase64}`;
        setResultUrl(finalUrl);
        // ★영속화 — saveHistory 재사용(빠른제작과 동일, type='썸네일'). 대시보드 최근작업 누적·클릭 복원.
        try {
          const secNum = `thumb_${selectedType}`;
          const secName = `${currentTypeDef.label} 썸네일`;
          saveHistory({
            productName, cat, ch,
            type: '썸네일',
            out: 'blog',
            secCnt: 1,
            // ★imageDesc 비우면 ResultScreen blog 경로(BlogSection)의 이미지 슬롯 게이트(sec.imageDesc)에 걸려 복원 시 백지.
            //   secName으로 채워 복원 시 이미지가 뜨게(이미 IndexedDB에 영속돼 재생성·재과금 없음).
            sections: [{ num: secNum, name: secName, headline: '', body: '', imageLabel: '', imageDesc: secName }],
            jobKey: jobKeyRef.current,
          });
          await updateLatestHistoryImages({ [secNum]: finalUrl });
        } catch { /* 영속화 실패 — 화면 결과는 유지 */ }
      } else {
        setError(data.error || '이미지 생성에 실패했어요. 다시 시도해주세요.');
      }
    } catch (e) {
      console.error('[ThumbScreen] generate error:', e);
      setError('생성 중 오류가 발생했어요. 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  const download = () => {
    if (!resultUrl) return;
    const a = document.createElement('a');
    a.href     = resultUrl;
    a.download = `${productName || 'flik'}_thumb_${selectedType}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  /* ─── render ─── 스튜디오 2단 레이아웃(QuickScreen과 통일) */
  return (
    <div className="quick-studio" style={FLIK_TOKENS}>
      <style>{STUDIO_CSS}</style>

      <div className="q-wrap">
        <h1 className="q-title">썸네일 생성</h1>
        <p className="q-sub">채널별 최적 규격으로, 원하는 타입을 골라 이커머스 썸네일 1장을 AI로 만들어드려요.</p>

        {/* 진행 단계 */}
        <div className="q-steps">
          <span className={`q-step${activeStep >= 1 ? ' on' : ''}`}><span className="q-stepno">01</span>타입 선택</span>
          <span className="q-stepline" />
          <span className={`q-step${activeStep >= 2 ? ' on' : ''}`}><span className="q-stepno">02</span>이미지 생성</span>
          <span className="q-stepline" />
          <span className={`q-step${activeStep >= 3 ? ' on' : ''}`}><span className="q-stepno">03</span>결과 확인</span>
        </div>

        <div className="q-grid">
          {/* 좌측 */}
          <div>
            {/* 제작 정보 카드 */}
            <div className="q-card">
              <div className="q-cardtitle">제작 정보</div>

              <div className="q-fg">
                <div className="q-label">상품명 <span className="q-opt">선택</span></div>
                <input className="q-input" type="text" placeholder="예: 제주 병풀 토너 200ml" value={productName} onChange={e => setProductName(e.target.value)} />
              </div>

              {/* ★썸네일 문구(Clean 전환) — 이미지에 들어갈 유일한 텍스트. 미입력이면 텍스트 없는 썸네일.
                  (이전엔 텍스트오버레이·세일컷에서 모델이 카피·할인율을 지어냈음 — 날조 차단의 핵심 입력) */}
              <div className="q-fg">
                <div className="q-label">썸네일 문구 <span className="q-opt">선택</span></div>
                <input className="q-input" type="text" placeholder="예: 출시 기념 특가 · 미입력 시 문구 없이 생성돼요" value={copyText} onChange={e => setCopyText(e.target.value)} />
                <div className="q-hint">입력한 문구만 이미지에 들어가요 — 할인율·이벤트명은 실제 진행 중인 것만 적어주세요</div>
              </div>

              <div className="q-fg">
                <div className="q-label">카테고리 <span className="q-opt">선택</span></div>
                <div className="q-chips">
                  {CATS.map(c => (
                    <button key={c.key} type="button" className={`q-chip${cat === c.key ? ' on' : ''}`} onClick={() => setCat(p => p === c.key ? '' : c.key)}>{c.ico} {c.key}</button>
                  ))}
                </div>
              </div>

              <div className="q-fg">
                <div className="q-label">판매 채널 <span className="q-req">*</span></div>
                <div className="q-chips">
                  {CHANNELS.map(c => (
                    <button key={c} type="button" className={`q-chip${ch === c ? ' on' : ''}`} onClick={() => setCh(p => p === c ? '' : c)}>{c}</button>
                  ))}
                </div>
                {recSpec && <div className="q-hint">💡 {recSpec.orient} {recSpec.out}px로 생성돼요 · PNG로 저장돼요</div>}
              </div>

              <div className="q-fg">
                <div className="q-label">상품 이미지 업로드 <span className="q-opt">선택</span></div>
                <div
                  className="q-up"
                  onDragOver={e => { e.preventDefault(); setDragging(true); }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={e => { e.preventDefault(); setDragging(false); addProductFiles(e.dataTransfer.files); }}
                  onClick={() => productInputRef.current?.click()}
                  style={dragging ? { borderColor: '#6D4CFF', background: '#FBFAFF' } : undefined}
                >
                  <input ref={productInputRef} type="file" multiple accept="image/*" style={{ display: 'none' }} onChange={e => { addProductFiles(e.target.files); e.target.value = ''; }} />
                  <div style={{ fontSize: 30, marginBottom: 10 }}>⬆️</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#111', marginBottom: 6 }}>상품 사진을 업로드하세요</div>
                  <div style={{ fontSize: 12.5, color: '#8B8B99', lineHeight: 1.6 }}>제품 전체가 잘 보이는 정면 사진을 추천해요<br />PNG · JPG · WEBP · 최대 5장</div>
                  <button className="q-upbtn" onClick={e => { e.stopPropagation(); productInputRef.current?.click(); }}>이미지 선택</button>
                </div>
                {productImgs.length > 0 && (
                  <div className="q-thumbs">
                    {productImgs.map((img, i) => (
                      <div className="q-thumb" key={i}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={img.url} alt={`상품이미지 ${i + 1}`} />
                        <button className="q-thumb-rm" onClick={() => removeProductImg(i)}>✕</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 썸네일 타입 카드 */}
            <div className="q-card">
              <div className="q-cardtitle">썸네일 타입 <span className="q-req" style={{ fontSize: 12 }}>*</span></div>
              <div className="q-secgrid two">
                {THUMB_TYPES.map(t => t.disabled ? (
                  <div key={t.key} className="q-sec off">
                    <div className="q-sec-ico">{THUMB_ICO[t.key]}</div>
                    <div className="q-sec-name">{t.label} <span style={{ fontSize: 10, fontWeight: 500, color: '#B8B8C7' }}>준비 중</span></div>
                    <div className="q-sec-desc">{t.desc}</div>
                  </div>
                ) : (
                  <div key={t.key} className={`q-sec${selectedType === t.key ? ' sel' : ''}`} onClick={() => setSelectedType(p => p === t.key ? '' : t.key)}>
                    <div className="q-sec-badge">✓</div>
                    <div className="q-sec-ico">{THUMB_ICO[t.key]}</div>
                    <div className="q-sec-name">{t.label}</div>
                    <div className="q-sec-desc">{t.desc}</div>
                  </div>
                ))}
              </div>

              {/* 레퍼런스 이미지 (ref_copy / ref_vibe) */}
              {needsRef && (
                <div style={{ marginTop: 20 }}>
                  <div className="q-label">레퍼런스 이미지 <span className="q-req">*</span></div>
                  <div className="q-hint" style={{ marginTop: 0, marginBottom: 12 }}>
                    {selectedType === 'ref_copy'
                      ? '💡 구도·배경·소품을 그대로 유지하고 제품만 교체할 레퍼런스 이미지를 업로드하세요.'
                      : '💡 색감·무드·분위기를 분석할 레퍼런스 이미지를 업로드하세요. 구도는 새롭게 연출돼요.'}
                  </div>
                  <div
                    className="q-up sm"
                    onDragOver={e => { e.preventDefault(); setDraggingRef(true); }}
                    onDragLeave={() => setDraggingRef(false)}
                    onDrop={e => { e.preventDefault(); setDraggingRef(false); setRefFile(e.dataTransfer.files); }}
                    onClick={() => refInputRef.current?.click()}
                    style={draggingRef ? { borderColor: '#6D4CFF', background: '#FBFAFF' } : undefined}
                  >
                    <input ref={refInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { setRefFile(e.target.files); e.target.value = ''; }} />
                    <div style={{ fontSize: 26, marginBottom: 8 }}>🖼️</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#111', marginBottom: 4 }}>레퍼런스 이미지 업로드</div>
                    <div style={{ fontSize: 12, color: '#8B8B99' }}>참고할 썸네일 디자인 1장</div>
                    <button className="q-upbtn" onClick={e => { e.stopPropagation(); refInputRef.current?.click(); }}>파일 선택</button>
                  </div>
                  {refImg && (
                    <div className="q-thumbs" style={{ gridTemplateColumns: 'repeat(5,1fr)' }}>
                      <div className="q-thumb">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={refImg.url} alt="레퍼런스 이미지" />
                        <button className="q-thumb-rm" onClick={removeRefImg}>✕</button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="q-hint">💡 배경이 깔끔하고 로고·라벨이 선명한 사진일수록 좋은 썸네일이 나와요. 텍스트오버레이·세일컷은 카피가 이미지에 합성됩니다.</div>
            </div>
          </div>

          {/* 우측 요약 + 결과/미리보기 */}
          <aside>
            <div className="q-summary">
              <div className="q-cardtitle" style={{ fontSize: 15, marginBottom: 14 }}>✨ 생성 요약</div>
              <div className="q-sum-row"><span className="q-sum-k">상품명</span><span className={`q-sum-v${productName ? '' : ' muted'}`}>{productName || '아직 입력되지 않음'}</span></div>
              <div className="q-sum-row"><span className="q-sum-k">카테고리</span><span className={`q-sum-v${cat ? '' : ' muted'}`}>{cat || '미선택'}</span></div>
              <div className="q-sum-row"><span className="q-sum-k">채널</span><span className={`q-sum-v${ch ? '' : ' muted'}`}>{ch || '미선택'}</span></div>
              <div className="q-sum-row"><span className="q-sum-k">업로드 이미지</span><span className="q-sum-v">{productImgs.length}장</span></div>
              <div className="q-sum-row"><span className="q-sum-k">선택 타입</span><span className={`q-sum-v${selectedType ? '' : ' muted'}`}>{currentTypeDef ? currentTypeDef.label : '없음'}</span></div>
              <div className="q-sum-row"><span className="q-sum-k">예상 차감</span><span className="q-sum-v" style={{ color: '#6D4CFF' }}>{estCost} 크레딧</span></div>
              <div className="q-sum-row"><span className="q-sum-k">생성 결과</span><span className="q-sum-v">썸네일 1장{recSpec ? ` · ${recSpec.out}` : ''}</span></div>

              {error && (
                <div style={{ marginTop: 14, background: '#FFF1F2', border: '1px solid #FECACA', borderRadius: 12, padding: '10px 14px', fontSize: 12.5, color: '#DC2626', lineHeight: 1.5 }}>⚠️ {error}</div>
              )}

              {resultUrl ? (
                <div style={{ marginTop: 16 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: '#111', marginBottom: 8 }}>✅ 생성 완료</div>
                  <div className="q-preview">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={resultUrl} alt="생성된 썸네일" onClick={() => setLightboxOpen(true)} style={{ width: '100%', display: 'block', cursor: 'zoom-in' }} />
                  </div>
                  <button onClick={download} style={{ width: '100%', marginTop: 10, height: 44, border: 'none', borderRadius: 14, background: '#6D4CFF', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>⬇ 다운로드</button>
                </div>
              ) : (
                <>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: '#111', margin: '18px 0 8px' }}>이런 스타일로 만들 수 있어요</div>
                  <SampleCarousel />
                  <div style={{ fontSize: 11, color: '#B8B8C7', marginTop: 10, textAlign: 'center' }}>* 예시 이미지예요. 실제 생성 결과와 다를 수 있습니다.</div>
                </>
              )}
            </div>
          </aside>
        </div>
      </div>

      {/* 하단 sticky CTA */}
      <div className="q-cta">
        <div className="q-cta-inner">
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: '#111' }}>{currentTypeDef ? `${currentTypeDef.label} · 예상 차감 ${estCost}크레딧` : '썸네일 타입을 선택해주세요'}</div>
            <div style={{ fontSize: 12, color: '#8B8B99', marginTop: 2 }}>{!ch ? '채널을 선택해주세요' : needsRef && !refImg ? '레퍼런스 이미지를 올려주세요' : selectedType ? '썸네일 1장이 생성돼요' : '타입을 선택하면 생성할 수 있어요'}</div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="q-cta-back" onClick={() => go('s-dash')}>← 뒤로</button>
            <button className="q-cta-next" disabled={isDisabled} onClick={generate}>
              {loading
                ? <><span style={{ display: 'inline-block', width: 15, height: 15, border: '2px solid rgba(255,255,255,.45)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />생성 중…</>
                : resultUrl ? '↻ 다시 생성' : '✦ 썸네일 생성하기'}
            </button>
          </div>
        </div>
      </div>

      {/* 라이트박스 */}
      {lightboxOpen && resultUrl && (
        <ThumbLightbox url={resultUrl} onClose={() => setLightboxOpen(false)} />
      )}
    </div>
  );
}
