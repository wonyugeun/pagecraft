'use client';

import { useState, useRef } from 'react';
import { useApp } from '@/store/AppContext';
import ProductMobile from './ProductMobile';
import { CatBlogPreview, CatSlidePreview } from './CategoryPreview';
import { useIsMobile } from '@/hooks/useIsMobile';
import { ChevronDown, ChevronUp, Sparkles, ArrowLeft, RefreshCw, X } from 'lucide-react';

/* ─────────────────────────────────────────────
   타입 정의
───────────────────────────────────────────── */
export type QMode = 'single' | 'multi' | 'text' | 'textarea' | 'origin' | 'legal';

export interface Question {
  id: string;
  label: string;
  req: boolean;
  mode: QMode;
  hint?: string;
  opts?: string[];
  fields?: string[];
  placeholder?: string;
  sectionTitle?: string;
  legalTitle?: string;   // legal mode 박스 제목(없으면 화장품 기본 문구)
  legalDesc?: string;    // legal mode 박스 설명(없으면 화장품 기본 문구)
}

/* ─────────────────────────────────────────────
   카테고리별 질문 정의
───────────────────────────────────────────── */
export const CQ: Record<string, Question[]> = {
  화장품: [
    {
      id: 'c1', label: '화장품 종류', req: true, mode: 'single',
      hint: '선택한 종류에 맞는 섹션 구조가 달라져요',
      opts: ['스킨/토너','세럼/앰플','크림/로션','아이크림','선케어(SPF)','클렌징폼','클렌징오일/밤','마스크팩','에센스','미스트/스프레이','색조 — 베이스(파운데이션/쿠션)','색조 — 포인트(립/아이)','바디로션/크림','헤어케어','남성 전용 스킨케어'],
    },
    {
      id: 'c2', label: '주요 피부 고민', req: true, mode: 'multi',
      hint: '선택 고민 → 히어로 카피 + 공감 섹션 문구에 직접 반영',
      opts: ['건조함/수분 부족','트러블/여드름성','민감성/자극 잦은','주름/탄력 저하','미백/칙칙한 피부톤','모공/피지 과다','복합성 피부','아토피/건선','색소침착/기미','눈가 다크서클/잔주름','피부 재생/상처케어','각질/건조함','두피/탈모','남성 피부고민','기타 직접입력'],
    },
    {
      id: 'c3', label: '핵심 성분', req: true, mode: 'multi',
      hint: '선택 성분 → 성분 신뢰 섹션 + 인포그래픽 자동 배치',
      opts: ['히알루론산(수분)','나이아신아마이드(미백/모공)','레티놀/레티닐(주름)','비타민C(미백)','병풀 추출물(진정)','펩타이드(탄력)','세라마이드(장벽)','살리실산 BHA(각질/여드름)','AHA(글리콜산/젖산)','아데노신(주름)','마데카소사이드(재생)','판테놀(수분/진정)','스쿠알란(보습)','EGF/성장인자','프로바이오틱스','녹차 추출물','알로에 베라','직접 입력'],
    },
    {
      id: 'c4', label: '인증 및 특징', req: false, mode: 'multi',
      hint: '인증·특징 → 신뢰 배지 섹션에 자동 삽입',
      opts: ['무알콜','무향(프래그런스 프리)','무색소','무방부제(파라벤프리)','피부과 테스트 완료','비건 인증','EWG 그린등급','식약처 기능성 — 미백','식약처 기능성 — 주름개선','식약처 기능성 — 자외선차단','특허 성분/기술 보유','국내 제조','유기농 원료','크루얼티프리','더마/피부과 코스메틱','임상실험 완료','알레르기 테스트 완료'],
    },
    {
      id: 'c5', label: '브랜드/제품 탄생 스토리', req: false, mode: 'textarea',
      placeholder: '예: 아토피로 고생한 창업자가 10년간 성분 연구 끝에 만든 토너입니다...',
      hint: '있으면 브랜드 스토리 섹션 + 와디즈형 서사 구조에 자동 반영',
    },
    {
      id: 'c6', label: '주요 타겟', req: false, mode: 'multi',
      opts: ['10대','20대 초반','20대 후반~30대','40대','50대 이상','남성','임산부/수유부','민감성 피부 전용','시니어'],
    },
    {
      id: 'c7', label: '브랜드 포지셔닝', req: false, mode: 'single',
      hint: '포지셔닝 → 카피 톤과 비주얼 무드에 반영',
      opts: ['가성비 (합리적 가격 강조)','중간 (가성비+품질 균형)','프리미엄 (품질/브랜드 강조)','더마/전문가 브랜드 (임상·전문성 강조)','자연주의/에코 브랜드'],
    },
    {
      id: 'c9', label: '⚠️ 법적 고지 (화장품 필수 표시)', req: true, mode: 'legal',
      fields: ['제조사명','제조국','사용기한 또는 개봉 후 사용기간'],
      hint: '화장품법에 의거 상세페이지 하단에 자동 법적 고지 섹션이 생성됩니다',
    },
    {
      id: 'c10', label: '기타 추가 정보', req: false, mode: 'textarea',
      placeholder: '예: 성분 배합 특이사항, 사용 순서, 피부 타입별 사용법...',
      hint: '성분·사용법·주의사항 등 AI에게 전달할 추가 정보를 입력하세요',
    },
  ],

  식품: [
    {
      id: 'f1', label: '식품 종류', req: true, mode: 'single',
      hint: '선택한 종류에 맞는 섹션 구조가 달라져요',
      opts: ['신선채소/과일','축산물(소/돼지/닭)','수산물/해산물','곡물/견과/건과','건강기능식품','간편식/HMR','음료/차/주스','발효식품(김치/장류)','냉동식품','유제품/달걀','과자/스낵','소스/양념/오일','반찬류','기타 가공식품'],
    },
    {
      id: 'f2', label: '주요 타겟', req: true, mode: 'multi',
      hint: '타겟 → 히어로 카피 + 공감 섹션 문구에 직접 반영',
      opts: ['1인가구','다이어터/건강관리','가족(아이 있음)','시니어(60대+)','MZ세대','임산부/수유부','운동인/헬스인','비건/채식인'],
    },
    {
      id: 'f3', label: '인증/특징', req: true, mode: 'multi',
      hint: '인증·특징 → 신뢰 배지 섹션에 자동 삽입',
      opts: ['HACCP인증','GAP인증(농산물우수관리)','유기농인증','무농약인증','친환경인증','비건인증','무첨가(방부제·색소)','국내산','저칼로리/저당','글루텐프리','Non-GMO','코셔/할랄'],
    },
    {
      id: 'f4', label: '판매 포인트', req: true, mode: 'multi',
      hint: '판매 포인트 → 구매 이유 섹션 + CTA 카피에 반영',
      opts: ['산지직송','당일배송','새벽배송','정기구독 가능','선물세트 구성','소용량 판매','대용량/업소용','산지직거래','당일도축/당일수확'],
    },
    {
      id: 'f5', label: '원산지 정보', req: true, mode: 'origin',
      hint: '원산지는 상세페이지에 법적으로 반드시 표시됩니다',
      opts: ['국내산','수입산','국내산+수입산 혼합'],
    },
    {
      id: 'f5b', label: '보관 방법', req: false, mode: 'multi',
      hint: '보관 방법 → 제품 안내 섹션 + 구매 안심 카피에 반영',
      opts: ['냉장보관(0~10℃)','냉동보관(-18℃ 이하)','실온보관','직사광선 피해 서늘한 곳','개봉 후 냉장 보관','개봉 후 밀봉 보관','진공포장 유지'],
    },
    {
      id: 'f6', label: '알레르기 유발 원료', req: true, mode: 'multi',
      hint: '법적 의무 표시 — 하단 법적 고지 섹션에 자동 생성',
      opts: ['밀/글루텐','대두(콩)','우유','달걀','갑각류(새우/게)','견과류','땅콩','복숭아','토마토','해산물','메밀','해당 없음'],
    },
    {
      id: 'f6b', label: '유통기한 표시 방식', req: false, mode: 'single',
      hint: '유통기한 형태 → 법적 고지 섹션 문구에 반영',
      opts: ['제조일로부터 기간 표시','소비기한(날짜) 표시','개봉 후 사용기한 별도','유통기한+개봉 후 기한 병기'],
    },
    {
      id: 'f8', label: '기타 추가 정보', req: false, mode: 'textarea',
      placeholder: '예: 냉동 배송, 소분 판매, 유통기한 제조일로부터 12개월, 개봉 후 냉장 보관...',
      hint: '보관·섭취 방법, 특이사항 등 AI에게 전달할 추가 정보를 자유롭게 입력하세요',
    },
  ],

  패션: [
    {
      id: 'fa1', label: '상품 종류', req: true, mode: 'single',
      hint: '선택한 종류에 맞는 섹션 구조가 달라져요',
      opts: ['상의(티셔츠/셔츠/블라우스)','하의(팬츠/스커트)','아우터(자켓/코트/점퍼)','원피스/점프수트','세트 구성','신발(운동화/구두/부츠/샌들)','가방/지갑','액세서리(모자/벨트/스카프/주얼리)','속옷/홈웨어/잠옷'],
    },
    {
      id: 'fa2', label: '스타일', req: true, mode: 'multi',
      hint: '스타일 무드 → 비주얼 방향 + 카피 톤에 반영',
      opts: ['캐주얼','오피스/비즈니스룩','스트릿/힙합','미니멀','빈티지/레트로','스포티/애슬레저','페미닌/로맨틱','고프코어/아웃도어','럭셔리/하이엔드'],
    },
    {
      id: 'fa3', label: '소재', req: true, mode: 'multi',
      hint: '소재 → 제품 신뢰 섹션 + 상세 스펙에 반영',
      opts: ['면/코튼(100%)','면 혼방','폴리에스터','울/캐시미어/니트','린넨/리넨','실크/새틴','레이온/비스코스','데님','가죽(천연)','PU가죽(인조)','쉬폰','기능성 원단','친환경/재생 소재'],
    },
    {
      id: 'fa3b', label: '핏', req: false, mode: 'single',
      hint: '핏 → 사이즈 안내 섹션 + 착용 카피에 반영',
      opts: ['오버핏','루즈핏','레귤러핏','슬림핏','스키니','와이드'],
    },
    {
      id: 'fa3c', label: '시즌', req: false, mode: 'multi',
      opts: ['봄/여름(SS)','가을/겨울(FW)','사계절(시즌리스)'],
    },
    {
      id: 'fa4', label: '타겟 성별/연령', req: true, mode: 'multi',
      hint: '타겟 → 히어로 카피 + 착용 연출 이미지 방향에 반영',
      opts: ['10대','20대','30대','40대이상','남성','여성','남녀공용(유니섹스)'],
    },
    {
      id: 'fa4b', label: '세탁 방법', req: false, mode: 'multi',
      hint: '세탁 방법 → 제품 관리 안내 섹션에 반영',
      opts: ['세탁기 가능','손세탁 권장','드라이클리닝 전용','단독세탁','뒤집어 세탁','30℃ 이하 냉수 세탁'],
    },
    {
      id: 'fa5', label: '핵심 특징', req: false, mode: 'multi',
      opts: ['국내 제조(MADE IN KOREA)','핸드메이드','빅사이즈 전문(XL~3XL)','체형 커버 디자인','구김 거의 없음','UV 차단','흡습속건','친환경/비건 소재','사이즈 교환 무료','30일 무료 반품'],
    },
    {
      id: 'fa7', label: '기타 추가 정보', req: false, mode: 'textarea',
      placeholder: '예: 사이즈 측정 오차 ±2cm, 색상은 모니터에 따라 실물과 다를 수 있음, 드라이클리닝 권장...',
      hint: '사이즈·세탁·컬러 안내 등 AI에게 전달할 추가 정보를 입력하세요',
    },
  ],

  생활: [
    {
      id: 'lv1', label: '상품 종류', req: true, mode: 'single',
      hint: '선택한 종류에 맞는 섹션 구조가 달라져요',
      opts: ['가구(의자/테이블/수납)','조명(스탠드/무드등/천장등)','침구/커튼/러그','주방용품(냄비/그릇/도마)','욕실용품','청소용품(청소기/걸레)','수납/정리용품','인테리어 소품','향/디퓨저/캔들','반려식물/화분'],
    },
    {
      id: 'lv2', label: '스타일', req: true, mode: 'multi',
      hint: '스타일 → 비주얼 무드 + 카피 톤에 반영',
      opts: ['북유럽/스칸디나비아','모던/심플','빈티지/레트로','내추럴/우드','미니멀','인더스트리얼','한국전통/한옥','지중해풍','아이방/키즈'],
    },
    {
      id: 'lv3', label: '소재', req: false, mode: 'multi',
      hint: '소재 → 제품 신뢰 섹션 + 상세 스펙에 반영',
      opts: ['원목(참나무/소나무/월넛)','MDF/합판','플라스틱/PP/ABS','스테인리스(SUS304)','알루미늄','패브릭/폴리에스터','유리(강화유리)','세라믹/도자기','대나무/등나무','실리콘','고무/EVA'],
    },
    {
      id: 'lv3b', label: '설치/사용 방법', req: false, mode: 'single',
      hint: '설치 방법 → 구매 편의성 섹션에 반영',
      opts: ['완제품(바로 사용)','조립 필요(DIY, 30분 이내)','조립 필요(DIY, 1시간+)','전문 기사 설치','부착형(양면테이프/나사)','벽걸이/매립형'],
    },
    {
      id: 'lv3c', label: '인증', req: false, mode: 'multi',
      hint: '인증 → 신뢰 배지 섹션에 자동 삽입',
      opts: ['KC인증','환경마크(친환경인증)','항균·항바이러스 인증','우수재활용제품(GR)','OEKO-TEX 인증','FDA 승인','식품접촉 안전 소재'],
    },
    {
      id: 'lv4', label: '특징', req: true, mode: 'multi',
      hint: '특징 → 신뢰 섹션 + 구매 결정 포인트에 반영',
      opts: ['국내 제조','친환경/무독성','항균/항바이러스','방수/방습','스크래치 방지','맞춤제작 가능','AS 보장(1년+)','선물 포장 가능','다용도'],
    },
    {
      id: 'lv4b', label: '사이즈 구성', req: false, mode: 'single',
      opts: ['1가지 사이즈(단품)','2~3가지 사이즈 선택','4가지 이상 사이즈','맞춤 사이즈 제작 가능'],
    },
    {
      id: 'lv5', label: '주요 타겟', req: false, mode: 'multi',
      opts: ['1인 가구','신혼부부','가족(자녀 있음)','인테리어 관심 고객','반려동물 가정','B2B/사업자(카페/사무실)','시니어'],
    },
    {
      id: 'lv7', label: '기타 추가 정보', req: false, mode: 'textarea',
      placeholder: '예: 사이즈별 중량 상이, 배송 시 박스 포장, 반품 시 조립 상태여야 함, 실내 전용...',
      hint: '조립·배송·주의사항 등 AI에게 전달할 추가 정보를 입력하세요',
    },
  ],

  가전: [
    // ── 제품 상세 ──
    {
      id: 'dg1', label: '상품 종류', req: true, mode: 'single',
      sectionTitle: '제품 상세',
      opts: ['주방가전(냉장고/전자레인지/밥솥)','청소기/공기청정기/제습기','세탁기/건조기','미용가전(드라이어/고데기/제모기)','스마트홈/IoT 기기','컴퓨터/노트북/모니터','스마트폰/태블릿','음향기기(스피커/이어폰/헤드폰)','카메라/영상기기','계절가전(에어컨/선풍기/히터/가습기)'],
    },
    {
      id: 'dg2', label: '핵심 스펙', req: true, mode: 'textarea',
      placeholder: '예: 흡입력 25000Pa, 배터리 60분, 무게 3.1kg',
      hint: '스펙 수치 → 비교표 섹션 + 히어로 서브카피에 자동 반영',
    },
    {
      id: 'dg3', label: '주요 기능', req: true, mode: 'multi',
      hint: '기능 → USP 섹션 + 비교표에 우선 배치',
      opts: ['스마트/앱 연동','저소음(45dB 이하)','에너지 절약','자동세척/청소','음성인식(AI)','타이머/예약기능','자동 모드 전환','원격제어','물세척 가능','접이식/컴팩트 설계'],
    },
    {
      id: 'dg3b', label: '에너지 효율 등급', req: false, mode: 'single',
      hint: '에너지등급 → 신뢰 배지 + 절약 강조 카피에 반영',
      opts: ['1등급','2등급','3등급','해당 없음(소형가전)','에너지스타 인증'],
    },
    {
      id: 'dg3c', label: '설치/사용 방법', req: false, mode: 'single',
      hint: '설치 방법 → 구매 편의성 섹션에 반영',
      opts: ['셀프 설치(플러그인)','간단 조립 후 사용','전문 기사 설치','거치형(이동 가능)','벽걸이/매립형','내장 배터리(무선 사용)'],
    },
    {
      id: 'dg4', label: '차별화 기술/특허', req: false, mode: 'text',
      placeholder: '예: 독자개발 사이클론 기술, 먼지감지 자동조절',
      hint: '기술·특허 → 신뢰 섹션 + 기술 강조 배지에 반영',
    },
    // ── 신뢰/인증 ──
    {
      id: 'dg5', label: '안전/인증', req: true, mode: 'multi',
      sectionTitle: '신뢰/인증',
      hint: '인증 → 신뢰 배지 섹션에 자동 삽입',
      opts: ['KC안전인증','에너지효율 1등급','전기용품안전법 준수','방수/방진(IP67)','방수(IPX4)','RoHS(유해물질 제한)','CE인증(유럽)','FCC인증(미국)','정품보증 QR'],
    },
    {
      id: 'dg5b', label: '보증 기간', req: false, mode: 'single',
      hint: '보증기간 → 신뢰 섹션 + 구매 결정 포인트에 반영',
      opts: ['6개월','1년','2년','3년 이상','무상 AS 별도 문의'],
    },
    {
      id: 'dg5c', label: '호환성', req: false, mode: 'multi',
      hint: '호환성 → 스펙 섹션 + 구매 안내에 반영',
      opts: ['iOS/안드로이드 공통','안드로이드 전용','iOS 전용','국내 전압(220V)','해외 겸용(110~240V)','스마트홈 플랫폼 연동','기존 제품 호환 부품'],
    },
    {
      id: 'dg6', label: '수상/언론', req: false, mode: 'text',
      placeholder: '예: 2024 레드닷 디자인어워드 수상',
      hint: '수상·언론 → 브랜드 신뢰 섹션에 반영',
    },
    // ── 판매 전략 ──
    {
      id: 'dg7', label: '핵심 USP', req: true, mode: 'single',
      sectionTitle: '판매 전략',
      hint: '가장 강조할 포인트 — 비교표 섹션의 핵심',
      opts: ['가격 대비 성능(가성비)','프리미엄 품질/내구성','특허 기술 보유','국내 브랜드 신뢰','배터리 성능 압도','소음 최소화','디자인/경량화','에너지 절약'],
    },
    {
      id: 'dg8', label: '경쟁 제품 대비 차별점', req: true, mode: 'textarea',
      placeholder: '예: 타사 대비 흡입력 30% 높고 소음은 20% 낮음, 2년 무상 AS',
      hint: '차별점 → 비교 섹션 + 구매 설득 섹션에 핵심 카피로 반영',
    },
    {
      id: 'dg9', label: '주요 타겟', req: false, mode: 'multi',
      hint: '타겟 → 히어로 카피 + 공감 섹션 문구에 반영',
      opts: ['1인가구','신혼부부','맞벌이부부','청소/정리 전문가','반려동물 가정','대가족','시니어(60대+)','사무실/B2B'],
    },
    // ── 법적 고지 ──
    {
      id: 'dg10', label: '주의사항/법적 고지', req: false, mode: 'textarea',
      sectionTitle: '법적 고지',
      placeholder: '예: 전기용품안전법 준수, 어린이 손에 닿지 않는 곳 보관',
      hint: 'KC인증번호·전기용품안전법 등 법적 필수 표시 → 하단 법적 고지 섹션에 자동 생성',
    },
    {
      id: 'dg11', label: '기타 추가 정보', req: false, mode: 'textarea',
      placeholder: '예: 전압 정보, 소음 수준 상세, 주의사항 보완...',
      hint: '전압·소음·설치·주의사항 등 AI에게 전달할 추가 정보를 입력하세요',
    },
  ],

  반려동물: [
    {
      id: 'pt1', label: '상품 종류', req: true, mode: 'single',
      hint: '선택한 종류에 맞는 섹션 구조가 달라져요',
      opts: ['사료/주식','간식/져키','영양제/보조식품','장난감/놀이용품','용품(밥그릇/모래/패드)','의류/패션','미용용품(브러시/샴푸)','이동용품(캐리어/하네스)','케이지/하우스','훈련용품'],
    },
    {
      id: 'pt2', label: '타겟 동물', req: true, mode: 'multi',
      hint: '동물 종류 → 히어로 카피 + 이미지 방향에 반영',
      opts: ['강아지(소형 5kg 이하)','강아지(중·대형 5kg+)','고양이','소동물(토끼/햄스터/기니피그)','파충류/어류','새/조류','공통(멀티펫)'],
    },
    {
      id: 'pt3', label: '대상 연령', req: true, mode: 'single',
      hint: '연령대 → 영양 섹션 + 공감 카피에 반영',
      opts: ['퍼피/키튼(0~12개월)','성견/성묘(1~6살)','중령견묘(7~10살)','노령견/노령묘(10살+)','전 연령 공통'],
    },
    {
      id: 'pt4', label: '원료/성분 특징', req: true, mode: 'multi',
      hint: '원료 특징 → 신뢰 배지 + 성분 신뢰 섹션에 우선 배치',
      opts: ['휴먼그레이드(사람이 먹을 수 있는 원료)','천연 원료','무첨가(방부제·색소·향료)','국내산 원료','HACCP 인증','수의사 추천/개발','저알러지 처방','단백질 원료 함량 명시'],
    },
    {
      id: 'pt4b', label: '급여/사용 방법', req: false, mode: 'multi',
      hint: '급여 방법 → 제품 사용 안내 섹션에 반영',
      opts: ['건식(건사료/건식 간식)','습식(파우치/캔)','동결건조','반습식(세미모이스트)','영양제(분말/액상/정)','토퍼(밥 위에 뿌리기)'],
    },
    {
      id: 'pt5', label: '해결하는 주요 고민', req: false, mode: 'multi',
      hint: '고민 → 공감 섹션 핵심 카피에 반영',
      opts: ['피부/털 관리(피모)','소화/장 건강','관절/노령 케어','체중 관리/비만','스트레스/분리불안','치아/구강 건강','눈물자국 개선','심장/면역 건강','알레르기 케어','요로/신장 건강'],
    },
    {
      id: 'pt5b', label: '알레르기/금기 원료', req: false, mode: 'multi',
      hint: '알레르기 정보 → 구매 안내 섹션에 반영',
      opts: ['닭고기 알레르기 대응','소고기 알레르기 대응','곡물 프리(그레인 프리)','글루텐 프리','유제품 프리','특정 알레르기 없음'],
    },
    {
      id: 'pt5c', label: '보관 방법', req: false, mode: 'multi',
      hint: '보관 방법 → 제품 안내 섹션에 반영',
      opts: ['실온 보관','냉장 보관 권장','냉동 보관','개봉 후 밀봉 보관','건조한 곳 보관','직사광선 피해 보관'],
    },
    {
      id: 'pt7', label: '기타 추가 정보', req: false, mode: 'textarea',
      placeholder: '예: 급여 방법, 1일 권장량, 보관 방법, 특정 질환견 금기 여부...',
      hint: '급여·보관·주의사항 등 AI에게 전달할 추가 정보를 입력하세요',
    },
  ],

  스포츠: [
    {
      id: 'sp1', label: '상품 종류', req: true, mode: 'single',
      hint: '선택한 종류에 맞는 섹션 구조가 달라져요',
      opts: ['운동복(상의/하의)','운동화/스포츠화','헬스/피트니스 기구','구기종목 용품(공/라켓)','수영/수상 스포츠','등산/클라이밍','캠핑/아웃도어','자전거/킥보드','요가/필라테스','골프','스키/스노보드','격투기/무술'],
    },
    {
      id: 'sp1b', label: '운동 종류/종목', req: false, mode: 'multi',
      hint: '종목 → 타겟 섹션 + 제품 적합성 카피에 반영',
      opts: ['헬스/웨이트트레이닝','러닝/마라톤','요가/필라테스','사이클링','수영','등산/트레킹','구기종목(축구/배구/농구)','골프','격투기/무술','크로스핏/기능성 훈련','스트레칭/회복'],
    },
    {
      id: 'sp2', label: '소재/기능', req: true, mode: 'multi',
      hint: '소재·기능 → 제품 신뢰 섹션 + 기능 강조에 반영',
      opts: ['흡습속건(드라이핏)','방수/발수','방풍','자외선차단(UPF50+)','압박/서포트 기능','경량소재','항균/냄새 방지','보온/발열','쿨링 소재','4방향 스트레치'],
    },
    {
      id: 'sp3', label: '타겟 성별/수준', req: true, mode: 'multi',
      hint: '타겟 → 히어로 카피 + 공감 섹션 문구에 반영',
      opts: ['입문자/초보','중급자','고급/전문가','남성','여성','남녀공용','10~20대','30~40대','시니어(50대+)'],
    },
    {
      id: 'sp3b', label: '사이즈 구성', req: false, mode: 'multi',
      hint: '사이즈 → 구매 안내 섹션에 반영',
      opts: ['XS~XL(기본)','XS~3XL(빅사이즈 포함)','프리사이즈(one size)','cm/mm 단위 사이즈 선택','사이즈 가이드 제공','사이즈 교환 무료'],
    },
    {
      id: 'sp4', label: '특징/인증', req: false, mode: 'multi',
      opts: ['국내 브랜드','해외 직수입 정품','공식 수입 인증','프로선수 착용/추천','공인 기관 테스트 완료','한정판/콜라보','특허 기술/소재','리사이클 친환경 소재'],
    },
    {
      id: 'sp6', label: '기타 추가 정보', req: false, mode: 'textarea',
      placeholder: '예: 사이즈 선택 방법, 세탁 주의사항, 착용 시 주의점, 방수 등급 상세...',
      hint: '사이즈·관리법 등 AI에게 전달할 추가 정보를 입력하세요',
    },
  ],

  유아: [
    {
      id: 'ba1', label: '상품 종류', req: true, mode: 'single',
      hint: '선택한 종류에 맞는 섹션 구조가 달라져요',
      opts: ['의류/속옷/배냇저고리','침구(이불/베개/요)','수면용품(슬리핑백/속싸개)','수유/이유식 용품','목욕/위생 용품','장난감(완구/모빌/블록)','교구/교육완구','유모차/카시트','아기띠/힙시트','임산부 용품'],
    },
    {
      id: 'ba2', label: '대상 연령', req: true, mode: 'multi',
      hint: '연령대 → 제품 특성 + 안전 섹션에 반영',
      opts: ['임산부/태아','신생아(0~3개월)','영아(3~6개월)','영아(6~12개월)','걸음마기(12~24개월)','유아(2~4세)','유아(4~7세)','전 연령 가능'],
    },
    {
      id: 'ba3', label: '안전 인증', req: true, mode: 'multi',
      hint: '유아 제품은 안전 인증이 구매 결정에 결정적 — 신뢰 배지 최상단 배치',
      opts: ['KC안전인증(필수)','친환경 인증','무형광·무독성','BPA프리','오가닉 코튼(GOTS)','OEKO-TEX Standard 100','유럽 CE인증','FDA 승인','EN71 완구 안전기준','소아과/의사 추천'],
    },
    {
      id: 'ba3b', label: '발달 영역', req: false, mode: 'multi',
      hint: '발달 영역 → 제품 효능 섹션 + 구매 설득 카피에 반영',
      opts: ['시각/색감 자극','청각/음악 자극','소근육/손 발달','대근육/운동 발달','언어/인지 발달','사회성/감성 발달','창의력/상상력','감각통합(오감 자극)'],
    },
    {
      id: 'ba3c', label: '세탁/관리 방법', req: false, mode: 'multi',
      hint: '관리법 → 제품 안내 섹션에 반영',
      opts: ['세탁기 가능','손세탁 권장','삶음 가능(70℃+)','건조기 가능','습식 세척(물티슈)','에탄올 소독 가능'],
    },
    {
      id: 'ba4', label: '특징', req: false, mode: 'multi',
      opts: ['국내 생산(MADE IN KOREA)','소아과 원장 추천','입체재단(신체 발달 고려)','선물 세트 구성','친환경/에코 소재','방수 처리','성장에 맞게 설계(오래 사용)'],
    },
    {
      id: 'ba6', label: '기타 추가 정보', req: false, mode: 'textarea',
      placeholder: '예: 사용 방법, 세탁 방법, 보관 방법, 함께 쓰면 좋은 제품, 주의사항...',
      hint: '사용·관리·주의사항 등 AI에게 전달할 추가 정보를 입력하세요',
    },
  ],

  건강: [
    {
      id: 'ht1', label: '상품 종류', req: true, mode: 'single',
      hint: '선택한 종류에 맞는 섹션 구조가 달라져요',
      opts: ['건강기능식품(비타민/미네랄)','프로바이오틱스/유산균','콜라겐/히알루론산','오메가3/EPA/DHA','한방/전통 건강식품','다이어트/체중관리','의료기기(혈압계/혈당계)','마사지기기/온열기','안마의자/안마기','개인위생/구강케어'],
    },
    {
      id: 'ht2', label: '건강 목적', req: true, mode: 'multi',
      hint: '건강 목적 → 히어로 카피 + 공감 섹션의 핵심',
      opts: ['면역력 강화','눈 건강(루테인/지아잔틴)','관절/뼈 건강','다이어트/체지방 감소','피부 미용/항산화','소화/장 건강','수면의 질 개선','혈행/혈압 개선','혈당 관리','두뇌/집중력 향상','에너지/피로 회복','탈모/모발 건강'],
    },
    {
      id: 'ht3', label: '인증/임상', req: true, mode: 'multi',
      hint: '건강 제품은 전문성과 인증이 핵심 신뢰 요소 — 신뢰 섹션 최우선 배치',
      opts: ['식약처 기능성 인증','GMP 인증(우수제조기준)','의료기기 허가','임상시험 완료','특허 성분 보유','HACCP','ISO 인증','비건 인증','Non-GMO','CGMP(미국)'],
    },
    {
      id: 'ht3b', label: '섭취/사용 방법', req: false, mode: 'multi',
      hint: '섭취 방법 → 제품 사용 안내 섹션에 반영',
      opts: ['1일 1회 섭취','1일 2~3회 섭취','식전 복용','식후 복용','물과 함께 복용','음식에 혼합(분말형)','외용(피부 도포)'],
    },
    {
      id: 'ht3c', label: '제형', req: false, mode: 'single',
      hint: '제형 → 제품 스펙 + 섭취 편의성 카피에 반영',
      opts: ['정(타블렛)','캡슐(연질/경질)','액상/앰플','분말/파우더','젤리/구미','스틱형(소분 포장)','티백/차','크림/겔(외용)','패치형'],
    },
    {
      id: 'ht4', label: '타겟 대상', req: false, mode: 'multi',
      opts: ['20~30대','40~50대','시니어(60대+)','남성','여성','수험생/직장인','임산부/수유부(주의)','어린이(주니어 전용)'],
    },
    {
      id: 'ht5', label: '⚠️ 법적 고지 / 주의사항 (건강기능식품 표시)', req: true, mode: 'legal',
      legalTitle: '⚠️ 건강기능식품 법적 필수 표시',
      legalDesc: '건강기능식품법에 의거한 의무 표시 사항입니다. 건강기능식품에 해당하면 아래를 정확히 기재해 주세요. (일반식품·의료기기는 각 표시 기준에 맞게 기재) 하단에 법적 고지 섹션이 자동 생성됩니다.',
      fields: ['제조사 / 판매원 (영업소 명칭·소재지)', '원료명 및 함량', '섭취량·섭취방법', '유통기한 및 보관방법', '섭취 시 주의사항 (이상사례 시 섭취 중단·전문가 상담)'],
      hint: '★건강기능식품은 "질병의 예방·치료를 위한 의약품이 아닙니다" 표시가 필수입니다. 의약품으로 오인될 효능·효과 표현은 표시광고법 위반이 될 수 있어요(해당 시 기재).',
    },
    {
      id: 'ht6', label: '기타 추가 정보', req: false, mode: 'textarea',
      placeholder: '예: 1일 1회 1정 식후 복용, 냉암소 보관, 임산부 복용 전 의사 상담 권장, 주요 원료 함량...',
      hint: '복용법·금기사항·원료 상세 등 AI에게 전달할 추가 정보를 입력하세요',
    },
  ],

  자동차: [
    {
      id: 'cr1', label: '상품 종류', req: true, mode: 'single',
      hint: '선택한 종류에 맞는 섹션 구조가 달라져요',
      opts: ['차량용 전자기기(블랙박스/내비게이션)','무선충전/거치대','공기청정기/방향제','외장 케어(광택/코팅/틴팅)','내장 용품(시트커버/매트)','세차 용품','안전 용품(소화기/삼각대)','튜닝 부품','타이어/휠/타이어용품','주차/편의 용품'],
    },
    {
      id: 'cr2', label: '호환 차종', req: true, mode: 'multi',
      hint: '호환 차종 → 타겟 섹션 + 구매 안내에 반영',
      opts: ['국산차 전체 호환','수입차 전체 호환','현대/기아','쌍용/KG모빌리티','르노코리아','BMW','벤츠','아우디/폭스바겐','전기차 전용(EV)','수소차 호환','차종 무관(범용)'],
    },
    {
      id: 'cr2b', label: '소재/마감', req: false, mode: 'multi',
      hint: '소재 → 제품 신뢰 섹션 + 내구성 강조에 반영',
      opts: ['알루미늄 합금','스테인리스','ABS 플라스틱','탄소섬유(카본)','천연가죽','인조가죽/PU','메모리폼','EVA 고무','내열 소재','UV 코팅'],
    },
    {
      id: 'cr3', label: '주요 기능', req: true, mode: 'multi',
      hint: '기능 → USP 섹션 + 비교표에 우선 배치',
      opts: ['무선충전(15W+)','블루투스 연동','앱/스마트폰 연동','방수/방진(IPX)','야간 시인성(LED)','쉬운 설치(클립/흡착)','자동 각도 조절','360도 회전','음성 명령 지원','실시간 알림/경보'],
    },
    {
      id: 'cr3b', label: '설치 방법', req: false, mode: 'single',
      hint: '설치 방법 → 구매 편의성 섹션에 반영',
      opts: ['셀프 설치(5분 이내)','셀프 설치(30분 이내)','전문 시공 필요','OBD 포트 연결','대시보드 부착','에어컨 송풍구 장착','헤드레스트 장착','흡착판 거치'],
    },
    {
      id: 'cr4', label: '인증/특징', req: false, mode: 'multi',
      opts: ['KC안전인증','TUV/CE인증(유럽)','FCC인증(미국)','정품 인증 QR','국내 제조','특허 기술/디자인','수입 정품','1년 AS 보장','2년 AS 보장'],
    },
    {
      id: 'cr6', label: '기타 추가 정보', req: false, mode: 'textarea',
      placeholder: '예: 설치 소요 시간 30분, 호환 불가 차종(국산 전기차 일부), 방수 등급 IP67...',
      hint: '설치·호환·주의사항 등 AI에게 전달할 추가 정보를 입력하세요',
    },
  ],

  기타: [
    {
      id: 'et1', label: '상품 종류', req: true, mode: 'single',
      opts: ['문구/오피스','취미/수집','악기','반려식물','예술/공예','교육/도서','여행용품'],
    },
    {
      id: 'et2', label: '판매 방식', req: false, mode: 'multi',
      opts: ['단품','세트구성','정기구독','맞춤제작','디지털상품'],
    },
    {
      id: 'et3', label: '타겟', req: false, mode: 'multi',
      opts: ['일반소비자','기업/B2B','선물용','해외교포'],
    },
    {
      id: 'et4', label: '핵심 특징/장점', req: true, mode: 'textarea',
      placeholder: '예: 국내 수제 제작, 친환경 소재, 맞춤 제작 가능, 선물 포장 포함...',
    },
    {
      id: 'et6', label: '기타 추가 정보', req: false, mode: 'textarea',
      placeholder: '예: 배송 방식, 포장 상태, 특수 취급 주의사항...',
      hint: '배송·포장·취급 등 AI에게 전달할 추가 정보를 입력하세요',
    },
  ],
};

/* ─────────────────────────────────────────────
   칩 컴포넌트
───────────────────────────────────────────── */
function ChipGroup({ opts, multi, value, onChange }: {
  opts: string[]; multi: boolean; value: string[]; onChange: (v: string[]) => void;
}) {
  const [inputOpen, setInputOpen] = useState(false);
  const [inputVal,  setInputVal]  = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // 사용자가 직접 입력한 값 (opts에 없는 항목)
  const customValues = value.filter(v => !opts.includes(v));

  const toggle = (o: string) => {
    if (multi) {
      onChange(value.includes(o) ? value.filter(x => x !== o) : [...value, o]);
    } else {
      // single 모드: 프리셋 선택 시 커스텀 값도 함께 제거
      onChange(value.length === 1 && value[0] === o ? [] : [o]);
    }
  };

  const removeCustom = (cv: string) => onChange(value.filter(x => x !== cv));

  const submit = () => {
    const t = inputVal.trim();
    setInputOpen(false);
    setInputVal('');
    if (!t) return;
    if (multi) {
      if (!value.includes(t)) onChange([...value, t]);
    } else {
      onChange([t]); // single: 기존 선택 전부 교체
    }
  };

  // single 모드에서 이미 커스텀 값이 있으면 추가 버튼 숨김
  const canAddCustom = multi || customValues.length === 0;

  return (
    <div className="chips">
      {/* 프리셋 칩 */}
      {opts.map(o => (
        <div key={o} className={`chip${value.includes(o) ? ' on' : ''}`} onClick={() => toggle(o)}>
          {o}
        </div>
      ))}

      {/* 커스텀 칩 (보라색 계열) */}
      {customValues.map(cv => (
        <div
          key={cv}
          className="chip on"
          style={{ borderColor: '#7c3aed', color: '#7c3aed', background: '#ede9fe', display: 'inline-flex', alignItems: 'center', gap: 3 }}
        >
          {cv}
          <span
            role="button"
            aria-label={`${cv} 제거`}
            onClick={e => { e.stopPropagation(); removeCustom(cv); }}
            style={{ cursor: 'pointer', fontWeight: 700, fontSize: 13, lineHeight: 1, marginLeft: 1 }}
          >×</span>
        </div>
      ))}

      {/* + 기타 버튼 */}
      {!inputOpen && canAddCustom && (
        <div
          className="chip"
          style={{ borderStyle: 'dashed', borderColor: '#a78bfa', color: '#7c3aed' }}
          onClick={() => { setInputOpen(true); setTimeout(() => inputRef.current?.focus(), 30); }}
        >
          + 기타
        </div>
      )}

      {/* 직접 입력 인풋 */}
      {inputOpen && (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, flexWrap: 'nowrap' }}>
          <input
            ref={inputRef}
            type="text"
            value={inputVal}
            placeholder="직접 입력 후 Enter"
            onChange={e => setInputVal(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') { e.preventDefault(); submit(); }
              if (e.key === 'Escape') { setInputOpen(false); setInputVal(''); }
            }}
            style={{
              fontSize: 12, padding: '4px 10px',
              border: '1.5px solid #a78bfa', borderRadius: 20,
              outline: 'none', fontFamily: 'var(--f)',
              color: '#5b21b6', width: 148,
            }}
          />
          <span
            onClick={submit}
            style={{ fontSize: 11, padding: '4px 9px', background: '#ede9fe', color: '#7c3aed', borderRadius: 20, cursor: 'pointer', whiteSpace: 'nowrap', userSelect: 'none' }}
          >확인</span>
          <span
            onClick={() => { setInputOpen(false); setInputVal(''); }}
            style={{ fontSize: 11, color: '#94a3b8', cursor: 'pointer', userSelect: 'none' }}
          >취소</span>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   질문 한 개 렌더링
───────────────────────────────────────────── */
export function QuestionField({ q, answer, onAnswer }: {
  q: Question;
  answer: string | string[];
  onAnswer: (v: string | string[]) => void;
}) {
  // 저장된 answer 문자열(store에 보존됨) — 재마운트 시 origin/legal 위젯 상태 복원에 사용
  const initStr = Array.isArray(answer) ? '' : (answer as string);

  // origin 모드: 칩(단일)과 텍스트 입력을 로컬로 관리 후 합쳐서 상위에 전달
  // 화면 전환 후 재마운트 시 answer("칩 / 텍스트")에서 역복원
  const [originChip, setOriginChip] = useState<string[]>(() => {
    if (q.mode !== 'origin' || !initStr) return [];
    const first = initStr.split(' / ')[0];
    return (q.opts ?? []).includes(first) ? [first] : [];
  });
  const [originText, setOriginText] = useState<string>(() => {
    if (q.mode !== 'origin' || !initStr) return '';
    const parts = initStr.split(' / ');
    return (q.opts ?? []).includes(parts[0]) ? parts.slice(1).join(' / ') : initStr;
  });
  const handleOriginChip = (chips: string[]) => {
    setOriginChip(chips);
    onAnswer([chips[0], originText].filter(Boolean).join(' / '));
  };
  const handleOriginText = (text: string) => {
    setOriginText(text);
    onAnswer([originChip[0], text].filter(Boolean).join(' / '));
  };

  // legal 모드: 필드별 로컬 상태 → 합쳐서 상위에 전달
  // answer("필드: 값 / 필드: 값")에서 역복원
  const [legalVals, setLegalVals] = useState<Record<string, string>>(() => {
    if (q.mode !== 'legal' || !initStr) return {};
    const result: Record<string, string> = {};
    initStr.split(' / ').forEach(pair => {
      const i = pair.indexOf(': ');
      if (i > -1) result[pair.slice(0, i)] = pair.slice(i + 2);
    });
    return result;
  });
  const handleLegal = (field: string, val: string) => {
    const next = { ...legalVals, [field]: val };
    setLegalVals(next);
    onAnswer((q.fields ?? []).map(f => `${f}: ${next[f] ?? ''}`).join(' / '));
  };

  const chipVal = Array.isArray(answer) ? answer : [];
  const strVal  = Array.isArray(answer) ? '' : (answer as string);

  return (
    <>
      {q.sectionTitle && (
        <div className="fdiv" style={{ marginTop: 4 }}>
          <div className="fdiv-line" />
          <span className="fdiv-lbl">{q.sectionTitle}</span>
          <div className="fdiv-line" />
        </div>
      )}
      <div className="fg">
        <div className="fl">
          {q.label}
          {q.req && <span className="freq">*</span>}
          {q.mode === 'multi'  && <span className="fopt">복수 선택</span>}
          {q.mode === 'single' && <span className="fopt">단일 선택</span>}
        </div>

        {q.mode === 'text' && (
          <input className="finp" type="text" placeholder={q.placeholder ?? ''}
            value={strVal} onChange={e => onAnswer(e.target.value)} />
        )}
        {q.mode === 'textarea' && (
          <textarea className="finp" placeholder={q.placeholder ?? ''}
            value={strVal} onChange={e => onAnswer(e.target.value)} />
        )}
        {(q.mode === 'single' || q.mode === 'multi') && q.opts && (
          <ChipGroup opts={q.opts} multi={q.mode === 'multi'} value={chipVal} onChange={onAnswer} />
        )}
        {q.mode === 'origin' && q.opts && (
          <>
            <ChipGroup opts={q.opts} multi={false} value={originChip} onChange={handleOriginChip} />
            <input className="finp" style={{ marginTop: 8 }} placeholder="국내산: 지역 / 수입산: 국가"
              value={originText} onChange={e => handleOriginText(e.target.value)} />
          </>
        )}
        {q.mode === 'legal' && q.fields && (
          <>
            <div className="legal-box">
              <div className="legal-title">{q.legalTitle ?? '⚠️ 화장품 법적 필수 표시'}</div>
              <div className="legal-desc">{q.legalDesc ?? '화장품법에 의거 상세페이지에 반드시 포함되어야 합니다. 하단에 법적 고지 섹션이 자동 생성됩니다.'}</div>
            </div>
            {q.fields.map(f => (
              <input key={f} className="finp" style={{ marginBottom: 8 }} placeholder={f}
                value={legalVals[f] ?? ''} onChange={e => handleLegal(f, e.target.value)} />
            ))}
          </>
        )}

        {q.hint && <div className="fhint">{q.hint}</div>}
      </div>
    </>
  );
}

/* ─────────────────────────────────────────────
   메인 컴포넌트
───────────────────────────────────────────── */
const PRODUCT_NAME_PLACEHOLDERS: Record<string, string> = {
  화장품:   '예: 제주 병풀 진정 토너 200ml',
  식품:     '예: 제주 흑돼지 앞다리살 1kg',
  패션:     '예: 오버핏 코튼 후드 집업',
  생활:     '예: 북유럽 원목 사이드 테이블',
  가전:     '예: 다이슨 V15 무선청소기 앱솔루트',
  반려동물: '예: 강아지 수제 연어 져키 100g',
  스포츠:   '예: 남성 러닝화 쿠션 경량',
  유아:     '예: 신생아 순면 배냇저고리 세트',
  건강:     '예: 눈건강 루테인 지아잔틴 500mg',
  자동차:   '예: 차량용 대용량 무선충전 거치대',
  기타:     '예: 상품명을 입력해주세요',
};

const DIFF_PLACEHOLDERS: Record<string, string> = {
  화장품:   '예: 히알루론산 함량 3배, 무알콜 처방, 피부과 테스트 완료',
  식품:     '예: 국내산 100%, 당일도축 새벽배송, HACCP 인증',
  패션:     '예: 국내 공장 직생산, 체형보정 패턴, 30일 무료반품',
  생활:     '예: 국내산 원목, 친환경 마감재, 조립 30분 이내',
  가전:     '예: 경쟁사 대비 흡입력 2배, AS 3년 보증, 국내 A/S센터',
  반려동물: '예: 수의사 처방 원료, 방부제 무첨가, 국내 HACCP 공장',
  스포츠:   '예: 프로선수 착용, 기능성 원단 특허, 사이즈 교환 무료',
  유아:     '예: KC인증 완료, 유해물질 無, 소아과 원장 추천',
  건강:     '예: 임상시험 완료, 식약처 인증, 흡수율 경쟁사 대비 3배',
  자동차:   '예: 국내 정품 KC인증, 차종 99% 호환, 1년 무상AS',
  기타:     '예: 경쟁 제품 대비 차별점을 입력해주세요',
};

const BRAND_NAME_PLACEHOLDERS: Record<string, string> = {
  화장품:   '예: 이니스프리, 자체브랜드, 무브랜드',
  식품:     '예: 제주농협, 자체브랜드, 무브랜드',
  패션:     '예: 무신사스탠다드, 자체브랜드',
  생활:     '예: 이케아, 자체브랜드, 무브랜드',
  가전:     '예: 삼성, LG, 다이슨, 자체브랜드',
  반려동물: '예: 로얄캐닌, 자체브랜드, 무브랜드',
  스포츠:   '예: 나이키, 아디다스, 자체브랜드',
  유아:     '예: 베이비뵨, 자체브랜드, 무브랜드',
  건강:     '예: 종근당, 자체브랜드, 무브랜드',
  자동차:   '예: 불루오션, 자체브랜드, 무브랜드',
  기타:     '예: 브랜드명을 입력해주세요',
};

/* ─────────────────────────────────────────────
   섹션 매핑 및 AI 추천
───────────────────────────────────────────── */
export const SECTION_MAP: Record<string, Partial<Record<string, string[]>>> = {
  화장품: { s2:['c1','c2','c3'], s3:['c4'], s4:['c5'], s5:['c6'], s6:['c7'], s7:['c8'], s8:['c9','c10'] },
  식품:   { s2:['f1','f3','f4'], s3:['f5','f5b','f6','f6b'], s5:['f2'], s7:['f7'], s8:['f8'] },
  패션:   { s2:['fa1','fa2','fa3'], s3:['fa3b','fa3c','fa5'], s5:['fa4'], s7:['fa6'], s8:['fa4b','fa7'] },
  생활:   { s2:['lv1','lv2','lv3'], s3:['lv3b','lv3c','lv4','lv4b'], s5:['lv5'], s7:['lv6'], s8:['lv7'] },
  가전:   { s2:['dg1','dg3'], s3:['dg2','dg3b','dg3c','dg4','dg5','dg5b','dg5c','dg6'], s6:['dg7'], s5:['dg9'], s8:['dg8','dg10','dg11'] },
  반려동물:{ s2:['pt1','pt2','pt3'], s3:['pt4','pt4b','pt5','pt5b','pt5c'], s7:['pt6'], s8:['pt7'] },
  스포츠: { s2:['sp1','sp1b','sp2'], s3:['sp3b','sp4'], s5:['sp3'], s7:['sp5'], s8:['sp6'] },
  유아:   { s2:['ba1','ba2','ba3'], s3:['ba3b','ba3c','ba4'], s7:['ba5'], s8:['ba6'] },
  건강:   { s2:['ht1','ht2','ht3'], s3:['ht3b','ht3c'], s5:['ht4'], s7:['ht5'], s8:['ht6'] },
  자동차: { s2:['cr1','cr2','cr3'], s3:['cr2b','cr3b','cr4'], s7:['cr5'], s8:['cr6'] },
  기타:   { s2:['et1','et2'], s3:['et4'], s5:['et3'], s7:['et5'], s8:['et6'] },
};

export const SECTION_DEFS = [
  { id:'s2', title:'카테고리 & 키워드' },
  { id:'s3', title:'상품 핵심 정보' },
  { id:'s4', title:'브랜드/제품 한 줄 소개' },
  { id:'s5', title:'주요 대상' },
  { id:'s6', title:'브랜드 포지셔닝' },
  { id:'s7', title:'가격대' },
  { id:'s8', title:'기타 추가 정보' },
];

const AI_RECS: Record<string, {label:string; chips:string[]}[]> = {
  화장품: [
    { label:'추천 키워드', chips:['수분케어','트러블진정','미백','피부결개선','수분충전'] },
    { label:'추천 핵심 성분', chips:['히알루론산','세라마이드','판테놀','알란토인','나이아신아마이드'] },
    { label:'추천 타겟', chips:['건성피부','민감성피부','20대 여성','피부 고민 있는 분','뷰티 관심층'] },
  ],
  식품: [
    { label:'추천 키워드', chips:['신선식품','건강간식','다이어트식','가족반찬','집밥'] },
    { label:'추천 인증', chips:['HACCP인증','국내산','무첨가','유기농','산지직송'] },
    { label:'추천 타겟', chips:['1인가구','다이어터','가족','시니어','건강관리'] },
  ],
  패션: [
    { label:'추천 키워드', chips:['트렌디','베이직','데일리룩','모던','편안함'] },
    { label:'추천 소재', chips:['면100%','스트레치','흡습속건','항균','친환경소재'] },
    { label:'추천 타겟', chips:['20대','30대','직장인','대학생','패션관심층'] },
  ],
  생활: [
    { label:'추천 키워드', chips:['인테리어','공간활용','모던','북유럽','심플'] },
    { label:'추천 특징', chips:['국내제조','친환경','항균','내구성','사용편의'] },
    { label:'추천 타겟', chips:['신혼부부','1인가구','인테리어관심','반려동물가정','B2B'] },
  ],
  가전: [
    { label:'추천 키워드', chips:['스마트가전','에너지절약','저소음','고성능','편의성'] },
    { label:'추천 기능', chips:['앱연동','자동청소','저소음','에너지절약','원격제어'] },
    { label:'추천 타겟', chips:['맞벌이부부','1인가구','청소관심','스마트홈','시니어'] },
  ],
  반려동물: [
    { label:'추천 키워드', chips:['천연원료','무첨가','고단백','소화건강','관절케어'] },
    { label:'추천 특징', chips:['휴먼그레이드','무방부제','수의사추천','HACCP','국내산'] },
    { label:'추천 타겟', chips:['강아지보호자','고양이보호자','펫맘','노령견보호자','건강케어'] },
  ],
  스포츠: [
    { label:'추천 키워드', chips:['기능성','경량','고성능','트레이닝','운동성능'] },
    { label:'추천 기능', chips:['흡습속건','압박','경량','항균','UV차단'] },
    { label:'추천 타겟', chips:['헬스인','러너','요가인','입문자','20~30대'] },
  ],
  유아: [
    { label:'추천 키워드', chips:['안전인증','유아용','신생아','발달','친환경'] },
    { label:'추천 인증', chips:['KC인증','무형광','BPA프리','오가닉코튼','소아과추천'] },
    { label:'추천 타겟', chips:['신생아','영아','1세아기','임산부','선물용'] },
  ],
  건강: [
    { label:'추천 키워드', chips:['영양보충','피로회복','면역력','에너지충전','건강관리'] },
    { label:'추천 핵심 성분', chips:['비타민B군','비타민C','비타민D','아연','셀레늄'] },
    { label:'추천 타겟', chips:['직장인','학생','운동하는 사람','육아맘','건강관리 중인 분'] },
  ],
  자동차: [
    { label:'추천 키워드', chips:['차량용품','안전','고성능','편의성','스마트'] },
    { label:'추천 기능', chips:['무선충전','야간시인성','방수','쉬운설치','앱연동'] },
    { label:'추천 타겟', chips:['직장인운전자','신차구매자','안전중시','장거리운전','스마트카'] },
  ],
  기타: [
    { label:'추천 키워드', chips:['실용적','선물용','고품질','국내제조','특별한'] },
    { label:'추천 특징', chips:['수공예','친환경','맞춤제작','한정판','독창적'] },
    { label:'추천 타겟', chips:['선물구매자','일반소비자','취미인','수집가','B2B'] },
  ],
};

/* ─────────────────────────────────────────────
   ProgressCircle 컴포넌트
───────────────────────────────────────────── */
function ProgressCircle({ pct }: { pct: number }) {
  const r = 20;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <svg width={52} height={52} viewBox="0 0 52 52">
      <circle cx={26} cy={26} r={r} fill="none" stroke="#F3F4F6" strokeWidth={5} />
      <circle
        cx={26} cy={26} r={r} fill="none"
        stroke="#6D4CFF" strokeWidth={5}
        strokeDasharray={`${dash} ${circ - dash}`}
        strokeLinecap="round"
        transform="rotate(-90 26 26)"
      />
      <text x={26} y={31} textAnchor="middle" fontSize={11} fontWeight={700} fill="#6D4CFF">{pct}%</text>
    </svg>
  );
}

/* ─────────────────────────────────────────────
   AccordionSection 컴포넌트
───────────────────────────────────────────── */
export function AccordionSection({
  num, title, req, isOpen, onToggle, badge, children,
}: {
  num: number;
  title: string;
  req?: boolean;
  isOpen: boolean;
  onToggle: () => void;
  badge?: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{
      border: '1.5px solid #E5E7EB',
      borderRadius: 10,
      marginBottom: 10,
      overflow: 'hidden',
    }}>
      <div
        onClick={onToggle}
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '14px 18px',
          background: isOpen ? '#F7F5FF' : '#fff',
          cursor: 'pointer',
          userSelect: 'none',
          transition: 'background .15s',
        }}
      >
        <div style={{
          width: 26, height: 26, borderRadius: '50%',
          background: isOpen ? '#6D4CFF' : '#F3F4F6',
          color: isOpen ? '#fff' : '#6B7280',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, fontWeight: 700, flexShrink: 0,
          transition: 'all .15s',
        }}>{num}</div>
        <span style={{ fontSize: 14, fontWeight: 600, color: '#111', flex: 1 }}>{title}</span>
        {req && (
          <span style={{
            fontSize: 10, fontWeight: 600, color: '#6D4CFF',
            background: '#EDE9FE', borderRadius: 4, padding: '2px 7px',
          }}>필수</span>
        )}
        {badge && (
          <span style={{
            fontSize: 10, color: '#6B7280',
            background: '#F9FAFB', border: '1px solid #E5E7EB',
            borderRadius: 4, padding: '2px 7px',
          }}>{badge}</span>
        )}
        {isOpen ? <ChevronUp size={16} color="#6B7280" /> : <ChevronDown size={16} color="#6B7280" />}
      </div>
      {isOpen && (
        <div style={{ padding: '16px 18px 8px', background: '#fff' }}>
          {children}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   ProductScreen
───────────────────────────────────────────── */
export default function ProductScreen() {
  const isMobile = useIsMobile();
  const { cat, ch, type, go, productName, setProductName, setProductExtra, regularPrice, setRegularPrice, salePrice, setSalePrice, showPrice, setShowPrice, productOptions, setProductOptions,
    brand, setBrand, diff, setDiff, extraNote, setExtraNote, brandIntro, setBrandIntro, answers, setAnswers, aiSelections, setAiSelections } = useApp();
  const qs = CQ[cat ?? '기타'] ?? CQ['기타'];
  const isGaejeon = cat === '가전';
  const namePlaceholder  = PRODUCT_NAME_PLACEHOLDERS[cat ?? ''] ?? '예: 상품명을 입력하세요';
  const brandPlaceholder = BRAND_NAME_PLACEHOLDERS[cat ?? '']   ?? '예: 브랜드명을 입력해주세요';
  const diffPlaceholder  = DIFF_PLACEHOLDERS[cat ?? '']         ?? '예: 경쟁 제품 대비 차별점을 입력해주세요';

  // 폼 입력값(brand/diff/extraNote/brandIntro/answers/aiSelections)은 store로 승격됨
  // → 화면 전환(s5↔s5-5 등)으로 컴포넌트가 unmount돼도 유지됨
  const setAnswer = (id: string, val: string | string[]) =>
    setAnswers(p => ({ ...p, [id]: val }));

  // UI 일시 상태만 로컬 유지
  const [openSecs, setOpenSecs] = useState<Set<string>>(new Set(['s1']));
  const [previewTab, setPreviewTab] = useState<'blog' | 'slide'>('blog');
  const [agreed, setAgreed] = useState(false);   // ①실측·검증 동의(생성 전 법적 방어선)

  // 모바일 분기 — 모든 훅 호출 후
  if (isMobile) return <ProductMobile />;

  // 섹션 helpers
  const getSectionQs = (sectionId: string) => {
    const catMap = SECTION_MAP[cat ?? '기타'] ?? {};
    const qIds = (catMap[sectionId] ?? []) as string[];
    return qs.filter(q => qIds.includes(q.id));
  };

  const countSection = (sectionId: string): string => {
    const sectionQs = getSectionQs(sectionId);
    const total = sectionQs.reduce((s, q) => s + (q.opts?.length ?? 0), 0);
    const selected = sectionQs.reduce((s, q) => {
      const v = answers[q.id];
      return s + (Array.isArray(v) ? v.length : (v && String(v).trim() ? 1 : 0));
    }, 0);
    return total > 0 ? `선택 ${selected}/${total}` : (selected > 0 ? '선택' : '선택');
  };

  // 진행률 계산
  const requiredQs = qs.filter(q => q.req);
  const filledReq = requiredQs.filter(q => {
    const v = answers[q.id];
    if (!v) return false;
    if (Array.isArray(v)) return v.length > 0;
    return String(v).trim().length > 0;
  });
  const pct = requiredQs.length > 0
    ? Math.round(((filledReq.length + (productName.trim() ? 1 : 0)) / (requiredQs.length + 1)) * 100)
    : productName.trim() ? 100 : 0;
  // 완성도 진행에 따른 색·문구(낮음 회색 → 중간 퍼플 → 높음 초록)
  const pctColor = pct >= 80 ? '#16A34A' : pct >= 40 ? '#6D4CFF' : '#9CA3AF';
  const pctMsg = pct >= 80 ? '거의 다 됐어요! 완성도가 높아요' : pct >= 40 ? '잘 하고 있어요 — 조금만 더!' : '필수 항목을 채울수록 완성도가 올라가요';

  // 섹션 토글
  const toggleSec = (id: string) => {
    setOpenSecs(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // 가시적인 섹션만 (질문이 있거나 s4는 항상 보임)
  const visibleSections = SECTION_DEFS.filter(s => {
    if (s.id === 's4') return true;
    return getSectionQs(s.id).length > 0;
  });

  // 다음 클릭 → 전체 입력값을 직렬화해 AppContext에 저장
  const handleNext = () => {
    if (!productName.trim()) {
      alert('상품명을 입력해주세요.');
      return;
    }
    if (!agreed) {
      alert('입력 정보가 실측·검증된 사실임을 확인(동의)해 주세요.');
      return;
    }
    const lines: string[] = [];
    if (brand.trim()) lines.push(`브랜드명: ${brand.trim()}`);
    if (regularPrice || salePrice) {
      if (regularPrice) lines.push(`정가: ${Number(regularPrice).toLocaleString()}원`);
      if (salePrice)    lines.push(`판매가: ${Number(salePrice).toLocaleString()}원`);
      if (regularPrice && salePrice && Number(regularPrice) > Number(salePrice)) {
        const discount = Math.round((1 - Number(salePrice) / Number(regularPrice)) * 100);
        lines.push(`할인율: ${discount}%`);
      }
      lines.push(`가격 표시 여부: ${showPrice ? '상세페이지에 표시' : '표시 안 함'}`);
    }
    qs.forEach(q => {
      const val = answers[q.id];
      if (!val || (Array.isArray(val) && val.length === 0) || val === '') return;
      const str = Array.isArray(val) ? val.join(', ') : String(val).trim();
      if (str) lines.push(`[${q.label}]: ${str}`);
    });
    const validOptions = productOptions.filter(o => o.name.trim() && o.values.trim());
    if (validOptions.length) {
      lines.push(`옵션: ${validOptions.map(o => `${o.name.trim()}(${o.values.trim()})`).join(' / ')}`);
    }
    if (!isGaejeon && diff.trim()) lines.push(`경쟁 차별점: ${diff.trim()}`);
    if (extraNote.trim())                 lines.push(`기타 요청사항: ${extraNote.trim()}`);
    if (brandIntro.trim())                lines.push(`브랜드 소개: ${brandIntro.trim()}`);
    if (aiSelections.length)              lines.push(`AI 추천 키워드: ${aiSelections.join(', ')}`);
    setProductExtra(lines.join('\n'));
    go('s5-5');
  };

  const prevScreen = ch === '스마트스토어' ? 's3b' : 's3';

  const aiRecs = AI_RECS[cat ?? '기타'] ?? AI_RECS['기타'];

  return (
    <div style={{ maxWidth: 1080, margin: '0 auto', padding: '32px 24px 80px' }}>
      {/* Header */}
      <div style={{ marginBottom: 6 }}>
        <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-.03em', color: '#111' }}>
          상품 정보를 입력해주세요 ✦
        </div>
        <div style={{ fontSize: 13, color: '#6B7280', marginTop: 4, lineHeight: 1.6 }}>
          {cat} · {ch} · {type} 기준 — 꼭 필요한 정보만 물어볼게요
        </div>
      </div>

      {/* ⚠️ 법적 경고 — 입력 정보는 그대로 상세페이지에 반영, 책임은 판매자 (입력 처리 로직 불변, 안내 UI만) */}
      <div style={{
        display: 'flex', gap: 10, alignItems: 'flex-start',
        background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 10,
        padding: '12px 14px', marginTop: 14, marginBottom: 28,
      }}>
        <span style={{ fontSize: 15, lineHeight: 1.5, flexShrink: 0 }}>⚠️</span>
        <div style={{ fontSize: 12.5, lineHeight: 1.6, color: '#92400E' }}>
          <b style={{ fontWeight: 700 }}>실측·검증된 정보만 입력해 주세요.</b><br />
          입력하신 수치·효능·인증 정보는 그대로 상세페이지에 반영됩니다. 과장되거나 사실과 다른 정보 입력 시 표시광고법 위반이 될 수 있으며, 책임은 판매자에게 있습니다.
        </div>
      </div>

      {/* 빠른 생성 모드 토글 제거 — 기능 0인 죽은 토글이었음 */}

      {/* 2-column layout */}
      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>

        {/* ── Left: Form ── */}
        <div style={{ flex: 1, minWidth: 0 }}>

          {/* 완성도 카드 — 원형 % + 가로 진행바(진행에 따라 색 변화) */}
          <div style={{
            marginBottom: 24, padding: '15px 16px',
            border: '1px solid #ECEAF6', borderRadius: 14, background: '#FBFAFE',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
              <ProgressCircle pct={pct} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#111' }}>상세페이지 완성도</span>
                  <span style={{ fontSize: 17, fontWeight: 800, color: pctColor, letterSpacing: '-0.02em' }}>{pct}%</span>
                </div>
                <div style={{ fontSize: 11.5, color: '#9CA3AF', marginTop: 3 }}>{pctMsg}</div>
              </div>
            </div>
            <div style={{ marginTop: 13, height: 8, borderRadius: 999, background: '#EEEDF5', overflow: 'hidden' }}>
              <div style={{ width: `${pct}%`, height: '100%', borderRadius: 999, background: pctColor, transition: 'width .3s ease, background .3s ease' }} />
            </div>
          </div>

          {/* Section 1: 기본 정보 (always open) */}
          <AccordionSection
            num={1}
            title="기본 정보"
            req={true}
            isOpen={openSecs.has('s1')}
            onToggle={() => toggleSec('s1')}
          >
            <div className="fg">
              <div className="fl">상품명 <span className="freq">*</span></div>
              <input
                className="finp"
                type="text"
                placeholder={namePlaceholder}
                value={productName}
                onChange={e => setProductName(e.target.value)}
              />
            </div>
            <div className="fg">
              <div className="fl">브랜드명 <span className="fopt">선택</span></div>
              <input className="finp" type="text" placeholder={brandPlaceholder}
                value={brand} onChange={e => setBrand(e.target.value)} />
            </div>
            <div style={{
              border: '1px solid #ECECF2', borderRadius: 16, background: '#FAFAFC',
              padding: '16px 18px',
            }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#111', marginBottom: 12 }}>
                판매 가격 <span style={{ fontSize: 12, fontWeight: 400, color: '#999' }}>선택</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {([
                  { label: '정가', val: regularPrice, set: setRegularPrice },
                  { label: '판매가', val: salePrice, set: setSalePrice },
                ] as { label: string; val: string; set: (v: string) => void }[]).map(({ label, val, set }) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 13, color: '#555', width: 44, flexShrink: 0 }}>{label}</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={val ? Number(val).toLocaleString() : ''}
                      onChange={e => set(e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder="0"
                      style={{
                        flex: 1, height: 40, border: '1px solid #ECECF2', borderRadius: 10,
                        padding: '0 12px', fontSize: 14, textAlign: 'right',
                        background: '#fff', outline: 'none', fontFamily: 'var(--f)',
                      }}
                      onFocus={e => { e.currentTarget.style.borderColor = '#6D4CFF'; }}
                      onBlur={e => { e.currentTarget.style.borderColor = '#ECECF2'; }}
                    />
                    <span style={{ fontSize: 13, color: '#666', flexShrink: 0 }}>원</span>
                  </div>
                ))}
              </div>
              {regularPrice && salePrice && Number(regularPrice) > Number(salePrice) && (
                <div style={{ marginTop: 10, fontSize: 12.5, color: '#6D4CFF', fontWeight: 600 }}>
                  할인율 {Math.round((1 - Number(salePrice) / Number(regularPrice)) * 100)}% 자동 계산됨
                </div>
              )}
              <label style={{
                display: 'flex', alignItems: 'center', gap: 8, marginTop: 12,
                cursor: 'pointer', fontSize: 13, color: '#555',
              }}>
                <input
                  type="checkbox"
                  checked={showPrice}
                  onChange={e => setShowPrice(e.target.checked)}
                  style={{ width: 15, height: 15, accentColor: '#6D4CFF', cursor: 'pointer' }}
                />
                가격을 상세페이지에 표시
              </label>
            </div>
            {/* 옵션 입력 */}
            <div style={{
              border: '1px solid #ECECF2', borderRadius: 16, background: '#fff',
              padding: '16px 18px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#111' }}>
                  옵션 <span style={{ fontSize: 12, fontWeight: 400, color: '#999' }}>선택</span>
                </div>
                <button
                  type="button"
                  onClick={() => setProductOptions([...productOptions, { name: '', values: '' }])}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: 13, fontWeight: 700, color: '#6D4CFF',
                    display: 'flex', alignItems: 'center', gap: 3, fontFamily: 'var(--f)',
                  }}
                >
                  + 옵션 추가
                </button>
              </div>
              {productOptions.length === 0 && (
                <p style={{ fontSize: 13, color: '#BBB', margin: 0 }}>
                  예: 용량(50ml/100ml), 색상(블랙/화이트), 구성(단품/세트)
                </p>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {productOptions.map((opt, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                      type="text"
                      value={opt.name}
                      onChange={e => {
                        const next = [...productOptions];
                        next[idx] = { ...next[idx], name: e.target.value };
                        setProductOptions(next);
                      }}
                      placeholder="옵션명 (예: 용량)"
                      style={{
                        width: 120, height: 40, border: '1px solid #ECECF2', borderRadius: 10,
                        padding: '0 10px', fontSize: 13, fontFamily: 'var(--f)', outline: 'none',
                      }}
                      onFocus={e => { e.currentTarget.style.borderColor = '#6D4CFF'; }}
                      onBlur={e => { e.currentTarget.style.borderColor = '#ECECF2'; }}
                    />
                    <input
                      type="text"
                      value={opt.values}
                      onChange={e => {
                        const next = [...productOptions];
                        next[idx] = { ...next[idx], values: e.target.value };
                        setProductOptions(next);
                      }}
                      placeholder="옵션값 (예: 50ml, 100ml)"
                      style={{
                        flex: 1, height: 40, border: '1px solid #ECECF2', borderRadius: 10,
                        padding: '0 10px', fontSize: 13, fontFamily: 'var(--f)', outline: 'none',
                      }}
                      onFocus={e => { e.currentTarget.style.borderColor = '#6D4CFF'; }}
                      onBlur={e => { e.currentTarget.style.borderColor = '#ECECF2'; }}
                    />
                    <button
                      type="button"
                      onClick={() => setProductOptions(productOptions.filter((_, i) => i !== idx))}
                      style={{
                        width: 32, height: 32, borderRadius: 8, border: 'none',
                        background: 'transparent', cursor: 'pointer', flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#BBB',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#FFF0F5'; e.currentTarget.style.color = '#FF4D8D'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#BBB'; }}
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {!isGaejeon && (
              <div className="fg">
                <div className="fl">경쟁 제품 대비 차별점 <span className="freq">*</span></div>
                <textarea className="finp" placeholder={diffPlaceholder}
                  value={diff} onChange={e => setDiff(e.target.value)} />
                <div style={{ fontSize: 11, color: '#B45309', marginTop: 5 }}>⚠️ 실측·검증된 수치만 입력하세요 (과장 수치는 표시광고법 위반 위험)</div>
              </div>
            )}
          </AccordionSection>

          {/* Dynamic sections s2~s8 */}
          {visibleSections.map((sec, idx) => {
            const num = idx + 2;
            const sectionQs = getSectionQs(sec.id);
            const hasChips = sectionQs.some(q => q.opts && q.opts.length > 0);
            const badge = hasChips ? countSection(sec.id) : undefined;
            const hasReq = sectionQs.some(q => q.req);
            // s4 is special: show brandIntro textarea if no CQ questions
            const isS4 = sec.id === 's4';
            const isOpen = openSecs.has(sec.id);

            return (
              <AccordionSection
                key={sec.id}
                num={num}
                title={sec.title}
                req={hasReq || (isS4 && sectionQs.length === 0 ? false : false)}
                isOpen={isOpen}
                onToggle={() => toggleSec(sec.id)}
                badge={badge}
              >
                {sectionQs.length > 0
                  ? sectionQs.map(q => (
                      <QuestionField
                        key={q.id}
                        q={q}
                        answer={answers[q.id] ?? (q.mode === 'single' || q.mode === 'multi' ? [] : '')}
                        onAnswer={val => setAnswer(q.id, val)}
                      />
                    ))
                  : isS4 && (
                      <div className="fg">
                        <div className="fl">브랜드/제품 한 줄 소개 <span className="fopt">선택</span></div>
                        <textarea
                          className="finp"
                          placeholder="예: 10년 연구 끝에 탄생한 피부과 의사 추천 제품입니다..."
                          value={brandIntro}
                          onChange={e => setBrandIntro(e.target.value)}
                        />
                        <div className="fhint">브랜드 스토리 섹션에 활용됩니다</div>
                      </div>
                    )
                }
              </AccordionSection>
            );
          })}

          {/* 기타 요청사항 (always shown) */}
          <AccordionSection
            num={visibleSections.length + 2}
            title="기타 요청사항"
            isOpen={openSecs.has('s_extra')}
            onToggle={() => toggleSec('s_extra')}
          >
            <div className="fg">
              <textarea
                className="finp"
                placeholder={'AI에게 추가로 전달할 내용을 자유롭게 입력하세요.\n예: 톤은 친근하게, 영어 단어 최소화, 가격보다 성분 강조...'}
                value={extraNote}
                onChange={e => setExtraNote(e.target.value)}
                style={{ minHeight: 76 }}
              />
              <div className="fhint">입력한 내용이 AI 생성 지침에 직접 반영됩니다</div>
            </div>
          </AccordionSection>

          {/* AI 추천 추가 정보 */}
          <div style={{
            border: '1.5px solid #DDD6FE',
            borderRadius: 10, padding: '16px 18px', marginTop: 16,
            background: '#FAFAFF',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 14 }}>
              <Sparkles size={15} color="#6D4CFF" />
              <span style={{ fontSize: 13, fontWeight: 700, color: '#6D4CFF' }}>AI가 추천한 추가 정보</span>
              <span style={{ fontSize: 11, color: '#9CA3AF', marginLeft: 4 }}>선택하면 생성 품질이 올라가요</span>
            </div>
            {aiRecs.map(rec => (
              <div key={rec.label} style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 7 }}>{rec.label}</div>
                <div className="chips">
                  {rec.chips.map(chip => {
                    const on = aiSelections.includes(chip);
                    return (
                      <div
                        key={chip}
                        className={`chip${on ? ' on' : ''}`}
                        onClick={() => setAiSelections(p => on ? p.filter(x => x !== chip) : [...p, chip])}
                      >{chip}</div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* 경고 배너 */}
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: 10,
            background: '#FFFBEB', border: '1.5px solid #FDE68A',
            borderRadius: 10, padding: '12px 16px', marginTop: 20,
          }}>
            <span style={{ fontSize: 16, flexShrink: 0 }}>⚠️</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#92400E' }}>정확한 정보 입력이 중요해요!</div>
              <div style={{ fontSize: 12, color: '#78350F', marginTop: 3, lineHeight: 1.6 }}>
                입력하신 정보를 바탕으로 AI가 상세페이지를 생성합니다. 정확한 정보일수록 완성도가 높아져요.
              </div>
            </div>
          </div>

          {/* ①실측·검증 동의 — 생성 전 법적 방어선(체크 안 하면 진행 불가) */}
          <label style={{
            display: 'flex', alignItems: 'flex-start', gap: 9, marginTop: 24,
            padding: '12px 14px', borderRadius: 10,
            background: agreed ? '#F0FDF4' : '#FFFBEB',
            border: `1px solid ${agreed ? '#BBF7D0' : '#FDE68A'}`,
            cursor: 'pointer', transition: 'all .15s',
          }}>
            <input
              type="checkbox"
              checked={agreed}
              onChange={e => setAgreed(e.target.checked)}
              style={{ width: 16, height: 16, marginTop: 1, accentColor: '#6D4CFF', flexShrink: 0, cursor: 'pointer' }}
            />
            <span style={{ fontSize: 12, lineHeight: 1.6, color: agreed ? '#166534' : '#92400E' }}>
              입력한 정보는 <b>실측·검증된 사실</b>이며, 과장·허위 정보로 인한 <b>표시광고법상 책임이 본인에게 있음</b>을 확인합니다. <span style={{ color: '#DC2626', fontWeight: 700 }}>(필수)</span>
            </span>
          </label>

          {/* Navigation footer */}
          <div className="cta-row" style={{ marginTop: 14 }}>
            <button className="btn-back" onClick={() => go(prevScreen as any)}>
              <ArrowLeft size={14} style={{ display: 'inline', marginRight: 4 }} />
              이전 단계
            </button>
            <span style={{ fontSize: 12, color: '#9CA3AF', textAlign: 'center', flex: 1 }}>
              입력하신 정보는 언제든 수정 가능합니다
            </span>
            <button className="btn-next" onClick={handleNext}>
              다음 단계로 →
            </button>
          </div>
        </div>

        {/* ── Right: 실시간 미리보기 panel ── */}
        <div style={{
          width: 290, flexShrink: 0,
          position: 'sticky', top: 24,
          border: '1.5px solid #E5E7EB',
          borderRadius: 12, overflow: 'hidden',
          background: '#fff',
        }}>
          {/* Panel header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 16px',
            borderBottom: '1px solid #F3F4F6',
            background: '#F7F5FF',
          }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#6D4CFF' }}>✦ 실시간 미리보기</span>
            <button
              onClick={() => {}}
              style={{
                background: 'none', border: 'none', cursor: 'pointer', padding: 4,
                color: '#9CA3AF', display: 'flex', alignItems: 'center',
              }}
            >
              <RefreshCw size={14} />
            </button>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid #F3F4F6' }}>
            {(['blog', 'slide'] as const).map(t => (
              <button
                key={t}
                onClick={() => setPreviewTab(t)}
                style={{
                  flex: 1, padding: '9px 0', fontSize: 12, fontWeight: 600,
                  border: 'none', cursor: 'pointer',
                  background: previewTab === t ? '#fff' : '#FAFAFA',
                  color: previewTab === t ? '#6D4CFF' : '#9CA3AF',
                  borderBottom: previewTab === t ? '2px solid #6D4CFF' : '2px solid transparent',
                  transition: 'all .15s',
                }}
              >
                {t === 'blog' ? '블로그형' : '슬라이드형'}
              </button>
            ))}
          </div>

          {/* Preview card */}
          <div style={{ padding: '14px 14px 0' }}>
            {/* ★카테고리별 미리보기 — 출력형태 화면(s3b)과 같은 공통 컴포넌트. 탭(블로그/슬라이드)에 따라 전환, 상품명 실시간 반영 */}
            <div style={{ marginBottom: 14 }}>
              {previewTab === 'blog'
                ? <CatBlogPreview cat={cat} productName={productName} />
                : <CatSlidePreview cat={cat} productName={productName} />}
            </div>

            {/* 입력 정보 요약 */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#374151', marginBottom: 8 }}>입력 정보 요약</div>
              {[
                { label: '상품명', value: productName.trim() || '-' },
                { label: '브랜드', value: brand.trim() || '-' },
                { label: '카테고리', value: cat ?? '-' },
              ].map(row => (
                <div key={row.label} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '5px 0', borderBottom: '1px solid #F3F4F6',
                }}>
                  <span style={{ fontSize: 11, color: '#9CA3AF' }}>{row.label}</span>
                  <span style={{
                    fontSize: 11, fontWeight: 600, color: '#111',
                    maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>{row.value}</span>
                </div>
              ))}
            </div>

            {/* AI TIP */}
            <div style={{
              background: '#F7F5FF', borderRadius: 8, padding: '10px 12px', marginBottom: 16,
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#6D4CFF', marginBottom: 4 }}>✦ AI TIP</div>
              <div style={{ fontSize: 11, color: '#7C3AED', lineHeight: 1.6 }}>
                필수 항목을 모두 채우면 AI가 더 정확한 상세페이지를 만들어드려요. 현재 완성도 {pct}%
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
