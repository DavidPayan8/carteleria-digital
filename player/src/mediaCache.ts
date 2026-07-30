const DB_NAME = "carteleria-player";
const STORE = "media";
const DB_VERSION = 1;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function withStore<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const req = run(tx.objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Descarga y cachea el blob de un item si no está ya cacheado. La URL es una
 * SAS de Azure con firma que expira y cambia en cada poll: la clave de caché
 * es el id del item de la playlist (estable), no la URL.
 */
export async function ensureCached(itemId: string, url: string): Promise<void> {
  const existing = await withStore<Blob | undefined>("readonly", (s) => s.get(itemId));
  if (existing) return;
  try {
    const res = await fetch(url);
    if (!res.ok) return;
    const blob = await res.blob();
    await withStore("readwrite", (s) => s.put(blob, itemId));
  } catch {
    // Sin conexión o SAS ya expirada: se reintentará en el siguiente poll exitoso.
  }
}

export async function getCachedObjectUrl(itemId: string): Promise<string | null> {
  const blob = await withStore<Blob | undefined>("readonly", (s) => s.get(itemId));
  return blob ? URL.createObjectURL(blob) : null;
}

/** Elimina del cache los items que ya no pertenecen a la playlist vigente. */
export async function prune(keepItemIds: readonly string[]): Promise<void> {
  const db = await openDb();
  const keep = new Set(keepItemIds);
  const tx = db.transaction(STORE, "readwrite");
  const store = tx.objectStore(STORE);
  const keys = await new Promise<IDBValidKey[]>((resolve, reject) => {
    const req = store.getAllKeys();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  for (const key of keys) {
    if (!keep.has(String(key))) store.delete(key);
  }
}
