'use client';

import React, { createContext, useContext, useState, useRef, useEffect, ReactNode } from 'react';
import { useSession } from 'next-auth/react';
import { saveImages, patchImages, mergeImages, getImages, deleteImages } from '@/lib/historyDB';

export type ScreenId =
  | 's0' | 's-dash' | 's-quick' | 's-thumb'
  | 's1' | 's2' | 's3' | 's3b' | 's4' | 's5' | 's5-5' | 's5b' | 's6' | 's7' | 's8' | 's9';

export type Block =
  | { type: 'hero'; title: string; subtitle?: string }
  | { type: 'heading'; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'checklist'; items: string[] }
  | { type: 'steps'; items: { title: string; desc?: string }[] }
  | { type: 'iconcards'; cards: { title: string; desc?: string }[] }
  | { type: 'stats'; items: { value: string; label: string }[] }
  | { type: 'compare'; headers: string[]; rows: string[][] }
  | { type: 'quote'; text: string; author?: string; rating?: number }
  | { type: 'faq'; items: { q: string; a: string }[] }
  | { type: 'image'; label: string; desc: string }
  | { type: 'cta'; text: string; button: string };

export interface Section {
  num: string;
  name: string;
  headline: string;
  body: string;
  imageLabel: string;
  imageDesc: string;
  blocks?: Block[];
  subcopy?: string;     // 새 엔진(v5) 서브카피 — 블로그형에서 headline 아래 부제로 렌더
  bodyFlow?: boolean;   // 새 엔진 섹션: body(주 카피)와 blocks(보조)를 공존 렌더(기존 generate는 미설정)
  visual?: {            // 제품별 결과물 색상(큐레이션 팔레트). 없으면 BlockRenderer가 브랜드 보라 폴백
    primary_color?: string;
    accent_color?: string;
    soft_color?: string;
    soft_border?: string;
  };
}

export interface ReferenceAnalysis {
  url: string;
  sections: string[];       // 섹션 순서 목록
  tone: string;             // 카피 톤앤매너
  headlinePattern: string;  // 헤드라인 패턴/문체
  emphasisPoints: string[]; // 주요 강조 포인트
  summary: string;          // 한 줄 요약
}

export interface CaptureSection {
  순서: number;
  타입: string;
  y시작: number;
  y끝: number;
  핵심메시지: string;
  카피톤: string;
  이미지무드: string;
  카피구조?: string;
  사용된키워드?: string[];
  강조포인트?: string;
  이미지스타일?: string;
  톤매너노트?: string;
}

export interface CaptureAnalysis {
  총섹션수: number;
  섹션목록: CaptureSection[];
  전체톤: string;
  브랜드무드: string;
}

export interface HistoryItem {
  id: string;
  productName: string;
  cat: string;
  ch: string;
  type: string;
  out: string;
  secCnt: number;
  createdAt: string;
  sections: Section[];
  sectionImages?: Record<string, string>;  // sec.num → data URL
  blockImages?: Record<string, string>;    // `${sec.num}#${blockIdx}` → data URL
}

interface AppState {
  screen: ScreenId;
  cat: string | null;
  ch: string | null;
  type: string | null;
  out: string | null;
  imgMode: string | null;
  secCnt: number;
  chatOpen: boolean;
  loggedIn: boolean;
  sections: Section[];
  productName: string;
  productExtra: string;
  productImages: string[]; // base64 data URLs (업로드된 제품 이미지)
  referenceAnalysis: ReferenceAnalysis | null;
  captureAnalysis: CaptureAnalysis | null;
  sectionStructure: string[];
  credits: number;
  creditModalOpen: boolean;
  restoredImages: Record<string, string>;
  restoredBlockImages: Record<string, string>;
  restoredOverrides: Record<string, unknown>;   // 인라인 편집(텍스트 override) 복원본
  sidebarCollapsed: boolean;
  regularPrice: string;
  salePrice: string;
  showPrice: boolean;
  productOptions: { name: string; values: string }[];
  brand: string;
  diff: string;
  extraNote: string;
  brandIntro: string;
  answers: Record<string, string | string[]>;
  aiSelections: string[];
}

interface AppContextType extends AppState {
  go: (id: ScreenId) => void;
  setCat: (v: string) => void;
  setCh: (v: string) => void;
  setType: (v: string) => void;
  setOut: (v: string) => void;
  setImgMode: (v: string) => void;
  setSecCnt: (v: number) => void;
  toggleChat: () => void;
  doLogin: () => void;
  startDetail: () => void;
  goAfterType: () => void;
  setSections: (s: Section[]) => void;
  setProductName: (v: string) => void;
  setProductExtra: (v: string) => void;
  setProductImages: (images: string[]) => void;
  setReferenceAnalysis: (a: ReferenceAnalysis | null) => void;
  setCaptureAnalysis: (a: CaptureAnalysis | null) => void;
  setSectionStructure: (v: string[]) => void;
  deductCredits: (amount?: number) => void;
  setCreditModalOpen: (v: boolean) => void;
  saveHistory: (data: { productName: string; cat: string; ch: string; type: string; out: string; secCnt: number; sections: Section[] }) => void;
  loadFromHistory: (item: HistoryItem) => void;
  updateLatestHistoryImages: (sectionImages: Record<string, string>, blockImages?: Record<string, string>) => void;
  updateLatestHistoryOverrides: (sectionOverrides: Record<string, unknown>) => void;   // 인라인 편집 영속화
  deleteHistoryImages: (id: string) => void;
  setSidebarCollapsed: (v: boolean) => void;
  setRegularPrice: (v: string) => void;
  setSalePrice: (v: string) => void;
  setShowPrice: (v: boolean) => void;
  setProductOptions: (v: { name: string; values: string }[]) => void;
  setBrand: (v: string) => void;
  setDiff: (v: string) => void;
  setExtraNote: (v: string) => void;
  setBrandIntro: (v: string) => void;
  setAnswers: React.Dispatch<React.SetStateAction<Record<string, string | string[]>>>;
  setAiSelections: React.Dispatch<React.SetStateAction<string[]>>;
}

const AppContext = createContext<AppContextType | null>(null);

export const CH_CFG: Record<string, { note: string; rec: string }> = {
  스마트스토어: { note: '💡 스마트스토어는 블로그형(글+그림) 구성이 SEO와 전환율에 핵심입니다.', rec: '기본형' },
  쿠팡: { note: '💡 쿠팡은 이미지 중심 구성이 핵심입니다. 기본형과 프리미엄형 모두 사용 가능해요.', rec: '기본형' },
  자사몰: { note: '💡 자사몰은 브랜드 세계관과 감성 카피가 중요합니다. 프리미엄형을 추천해요.', rec: '프리미엄형' },
  와디즈: { note: '💡 와디즈는 50장+ 긴 스크롤 스토리텔링이 기본입니다. 프리미엄형을 강력 추천해요.', rec: '프리미엄형' },
};

export const CH_OUT_AUTO: Record<string, { out: string; label: string }> = {
  쿠팡: { out: 'slide', label: '이미지 슬라이드형' },
  자사몰: { out: 'html', label: 'HTML 섹션형' },
  와디즈: { out: 'html', label: 'HTML 긴 스크롤형' },
};

export interface ImgCheckItem {
  img: string; lbl: string; req: boolean;
  name: string; reason: string; why: string;
}

export const IMG_CL: Record<string, Record<string, ImgCheckItem[]>> = {
  스마트스토어: {
    기본형: [
      { img: '🎯', lbl: '정면컷', req: true, name: '정면 누끼용 사진', reason: '상세페이지 히어로 섹션과 썸네일에 들어가는 핵심 이미지예요.', why: '누끼컷 추출 시 정면 사진이 가장 깔끔하게 나와요.' },
      { img: '↗️', lbl: '45도각도', req: true, name: '45도 각도 사진', reason: '제품의 입체감과 패키지 디자인을 보여주는 각도예요.', why: '정면만 있으면 상세페이지 내 이미지들이 단조로워 보여요.' },
      { img: '🔍', lbl: '디테일컷', req: true, name: '제품 디테일 클로즈업', reason: '성분표, 용량, 텍스처 등 구매 결정에 필요한 세부 정보를 보여줘요.', why: '디테일컷이 없으면 AI가 성분 신뢰 섹션에서 같은 정면 사진을 반복 사용하게 돼요.' },
      { img: '📦', lbl: '포장박스', req: false, name: '패키지/박스 전체 사진', reason: '선물용 포장이나 브랜드 패키지를 강조할 때 사용해요.', why: '있으면 선물 타겟 섹션과 CTA 구성에 활용돼요.' },
    ],
    프리미엄형: [
      { img: '🎯', lbl: '정면컷', req: true, name: '정면 누끼용 사진', reason: '히어로 + 썸네일 핵심 이미지', why: '누끼컷 기준 이미지로 가장 중요해요.' },
      { img: '↗️', lbl: '45도각도', req: true, name: '45도 각도 사진', reason: '입체감·패키지 표현', why: '다양한 섹션에 활용돼요.' },
      { img: '🔍', lbl: '디테일컷', req: true, name: '디테일 클로즈업', reason: '성분·텍스처 강조', why: '성분 신뢰 섹션 품질을 결정해요.' },
      { img: '🎨', lbl: '연출컷', req: true, name: '분위기 연출 사진 (배경 있음)', reason: '브랜드 감성을 담은 사용 장면이나 소품 배치 사진이에요.', why: '프리미엄형은 브랜드 세계관 섹션이 포함돼요.' },
      { img: '📦', lbl: '패키지', req: false, name: '패키지 전체 사진', reason: '브랜드 패키지 강조', why: '브랜드 스토리 섹션에 활용돼요.' },
    ],
  },
  쿠팡: {
    기본형: [
      { img: '⬜', lbl: '흰배경정면', req: true, name: '흰 배경 정면 사진', reason: '쿠팡은 흰 배경 이미지를 권장하고, 첫 번째 이미지가 전환율을 결정해요.', why: '쿠팡 알고리즘은 흰 배경 이미지를 선호해요.' },
      { img: '↗️', lbl: '45도각도', req: true, name: '45도 각도 사진', reason: '제품 크기·입체감 표현', why: '쿠팡 구매자는 빠른 스크롤 환경이라 다양한 각도가 필요해요.' },
      { img: '🔍', lbl: '디테일컷', req: true, name: '디테일 클로즈업', reason: '제품 스펙·재질 확인용', why: '디테일 각도가 없으면 여러 슬라이드에서 같은 사진이 반복돼요.' },
      { img: '📊', lbl: '스펙컷', req: false, name: '스펙/사이즈 비교 사진', reason: '스케일이나 크기를 직관적으로 보여줘요.', why: '스케일 비교 사진이 있으면 반품률을 낮출 수 있어요.' },
    ],
    프리미엄형: [
      { img: '⬜', lbl: '흰배경정면', req: true, name: '흰 배경 정면 사진', reason: '쿠팡 히어로 이미지 핵심', why: '쿠팡 알고리즘은 흰 배경 이미지를 선호해요.' },
      { img: '↗️', lbl: '45도각도', req: true, name: '45도 각도 사진', reason: '입체감 표현', why: '다양한 슬라이드 구성에 활용돼요.' },
      { img: '🔍', lbl: '디테일컷', req: true, name: '디테일 클로즈업', reason: '성분·스펙 강조', why: '슬라이드 섹션별 다양한 이미지 배치에 필요해요.' },
      { img: '🎨', lbl: '연출컷', req: true, name: '배경 연출 사진', reason: '프리미엄 브랜드 무드 연출', why: '프리미엄형은 감성 브랜딩 섹션이 포함돼요.' },
      { img: '📊', lbl: '스펙컷', req: false, name: '스펙/사이즈 비교 사진', reason: '크기·사양 직관적 표시', why: '반품률 감소에 효과적이에요.' },
    ],
  },
};

export interface CutItem {
  id: string; ico: string; name: string;
  tag: string; tagClass: string; desc: string;
  why: string; count: number; checked: boolean; disabled?: boolean;
}

export const TYPE_CUTS: Record<string, CutItem[]> = {
  기본형: [
    { id: 'nukki', ico: '✂️', name: '누끼컷', tag: '필수', tagClass: 'cut-req', desc: '배경 제거 · 히어로·썸네일 핵심 이미지', why: '누끼컷이 없으면 상세페이지 모든 섹션이 같은 배경 사진을 반복 사용하게 돼요.', count: 3, checked: true },
    { id: 'concept', ico: '🎨', name: '컨셉컷', tag: '권장', tagClass: 'cut-rec', desc: '카테고리 맞춤 배경 합성 · 브랜드 무드 연출', why: '컨셉컷이 있으면 각 섹션마다 다른 분위기를 연출할 수 있어요.', count: 2, checked: true },
    { id: 'thumb', ico: '🖼️', name: '썸네일컷', tag: '권장', tagClass: 'cut-rec', desc: '채널 최적화 썸네일 · 클릭률 직결', why: '썸네일이 구매자가 처음 보는 이미지예요.', count: 2, checked: true },
    { id: 'detail', ico: '🔍', name: '디테일컷', tag: '선택', tagClass: 'cut-opt', desc: '성분·텍스처 클로즈업 · 신뢰 구축', why: '디테일컷이 없으면 성분 신뢰 섹션에서 정면 사진이 반복돼요.', count: 1, checked: false },
    { id: 'model', ico: '👤', name: '모델컷', tag: '추후', tagClass: 'cut-opt', desc: 'AI 모델 착용·사용 이미지 · 준비 중', why: '', count: 1, checked: false, disabled: true },
    { id: 'gif', ico: '✨', name: 'GIF 모션컷', tag: '추후', tagClass: 'cut-opt', desc: '움직이는 제품 이미지 · 준비 중', why: '', count: 1, checked: false, disabled: true },
  ],
  프리미엄형: [
    { id: 'nukki', ico: '✂️', name: '누끼컷', tag: '필수', tagClass: 'cut-req', desc: '배경 제거 · 히어로·썸네일 핵심 이미지', why: '누끼컷이 없으면 상세페이지 모든 섹션이 같은 배경 사진을 반복 사용하게 돼요.', count: 5, checked: true },
    { id: 'concept', ico: '🎨', name: '컨셉컷', tag: '필수', tagClass: 'cut-req', desc: '카테고리 맞춤 배경 합성 · 브랜드 무드 연출', why: '프리미엄형은 브랜드 세계관 섹션이 포함돼요.', count: 4, checked: true },
    { id: 'thumb', ico: '🖼️', name: '썸네일컷', tag: '필수', tagClass: 'cut-req', desc: '채널 최적화 썸네일 3종', why: '프리미엄형에서 썸네일은 3종이에요.', count: 3, checked: true },
    { id: 'detail', ico: '🔍', name: '디테일컷', tag: '권장', tagClass: 'cut-rec', desc: '성분·텍스처 클로즈업 · 신뢰 구축', why: '프리미엄형 성분 인포그래픽 섹션에 필수적으로 쓰여요.', count: 2, checked: true },
    { id: 'lifestyle', ico: '🌿', name: '라이프스타일컷', tag: '권장', tagClass: 'cut-rec', desc: '실제 사용 장면 · 감성 연출', why: '프리미엄형은 브랜드 스토리와 라이프스타일 섹션이 포함돼요.', count: 2, checked: true },
    { id: 'model', ico: '👤', name: '모델컷', tag: '추후', tagClass: 'cut-opt', desc: 'AI 모델 착용·사용 이미지 · 준비 중', why: '', count: 1, checked: false, disabled: true },
    { id: 'gif', ico: '✨', name: 'GIF 모션컷', tag: '추후', tagClass: 'cut-opt', desc: '움직이는 제품 이미지 · 준비 중', why: '', count: 1, checked: false, disabled: true },
  ],
};

export const CHAT_A: Record<string, string> = {
  '카테고리 차이가 뭐예요?': '카테고리마다 기획 구조가 완전히 달라요! 화장품은 성분 신뢰·피부 고민 중심, 식품은 원산지·신선도 중심, 패션은 스타일·착용감 중심으로 자동 설계됩니다.',
  '블로그형이 뭐예요?': '스마트스토어 상세페이지에서 텍스트 카피와 이미지가 함께 나오는 블로그 스타일이에요. 네이버 SEO에 유리하고, 각 섹션마다 헤드라인 + 이미지 슬롯 + 본문이 세트로 구성돼요.',
  '이미지를 왜 여러 장 올려야 해요?': 'AI가 각 섹션마다 다른 이미지를 배치해야 제품 일관성이 유지돼요. 정면·45도·디테일 3가지만 있어도 퀄리티가 크게 올라가요!',
  '크레딧은 어떻게 써요?': '결과물 전체를 먼저 보고, 마음에 드시면 1크레딧으로 전체 다운로드하시면 돼요. 신규 가입 시 3크레딧 무료로 드려요!',
};

export const STEP_MAP: Record<string, number> = {
  s1: 1, s2: 2, s3: 3, s3b: 4, s5: 5, 's5-5': 6, 's5b': 7, s6: 8, s7: 9, s8: 10,
};

export function AppProvider({ children }: { children: ReactNode }) {
  const [screen, setScreen] = useState<ScreenId>('s0');
  const [cat, setCatState] = useState<string | null>(null);
  const [ch, setChState] = useState<string | null>(null);
  const [type, setTypeState] = useState<string | null>(null);
  const [out, setOutState] = useState<string | null>(null);
  const [imgMode, setImgModeState] = useState<string | null>(null);
  const [secCnt, setSecCntState] = useState(10);
  const [chatOpen, setChatOpen] = useState(false);
  const [sections, setSections] = useState<Section[]>([]);
  const [restoredImages, setRestoredImages] = useState<Record<string, string>>({});
  const [restoredBlockImages, setRestoredBlockImages] = useState<Record<string, string>>({});
  const [restoredOverrides, setRestoredOverrides] = useState<Record<string, unknown>>({});

  /* ── NextAuth 세션 기반 로그인 상태 ── */
  const { data: session, status } = useSession();
  const loggedIn = status === 'authenticated';
  const [credits, setCreditsState] = useState<number>(30);
  const [creditModalOpen, setCreditModalOpenState] = useState(false);
  const [productName, setProductNameState] = useState('');
  const [productExtra, setProductExtraState] = useState('');
  const [productImages, setProductImagesState] = useState<string[]>([]);
  const [referenceAnalysis, setReferenceAnalysisState] = useState<ReferenceAnalysis | null>(null);
  const [captureAnalysis, setCaptureAnalysisState] = useState<CaptureAnalysis | null>(null);
  const [sectionStructure, setSectionStructureState] = useState<string[]>([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [regularPrice, setRegularPrice] = useState('');
  const [salePrice, setSalePrice] = useState('');
  const [showPrice, setShowPrice] = useState(false);
  const [productOptions, setProductOptions] = useState<{ name: string; values: string }[]>([]);
  const [brand, setBrand] = useState('');
  const [diff, setDiff] = useState('');
  const [extraNote, setExtraNote] = useState('');
  const [brandIntro, setBrandIntro] = useState('');
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [aiSelections, setAiSelections] = useState<string[]>([]);

  /* 크레딧 localStorage 초기화 — 신규 유저 30 지급 */
  useEffect(() => {
    if (status === 'authenticated') {
      try {
        const email = session?.user?.email ?? 'guest';
        const key = `pc_cr_${email}`;
        const stored = localStorage.getItem(key);
        if (stored === null) {
          localStorage.setItem(key, '30');
          setCreditsState(30);
        } else {
          const parsed = parseInt(stored, 10);
          setCreditsState(Number.isFinite(parsed) ? parsed : 0);
        }
      } catch {
        // Safari private mode 등 localStorage 접근 불가 시 기본값 유지
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, session?.user?.email]);

  const deductCredits = (amount = 10) => {
    const email = session?.user?.email ?? 'guest';
    const key = `pc_cr_${email}`;
    setCreditsState(prev => {
      const next = Math.max(0, prev - amount);
      try { localStorage.setItem(key, String(next)); } catch { /* no-op */ }
      return next;
    });
  };

  const saveHistory = (data: { productName: string; cat: string; ch: string; type: string; out: string; secCnt: number; sections: Section[] }) => {
    const email = session?.user?.email ?? 'guest';
    const key = `pc_history_${email}`;
    try {
      const existing: HistoryItem[] = JSON.parse(localStorage.getItem(key) || '[]');
      const newItem: HistoryItem = {
        ...data,
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
      };
      // 텍스트 메타만 — 이미지는 IndexedDB로 분리(updateLatestHistoryImages에서 처리)
      const updated = [newItem, ...existing].slice(0, 20);
      try {
        localStorage.setItem(key, JSON.stringify(updated));
      } catch (e) {
        console.warn('[saveHistory] localStorage 저장 실패:', e);
      }
    } catch {
      // JSON 파싱 실패 등 — 무시
    }
  };

  const updateLatestHistoryImages = (sectionImages: Record<string, string>, blockImages?: Record<string, string>) => {
    const email = session?.user?.email ?? 'guest';
    const key = `pc_history_${email}`;
    try {
      const existing: HistoryItem[] = JSON.parse(localStorage.getItem(key) || '[]');
      if (existing.length === 0) return;
      const id = existing[0].id;
      // 이미지는 IndexedDB로 — 내부 키 단위 깊은 병합(mergeImages)으로 섹션별 '증분 저장' 지원.
      // (얕은 병합 patchImages는 1장씩 저장 시 앞 장을 덮어쓰므로 사용 불가. sectionOverrides 등 top-level은 보존됨.)
      mergeImages(id, { sectionImages, blockImages }).catch(e => {
        console.warn('[updateLatestHistoryImages] IndexedDB 저장 실패(텍스트 기록은 살아있음):', e);
      });
    } catch (e) {
      console.warn('[updateLatestHistoryImages] localStorage 읽기 실패:', e);
    }
  };

  // 인라인 편집(sectionOverrides) 영속화 — 이미지와 같은 IndexedDB 레코드에 병합 저장(이미지 안 깨짐). AI 호출 0.
  const updateLatestHistoryOverrides = (sectionOverrides: Record<string, unknown>) => {
    const email = session?.user?.email ?? 'guest';
    const key = `pc_history_${email}`;
    try {
      const existing: HistoryItem[] = JSON.parse(localStorage.getItem(key) || '[]');
      if (existing.length === 0) return;
      const id = existing[0].id;
      patchImages(id, { sectionOverrides }).catch(e => {
        console.warn('[updateLatestHistoryOverrides] IndexedDB 저장 실패:', e);
      });
    } catch (e) {
      console.warn('[updateLatestHistoryOverrides] localStorage 읽기 실패:', e);
    }
  };

  const loadFromHistory = (item: HistoryItem) => {
    // 동기 텍스트 메타 먼저 — 화면 전환 직후 ResultScreen이 sections를 바로 읽을 수 있게
    setCatState(item.cat);
    setChState(item.ch);
    setTypeState(item.type);
    setOutState(item.out);
    setSecCntState(item.secCnt);
    setProductNameState(item.productName);
    setProductExtraState('');
    setProductImagesState([]);
    setReferenceAnalysisState(null);
    setCaptureAnalysisState(null);
    setSectionStructureState([]);
    setBrand('');
    setDiff('');
    setExtraNote('');
    setBrandIntro('');
    setAnswers({});
    setAiSelections([]);
    setSections(item.sections);

    // 이미지는 IndexedDB 비동기 로드. 동시에 옛 localStorage 박힌 이미지도 폴백 사용(마이그 미완 케이스).
    (async () => {
      let secImgs = item.sectionImages ?? {};
      let blkImgs = item.blockImages ?? {};
      let overrides: Record<string, unknown> = {};
      try {
        const stored = await getImages(item.id);
        if (stored?.sectionImages) secImgs = { ...secImgs, ...stored.sectionImages };
        if (stored?.blockImages)   blkImgs = { ...blkImgs, ...stored.blockImages };
        if (stored?.sectionOverrides) overrides = stored.sectionOverrides;
      } catch (e) {
        console.warn('[loadFromHistory] IndexedDB 읽기 실패 — 텍스트 기록만 복원:', e);
      }
      setRestoredImages(secImgs);
      setRestoredBlockImages(blkImgs);
      setRestoredOverrides(overrides);   // 편집한 텍스트 복원
      go('s8');
    })();
  };

  const deleteHistoryImages = (id: string) => {
    deleteImages(id).catch(e => {
      console.warn('[deleteHistoryImages] IndexedDB 삭제 실패:', e);
    });
  };

  // 최초 1회 마이그레이션 — 옛 localStorage 박힌 이미지를 IndexedDB로 이전 후 localStorage에서 제거.
  // session 변경(로그인/로그아웃) 시마다 해당 이메일 키에 대해 수행. IndexedDB 실패 시 그대로 둠(다음 기회).
  useEffect(() => {
    const email = session?.user?.email ?? 'guest';
    const key = `pc_history_${email}`;
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return;
      const arr: HistoryItem[] = JSON.parse(raw);
      const dirty = arr.filter(h => h.sectionImages || h.blockImages);
      if (dirty.length === 0) return;
      (async () => {
        let migrated = 0;
        for (const h of dirty) {
          try {
            await saveImages(h.id, { sectionImages: h.sectionImages, blockImages: h.blockImages });
            migrated++;
          } catch (e) {
            console.warn('[history migration] IndexedDB 저장 실패, 이번엔 건너뜀:', h.id, e);
          }
        }
        if (migrated === 0) return;
        const stripped = arr.map(h => {
          const { sectionImages: _s, blockImages: _b, ...rest } = h;
          void _s; void _b;
          return rest as HistoryItem;
        });
        try {
          localStorage.setItem(key, JSON.stringify(stripped));
          console.log(`[history migration] ${migrated}건 IndexedDB로 이전 완료, localStorage 이미지 필드 제거`);
        } catch (e) {
          console.warn('[history migration] localStorage 재저장 실패:', e);
        }
      })();
    } catch (e) {
      console.warn('[history migration] 파싱 실패:', e);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.email]);

  const go = (id: ScreenId) => {
    window.history.pushState({ screen: id }, '');
    setScreen(id);
    window.scrollTo(0, 0);
  };

  // 브라우저 뒤로가기/앞으로가기 처리
  useEffect(() => {
    // 이미 유효한 screen 상태가 있으면 덮어쓰지 않음
    // (리마운트 시 현재 화면이 's0'으로 리셋되는 버그 방지)
    if (!window.history.state?.screen) {
      window.history.replaceState({ screen: 's0' }, '');
    }

    let nullSkips = 0;
    const onPop = (e: PopStateEvent) => {
      const id = e.state?.screen as ScreenId | undefined;
      if (id) {
        nullSkips = 0;
        setScreen(id);
      } else if (nullSkips < 3) {
        // Next.js 내부 엔트리 등 screen state 없는 팬텀 엔트리 — 건너뜀
        nullSkips++;
        window.history.go(-1);
      } else {
        nullSkips = 0;
        setScreen('s0');
      }
    };

    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  /* 세션 인증 완료 시 자동으로 대시보드로 이동 */
  useEffect(() => {
    if (status === 'authenticated') {
      setScreen(prev => {
        if (prev === 's0') {
          window.history.replaceState({ screen: 's-dash' }, '');
          window.scrollTo(0, 0);
          return 's-dash';
        }
        return prev;
      });
    }
  }, [status]);

  /* 하위 호환성 유지 — LoginScreen에서 직접 signIn() 호출로 대체됨 */
  const doLogin = () => go('s-dash');

  const startDetail = () => {
    setCatState(null);
    setChState(null);
    setTypeState(null);
    setOutState(null);
    setImgModeState(null);
    setSecCntState(10);
    setProductNameState('');
    setProductExtraState('');
    setProductImagesState([]);
    setReferenceAnalysisState(null);
    setCaptureAnalysisState(null);
    setSectionStructureState([]);
    setSections([]);
    setRestoredImages({});
    setRestoredBlockImages({});
    setRestoredOverrides({});
    setRegularPrice('');
    setSalePrice('');
    setShowPrice(false);
    setProductOptions([]);
    setBrand('');
    setDiff('');
    setExtraNote('');
    setBrandIntro('');
    setAnswers({});
    setAiSelections([]);
    go('s1');
  };

  const goAfterType = () => {
    if (ch === '스마트스토어') {
      go('s3b');
    } else {
      const auto = CH_OUT_AUTO[ch || ''];
      if (auto) setOutState(auto.out);
      go('s5');
    }
  };

  return (
    <AppContext.Provider value={{
      screen, cat, ch, type, out, imgMode, secCnt, chatOpen, loggedIn, sections, productName, productExtra, productImages, referenceAnalysis, captureAnalysis, sectionStructure,
      credits, creditModalOpen, restoredImages, restoredBlockImages, restoredOverrides, sidebarCollapsed, regularPrice, salePrice, showPrice, productOptions,
      brand, diff, extraNote, brandIntro, answers, aiSelections,
      go,
      setCat: setCatState,
      setCh: setChState,
      setType: setTypeState,
      setOut: setOutState,
      setImgMode: setImgModeState,
      setSecCnt: setSecCntState,
      toggleChat: () => setChatOpen(p => !p),
      doLogin,
      startDetail,
      goAfterType,
      setSections,
      setProductExtra: setProductExtraState,
      setProductName: setProductNameState,
      setProductImages: setProductImagesState,
      setReferenceAnalysis: setReferenceAnalysisState,
      setCaptureAnalysis: setCaptureAnalysisState,
      setSectionStructure: setSectionStructureState,
      deductCredits,
      setCreditModalOpen: setCreditModalOpenState,
      saveHistory,
      loadFromHistory,
      updateLatestHistoryImages,
      updateLatestHistoryOverrides,
      deleteHistoryImages,
      setSidebarCollapsed,
      setRegularPrice,
      setSalePrice,
      setShowPrice,
      setProductOptions,
      setBrand,
      setDiff,
      setExtraNote,
      setBrandIntro,
      setAnswers,
      setAiSelections,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
