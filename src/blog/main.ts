/**
 * 博客文章详情页入口（public/blog.html）。
 * 从构建产物 generated-blogs.json 中按标题查找文章，
 * 使用 markdown-it 将 Markdown 正文渲染为 HTML。
 */
import hljs from "highlight.js/lib/core";
import javascript from "highlight.js/lib/languages/javascript";
import markdownIt from "markdown-it";
// @ts-ignore
import mila from "markdown-it-task-lists";
import { loadRawBlogs } from "../shared/blogs";
import { mustQuery } from "../shared/dom";
import { setupTheme } from "../shared/theme";
import type { RawBlog } from "../shared/types";

hljs.registerLanguage("javascript", javascript);

const md = new markdownIt({
  highlight(str, lang) {
    if (lang && hljs.getLanguage(lang)) {
      return hljs.highlight(str, { language: lang }).value;
    }
    return "";
  },
});
md.use(mila);

/**
 * 从 URL 查询参数中获取文章标题。
 * @returns 标题参数值；缺失时返回 null
 */
function getTitleParam(): string | null {
  return new URLSearchParams(window.location.search).get("title");
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
  content.innerHTML = md.render(raw.content);
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
