// Device-only message store using IndexedDB. Plaintext messages live only here.
const DB = "lumens-msgs";
const STORE = "messages";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      const s = db.createObjectStore(STORE, { keyPath: "id" });
      s.createIndex("conv", "conversationId", { unique: false });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export type LocalMessage = {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  createdAt: number;
};

export async function saveMessage(msg: LocalMessage) {
  const db = await openDb();
  return new Promise<void>((res, rej) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(msg);
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
  });
}

export async function listMessages(conversationId: string): Promise<LocalMessage[]> {
  const db = await openDb();
  return new Promise((res, rej) => {
    const tx = db.transaction(STORE, "readonly");
    const idx = tx.objectStore(STORE).index("conv");
    const req = idx.getAll(IDBKeyRange.only(conversationId));
    req.onsuccess = () => res((req.result as LocalMessage[]).sort((a, b) => a.createdAt - b.createdAt));
    req.onerror = () => rej(req.error);
  });
}
