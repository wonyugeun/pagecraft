'use client';

import { useState, useRef } from 'react';
import { useApp, IMG_CL, TYPE_CUTS, CutItem } from '@/store/AppContext';

interface ImgFile { url: string; label: string; }

const READY_LABELS = ['정면','45도','디테일','포장','성분','컷1','컷2','컷3'];
const MAKE_LABELS  = ['정면','측면','디테일','포장','컷1','컷2','컷3','컷4'];

function UploadZone({
  title, sub, dragging, onDragOver, onDragLeave, onDrop, onFiles, inputRef,
}: {
  title: string; sub: string | React.ReactNode;
  dragging: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
  onFiles: (f: FileList | null) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
}) {
  return (
    <div
      className={`up-zone${dragging ? ' drag' : ''}`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={() => inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/*"
        style={{ display: 'none' }}
        onChange={e => onFiles(e.target.files)}
      />
      <div style={{ fontSize: 28, marginBottom: 10 }}>📷</div>
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 11, color: 'var(--tx3)', lineHeight: 1.6 }}>{sub}</div>
      <label
        className="up-btn"
        onClick={e => { e.stopPropagation(); inputRef.current?.click(); }}
        style={{ cursor: 'pointer' }}
      >
        파일 선택
      </label>
    </div>
  );
}

export default function ImageScreen() {
  const { ch, type, imgMode, setImgMode, setProductImages, go } = useApp();
  const safeCh   = ch   || '스마트스토어';
  const safeType = type || '기본형';
  const guide = (IMG_CL[safeCh] ?? IMG_CL['스마트스토어'])[safeType] ?? IMG_CL['스마트스토어']['기본형'];
  const cuts: CutItem[] = TYPE_CUTS[safeType] ?? TYPE_CUTS['기본형'];

  const [imgs, setImgs]               = useState<ImgFile[]>([]);
  const [makeImgs, setMakeImgs]       = useState<ImgFile[]>([]);
  const [selectedCuts, setSelectedCuts] = useState<string[]>(
    cuts.filter(c => c.checked).map(c => c.id)
  );
  const [makeResult,    setMakeResult]    = useState(false);
  const [making,        setMaking]        = useState(false);
  const [makeGenImages, setMakeGenImages] = useState<Record<string, string>>({});
  const [dragging, setDragging]     = useState(false);
  const [draggingMake, setDraggingMake] = useState(false);

  const readyInputRef = useRef<HTMLInputElement>(null);
  const makeInputRef  = useRef<HTMLInputElement>(null);

  const addFiles = (files: FileList | null, which: 'ready' | 'make') => {
    if (!files) return;
    const labels  = which === 'ready' ? READY_LABELS : MAKE_LABELS;
    const current = which === 'ready' ? imgs : makeImgs;
    const setter  = which === 'ready' ? setImgs : setMakeImgs;
    const newItems: ImgFile[] = [];
    Array.from(files).slice(0, 8 - current.length).forEach(f => {
      newItems.push({
        url: URL.createObjectURL(f),
        label: labels[current.length + newItems.length] ?? '추가',
      });
    });
    setter(p => [...p, ...newItems]);
  };

  const toBase64 = (objectUrl: string): Promise<string> =>
    fetch(objectUrl)
      .then(r => r.blob())
      .then(blob => new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload  = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      }));

  const goGenerate = async (sources: { url: string }[]) => {
    // 최대 3장만 저장 (Gemini 멀티모달 입력 크기 제한 대비)
    const limited = sources.slice(0, 3);
    const base64s = await Promise.all(limited.map(s => toBase64(s.url)));
    setProductImages(base64s);
    go('s5-5');
  };

  const CUT_PROMPTS: Record<string, (i: number) => string> = {
    nukki:     (i) => `Product shot on pure white background, clean professional e-commerce product photography, centered, no shadows, bright even lighting, high detail, shot ${i + 1}`,
    concept:   (i) => `Product with artistic mood background, brand aesthetic photography, elegant composition, soft bokeh, professional studio, concept shot ${i + 1}`,
    thumb:     (i) => `E-commerce store thumbnail, product hero shot, eye-catching clean composition, optimized for online store, thumbnail ${i + 1}`,
    detail:    (i) => `Product macro close-up, showing texture and material fine details, professional close-up photography, detail shot ${i + 1}`,
    lifestyle: (i) => `Product in natural lifestyle scene, real-world usage context, warm natural lighting, authentic atmosphere, lifestyle shot ${i + 1}`,
  };

  const startMakeGen = async () => {
    if (!makeImgs.length) { alert('먼저 원본 사진을 업로드해주세요'); return; }
    setMaking(true);
    setMakeGenImages({});

    const limited = makeImgs.slice(0, 3);
    let base64s: string[] = [];
    try {
      base64s = await Promise.all(limited.map(s => toBase64(s.url)));
    } catch (err) {
      console.error('[startMakeGen] base64 error:', err);
    }

    const activeCuts = cuts.filter(c => selectedCuts.includes(c.id) && !c.disabled);
    for (const cut of activeCuts) {
      const count = Math.min(cut.count, 2);
      for (let i = 0; i < count; i++) {
        const key = `${cut.id}-${i}`;
        const promptFn = CUT_PROMPTS[cut.id];
        if (!promptFn) continue;
        try {
          const res = await fetch('/api/generate-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              prompt: promptFn(i),
              sectionNum: key,
              productImages: base64s.length > 0 ? base64s : undefined,
            }),
            signal: AbortSignal.timeout(130_000),
          });
          const data = await res.json();
          if (data.imageBase64) {
            setMakeGenImages(p => ({ ...p, [key]: `data:${data.mimeType};base64,${data.imageBase64}` }));
          }
        } catch (err) {
          console.error('[startMakeGen] cut error:', cut.id, err);
        }
      }
    }

    setMaking(false);
    setMakeResult(true);
  };

  const toggleCut = (id: string) =>
    setSelectedCuts(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  return (
    <div className="inner">
      <div className="stitle">이미지를 준비해주세요</div>
      <div className="ssub">{safeCh} · {safeType} 기준 — 필요한 이미지와 이유를 안내드려요</div>

      {/* ① 체크리스트 */}
      <div className="img-guide-card">
        <div className="igc-header">
          <div className="igc-title">📸 {safeCh} · {safeType} 이미지 체크리스트</div>
          <div className="igc-sub">각 이미지가 왜 필요한지 이유와 함께 안내해드려요 — 이미지 퀄리티가 상세페이지 완성도를 결정합니다</div>
        </div>
        <div className="img-check-list">
          {guide.map(item => (
            <div className="icl-item" key={item.name}>
              <div className="icl-img">
                <div style={{ fontSize: 20 }}>{item.img}</div>
                <div className="icl-img-lbl">예시</div>
              </div>
              <div className="icl-body">
                <div className="icl-name">
                  {item.name}
                  <span className={`icl-req-tag ${item.req ? 'req-tag' : 'opt-tag'}`}>
                    {item.req ? '필수' : '선택'}
                  </span>
                </div>
                <div className="icl-reason">{item.reason}</div>
                <div className="icl-why">💡 {item.why}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ② 준비 상태 선택 — 미선택 시 이전 버튼 */}
      {!imgMode && (
        <div className="cta-row" style={{ marginBottom: 8 }}>
          <button className="btn-back" onClick={() => go('s4')}>← 이전</button>
        </div>
      )}

      <div className="fdiv" style={{ marginBottom: 16 }}>
        <div className="fdiv-line" />
        <span className="fdiv-lbl">이미지 준비 상태</span>
        <div className="fdiv-line" />
      </div>
      <div className="img-mode-grid">
        {[
          { mode: 'ready', ico: '✅', title: '이미지가 준비되어 있어요',   desc: '위 체크리스트대로 이미지를 준비했어요.\n바로 업로드하고 상세페이지 진행합니다.' },
          { mode: 'make',  ico: '📷', title: '제품 원본사진만 있어요',    desc: '원본사진으로 필요한 컷을 AI가 만들어드려요.\n확인 후 상세페이지 진행합니다.' },
        ].map(({ mode, ico, title, desc }) => (
          <div
            key={mode}
            className={`imc${imgMode === mode ? ' on' : ''}`}
            onClick={() => setImgMode(mode)}
          >
            <div className="imc-ck">✓</div>
            <div className="imc-ico">{ico}</div>
            <div className="imc-title">{title}</div>
            <div className="imc-desc">{desc.split('\n').map((l, i) => <span key={i}>{l}{i === 0 && <br />}</span>)}</div>
          </div>
        ))}
      </div>

      {/* A. 이미지 준비된 경우 */}
      {imgMode === 'ready' && (
        <div id="upload-section">
          <div className="fg">
            <div className="fl">이미지 업로드 <span className="freq">*</span></div>
            <UploadZone
              title="이미지 드래그 또는 클릭해서 업로드"
              sub="PNG · JPG · WEBP · 최대 8장"
              dragging={dragging}
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={e => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files, 'ready'); }}
              onFiles={f => addFiles(f, 'ready')}
              inputRef={readyInputRef}
            />
            {imgs.length > 0 && (
              <div className="img-grid">
                {imgs.map((img, i) => (
                  <div className="img-th" key={i}>
                    <img src={img.url} alt={img.label} />
                    <div className="img-lbl">{img.label}</div>
                    <button className="img-th-rm" onClick={() => { URL.revokeObjectURL(img.url); setImgs(p => p.filter((_, j) => j !== i)); }}>✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="cta-row">
            <button className="btn-back" onClick={() => go('s4')}>← 이전</button>
            <button
              className="btn-next"
              style={{ display: imgs.length > 0 ? 'flex' : 'none' }}
              onClick={() => goGenerate(imgs)}
            >
              생성하기 →
            </button>
          </div>
        </div>
      )}

      {/* B. 원본사진으로 AI 컷 생성 */}
      {imgMode === 'make' && !makeResult && (
        <div id="make-section">
          <div className="fg">
            <div className="fl">원본 상품 사진 업로드 <span className="freq">*</span></div>
            <UploadZone
              title="원본 사진을 업로드해주세요"
              sub={<>누끼 작업 전 원본 · PNG · JPG · WEBP<br />여러 각도 사진일수록 AI 품질이 올라가요</>}
              dragging={draggingMake}
              onDragOver={e => { e.preventDefault(); setDraggingMake(true); }}
              onDragLeave={() => setDraggingMake(false)}
              onDrop={e => { e.preventDefault(); setDraggingMake(false); addFiles(e.dataTransfer.files, 'make'); }}
              onFiles={f => addFiles(f, 'make')}
              inputRef={makeInputRef}
            />
            {makeImgs.length > 0 && (
              <div className="img-grid">
                {makeImgs.map((img, i) => (
                  <div className="img-th" key={i}>
                    <img src={img.url} alt={img.label} />
                    <div className="img-lbl">{img.label}</div>
                    <button className="img-th-rm" onClick={() => { URL.revokeObjectURL(img.url); setMakeImgs(p => p.filter((_, j) => j !== i)); }}>✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="fb">
            <div className="fdiv">
              <div className="fdiv-line" />
              <span className="fdiv-lbl">생성할 컷 선택</span>
              <div className="fdiv-line" />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {cuts.map(c => (
                <div
                  key={c.id}
                  className={`cut-card${selectedCuts.includes(c.id) ? ' on' : ''}`}
                  onClick={() => !c.disabled && toggleCut(c.id)}
                  style={c.disabled ? { opacity: 0.4, cursor: 'default' } : {}}
                >
                  <div className="cut-chk">{selectedCuts.includes(c.id) ? '✓' : ''}</div>
                  <div className="cut-body">
                    <div className="cut-name">
                      {c.ico} {c.name}
                      <span className={`cut-tag ${c.tagClass}`}>{c.tag}</span>
                      {!c.disabled && <span style={{ fontSize: 10, color: 'var(--tx3)' }}>{c.count}장</span>}
                    </div>
                    <div className="cut-desc">{c.desc}</div>
                    {c.why && <div className="cut-why">💡 {c.why}</div>}
                  </div>
                </div>
              ))}
            </div>
            <div className="fhint" style={{ marginTop: 12 }}>모델컷 · GIF 모션컷은 추후 업데이트 예정이에요</div>
          </div>

          <div id="make-cta" style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 12, gap: 12 }}>
            <button className="btn-back" onClick={() => go('s4')}>← 이전</button>
            <button className="btn-next" onClick={startMakeGen} disabled={making}>
              {making ? 'AI 생성 중...' : '✦ AI로 컷 생성하기'}
            </button>
          </div>
        </div>
      )}

      {/* B-3. AI 생성 결과 */}
      {imgMode === 'make' && makeResult && (
        <div id="make-result" style={{ marginTop: 20 }}>
          <div style={{ background: 'var(--white)', border: '1.5px solid rgba(22,163,74,.3)', borderRadius: 'var(--r)', overflow: 'hidden' }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--bd)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>✅ 생성 완료 — 확인 후 진행해주세요</div>
              <button
                onClick={() => setMakeResult(false)}
                style={{ fontSize: 11, color: 'var(--tx2)', background: 'transparent', border: '1.5px solid var(--bd)', borderRadius: 'var(--rs)', padding: '5px 10px', cursor: 'pointer', fontFamily: 'var(--f)' }}
              >
                다시 생성
              </button>
            </div>
            <div style={{ padding: 16 }}>
              <div id="result-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 16 }}>
                {cuts
                  .filter(c => selectedCuts.includes(c.id) && !c.disabled)
                  .flatMap(c =>
                    Array.from({ length: Math.min(c.count, 2) }, (_, i) => {
                      const key = `${c.id}-${i}`;
                      const imgUrl = makeGenImages[key];
                      return (
                        <div className="res-img-card" key={key}>
                          {imgUrl
                            ? <img src={imgUrl} alt={`${c.name} ${i + 1}`} style={{ width: '100%', aspectRatio: '1/1', objectFit: 'contain', background: '#f8fafc' }} />
                            : <div className="ric-mock">{c.ico}</div>
                          }
                          <div className="ric-info">
                            <div className="ric-name">{c.name} {i + 1}</div>
                            {imgUrl
                              ? <a href={imgUrl} download={`${c.id}_${i + 1}.png`} className="ric-dl" style={{ textDecoration: 'none', display: 'inline-block', textAlign: 'center' }}>⬇ 다운로드</a>
                              : <div style={{ fontSize: 10, color: 'var(--tx3)' }}>생성 실패</div>
                            }
                          </div>
                        </div>
                      );
                    })
                  )
                }
              </div>
              <div style={{ background: 'var(--sf)', borderRadius: 'var(--rs)', padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ fontSize: 13, color: 'var(--tx2)' }}>마음에 드는 이미지를 다운받고, 이 이미지로 상세페이지를 만드세요</div>
                <button className="btn-next" style={{ padding: '10px 20px', fontSize: 13 }} onClick={() => goGenerate(makeImgs)}>
                  이 이미지로 상세페이지 만들기 →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
