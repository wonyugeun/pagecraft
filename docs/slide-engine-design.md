# 슬라이드 엔진 설계 문서 (Slide Engine Design v1)

> **성격**: 코드 작성 전 청사진. 어제까지의 격리 검증(10개 테스트)을 코드화 가능한 아키텍처로 모은 문서.
> **이 문서는 코드가 아니다.** 구현은 별도 작업. 여기선 "무엇을·어디에·어떤 순서로"만 확정.
> **블로그형은 단 한 줄도 안 건드린다** (5장에 경계 명시).

---

## 0. 전제 — 어제까지 검증 완료된 것 (근거)

| 검증 | 결과 | 산출(격리 스크립트) |
|---|---|---|
| GPT Image 2 한글 baked | ✅ 정확(Gemini는 깨짐) | gpt-image-test |
| edits 멀티입력(레퍼런스+제품) | ✅ 작동 | hero-ref2 |
| 2단계(레퍼런스→텍스트→새 모델) | ✅ 표절 없이 새 인물 | hero-2stage |
| 3단계(제품 인지→소품 정확) | ✅ 스포이드 차단 | hero-3stage |
| 식품 자체설계(레퍼런스 없이) | ✅ 카테고리 자동 | hero-food |
| 포토리얼·광고 퀄리티(배경·구도) | ✅ ~88점 | hero-food-A |
| 비율 9:16/1:2 | ✅ 답답함 해결 | hero-ratio |
| 타이포·KPI 디자인 | ✅ ~88–90 | hero-food-final |

**확정된 설계 결정 4개** (이 문서 전체의 전제):
- ① **완전 별도 트랙** — `lib/slide/` 하위. 블로그형 0접촉. 공통 유틸만 **읽기 import**.
- ② **슬라이드 전용 전략 엔진** — 블로그 `lib/stages/strategy.ts`(Stage1) 미접촉. 슬라이드는 자기 전략 stage를 새로 가짐.
- ③ **레퍼런스 = 하이브리드** — 이미지 레퍼런스풀 없음. **자체설계 + 카테고리 구조힌트(텍스트 지식)**. (어제 "레퍼런스 없이 카테고리 자동" 검증 반영.)
- ④ **검증 = 텍스트 stage 먼저 전부(이미지 0원), 이미지는 맨 마지막 1장.**

**미해결 블로커 1개**: 날조 카피("100% 제주산/당일 조업"이 미입력인데 baked). → 본 설계에서 **Stage1·Stage3에 `universalFactGuard` + 생성 직전 `factScrub`**로 닫는다(6·4장).

---

## 1. 전체 파이프라인 (입력 → 출력, stage별)

```
[셀러 입력]
  productName, productExtra(상세정보), cat, ch, productImages[](제품 사진)
        │
        ▼
┌─ Stage S1 · 슬라이드 전략 ──────────────────────────────┐
│  in : {cat, productName, productExtra}                   │  (텍스트, Anthropic)
│  out: SlideStrategy {                                     │
│    main_weapon, customer_desire, customer_fear,          │
│    purchase_trigger, awareness_level,                    │
│    hero_type, story_flow,                                │
│    image_strategy, proof_strategy, trust_strategy }      │
│  ★universalFactGuard 적용(미입력 수치·사실 금지)         │
└──────────────────────────────────────────────────────────┘
        │
        ▼
┌─ Stage S2 · 제품 인지 ───────────────────────────────────┐
│  in : {productName, productExtra, productImages[0]}      │  (Vision, gemini-3.5-flash)
│  out: ProductRecognition {                               │
│    category, product_form, dispense_method,              │
│    allowed_props[], forbidden_props[], food_context }    │
└──────────────────────────────────────────────────────────┘
        │
        ▼
┌─ Stage S3 · 구조 설계 (레퍼런스 없이, 카테고리 지식) ────┐
│  in : {SlideStrategy, ProductRecognition,                │  (텍스트, Anthropic)
│        categoryHint(카테고리 구조힌트 텍스트)}           │
│  out: SlideStructure {                                    │
│    aspect(9:16|1:2), layout, mood, composition,          │
│    gaze_flow, props[], typography,                       │
│    sections[] { role, headline_ko, kpis_ko[] } }         │
│  ★universalFactGuard 재적용 + 다른제형 소품 배제         │
└──────────────────────────────────────────────────────────┘
        │
        │  ── 여기까지 전부 텍스트(이미지 0원). ④ 검증 지점 ──
        │  ★생성 직전: factScrub(headline_ko, kpis_ko, allow=productExtra)
        ▼
┌─ Stage S4 · 이미지 생성 (baked) ─────────────────────────┐
│  in : SlideStructure(섹션) + ProductRecognition          │  (GPT Image 2, edits)
│        + 셀러제품이미지(image[])                          │
│  out: PNG (9:16, baked 한글 광고컷)                      │
│  prompt = 구조텍스트 + 제품인지(forbidden 강제)          │
│           + 포토리얼 + 타이포 방향 + baked 한글           │
└──────────────────────────────────────────────────────────┘
        │
        ▼
[섹션별 슬라이드 PNG 세트]
```

> **블로그와의 대비**: 블로그는 `strategy→structure→copy→imagebrief`(카피 분리 + overlay/인라인편집). 슬라이드는 `S1전략→S2제품인지→S3구조→S4baked생성`. **카피가 이미지에 구워지므로 copy stage가 없고**, 대신 제품인지(S2)가 추가된다.

---

## 2. 파일 구조 (`lib/slide/` — 블로그형과 물리적 분리)

```
lib/slide/
  types.ts                 # 모든 슬라이드 타입 (SlideStrategy, ProductRecognition, SlideStructure, SlideSection)
  slideStrategy.ts         # S1: runSlideStrategy(input): SlideStrategy   (Anthropic)
  productRecognition.ts    # S2: recognizeProduct(input): ProductRecognition (Gemini Vision)
  slideStructure.ts        # S3: designSlideStructure(input): SlideStructure (Anthropic)
  slideImagePrompt.ts      # S4 프롬프트 빌더: buildSlidePrompt(structure, recog): string (순수 함수, 호출 X)
  categoryHints.ts         # 카테고리별 구조힌트 텍스트 (3장)
  slideAspect.ts           # 9:16/1:2 → OpenAI size 매핑 ("1152x2048"/"1024x2048")
  runSlidePipeline.ts      # 오케스트레이션(S1→S2→S3→[factScrub]→S4). 클라가 호출.

app/api/slide/
  strategy/route.ts        # 얇은 래퍼 → runSlideStrategy
  recognize/route.ts       # 얇은 래퍼 → recognizeProduct
  structure/route.ts       # 얇은 래퍼 → designSlideStructure
  # 이미지 생성은 기존 generate-image route 재사용(아래)
```

**기존 `generate-image` route 처리 (edits 확장 vs 슬라이드 전용)**
- **결정: 기존 route를 인프라로 보고 edits 분기만 추가**(블로그 로직 아님 = 별도 트랙 원칙 위배 아님).
  - 현재: `productImages` 받아도 generations(미첨부). → **`productImages` 있으면 `/v1/images/edits` 멀티파트로 분기**, 없으면 generations(현행).
  - 이 분기는 블로그에도 이득(제품 충실도)이고, 응답 계약 `{imageBase64,mimeType}` 불변 → 클라 무수정.
  - 슬라이드는 이 route에 `prompt`(slideImagePrompt 빌더 결과) + `productImages`(셀러 제품) + `size`(9:16) + `quality:high`만 보내면 됨.
- 대안(슬라이드 전용 생성 route 신설)은 코드 중복이라 비추천. **단일 이미지 엔드포인트 유지.**

---

## 3. 카테고리 구조힌트 (결정 ③ — 하이브리드)

**무엇**: "식품은 밝은 우드·1~2 주인공·식욕 톤 / 화장품은 모델 or 제품 클로즈업·클린 톤 …" 같은 **카테고리별 광고 문법 지식**.
**어디에**: `lib/slide/categoryHints.ts` — 데이터(객체) + 프롬프트 주입. 코드가 아니라 **텍스트 지식**으로 S3 프롬프트에 합쳐짐.

```ts
// 형태(예시 — 값은 검증된 것 기반)
export const CATEGORY_HINTS: Record<string, CategoryHint> = {
  식품: {
    default_hero_type: 'Product Dominant',   // 신선 원물이 신선도 증명
    background: '밝은 우드 / 소프트 그레이 / 자연광 (어두운 배경 금지)',
    composition: '1~2 주인공 + 넉넉한 여백 (빽빽한 다수·좌판 금지)',
    mood: '따뜻하고 식욕 도는 톤',
    props_example: '도마·천일염·레몬·식탁',
    aspect: '9:16',
  },
  화장품: {
    default_hero_type: 'Product Dominant | Model Editorial',
    background: '클린 그린/베이지·소프트 라이트',
    composition: '제품 클로즈업 또는 모델 보조(얼굴 노출 최소)',
    mood: '진정·클린·프리미엄',
    props_example: '성분 원물(시카잎 등)·물방울·화장솜',
    aspect: '9:16',
  },
  // ...
};
```

**11개 다 넣을지 / 핵심 몇 개로 시작할지**
- **시작 = 검증된 2개(식품·화장품) + 폴백 1개(generic).** 나머지 9개는 **텍스트 검증으로 점진 추가**(이미지 0원이라 싸다).
- 카테고리 미스 시 generic 힌트 + S1·S2의 자체판단으로 동작(어제 "레퍼런스 없이 자동" 검증이 이걸 뒷받침).
- ⚠️ 힌트는 **"강제"가 아니라 "기본 제안"** — S3가 제품 특성에 따라 override 가능(예: 식품이라도 가공식품은 Result Dominant).

---

## 4. 필드 간 정의 (전략 엔진 — 안 겹치게)

### S1 SlideStrategy 필드 (각각 다른 질문에 답)
| 필드 | 답하는 질문 | 블로그 Stage1과의 대응 |
|---|---|---|
| `main_weapon` | **무엇으로** 파나 (제품의 객관적 최강 무기) | dna.main_weapon과 동일 개념 |
| `customer_desire` | 고객이 **원하는** 이상적 상태(제품 너머) | dna.target_desire |
| `customer_fear` | 구매를 **막는** 두려움 | dna.target_fear |
| `purchase_trigger` | **무엇이** 결제 버튼을 누르게 하나(결정적 방아쇠) | dna.buy_reason보다 좁음 = "마지막 한 방" |
| `awareness_level` | 고객 **인지 단계** (문제 모름→해결책 모름→제품 모름→인지) | 블로그엔 없음(슬라이드 신규) |

> **혼동 방지**: `main_weapon`=제품이 가진 것(공급자 관점) / `customer_desire`=고객이 갖고 싶은 상태(수요자 관점) / `purchase_trigger`=둘을 잇는 전환 순간(예: "오늘 저녁 바로 구워먹는 갈치" = desire(편한 저녁)×weapon(손질 갈치)의 트리거). 셋은 층위가 다르다.

### hero_type (5종 — 첫 화면 주인공 유형)
| 값 | 주인공 | 적합 |
|---|---|---|
| `Product Dominant` | 제품/원물 자체 | 신선식품·원물·디자인 강한 제품 |
| `Result Dominant` | 결과물(요리/사용 후) | 가공식품·레시피·before-after |
| `Model Editorial` | 인물 화보(보조 제품) | 화장품·패션·뷰티 |
| `Problem Empathy` | 고민 상황/장면 | 문제인지 낮은 고객·공감 진입 |
| `Comparison Proof` | 비교/근거 시각화 | 스펙·경쟁 우위가 핵심 |

### story_flow (6종 — 슬라이드 시퀀스 골격)
1. `문제→원인→해결→근거→가격→행동` (표준)
2. `결과선공개→비밀→제품→근거→행동` (Result 우선)
3. `공감→반전→제품→증거→행동` (감성)
4. `비교→차이→제품→안심→행동` (경쟁)
5. `원물자랑→신선근거→활용→안심→행동` (신선식품)
6. `브랜드→철학→제품→디테일→행동` (프리미엄/브랜딩)

### image_strategy / proof_strategy / trust_strategy (S1 전략 → S3·S4 반영)
- `image_strategy`: 각 섹션을 **무슨 컷으로** 보여줄지 전략(예: hero=원물 클로즈업, sec2=조리 결과, sec3=KPI 배지). hero_type을 섹션 단위로 펼친 것.
- `proof_strategy`: **무엇으로 증명**하나 — ⚠️ **셀러 입력 사실만**(인증·수치 미입력 시 정성 표현). universalFactGuard 직결.
- `trust_strategy`: 신뢰를 **어떻게** 쌓나(원산지 표기·후기 자리·배송 안심 등 — 날조 금지).

---

## 5. 블로그형 보호 (경계 명시)

**절대 안 건드리는 파일** (읽지도 수정도 안 함):
- `lib/stages/strategy.ts` · `structure.ts` · `copy.ts` · `imagebrief.ts`
- `lib/pipeline.ts` · `pipelineJob.ts` · `runClientPipeline.ts`
- `components/screens/ResultScreen.tsx`의 **BlogSection 경로** 및 블로그 렌더
- `app/api/{strategy,structure,copy,imagebrief,generate}/route.ts`

**공통 유틸 = 읽기 전용 import만** (수정 금지):
| 유틸 | 용도(슬라이드에서) |
|---|---|
| `lib/copyGuards.ts` → `universalFactGuard` | S1·S3 프롬프트에 날조 가드 주입 |
| `lib/factScrub.ts` → `scrubText` | 생성 직전 headline_ko/kpis_ko 날조 제거 |
| `lib/outputType.ts` → `resolveOutputType` | 슬라이드 분기 판정(쿠팡→slide) |
| `lib/imagePromptRules.ts` (선택) | 영문 비주얼 RULES 일부 재사용 |
| `lib/imageCompress.ts` · `historyDB.ts` | 결과 저장/증분영속화(기존 인프라) |

**유일하게 수정하는 공유 파일**: `app/api/generate-image/route.ts` — **edits 분기 추가만**(블로그 동작 불변, 응답 계약 불변). 이건 "이미지 인프라"지 블로그 로직이 아님. (그래도 블로그 이미지에 productImages가 가면 edits로 가게 되니, 이 변경의 블로그 영향은 별도 검증 항목으로 둔다 — 6장.)

---

## 6. 검증 전략 (결정 ④ — 텍스트 먼저, 이미지 마지막)

**원칙: 이미지(과금)는 맨 마지막 1장. 그 전 단계는 전부 텍스트라 비용 0.**

| 순서 | 검증 | 비용 | 합격 기준 |
|---|---|---|---|
| V1 | S1 전략 — 20개 상품 텍스트 출력 | 0(텍스트) | hero_type·story_flow가 **상품마다 다르게** 나오나(획일화 X), 필드 안 겹치나 |
| V2 | S2 제품인지 — 카테고리별(토너/갈치/세럼/크림/가공식품…) | 0(Vision은 저가) | forbidden_props가 제형 맞게(토너→dropper금지, 식품→화장품소품금지) |
| V3 | S3 구조 — 카테고리별 구조 다르게 나오나 | 0(텍스트) | 식품=밝은우드/1~2, 화장품=클린/모델 등 카테고리 갈림 |
| V4 | **★날조 가드** — proof/headline/kpis에 미입력 수치 들어가나 | 0(텍스트) | "100%/당일조업/채낚기" 같은 미입력 주장이 **0건**(universalFactGuard + scrubText) |
| V5 | S4 이미지 — **최종 1장** | 과금 1장 | 위 전부 통과 후 baked 광고컷 90점 |

> **20개 상품 텍스트 검증**(V1)이 핵심: hero_type 5종·story_flow 6종이 실제로 다양하게 분기하는지를 **이미지 0원**으로 확인. 획일화되면 S1 프롬프트 수정 후 재검증(여전히 0원).
>
> **블로그 회귀 검증**(generate-image edits 분기): 블로그 이미지 1장 생성해 기존과 동일 동작하는지(productImages가 가도 안 깨지는지) 별도 확인.

---

## 7. 구현 순서 (의존성 + 단계별 검증 포인트)

```
① types.ts                         ← 모든 stage가 의존. 먼저 타입 확정.
        │
② slideStrategy.ts (S1) + route    ← [검증 V1] 20개 텍스트, hero_type/story_flow 다양성
        │
③ productRecognition.ts (S2)+route ← [검증 V2] forbidden_props 제형별
        │
④ categoryHints.ts                 ← S3 입력 데이터(식품·화장품·generic 3개로 시작)
        │
⑤ slideStructure.ts (S3) + route   ← [검증 V3] 카테고리 구조 분기 + [검증 V4] 날조 가드 0건
        │
⑥ slideAspect.ts + slideImagePrompt.ts  ← 9:16 매핑 + 프롬프트 빌더(순수함수, 호출 0)
        │
⑦ generate-image route: edits 분기 ← [검증] 블로그 회귀(안 깨짐) + 슬라이드 edits 동작
        │
⑧ runSlidePipeline.ts (오케스트레이션) ← [검증 V5] 최종 1장 90점
        │
⑨ 클라 배선(슬라이드 렌더 연결)    ← ResultScreen 슬라이드 분기에만(블로그 BlogSection 미접촉)
```

**각 단계 게이트**: 앞 단계 검증 통과 전 다음으로 안 감. ②③⑤는 전부 텍스트라 과금 0 — 여기서 품질을 다 잡고, 이미지(⑧)는 마지막에 1장만.

**MVP 범위(1차)**: 식품·화장품 2카테고리 + 9:16 + Product/Model hero_type + 표준·신선식품 story_flow. 나머지는 텍스트 검증으로 점진 확장.

---

## 부록 A — 날조 가드 적용 지점 (블로커 종결)

| 지점 | 수단 | 막는 것 |
|---|---|---|
| S1 프롬프트 | `universalFactGuard` 주입 | main_weapon/proof_strategy에 미입력 수치·인증 |
| S3 프롬프트 | `universalFactGuard` 재주입 | headline_ko/kpis_ko에 "100% 제주산/당일조업" 류 |
| S4 직전(코드) | `scrubText(headline_ko, allow=productExtra)` + kpis 각 항목 scrub | 프롬프트가 못 막은 잔여를 **이미지 생성 전에 제거** |
| (한계) | baked 후엔 제거 불가 | → 그래서 **생성 전** 스크럽이 필수(블로그 factScrub가 카피에 하던 걸 슬라이드는 baked 전에) |

> 이 3중(프롬프트 가드 ×2 + 생성 전 scrub)으로 "갈치 100% 제주산" 같은 표시광고법 위험을 **이미지에 굽히기 전에** 차단한다. = 어제까지 유일하게 안 닫힌 블로커의 설계상 해법.

---

## 부록 B — 검증 산출 매핑 (어제 스크립트 → 어느 stage가 됐나)

| 어제 격리 스크립트 | 코드화될 stage |
|---|---|
| hero-3stage(제품인지) | S2 productRecognition |
| hero-2stage(구조텍스트) | S3 slideStructure (단 레퍼런스 이미지 → 카테고리힌트로 대체) |
| hero-food(자체설계) | S1 + S3 (레퍼런스 없이) |
| hero-food-A/typo/final(배경·구도·타이포·KPI) | S3 SlideStructure 필드(layout/mood/typography) + S4 프롬프트 |
| hero-ratio(9:16/1:2) | slideAspect + S3 aspect 필드 |
| gpt-image-test(baked) | S4 generate-image(edits) |

---

*본 문서: 설계 청사진만. 코드 작성·커밋 없음. 블로그형 미접촉. 구현은 7장 순서대로 별도 진행.*
