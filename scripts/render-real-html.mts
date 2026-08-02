/**
 * 이미 뽑아둔 결과(raw.json + secNN.png)를 '실제 제품 렌더러'로 다시 그린다(2026-08-02).
 *
 * ★왜 필요한가: 테스트 스크립트는 저마다 간이 렌더러를 갖고 있어서 제품과 조금씩 달랐다
 *   (CTA 가짜 버튼이 그 예 — 제품엔 없는데 하네스만 그렸다). 셀러가 실제로 받는 파일을 보려면
 *   lib/exportHtml.buildBlogExportHtml — 화면·다운로드가 함께 쓰는 그 함수 — 로 그려야 한다.
 *
 * API를 호출하지 않는다(비용 0). 카피·이미지는 그대로 두고 '그리는 방법'만 최신 코드로 바꾼다.
 *   npx tsx scripts/render-real-html.mts runs/<폴더명>
 */
import fs from 'node:fs';
import path from 'node:path';
import { buildBlogExportHtml, type ExportSection } from '../lib/exportHtml';

const dir = process.argv[2];
if (!dir) throw new Error('사용법: npx tsx scripts/render-real-html.mts runs/<폴더명>');

const raw = JSON.parse(fs.readFileSync(path.join(dir, 'raw.json'), 'utf8')) as {
  visual?: Record<string, string>;
  sections: Array<Record<string, unknown>>;
};

const secUrls: Record<string, string> = {};
raw.sections.forEach((s, i) => {
  const f = path.join(dir, `sec${String(i + 1).padStart(2, '0')}.png`);
  if (fs.existsSync(f)) secUrls[String(s.num)] = `data:image/png;base64,${fs.readFileSync(f).toString('base64')}`;
});

const sections: ExportSection[] = raw.sections.map(s => ({
  num: String(s.num),
  name: s.name as string,
  headline: s.headline as string,
  subcopy: (s.subcopy as string) || undefined,
  body: (s.body as string) || undefined,
  blocks: (s.blocks as ExportSection['blocks']) ?? [],
  imageLabel: s.name as string,
  visual: raw.visual as ExportSection['visual'],
}));

const html = buildBlogExportHtml(
  sections,
  `${sections.length}섹션 · 블로그형`,
  '오버핏 울 니트 가디건 (3color)',
  secUrls, {}, {},
);

const out = path.join(dir, 'real.html');
fs.writeFileSync(out, html);

// 어떤 블록이 어떤 모양으로 그려졌는지 — 눈으로 볼 때 대조하기 위해
const { assignBlockVariants } = await import('../lib/blockLayout');
const vs = assignBlockVariants(sections.map(s => s.blocks ?? []));
console.log(`✅ ${out}\n`);
sections.forEach((s, i) => {
  const parts = (s.blocks ?? []).map((b, j) => `${b.type}${vs[i][j] ? `(${vs[i][j]})` : ''}`);
  if (parts.length) console.log(`  ${String(i + 1).padStart(2)}. ${(s.name ?? '').padEnd(12)} ${parts.join(' · ')}`);
});
