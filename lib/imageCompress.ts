/**
 * data URL 이미지를 max width 800px / JPEG quality 0.7 로 압축.
 * 결과는 새 data URL. 실패하면 원본 그대로 반환.
 */
export async function compressDataUrl(
  src: string,
  maxWidth = 800,
  quality = 0.7,
): Promise<string> {
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload  = () => resolve(el);
      el.onerror = reject;
      el.src = src;
    });
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    if (w <= maxWidth) {
      const cv = document.createElement('canvas');
      cv.width = w;
      cv.height = h;
      const cx = cv.getContext('2d');
      if (!cx) return src;
      cx.drawImage(img, 0, 0, w, h);
      return cv.toDataURL('image/jpeg', quality);
    }
    const scale = maxWidth / w;
    const cv = document.createElement('canvas');
    cv.width  = maxWidth;
    cv.height = Math.round(h * scale);
    const cx = cv.getContext('2d');
    if (!cx) return src;
    cx.drawImage(img, 0, 0, cv.width, cv.height);
    return cv.toDataURL('image/jpeg', quality);
  } catch {
    return src;
  }
}

export async function compressMap(
  map: Record<string, string>,
  maxWidth = 800,
  quality = 0.7,
): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  const entries = Object.entries(map);
  await Promise.all(entries.map(async ([k, url]) => {
    out[k] = await compressDataUrl(url, maxWidth, quality);
  }));
  return out;
}

/** dataURL base64 페이로드의 대략 바이트 크기(디버그 로그용, 정확값 아님). */
export function estimateDataUrlBytes(dataUrl: string): number {
  const i = dataUrl.indexOf(',');
  const b64 = i >= 0 ? dataUrl.slice(i + 1) : dataUrl;
  return Math.floor(b64.length * 3 / 4);
}

/** ★업로드 제품 사진 압축(배포 안정화, 2026-07-08) — 원본 dataURL(최대 10MB)이 generate-image
 *  요청 바디로 그대로 실려 Vercel 4.5MB 제한에 걸리는 413 방지. history 압축(800px/0.7)보다
 *  큰 1280px/0.82로 제품 디테일 보존(edits 레퍼런스 품질 유지)하되 원본 대비 대폭 축소.
 *  ⚠️브라우저 전용(compressDataUrl이 canvas 사용). 실패 시 원본 반환(compressDataUrl 내부 폴백). */
export async function compressUpload(src: string, maxWidth = 1280, quality = 0.82): Promise<string> {
  const out = await compressDataUrl(src, maxWidth, quality);
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[compressUpload] ${Math.round(estimateDataUrlBytes(src) / 1024)}KB → ${Math.round(estimateDataUrlBytes(out) / 1024)}KB`);
  }
  return out;
}
