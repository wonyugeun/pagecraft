'use client';

import { useState, useRef, useEffect, type CSSProperties } from 'react';
import { useApp, Section } from '@/store/AppContext';
import { resolveOutputType } from '@/lib/outputType';
import { aspectRatioFor } from '@/lib/sectionAspect';
import { calculateGenerationCost } from '@/lib/pricing';

interface ImgFile { url: string; }

// ★디자인 통일 — 구 토큰(파랑 #6D4CFF + 베이지)을 Flik 토큰(#6D4CFF 보라 + 화이트 카드톤)으로 스코프 오버라이드.
//   globals.css의 var(--ac/--al/--bd/--sf/--r/--rs)를 루트에서 덮어써 하위 클래스 전체에 적용(전면 재작성 X).
//   참고: DashboardScreen 카드(테두리 #ECECF2, radius 큼, 화이트).
const FLIK_TOKENS = {
  '--ac': '#6D4CFF',
  '--al': 'rgba(109,76,255,0.08)',
  '--bd': '#ECECF2',
  '--sf': '#F4F0FF',
  '--r': '16px',
  '--rs': '10px',
} as unknown as CSSProperties;

interface FieldDef {
  id: string;
  label: string;
  placeholder: string;
  type: 'input' | 'textarea';
  rows?: number;
}

const SECTION_FIELDS: Record<string, FieldDef[]> = {
  hero: [
    { id: 'hook',   label: '핵심 후킹 포인트', type: 'input',    placeholder: '예: 병풀 52% 고농도, 피부과 테스트 완료 — 이 제품만의 가장 강한 차별점' },
    { id: 'target', label: '타겟 고객',         type: 'input',    placeholder: '예: 환절기 트러블 걱정되는 20~30대 민감성 피부' },
  ],
  empathy: [
    { id: 'pain', label: '타겟이 겪는 고민', type: 'textarea', rows: 3, placeholder: '예: 바르면 따갑고 당겨요, 환절기마다 트러블 반복, 진정 제품은 효과가 없었어요' },
  ],
  usp: [
    { id: 'diff',    label: '경쟁사 대비 차별점 3가지', type: 'textarea', rows: 4, placeholder: '예: 1. 병풀 52% 고농도\n2. EWG 그린등급 98%\n3. 피부과 테스트 완료' },
    { id: 'feature', label: '핵심 기능',                type: 'input',    placeholder: '예: 수분 72시간 지속, 즉각 진정, 장벽 강화' },
  ],
  howto: [
    { id: 'steps',  label: '사용 단계', type: 'textarea', rows: 4, placeholder: '예: 1. 세안 후 스킨으로 기초 정돈\n2. 에센스 3~4방울 덜어 흡수\n3. 크림으로 마무리' },
    { id: 'timing', label: '사용 시점', type: 'input',    placeholder: '예: 아침·저녁 세안 후, 피부 예민할 때' },
  ],
  compare: [
    { id: 'rival',     label: '비교 대상 (브랜드/제품)', type: 'input',    placeholder: '예: A브랜드 진정토너, B브랜드 수분크림' },
    { id: 'advantage', label: '우리 우위 포인트',        type: 'textarea', rows: 3, placeholder: '예: 용량 2배, 성분 순도 3배 높음, 인증 보유' },
  ],
  review: [
    { id: 'keywords', label: '실제 후기 키워드', type: 'textarea', rows: 3, placeholder: '예: 촉촉함, 자극없음, 흡수빠름, 향기좋음, 다음날 피부결' },
    { id: 'rating',   label: '평균 별점',        type: 'input',    placeholder: '예: 4.8점 (리뷰 1,200개)' },
  ],
  faq: [
    { id: 'questions', label: '자주 묻는 질문 3가지', type: 'textarea', rows: 5, placeholder: '예: Q. 민감성 피부에도 괜찮나요?\nQ. 임산부도 사용 가능한가요?\nQ. 향이 강한가요?' },
  ],
  cta: [
    { id: 'benefit',   label: '혜택/할인', type: 'input', placeholder: '예: 런칭 기념 30% 할인, 3만원 이상 무료배송' },
    { id: 'shipping',  label: '배송 정보', type: 'input', placeholder: '예: 오늘 오후 2시 전 주문 시 내일 도착' },
    { id: 'guarantee', label: '보장 정책', type: 'input', placeholder: '예: 30일 무조건 환불 보장' },
  ],
  ingredient: [
    { id: 'ingredients', label: '핵심 성분/원료', type: 'textarea', rows: 3, placeholder: '예: 병풀추출물 52%, 히알루론산 3종, 나이아신아마이드' },
    { id: 'cert',        label: '인증/특허',      type: 'input',    placeholder: '예: EWG 그린등급, 비건 인증, 피부과 테스트 완료, 특허 성분 복합체' },
  ],
  brand: [
    { id: 'origin', label: '브랜드 탄생 배경', type: 'textarea', rows: 3, placeholder: '예: 창업자 본인이 아토피로 고생하다 성분 연구 끝에 만든 브랜드' },
    { id: 'value',  label: '핵심 가치',        type: 'input',    placeholder: '예: 자연 유래 성분 고집, 동물 실험 반대, 환경 친화 포장' },
  ],
  delivery: [
    { id: 'method',  label: '배송 방식', type: 'input', placeholder: '예: 로켓배송, 새벽배송, 직배송 · 냉장 배송' },
    { id: 'pack',    label: '포장 특징', type: 'input', placeholder: '예: 보냉 파우치, 친환경 완충재, 선물 박스 옵션' },
    { id: 'safety',  label: '안전성',   type: 'input', placeholder: '예: 낱개 봉인 실링, 파손 보상, 식약처 기준 준수' },
  ],
  as: [
    { id: 'warranty', label: '보증 기간',  type: 'input', placeholder: '예: 구매일로부터 1년 무상 A/S' },
    { id: 'refund',   label: '환불 정책', type: 'input', placeholder: '예: 수령 후 7일 이내 단순 변심 환불 가능' },
    { id: 'support',  label: '고객 응대', type: 'input', placeholder: '예: 카카오 채널 평일 09~18시, 평균 응답 1시간' },
  ],
  certification: [
    { id: 'certs',   label: '보유 인증',  type: 'textarea', rows: 3, placeholder: '예: 식약처 기능성 화장품, KC 안전인증, ISO 9001, COSMOS ORGANIC' },
    { id: 'patent',  label: '특허 번호', type: 'input',    placeholder: '예: 특허 제10-2345678호 (복합 진정 성분 배합 공법)' },
    { id: 'test',    label: '시험 결과', type: 'input',    placeholder: '예: 피부 자극 테스트 완료, 알레르기 유발 성분 0%' },
  ],
  process: [
    { id: 'method',  label: '제조 방식', type: 'textarea', rows: 3, placeholder: '예: 저온 압착 추출, GMP 인증 시설, 국내 제조' },
    { id: 'raw',     label: '원료 수급', type: 'input',    placeholder: '예: 제주 직계약 농장, 유기농 인증 원료만 사용' },
    { id: 'quality', label: '품질 관리', type: 'input',    placeholder: '예: 출고 전 전수 검사, 유통기한 18개월' },
  ],
  gift: [
    { id: 'option',   label: '선물 옵션',    type: 'textarea', rows: 3, placeholder: '예: 리본 포장 추가, 쇼핑백 동봉, 세트 구성 가능' },
    { id: 'message',  label: '메시지 카드', type: 'input',    placeholder: '예: 손편지 카드 무료 동봉, 원하는 문구 인쇄 가능' },
    { id: 'design',   label: '포장 디자인', type: 'input',    placeholder: '예: 시즌별 기념 박스, 브랜드 시그니처 패키지' },
  ],
  infographic: [
    { id: 'metric1', label: '핵심 수치 1',        type: 'input', placeholder: '예: 히알루론산 함량 3배' },
    { id: 'metric2', label: '핵심 수치 2',        type: 'input', placeholder: '예: 24시간 보습 지속' },
    { id: 'metric3', label: '핵심 수치 3 (선택)', type: 'input', placeholder: '예: 만족도 98%' },
  ],
  goods: [
    { id: 'goodsName', label: '굿즈/사은품 이름',    type: 'input', placeholder: '예: 미니 파우치 증정' },
    { id: 'goodsDesc', label: '굿즈 설명 (선택)',   type: 'input', placeholder: '예: 첫 구매 한정' },
  ],
};

const QUICK_SECTIONS = [
  { id: 'hero',          name: '히어로',        desc: '첫 화면에서 상품의 핵심 매력을 보여줘요',   ico: '🎯', num: 'SECTION 01' },
  { id: 'empathy',       name: '공감',          desc: '고객의 고민을 먼저 짚어 구매 몰입을 높여요', ico: '😔', num: 'SECTION 02' },
  { id: 'usp',           name: 'USP',           desc: '다른 상품과 다른 핵심 차별점을 보여줘요',   ico: '⭐', num: 'SECTION 03' },
  { id: 'howto',         name: '사용법',        desc: '사용 순서와 활용 장면을 쉽게 안내해요',     ico: '📋', num: 'SECTION 04' },
  { id: 'compare',       name: '비교표',        desc: '구매 전 비교 기준을 한눈에 정리해요',       ico: '📊', num: 'SECTION 05' },
  { id: 'review',        name: '후기',          desc: '실제 사용 만족감을 자연스럽게 보여줘요',    ico: '💬', num: 'SECTION 06' },
  { id: 'faq',           name: 'FAQ',           desc: '구매 전 자주 묻는 질문을 해결해요',         ico: '❓', num: 'SECTION 07' },
  { id: 'cta',           name: 'CTA',           desc: '구매 행동을 유도하는 마무리 섹션이에요',    ico: '🛒', num: 'SECTION 08' },
  { id: 'ingredient',    name: '성분신뢰',      desc: '성분과 원료 신뢰감을 시각적으로 보여줘요',  ico: '🔬', num: 'SECTION 09' },
  { id: 'brand',         name: '브랜드 스토리', desc: '브랜드 철학과 탄생 이야기를 전해요',        ico: '🏷️', num: 'SECTION 10' },
  { id: 'delivery',      name: '배송/포장',     desc: '배송 상태와 포장 안정감을 안내해요',        ico: '📦', num: 'SECTION 11' },
  { id: 'as',            name: 'A/S·환불',     desc: '교환·반품·보증 기준을 명확히 안내해요',     ico: '🔧', num: 'SECTION 12' },
  { id: 'certification', name: '인증/특허',     desc: '공식 인증과 수상 이력을 보여줘요',          ico: '🏅', num: 'SECTION 13' },
  { id: 'process',       name: '제조 공정',     desc: '생산 과정과 품질 관리 신뢰를 보여줘요',     ico: '🏭', num: 'SECTION 14' },
  { id: 'gift',          name: '선물 포장',     desc: '선물용 구매 이유와 패키지를 강조해요',      ico: '🎁', num: 'SECTION 15' },
  { id: 'infographic',   name: '수치 인포그래픽', desc: '효능·성분·수치를 시각적으로 정리해요',    ico: '📈', num: 'SECTION 16' },
  { id: 'goods',         name: '굿즈/사은품',   desc: '증정품과 구성품을 안내해요',                ico: '🎀', num: 'SECTION 17' },
];

const CAT_CHIPS = [
  { label: '화장품✨' }, { label: '식품🍱' }, { label: '패션👔' }, { label: '생활🛋️' },
  { label: '가전📱' }, { label: '반려동물🐶' }, { label: '스포츠⚽' }, { label: '유아🧸' },
  { label: '건강💪' }, { label: '자동차🚙' }, { label: '기타🎁' },
];

const CH_CHIPS = ['스마트스토어', '쿠팡', '와디즈', '자사몰'];

// 출력형태별 셀러 안내 — resolveOutputType 결과(blog/slide/html) 기준. 새 매핑 아님(기존 로직 그대로).
//   quick 단일 이미지 기준: slide=텍스트 이미지에 합성(4:5 세로), blog·html=텍스트/이미지 분리.
const OUTPUT_GUIDE: Record<string, string> = {
  slide: '슬라이드형 · 이미지에 텍스트 포함 (세로 긴 광고 이미지)',
  blog:  '블로그형 · 텍스트와 이미지 분리 (네이버 SEO 유리)',
  html:  '블로그형 · 텍스트와 이미지 분리 (네이버 SEO 유리)',
};

// ── 빠른제작 스튜디오 스타일(호버·전환·반응형은 인라인 불가라 스코프 CSS로) ──
const QUICK_CSS = `
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
.quick-studio .q-upbtn{ display:inline-block; margin-top:16px; background:#6D4CFF; color:#fff; border:none; border-radius:14px; padding:10px 22px; font-size:13px; font-weight:700; cursor:pointer; font-family:inherit; }
.quick-studio .q-thumbs{ display:grid; grid-template-columns:repeat(5,1fr); gap:8px; margin-top:14px; }
.quick-studio .q-thumb{ position:relative; aspect-ratio:1; border-radius:14px; overflow:hidden; border:1px solid #ECECF2; background:#F4F0FF; }
.quick-studio .q-thumb img{ width:100%; height:100%; object-fit:cover; display:block; }
.quick-studio .q-thumb-rm{ position:absolute; top:4px; right:4px; width:20px; height:20px; border:none; border-radius:50%; background:rgba(17,17,17,0.6); color:#fff; font-size:10px; cursor:pointer; display:flex; align-items:center; justify-content:center; }
.quick-studio .q-secgrid{ display:grid; grid-template-columns:repeat(3,1fr); gap:12px; }
.quick-studio .q-sec{ position:relative; background:#fff; border:1px solid #ECECF2; border-radius:20px; padding:20px 18px; cursor:pointer; transition:all .18s ease; }
.quick-studio .q-sec:hover{ transform:translateY(-2px); border-color:#D8CEFF; background:#FBFAFF; box-shadow:0 12px 32px rgba(17,17,17,0.06); }
.quick-studio .q-sec.sel{ border:2px solid #6D4CFF; padding:19px 17px; background:linear-gradient(180deg,#FFFFFF 0%,#F4F0FF 100%); box-shadow:0 12px 32px rgba(109,76,255,0.16); }
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
.quick-studio .q-preview-hero{ padding:26px 20px 30px; background:linear-gradient(160deg,#EDE7FF 0%,#F7F4FF 60%,#fff 100%); }
.quick-studio .q-preview-bar{ height:9px; border-radius:6px; background:#D8CEFF; }
.quick-studio .q-cta{ position:sticky; bottom:0; background:rgba(255,255,255,0.86); backdrop-filter:blur(16px); -webkit-backdrop-filter:blur(16px); border-top:1px solid #ECECF2; }
.quick-studio .q-cta-inner{ max-width:1180px; margin:0 auto; padding:16px 32px; display:flex; align-items:center; justify-content:space-between; gap:16px; }
.quick-studio .q-cta-next{ height:52px; padding:0 36px; border:none; border-radius:16px; font-size:15px; font-weight:700; color:#fff; background:#6D4CFF; cursor:pointer; font-family:inherit; transition:background .15s; }
.quick-studio .q-cta-next:hover{ background:#5B3EE0; }
.quick-studio .q-cta-next:disabled{ background:#D9D9E3; cursor:default; }
.quick-studio .q-cta-back{ height:52px; padding:0 22px; border:1px solid #ECECF2; border-radius:16px; font-size:14px; font-weight:600; color:#666; background:#fff; cursor:pointer; font-family:inherit; }
@media (max-width:980px){
  .quick-studio .q-grid{ grid-template-columns:1fr; }
  .quick-studio .q-secgrid{ grid-template-columns:repeat(2,1fr); }
  .quick-studio .q-card{ padding:22px; border-radius:22px; }
  .quick-studio .q-summary{ position:static; }
  .quick-studio .q-thumbs{ grid-template-columns:repeat(5,1fr); }
}
@media (max-width:560px){
  .quick-studio .q-wrap{ padding:32px 16px 32px; }
  .quick-studio .q-secgrid{ grid-template-columns:1fr 1fr; }
  .quick-studio .q-cta-inner{ padding:14px 16px; }
  .quick-studio .q-cta-back{ display:none; }
  .quick-studio .q-cta-next{ flex:1; padding:0; }
}
`;

type GenStatus = 'idle' | 'text' | 'image' | 'done' | 'text_err' | 'img_err';

/* ─── 라이트박스 ─── */
function QuickLightbox({ url, alt, onClose }: { url: string; alt: string; onClose: () => void }) {
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
        alt={alt}
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

export default function QuickScreen() {
  const { go, setCredits, setCreditModalOpen, saveHistory, updateLatestHistoryImages } = useApp();
  const jobKeyRef = useRef<string>('');   // ★결제 멱등키 — 생성 1회 1키. charge가 이 키로 원자 차감, 이후 verify-only. 새 섹션=새 키.

  const [step, setStep] = useState<1 | 2>(1);

  // Step 1
  const [productName, setProductName] = useState('');
  const [cat, setCat] = useState('');
  const [ch, setCh] = useState('');
  const [out, setOut] = useState<string | null>(null);   // 스마트스토어 출력형태 선택(blog/slide). 그 외 채널은 resolveOutputType이 고정.
  const [images, setImages] = useState<ImgFile[]>([]);
  const [dragging, setDragging] = useState(false);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);

  // Step 2 — 섹션별 필드값
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});

  // Generation
  const [genStatus, setGenStatus] = useState<GenStatus>('idle');
  const [sectionResult, setSectionResult] = useState<Section | null>(null);
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  // Auto-close lightbox when result is cleared
  useEffect(() => { if (!sectionResult) setLightboxOpen(false); }, [sectionResult]);

  // 결과는 saveHistory로 히스토리에 누적 → 대시보드 "최근 작업"에서 열람/복원(loadFromHistory→ResultScreen).
  //   빠른제작 화면은 매 진입 새 입력으로 시작(이전 결과는 대시보드에 보존 = 안 사라짐).

  const inputRef = useRef<HTMLInputElement>(null);

  const selectedSection = QUICK_SECTIONS.find(s => s.id === selectedSectionId) ?? null;

  const outType = resolveOutputType(ch || null, out);   // 스마트스토어만 out 반영, 쿠팡=slide·와디즈/자사몰=html 고정(기존 로직)
  const estCost = selectedSectionId ? calculateGenerationCost({ sectionCount: 1 }) : 0;   // 예상 차감(하드코딩 X, 서버와 동일 함수)

  const setField = (id: string, value: string) =>
    setFieldValues(prev => ({ ...prev, [id]: value }));

  const buildProductExtra = (): string => {
    if (!selectedSection) return '';
    const fields = SECTION_FIELDS[selectedSection.id] ?? [];
    return fields
      .filter(f => fieldValues[f.id]?.trim())
      .map(f => `${f.label}: ${fieldValues[f.id].trim()}`)
      .join('\n');
  };

  const addFiles = (files: FileList | null) => {
    if (!files) return;
    const remaining = 5 - images.length;
    if (files.length > remaining) {
      alert(`최대 5장까지 업로드할 수 있어요. ${remaining > 0 ? `${remaining}장만 추가됩니다.` : '이미 5장이 업로드되었습니다.'}`);
    }
    const newItems: ImgFile[] = Array.from(files).slice(0, remaining).map(f => ({ url: URL.createObjectURL(f) }));
    setImages(p => [...p, ...newItems]);
  };

  const toBase64 = (objectUrl: string): Promise<string> =>
    fetch(objectUrl).then(r => r.blob()).then(blob => new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    }));

  const handleGenerate = async () => {
    if (!selectedSection) return;
    // ★결제 게이트 — 생성의 첫 동작. jobKey 발급(1회) → charge가 유일 차감·발급 지점(단일 CTE 원자성).
    //   deducted|duplicate일 때만 이후 regen-section·generate-image 진행. 순서 절대 불가침(생성→차감 금지).
    if (!jobKeyRef.current) jobKeyRef.current = crypto.randomUUID();
    setGenStatus('text');
    setSectionResult(null);
    setImgUrl(null);
    setLightboxOpen(false);

    try {
      const chargeRes = await fetch('/api/quick/charge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobKey: jobKeyRef.current, sectionCount: 1 }),
      });
      const chargeData = await chargeRes.json().catch(() => ({}));
      if (!chargeRes.ok) {
        if (chargeRes.status === 402) { setCreditModalOpen(true); setGenStatus('idle'); return; }  // 크레딧 부족 — 생성 중단
        setGenStatus('text_err'); return;
      }
      if (typeof chargeData.balance === 'number') setCredits(chargeData.balance);   // 헤더 크레딧 갱신(일반 생성과 동일)
    } catch {
      setGenStatus('text_err'); return;
    }

    let section: Section | null = null;

    try {
      const res = await fetch('/api/regen-section', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cat: cat || '기타',
          ch: ch || '스마트스토어',
          type: '기본형',
          out: outType,
          productName,
          productExtra: buildProductExtra(),
          sectionNum: selectedSection.num,
          sectionName: selectedSection.name,
          jobKey: jobKeyRef.current,   // ★charge로 결제된 키 — verifyPaidJob 통과(verify-only, 재차감 없음)
        }),
        signal: AbortSignal.timeout(30_000),
      });
      const data = await res.json();
      const parsed: Section | null = data?.section ?? null;
      if (parsed?.headline !== undefined || parsed?.body !== undefined) {
        section = parsed;
        setSectionResult(section);
        setGenStatus('image');
      } else {
        setGenStatus('text_err');
        return;
      }
    } catch {
      setGenStatus('text_err');
      return;
    }

    try {
      let base64s: string[] = [];
      if (images.length > 0) {
        base64s = await Promise.all(images.slice(0, 3).map(img => toBase64(img.url)));
      }

      // ★출력형태 반영(일반 생성과 동일 분기, ResultScreen: effectiveOut==='blog' ? imageDesc : baked)
      //   blog=텍스트와 이미지 분리(오버레이 금지) · slide/html=이미지에 헤드라인 baked.
      //   블로그형 토글을 골라도 헤드라인이 이미지에 baked되던 버그 수정.
      const bakeText = outType !== 'blog';
      const prompt = bakeText
        ? `${section!.imageDesc}. 텍스트 오버레이: "${section!.headline.replace(/\n/g, ' ')}"`
        : section!.imageDesc;

      const res = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          sectionNum: selectedSection.num,
          outputType: outType,   // ★blog면 서버 TEXT_RULES가 이미지 내 텍스트 렌더 억제(오버레이 금지)
          aspectRatio: aspectRatioFor(selectedSection.name, undefined, outType),   // ★out 전달 — 슬라이드 상품 4:5 강제(일반 생성과 동일)
          jobKey: jobKeyRef.current,   // ★결제된 키 — verifyPaidJob + img quota(img:{jobKey}) 통과
          ...(base64s.length > 0 ? { productImages: base64s } : {}),
        }),
        signal: AbortSignal.timeout(130_000),
      });
      const data = await res.json();
      if (data.imageBase64) {
        const finalUrl = `data:${data.mimeType};base64,${data.imageBase64}`;
        setImgUrl(finalUrl);
        setGenStatus('done');
        // ★영속화 — 일반 생성과 동일한 saveHistory 재사용(1섹션). 히스토리에 누적 → 대시보드 노출·클릭복원.
        //   재진입/다른섹션 생성해도 이전 것 안 사라짐(pc_history 배열, 최대 20). 이미지는 IndexedDB로 첨부.
        try {
          const secNum = String(section.num || '1');
          const savedSection: Section = { ...section, num: secNum };
          saveHistory({
            productName, cat, ch,
            type: '빠른제작',
            out: outType,
            secCnt: 1,
            sections: [savedSection],
            jobKey: jobKeyRef.current,
          });
          await updateLatestHistoryImages({ [secNum]: finalUrl });   // 생성 이미지(base64) 첨부 → 재진입/대시보드 복원 시 OpenAI 재호출 0
        } catch { /* 영속화 실패 — 화면 결과는 유지 */ }
      } else {
        setGenStatus('img_err');
      }
    } catch {
      setGenStatus('img_err');
    }
  };

  const handleCopy = async () => {
    if (!sectionResult) return;
    const text = `헤드라인:\n${sectionResult.headline}\n\n본문:\n${sectionResult.body}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const handleDownload = () => {
    if (!imgUrl || !selectedSection) return;
    const a = document.createElement('a');
    a.href = imgUrl;
    a.download = `${(productName || 'flik').replace(/[/\\?%*:|"<>]/g, '_')}_${selectedSection.name}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const goToStep2 = () => {
    jobKeyRef.current = '';   // ★새 생성 컨텍스트 → 새 jobKey(다음 charge에서 발급). 재생성(같은 섹션)만 키 유지=무료 재시도.
    setFieldValues({});
    setGenStatus('idle');
    setSectionResult(null);
    setImgUrl(null);
    setLightboxOpen(false);
    setStep(2);
  };

  const handleBack = () => {
    if (step === 2) {
      setStep(1);
      setGenStatus('idle');
      setSectionResult(null);
      setImgUrl(null);
    } else {
      go('s-dash');
    }
  };

  return (
    <div className="quick-studio" style={FLIK_TOKENS}>
      <style>{QUICK_CSS}</style>

      {/* ── STEP 1 ── 스튜디오 2단 레이아웃 (시안 기준) */}
      {step === 1 && (
        <>
          <div className="q-wrap">
            <h1 className="q-title">빠른 제작</h1>
            <p className="q-sub">상품 사진 1장과 섹션 목적만 선택하면, AI가 카피와 이미지를 함께 구성합니다.</p>

            {/* 진행 단계 */}
            <div className="q-steps">
              <span className="q-step on"><span className="q-stepno">01</span>섹션 선택</span>
              <span className="q-stepline" />
              <span className="q-step"><span className="q-stepno">02</span>이미지 생성</span>
              <span className="q-stepline" />
              <span className="q-step"><span className="q-stepno">03</span>결과 확인</span>
            </div>

            <div className="q-grid">
              {/* 좌측 */}
              <div>
                {/* 제작 정보 카드 */}
                <div className="q-card">
                  <div className="q-cardtitle">제작 정보</div>

                  <div className="q-fg">
                    <div className="q-label">상품명 <span className="q-opt">선택</span></div>
                    <input className="q-input" type="text" placeholder="예: 병풀 크림 50ml" value={productName} onChange={e => setProductName(e.target.value)} />
                  </div>

                  <div className="q-fg">
                    <div className="q-label">카테고리 <span className="q-opt">선택</span></div>
                    <div className="q-chips">
                      {CAT_CHIPS.map(c => (
                        <button key={c.label} className={`q-chip${cat === c.label ? ' on' : ''}`} onClick={() => setCat(p => p === c.label ? '' : c.label)}>{c.label}</button>
                      ))}
                    </div>
                  </div>

                  <div className="q-fg">
                    <div className="q-label">판매 채널 <span className="q-opt" style={{ color: '#6D4CFF', fontWeight: 700 }}>필수</span></div>
                    <div className="q-chips">
                      {CH_CHIPS.map(c => (
                        <button key={c} className={`q-chip${ch === c ? ' on' : ''}`} onClick={() => setCh(p => p === c ? '' : c)}>{c}</button>
                      ))}
                    </div>
                    {/* ★출력형태 안내·토글 유지(리디자인해도 사라지면 안 됨) */}
                    {ch === '스마트스토어' && (
                      <div style={{ marginTop: 14 }}>
                        <div className="q-label" style={{ marginBottom: 8 }}>출력 형태</div>
                        <div className="q-chips">
                          <button className={`q-chip${out !== 'slide' ? ' on' : ''}`} onClick={() => setOut('blog')}>블로그형</button>
                          <button className={`q-chip${out === 'slide' ? ' on' : ''}`} onClick={() => setOut('slide')}>슬라이드형</button>
                        </div>
                      </div>
                    )}
                    {ch && <div className="q-hint">💡 {OUTPUT_GUIDE[outType] ?? OUTPUT_GUIDE.blog}</div>}
                  </div>

                  <div className="q-fg">
                    <div className="q-label">상품 이미지 업로드 <span className="q-opt">선택</span></div>
                    <div
                      className="q-up"
                      onDragOver={e => { e.preventDefault(); setDragging(true); }}
                      onDragLeave={() => setDragging(false)}
                      onDrop={e => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); }}
                      onClick={() => inputRef.current?.click()}
                      style={dragging ? { borderColor: '#6D4CFF', background: '#FBFAFF' } : undefined}
                    >
                      <input ref={inputRef} type="file" multiple accept="image/*" style={{ display: 'none' }} onChange={e => addFiles(e.target.files)} />
                      <div style={{ fontSize: 30, marginBottom: 10 }}>⬆️</div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: '#111', marginBottom: 6 }}>상품 사진을 업로드하세요</div>
                      <div style={{ fontSize: 12.5, color: '#8B8B99', lineHeight: 1.6 }}>제품 전체가 잘 보이는 정면 사진을 추천해요<br />PNG · JPG · WEBP · 최대 5장</div>
                      <button className="q-upbtn" onClick={e => { e.stopPropagation(); inputRef.current?.click(); }}>이미지 선택</button>
                    </div>
                    {images.length > 0 && (
                      <div className="q-thumbs">
                        {images.map((img, i) => (
                          <div className="q-thumb" key={i}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={img.url} alt={`상품이미지 ${i + 1}`} />
                            <button className="q-thumb-rm" onClick={() => { URL.revokeObjectURL(img.url); setImages(p => p.filter((_, j) => j !== i)); }}>✕</button>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="q-hint">💡 배경이 깔끔하고 로고·라벨이 선명한 사진일수록 더 좋은 결과를 얻을 수 있어요.</div>
                  </div>
                </div>

                {/* 섹션 선택 카드 */}
                <div className="q-card">
                  <div className="q-cardtitle">어떤 섹션이 필요하세요?</div>
                  <div className="q-secgrid">
                    {QUICK_SECTIONS.map(s => (
                      <div
                        key={s.id}
                        className={`q-sec${selectedSectionId === s.id ? ' sel' : ''}`}
                        onClick={() => setSelectedSectionId(p => p === s.id ? null : s.id)}
                      >
                        <div className="q-sec-badge">✓</div>
                        <div className="q-sec-ico">{s.ico}</div>
                        <div className="q-sec-name">{s.name}</div>
                        <div className="q-sec-desc">{s.desc}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* 우측 요약 + 미리보기 */}
              <aside>
                <div className="q-summary">
                  <div className="q-cardtitle" style={{ fontSize: 15, marginBottom: 14 }}>✨ 생성 요약</div>
                  <div className="q-sum-row"><span className="q-sum-k">상품명</span><span className={`q-sum-v${productName ? '' : ' muted'}`}>{productName || '아직 입력되지 않음'}</span></div>
                  <div className="q-sum-row"><span className="q-sum-k">카테고리</span><span className={`q-sum-v${cat ? '' : ' muted'}`}>{cat || '미선택'}</span></div>
                  <div className="q-sum-row"><span className="q-sum-k">채널</span><span className={`q-sum-v${ch ? '' : ' muted'}`}>{ch || '미선택'}</span></div>
                  <div className="q-sum-row"><span className="q-sum-k">업로드 이미지</span><span className="q-sum-v">{images.length}장</span></div>
                  <div className="q-sum-row"><span className="q-sum-k">선택한 섹션</span><span className={`q-sum-v${selectedSection ? '' : ' muted'}`}>{selectedSection ? selectedSection.name : '없음'}</span></div>
                  <div className="q-sum-row"><span className="q-sum-k">예상 차감</span><span className="q-sum-v" style={{ color: '#6D4CFF' }}>{estCost} 크레딧</span></div>
                  <div className="q-sum-row"><span className="q-sum-k">생성 결과</span><span className="q-sum-v">카피 + 이미지 1장</span></div>

                  {/* 미리보기 mockup (UI용) */}
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: '#111', margin: '18px 0 8px' }}>예상 결과 미리보기</div>
                  <div className="q-preview">
                    <div className="q-preview-hero">
                      <div style={{ fontSize: 15, fontWeight: 800, color: '#4B3B9E', lineHeight: 1.4, marginBottom: 16 }}>{productName || '상품명'}<br />{selectedSection ? selectedSection.name : '핵심 포인트'}</div>
                      <div className="q-preview-bar" style={{ width: '82%', marginBottom: 8 }} />
                      <div className="q-preview-bar" style={{ width: '56%', background: '#E6DEFF' }} />
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: '#B8B8C7', marginTop: 10, textAlign: 'center' }}>* 실제 생성되는 결과와 다를 수 있습니다.</div>
                </div>
              </aside>
            </div>
          </div>

          {/* 하단 sticky CTA */}
          <div className="q-cta">
            <div className="q-cta-inner">
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: '#111' }}>선택한 섹션 {selectedSectionId ? 1 : 0}개 · 예상 차감 {estCost}크레딧</div>
                <div style={{ fontSize: 12, color: '#8B8B99', marginTop: 2 }}>{!selectedSectionId ? '섹션을 선택하면 다음 단계로 진행할 수 있어요.' : !ch ? '판매 채널을 선택해주세요.' : '다음 단계에서 세부 정보를 입력해요.'}</div>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="q-cta-back" onClick={() => go('s-dash')}>← 뒤로</button>
                <button className="q-cta-next" disabled={!selectedSectionId || !ch} onClick={() => { if (selectedSectionId && ch) goToStep2(); }}>다음 →</button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── STEP 2 ── (기능 유지, 기존 narrow 폼) */}
      {step === 2 && selectedSection && (
        <div className="inner" style={FLIK_TOKENS}>
          <div className="stitle" style={{ fontSize: 20 }}>빠른 제작 · {selectedSection.name}</div>
          <div className="ssub">세부 정보를 입력하면 카피 퀄리티가 올라가요 (비워도 생성돼요)</div>
          {/* Summary chips */}
          <div className="chips" style={{ marginBottom: 20 }}>
            <span className="chip on">{selectedSection.name}</span>
            {cat && <span className="chip on">{cat}</span>}
            {ch && <span className="chip on">{ch}</span>}
            {productName && <span className="chip on">{productName}</span>}
          </div>

          {/* 섹션별 동적 필드 */}
          {(SECTION_FIELDS[selectedSection.id] ?? []).map(field => (
            <div className="fg" key={field.id}>
              <div className="fl">
                {field.label} <span className="fopt">(선택)</span>
              </div>
              {field.type === 'textarea' ? (
                <textarea
                  className="finp"
                  rows={field.rows ?? 3}
                  placeholder={field.placeholder}
                  value={fieldValues[field.id] ?? ''}
                  onChange={e => setField(field.id, e.target.value)}
                  style={{ resize: 'vertical' }}
                />
              ) : (
                <input
                  className="finp"
                  type="text"
                  placeholder={field.placeholder}
                  value={fieldValues[field.id] ?? ''}
                  onChange={e => setField(field.id, e.target.value)}
                />
              )}
            </div>
          ))}
          <div className="fhint" style={{ marginBottom: 20 }}>입력할수록 카피 퀄리티가 올라가요. 비워두셔도 됩니다.</div>

          <div className="cta-row">
            <button className="btn-back" onClick={handleBack}>← 이전</button>
            <button
              className="btn-next"
              disabled={genStatus === 'text' || genStatus === 'image'}
              onClick={handleGenerate}
            >
              ✦ {selectedSection.name} 생성하기
            </button>
          </div>

          {/* Result area */}
          {genStatus === 'idle' && (
            <div style={{ marginTop: 24, padding: '20px 16px', background: 'var(--sf)', borderRadius: 'var(--r)', textAlign: 'center', color: 'var(--tx3)', fontSize: 13 }}>
              위 버튼을 눌러 생성을 시작하세요
            </div>
          )}

          {genStatus !== 'idle' && (
            <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>

              {genStatus !== 'text_err' && (
                <div style={{ background: 'var(--white)', border: '1.5px solid var(--bd)', borderRadius: 'var(--r)', overflow: 'hidden' }}>
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--bd)', fontWeight: 700, fontSize: 13 }}>
                    📝 카피 결과
                  </div>
                  <div style={{ padding: '16px' }}>
                    {genStatus === 'text' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--tx3)', fontSize: 13 }}>
                        <span style={{ display: 'inline-block', width: 16, height: 16, border: '2px solid #c4b5fd', borderTopColor: '#6D4CFF', borderRadius: '50%', animation: 'spin 0.7s linear infinite', flexShrink: 0 }} />
                        카피 생성 중...
                      </div>
                    )}
                    {sectionResult && (
                      <div>
                        <div style={{ fontSize: 18, fontWeight: 800, lineHeight: 1.4, marginBottom: 12, color: 'var(--tx)', whiteSpace: 'pre-line' }}>
                          {sectionResult.headline}
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--tx2)', lineHeight: 1.8, whiteSpace: 'pre-line', marginBottom: 14 }}>
                          {sectionResult.body}
                        </div>
                        <button
                          onClick={handleCopy}
                          style={{ padding: '7px 14px', fontSize: 12, fontWeight: 600, background: 'transparent', border: '1.5px solid var(--bd)', borderRadius: 'var(--rs)', cursor: 'pointer', color: 'var(--tx2)', fontFamily: 'var(--f)' }}
                        >
                          {copied ? '✅ 복사됨!' : '📋 텍스트 복사'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {genStatus === 'text_err' && (
                <div style={{ padding: '14px 16px', background: '#fff1f2', borderRadius: 'var(--r)', color: '#dc2626', fontSize: 13 }}>
                  ⚠️ 카피 생성에 실패했어요. 다시 시도해주세요.
                </div>
              )}

              {(genStatus === 'image' || genStatus === 'done' || genStatus === 'img_err') && (
                <div style={{ background: 'var(--white)', border: '1.5px solid var(--bd)', borderRadius: 'var(--r)', overflow: 'hidden' }}>
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--bd)', fontWeight: 700, fontSize: 13 }}>
                    🖼️ 이미지 결과
                  </div>
                  <div style={{ padding: '16px' }}>
                    {genStatus === 'image' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--tx3)', fontSize: 13 }}>
                        <span style={{ display: 'inline-block', width: 16, height: 16, border: '2px solid #c4b5fd', borderTopColor: '#6D4CFF', borderRadius: '50%', animation: 'spin 0.7s linear infinite', flexShrink: 0 }} />
                        이미지 생성 중...
                      </div>
                    )}
                    {imgUrl && (
                      <div>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={imgUrl}
                          alt={`${selectedSection.name} 이미지`}
                          onClick={() => setLightboxOpen(true)}
                          style={{ width: '100%', borderRadius: 'var(--rs)', display: 'block', marginBottom: 12, cursor: 'zoom-in' }}
                        />
                        <button
                          onClick={handleDownload}
                          style={{ padding: '7px 14px', fontSize: 12, fontWeight: 600, background: 'transparent', border: '1.5px solid var(--bd)', borderRadius: 'var(--rs)', cursor: 'pointer', color: 'var(--tx2)', fontFamily: 'var(--f)' }}
                        >
                          ⬇ 이미지 다운로드
                        </button>
                      </div>
                    )}
                    {genStatus === 'img_err' && (
                      <div style={{ color: '#dc2626', fontSize: 13 }}>
                        ⚠️ 이미지 생성에 실패했어요. 재생성을 눌러 다시 시도해주세요.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {genStatus === 'done' && (
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <button
                    onClick={handleGenerate}
                    style={{ padding: '9px 18px', fontSize: 13, fontWeight: 600, background: 'var(--ac)', color: '#fff', border: 'none', borderRadius: 'var(--r)', cursor: 'pointer', fontFamily: 'var(--f)' }}
                  >
                    ↻ 재생성
                  </button>
                  <button
                    onClick={() => {
                      jobKeyRef.current = '';   // ★다른 섹션 = 새 생성 → 새 jobKey(새 charge)
                      setStep(1);
                      setGenStatus('idle');
                      setSectionResult(null);
                      setImgUrl(null);
                      setFieldValues({});
                      setSelectedSectionId(null);
                    }}
                    style={{ padding: '9px 18px', fontSize: 13, fontWeight: 600, background: 'transparent', color: 'var(--tx2)', border: '1.5px solid var(--bd)', borderRadius: 'var(--r)', cursor: 'pointer', fontFamily: 'var(--f)' }}
                  >
                    ← 다른 섹션 선택
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 라이트박스 */}
      {lightboxOpen && imgUrl && selectedSection && (
        <QuickLightbox
          url={imgUrl}
          alt={`${selectedSection.name} 이미지`}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </div>
  );
}
