/**
 * 작업기록 이미지 저장용 IndexedDB 래퍼.
 *
 * 이전(localStorage)에서 압축본 32장×약 120KB로 기록 1개당 ~3.8MB → 5MB 한도에서 2개째 quota 초과.
 * IndexedDB는 브라우저별 디스크 비율(보통 50%+)이라 같은 압축본 50개+도 여유.
 *
 * 텍스트 메타(섹션·카피·설정)는 기존대로 localStorage 유지.
 * 이미지(`sectionImages`/`blockImages`)만 historyId 키로 IndexedDB에 저장.
 *
 * 시크릿 모드 등 IndexedDB 사용 불가 환경에서는 호출자 try/catch로 흡수 — 텍스트 기록은 살림.
 */

const DB_NAME = 'pagecraft_history';
const DB_VERSION = 2;            // v2: 통합 파이프라인 job 상태 저장용 'jobs' 스토어 추가
const STORE = 'images';
const JOB_STORE = 'jobs';

export interface HistoryImagesPayload {
  sectionImages?: Record<string, string>;
  blockImages?: Record<string, string>;
  sectionOverrides?: Record<string, unknown>;   // 인라인 편집(텍스트 override) 영속화 — 가벼움(압축 불필요)
  productImages?: string[];                     // 셀러 제품 사진(edits reference) — 재진입 시 소실 방지(압축 저장)
  sessionId?: string;                           // '__session__' 레코드 전용 — 같은 탭 세션에서만 복원(타 제품 오염 방지)
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE); // key = historyId
      }
      if (!db.objectStoreNames.contains(JOB_STORE)) {
        db.createObjectStore(JOB_STORE); // key = jobId — 통합 파이프라인 중간상태
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('IndexedDB open failed'));
  });
}

export async function saveImages(historyId: string, payload: HistoryImagesPayload): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(payload, historyId);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error ?? new Error('IndexedDB save failed')); };
    tx.onabort = () => { db.close(); reject(tx.error ?? new Error('IndexedDB save aborted')); };
  });
}

/** 기존 레코드에 부분 병합 저장(다른 필드 보존) — 이미지/override를 서로 덮어쓰지 않게.
 *  ⚠️ top-level 얕은 병합: partial.sectionImages를 주면 기존 sectionImages 맵 전체를 '교체'한다.
 *  (sectionOverrides 등 다른 top-level 키만 보존. 맵 내부 키 단위 누적이 필요하면 mergeImages를 쓸 것.) */
export async function patchImages(historyId: string, partial: HistoryImagesPayload): Promise<void> {
  let existing: HistoryImagesPayload | null = null;
  try { existing = await getImages(historyId); } catch { /* 없으면 신규 */ }
  await saveImages(historyId, { ...(existing ?? {}), ...partial });
}

/** 이미지 맵을 '내부 키 단위'로 깊게 병합 저장 — 섹션별 증분 저장에서 이전 섹션이 날아가지 않게.
 *  patchImages(얕은 병합)는 sectionImages 맵 전체를 교체하므로 1장씩 저장하면 앞 장이 유실된다.
 *  이 함수는 sectionImages/blockImages 내부 키를 누적 병합하고, 그 외 top-level 키(sectionOverrides 등)는 보존한다.
 *  ★원자화(P0, 2026-07-07): 이전에는 getImages/saveImages 각각 별도 트랜잭션(RMW 분리)이라
 *    3-워커 병렬 증분 저장이 같은 base를 읽고 서로 덮어써 이미지가 유실됐다. 단일 readwrite
 *    트랜잭션 안에서 get→병합→put — IndexedDB가 같은 스토어의 readwrite 트랜잭션을 직렬화하므로
 *    동시 merge가 서로의 결과를 잃지 않는다. (트랜잭션 내 await 금지 규칙 때문에 콜백 체인으로 작성) */
export async function mergeImages(historyId: string, partial: HistoryImagesPayload): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    const req = store.get(historyId);
    req.onsuccess = () => {
      const existing = (req.result as HistoryImagesPayload | undefined) ?? null;
      store.put({
        ...(existing ?? {}),
        sectionImages: { ...(existing?.sectionImages ?? {}), ...(partial.sectionImages ?? {}) },
        blockImages:   { ...(existing?.blockImages ?? {}),   ...(partial.blockImages ?? {}) },
      }, historyId);
    };
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error ?? new Error('IndexedDB merge failed')); };
    tx.onabort = () => { db.close(); reject(tx.error ?? new Error('IndexedDB merge aborted')); };
  });
}

export async function getImages(historyId: string): Promise<HistoryImagesPayload | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).get(historyId);
    req.onsuccess = () => { db.close(); resolve((req.result as HistoryImagesPayload | undefined) ?? null); };
    req.onerror = () => { db.close(); reject(req.error ?? new Error('IndexedDB get failed')); };
  });
}

export async function deleteImages(historyId: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(historyId);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error ?? new Error('IndexedDB delete failed')); };
  });
}

/* ── 통합 파이프라인 job 중간상태(JobState) 저장 — 실패/재진입 시 마지막 지점부터 재개 ── */

export async function saveJob<T>(job: T & { jobId: string }): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(JOB_STORE, 'readwrite');
    tx.objectStore(JOB_STORE).put(job, job.jobId);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error ?? new Error('IndexedDB saveJob failed')); };
    tx.onabort = () => { db.close(); reject(tx.error ?? new Error('IndexedDB saveJob aborted')); };
  });
}

export async function getJob<T>(jobId: string): Promise<T | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(JOB_STORE, 'readonly');
    const req = tx.objectStore(JOB_STORE).get(jobId);
    req.onsuccess = () => { db.close(); resolve((req.result as T | undefined) ?? null); };
    req.onerror = () => { db.close(); reject(req.error ?? new Error('IndexedDB getJob failed')); };
  });
}

export async function deleteJob(jobId: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(JOB_STORE, 'readwrite');
    tx.objectStore(JOB_STORE).delete(jobId);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error ?? new Error('IndexedDB deleteJob failed')); };
  });
}
