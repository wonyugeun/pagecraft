/**
 * 개발용 테스트 프리셋 — 상품정보 화면에서 클릭 한 번에 모든 입력 필드를 채운다.
 *
 * ★개발 모드 전용: ProductScreen이 process.env.NODE_ENV === 'development' 게이트로만
 *   버튼을 렌더한다. 프로덕션 빌드에선 버튼이 트리에 없어 셀러에게 절대 노출되지 않는다.
 *   (이 상수 파일 자체는 번들에 포함될 수 있으나 호출 경로가 dev 게이트 뒤에 있어 무해.)
 *
 * answers 키는 ProductScreen의 카테고리별 질문 id와 정확히 일치해야 한다(화장품 c*, 식품 f*).
 * single/multi = 배열, textarea = 문자열, legal(c9) = "필드: 값 / 필드: 값" 문자열.
 */
export interface TestPreset {
  label: string;
  cat: string;
  productName: string;
  brand: string;
  diff: string;
  brandIntro: string;
  extraNote: string;
  reviews: string;   // 채우면 '진짜 후기' 케이스, 비우면 '미입력→미래형 시나리오' 케이스 테스트
  productForm?: string;          // Physical Size Engine — 제품 형태(예: toner_bottle)
  productVolume?: string;        // 제품 용량(예: 250ml)
  productShapeProfile?: string;  // 실루엣 프로필(예: slim_tall)
  regularPrice: string;
  salePrice: string;
  showPrice: boolean;
  productOptions: { name: string; values: string }[];
  answers: Record<string, string | string[]>;
}

export const TEST_PRESETS: TestPreset[] = [
  {
    label: '리프그린 시카토너 (화장품·후기 있음)',
    cat: '화장품',
    productName: '리프그린 시카 카밍 토너 200ml',
    brand: '리프그린',
    diff: '병풀 추출물 고함량 + 무알콜 저자극 처방으로 민감 피부도 따갑지 않게',
    brandIntro: '민감성 피부를 위한 더마 코스메틱 브랜드',
    extraNote: '톤은 신뢰감 있되 친근하게, 성분 강조',
    reviews: '민감한데 안 따가워서 매일 써요 - 김OO / 트러블 올라올 때 진정용으로 최고 ★★★★★ - 이OO',
    productForm: 'toner_bottle',        // 토너 병 — 실물 크기 지시(Physical Size Engine) 테스트용
    productVolume: '250ml',
    productShapeProfile: 'slim_tall',
    regularPrice: '32000',
    salePrice: '24000',
    showPrice: true,
    productOptions: [{ name: '용량', values: '200ml, 300ml' }],
    answers: {
      c1: ['스킨/토너'],
      c2: ['민감성/자극 잦은', '트러블/여드름성', '건조함/수분 부족'],
      c3: ['병풀 추출물(진정)', '마데카소사이드(재생)', '판테놀(수분/진정)'],
      c4: ['무알콜', '무향(프래그런스 프리)', '피부과 테스트 완료', '국내 제조'],
      c5: '아토피로 고생하던 창업자가 병풀 성분을 3년간 연구해 만든 저자극 진정 토너입니다.',
      c6: ['20대 후반~30대', '민감성 피부 전용'],
      c7: ['더마/전문가 브랜드 (임상·전문성 강조)'],
      c9: '제조사명: 리프그린랩 / 제조국: 대한민국 / 사용기한 또는 개봉 후 사용기간: 개봉 후 12개월',
      c10: '아침저녁 세안 후 화장솜 또는 손으로 얼굴 전체에 부드럽게 흡수시켜 사용하세요.',
    },
  },
  {
    label: '데일리핏 저당 그래놀라 (식품·후기 없음)',
    cat: '식품',
    productName: '데일리핏 저당 오트 그래놀라 400g',
    brand: '데일리핏',
    diff: '설탕 대신 알룰로스 사용, 국내산 통귀리 60% 이상',
    brandIntro: '건강한 한 끼를 위한 저당 시리얼 브랜드',
    extraNote: '다이어터 타겟, 포만감·저당 강조',
    reviews: '',   // 미입력 케이스 — 후기 섹션이 미래형 시나리오 + 💡 안내로 나오는지 확인용
    regularPrice: '18000',
    salePrice: '13900',
    showPrice: true,
    productOptions: [{ name: '구성', values: '400g 단품, 400g 2개세트' }],
    answers: {
      f1: ['곡물/견과/건과'],
      f2: ['다이어터/건강관리', '1인가구'],
      f3: ['국내산', '저칼로리/저당', 'Non-GMO'],
      f4: ['정기구독 가능', '소용량 판매'],
      f5: '국내산',
      f5b: ['실온보관', '개봉 후 밀봉 보관'],
      f6: ['견과류', '밀/글루텐'],
      f6b: ['제조일로부터 기간 표시'],
      f8: '개봉 후 밀봉해 서늘한 곳에 보관, 제조일로부터 12개월',
    },
  },
];

/** 현재 카테고리에 맞는 프리셋을 고른다. 없으면 첫 프리셋(화장품)으로 폴백. */
export function pickTestPreset(cat: string | null | undefined): TestPreset {
  return TEST_PRESETS.find(p => p.cat === cat) ?? TEST_PRESETS[0];
}
