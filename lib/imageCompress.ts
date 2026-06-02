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
