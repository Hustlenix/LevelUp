import { replicaIsValid } from "./core.ts";
import type { NexusReplica } from "./types.ts";

const DATABASE = "levelup-nexus";
const DATABASE_VERSION = 1;
const STORE = "replicas";
const CURRENT = "current";

function indexedDb(): IDBFactory | null {
  return typeof indexedDB === "undefined" ? null : indexedDB;
}

function openDatabase(): Promise<IDBDatabase | null> {
  const factory = indexedDb();
  if (!factory) return Promise.resolve(null);
  return new Promise((resolve, reject) => {
    const request = factory.open(DATABASE, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE)) database.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB could not be opened."));
    request.onblocked = () => reject(new Error("IndexedDB upgrade is blocked by another LevelUp tab."));
  });
}

export async function mirrorReplica(replica: NexusReplica): Promise<void> {
  const database = await openDatabase();
  if (!database) return;
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE, "readwrite", { durability: "strict" });
    transaction.objectStore(STORE).put(replica, CURRENT);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("Replica mirror transaction failed."));
    transaction.onabort = () => reject(transaction.error ?? new Error("Replica mirror transaction was aborted."));
  }).finally(() => database.close());
}

export async function readMirroredReplica(): Promise<NexusReplica | null> {
  const database = await openDatabase();
  if (!database) return null;
  return new Promise<NexusReplica | null>((resolve, reject) => {
    const transaction = database.transaction(STORE, "readonly");
    const request = transaction.objectStore(STORE).get(CURRENT);
    request.onsuccess = () => resolve(replicaIsValid(request.result) ? request.result : null);
    request.onerror = () => reject(request.error ?? new Error("Replica mirror could not be read."));
    transaction.oncomplete = () => database.close();
  });
}

export async function clearMirroredReplica(): Promise<void> {
  const database = await openDatabase();
  if (!database) return;
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE, "readwrite", { durability: "strict" });
    transaction.objectStore(STORE).delete(CURRENT);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("Replica mirror could not be cleared."));
  }).finally(() => database.close());
}

