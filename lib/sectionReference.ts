/**
 * Required Asset 섹션 — Premium Plate + 원본 자산 코드 합성(1차: 포장/구성 슬롯) 최소 배선.
 *
 * 검증 이력(갈치 s9, 2026-07-05):
 *   · 레퍼런스 첨부 재생성 방식 → 폐기: 포장 구조·라벨 배치가 재창작됨(원본 보존 실패)
 *   · GPT 마스크 인페인팅 → 폐기: 마스크 미준수 + 자유 타이포 영역에서 스펙 날조("중량 500g" 등)
 *   · Premium Plate + 코드 합성(B3) → 구조 검증 성공: GPT는 배경판·타이포만, 원본은 픽셀 보존
 *
 * 섹션 정의: Hero급 WOW 컷이 아니라 "실제 수령 상태를 정확히 보여주는 증거 섹션".
 *   디자인 강도는 중간 — 페이지 팔레트·타이포 위계와 맞추고 단독 포스터처럼 튀지 않는다.
 *
 * 원칙:
 *   1. GPT는 제품/포장/라벨/구성품을 그리지 않는다 — 배경판(플레이트)과 입력 카피 타이포만.
 *   2. 셀러 제공 포장 이미지는 Required Asset — 원본 픽셀 보존, 코드 합성으로만 삽입.
 *   3. 허용 처리: 리사이즈·라운드 클립·헤어라인 보더·소프트 섀도. 원본 내부 무수정.
 *   4. 정보표·아이콘·인증마크·원산지·중량·배송·보관 등 임의 정보 생성 금지 — 입력 카피만.
 * ⚠️프로덕션 전제: 셀러 "본인" 포장 사진만(타사 포장·타 브랜드 라벨 금지 — 상표 리스크).
 */

/* ═══ Required Asset 게이트 — 점수화 + 페이지당 1회 캡 ═══
 * 갈치 16섹션 런(2026-07-05)에서 키워드 단독 게이트가 7개 섹션에 과발동(동일 사진 반복,
 * CTA까지 플레이트화)해 페이지 리듬 붕괴 → 후보 점수화 후 최고점 1개 섹션만 선정으로 교체.
 *   +5: 진공·아이스박스·수령·포장 상태처럼 실제 수령 상태를 직접 보여주는 신호
 *   +3: 포장·구성·세트·박스·배송처럼 셀러 자산이 어울리는 일반 신호
 *   -10: CTA·FAQ·해동·보관·조리·후기·효능·비교·감성(포장 단어가 있어도 대상 아님)
 *   hero/cta/empathy 아키타입은 점수 무관 제외. 임계점(5) 미만이면 페이지 전체 미적용. */

export interface RequiredAssetSection {
  name: string;        // 섹션명(한글)
  prompt: string;      // 브리프 프롬프트(영문 — EN 신호 판정용)
  archetype: string;   // CutArchetype 문자열
}

const RA_STRONG_KO = /진공|아이스박스|수령|포장\s*상태|실제\s*포장|배송\s*포장|포장\s*배송/;
const RA_STRONG_EN = /vacuum[- ]?(?:seal|pack)|insulated (?:box|shipping|cold)|ice\s?box/i;
const RA_WEAK_KO = /포장|구성|세트|박스|택배|배달|배송/;
const RA_WEAK_EN = /packag(?:e|ing|ed)|parcel|shipping box|unbox/i;
const RA_EXCLUDE = /FAQ|묻는|해동|보관|조리|레시피|사용법|후기|리뷰|구매자|효능|효과|비교|전환|감성|선물/i;

/** 섹션 1개의 Required Asset 적합 점수(결정적) */
function requiredAssetScore(sec: RequiredAssetSection): number {
  if (sec.archetype === 'hero' || sec.archetype === 'cta' || sec.archetype === 'empathy') return -100;
  let score = 0;
  if (RA_STRONG_KO.test(sec.name)) score += 5;
  if (RA_STRONG_EN.test(sec.prompt)) score += 5;
  if (RA_WEAK_KO.test(sec.name)) score += 3;
  if (RA_WEAK_EN.test(sec.prompt)) score += 3;
  if (RA_EXCLUDE.test(sec.name)) score -= 10;
  return score;
}

/** Required Asset 적용 섹션 선정 — 페이지 전체에서 최고점 1개(임계점 5 이상)만. 없으면 -1.
 *  동점은 앞 순서(결정적, 랜덤 0). 호출부는 `selectRequiredAssetIndex(...) === 섹션 idx`로 판정. */
export function selectRequiredAssetIndex(sections: RequiredAssetSection[]): number {
  let best = -1;
  let bestScore = 4;   // 임계점 5 미만 탈락
  sections.forEach((sec, i) => {
    const s = requiredAssetScore(sec);
    if (s > bestScore) { bestScore = s; best = i; }
  });
  return best;
}

/* ── 포토 스테이지 공유 상수 — 플레이트 프롬프트와 합성 코드가 같은 좌표를 사용(정합 보장) ── */
export const PLATE_STAGE = {
  widthRatio: 0.78,   // 카드 폭 = 캔버스 폭의 78%
  topRatio: 0.32,     // 카드 상단 y = 캔버스 높이의 32% (상단 타이포 존 아래)
  cornerRadius: 24,   // 라운드 클립 반경(px, 1024 기준)
} as const;

/**
 * 플레이트 프롬프트 — 증거 섹션용 중간 강도 배경판. GPT에는 제품·포장 생성을 전면 금지하고
 * 입력 카피(헤드라인·서브카피)만 타이포로 허용. 페이지 액센트 컬러로 전체 톤과 연결.
 */
export interface PlateBriefInput {
  headline: string;
  subcopy?: string;
  /** 브랜드 팔레트(Stage1 큐레이션) — 페이지 톤 일관성 */
  visual?: { primary_color?: string; accent_color?: string; soft_color?: string } | null;
  /** 디렉터의 페이지 컨셉(selected_concept) — 무대가 이 세계관 안에서 연출되게 */
  concept?: string | null;
  productName?: string;
  sectionName?: string;
}

/**
 * Required Asset 플레이트 브리프 — Clean 재작성(2026-07-19, 유근님: "정형화된 템플릿, 시스템 구조가 아니다").
 *
 * 구 버전은 3존 고정 레이아웃(상단 카피밴드/중앙 빈 무대/하단 여백)+무난한 워시 배경을 하드코딩 —
 * 페이지 컨셉·제품과 무관하게 똑같이 나왔다. 재작성 원칙:
 *  - 고정은 딱 하나: 사진이 합성될 스테이지 영역(PLATE_STAGE 좌표)을 비워두는 것(픽셀 보존 합성의 물리 제약).
 *  - 나머지 전부 위임: 배경 연출·질감·조명·가장자리 소품·카피 배치를 페이지 컨셉+팔레트로 판단하게.
 */
export function buildPlatePrompt(headline: string, subcopy?: string, accentHex?: string, opts?: Omit<PlateBriefInput, 'headline' | 'subcopy'>): string {
  const sub = (subcopy ?? '').trim();
  const v = opts?.visual;
  const colors = v?.primary_color
    ? `main ${v.primary_color}${v.accent_color ? `, accent ${v.accent_color}` : ''}${v.soft_color ? `, soft ${v.soft_color}` : ''}`
    : (accentHex || '#5BA3D9');
  const concept = (opts?.concept ?? '').trim();
  const topPct = Math.round(PLATE_STAGE.topRatio * 100);

  return [
    `This is the "${opts?.sectionName || '포장·구성'}" section of a Korean e-commerce detail page${opts?.productName ? ` for "${opts.productName}"` : ''}.`,
    `A REAL photograph of the seller's actual packaging will be placed onto this image later (pixel-perfect, by code) — your job is to design the STAGE it will sit on, as the page's art director.`,
    concept ? `Page ad concept (every section of this page lives in this world — design the stage to belong to it):\n${concept}` : '',
    `The ONLY fixed constraint (compositing geometry): the horizontal band from ~${topPct}% down to ~85% of the height, centered at ~78% width, must be a completely EMPTY, softly-lit receiving area — render nothing inside it (the photo lands exactly there).`,
    `Everything else is yours: express the concept and the color family (${colors}) through the backdrop — surface texture, lighting mood, subtle ambient props at the EDGES outside the stage (fabric, plants, ice, light patterns… whatever fits THIS product's world), gradients or quiet graphic accents. Make it feel like a designed section of THIS page, not a generic template.`,
    `Korean copy to render crisply with exact spelling, placed and sized however serves the section best (outside the stage area, typically above it):\nHeadline: "${headline}"${sub ? `\nSubcopy: "${sub}"` : ''}`,
    `STRICT: nothing rendered inside the stage band. No products, no packaging, no boxes, no labeled items, no people, no badges or certification marks, and no text beyond the exact Korean lines above.`,
  ].filter(Boolean).join('\n\n');
}

/** 합성 파라미터 — 라운드 카드 + 2겹 소프트 섀도 + 헤어라인 보더(원본 픽셀 무수정) */
const SHADOW_AMBIENT = { dx: 10, dy: 34, blur: 38, color: 'rgba(25,55,95,0.24)' };
const SHADOW_NEAR = { dx: 3, dy: 10, blur: 14, color: 'rgba(20,45,80,0.31)' };

/**
 * 브라우저 합성 — 플레이트 위 포토 스테이지에 Required Asset 원본을 카드로 삽입.
 * 원본 내부는 리사이즈 외 무수정(라운드 클립·보더·섀도는 외곽 처리). data URL 반환.
 * ⚠️클라이언트 전용(Canvas 2D) — 서버에서 호출하지 말 것.
 */
export async function compositeRequiredAsset(plateUrl: string, assetUrl: string): Promise<string> {
  const load = (src: string) => new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('required asset 이미지 로드 실패'));
    img.src = src;
  });
  const [plate, asset] = await Promise.all([load(plateUrl), load(assetUrl)]);

  const W = plate.naturalWidth, H = plate.naturalHeight;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas 2d context 없음');

  ctx.drawImage(plate, 0, 0);

  const pw = Math.round(W * PLATE_STAGE.widthRatio);
  const ph = Math.round(asset.naturalHeight * pw / asset.naturalWidth);
  const x = Math.round((W - pw) / 2);
  const y = Math.round(H * PLATE_STAGE.topRatio);
  const r = Math.round(PLATE_STAGE.cornerRadius * (W / 1024));

  // 2겹 소프트 섀도(앰비언트 넓게 + 근접 진하게) — 카드가 페이지에 안착하는 부유감
  for (const s of [SHADOW_AMBIENT, SHADOW_NEAR]) {
    ctx.save();
    ctx.shadowColor = s.color;
    ctx.shadowBlur = s.blur;
    ctx.shadowOffsetX = s.dx;
    ctx.shadowOffsetY = s.dy;
    ctx.beginPath();
    ctx.roundRect(x, y, pw, ph, r);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.restore();
  }

  // 원본 자산 — 라운드 클립 안에 그대로(내부 무수정)
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, y, pw, ph, r);
  ctx.clip();
  ctx.drawImage(asset, x, y, pw, ph);
  ctx.restore();

  // 헤어라인 화이트 보더 — 카드 마감
  ctx.beginPath();
  ctx.roundRect(x + 1, y + 1, pw - 2, ph - 2, r);
  ctx.strokeStyle = 'rgba(255,255,255,0.8)';
  ctx.lineWidth = 2;
  ctx.stroke();

  return canvas.toDataURL('image/png');
}
