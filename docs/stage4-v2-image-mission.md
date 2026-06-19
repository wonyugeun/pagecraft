# Stage4 V2 설계 — Image Mission 기반 재설계

> **설계 문서. 코드 수정 없음.** (Stage1/2/3 변경 금지)
> 목적: Stage4를 "무슨 사진을 찍을까(shot_type)"가 아니라 **"왜 이 사진이 필요한가(image_mission)"** 중심으로 재설계.
> 근거: P1-1 진단(`docs/img-diag-P1-1.md`).

---

## 0. 전제 — P1-1에서 확정된 것

| 항목 | 상태 | 근거 |
|---|---|---|
| 제품 일관성 | **해결** | 레퍼런스 이미지 주입(productImages) → 전 섹션 동일 제품·패키지·브랜드 |
| 텍스처 정확성 | **해결** | 레퍼런스 주입 → AI 임의 색·점성 부여 억제 |
| **카피 ↔ 이미지 정합성** | **남은 핵심 병목** | 공감·원인·솔루션·신뢰·CTA를 전부 "제품 정물"로 번역 |
| 병목 성격 | **구조 문제** | 모델/브리프 텍스트 품질 아님. shot 규칙·인물금지·body 미전달 |

---

## 1. 문제 진단 — 왜 전부 "제품 정물"이 되는가

현재 Stage4(`lib/stages/imagebrief.ts`)의 결정 순서:

```
shot_type 먼저 결정  (지침: "제품컷/연출컷/원료컷/텍스처/사용장면 중 택")
   ↓
화장품 비주얼 가이드가 섹션 역할을 전부 제품 중심 정물로 매핑
   ↓
공감도 제품 · 원인도 제품 · 솔루션도 제품 · 신뢰도 제품 · CTA도 제품
```

3대 구조적 원인:
1. **shot_type이 출발점** — 어휘가 product-centric로 고정 → 모든 섹션이 제품으로 수렴.
2. **인물·얼굴 전면 금지** — 공감/원인의 핵심인 '사람의 불편함(붉어진 볼·따가움)'을 그릴 수단 자체가 없음.
3. **body 미전달** — Stage4가 `headline` 한 줄만 입력받음 → 추상 헤드라인에서 은유로 점프(자갈=절제, 시든잎=자극) → 오독·정물 수렴.

---

## 2. 목표 — 결정 우선순위의 역전

> shot_type은 **결과값**이다. 출발점이 아니다.

```
1. image_mission   ← 왜 이 사진이 필요한가
2. emotion_goal    ← 무엇을 느끼게 할 것인가
3. target_desire   ← 페이지 전체가 환기할 욕구(Stage1)
4. mission         ← 이 섹션의 임무(Stage2)
5. shot_type       ← 위 4개의 결과로 도출
```

핵심 원칙: **이미지는 "무엇을 설명할 것인가"보다 "무엇을 느끼게 할 것인가"를 먼저 결정한다.**

예시:
| | 현재(shot_type 우선) | V2(image_mission 우선) |
|---|---|---|
| mission: 민감 피부 원인 설명 / emotion_goal: 공감 | 병풀 잎 사진 (나쁨) | 붉어진 볼 클로즈업 (좋음) |

---

## 3. target_desire 연동 — 반복 환기 + 장면 변주

Stage1 `target_desire`("편안한 피부")를 **이미지도 페이지 전체에서 반복 환기**한다.
단, **같은 장면 반복 금지** — 섹션마다 다른 상황·다른 장면·다른 연출로 변주.

```
target_desire: "편안한 피부"
   ├ 공감   → 자극받은 피부 (편안함의 부재)
   ├ 원인   → 피부에 부담을 주는 요인
   ├ 솔루션 → 진정되는 피부
   ├ 신뢰   → 매일 안심하고 쓰는 손길
   └ CTA    → 편안하게 사용하는 모습 / 제품 히어로
```

→ 같은 욕구를 5개 다른 표정으로 변주. "5컷이 서로 다른 역할"(P1-1 평가항목 2)을 내용 차원에서 충족.

---

## 4. ⭐ 인물 정책 정정

기존 "인물·얼굴 전면 금지"가 공감/원인 섹션의 정합성을 막고 있었음 → **정정.**

| 구분 | 내용 |
|---|---|
| **허용** | 붉어진 볼 클로즈업 · 피부 질감 · 손 · 목 · 턱선 · 신체 일부 · 따가운 순간 표현 · 상황 연출 |
| **금지** | 일관된 모델 착용샷 · 브랜드 모델 · 얼굴 전체 노출 중심 화보 |

> 금지 영역(일관된 얼굴 모델)은 **향후 가상모델 시스템 담당**. Stage4 V2는 "식별되는 동일 얼굴"을 만들지 않되, 감정·상황을 위한 신체 일부/클로즈업은 허용.

---

## 5. ⭐ 제품 노출 규칙

**모든 이미지에 제품을 강제 등장시키지 말 것.** 공감·원인은 제품보다 상황·감정이 우선.

| 섹션 | 제품 노출 비중(권장) | 주인공 |
|---|---|---|
| 공감 | 0~20% | 상황·감정 |
| 원인 | 0~20% | 자극 요인·부담 |
| 솔루션 | 40~70% | 제품 + 진정 |
| 신뢰 | 50~80% | 제품 + 안전성 근거 |
| CTA | 80~100% | 제품 히어로 |

→ `product_visibility` 필드로 image_mission에 명시(아래 6).

---

## 6. image_mission 필드 설계

각 섹션 브리프 상단에 **"왜 이 사진인가"를 먼저 확정**하는 블록. shot_type은 이 블록에서 도출.

```json
{
  "image_mission": {
    "purpose":            "이 이미지가 페이지에서 해야 할 일 (한 문장)",
    "emotion":            "보는 사람이 느껴야 할 감정 (emotion_goal 연동)",
    "desired_reaction":   "이미지를 본 직후 독자의 속마음 (예: '어, 내 얘기네')",
    "target_desire_link": "Stage1 target_desire를 이 섹션에서 어떤 표정으로 환기하는가",
    "visual_focus":       "화면의 주인공 (상황 / 피부 / 손 / 제품 / 원료 …)",
    "product_visibility": "0-100 (5장 권장 비중표 기준)"
  }
}
```

도출 흐름(브리프 1개 생성 시):
```
image_mission(purpose·emotion·desired_reaction·target_desire_link·visual_focus·product_visibility)
   ↓ 위를 만족시키는
shot_type / composition / mood / palette / props / prompt
```

기존 Brief 필드(ratio/shot_type/mood/palette/props/prompt)는 유지하되, **image_mission이 그 앞에 선행 산출되고 shot_type을 종속시킨다.**

---

## 7. emotion_goal → 이미지 표현 매핑표

| emotion_goal | 감정 | 이미지 방향 | product_visibility |
|---|---|---|---|
| **공감** | 불편함·조심스러움 | 붉어진 피부 · 건조함 · 따가운 순간 · 고민하는 상황 | 0~20% |
| **원인 납득** | 인지·각성 | 자극 요인 · 환경 스트레스 · 피부 부담의 시각화 | 0~20% |
| **안심(솔루션)** | 진정·해소 | 진정되는 피부 · 깨끗함 · 부드러움 · 제품+병풀 | 40~70% |
| **신뢰** | 안정감·검증 | 무향·무색소의 투명함 · 테스트/안전성 분위기 · 안심 사용 | 50~80% |
| **구매욕(CTA)** | 설렘·확신 | 제품 히어로 · 프리미엄 연출 · 편안히 쓰는 모습 | 80~100% |

> ⚠️ "테스트/검증" 표현은 **분위기**까지만. 실제 인증 마크·수치·시험 데이터는 셀러 미입력 시 금지(아래 11).

---

## 8. 섹션별 권장/금지 패턴

### 공감
- 권장: 붉어진 볼 · 자극받은 피부 · 따가운 순간 · 피부 고민 상황
- 금지: 제품 정물 단독 · 병풀 잎 사진

### 원인
- 권장: 자극 요인 · 환경 스트레스 · 피부 부담
- 금지: 제품 단독 · 병풀 성분 사진

### 솔루션
- 권장: 제품 · 병풀 · 진정 장면
- 금지: 문제 상황만 반복

### 신뢰
- 권장: 무향 · 무색소 · 테스트(분위기) · 안전성
- 금지: 미입력 인증 · 미입력 수치 · 임의 데이터

### CTA
- 권장: 제품 히어로 · 프리미엄 연출
- 금지: 문제 상황 · 원인 설명 이미지

---

## 9. 블로그형 예시 브리프 (텍스트 0, 피부/상황 연출 허용)

> 형식: image_mission 블록 → 도출된 prompt. 영문 prompt는 Gemini 전송용. **이미지 내 텍스트·문구·숫자 없음.**

### ① 공감
```
image_mission:
  purpose: 민감성 피부의 '조심스러운 일상'을 내 얘기처럼 보게 한다
  emotion: 공감(불편함)
  desired_reaction: "맞아, 나도 볼이 빨개졌었지"
  target_desire_link: '편안한 피부'의 부재 — 자극받은 상태
  visual_focus: 피부(볼 클로즈업), 제품 없음
  product_visibility: 0
prompt:
  Extreme close-up of a cheek showing mild redness and dry, sensitized skin texture in soft
  morning light, no full face, conveying the quiet discomfort of reactive skin before skincare.
  | shot: macro skin close-up, cheek only, no identifiable face, shallow depth of field.
  light: soft diffused daylight. mood: vulnerable, honest, quietly uneasy.
  palette: warm skin tone with faint flush. props: none. surface: bare skin.
```

### ② 원인
```
image_mission:
  purpose: '더한 것'이 자극을 누적시킨다는 원인을 체감시킨다
  emotion: 각성(원인 납득)
  desired_reaction: "성분이 문제였구나"
  target_desire_link: '편안한 피부'를 방해하는 부담 요인
  visual_focus: 자극 요인/피부 부담, 제품 없음
  product_visibility: 0
prompt:
  Close-up of skin reacting under stress — a fingertip lightly touching a tight, slightly
  irritated patch of skin near the jawline, soft daylight revealing dryness and tension,
  no full face. | shot: macro, jawline/hand fragment, no identifiable face.
  light: neutral clinical daylight. mood: analytical, uneasy. palette: cool neutral skin tone.
  props: none. surface: bare skin.
```

### ③ 솔루션
```
image_mission:
  purpose: 진정되는 순간 + '뺐다'는 미니멀을 함께 보여준다
  emotion: 안심(진정)
  desired_reaction: "이걸 쓰면 가라앉겠다"
  target_desire_link: '편안한 피부'가 회복되는 장면
  visual_focus: 제품 + 진정되는 피부/병풀
  product_visibility: 55
prompt:
  The toner bottle beside a calm, dewy stretch of soothed skin (back of hand) with a fresh
  centella leaf, clean watery sheen suggesting relief and lightness. | shot: product + skin
  fragment, no face, soft focus background. light: soft clean daylight. mood: calm relief,
  weightless. palette: clean white, pale sage, transparent aqua. props: one centella leaf.
  surface: smooth matte light surface.
```

### ④ 신뢰
```
image_mission:
  purpose: 무향·무색소의 '투명함'으로 안전성을 느끼게 한다
  emotion: 신뢰(안정감)
  desired_reaction: "예민한 내 피부에 써도 되겠다"
  target_desire_link: '편안한 피부'를 매일 안심하고 유지
  visual_focus: 제품의 투명함 + 안심 사용(손)
  product_visibility: 65
prompt:
  The clear, colorless toner held gently in clean hands over a bright white surface, the
  transparent formula and unembellished simplicity radiating calm clinical trust, no face.
  | shot: hands + product, clinical white set. light: even soft white daylight.
  mood: clean, credible, reassuring. palette: clinical white, light neutral grey, pale mint.
  props: none invented (no badges, no numbers). surface: white ceramic.
```

### ⑤ CTA
```
image_mission:
  purpose: 마지막에 제품을 갖고 싶게 만든다
  emotion: 구매욕(확신·설렘)
  desired_reaction: "지금 시작하고 싶다"
  target_desire_link: '편안한 피부'를 매일 누리는 루틴의 시작
  visual_focus: 제품 히어로(프리미엄)
  product_visibility: 95
prompt:
  Warm hero shot of the toner bottle glowing in soft golden morning light on a linen surface
  with fresh dewy centella leaves, an inviting close to a gentle daily ritual, no text.
  | shot: 45° hero, product centered and luminous, ample warm negative space.
  light: warm golden-hour daylight. mood: warm, hopeful, confident.
  palette: warm white, golden beige, pale sage. props: dewy centella leaves, one stone.
  surface: soft linen over matte beige.
```

---

## 10. body 전달 구조

**현재 문제:** Stage4가 `headline` 중심으로 해석, `body`는 미활용 → 추상 은유·오독·정물 수렴.

**V2 설계:** image_mission 생성 시 **headline + body를 함께 입력**한다.
- `headline` → 섹션의 핵심 주장(이미지의 방향)
- `body` → 구체 맥락·상황 묘사(image_mission의 `desired_reaction`·`visual_focus` 근거)
- 예: 공감 body의 "출근 준비 중 볼이 빨개져 당황" → `visual_focus: 붉어진 볼`, `desired_reaction: "맞아 나도"` 가 body에서 직접 도출됨(은유로 점프하지 않음).

→ image_mission은 **body의 구체 장면을 visual_focus로 끌어와** 추상화/오독을 차단한다.

---

## 11. 정합성 유지 장치 — 미입력 사실 날조 금지

이미지에 다음을 **셀러 입력 없이 생성 금지:**
- 인증 마크 · 수치 · 시험 결과 · EWG 등급 · 임상 데이터

규칙:
1. **브리프 단계:** image_mission/prompt에 인증·수치·시험·등급을 "분위기"로만 표현(예: "clinical calm"). 구체 마크·숫자 묘사 금지.
2. **Gemini 임의 삽입 방지:** prompt에 "no certification marks, no numbers, no test labels, no graphs, no badges, no invented English copy on packaging beyond the reference label" 류의 명시적 negation 추가.
3. **레퍼런스 우선:** 라벨 문구는 reference 이미지에 있는 것만 유지. P1-1에서 관찰된 "Dermatologically Tested / 50+ Fermented Ingredients" 같은 **자동 생성 가짜 라벨**을 차단.

---

## 12. 제품 일관성 유지

- 레퍼런스 이미지 주입 방식(productImages) **그대로 유지** — P1-1에서 효과 확인됨.
- image_mission이 바뀌어도(공감→CTA) 제품이 등장하는 컷은 **동일 제품·패키지·브랜드** 유지.
- 제품 비노출 섹션(공감/원인, visibility 0~20%)은 제품이 없거나 작게 → 일관성 부담 없음.
- 즉 **"정합성(image_mission)"과 "일관성(reference)"은 직교** — 동시에 충족 가능.

---

## 13. 비교표 — 현재 Stage4 vs Stage4 V2

| 항목 | 현재 Stage4 | Stage4 V2 |
|---|---|---|
| 결정 출발점 | shot_type | image_mission |
| 결정 순서 | shot_type → 제품 정물 | image_mission → emotion → desire → mission → shot_type |
| 입력 카피 | headline만 | headline + **body** |
| 공감/원인 | 제품 정물로 수렴 | 붉어진 피부·상황 연출 (제품 0~20%) |
| 인물 | 얼굴 전면 금지(클로즈업도 위축) | 신체 일부/피부 클로즈업 **허용**(동일 모델 얼굴만 금지) |
| 제품 노출 | 전 섹션 제품 강제 | 섹션별 visibility(0~100%) |
| target_desire | 이미지 미반영 | 페이지 전체 반복 환기 + 장면 변주 |
| 텍스처/일관성 | 레퍼런스 시 해결 | 동일(레퍼런스 유지) |
| 사실 날조 | 가짜 라벨/수치 자동 생성 위험 | 미입력 사실 생성 금지 규칙 |
| 정합성 결과 | 분위기만 일치, 내용 불일치 | 내용까지 정합(emotion·desire·body 기반) |

---

## 14. 구현 관점 — 향후 변경 대상 (설계 수준, 코드 수정 없음)

> 대상 파일: `lib/stages/imagebrief.ts`, `lib/imagePromptRules.ts`, `app/api/generate-image/route.ts`. **Stage1/2/3 변경 없음.**

1. **`imagebrief.ts` — 입력 확장**
   - `runChunk`의 `sectionList`에 현재 `name/role/mission/headline`만 들어감 → **`body`(+ `emotion_goal`, Stage1 `target_desire`) 추가** 필요.
   - `ImagebriefInput`에 `target_desire`(또는 dna에서 추출) 전달 경로 확인(현재 dna는 받지만 target_desire를 프롬프트에 안 씀).

2. **`imagebrief.ts` — 결정 순서·출력 스키마**
   - `[브리프 작성 지침]`을 "shot_type부터" → **"image_mission부터 도출"** 로 재작성.
   - `Brief` 인터페이스에 `image_mission` 블록(6장 필드) 추가, shot_type을 종속 산출로.
   - product_visibility를 섹션 emotion_goal 기반 권장표(5·7장)로 가이드.

3. **`imagePromptRules.ts` — 인물/제품/날조 규칙 재작성**
   - `PEOPLE_RULES`(현재 얼굴 전면 금지): **신체 일부·피부 클로즈업 허용 / 동일 모델 얼굴만 금지**로 정정(4장).
   - "제품을 항상 중심에" 규칙을 **섹션 visibility 기반**으로 완화(5장).
   - **미입력 사실 날조 금지** negation 추가(11장) — 인증/수치/시험/가짜 라벨.

4. **`generate-image/route.ts` — negation 보강**
   - `PEOPLE_RULES`를 위 정책에 맞게 정정(클로즈업 허용 유지, 동일 얼굴 금지).
   - 가짜 라벨/인증/수치 차단 negation 추가.
   - `PRODUCT_RULES`/`COMPONENT_RULES`는 레퍼런스 주입 방식 유지(변경 없음).

> 본 문서는 설계까지만. 실제 코드 변경은 별도 작업에서 진행.
