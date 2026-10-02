import { Document } from "flexsearch";
import type { RawBlog } from "../shared/types";

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
 * 按关键词与标签搜索文章（统一走 flexsearch Document 索引）。
 * @param query - 搜索关键词（空字符串表示不按关键词过滤）
 * @param tag - 选中的标签（null 或空表示不按标签过滤）
 * @param searchFull - 是否检索正文全文
 * @returns 命中的文章标题数组（按相关度排序）；均未指定时返回 null 表示显示全部
 */
export function searchPosts(
  query: string,
  tag: string | null,
  searchFull: boolean,
): string[] | null {
  const q = query.trim();

  // 关键词与标签均未指定 → null，由调用方渲染全部文章
  if (!q && !tag) {
    return null;
  }

  const opts: {
    tag?: { tags: string };
    field?: (keyof RawBlog)[];
  } = {};
  if (tag) {
    opts.tag = { tags: tag };
  }

  // 仅标签过滤：flexsearch tag 索引不支持空 query，用 undefined 触发纯 tag 搜索
  if (!q) {
    return index
      .search("", opts)
      .flatMap((r) => r.result)
      .map(String);
  }

  const field: (keyof RawBlog)[] = ["title", "desc", "date", "tags"];
  if (searchFull) {
    field.push("content");
  }
  opts.field = field;

  return index
    .search(q, opts)
    .flatMap((r) => r.result)
    .map(String);
}

/**
 * 将文本追加到父元素，并用 `<mark>` 高亮所有匹配当前关键词的片段（忽略大小写）。
 * 关键词按空白拆分为多个词，任一命中均高亮。
 * @param parent - 目标容器
 * @param text - 原始文本
 * @param query - 搜索关键词（空则不高亮）
 */
export function appendHighlighted(
  parent: HTMLElement,
  text: string,
  query: string,
): void {
  const terms = query.split(/\s+/).filter(Boolean);
  if (terms.length === 0) {
    parent.textContent = text;
    return;
  }

  const pattern = terms
    .map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|");
  const regex = new RegExp(pattern, "gi");
  let last = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text))) {
    if (match.index > last) {
      parent.appendChild(
        document.createTextNode(text.slice(last, match.index)),
      );
    }
    const mark = document.createElement("mark");
    mark.className = "search-highlight";
    mark.textContent = match[0];
    parent.appendChild(mark);
    last = match.index + match[0].length;
  }

  if (last < text.length) {
    parent.appendChild(document.createTextNode(text.slice(last)));
  }
}
