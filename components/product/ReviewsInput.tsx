'use client';

import { useEffect, useRef, useState } from 'react';
import { Plus, X, Star } from 'lucide-react';

/**
 * 고객 후기 구조화 입력(2026-08-04 유근님) — 후기·이름·별점을 칸으로 나눈다.
 *
 * ★왜: 한 칸짜리 textarea는 "어떤 형식으로 붙여넣어야 하나"부터 막힌다. 칸을 나누면
 *   형식 고민이 사라지고, 별점처럼 구조가 필요한 값도 정확히 들어온다.
 *
 * ★저장은 기존 문자열 그대로 직렬화한다 — 파이프라인(고객 후기: {reviews})과 저장 구조를
 *   건드리지 않기 위해서다. 한 줄 = 한 후기: "내용" - 이름 (별점 N/5)
 *   레거시 자유 텍스트는 첫 행의 내용으로 흡수된다(형식 안 맞아도 데이터를 버리지 않는다).
 *
 * ⚠️별점은 '선택 안 함'이 기본 — 별점을 실제로 받은 후기만 표시광고법상 별점을 실을 수 있다.
 */

interface Row { text: string; name: string; rating: number }   // rating 0 = 미입력

const LINE_RE = /^"?(.*?)"?\s*(?:-\s*([^("]+?))?\s*(?:\(별점\s*(\d)\/5\))?$/;

function parse(value: string): Row[] {
  const lines = value.split('\n').map(l => l.trim()).filter(Boolean);
  if (!lines.length) return [{ text: '', name: '', rating: 0 }];
  return lines.map(l => {
    const m = l.match(LINE_RE);
    return m
      ? { text: (m[1] ?? '').trim(), name: (m[2] ?? '').trim(), rating: Number(m[3] ?? 0) || 0 }
      : { text: l, name: '', rating: 0 };
  });
}

function serialize(rows: Row[]): string {
  return rows
    .filter(r => r.text.trim())
    .map(r => `"${r.text.trim()}"${r.name.trim() ? ` - ${r.name.trim()}` : ''}${r.rating ? ` (별점 ${r.rating}/5)` : ''}`)
    .join('\n');
}

export default function ReviewsInput({ value, onChange }: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [rows, setRows] = useState<Row[]>(() => parse(value));
  const lastEmit = useRef(value);

  // 밖에서 값이 바뀌면(새 작업 초기화·프리셋 채우기) 행을 다시 만든다 — 내 편집 에코는 무시
  useEffect(() => {
    if (value !== lastEmit.current) setRows(parse(value));
  }, [value]);

  const emit = (next: Row[]) => {
    setRows(next);
    const s = serialize(next);
    lastEmit.current = s;
    onChange(s);
  };
  const patch = (i: number, p: Partial<Row>) => emit(rows.map((r, j) => (j === i ? { ...r, ...p } : r)));

  return (
    <div>
      <div style={{ display: 'grid', gap: 10 }}>
        {rows.map((r, i) => (
          <div key={i} style={{ border: '1px solid #ECECF2', borderRadius: 12, padding: '12px 13px', background: '#FAFAFC' }}>
            <textarea
              value={r.text}
              onChange={e => patch(i, { text: e.target.value })}
              placeholder="후기 내용 (스토어에 등록된 실제 후기를 붙여넣으세요)"
              style={{
                width: '100%', border: 'none', outline: 'none', resize: 'vertical',
                minHeight: 44, fontSize: 13.5, fontFamily: 'inherit', lineHeight: 1.6,
                background: 'transparent', color: '#191F28',
              }}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
              <input
                value={r.name}
                onChange={e => patch(i, { name: e.target.value })}
                placeholder="작성자 (예: 김OO)"
                style={{
                  width: 130, border: '1px solid #ECECF2', borderRadius: 8, padding: '7px 10px',
                  fontSize: 12.5, fontFamily: 'inherit', outline: 'none', background: '#fff',
                }}
              />
              {/* 별점 — 실제로 받은 별점만. 누르면 선택, 같은 별 다시 누르면 해제 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 2 }} title="실제 후기에 별점이 있을 때만 선택하세요">
                {[1, 2, 3, 4, 5].map(n => (
                  <Star
                    key={n} size={17}
                    onClick={() => patch(i, { rating: r.rating === n ? 0 : n })}
                    style={{ cursor: 'pointer' }}
                    color={n <= r.rating ? '#F59E0B' : '#D9D9E3'}
                    fill={n <= r.rating ? '#F59E0B' : 'none'}
                  />
                ))}
                {r.rating > 0 && <span style={{ fontSize: 11.5, color: '#8B95A1', marginLeft: 4 }}>{r.rating}/5</span>}
              </div>
              {rows.length > 1 && (
                <button
                  onClick={() => emit(rows.filter((_, j) => j !== i))}
                  aria-label="후기 삭제"
                  style={{
                    marginLeft: 'auto', border: 'none', background: 'none', cursor: 'pointer',
                    color: '#B0B8C1', display: 'flex', padding: 4,
                  }}
                ><X size={15} /></button>
              )}
            </div>
          </div>
        ))}
      </div>
      <button
        onClick={() => emit([...rows, { text: '', name: '', rating: 0 }])}
        style={{
          marginTop: 10, width: '100%', border: '1.5px dashed #D9D9E3', background: 'transparent',
          borderRadius: 10, padding: '10px 0', fontSize: 12.5, fontWeight: 700, color: '#6B7684',
          cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex',
          alignItems: 'center', justifyContent: 'center', gap: 5,
        }}
      ><Plus size={14} />후기 추가</button>
    </div>
  );
}
