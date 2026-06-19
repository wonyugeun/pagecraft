# 블로그형 / 슬라이드형 이미지 기준 확정 (설계·진단)

> 작업 성격: **분석·문서화만**. Stage4 대규모 수정·Stage1~3·카피·전략 변경 없음.
> 목표: Flik 블로그형 = "디자인이 살아있는 텍스트 상세페이지". 이미지 상세페이지가 아니다. **텍스트가 주인공, 이미지는 설득을 돕는 조연.**

---

## 0. 핵심 정의 (확정)

| | 블로그형 (blog) | 슬라이드형 (slide) |
|---|---|---|
| 정체성 | **읽는 상세페이지 = 콘텐츠** | **광고** |
| 주인공 | 텍스트 | 이미지 자체 |
| 이미지 역할 | 조연 — 감정·상황·이해 보조 | 판매 — 이미지가 직접 판다 |
| 정보 전달 | 텍스트가 담당 (이미지는 설명 안 함) | 이미지 위 카피·혜택·CTA로 전달 |

**원칙: 절대 같은 방식으로 생성하지 말 것.** 블로그형=콘텐츠, 슬라이드형=광고.

---

## 1. 현재 Stage4(imagebrief) 구조

**파일:** `lib/stages/imagebrief.ts` (`runImagebrief`)
**프로토타입 라우트:** `app/api/imagebrief/route.ts` (파싱·래핑만, 로직은 lib 공유)

### 입력 — `ImagebriefInput`
```
dna?, strategy, sections(=Stage2 plan), copy?(=Stage3), cat?, ch?, out?
```

### 출력 — `ImagebriefResult`
```
briefs: Brief[]   // 섹션별 "촬영 브리프"(텍스트 지시문). 실제 Gemini 이미지 생성 X
meta: { cat, ch, out, outputTypeLabel, count }

Brief = { section, ratio, shot_type, mood, palette, props, prompt }
```

### imageDesc(=prompt) 생성 방식
1. `category`/`channel`/`resolvedOut` 확정 → `isBlogOutput` 계산
2. `aspectRatioFor()`로 섹션별 **ratio를 코드에서 확정**(모델 응답 무시, 9:16 원천 차단 — `sectionAspect.ts`)
3. `strategyBlock`(컨셉/톤/흐름) + `formNote`(형태 규칙) + `buildImagePromptRules()`(공통 규칙) 조립
4. 16개씩 청크로 잘라 **Claude(`claude-sonnet-4-6`, max_tokens 8000)** 에 JSON 배열 요청
5. 응답 파싱 후 `ratio`만 코드 확정값으로 덮어씀
6. `prompt` 형식: `<영문 1~2문장> | shot:…, light:…, mood:…, palette:…, props:…, surface:…`

---

## 1-A. ⭐ Stage4가 출력형태(out: blog/slide)를 받는가? → **받는다 (YES)**

- 입력 인터페이스에 `out?: string | null` 존재 (`imagebrief.ts:44`)
- 내부에서 `resolveOutputType(channel, out)` → `isBlogOutput` 계산 (`imagebrief.ts:58-59`)
- **배선 완성됨 (end-to-end):**
  - `lib/pipelineJob.ts:126` `job.input`에서 `out` 추출 → `:217` `/api/imagebrief` 호출 시 `out` 전달
  - `lib/pipeline.ts:91-92` `runImagebrief({ …, out })` 전달
  - `app/api/imagebrief/route.ts:34` 프로토타입 라우트도 `out` 전달

### 분기는 하는가? → **한다. 단 "껍데기 분기"다.**
받은 `out`으로 `isBlogOutput`을 만들어 두 곳에서만 갈린다:

1. **`formNote`** (`imagebrief.ts:73-75`)
   - blog: "텍스트 오버레이 없는 깨끗한 사진. 카피·타이포·숫자 묘사 금지"
   - slide: "이미지 위 텍스트 합성 허용. 단 **카피 원문 그대로 넣지 말고** negative space 확보"
2. **`buildImagePromptRules(category, isBlogOutput)`** (`imagePromptRules.ts`)
   - 차이는 **딱 한 줄** — blog일 때만 "이미지 안 텍스트·문구·숫자·타이포 묘사 금지" 규칙 추가 (`imagePromptRules.ts:46`)
   - 나머지(제품 중심·인물 금지·구성품 폴백·소품 규칙·화장품 비주얼 가이드·shot_type 어휘·예시)는 **두 타입 100% 동일**

---

## 1-B. resolveOutputType 결정·도달 경로

**정의:** `lib/outputType.ts`
```
resolveOutputType(ch, out):
  쿠팡        → 'slide'   (채널 강제)
  자사몰/와디즈 → 'html'    (채널 강제)
  그 외        → out || 'blog'   (사용자 선택값, 없으면 blog)
```

**경로:** 사용자 선택 `out` → `job.input.out`
→ `pipelineJob.ts` → `pipeline.ts:91` `runImagebrief({…out})`
→ `imagebrief.ts:58` `resolveOutputType(channel, out)` → `isBlogOutput`
※ 동일 함수를 `copy.ts`(Stage3), `generate/route.ts`, `regen-section/route.ts`도 공유.

---

## 2. 블로그형 image brief 규칙 (확정 정의)

> 목적: 본문 이해 보조 (**조연**). 이미지는 광고가 아니라 콘텐츠.

- **텍스트: 0** — 카피 문구·헤드카피·할인/가격/혜택·CTA·배너 스타일·숫자 오버레이·타이포그래피 **전면 금지** (제품 자체 라벨/브랜딩만 reference 그대로)
- **허용 shot:** 제품 단독컷 / 성분컷(원료·잎·물방울) / 사용 장면(얼굴 없는 피부·손등) / 라이프스타일 컷 / 질감(텍스처 매크로) / 상황 연출컷
- **금지:** 판매 문구, 광고 레이아웃, 과도한 텍스트 오버레이
- **톤:** 깨끗한 에디토리얼 사진. negative space는 "여백"이지 "카피 자리"가 아님
- **정보 전달 금지:** 이미지가 정보를 대신 설명하지 않음 — 설명은 텍스트가 함

→ 현재 구현은 이 규칙에 **대체로 부합** (텍스트 금지 한 줄 + 깨끗한 사진 formNote).

---

## 3. 슬라이드형 image brief 규칙 (확정 정의)

> 목적: 이미지 자체가 판매. **슬라이드형은 광고.**

- **허용(권장):** 광고형 카피 / 강한 헤드카피 / 혜택 강조 / 수치 강조 / CTA / 판매 중심 레이아웃
- 이미지 위 텍스트 **합성 전제** — 헤드카피·혜택 배지·CTA 영역을 레이아웃에 적극 배치
- shot은 "광고 비주얼" 기준 — 제품을 주인공으로 한 임팩트 있는 광고컷, 카피가 얹힐 구도 설계
- 카피 맥락(Stage3 headline/혜택)을 **광고 카피로 번역**해 오버레이 의도로 반영

→ 현재 구현은 이 규칙에 **거의 부합하지 않음** (아래 4 참조).

---

## 4. 두 타입이 실제로 다르게 생성되는가? → **아니다. 거의 같다.**

현재 slide 분기가 하는 일은 사실상 **"blog에서 텍스트 금지 한 줄만 뺀 것"** 이다.

| 항목 | 현재 slide 처리 | 광고로서 필요한 것 |
|---|---|---|
| 텍스트 합성 | "허용" 한 줄 언급 | 헤드카피·혜택·CTA를 **적극 배치하라**는 지시 |
| 카피 | "**원문 그대로 넣지 말라**"고 오히려 억제 | 광고 카피로 번역해 넣어라 |
| shot_type 어휘 | 제품/연출/원료/텍스처/사용장면 (= **콘텐츠 사진**) | 광고 비주얼·세일즈 레이아웃 어휘 |
| 혜택/수치/CTA | 어휘 자체 없음 | 강조 요소로 명시 |
| 비주얼 가이드 | 화장품 에디토리얼 (blog와 동일) | 광고용 별도 가이드 |

**결론:** 정의상 blog=콘텐츠 / slide=광고로 갈려야 하는데, 현재 Stage4는 **둘 다 "깨끗한 콘텐츠 사진"을 만들고 slide만 텍스트 금지를 안 걸 뿐**이다. "이미지가 직접 판다"는 슬라이드형 정체성은 프롬프트에 들어가 있지 않다.

---

## 5. 두 타입을 다르게 생성하려면 필요한 작업 (배선/분기/규칙)

> 다음 단계 실행 항목. 이번 문서에서는 정의만.

1. **배선: 추가 작업 불필요** ✅ — `out`은 이미 Stage4까지 도달, `isBlogOutput`도 계산됨. 새 배선 선행 과제 없음.
2. **분기 심화 (핵심):** 현재 한 줄짜리 `formNote`/`imagePromptRules` 분기를, 두 타입의 **프롬프트 골격 자체를 가르는** 수준으로 확장.
   - blog 경로: 현행 콘텐츠 사진 규칙 유지·정리 (텍스트 0, 조연)
   - slide 경로: **광고 전용 규칙 세트 신설** — 헤드카피/혜택/수치/CTA 오버레이 영역 설계, 광고 레이아웃 shot_type 어휘, 카피 맥락을 광고 카피로 번역하는 지시
3. **규칙 모듈 분리:** `imagePromptRules.ts`의 `isBlogOutput` 한 줄 분기 대신, `buildBlogImageRules()` / `buildSlideImageRules()` 식으로 규칙 본문을 갈라 관리(혼선·재오염 방지).
4. **shot_type 어휘 분기:** blog는 제품/성분/사용/질감/연출컷, slide는 광고 비주얼 어휘로 다른 후보군 제시.
5. **(slide 한정) 카피 처리 정책 전환:** "원문 넣지 말라"(blog 정책)를 slide에선 "광고 카피로 합성하라"로 뒤집기.

---

## ⚠️ 이번 결론

- **배선은 이미 완료** — Stage4는 `out`(blog/slide)을 받고 `isBlogOutput`까지 만든다. 선행 배선 과제 없음.
- **문제는 분기의 깊이** — 받기만 하고 "텍스트 금지 한 줄"로만 갈라, 두 타입이 사실상 같은 콘텐츠 사진을 만든다.
- 다음 단계: **slide 전용 광고 규칙 세트 신설 + 규칙 모듈 분리**가 핵심. blog는 현행 유지·정리.
- 이번은 분석·문서화만. **Stage4 대규모 수정·Stage1~3/카피/전략 변경 없음.**
