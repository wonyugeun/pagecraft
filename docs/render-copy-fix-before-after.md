# ResultScreen 카피 렌더링 개선 — Before/After

> 진단(`docs/diag-copy-vs-render.md`) 판정 B 해결: 카피는 v5 수준인데 ResultScreen이 평면화/소실시키던 문제.
> 변경: `components/screens/ResultScreen.tsx`의 `BlogSection`(데스크탑·모바일 공용) + 다운로드 HTML export.
> Stage3/카피/Hero/엔진 변경 없음. 저장 JSON 재사용(새 생성 0).

---

## 1. 무엇을 고쳤나

### (A) 렌더 분기 통합 — 카피가 어떤 경우에도 안 사라지게
기존 3분기:
- ① `bodyFlow` → 풀렌더
- ② `hasBlocks && !bodyFlow` → **블록만**(headline·subcopy·body 전멸)
- ③ else → headline+body(**subcopy 누락**)

→ **통합**: 분기 무관 **headline → subcopy → body**를 항상 먼저 렌더하고, 그 아래 **blocks(있으면) 또는 섹션 이미지(구 경로)**를 공존시킴. 첫 섹션 Hero(`isFirst && bodyFlow`)는 기존 그대로 유지.

### (B) body 재디자인 — "회색 벽" 탈출
- 기존: `14.5px · #555 회색 · lineHeight 2.1 · 균일 한 덩어리(pre-line)`
- 변경: `16px · #34343c(진한 본문색) · lineHeight 1.85`, **`\n` 기준 문단 분리**(각 `<p>` 사이 15px 간격) → 읽히는 블로그 문단.

### (C) 위계 재설계 (역전 해소)
- headline `21 / 700 / #111` (최상위)
- subcopy `16 / 600 / #5b5b66` (덱/브리지 — bold·약간 뮤트)
- body `16 / 400 / #34343c` (읽히는 본문 — 작게 만들지 않고 본문답게)
- → 굵기·색 위계로 headline > subcopy > body가 명확. body가 더 이상 시각 최약이 아님.

### (D) 다운로드 HTML export 동일 적용
- export도 카피(headline+subcopy+body) 항상 포함, body 문단 분리.
- CSS: `.subcopy`(덱), `.bodytext`(본문 16.5/1.85/#34343c) 신설. 블록 내부 `<p>`는 건드리지 않게 `.bodytext` 클래스로 한정.

---

## 2. Before/After — 카피 생존율 (저장 JSON, 렌더 규칙 재현)

`scripts/render-copy-survival.mjs` — 화면 분기 결정 로직을 그대로 재현해 headline/subcopy/body가 화면에 나오는지 카운트.

| 데이터 | 케이스 | OLD headline·subcopy·body | NEW |
|---|---|---|---|
| v5 강아지(14) | bodyFlow 없음 = `diag-resultscreen` 상태(분기②) | **0·0·0 / 14** | **14·14·14 / 14** |
| 리프그린(16) | bodyFlow=true(정상) | 16·16·16 | 16·16·16 (무회귀) |
| 단호박(8) | bodyFlow=true(정상) | 8·8·8 | 8·8·8 (무회귀) |
| 리프그린(16) | bodyFlow 누락(복원 등 worst) | **0·0·0 / 16** | **16·16·16 / 16** |

→ **subcopy 0/14 → 14/14 복원.** bodyFlow가 빠지든(구 경로/복원) 블록이 있든, headline·subcopy·body가 더 이상 사라지지 않음. 정상 경로는 그대로(무회귀).

---

## 3. 동작 보존 (안 깨지게)

- **첫 섹션 Hero**: `isFirst && bodyFlow` 경로 그대로 — HeroBlock이 headline/subcopy 담당, 변경 없음.
- **이미지/블록**: `hasBlocks → BlockRenderer`, `!hasBlocks && !bodyFlow → 섹션 이미지 슬롯` — 기존 이미지 동작 보존(블록 image 오버레이 재생성 포함).
- **옛 generate 엔진(bodyFlow=false)**: 카피가 오히려 더 살아남(헤드라인+subcopy+body 노출). subcopy 없으면 `sec.subcopy &&` 가드로 무영향.
- **수정/재생성 버튼·편집 패널**: 전 분기 공통화(기존 v5 경로와 동일하게 항상 노출).
- build/tsc 통과.

---

## 4. ⚠️ 남은 확인 (코드로 불가 — 사람이 봐야)

- TS·build 통과 ≠ 화면 정상. **유근님 화면 직접 확인 필요**:
  - 둘째 섹션부터 subcopy가 보이는지, body가 회색 벽이 아니라 문단으로 읽히는지, headline>subcopy>body 위계.
  - 첫 섹션 Hero 그대로인지.
  - 데스크탑/모바일(BlogSection 공용) + 다운로드 HTML.
