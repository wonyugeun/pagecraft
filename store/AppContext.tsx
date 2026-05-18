'use client';

import React, { createContext, useContext, useState, useRef, ReactNode } from 'react';

export type ScreenId =
  | 's0' | 's-dash' | 's-quick' | 's-thumb'
  | 's1' | 's2' | 's3' | 's3b' | 's4' | 's5' | 's5-5' | 's6' | 's7';

export interface Section {
  num: string;
  name: string;
  headline: string;
  body: string;
  imageLabel: string;
  imageDesc: string;
}

export interface ReferenceAnalysis {
  url: string;
  sections: string[];       // 섹션 순서 목록
  tone: string;             // 카피 톤앤매너
  headlinePattern: string;  // 헤드라인 패턴/문체
  emphasisPoints: string[]; // 주요 강조 포인트
  summary: string;          // 한 줄 요약
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
  s1: 1, s2: 2, s3: 3, s3b: 4, s4: 5, s5: 6, 's5-5': 7, s6: 8, s7: 9,
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
  const [loggedIn, setLoggedIn] = useState(false);
  const [sections, setSections] = useState<Section[]>([]);
  const [productName, setProductNameState] = useState('');
  const [productExtra, setProductExtraState] = useState('');
  const [productImages, setProductImagesState] = useState<string[]>([]);
  const [referenceAnalysis, setReferenceAnalysisState] = useState<ReferenceAnalysis | null>(null);

  const go = (id: ScreenId) => {
    setScreen(id);
    window.scrollTo(0, 0);
  };

  const doLogin = () => {
    setLoggedIn(true);
    go('s-dash');
  };

  const startDetail = () => {
    go('s1');
  };

  const goAfterType = () => {
    if (ch === '스마트스토어') {
      go('s3b');
    } else {
      const auto = CH_OUT_AUTO[ch || ''];
      if (auto) setOutState(auto.out);
      go('s4');
    }
  };

  return (
    <AppContext.Provider value={{
      screen, cat, ch, type, out, imgMode, secCnt, chatOpen, loggedIn, sections, productName, productExtra, productImages, referenceAnalysis,
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
