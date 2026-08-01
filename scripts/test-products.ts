/**
 * 다양성 테스트용 가상 상품 10종(2026-07-31).
 *
 * ★설계 원칙:
 *  1) 전부 한 번도 안 써본 신규 상품. 기존 테스트 상품(접짝뼈국·갈치·세럼·클렌저·비타민·마사지건)에
 *     맞춰 튜닝된 결과를 다시 보는 걸 피하기 위함 — 그건 성능 측정이 아니라 자기 확인이다.
 *  2) 지원 카테고리 10종을 하나씩. 그중 패션·생활·가전·반려동물·유아·자동차 6개는 미검증 영역이다.
 *  3) 상품정보는 ProductScreen의 실제 필드 라벨을 그대로 따른다. 화면에서 셀러가 고를 수 있는
 *     선택지 안에서만 값을 채웠다 — 폼에 없는 값을 넣으면 실사용과 다른 조건이 된다.
 *  4) 정보량을 일부러 불균등하게 뒀다(꼼꼼한 셀러 ↔ 최소한만 적는 셀러). 실제 입력 분포에 가깝게.
 *
 * ⚠️전부 가상 상품이다. 인증·수상·임상 같은 검증 정보는 넣지 않았다 — 날조 방지 로직이
 *   '셀러가 준 것만 쓰는지'를 보려면 애초에 없는 걸 줘선 안 된다.
 */

export interface TestProduct {
  key: string;
  cat: string;
  ch: string;
  productName: string;
  /** 셀러가 폼에서 채운 값 — [라벨]: 값 줄바꿈 형식 */
  fields: string[];
  /** 제품 참조 사진 생성용 프롬프트 — 광고컷이 아니라 '셀러가 폰으로 찍은 사진'에 가깝게 */
  photoPrompt: string;
  /** 정보량 수준 — 결과 품질과의 상관을 보기 위한 라벨 */
  density: '높음' | '보통' | '낮음';
  /** ★폼 원본(ProductScreen의 answers) — 필드 id → 값.
   *  앱은 answers를 조립해 productExtra를 만든다. 브라우저 테스트에서 productExtra만 넣으면
   *  화면의 폼이 비어 보이고, 상품정보 화면을 다시 지나가면 빈 answers로 덮어써진다(2026-08-02). */
  answers?: Record<string, string | string[]>;
}

export const TEST_PRODUCTS: TestProduct[] = [
  {
    key: '01-패션-니트가디건',
    cat: '패션', ch: '스마트스토어', density: '보통',
    productName: '데일리 오버핏 울 니트 가디건',
    fields: [
      '[상품 종류]: 아우터(자켓/코트/점퍼)',
      '[스타일]: 미니멀, 캐주얼',
      '[소재]: 울/캐시미어/니트, 면 혼방',
      '[핏]: 오버핏',
      '[시즌]: 가을/겨울(FW)',
      '[사이즈/치수 (실측표)]: FREE 가슴 108 / 어깨 52 / 총장 70 / 소매 58 (cm)',
      '[타겟 성별/연령]: 20대, 30대, 여성',
      '[세탁 방법]: 손세탁 권장, 단독세탁',
      '[핵심 특징]: 체형 커버 디자인, 사이즈 교환 무료',
      '[기타 추가 정보]: 울 30% 혼방이라 첫 세탁 시 약간 수축될 수 있습니다. 측정 오차 ±2cm. 색상은 모니터에 따라 실물과 차이가 있을 수 있어요.',
    ],
    photoPrompt: 'A beige oversized chunky knit cardigan laid flat on a plain white bed sheet, photographed from directly above with a smartphone in ordinary indoor daylight from a window. Slightly uneven fabric folds, natural soft shadows, no styling props, no text. Casual seller product photo, not an advertisement.',
  },
  {
    key: '02-생활-무쇠팬',
    cat: '생활', ch: '스마트스토어', density: '높음',
    productName: '주물 무쇠 프라이팬 26cm (시즈닝 완료)',
    fields: [
      '[상품 종류]: 주방용품(냄비/그릇/도마)',
      '[스타일]: 내추럴/우드, 미니멀',
      '[소재]: 주철(무쇠), 손잡이 오크 원목',
      '[설치/사용 방법]: 첫 사용 전 물로 헹군 뒤 기름을 얇게 두르고 약불로 3분 예열해주세요. 세척 후에는 반드시 물기를 완전히 말려야 녹이 슬지 않습니다.',
      '[특징]: 인덕션 사용 가능, 오븐 사용 가능, 시즈닝 완료 상태로 출고',
      '[사이즈 구성]: 지름 26cm / 깊이 4.5cm / 무게 1.7kg / 손잡이 포함 총길이 44cm',
      '[주요 타겟]: 1인 가구, 신혼부부, 요리에 관심 많은 고객',
      '[기타 추가 정보]: 무쇠 특성상 표면에 미세한 주물 자국이 있을 수 있으며 불량이 아닙니다. 식기세척기 사용은 권장하지 않습니다. 사용할수록 기름막이 쌓여 코팅이 좋아집니다.',
    ],
    photoPrompt: 'A black cast iron skillet with a short oak wood handle, sitting on a wooden kitchen counter, photographed at a slight angle with a smartphone under warm kitchen ceiling light. Visible cast texture on the surface, a few faint use marks. Plain background, no food, no text. Ordinary seller product photo.',
  },
  {
    key: '03-가전-가습기',
    cat: '가전', ch: '스마트스토어', density: '높음',
    productName: '무드등 초음파 가습기 4.5L',
    fields: [
      '[상품 종류]: 계절가전(에어컨/선풍기/히터/가습기)',
      '[핵심 스펙]: 용량 4.5L / 분무량 최대 300ml/h / 소비전력 25W / 소음 30dB 이하 / 연속 사용 최대 15시간',
      '[주요 기능]: 3단계 분무량 조절, 야간 무드등(2color), 물 부족 자동 차단, 상부 급수 방식',
      '[에너지 효율 등급]: 해당 없음(소형가전)',
      '[설치/사용 방법]: 상부 뚜껑을 열고 직접 물을 부으면 됩니다. 정수기 물 또는 끓여서 식힌 물 권장.',
      '[안전/인증]: KC 전자파적합등록',
      '[보증 기간]: 구매일로부터 1년',
      '[핵심 USP]: 상부 급수로 물통을 분리하지 않고 바로 채울 수 있음',
      '[경쟁 제품 대비 차별점]: 대부분의 4L대 가습기가 물통을 분리해 뒤집어 채우는 방식인데, 이 제품은 뚜껑만 열고 부으면 됩니다.',
      '[주요 타겟]: 1인가구, 신혼부부, 아이 있는 가정',
      '[주의사항/법적 고지]: 가습기 살균제는 절대 사용하지 마세요. 매일 물을 갈고 주 1회 이상 내부를 세척해주세요.',
      '[기타 추가 정보]: 필터가 없는 초음파 방식이라 수돗물 사용 시 백화현상(흰 가루)이 생길 수 있습니다.',
    ],
    photoPrompt: 'A white cylindrical ultrasonic humidifier about 30cm tall standing on a wooden bedside table in a bedroom, photographed straight on with a smartphone in soft evening indoor light. Power cord visible trailing off. Slightly cluttered real home background, blurred. No text, no visible mist. Ordinary seller product photo.',
  },
  {
    key: '04-반려동물-급수기',
    cat: '반려동물', ch: '스마트스토어', density: '보통',
    productName: '고양이 자동 급수기 2L (무선 펌프)',
    fields: [
      '[상품 종류]: 용품(밥그릇/모래/패드)',
      '[타겟 동물]: 고양이',
      '[대상 연령]: 전연령',
      '[원료/성분 특징]: 본체 무독성 ABS, 물그릇 스테인리스 트레이',
      '[급여/사용 방법]: 물을 2L까지 채우고 펌프를 넣으면 자동으로 순환합니다. 필터는 2~4주마다 교체해주세요.',
      '[해결하는 주요 고민]: 물을 잘 안 마시는 고양이, 방광염·요로결석 걱정',
      '[보관 방법]: 주 1회 분해 세척 권장',
      '[기타 추가 정보]: 무선 충전식이라 콘센트 위치와 상관없이 놓을 수 있고, 한 번 충전으로 약 20일 사용 가능합니다. 소음은 거의 없지만 물이 줄면 펌프 소리가 조금 커질 수 있어요.',
    ],
    photoPrompt: 'A white plastic cat water fountain with a stainless steel top tray, placed on a tiled kitchen floor next to a wall, photographed from a low angle with a smartphone under plain indoor ceiling light. Slightly dusty floor, a cat food bowl partially visible at the edge. No text, no cat. Ordinary seller product photo.',
  },
  {
    key: '05-유아-원목교구',
    cat: '유아', ch: '스마트스토어', density: '낮음',
    productName: '원목 모양 끼우기 교구',
    fields: [
      '[상품 종류]: 원목 교구/장난감',
      '[대상 연령]: 12개월~36개월',
      '[안전 인증]: KC 어린이제품 안전인증',
      '[발달 영역]: 소근육, 인지/사고력',
      '[세탁/관리 방법]: 마른 천으로 닦아주세요',
      '[기타 추가 정보]: 도료는 아이가 입에 넣어도 안전한 수성 도료를 사용했습니다.',
    ],
    photoPrompt: 'A small wooden shape-sorting toy box with colored wooden blocks scattered beside it, on a light gray play mat, photographed from above with a smartphone in plain daytime indoor light. Slightly worn mat, natural shadows. No text, no child. Ordinary seller product photo.',
  },
  {
    key: '06-자동차-디퓨저',
    cat: '자동차', ch: '스마트스토어', density: '낮음',
    productName: '차량용 우드 디퓨저 (송풍구 거치형)',
    fields: [
      '[상품 종류]: 차량용 방향제/디퓨저',
      '[호환 차종]: 전 차종 공용(송풍구 날개 두께 3~8mm)',
      '[소재/마감]: 원목 하우징, 알루미늄 클립',
      '[주요 기능]: 송풍구 거치, 향 강도 3단계 조절, 리필 가능',
      '[설치 방법]: 클립을 송풍구 날개에 끼우면 끝입니다.',
      '[기타 추가 정보]: 리필 오일 5ml 1개 포함, 약 4~6주 지속됩니다.',
    ],
    photoPrompt: 'A small round wooden car air freshener clipped onto a car air vent, photographed from the passenger seat with a smartphone in daylight through the windshield. Dashboard and vent visible, slightly dusty interior, natural reflections. No text. Ordinary seller product photo.',
  },
  {
    key: '07-화장품-남성토너',
    cat: '화장품', ch: '스마트스토어', density: '높음',
    productName: '남성 올인원 토너 200ml',
    fields: [
      '[화장품 종류]: 스킨/토너',
      '[주요 피부 고민]: 번들거림, 면도 후 자극, 건조함',
      '[핵심 성분]: 판테놀, 병풀추출물, 나이아신아마이드',
      '[인증 및 특징]: 무향료, 무색소, 알코올 프리',
      '[브랜드/제품 탄생 스토리]: 면도 후 바를 만한 게 마땅치 않다는 이야기를 자주 들어서, 스킨과 로션을 따로 안 발라도 되는 제형으로 만들었습니다.',
      '[주요 타겟]: 20~40대 남성, 매일 면도하는 직장인',
      '[브랜드 포지셔닝]: 복잡한 단계 없이 하나로 끝내는 남성 기초',
      '[⚠️ 법적 고지 (화장품 필수 표시)]: 화장품법에 따른 일반 화장품입니다. 질병의 예방 및 치료를 위한 의약품이 아닙니다. 사용 중 붉은 반점, 부어오름, 가려움 등의 이상 증상이 있을 경우 사용을 중지하고 전문의와 상담하십시오.',
      '[기타 추가 정보]: 끈적임 없이 흡수되는 워터 타입입니다. 면도 직후 바로 사용 가능합니다.',
    ],
    photoPrompt: 'A matte dark navy cylindrical cosmetic bottle about 15cm tall with a simple pump, standing on a white bathroom sink counter, photographed straight on with a smartphone under bathroom lighting. Faint water droplets on the counter, mirror edge blurred behind. Blank label with no readable text. Ordinary seller product photo.',
  },
  {
    key: '08-식품-약과',
    cat: '식품', ch: '스마트스토어', density: '보통',
    productName: '수제 흑임자 약과 12개입',
    fields: [
      '[식품 종류]: 과자/베이커리',
      '[주요 타겟]: 20~30대 여성, 선물 수요',
      '[인증/특징]: 국내산 원료, 방부제 무첨가',
      '[판매 포인트]: 주문 후 제조',
      '[원산지 정보]: 밀가루(국내산), 흑임자(국내산), 조청(국내산)',
      '[보관 방법]: 실온 보관, 개봉 후 냉장 보관 권장',
      '[알레르기 유발 원료]: 밀, 대두, 참깨 함유',
      '[유통기한 표시 방식]: 제조일로부터 21일',
      '[기타 추가 정보]: 기름에 튀긴 뒤 조청에 담그는 전통 방식이라 겉은 바삭하고 속은 촉촉합니다. 개별 포장되어 있어 선물용으로도 적당합니다.',
    ],
    photoPrompt: 'Six dark sesame Korean yakgwa honey cookies arranged on a small white ceramic plate on a wooden table, photographed at a slight angle with a smartphone in warm indoor light. Glossy syrup coating, a few sesame seeds fallen on the table. No packaging, no text. Ordinary home-style seller product photo.',
  },
  {
    key: '09-건강-루테인',
    cat: '건강', ch: '스마트스토어', density: '보통',
    productName: '루테인 지아잔틴 60캡슐 (2개월분)',
    fields: [
      '[상품 종류]: 건강기능식품(캡슐)',
      '[건강 목적]: 눈 건강, 노화로 인한 황반색소밀도 유지',
      '[인증/임상]: 식약처 건강기능식품 인정 원료 사용',
      '[섭취/사용 방법]: 1일 1회, 1회 1캡슐을 물과 함께 섭취하세요.',
      '[제형]: 소프트캡슐',
      '[타겟 대상]: 40대 이상, 모니터 오래 보는 직장인',
      '[⚠️ 법적 고지 / 주의사항 (건강기능식품 표시)]: 본 제품은 질병의 예방 및 치료를 위한 의약품이 아닙니다. 특정 질병이 있거나 의약품 복용 중인 경우 전문가와 상담 후 섭취하십시오. 이상사례 발생 시 섭취를 중단하고 전문가와 상담하십시오.',
      '[기타 추가 정보]: 하루 한 알이라 챙겨 먹기 부담 없습니다.',
    ],
    photoPrompt: 'A white plastic supplement bottle about 10cm tall with a blank label, standing on a plain wooden desk next to a few orange soft capsules, photographed straight on with a smartphone in ordinary indoor daylight. Slight desk clutter blurred behind. No readable text on the label. Ordinary seller product photo.',
  },
  {
    key: '11-화장품-시카토너',
    cat: '화장품', ch: '스마트스토어', density: '보통',
    productName: 'LEAFGREEN 시카 토너 250ml',
    answers: {
      c1: ['스킨/토너'],
      c2: ['민감성/자극 잦은', '건조함/수분 부족'],
      c3: ['병풀 추출물(진정)'],
      c4: ['무알콜', '무향(프래그런스 프리)', '무색소'],
      c6: ['20대 후반~30대', '민감성 피부 전용'],
      c9: '화장품법에 따른 일반 화장품입니다. 질병의 예방 및 치료를 위한 의약품이 아닙니다. 사용 중 붉은 반점, 부어오름, 가려움 등의 이상 증상이 있을 경우 사용을 중지하고 전문의와 상담하십시오.',
      c10: '250ml 대용량이라 토너패드처럼 듬뿍 써도 부담 없습니다. 세안 직후 물기가 남은 상태에서 발라주세요.',
    },
    fields: [
      '[화장품 종류]: 스킨/토너',
      '[주요 피부 고민]: 민감성/자극 잦은, 건조함/수분 부족',
      '[핵심 성분]: 병풀 추출물(진정)',
      '[인증 및 특징]: 무알콜, 무향(프래그런스 프리), 무색소',
      '[주요 타겟]: 20대 후반~30대, 민감성 피부 전용',
      '[⚠️ 법적 고지 (화장품 필수 표시)]: 화장품법에 따른 일반 화장품입니다. 질병의 예방 및 치료를 위한 의약품이 아닙니다. 사용 중 붉은 반점, 부어오름, 가려움 등의 이상 증상이 있을 경우 사용을 중지하고 전문의와 상담하십시오.',
      '[기타 추가 정보]: 250ml 대용량이라 토너패드처럼 듬뿍 써도 부담 없습니다. 세안 직후 물기가 남은 상태에서 발라주세요.',
    ],
    photoPrompt: '(실제 제품 사진 사용 — test-assets/leafgreen.png)',
  },
  {
    key: '10-스포츠-요가매트',
    cat: '스포츠', ch: '스마트스토어', density: '낮음',
    productName: 'TPE 요가매트 6mm',
    fields: [
      '[상품 종류]: 요가/필라테스 용품',
      '[운동 종류/종목]: 요가, 필라테스, 홈트레이닝',
      '[소재/기능]: TPE 친환경 소재, 양면 논슬립',
      '[타겟 성별/수준]: 여성, 초급~중급',
      '[사이즈 구성]: 183 x 61 cm / 두께 6mm / 무게 900g',
      '[기타 추가 정보]: 처음 개봉했을 때 특유의 냄새가 날 수 있는데 하루 이틀 환기하면 사라집니다. 스트랩 포함.',
    ],
    photoPrompt: 'A dark teal yoga mat partially unrolled on a light wooden living room floor, photographed from a standing height with a smartphone in natural window daylight. A rolled carrying strap lying beside it, faint floor reflections, a sofa leg visible at the frame edge. No text, no person. Ordinary seller product photo.',
  },
];
