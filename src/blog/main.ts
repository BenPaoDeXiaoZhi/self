/**
 * 博客文章详情页入口（public/blog.html）。
 * 先从元数据确认 title 存在，再按 title 拉单独 chunk 渲染 Markdown。
 */
import hljs from "highlight.js/lib/core";
import javascript from "highlight.js/lib/languages/javascript";
import markdownIt from "markdown-it";
// @ts-ignore
import mila from "markdown-it-task-lists";
import { loadBlogChunk, loadBlogMeta } from "../shared/blogs";
import { mustQuery } from "../shared/dom";
import { setupTheme } from "../shared/theme";
import type { RawBlogChunk } from "../shared/types";

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
 * @param raw - 命中的单篇完整文章条目
 */
function renderPost(raw: RawBlogChunk): void {
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
 * 初始化页面：校验 title → 拉 chunk → 渲染详情。
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
    // 先查元数据确认文章存在，再拉正文 chunk
    const metas = await loadBlogMeta();
    if (!metas.some((m) => m.title === title)) {
      showMessage("未找到该文章");
      return;
    }
    const chunk = await loadBlogChunk(title);
    renderPost(chunk);
  } catch (err) {
    console.error(err);
    showMessage("文章加载失败，请稍后刷新重试");
  }
}

void init();
