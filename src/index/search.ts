import { Document } from "flexsearch";
import type { RawBlogMeta } from "../shared/types";

/** 内容索引加载状态机 */
export type ContentLoadState = "idle" | "loading" | "ready" | "failed";

/** 当前状态（模块级单例） */
let loadState: ContentLoadState = "idle";

/** 状态变化监听者列表 */
const stateListeners = new Set<(s: ContentLoadState) => void>();

/**
 * 博客列表搜索索引（flexsearch Document）。
 * 默认只索引元数据（title/date/desc/tags）。
 * 全文搜索开启时调用 appendContentIndex() 将正文追加进索引。
 */
// @ts-ignore
export const index = new Document<RawBlogMeta>({
  tokenize: "full",
  document: {
    id: "title",
    index: ["desc", "date", "title", "tags", "content"],
    tag: "tags",
  },
});

/**
 * 是否已将正文追加进 flexsearch 索引。
 * @returns true 表示正文可用
 */
export function hasContentIndex(): boolean {
  return loadState === "ready";
}

/**
 * 获取当前内容索引加载状态。
 * @returns 当前状态
 */
export function getContentLoadState(): ContentLoadState {
  return loadState;
}

/**
 * 订阅内容加载状态变化。
 * @param listener - 状态回调
 * @returns 取消订阅函数
 */
export function onContentStateChange(
  listener: (s: ContentLoadState) => void,
): () => void {
  stateListeners.add(listener);
  return () => stateListeners.delete(listener);
}

/**
 * 设置内容索引加载状态，通知所有监听者。
 * @param s - 新状态
 */
export function setContentLoadState(s: ContentLoadState): void {
  if (s === loadState) return;
  loadState = s;
  stateListeners.forEach((fn) => fn(s));
}

/**
 * 预注册 meta 文档并同时保存在本地 Map，后续追加 content 时重建合并文档。
 * 必须调用此方法而非直接 index.add，确保 content 追加时不会丢 tag/date/desc。
 * @param meta - 单篇元数据
 */
const metaDocs = new Map<string, RawBlogMeta>();

/**
 * 注册 meta 到索引与本地缓存。
 * @param meta - 元数据条目
 */
export function addMetaToIndex(meta: RawBlogMeta): void {
  metaDocs.set(meta.title, meta);
  index.add(meta.title, meta);
}

/**
 * 追加正文字段到现有索引条目（与已存 meta 合并后重建）。
 * flexsearch Document.add 对重复 id 行为依赖版本实现，
 * 这里移除旧条目再 add 合并后的完整文档，避免 tag 等字段丢失。
 * @param entries - 带 content 的条目
 */
export function appendContentIndex(
  entries: { title: string; content: string }[],
): void {
  entries.forEach((e) => {
    const meta = metaDocs.get(e.title);
    if (!meta) return;
    // 移除旧条目（meta-only 或之前的合并条目）
    try {
      index.remove(e.title);
    } catch {
      /* ignore — remove 失败不阻塞重建 */
    }
    // 重新添加合并后的完整文档
    index.add(e.title, { ...meta, content: e.content });
  });
  setContentLoadState("ready");
}

/**
 * 按关键词与标签搜索文章（统一走 flexsearch Document 索引）。
 * @param query - 搜索关键词（空字符串表示不按关键词过滤）
 * @param tag - 选中的标签（null 或空表示不按标签过滤）
 * @param searchFull - 是否检索正文全文；若正文索引未加载则会退化为元数据搜索
 * @returns 命中的文章标题数组（按相关度排序）；均未指定时返回 null 表示显示全部
 */
export function searchPosts(
  query: string,
  tag: string | null,
  searchFull: boolean,
): string[] | null {
  const q = query.trim();

  if (!q && !tag) {
    return null;
  }

  const opts: {
    tag?: { tags: string };
    field?: (keyof RawBlogMeta)[];
  } = {};
  if (tag) {
    opts.tag = { tags: tag };
  }

  // 仅标签过滤
  if (!q) {
    return index
      .search("", opts)
      .flatMap((r) => r.result)
      .map(String);
  }

  const field: (keyof RawBlogMeta)[] = ["title", "desc", "date", "tags"];
  if (searchFull && hasContentIndex()) {
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
