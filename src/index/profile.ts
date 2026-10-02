/**
 * 首页简介区交互：头像 OC 切换与一言加载动画。
 */

/** 头像与 OC 形象的静态资源路径 */
const AVATAR_DEFAULT = "./assets/avatar.jpeg";
const AVATAR_OC = "./assets/tgyz-oc.png";

/**
 * 绑定头像点击切换：在默认头像与 OC 形象之间切换，选择记入 localStorage。
 * 页面缺少 #avatar 时静默跳过。
 */
export function setupAvatarToggle(): void {
  const img = document.querySelector<HTMLImageElement>("#avatar");
  if (!img) {
    return;
  }

  const apply = (oc: boolean) => {
    img.src = oc ? AVATAR_OC : AVATAR_DEFAULT;
    img.alt = oc ? "OC 形象" : "头像";
  };

  let oc = false;
  try {
    oc = localStorage.getItem("avatar-oc") === "1";
  } catch {
    // 隐私模式等场景下存储不可用，忽略
  }
  apply(oc);

  const toggle = () => {
    oc = !oc;
    apply(oc);
    try {
      localStorage.setItem("avatar-oc", oc ? "1" : "0");
    } catch {
      // 存储不可用时仅本次会话生效
    }
  };

  img.addEventListener("click", toggle);
  img.addEventListener("keydown", (ev) => {
    if (ev.key === "Enter" || ev.key === " ") {
      ev.preventDefault();
      toggle();
    }
  });
}

/**
 * 一言文本加载完成后触发从左到右的逐渐显示动画。
 * hitokoto 脚本通过 innerText 直接注入文本，无回调可用，
 * 这里用 MutationObserver 检测文本出现，再将其包入 span 并添加动画类。
 * 页面缺少 .hitokoto 时静默跳过。
 */
export function setupHitokoto(): void {
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
