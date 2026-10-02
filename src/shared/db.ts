/**
 * IndexedDB 轻量封装。仅用于缓存全文搜索的 content 索引。
 *
 * 键：contentHash（由构建期对 content 数组 sha1 得到）
 * 值：{ hash: string, entries: BlogContentIndex[] }
 *
 * 所有操作失败时静默拒绝，不抛错给调用方。
 */
import type { BlogContentIndex } from "./types";

/** 数据库名 */
const DB_NAME = "blog-cache";
/** 存储表名 */
const STORE = "content-index";
/** 数据库版本 */
const DB_VERSION = 1;

/** 缓存条目：hash + 正文索引数组 */
export interface CachedContent {
  hash: string;
  entries: BlogContentIndex[];
}

/**
 * 打开（或创建）数据库，返回原生 IDBDatabase。
 * @returns 数据库实例，或打开失败时 null
 */
function openDB(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (typeof indexedDB === "undefined") {
      resolve(null);
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
  });
}

/**
 * 存入 content 索引。
 * @param data - 待缓存条目
 * @returns 写入是否成功
 */
export async function setCachedContent(data: CachedContent): Promise<boolean> {
  try {
    const db = await openDB();
    if (!db) return false;
    return await new Promise<boolean>((resolve) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(data, data.hash);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  } catch {
    return false;
  }
}

/**
 * 读取指定 hash 对应的缓存。
 * @param hash - 服务器返回的 contentHash
 * @returns 命中的缓存条目，或未命中/失败时 null
 */
export async function getCachedContent(
  hash: string,
): Promise<CachedContent | null> {
  try {
    const db = await openDB();
    if (!db) return null;
    return await new Promise<CachedContent | null>((resolve) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).get(hash);
      req.onsuccess = () => resolve((req.result as CachedContent) ?? null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

/**
 * 清空整个缓存存储。
 */
export async function clearCachedContent(): Promise<void> {
  try {
    const db = await openDB();
    if (!db) return;
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    /* ignore */
  }
}
