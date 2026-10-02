/**
 * 首页入口（public/index.html）。
 * 组装简介区交互与博客列表渲染。
 */
import { setupTheme } from "../shared/theme";
import { setupAvatarToggle, setupHitokoto } from "./profile";
import { setupPosts } from "./posts";

/**
 * 初始化页面。
 */
async function init(): Promise<void> {
  setupTheme();
  setupHitokoto();
  setupAvatarToggle();

  try {
    await setupPosts();
  } catch (err) {
    console.error(err);
    const list = document.querySelector<HTMLElement>("#post-list");
    if (list) {
      const item = document.createElement("li");
      item.className = "post-list-empty";
      item.textContent = "文章加载失败，请稍后刷新重试";
      list.replaceChildren(item);
    }
  }
}

void init();
