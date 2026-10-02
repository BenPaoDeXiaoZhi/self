/**
 * 博客数据加载工具。
 */
import type { RawBlog } from "./types";

/**
 * 拉取构建生成的博客数据。
 * @returns 原始文章条目数组
 * @throws 网络、HTTP 或解析失败时抛出错误
 */
export async function loadRawBlogs(): Promise<RawBlog[]> {
  const res = await fetch("./generated-blogs.json");
  if (!res.ok) {
    throw new Error(`加载博客数据失败: HTTP ${res.status}`);
  }
  return (await res.json()) as RawBlog[];
}
