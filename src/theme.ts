/**
 * 深色模式。主题状态挂在 <html data-theme> 上，
 * 由页面 <head> 内联脚本在首屏前初始化（跟随系统偏好），
 * 用户切换后持久化到 localStorage。
 */

/** localStorage 中保存主题的键名 */
const STORAGE_KEY = "theme";

/**
 * 当前是否为深色主题。
 * @returns 深色返回 true
 */
export function isDark(): boolean {
  return document.documentElement.dataset.theme === "dark";
}

/**
 * 应用主题：更新根元素属性、详情页高亮样式表与切换按钮状态。
 * @param dark - 是否深色
 */
function applyTheme(dark: boolean): void {
  document.documentElement.dataset.theme = dark ? "dark" : "light";

  // 详情页代码高亮样式表跟随主题（仅 blog.html 存在该链接）
  const darkCss = document.getElementById(
    "hljs-dark",
  ) as HTMLLinkElement | null;
  if (darkCss) {
    darkCss.disabled = !dark;
  }

  const btn = document.getElementById("theme-toggle");
  if (btn) {
    btn.textContent = dark ? "浅色模式" : "深色模式";
    btn.setAttribute("aria-pressed", String(dark));
  }
}

/**
 * 初始化主题切换按钮，并同步按钮与高亮样式表状态。
 * 页面缺少 #theme-toggle 时仅同步状态。
 */
export function setupTheme(): void {
  applyTheme(isDark());

  const btn = document.getElementById("theme-toggle");
  if (!btn) {
    return;
  }
  btn.addEventListener("click", () => {
    const dark = !isDark();
    applyTheme(dark);
    try {
      localStorage.setItem(STORAGE_KEY, dark ? "dark" : "light");
    } catch {
      // 隐私模式等场景下存储不可用，忽略
    }
  });
}
