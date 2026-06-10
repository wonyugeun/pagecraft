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
const DB_VERSION = 1;
const STORE = 'images';

export interface HistoryImagesPayload {
  sectionImages?: Record<string, string>;
  blockImages?: Record<string, string>;
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
