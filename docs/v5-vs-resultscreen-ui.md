# v5 데모 HTML vs 현재 ResultScreen — 표현 레이어 비교

> 목적: 현재 화면이 밋밋한 게 **A) v5에 있던 표현 레이어가 사라진 것**인지 **B) 원래 ResultScreen에 구현 안 된 것(Problem/Feature/KPI 등 디자인 블록)**인지 판별.
> 대상: `_prototype_out/retention-test-v5.html`(v5 데모) vs `components/screens/ResultScreen.tsx`(BlogSection) + `components/result/BlockRenderer.tsx`.
> ⚠️ 코드 수정·새 생성 없음. 비교 문서만.

---

## 0. 먼저 — retention-test-v5.html의 정체

이 파일은 **제품 ResultScreen이 아니라 "카피 검증용 데모(뷰어)"** 다. 상단 `.banner`에 직접 적혀 있음:
> "고정 Stage1 + 동일 구조 → copy(v5: 섹션별 Character 화자) … 이미지 미생성"
> "각 섹션 상단 ✍️ = 그 섹션 문체(writing_style), 🎯 = emotion_goal. 본문 아래 박스 = 블록."

즉 v5 HTML의 시각 요소 중 상당수는 **카피를 검수하려고 얹은 진단 라벨**이지, 셀러에게 나가는 제품 UI가 아니다.

---

## 1. v5 HTML 표현 레이어 추출 (CSS 클래스 기준)

| v5 클래스 | 정체 | 분류 |
|---|---|---|
| `.banner` | 상단 "이 데모가 뭔지" 설명 배너(teal 그라데이션) | **진단용(데모 전용)** |
| `.sty-tag` ✍️ | 섹션 writing_style 표시 태그(파랑) | **진단용(데모 전용)** |
| `.emo-goal` 🎯 | 섹션 emotion_goal 표시 태그(주황) | **진단용(데모 전용)** |
| `.sec-num` / `.sec-name` / `.blk-tag` | 섹션 번호·이름·블록타입 라벨 | **진단용(데모 전용)** |
| `.sec-headline` / `.sec-subcopy` / `.sec-text` | 카피(헤드/서브/본문) | 제품 카피 |
| `.sec-img` | 이미지 자리(미생성) | 제품 이미지 슬롯 |
| `.b-check` | 체크리스트(녹색 박스 + ✓) | 블록 |
| `.b-steps` | 단계형 리스트 | 블록 |
| `.b-cards` / `.card` | 아이콘카드(성분/특징) | 블록 |
| `.b-stats` / `.stat` | 숫자 통계 카드 | 블록 |
| `.b-compare` | 비교 표 | 블록 |
| `.b-quote` / `.stars` | 인용 후기(좌측 보더 + 별점) | 블록 |
| `.b-faq` | FAQ(dt/dd) | 블록 |
| `.b-cta` / `.btn` | CTA 배너 + 버튼 | 블록 |
| `.b-heading` | 소제목 | 블록 |

**v5 블록 스타일 수준**: 전부 **납작한 색 박스**다. 예) `.b-check li { background:#f0fdf9; border-radius:8px }`, `.b-stats .stat { background:#f0fdf9; border-radius:10px }`, `.b-quote { border-left:3px solid #0d9488 }`, `.b-cta { linear-gradient(teal) }`. 라운드·그림자·스케일·테마색·배지 같은 건 없음(검증 데모라 최소 스타일).

---

## 2. 현재 ResultScreen(BlockRenderer)과 항목별 비교

| v5 표현 레이어 | 현재 유무 | 사라짐? | 신규 구현 대상? |
|---|---|---|---|
| 진단 태그(sty-tag ✍️ / emo-goal 🎯 / sec-num / banner) | **없음** | **아니오** — 원래 제품 UI 아님(데모 전용 라벨). 있으면 오히려 잘못 | 아니오(구현하면 안 됨) |
| headline | 있음 | — | — |
| subcopy | 있음(직전 작업서 0/14→복구) | — | — |
| body(본문) | 있음(+ v5 호흡 \n 렌더 복구) | — | — |
| 이미지 슬롯 | 있음(+ V2 브리프 배선) | — | — |
| 체크리스트(b-check) | **있음** `ChecklistBlock` | 아니오 | — |
| 단계형(b-steps) | **있음** `StepsBlock` | 아니오 | — |
| 아이콘카드(b-cards) | **있음** `IconCardsBlock` | 아니오 | — |
| 통계(b-stats) | **있음** `StatsBlock` | 아니오 | (KPI 시안으로 대체 예정) |
| 비교표(b-compare) | **있음·더 풍부** `CompareBlock`(2카드·추천 배지·scale·shadow, GPT 시안) | 아니오 | — |
| 인용(b-quote) | **있음** `QuoteBlock`(별점 포함) | 아니오 | — |
| FAQ(b-faq) | **있음** `FaqBlock` | 아니오 | — |
| CTA(b-cta) | **있음·더 풍부** `CtaBlock`(rounded-36·primary 버튼, GPT 시안) | 아니오 | — |
| 소제목(b-heading) | **있음** `HeadingBlock` | 아니오 | — |
| Hero | **있음·더 풍부** `HeroBlock`(rounded-36·배지·KPI·제품영역, GPT 시안 — v5엔 Hero 개념 없음) | 아니오(추가됨) | — |

→ **요약: v5에 있던 "제품 UI" 표현 레이어는 현재 전부 있음(대부분 더 풍부). 현재에 없는 건 데모 전용 진단 태그뿐 — 이건 사라진 게 아니라 원래 제품 UI가 아님.**

---

## 3. 공감 섹션 — 렌더 구조 나란히 비교

### v5 데모 (retention-test-v5.html)
```
[✍️ 친구가 말하듯(질문·대화체)]  ← 진단 태그(데모 전용)
[🎯 이거 우리 얘기다]            ← 진단 태그(데모 전용)
sec-headline: "산책이 짧아진 날…"
sec-subcopy:  "혼자만 느끼는 감정이…"
sec-text(body): "혹시 이런 생각 드셨나요? …"   ← 납작한 한 문단
b-check: ✓ 항목 리스트 (녹색 박스)
```
### 현재 ResultScreen (BlogSection)
```
headline (21/700)
subcopy  (16/600)
body     (16/400, v5 호흡 — \n\n 문단 / \n 줄붙임)   ← 복구됨
[섹션 대표 이미지 — V2 공감컷(붉어진 피부)]            ← v5엔 없던 것(추가)
ChecklistBlock (✓ 항목)                              ← v5 b-check와 동일 역할
```

→ 차이: 현재가 진단 태그만 없고(당연), **카피·블록·이미지는 동급 이상**. v5 공감 섹션도 "헤드+서브+본문+체크리스트"의 **납작한 구조**였음. 즉 v5도 "공감 전용 디자인(상황 이미지 + 감정 강조 레이아웃)"은 없었다.

---

## 4. 그럼 "밋밋함"의 진짜 원인은?

- v5 표현 레이어가 사라진 게 아니다(블록 다 있음, 오히려 더 풍부).
- v5 데모도 현재처럼 **헤드→본문→블록의 납작한 반복**이었다(검증용이라 디자인을 안 함).
- 현재 화면이 밋밋한 건 **`resultscreen-design-system.md`에서 정의한 9 디자인 블록 중 6개(Problem/Cause/Feature/KPI/Quote/FAQ)가 아직 "섹션 전용 시각 언어"로 구현되지 않았기 때문**이다. 지금은 그 섹션들이 "기본 블록 + 카피"로만 렌더돼 강조↓설명↓ 리듬이 없다.
- 즉 문제는 "사라짐(복구 대상)"이 아니라 **"아직 안 만든 블록들(신규 구현 대상)"**.

근거:
1. v5 HTML의 비(非)진단 표현 레이어 = 블록 9종 → 현재 BlockRenderer에 100% 존재(Hero/Compare/CTA는 더 풍부).
2. 현재에만 없는 건 sty-tag/emo-goal/banner = 데모 진단 라벨 → 제품 UI 아님.
3. Problem/Cause/Feature/KPI/Quote/FAQ의 "섹션 전용 강조 디자인"은 v5에도 없었고 현재에도 없음 → 잃은 게 아니라 양쪽 다 미구현.

---

## 5. 최종 판정 — **B (신규 구현)**

> **B. Problem / Cause / Feature / KPI / Quote / FAQ 디자인 블록 신규 구현.**
> (= 진행 중인 ResultScreen 디자인 시스템 작업)

A(v5 복구)가 아니다. v5에 있던 제품 표현 레이어는 현재 전부 살아 있고(대부분 더 풍부), 현재에 없는 v5 요소는 **데모 전용 진단 태그**뿐이라 복구 대상이 아니다.

밋밋함은 "사라짐"이 아니라 **`resultscreen-design-system.md`의 6개 시안-대기 블록이 아직 섹션 전용 디자인으로 구현되지 않은 것** 때문이다. 따라서 다음 작업은 **GPT 시안 6개 수령 → 6 디자인 블록 신규 구현**(이미 잡아둔 로드맵 그대로).

### 부수 확인
- 카피(headline/subcopy/body)·이미지 배선·v5 호흡은 이미 복구 완료 — 추가 복구 불필요.
- "복구할 v5 레이어"는 없음. 한 가지만 검토 여지: v5 블록의 **테마색 강조 톤**(녹색 ✓ 박스 등)이 현재 기본 블록보다 정돈돼 보였다면, 그건 6블록 신규 구현 시 시안에 반영하면 되는 사항(별도 복구 작업 아님).
