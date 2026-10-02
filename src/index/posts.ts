/**
 * 首页博客列表：加载数据、标签过滤、搜索与渲染。
 */
import { loadRawBlogs } from "../shared/blogs";
import { mustQuery } from "../shared/dom";
import type { Post, RawBlog } from "../shared/types";
import { appendHighlighted, index, searchPosts } from "./search";

/** 全部文章（按日期倒序），init 时异步加载 */
let posts: Post[] = [];

/** 当前选中的过滤标签；null 表示显示全部 */
let activeTag: string | null = null;

/** 当前搜索关键词（已去除首尾空白）；用于列表高亮 */
let searchQuery = "";

/** 当前搜索命中的标题集合（flexsearch 统一处理关键词 + 标签）；null 表示未过滤 */
let searchResult: string[] | null = null;

/**
 * 将构建产物中的原始条目转换为展示用文章对象。
 * @param raw - generated-blogs.json 中的条目
 * @returns 展示用文章对象
 */
function parseBlog(raw: RawBlog): Post {
  return {
    title: raw.title,
    date: raw.date,
    excerpt: raw.desc ?? raw.content,
    tags: raw.tags.filter(Boolean),
  };
}

/**
 * 从文章集合中提取所有标签（去重）。
 * @param list - 文章列表
 * @returns 标签数组
 */
function collectTags(list: Post[]): string[] {
  return [...new Set(list.flatMap((p) => p.tags))];
}

/**
 * 渲染标签过滤按钮组。
 * @param container - 按钮组容器
 */
function renderTagFilter(container: HTMLElement): void {
  const tags = collectTags(posts);
  const buttons: HTMLButtonElement[] = [];

  const mkButton = (label: string, tag: string | null): HTMLButtonElement => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = label;
    btn.dataset.tag = tag ?? "";
    btn.classList.toggle("active", activeTag === tag);
    btn.addEventListener("click", () => {
      activeTag = activeTag === tag ? null : tag;
      buttons.forEach((b) =>
        b.classList.toggle("active", b.dataset.tag === (activeTag ?? "")),
      );
      runFilter();
    });
    return btn;
  };

  buttons.push(mkButton("全部", null));
  tags.forEach((tag) => buttons.push(mkButton(tag, tag)));
  container.replaceChildren(...buttons);
}

/**
 * 统一过滤入口：用 flexsearch 同时处理关键词与标签，更新 searchResult 并重渲染。
 */
function runFilter(): void {
  const input = document.querySelector<HTMLInputElement>("#search-input");
  const fullToggle = document.querySelector<HTMLInputElement>("#search-full");

  searchQuery = input?.value.trim() ?? "";
  searchResult = searchPosts(
    input?.value ?? "",
    activeTag,
    fullToggle?.checked ?? false,
  );
  renderPosts();
}

/**
 * 在列表位置显示一条提示信息。
 * @param list - 文章列表容器
 * @param message - 提示文本
 */
export function showListMessage(list: HTMLElement, message: string): void {
  const item = document.createElement("li");
  item.className = "post-list-empty";
  item.textContent = message;
  list.replaceChildren(item);
}

/**
 * 渲染文章列表（全部过滤条件统一走 flexsearch searchResult）。
 */
function renderPosts(): void {
  const list = mustQuery<HTMLUListElement>("#post-list");

  let filtered = posts;
  let hintEmpty = false;

  if (searchResult) {
    const hit = new Set(searchResult);
    const order = new Map(searchResult.map((t, i) => [t, i]));
    filtered = posts
      .filter((p) => hit.has(p.title))
      .sort((a, b) => (order.get(a.title) ?? 0) - (order.get(b.title) ?? 0));
    hintEmpty = true;
  }

  if (filtered.length === 0) {
    showListMessage(
      list,
      hintEmpty
        ? searchQuery && activeTag
          ? "未找到匹配关键词与标签的文章"
          : searchQuery
            ? "未找到相关文章"
            : activeTag
              ? "该标签下暂无文章"
              : "暂无相关文章"
        : "暂无相关文章",
    );
    return;
  }

  const items = filtered.map((post, i) => {
    const li = document.createElement("li");
    li.className = "post";
    // 渐入动画按序号错峰，最多延迟 240ms
    li.style.animationDelay = `${Math.min(i * 40, 240)}ms`;

    const meta = document.createElement("div");
    meta.className = "post-meta";
    const time = document.createElement("time");
    time.textContent = post.date;
    meta.appendChild(time);

    const h3 = document.createElement("h3");
    const link = document.createElement("a");
    link.href = `./blog.html?title=${encodeURIComponent(post.title)}`;
    appendHighlighted(link, post.title, searchQuery);
    h3.appendChild(link);

    const p = document.createElement("p");
    appendHighlighted(p, post.excerpt, searchQuery);

    const tags = document.createElement("div");
    tags.className = "post-tags";
    post.tags.forEach((tag) => {
      const span = document.createElement("span");
      span.textContent = tag;
      tags.appendChild(span);
    });

    li.append(meta, h3, p, tags);
    return li;
  });

  list.replaceChildren(...items);
}

/**
 * 绑定搜索输入框与全文搜索开关：任一变化时触发统一过滤。
 * 页面缺少 #search-input 时静默跳过。
 */
function setupSearch(): void {
  const input = document.querySelector<HTMLInputElement>("#search-input");
  if (!input) {
    return;
  }
  const fullToggle = document.querySelector<HTMLInputElement>("#search-full");

  input.addEventListener("input", runFilter);
  fullToggle?.addEventListener("change", runFilter);
}

/**
 * 初始化博客列表：加载数据、渲染列表与过滤按钮，并绑定搜索。
 * @throws 列表容器缺失或数据加载失败时抛出错误
 */
export async function setupPosts(): Promise<void> {
  const list = mustQuery<HTMLUListElement>("#post-list");
  showListMessage(list, "加载中…");

  const raws = await loadRawBlogs();
  posts = raws
    .map((b) => {
      index.add(b.title, b);
      return parseBlog(b);
    })
    .sort((a, b) => b.date.localeCompare(a.date));

  renderTagFilter(mustQuery("#tag-filter"));
  setupSearch();
  renderPosts();
}
