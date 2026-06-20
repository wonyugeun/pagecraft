# 진단 — 카피가 약한가 vs 렌더가 평면화하는가

> 목적: 유근님의 카피 결과물 불만이 **Stage3 자체 품질(A)** 인지, **ResultScreen 평면화(B)** 인지 판별.
> ⚠️ 새 생성 없음 — 저장된 결과물 JSON 재사용. 코드 수정 없음(진단 전용).
> 재사용 데이터: `diag-stage3-original.json`(v5 강아지영양제 baseline) · `diag-resultscreen.json`(렌더 매핑 산출물) · `pipeline-test.json`(리프그린) · `factguard-case1.json`(단호박).

---

## 0. 결론 한 줄

**카피는 약하지 않다(v5 수준 유지). 병목은 렌더다 → 판정 B.** Stage3 원본은 headline+subcopy+body+blocks가 모두 강하게 나오는데, ResultScreen이 (1) body를 회색 벽으로 시각 평면화하고, (2) 렌더 분기에 따라 subcopy·서사를 통째로 떨군다.

---

## 1. Stage3 카피 품질 — 강하다 (v5와 동일 수준)

### v5 강아지영양제 baseline (`diag-stage3-original.json` = 유근님의 "v5 검증본")
```
[공감 확장]
 headline "산책이 짧아진 날, 보호자 마음도 같이 무거워졌을 거예요"
 subcopy  "혼자만 느끼는 감정이 아닙니다. 많은 보호자가 똑같이 이 순간을 지납니다."
 body     "…'내가 더 일찍 챙겨줬어야 했는데.' … 그 마음, 저도 압니다. 그리고 그 죄책감을 느낀다는 건, 당신이 정말 좋은 보호자라는 뜻…"
[원인 환기]
 headline "노령견이 느려지는 진짜 이유 — 노화가 아니라 관절 연골 마모입니다"
 subcopy  "7세 이후 개의 관절은 소리 없이 달라지고 있습니다."
```

### 현재 리프그린 (`pipeline-test.json`, 현재 엔진)
```
[공감] headline "세안 후 새 토너를 바를 때, 혹시 조마조마하지 않으셨나요?"
       subcopy  "예민한 피부와 살아가는 하루, 그 불편함을 우리는 알고 있습니다"
       body     "…아침 출근 준비 중에 볼이 빨개져서 당황했던 그 기억, 있으시죠? …"
[원인] headline "트러블의 원인, 사실 '더한 것'에 있었습니다"
[솔루션] headline "뺐습니다. 향도, 색소도, 끈적임도"
[CTA]  headline "오늘 밤부터, 자극 없는 진정 루틴을 시작해보세요"
```

### 현재 단호박 (`factguard-case1.json`)
```
[공감] headline "밤호박, 좋아하는데 왜 맨날 장바구니에서만 머무르나요?"
       subcopy  "손질이 귀찮아서 결국 포기한 경험, 한 번쯤 있으시죠?"
```

**평가**

| 항목 | 판정 |
|---|---|
| headline 품질 | ◯ 강함 — 감정·질문형 후킹(v5/리프그린/단호박 모두). 약하지 않음 |
| emotion_goal 반영 | ◯ 높음 — "그 마음 저도 압니다"(공감), "의지 문제가 아니라 몸의 신호"(원인) 등 감정 목표 달성 |
| subcopy | ◯ 존재·보강 역할 — headline을 받아 한 겹 더 얹음(전 섹션 채워짐) |
| body | ◯ 흐름 있음 — 토막이 아니라 \n 구분 다문단 서사. 대화체로 읽힘 |

→ **Stage3 원본 카피는 v5와 구조·품질이 동일.** 카피 자체는 손볼 대상이 아니다(판정 A 아님).

---

## 2. 렌더 경로 — 여기서 평면화/손실 발생

`ResultScreen` SectionCard 렌더는 **3개 분기**(코드 현재 기준):

| 분기 | 조건 | 렌더 결과 | 손실 |
|---|---|---|---|
| ① | `sec.bodyFlow` | headline + subcopy + body + blocks (풀) | 없음 |
| ② | `hasBlocks && !bodyFlow` | **BlockRenderer(blocks)만** (`:559-569`) | **headline·subcopy·body 전멸** |
| ③ | else (!blocks, !bodyFlow) | headline + 이미지 + body (`:570-596`) | **subcopy 누락** |

- 신엔진 정상 경로(runClientPipeline가 `bodyFlow:true`, `subcopy` 매핑 — `runClientPipeline.ts:120,125`)는 **분기①**으로 풀렌더된다.
- 그러나 **`bodyFlow`가 한 번이라도 빠지면**(구 generate 엔진 / 플래그 미전파 / 일부 복원 경로) blocks가 있는 섹션은 **분기②로 추락 → 서사 카피(headline·subcopy·body) 통째 소실**, blocks 위젯만 남는다.

### ⭐ 증거: `diag-resultscreen.json` (렌더 매핑 산출물)
```
bodyFlow 있는 섹션: 0 / 14
subcopy 키 있는 섹션: 0 / 14
blocks 있는 섹션:    14 / 14
```
→ 이 산출물의 14섹션 전부가 **bodyFlow 없음 + blocks 있음** = 분기② 조건. 즉 이 상태로 렌더되면 **모든 섹션이 블록 위젯만 남고 headline/subcopy/body가 화면에서 사라진다.** `diag-stage3-original`(원본)엔 14/14 subcopy가 살아있는데 렌더 매핑에선 0/14 — **렌더 단계에서 subcopy·서사가 죽은 직접 증거.**

### 분기①(정상 풀렌더)에서도 남는 시각 평면화
body 렌더 스타일(`:535-536`, `:580`): `fontSize 14.5 · color #555(회색) · lineHeight 2.1 · 균일 블록`.
- 가장 정보량 많은 body가 **가장 작고(14.5) 가장 저대비(#555 회색)**.
- 위계: headline 21(bold #111) > subcopy 15.5(#6b6b72) > **body 14.5(#555) ← 최약**. **위계 역전**(서사 본문이 시각적으로 가장 약함).
- body 내부 강조·리드문·문단 리듬 없음 → 다문단 서사가 "회색 벽"으로 평면화.

---

## 3. "v5와 다르다"의 정체

- **카피는 v5와 다르지 않다.** Stage3 출력 구조(headline+subcopy+body+blocks)·품질이 v5 강아지 baseline과 동일(섹션 1 비교 참조).
- **다른 건 화면이다.** v5의 인상(서사가 살아있는 상세페이지) 대비 현재 화면은 (a) body가 회색 벽으로 평면화되고, (b) 분기②/③로 새면 subcopy·서사가 소실된다. `diag-resultscreen.json`이 그 소실 상태를 보존.
- 참고: v5 평가 시 봤던 풍부한 형태가 `scripts/assemble-onepage*.mjs`로 조립한 HTML(`onepage-judge*.html`)이었다면, 그 조립본과 ResultScreen React 렌더의 표현 격차도 "다르다"의 일부일 수 있음(별도 확인 대상).

---

## 4. 판정 + 병목 3개 순위

### 판정: **B (ResultScreen이 카피를 평면화)**
- A(Stage3 카피 약함)는 **아니다** — 원본 카피는 v5 수준.
- C도 아니다 — 카피 측 결함 근거 없음. 순수 렌더 문제.

### 병목 Top 3 (영향 큰 순)
1. **렌더 분기 취약 — subcopy/서사 소실 (구조적, 최대)**
   `bodyFlow` 미전파 시 blocks 섹션이 분기②로 추락 → **headline·subcopy·body 전멸**, blocks만 남음. `diag-resultscreen.json`(bodyFlow 0·subcopy 0·blocks 14)이 이 소실 상태의 증거. 카피가 좋아도 화면엔 안 보임.
2. **body 시각 평면화 (정상 경로에서도 발생)**
   가장 풍부한 body가 14.5px #555 회색 균일 블록 = "회색 벽". 내부 강조·리드문·문단 리듬 0.
3. **위계 역전 + subcopy 약화**
   headline 21 > subcopy 15.5 > body 14.5(회색). 정보량 최대인 body가 시각 최약. subcopy도 회색 600으로 묻힘.

---

## 5. 결론 — 어디부터 고치나

**화면(ResultScreen)을 고친다. Stage3 카피는 손대지 않는다(이미 v5 수준).**

권장 순서:
1. **bodyFlow 의존 제거 / 풀렌더 보장** — blocks가 있어도 headline·subcopy·body를 항상 함께 렌더(분기② 폐지 또는 bodyFlow를 신엔진 결과에 무조건 보장 + 복원 경로에서 보존). 카피 소실을 먼저 막는다.
2. **body에 시각 위계 부여** — 리드문/문단 분리/대비·크기 상향으로 "회색 벽" 해소. 서사가 읽히게.
3. **subcopy 강조 복원** — headline 직속 부제로서 대비·여백 확보.

> 한 줄: **카피는 v5만큼 좋다. 화면이 그걸 회색 벽으로 누르거나(정상경로) 통째로 떨군다(분기②). 고칠 곳은 ResultScreen.**

### 근거 데이터
- 코드: `components/screens/ResultScreen.tsx` 분기 `:512`(①bodyFlow) / `:559`(②blocks-only) / `:570`(③else), body 스타일 `:536,580`, subcopy `:530-531`. `lib/runClientPipeline.ts:120,125`(subcopy·bodyFlow 매핑).
- 데이터: `diag-stage3-original.json`(subcopy 14/14 생존) vs `diag-resultscreen.json`(bodyFlow 0·subcopy 0·blocks 14). 카피 품질: `pipeline-test.json`·`factguard-case1.json`·`diag-stage3-original.json`.
