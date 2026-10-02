/**
 * 首页博客列表：加载元数据、标签过滤、搜索与渲染。
 * 正文异步加载并存入 IndexedDB 用于全文搜索，加载期间全文搜索开关禁用。
 */
import {
  loadBlogMeta,
  loadBlogContentIndex,
  loadContentHash,
} from "../shared/blogs";
import { getCachedContent, setCachedContent } from "../shared/db";
import { mustQuery } from "../shared/dom";
import type { Post, RawBlogMeta } from "../shared/types";
import {
  addMetaToIndex,
  appendContentIndex,
  appendHighlighted,
  getContentLoadState,
  hasContentIndex,
  onContentStateChange,
  setContentLoadState,
  searchPosts,
} from "./search";

/** 全部文章（按日期倒序），init 时异步加载元数据 */
let posts: Post[] = [];

/** 当前选中的过滤标签；null 表示显示全部 */
let activeTag: string | null = null;

/** 当前搜索关键词（已去除首尾空白）；用于列表高亮 */
let searchQuery = "";

/** 当前搜索命中的标题集合（flexsearch 统一处理关键词 + 标签）；null 表示未过滤 */
let searchResult: string[] | null = null;

/**
 * 将构建产物中的元数据条目转换为展示用文章对象。
 * @param raw - generated-blogs-meta.json 中的条目
 * @returns 展示用文章对象
 */
function parseBlog(raw: RawBlogMeta): Post {
  return {
    title: raw.title,
    date: raw.date,
    excerpt: raw.desc ?? "",
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
      void runFilter();
    });
    return btn;
  };

  buttons.push(mkButton("全部", null));
  tags.forEach((tag) => buttons.push(mkButton(tag, tag)));
  container.replaceChildren(...buttons);
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
 * 根据内容加载状态更新全文搜索开关与提示。
 * @param state - 当前加载状态
 */
function applyContentLoadUI(
  state: ReturnType<typeof getContentLoadState>,
): void {
  const label = document.querySelector<HTMLLabelElement>(".search-option");
  const checkbox = document.querySelector<HTMLInputElement>("#search-full");
  if (!label || !checkbox) return;

  // 移除旧状态标记
  label.classList.remove("is-loading", "is-failed", "is-ready");

  const hint = label.querySelector(".search-option-hint");
  if (hint) hint.remove();

  switch (state) {
    case "idle":
      checkbox.disabled = true;
      break;
    case "loading": {
      checkbox.disabled = true;
      label.classList.add("is-loading");
      const h = document.createElement("span");
      h.className = "search-option-hint";
      h.textContent = "（全文索引加载中…）";
      label.appendChild(h);
      break;
    }
    case "ready": {
      checkbox.disabled = false;
      label.classList.add("is-ready");
      break;
    }
    case "failed": {
      checkbox.disabled = true;
      label.classList.add("is-failed");
      const h = document.createElement("span");
      h.className = "search-option-hint";
      h.textContent = "（加载失败，仅元数据搜索可用）";
      label.appendChild(h);
      break;
    }
  }
}

/**
 * 异步加载全文索引：先查本地 IDB hash 命中，miss/stale 则 fetch + 缓存。
 * 所有退出路径最终都 setContentLoadState（ready | failed），
 * 配合 onContentStateChange 保证 UI 状态机闭合。
 */
async function initFullTextSearch(): Promise<void> {
  // 已经完成或正在加载则跳过
  if (getContentLoadState() !== "idle") return;
  setContentLoadState("loading");

  try {
    // 1. 获取服务器 hash（小文件，必拉）
    const hash = await loadContentHash();

    // 2. 先试本地缓存
    const cached = await getCachedContent(hash);
    if (cached && cached.entries.length > 0) {
      appendContentIndex(cached.entries);
      return;
    }

    // 3. 缓存 miss 或 stale → 拉取全文
    const entries = await loadBlogContentIndex();
    // 4. 写入本地缓存（失败不影响主流程）
    void setCachedContent({ hash, entries });
    appendContentIndex(entries);
  } catch (err) {
    console.error("[全文索引] 加载失败:", err);
    setContentLoadState("failed");
  }
}

/**
 * 统一过滤入口：用 flexsearch 同时处理关键词与标签，更新 searchResult 并重渲染。
 * @param forceSearchFull - 若调用方显式要求全文搜索，且正文索引尚未加载，则触发懒加载
 */
async function runFilter(forceSearchFull = false): Promise<void> {
  const input = document.querySelector<HTMLInputElement>("#search-input");
  const fullToggle = document.querySelector<HTMLInputElement>("#search-full");
  const searchFull = (fullToggle?.checked ?? false) && hasContentIndex();

  // 全文搜索开启但正文尚未入库 → 先懒加载 content index
  if (forceSearchFull && fullToggle?.checked && !hasContentIndex()) {
    await initFullTextSearch();
  }

  searchQuery = input?.value.trim() ?? "";
  searchResult = searchPosts(input?.value ?? "", activeTag, searchFull);
  renderPosts();
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
 * 全文搜索 toggle 开启时异步加载 content index，再补一次搜索。
 * 页面缺少 #search-input 时静默跳过。
 */
function setupSearch(): void {
  const input = document.querySelector<HTMLInputElement>("#search-input");
  if (!input) {
    return;
  }
  const fullToggle = document.querySelector<HTMLInputElement>("#search-full");

  input.addEventListener("input", () => {
    void runFilter();
  });
  fullToggle?.addEventListener("change", () => {
    void runFilter(true);
  });
}

/**
 * 初始化博客列表：加载元数据、渲染列表与过滤按钮，并绑定搜索。
 * 元数据加载完成后立即在后台启动全文索引加载（IDB 优先），
 * 不阻塞首屏渲染。
 * @throws 列表容器缺失或数据加载失败时抛出错误
 */
export async function setupPosts(): Promise<void> {
  const list = mustQuery<HTMLUListElement>("#post-list");
  showListMessage(list, "加载中…");

  // 订阅加载状态变化，同步更新 UI
  applyContentLoadUI(getContentLoadState());
  onContentStateChange(applyContentLoadUI);

  const raws = await loadBlogMeta();
  posts = raws
    .map((b) => {
      addMetaToIndex(b);
      return parseBlog(b);
    })
    .sort((a, b) => b.date.localeCompare(a.date));

  renderTagFilter(mustQuery("#tag-filter"));
  setupSearch();
  renderPosts();

  // 首屏渲染后，后台启动全文索引加载
  void initFullTextSearch();
}
