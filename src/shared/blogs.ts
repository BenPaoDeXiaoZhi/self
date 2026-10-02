/**
 * 博客数据加载工具。构建期分 chunk：
 *   generated-blogs-meta.json     — 元数据列表
 *   generated-blogs-content.json  — title + content 对（全文搜索按需加载）
 *   generated-blogs-hash.json     — content 索引的 sha1 hash（客户端对比用）
 *   blogs/<title>.json            — 单篇正文（详情页）
 */
import type { BlogContentIndex, RawBlogChunk, RawBlogMeta } from "./types";

/**
 * 列表页加载的轻量元数据（不含 content）。
 * @returns 元数据数组（按文件名遍历顺序返回，客户端自行排序）
 * @throws 网络、HTTP 或解析失败时抛出错误
 */
export async function loadBlogMeta(): Promise<RawBlogMeta[]> {
  const res = await fetch("./generated-blogs-meta.json");
  if (!res.ok) {
    throw new Error(`加载博客元数据失败: HTTP ${res.status}`);
  }
  return (await res.json()) as RawBlogMeta[];
}

/**
 * 单篇详情页的完整正文 chunk。
 * @param title - 文章标题（URL 解码前的原始值，客户端已从 query param 拿到）
 * @returns 完整文章条目
 * @throws 网络、HTTP 或解析失败时抛出错误
 */
export async function loadBlogChunk(title: string): Promise<RawBlogChunk> {
  const res = await fetch(`./blogs/${encodeURIComponent(title)}.json`);
  if (!res.ok) {
    throw new Error(`加载单篇博客失败: HTTP ${res.status}`);
  }
  return (await res.json()) as RawBlogChunk;
}

/**
 * 全文搜索按需加载的 content 索引（仅 title + content，供 flexsearch 追加索引）。
 * 首次调用时 fetch 并缓存，后续直接返回 Promise。
 * @returns [{ title, content }] 数组
 * @throws 网络、HTTP 或解析失败时抛出错误
 */
let contentIndexCache: Promise<BlogContentIndex[]> | null = null;
export function loadBlogContentIndex(): Promise<BlogContentIndex[]> {
  if (!contentIndexCache) {
    contentIndexCache = fetch("./generated-blogs-content.json")
      .then((res) => {
        if (!res.ok) {
          throw new Error(`加载博客正文索引失败: HTTP ${res.status}`);
        }
        return res.json();
      })
      .then((arr) => arr as BlogContentIndex[]);
  }
  return contentIndexCache;
}

/**
 * 获取 content 索引的构建期 sha1 hash。客户端用此对比本地缓存是否过期。
 * @returns 小写十六进制 hash 字符串
 * @throws 网络、HTTP 或解析失败时抛出错误
 */
let hashCache: Promise<string> | null = null;
export function loadContentHash(): Promise<string> {
  if (!hashCache) {
    hashCache = fetch("./generated-blogs-hash.json")
      .then((res) => {
        if (!res.ok) {
          throw new Error(`加载正文 hash 失败: HTTP ${res.status}`);
        }
        return res.json();
      })
      .then((obj) => (obj as { contentHash: string }).contentHash);
  }
  return hashCache;
}
