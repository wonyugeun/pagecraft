import React from 'react';

/**
 * 법적 문서(이용약관·개인정보처리방침) 마크다운 렌더러 — 의존성 0(자체 파서).
 *
 * 지원: # / ## / ### 헤딩, **볼드**(인라인), > 인용, --- 구분선,
 *   순서목록(1.)·중첩 불릿, 비순서목록(-/*), GFM 표(| |), 문단.
 * 표는 overflow-x:auto 컨테이너로 감싸 모바일에서 가로 스크롤(레이아웃 안 깨짐).
 * 본문 소스: data/legalContent.ts (루트 .md에서 verbatim). Flik 톤(Pretendard) 유지.
 */

const C = { ink: '#191F28', body: '#4E5968', sub: '#8B95A1', line: '#E5E8EB', soft: '#F7F8FA' };

// 인라인: **볼드**만(초안에 링크·이탤릭·코드 없음)
function inline(text: string, kp: string): React.ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((p, i) => {
    const m = /^\*\*([^*]+)\*\*$/.exec(p);
    return m
      ? <strong key={`${kp}-b${i}`} style={{ fontWeight: 700, color: C.ink }}>{m[1]}</strong>
      : <React.Fragment key={`${kp}-t${i}`}>{p}</React.Fragment>;
  });
}

function splitRow(line: string): string[] {
  return line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim());
}

export default function LegalMarkdown({ content }: { content: string }) {
  const lines = content.replace(/\r\n/g, '\n').split('\n');
  const out: React.ReactNode[] = [];
  let i = 0;
  let k = 0;

  while (i < lines.length) {
    const raw = lines[i];
    const t = raw.trim();

    if (t === '') { i++; continue; }

    // 구분선
    if (/^---+$/.test(t)) {
      out.push(<hr key={k++} style={{ border: 0, borderTop: `1px solid ${C.line}`, margin: '32px 0' }} />);
      i++; continue;
    }

    // 헤딩
    const h = /^(#{1,3})\s+(.*)$/.exec(t);
    if (h) {
      const lvl = h[1].length, txt = h[2];
      if (lvl === 1) out.push(<h1 key={k++} style={{ fontSize: 32, fontWeight: 700, color: C.ink, letterSpacing: '-0.03em', margin: '0 0 8px' }}>{inline(txt, `h${k}`)}</h1>);
      else if (lvl === 2) out.push(<h2 key={k++} style={{ fontSize: 19, fontWeight: 700, color: C.ink, letterSpacing: '-0.02em', margin: '36px 0 12px' }}>{inline(txt, `h${k}`)}</h2>);
      else out.push(<h3 key={k++} style={{ fontSize: 16, fontWeight: 700, color: C.ink, margin: '24px 0 8px' }}>{inline(txt, `h${k}`)}</h3>);
      i++; continue;
    }

    // 인용(연속 > 묶기)
    if (t.startsWith('>')) {
      const q: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        q.push(lines[i].trim().replace(/^>\s?/, ''));
        i++;
      }
      out.push(
        <blockquote key={k++} style={{ margin: '16px 0', padding: '14px 18px', background: C.soft, borderLeft: `3px solid ${C.line}`, borderRadius: 8 }}>
          {q.filter(l => l.trim() !== '').map((l, j) => (
            <p key={j} style={{ fontSize: 13.5, lineHeight: 1.75, color: C.body, margin: j ? '8px 0 0' : 0 }}>{inline(l, `q${k}-${j}`)}</p>
          ))}
        </blockquote>,
      );
      continue;
    }

    // GFM 표: 현재 행이 |...| 이고 다음 행이 |---|--- 구분행
    if (t.startsWith('|') && i + 1 < lines.length && /^\|[\s:|-]+\|$/.test(lines[i + 1].trim())) {
      const header = splitRow(t);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) { rows.push(splitRow(lines[i].trim())); i++; }
      out.push(
        <div key={k++} style={{ overflowX: 'auto', margin: '16px 0' }}>
          <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 480, fontSize: 14 }}>
            <thead>
              <tr>{header.map((c, j) => (
                <th key={j} style={{ border: `1px solid ${C.line}`, background: C.soft, padding: '10px 12px', textAlign: 'left', fontWeight: 700, color: C.ink, whiteSpace: 'nowrap' }}>{inline(c, `th${k}-${j}`)}</th>
              ))}</tr>
            </thead>
            <tbody>{rows.map((r, ri) => (
              <tr key={ri}>{r.map((c, ci) => (
                <td key={ci} style={{ border: `1px solid ${C.line}`, padding: '10px 12px', color: C.body, lineHeight: 1.6, verticalAlign: 'top' }}>{inline(c, `td${k}-${ri}-${ci}`)}</td>
              ))}</tr>
            ))}</tbody>
          </table>
        </div>,
      );
      continue;
    }

    // 순서목록(중첩 불릿 포함)
    if (/^\d+\.\s+/.test(t)) {
      const items: { text: string; subs: string[] }[] = [];
      while (i < lines.length) {
        const lt = lines[i].trim();
        const om = /^\d+\.\s+(.*)$/.exec(lt);
        if (om) { items.push({ text: om[1], subs: [] }); i++; continue; }
        if (/^\s+[-*]\s+/.test(lines[i]) && items.length) { items[items.length - 1].subs.push(lt.replace(/^[-*]\s+/, '')); i++; continue; }
        break;
      }
      out.push(
        <ol key={k++} style={{ margin: '0 0 14px', paddingLeft: 22 }}>
          {items.map((it, j) => (
            <li key={j} style={{ fontSize: 15, lineHeight: 1.8, color: C.body, marginBottom: 6 }}>
              {inline(it.text, `ol${k}-${j}`)}
              {it.subs.length > 0 && (
                <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>
                  {it.subs.map((s, si) => <li key={si} style={{ fontSize: 14.5, lineHeight: 1.75, color: C.body, marginBottom: 3 }}>{inline(s, `ol${k}-${j}-${si}`)}</li>)}
                </ul>
              )}
            </li>
          ))}
        </ol>,
      );
      continue;
    }

    // 비순서목록(최상위 -/*)
    if (/^[-*]\s+/.test(t) && !/^\s/.test(raw)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i].trim()) && !/^\s/.test(lines[i])) {
        items.push(lines[i].trim().replace(/^[-*]\s+/, '')); i++;
      }
      out.push(
        <ul key={k++} style={{ margin: '0 0 14px', paddingLeft: 20 }}>
          {items.map((s, j) => <li key={j} style={{ fontSize: 15, lineHeight: 1.8, color: C.body, marginBottom: 4 }}>{inline(s, `ul${k}-${j}`)}</li>)}
        </ul>,
      );
      continue;
    }

    // 문단
    out.push(<p key={k++} style={{ fontSize: 15, lineHeight: 1.8, color: C.body, margin: '0 0 12px' }}>{inline(t, `p${k}`)}</p>);
    i++;
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '72px 24px 140px', fontFamily: "'Pretendard','Noto Sans KR',sans-serif" }}>
      {out}
    </div>
  );
}
