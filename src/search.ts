import { Document } from "flexsearch";
import type { RawBlog } from "./main";

/**
 * 博客列表搜索索引（flexsearch）。
 */

// @ts-ignore
export const index = new Document<RawBlog>({
  tokenize: "full",
  document: {
    id: "title",
    index: ["desc", "date", "content", "tags", "title"],
    tag: "tags",
  },
});

/**
 * 按关键词搜索文章。
 * @param query - 搜索关键词
 * @returns 命中的文章标题数组（按相关度排序）；关键词为空时返回 null
 */
export function searchPosts(
  query: string,
  searchFull: boolean,
): string[] | null {
  const q = query.trim();
  if (!q) {
    return null;
  }
  const field: (keyof RawBlog)[] = ["title", "desc", "date", "tags"];
  if (searchFull) {
    field.push("content");
  }
  const result = index
    .search(q, {
      field,
    })
    .flatMap((r) => {
      return r.result;
    })
    .map(String);
  console.log(result);
  return result;
}
