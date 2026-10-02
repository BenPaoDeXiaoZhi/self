import hljs from "highlight.js";
import javascript from "highlight.js/lib/languages/javascript";
import markdownIt from "markdown-it";
// @ts-ignore
import mila from "markdown-it-task-lists";
import { setupTheme } from "./theme";

// Then register the languages you need
hljs.registerLanguage("javascript", javascript);
/**
 * 博客文章详情页渲染逻辑（public/blog.html）。
 * 从构建产物 generated-blogs.json 中按标题查找文章，
 * 使用 marked 将 Markdown 正文渲染为 HTML。
 */
/** generated-blogs.json 中的原始条目（构建脚本输出结构） */

const md = new markdownIt({
  highlight(str, lang) {
    return hljs.highlight(str, {
      language: lang,
    }).value;
  },
});
md.use(mila);

interface RawBlog {
  /** Markdown 正文 */
  content: string;
  /** 文件名（已去除 .md 后缀） */
  title: string;
  /** 发布日期，格式 YYYY-MM-DD（缺失日期的文件会在构建期报错） */
  date: string;
  /** 描述行（"@@ ..."），可选 */
  desc?: string;
  /** 标签数组（可能为空数组） */
  tags: string[];
}

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
 * 从 URL 查询参数中获取文章标题。
 * @returns 标题参数值；缺失时返回 null
 */
function getTitleParam(): string | null {
  return new URLSearchParams(window.location.search).get("title");
}

/**
 * 拉取构建生成的博客数据。
 * @returns 原始文章条目数组
 * @throws 网络、HTTP 或解析失败时抛出错误
 */
async function loadRawBlogs(): Promise<RawBlog[]> {
  const res = await fetch("./generated-blogs.json");
  if (!res.ok) {
    throw new Error(`加载博客数据失败: HTTP ${res.status}`);
  }
  const blogs: RawBlog[] = await res.json();
  return blogs;
}

/**
 * 在内容区域显示一条提示信息。
 * @param message - 提示文本
 */
function showMessage(message: string): void {
  const content = mustQuery<HTMLDivElement>("#post-content");
  const p = document.createElement("p");
  p.className = "post-content-message muted";
  p.textContent = message;
  content.replaceChildren(p);
}

/**
 * 渲染文章详情：标题、日期、标签与 Markdown 正文。
 * @param raw - 命中的原始文章条目
 */
function renderPost(raw: RawBlog): void {
  mustQuery<HTMLHeadingElement>("#post-title").textContent = raw.title;
  mustQuery<HTMLTimeElement>("#post-date").textContent = raw.date;
  document.title = `${raw.title} · dev.blog`;

  const tags = mustQuery<HTMLDivElement>("#post-tags");
  const spans = raw.tags.filter(Boolean).map((tag) => {
    const span = document.createElement("span");
    span.textContent = tag;
    return span;
  });
  tags.replaceChildren(...spans);

  const content = mustQuery<HTMLDivElement>("#post-content");
  // 默认同步解析，返回值必为 string
  const html = md.render(raw.content);
  content.innerHTML = html;
}

/**
 * 初始化页面：根据 ?title= 参数查找文章并渲染详情。
 */
async function init(): Promise<void> {
  setupTheme();
  const title = getTitleParam();
  if (!title) {
    showMessage("未指定文章，请从列表页进入");
    return;
  }

  showMessage("加载中…");
  try {
    const raws = await loadRawBlogs();
    const raw = raws.find((item) => item.title === title);
    if (!raw) {
      showMessage("未找到该文章");
      return;
    }
    renderPost(raw);
  } catch (err) {
    console.error(err);
    showMessage("文章加载失败，请稍后刷新重试");
  }
}

void init();
