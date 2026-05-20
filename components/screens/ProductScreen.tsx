'use client';

import { useState } from 'react';
import { useApp } from '@/store/AppContext';

/* ─────────────────────────────────────────────
   타입 정의
───────────────────────────────────────────── */
type QMode = 'single' | 'multi' | 'text' | 'textarea' | 'origin' | 'legal';

interface Question {
  id: string;
  label: string;
  req: boolean;
  mode: QMode;
  hint?: string;
  opts?: string[];
  fields?: string[];
  placeholder?: string;
  sectionTitle?: string;
}

/* ─────────────────────────────────────────────
   카테고리별 질문 정의
───────────────────────────────────────────── */
const CQ: Record<string, Question[]> = {
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
      id: 'c8', label: '가격대', req: false, mode: 'single',
      opts: ['1만원 미만','1~3만원','3~5만원','5~10만원','10만원 이상'],
    },
    {
      id: 'c9', label: '⚠️ 법적 고지 (화장품 필수 표시)', req: true, mode: 'legal',
      fields: ['제조사명','제조국','사용기한 또는 개봉 후 사용기간'],
      hint: '화장품법에 의거 상세페이지 하단에 자동 법적 고지 섹션이 생성됩니다',
    },
  ],

  식품: [
    {
      id: 'f1', label: '식품 종류', req: true, mode: 'single',
      opts: ['신선식품','가공식품','건강기능식품','간편식/HMR','음료/차','과자/스낵','반찬/소스'],
    },
    {
      id: 'f2', label: '주요 타겟', req: true, mode: 'multi',
      hint: '타겟 → 히어로 카피 + 공감 섹션 문구에 직접 반영',
      opts: ['1인가구','다이어터','건강관리','가족/아이','시니어','MZ세대'],
    },
    {
      id: 'f3', label: '특징/인증', req: true, mode: 'multi',
      hint: '인증·특징 → 신뢰 배지 섹션에 자동 삽입',
      opts: ['HACCP인증','유기농','무농약','국내산','저칼로리','비건','무첨가','제철식품'],
    },
    {
      id: 'f4', label: '판매 포인트', req: true, mode: 'multi',
      hint: '판매 포인트 → 구매 이유 섹션 + CTA 카피에 반영',
      opts: ['산지직송','당일배송','새벽배송','정기구독','선물세트','소용량/대용량'],
    },
    {
      id: 'f5', label: '원산지 정보', req: true, mode: 'origin',
      hint: '원산지는 상세페이지에 법적으로 반드시 표시됩니다',
      opts: ['국내산','수입산','국내산+수입산 혼합'],
    },
    {
      id: 'f6', label: '알레르기 유발 원료', req: true, mode: 'multi',
      hint: '법적 의무 표시 — 하단 법적 고지 섹션에 자동 생성',
      opts: ['밀/글루텐','대두','우유','달걀','갑각류(새우/게)','견과류','땅콩','복숭아','토마토','해산물','해당 없음'],
    },
    {
      id: 'f7', label: '가격대', req: false, mode: 'single',
      opts: ['1만원 미만','1~3만원','3~5만원','5~10만원','10만원 이상'],
    },
    {
      id: 'f8', label: '추가 상품 정보', req: false, mode: 'textarea',
      placeholder: '예: 냉동 배송, 소분 판매, 유통기한 제조일로부터 12개월, 개봉 후 냉장 보관...',
      hint: '보관·섭취 방법, 특이사항 등 AI에게 전달할 추가 정보를 자유롭게 입력하세요',
    },
  ],

  패션: [
    {
      id: 'fa1', label: '상품 종류', req: true, mode: 'single',
      opts: ['상의','하의','아우터','원피스/세트','신발','가방/지갑','액세서리','속옷/홈웨어'],
    },
    {
      id: 'fa2', label: '스타일', req: true, mode: 'multi',
      hint: '스타일 무드 → 비주얼 방향 + 카피 톤에 반영',
      opts: ['캐주얼','오피스룩','스트릿','미니멀','빈티지','스포티','페미닌','고프코어'],
    },
    {
      id: 'fa3', label: '소재', req: true, mode: 'multi',
      hint: '소재 → 제품 신뢰 섹션 + 상세 스펙에 반영',
      opts: ['면/코튼','린넨','울/니트','데님','가죽/PU','쉬폰','폴리에스터','친환경소재'],
    },
    {
      id: 'fa4', label: '타겟', req: true, mode: 'multi',
      hint: '타겟 → 히어로 카피 + 착용 연출 이미지 방향에 반영',
      opts: ['10대','20대','30대','40대이상','남성','여성','남녀공용'],
    },
    {
      id: 'fa5', label: '핵심 특징', req: false, mode: 'multi',
      opts: ['국내 제조','핸드메이드','사이즈 다양(XS~3XL)','빅사이즈 전문','체형 커버','세탁기 가능','구김 거의 없음','친환경/비건 소재','시즌리스','UV 차단'],
    },
    {
      id: 'fa6', label: '가격대', req: false, mode: 'single',
      opts: ['1만원 미만','1~3만원','3~5만원','5~10만원','10만원 이상'],
    },
    {
      id: 'fa7', label: '추가 상품 정보', req: false, mode: 'textarea',
      placeholder: '예: 사이즈 측정 오차 ±2cm, 색상은 모니터에 따라 실물과 다를 수 있음, 드라이클리닝 권장...',
      hint: '사이즈·세탁·컬러 안내 등 AI에게 전달할 추가 정보를 입력하세요',
    },
  ],

  생활: [
    {
      id: 'lv1', label: '상품 종류', req: true, mode: 'single',
      opts: ['가구','조명','침구/커튼','주방용품','욕실용품','청소용품','수납/정리','인테리어소품'],
    },
    {
      id: 'lv2', label: '스타일', req: true, mode: 'multi',
      hint: '스타일 → 비주얼 무드 + 카피 톤에 반영',
      opts: ['북유럽','모던','빈티지','내추럴','미니멀','인더스트리얼','한국전통'],
    },
    {
      id: 'lv3', label: '소재', req: false, mode: 'multi',
      opts: ['원목','MDF','패브릭','금속','유리','세라믹','대나무/친환경'],
    },
    {
      id: 'lv4', label: '특징', req: true, mode: 'multi',
      hint: '특징 → 신뢰 섹션 + 구매 결정 포인트에 반영',
      opts: ['조립식','완제품','맞춤제작','친환경인증','항균/항바이러스','다용도','국내 제조','AS 보장'],
    },
    {
      id: 'lv5', label: '주요 타겟', req: false, mode: 'multi',
      opts: ['1인 가구','신혼부부','가족(자녀 있음)','인테리어 관심 고객','B2B/사업자(카페/사무실)'],
    },
    {
      id: 'lv6', label: '가격대', req: false, mode: 'single',
      opts: ['1만원 미만','1~5만원','5~15만원','15~30만원','30만원 이상'],
    },
    {
      id: 'lv7', label: '추가 상품 정보', req: false, mode: 'textarea',
      placeholder: '예: 사이즈별 중량 상이, 배송 시 박스 포장, 반품 시 조립 상태여야 함, 실내 전용...',
      hint: '조립·배송·주의사항 등 AI에게 전달할 추가 정보를 입력하세요',
    },
  ],

  가전: [
    // ── 제품 상세 ──
    {
      id: 'dg1', label: '상품 종류', req: true, mode: 'single',
      sectionTitle: '제품 상세',
      opts: ['주방가전','생활가전','미용가전','스마트홈','컴퓨터','스마트폰','음향기기','카메라'],
    },
    {
      id: 'dg2', label: '핵심 스펙', req: true, mode: 'textarea',
      placeholder: '예: 흡입력 25000Pa, 배터리 60분, 무게 3.1kg',
      hint: '스펙 수치 → 비교표 섹션 + 히어로 서브카피에 자동 반영',
    },
    {
      id: 'dg3', label: '주요 기능', req: true, mode: 'multi',
      hint: '기능 → USP 섹션 + 비교표에 우선 배치',
      opts: ['스마트연동','저소음','에너지절약','자동세척','음성인식','앱연동','타이머'],
    },
    {
      id: 'dg4', label: '차별화 기술/특허', req: false, mode: 'text',
      placeholder: '예: 독자개발 사이클론 기술, 먼지감지 자동조절',
      hint: '기술·특허 → 신뢰 섹션 + 기술 강조 배지에 반영',
    },
    // ── 신뢰/인증 ──
    {
      id: 'dg5', label: '인증/보증', req: true, mode: 'multi',
      sectionTitle: '신뢰/인증',
      hint: '인증 → 신뢰 배지 섹션에 자동 삽입',
      opts: ['KC인증','에너지효율1등급','AS2년이상','정품보증','방수/방진'],
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
      opts: ['가격 대비 성능(가성비)','프리미엄 품질/내구성','특허 기술','국내 브랜드 신뢰','배터리 성능 압도','디자인/경량화'],
    },
    {
      id: 'dg8', label: '경쟁 제품 대비 차별점', req: true, mode: 'textarea',
      placeholder: '예: 타사 대비 흡입력 30% 높고 소음은 20% 낮음, 2년 무상 AS',
      hint: '차별점 → 비교 섹션 + 구매 설득 섹션에 핵심 카피로 반영',
    },
    {
      id: 'dg9', label: '주요 타겟', req: false, mode: 'multi',
      hint: '타겟 → 히어로 카피 + 공감 섹션 문구에 반영',
      opts: ['1인가구','신혼부부','맞벌이부부','청소전문가','반려동물가정','대가족'],
    },
    // ── 법적 고지 ──
    {
      id: 'dg10', label: '주의사항/법적 고지', req: false, mode: 'textarea',
      sectionTitle: '법적 고지',
      placeholder: '예: 전기용품안전법 준수, 어린이 손에 닿지 않는 곳 보관',
      hint: 'KC인증번호·전기용품안전법 등 법적 필수 표시 → 하단 법적 고지 섹션에 자동 생성',
    },
  ],

  반려동물: [
    {
      id: 'pt1', label: '상품 종류', req: true, mode: 'single',
      opts: ['사료/주식','간식/져키','영양제/보조식품','장난감','용품/생활','의류/패션','미용용품','이동용품'],
    },
    {
      id: 'pt2', label: '타겟 동물', req: true, mode: 'multi',
      hint: '동물 종류 → 히어로 카피 + 이미지 방향에 반영',
      opts: ['강아지','고양이','소동물(토끼/햄스터)','파충류/어류','공통'],
    },
    {
      id: 'pt3', label: '연령대', req: true, mode: 'single',
      hint: '연령대 → 영양 섹션 + 공감 카피에 반영',
      opts: ['퍼피/키튼(~1살)','성견/성묘(1~7살)','노령견/노령묘(7살이상)','전 연령'],
    },
    {
      id: 'pt4', label: '특징', req: true, mode: 'multi',
      hint: '특징 → 신뢰 배지 + 성분 신뢰 섹션에 우선 배치',
      opts: ['수의사추천','무첨가/천연','국내산','HACCP','알러지케어','소화흡수율'],
    },
    {
      id: 'pt5', label: '해결하는 주요 고민', req: false, mode: 'multi',
      hint: '고민 → 공감 섹션 핵심 카피에 반영',
      opts: ['피부/털 관리','소화/장 건강','관절/노령 케어','체중 관리','스트레스/분리불안','치아/구강 건강','눈물자국 개선','심장/면역 건강'],
    },
    {
      id: 'pt6', label: '가격대', req: false, mode: 'single',
      opts: ['1만원 미만','1~3만원','3~5만원','5~10만원','10만원 이상'],
    },
    {
      id: 'pt7', label: '추가 상품 정보', req: false, mode: 'textarea',
      placeholder: '예: 급여 방법, 1일 권장량, 보관 방법, 특정 질환견 금기 여부...',
      hint: '급여·보관·주의사항 등 AI에게 전달할 추가 정보를 입력하세요',
    },
  ],

  스포츠: [
    {
      id: 'sp1', label: '상품 종류', req: true, mode: 'single',
      opts: ['운동복/신발','헬스/피트니스','구기종목','수영/수상','등산/캠핑','자전거','요가/필라테스','골프'],
    },
    {
      id: 'sp2', label: '소재/기술', req: true, mode: 'multi',
      hint: '소재·기술 → 제품 신뢰 섹션 + 기능 강조에 반영',
      opts: ['기능성원단','흡습속건','방수/방풍','자외선차단','압박기능','경량소재'],
    },
    {
      id: 'sp3', label: '타겟', req: true, mode: 'multi',
      hint: '타겟 → 히어로 카피 + 공감 섹션 문구에 반영',
      opts: ['입문자','중급자','전문가','남성','여성','시니어'],
    },
    {
      id: 'sp4', label: '특징', req: false, mode: 'multi',
      opts: ['국내브랜드','해외직수입','공식인증','한정판'],
    },
    {
      id: 'sp5', label: '가격대', req: false, mode: 'single',
      opts: ['1만원 미만','1~5만원','5~15만원','15~30만원','30만원 이상'],
    },
    {
      id: 'sp6', label: '추가 상품 정보', req: false, mode: 'textarea',
      placeholder: '예: 사이즈 선택 방법, 세탁 주의사항, 착용 시 주의점, 방수 등급 상세...',
      hint: '사이즈·관리법 등 AI에게 전달할 추가 정보를 입력하세요',
    },
  ],

  유아: [
    {
      id: 'ba1', label: '상품 종류', req: true, mode: 'single',
      opts: ['의류/속옷','침구/수면','수유/이유식','목욕/위생','장난감/교구','유모차/카시트','임산부용품'],
    },
    {
      id: 'ba2', label: '대상 연령', req: true, mode: 'single',
      hint: '연령대 → 제품 특성 + 안전 섹션에 반영',
      opts: ['신생아(0~3개월)','영아(3~12개월)','걸음마기(1~3세)','유아(3~7세)','임산부'],
    },
    {
      id: 'ba3', label: '안전인증', req: true, mode: 'multi',
      hint: '유아 제품은 안전 인증이 구매 결정에 결정적 — 신뢰 배지 최상단 배치',
      opts: ['KC인증','친환경인증','무형광/무독성','BPA프리','오가닉코튼'],
    },
    {
      id: 'ba4', label: '특징', req: false, mode: 'multi',
      opts: ['국내생산','소아과추천','세탁기사용가능','선물세트'],
    },
    {
      id: 'ba5', label: '가격대', req: false, mode: 'single',
      opts: ['1만원 미만','1~3만원','3~5만원','5~10만원','10만원 이상'],
    },
    {
      id: 'ba6', label: '추가 상품 정보', req: false, mode: 'textarea',
      placeholder: '예: 사용 방법, 세탁 방법, 보관 방법, 함께 쓰면 좋은 제품, 주의사항...',
      hint: '사용·관리·주의사항 등 AI에게 전달할 추가 정보를 입력하세요',
    },
  ],

  건강: [
    {
      id: 'ht1', label: '상품 종류', req: true, mode: 'single',
      opts: ['건강기능식품','한방/전통','의료기기','마사지기기','혈압/혈당측정','안마의자','개인위생'],
    },
    {
      id: 'ht2', label: '건강 목적', req: true, mode: 'multi',
      hint: '건강 목적 → 히어로 카피 + 공감 섹션의 핵심',
      opts: ['면역력','눈건강','관절/뼈','다이어트','피부미용','소화/장건강','수면개선','혈행개선'],
    },
    {
      id: 'ht3', label: '인증', req: true, mode: 'multi',
      hint: '건강 제품은 전문성과 인증이 핵심 신뢰 요소 — 신뢰 섹션 최우선 배치',
      opts: ['식약처인증','의료기기허가','GMP인증','임상시험완료','특허성분'],
    },
    {
      id: 'ht4', label: '복용/사용 대상', req: false, mode: 'multi',
      opts: ['20~30대','40~50대','시니어','남성','여성','수험생'],
    },
    {
      id: 'ht5', label: '가격대', req: false, mode: 'single',
      opts: ['1만원 미만','1~3만원','3~5만원','5~10만원','10만원 이상'],
    },
    {
      id: 'ht6', label: '추가 상품 정보', req: false, mode: 'textarea',
      placeholder: '예: 1일 1회 1정 식후 복용, 냉암소 보관, 임산부 복용 전 의사 상담 권장, 주요 원료 함량...',
      hint: '복용법·금기사항·원료 상세 등 AI에게 전달할 추가 정보를 입력하세요',
    },
  ],

  자동차: [
    {
      id: 'cr1', label: '상품 종류', req: true, mode: 'single',
      opts: ['차량용전자기기','외장용품','내장용품','세차/케어','안전용품','튜닝부품','타이어/휠'],
    },
    {
      id: 'cr2', label: '호환 차종', req: true, mode: 'multi',
      hint: '호환 차종 → 타겟 섹션 + 구매 안내에 반영',
      opts: ['국산차 전체','수입차 전체','현대/기아','BMW/벤츠','전기차전용','차종무관'],
    },
    {
      id: 'cr3', label: '기능', req: true, mode: 'multi',
      hint: '기능 → USP 섹션 + 비교표에 우선 배치',
      opts: ['무선충전','블루투스','앱연동','방수/방진','야간시인성','쉬운설치'],
    },
    {
      id: 'cr4', label: '특징', req: false, mode: 'multi',
      opts: ['정품인증','국내제조','특허제품','설치서비스포함'],
    },
    {
      id: 'cr5', label: '가격대', req: false, mode: 'single',
      opts: ['1만원 미만','1~5만원','5~15만원','15~30만원','30만원 이상'],
    },
    {
      id: 'cr6', label: '추가 상품 정보', req: false, mode: 'textarea',
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
      id: 'et5', label: '가격대', req: false, mode: 'single',
      opts: ['1만원 미만','1~3만원','3~5만원','5~10만원','10만원 이상'],
    },
  ],
};

/* ─────────────────────────────────────────────
   칩 컴포넌트
───────────────────────────────────────────── */
function ChipGroup({ opts, multi, value, onChange }: {
  opts: string[]; multi: boolean; value: string[]; onChange: (v: string[]) => void;
}) {
  const toggle = (o: string) => {
    if (multi) onChange(value.includes(o) ? value.filter(x => x !== o) : [...value, o]);
    else onChange(value[0] === o ? [] : [o]);
  };
  return (
    <div className="chips">
      {opts.map(o => (
        <div key={o} className={`chip${value.includes(o) ? ' on' : ''}`} onClick={() => toggle(o)}>
          {o}
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────
   질문 한 개 렌더링
───────────────────────────────────────────── */
function QuestionField({ q, answer, onAnswer }: {
  q: Question;
  answer: string | string[];
  onAnswer: (v: string | string[]) => void;
}) {
  // origin 모드: 칩(단일)과 텍스트 입력을 로컬로 관리 후 합쳐서 상위에 전달
  const [originChip, setOriginChip] = useState<string[]>([]);
  const [originText, setOriginText] = useState('');
  const handleOriginChip = (chips: string[]) => {
    setOriginChip(chips);
    onAnswer([chips[0], originText].filter(Boolean).join(' / '));
  };
  const handleOriginText = (text: string) => {
    setOriginText(text);
    onAnswer([originChip[0], text].filter(Boolean).join(' / '));
  };

  // legal 모드: 필드별 로컬 상태 → 합쳐서 상위에 전달
  const [legalVals, setLegalVals] = useState<Record<string, string>>({});
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
              <div className="legal-title">⚠️ 화장품 법적 필수 표시</div>
              <div className="legal-desc">화장품법에 의거 상세페이지에 반드시 포함되어야 합니다. 하단에 법적 고지 섹션이 자동 생성됩니다.</div>
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

export default function ProductScreen() {
  const { cat, ch, type, go, productName, setProductName, setProductExtra } = useApp();
  const qs = CQ[cat ?? '기타'] ?? CQ['기타'];
  const isGaejeon = cat === '가전';
  const namePlaceholder  = PRODUCT_NAME_PLACEHOLDERS[cat ?? ''] ?? '예: 상품명을 입력하세요';
  const brandPlaceholder = BRAND_NAME_PLACEHOLDERS[cat ?? '']   ?? '예: 브랜드명을 입력해주세요';
  const diffPlaceholder  = DIFF_PLACEHOLDERS[cat ?? '']         ?? '예: 경쟁 제품 대비 차별점을 입력해주세요';

  // 폼 전체 상태
  const [brand,     setBrand]     = useState('');
  const [diff,      setDiff]      = useState('');
  const [extraNote, setExtraNote] = useState('');
  const [priceChip, setPriceChip] = useState<string[]>([]);
  const [answers,   setAnswers]   = useState<Record<string, string | string[]>>({});
  const setAnswer = (id: string, val: string | string[]) =>
    setAnswers(p => ({ ...p, [id]: val }));

  // 다음 클릭 → 전체 입력값을 직렬화해 AppContext에 저장
  const handleNext = () => {
    if (!productName.trim()) {
      alert('상품명을 입력해주세요.');
      return;
    }
    const lines: string[] = [];
    if (brand.trim())                     lines.push(`브랜드명: ${brand.trim()}`);
    if (isGaejeon && priceChip.length)    lines.push(`가격대: ${priceChip[0]}`);
    qs.forEach(q => {
      const val = answers[q.id];
      if (!val || (Array.isArray(val) && val.length === 0) || val === '') return;
      const str = Array.isArray(val) ? val.join(', ') : String(val).trim();
      if (str) lines.push(`[${q.label}]: ${str}`);
    });
    if (!isGaejeon && diff.trim())        lines.push(`경쟁 차별점: ${diff.trim()}`);
    if (extraNote.trim())                 lines.push(`기타 요청사항: ${extraNote.trim()}`);
    setProductExtra(lines.join('\n'));
    go('s5-5');
  };

  const prevScreen = ch === '스마트스토어' ? 's3b' : 's3';

  return (
    <div className="inner">
      <div className="stitle">상품 정보를 입력해주세요</div>
      <div className="ssub">{cat} · {ch} · {type} 기준 — 꼭 필요한 정보만 물어볼게요</div>

      {/* 기본 정보 */}
      <div className="fb">
        <div className="fdiv">
          <div className="fdiv-line" /><span className="fdiv-lbl">기본 정보</span><div className="fdiv-line" />
        </div>
        <div className="fg">
          <div className="fl">상품명 <span className="freq">*</span></div>
          <input
            className="finp"
            type="text"
            placeholder={namePlaceholder}
            onChange={e => setProductName(e.target.value)}
          />
        </div>
        <div className="fg">
          <div className="fl">브랜드명 <span className="fopt">선택</span></div>
          <input className="finp" type="text" placeholder={brandPlaceholder}
            value={brand} onChange={e => setBrand(e.target.value)} />
        </div>
        {isGaejeon && (
          <div className="fg">
            <div className="fl">가격대 <span className="fopt">선택</span></div>
            <ChipGroup opts={['5만원 미만','5~15만원','15~30만원','30~50만원','50만원 이상']}
              multi={false} value={priceChip} onChange={setPriceChip} />
          </div>
        )}
      </div>

      {/* 카테고리 전용 질문 */}
      <div className="fb">
        {!isGaejeon && (
          <div className="fdiv">
            <div className="fdiv-line" /><span className="fdiv-lbl">{cat} 전용 정보</span><div className="fdiv-line" />
          </div>
        )}
        {qs.map(q => (
          <QuestionField
            key={q.id}
            q={q}
            answer={answers[q.id] ?? (q.mode === 'single' || q.mode === 'multi' ? [] : '')}
            onAnswer={val => setAnswer(q.id, val)}
          />
        ))}
      </div>

      {/* 판매 전략 */}
      <div className="fb">
        <div className="fdiv">
          <div className="fdiv-line" /><span className="fdiv-lbl">판매 전략</span><div className="fdiv-line" />
        </div>
        {!isGaejeon && (
          <div className="fg">
            <div className="fl">경쟁 제품 대비 차별점 <span className="freq">*</span></div>
            <textarea className="finp" placeholder={diffPlaceholder}
              value={diff} onChange={e => setDiff(e.target.value)} />
          </div>
        )}
        <div className="fg">
          <div className="fl">기타 요청사항 <span className="fopt">선택</span></div>
          <textarea
            className="finp"
            placeholder={'AI에게 추가로 전달할 내용을 자유롭게 입력하세요.\n예: 톤은 친근하게, 영어 단어 최소화, 가격보다 성분 강조...'}
            value={extraNote}
            onChange={e => setExtraNote(e.target.value)}
            style={{ minHeight: 76 }}
          />
          <div className="fhint">입력한 내용이 AI 생성 지침에 직접 반영됩니다</div>
        </div>
      </div>

      <div className="cta-row">
        <button className="btn-back" onClick={() => go(prevScreen as any)}>← 이전</button>
        <button className="btn-next" onClick={handleNext}>레퍼런스 →</button>
      </div>
    </div>
  );
}
