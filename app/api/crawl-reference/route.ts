import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import * as cheerio from 'cheerio';
import { authOptions } from '@/lib/auth';
import { checkRateLimit, clientIp, creditsBypassEnabled } from '@/lib/db';
import { API_ERROR_CODES } from '@/lib/apiErrors';
import { validateCrawlUrl, fetchWithSsrfGuard } from '@/lib/urlGuard';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export const maxDuration = 60;   // ★배포 안정화: 외부 fetch(15s) + Claude 분석 — 기본 한도 방어

const CRAWL_TIMEOUT = 15_000;
const MAX_TEXT_LEN  = 8_000; // Claude에 넘길 텍스트 최대 길이
const MAX_HTML_LEN  = 2_000_000; // 응답 HTML 처리 상한(2MB) — 과대 응답 방어

/* 크롤링: fetch + cheerio로 본문 텍스트 추출 */
async function crawlPage(url: string): Promise<string> {
  // ★SSRF 가드(진단 M3) — 리다이렉트 hop마다 재검증하는 fetch(허용 안 되는 주소로 튀면 예외)
  const res = await fetchWithSsrfGuard(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8',
    },
    signal: AbortSignal.timeout(CRAWL_TIMEOUT),
  });

  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const contentLength = Number(res.headers.get('content-length') ?? 0);
  if (contentLength > MAX_HTML_LEN * 2) throw new Error('페이지가 너무 커요.');

  const html = (await res.text()).slice(0, MAX_HTML_LEN);
  const $    = cheerio.load(html);

  // 노이즈 제거
  $('script, style, nav, header, footer, iframe, noscript, [class*="gnb"], [class*="lnb"], [id*="header"], [id*="footer"]').remove();

  // 상세페이지 본문 위주 선택 (스마트스토어·쿠팡·일반 패턴)
  const candidates = [
    '#product-detail',
    '.product-detail',
    '[class*="detail_content"]',
    '[class*="productDetail"]',
    '[class*="item_detail"]',
    '[class*="description"]',
    'main',
    'article',
    'body',
  ];

  let text = '';
  for (const sel of candidates) {
    const el = $(sel).first();
    if (el.length) {
      text = el.text().replace(/\s+/g, ' ').trim();
      if (text.length > 200) break;
    }
  }

  // 헤딩 + 단락 텍스트를 구조적으로 수집
  const lines: string[] = [];
  $('h1,h2,h3,h4,p,li,strong,em,[class*="title"],[class*="copy"],[class*="desc"]').each((_, el) => {
    const t = $(el).text().replace(/\s+/g, ' ').trim();
    if (t.length > 5 && t.length < 500) lines.push(t);
  });

  const structured = [...new Set(lines)].join('\n');
  const combined   = structured.length > text.length ? structured : text;

  return combined.slice(0, MAX_TEXT_LEN);
}

/* Claude로 분석 */
async function analyzeWithClaude(pageText: string, url: string) {
  const prompt = `다음은 한국 이커머스 상세페이지에서 크롤링한 텍스트입니다.
이 텍스트를 분석해서 아래 JSON 형식으로만 답하세요. 다른 텍스트 없이 JSON만:

크롤링 출처: ${url}

크롤링 텍스트:
---
${pageText}
---

아래 JSON 형식으로 반환:
{
  "sections": ["섹션명1", "섹션명2", ...],
  "tone": "카피 톤앤매너 설명 (예: 전문성·신뢰 중심, 감성적·공감 유도, 직관적·간결체 등)",
  "headlinePattern": "헤드라인 패턴 설명 (예: 의문형 후킹, 숫자 강조, 이모지+짧은 강조문 등)",
  "emphasisPoints": ["강조 포인트1", "강조 포인트2", "강조 포인트3"],
  "summary": "이 상세페이지 스타일 한 줄 요약"
}

분석 지침:
- sections: 페이지에서 발견되는 섹션을 순서대로 나열 (히어로, 브랜드스토리, 성분, 인증, 사용법, 비교, 후기, FAQ, CTA 등 중 해당하는 것)
- tone: 카피의 전반적인 문체와 감성 방향
- headlinePattern: 헤드라인/타이틀 작성 패턴
- emphasisPoints: 이 페이지가 가장 강조하는 3가지 핵심 포인트
- summary: 이 스타일로 생성 시 참고할 핵심 특징

★★ 복제 금지 (절대 규칙): 위 항목은 모두 "구조·레이아웃·디자인 톤"만 추출하는 것입니다.
- 레퍼런스의 상품 주장·수치·효능·성분·브랜드명·구체 문구·전략은 절대 그대로 가져오지 마세요.
- emphasisPoints/headlinePattern도 "메시지의 형식·패턴"만 적고, 레퍼런스 제품의 구체적 주장·문구를 복제하지 마세요.
- 실제 카피 내용은 이후 단계에서 입력된 셀러 상품 정보로만 작성됩니다. 여기서는 'how(어떻게 구성·표현하는지)'만 분석하세요.`;

  const message = await client.messages.create({
    model:      'claude-sonnet-4-6',
    max_tokens: 1024,
    messages:   [{ role: 'user', content: prompt }],
  });

  const raw       = message.content[0].type === 'text' ? message.content[0].text : '';
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Claude returned no JSON');
  return JSON.parse(jsonMatch[0]);
}

export async function POST(req: NextRequest) {
  const { url, text } = await req.json() as { url?: string; text?: string };

  // ── ★prep rate limit(배포 전 방어) — 외부 fetch/Claude 호출 전. production 우회 불가. ──
  if (!creditsBypassEnabled()) {
    const session = await getServerSession(authOptions);
    const rl = await checkRateLimit('prep', session?.user?.email, clientIp(req));
    if (!rl.allowed) {
      return NextResponse.json(
        { error: `요청이 많아요 — 잠시 후 다시 시도해주세요. (${rl.window}당 ${rl.limit}회)`, code: API_ERROR_CODES.rateLimited, limit: rl.limit, used: rl.used },
        { status: 429 },
      );
    }
  }

  // ── 텍스트 직접 붙여넣기 모드 ──
  if (text?.trim()) {
    const trimmed = text.trim().slice(0, MAX_TEXT_LEN);
    if (trimmed.length < 30) {
      return NextResponse.json({ error: '텍스트가 너무 짧아요. 상세페이지 내용을 더 붙여넣어 주세요.' }, { status: 400 });
    }
    console.log(`[crawl-reference] text mode: ${trimmed.length} chars`);
    let analysis;
    try {
      analysis = await analyzeWithClaude(trimmed, '(직접 입력)');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return NextResponse.json({ error: `분석 실패: ${msg}` }, { status: 500 });
    }
    return NextResponse.json({ analysis: { ...analysis, url: '(직접 입력)' } });
  }

  // ── URL 크롤링 모드 ──
  if (!url?.trim()) {
    return NextResponse.json({ error: 'url 또는 text 중 하나는 필요해요.' }, { status: 400 });
  }

  let normalizedUrl = url.trim();
  if (!normalizedUrl.startsWith('http')) normalizedUrl = 'https://' + normalizedUrl;

  // ★SSRF 가드(진단 M3) — https 전용 + localhost·사설 IP·메타데이터 IP 차단(첫 요청 전)
  const urlCheck = validateCrawlUrl(normalizedUrl);
  if (!urlCheck.ok) {
    return NextResponse.json({ error: urlCheck.error }, { status: 400 });
  }
  normalizedUrl = urlCheck.url;

  console.log('[crawl-reference] crawling:', normalizedUrl);

  let pageText: string;
  try {
    pageText = await crawlPage(normalizedUrl);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[crawl-reference] crawl error:', msg);
    return NextResponse.json(
      { error: `크롤링 실패: ${msg}. 봇 차단 사이트라면 텍스트 탭을 이용해주세요.` },
      { status: 422 },
    );
  }

  if (pageText.length < 50) {
    return NextResponse.json(
      { error: '페이지 텍스트를 추출할 수 없어요. 텍스트 탭에서 직접 붙여넣어 보세요.' },
      { status: 422 },
    );
  }

  console.log(`[crawl-reference] extracted ${pageText.length} chars`);

  let analysis;
  try {
    analysis = await analyzeWithClaude(pageText, normalizedUrl);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[crawl-reference] analysis error:', msg);
    return NextResponse.json({ error: `분석 실패: ${msg}` }, { status: 500 });
  }

  return NextResponse.json({ analysis: { ...analysis, url: normalizedUrl } });
}
