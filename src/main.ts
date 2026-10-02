/**
 * 博客文章数据与渲染逻辑。
 * 数据由构建脚本生成（见 tsdown.config.ts 的 onSuccess），
 * 运行时从 generated-blogs.json 拉取并渲染。
 */
import { index, searchPosts } from "./search";
import { setupTheme } from "./theme";

/** generated-blogs.json 中的原始条目（构建脚本输出结构） */
export interface RawBlog {
  /** Markdown 原文，含 `@ 日期` / `@ 标签` / `# 描述` 头部行 */
  content: string;
  /** 文件名，含 .md 后缀 */
  title: string;
  /** 发布日期，格式 YYYY-MM-DD（缺失日期的文件会在构建期报错） */
  date: string;
  /** 描述行（"# ..."），可选 */
  desc?: string;
  /** 标签数组（可能为空数组） */
  tags: string[];
}

/** 博客文章结构（前端展示用） */
interface Post {
  /** 文章标题（已去除 .md 后缀） */
  title: string;
  /** 发布日期，格式 YYYY-MM-DD */
  date: string;
  /** 摘要：优先取描述行，否则取正文 */
  excerpt: string;
  /** 标签列表（已去除空值） */
  tags: string[];
}

/** 全部文章（按日期倒序），init 时异步加载 */
let posts: Post[] = [];

/** 当前选中的过滤标签；null 表示显示全部 */
let activeTag: string | null = null;

/** 当前搜索命中的标题集合；null 表示未启用搜索 */
let searchResult: string[] | null = null;

/** 当前搜索关键词（已去除首尾空白）；用于列表高亮 */
let searchQuery = "";

/**
 * 查询指定的单个元素。
 * @param selector - CSS 选择器
 * @returns 匹配的元素
 * @throws 页面结构缺失时抛出错误
 */
function mustQuery<T extends Element>(selector: string): T {
  const el = document.querySelector<T>(selector);
  if (!el) {
    throw new Error(`Element not found: ${selector}`);
  }
  return el;
}

/**
 * 去除行首标记符（`# `）并返回干净文本。
 * @param text - 带标记的原始文本
 * @returns 去除标记后的文本
 */
function stripMarker(text: string): string {
  return text.replace(/^[#]\s*/, "").trim();
}

/**
 * 将构建产物中的原始条目转换为展示用文章对象。
 * @param raw - generated-blogs.json 中的条目
 * @returns 展示用文章对象
 */
function parseBlog(raw: RawBlog): Post {
  const body = raw.content;
  return {
    title: raw.title,
    date: raw.date,
    excerpt: raw.desc ? stripMarker(raw.desc) : body,
    tags: raw.tags.filter(Boolean),
  };
}

/**
 * 拉取并解析构建生成的博客数据。
 * @returns 按日期倒序的文章列表
 * @throws 网络、HTTP 或解析失败时抛出错误
 */
async function loadPosts(): Promise<Post[]> {
  const res = await fetch("./generated-blogs.json");
  if (!res.ok) {
    throw new Error(`加载博客数据失败: HTTP ${res.status}`);
  }
  const raws: RawBlog[] = await res.json();
  return raws
    .map((b) => {
      index.add(b.title, b);
      return parseBlog(b);
    })
    .sort((a, b) => b.date.localeCompare(a.date));
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
      renderPosts();
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
function showListMessage(list: HTMLElement, message: string): void {
  const item = document.createElement("li");
  item.className = "post-list-empty";
  item.textContent = message;
  list.replaceChildren(item);
}

/**
 * 将文本追加到父元素，并用 <mark> 高亮所有匹配当前关键词的片段（忽略大小写）。
 * 关键词按空白拆分为多个词，任一命中均高亮。
 * @param parent - 目标容器
 * @param text - 原始文本
 */
function appendHighlighted(parent: HTMLElement, text: string): void {
  const terms = searchQuery.split(/\s+/).filter(Boolean);
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

/**
 * 渲染文章列表（按当前搜索与标签过滤条件）。
 */
function renderPosts(): void {
  const list = mustQuery<HTMLUListElement>("#post-list");
  const tag = activeTag;
  let filtered = tag ? posts.filter((p) => p.tags.includes(tag)) : posts;

  if (searchResult) {
    const hit = new Set(searchResult);
    const order = new Map(searchResult.map((t, i) => [t, i]));
    filtered = filtered
      .filter((p) => hit.has(p.title))
      .sort((a, b) => (order.get(a.title) ?? 0) - (order.get(b.title) ?? 0));
  }

  if (filtered.length === 0) {
    showListMessage(list, searchResult ? "未找到相关文章" : "暂无相关文章");
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
    appendHighlighted(link, post.title);
    h3.appendChild(link);

    const p = document.createElement("p");
    appendHighlighted(p, post.excerpt);

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
 * 绑定搜索输入框与全文搜索开关：任一变化时更新命中集合并重渲染列表。
 * 页面缺少 #search-input 时静默跳过。
 */
function setupSearch(): void {
  const input = document.querySelector<HTMLInputElement>("#search-input");
  if (!input) {
    return;
  }
  const fullToggle = document.querySelector<HTMLInputElement>("#search-full");

  const run = () => {
    searchQuery = input.value.trim();
    searchResult = searchPosts(input.value, fullToggle?.checked ?? false);
    renderPosts();
  };

  input.addEventListener("input", run);
  fullToggle?.addEventListener("change", run);
}

/**
 * 一言文本加载完成后触发从左到右的逐渐显示动画。
 * hitokoto 脚本通过 innerText 直接注入文本，无回调可用，
 * 这里用 MutationObserver 检测文本出现，再将其包入 span 并添加动画类。
 */
function setupHitokoto(): void {
  const el = document.querySelector<HTMLElement>(".hitokoto");
  if (!el) {
    return;
  }

  const reveal = () => {
    if (el.classList.contains("revealed")) {
      return;
    }
    const text = el.textContent?.trim();
    if (!text) {
      return;
    }
    const span = document.createElement("span");
    span.className = "hitokoto-text";
    span.textContent = text;
    el.replaceChildren(span);
    el.classList.add("revealed");
  };

  reveal();
  new MutationObserver(reveal).observe(el, {
    childList: true,
    characterData: true,
    subtree: true,
  });
}

/**
 * 初始化页面：加载博客数据并渲染列表与过滤按钮。
 */
async function init(): Promise<void> {
  setupTheme();
  setupHitokoto();
  const list = mustQuery<HTMLUListElement>("#post-list");
  showListMessage(list, "加载中…");

  try {
    posts = await loadPosts();
    renderTagFilter(mustQuery("#tag-filter"));
    setupSearch();
    renderPosts();
  } catch (err) {
    console.error(err);
    showListMessage(list, "文章加载失败，请稍后刷新重试");
  }
}

void init();
