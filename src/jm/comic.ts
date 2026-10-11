import { fetchEndpoints } from "./getCdn";
import { type AlbumData } from "./api/album";
import { type ReadData } from "./api/read";
import { scrambleImage, waitForImageLoad } from "./scramble";

declare global {
  interface Window {
    /** 指定使用的线路下标（调试入口，可选） */
    selectHostId?: number;
  }
}

/** localStorage 键：选中的线路下标 */
export const NODE_KEY = "jm-node";

/** localStorage 键：选中的图源 key */
export const SHUNT_KEY = "jm-shunt";

/** localStorage 键：最近确认的站点域名（阅读页兜底用） */
export const HOST_KEY = "jm-host";

/** 测速中 option 后缀 */
export const TESTING_SUFFIX = " · 测速中…";

/**
 * 从 localStorage 读取线路下标，缺失或越界时回退调试入口值。
 * @param max - 线路数量上限
 * @returns 合法线路下标
 */
export function loadNodeId(max: number): number {
  try {
    const saved = Number(localStorage.getItem(NODE_KEY));
    if (Number.isInteger(saved) && saved >= 0 && saved < max) {
      return saved;
    }
  } catch {
    /* ignore — 读取失败按未保存处理 */
  }
  return window.selectHostId || 0;
}

/**
 * 解析当前会话应使用的站点域名：
 * 拉取端点后按保存的线路下标取 host。
 * @returns 站点域名（全部端点失败时抛错）
 */
export async function resolveHost(): Promise<string> {
  const endpoints = await fetchEndpoints();
  const lines = endpoints.jm3_Server;
  return lines[loadNodeId(lines.length)]?.[0] ?? "";
}

/**
 * 渲染漫画详情（标题/作者/标签/简介）到容器末尾。
 * @param container - 目标容器
 * @param data - 漫画详情
 */
export function renderMetaInto(container: HTMLElement, data: AlbumData): void {
  const meta = document.createElement("div");
  meta.className = "jm-meta";

  const title = document.createElement("h3");
  title.textContent = data.name;
  meta.appendChild(title);

  if (data.author.length) {
    const authors = document.createElement("p");
    authors.className = "muted";
    authors.textContent = data.author.join(" / ");
    meta.appendChild(authors);
  }

  if (data.tags.length) {
    const tags = document.createElement("div");
    tags.className = "jm-tags";
    data.tags.forEach((t) => {
      const chip = document.createElement("span");
      chip.textContent = t;
      tags.appendChild(chip);
    });
    meta.appendChild(tags);
  }

  if (data.description) {
    const desc = document.createElement("p");
    desc.className = "jm-desc";
    desc.textContent = data.description;
    meta.appendChild(desc);
  }

  container.appendChild(meta);
}

/**
 * 渲染章节图片并逐页还原乱序切片，追加到容器末尾。
 * @param container - 目标容器
 * @param readId - 章节 id（还原 key 的一部分，官方传 /comic_read 响应的 id）
 * @param read - 章节数据
 */
export function renderPagesInto(
  container: HTMLElement,
  readId: number,
  read: ReadData,
): void {
  const pages = document.createElement("div");
  pages.className = "jm-pages";

  read.images.forEach(({ page, image }) => {
    const wrap = document.createElement("div");
    wrap.className = "comic-page";

    const img = document.createElement("img");
    img.src = image;
    img.loading = "lazy";
    img.draggable = false;
    // 图源有防盗链，本地/跨域 Referer 会被连接重置
    img.referrerPolicy = "no-referrer";
    img.style.opacity = "0";
    wrap.appendChild(img);
    pages.appendChild(wrap);

    // 加载失败兜底：不留空白页
    img.addEventListener("error", () => {
      img.remove();
      wrap.classList.add("comic-page-fail");
      wrap.textContent = `第 ${page} 页加载失败`;
    });

    void waitForImageLoad(img)
      .then(() => {
        // 与官方 App 一致：aid 用章节 id，page 用 URL 文件名
        const altKey = image.match(/\/([^/]+)\.webp/)?.[1] ?? String(page);
        const canvas = scrambleImage(img, readId, read.scramble_id, altKey);
        if (canvas) {
          canvas.style.opacity = "0";
          canvas.style.transition = "opacity 150ms ease";
          requestAnimationFrame(() => {
            canvas.style.opacity = "1";
          });
        } else {
          // 未切图（GIF/旧漫）直接显示原图
          img.style.opacity = "1";
        }
      })
      .catch(() => {
        img.style.opacity = "1";
      });
  });

  container.appendChild(pages);
}

/**
 * 获取章节按 sort 升序排列后的列表；无系列时整本即单章。
 * @param data - 漫画详情
 * @returns 章节列表
 */
export function sortedChapters(
  data: AlbumData,
): { id: string; name: string; sort: string }[] {
  const sorted = [...data.series].sort(
    (a, b) => Number(a.sort) - Number(b.sort),
  );
  return sorted.length
    ? sorted
    : [{ id: data.series_id || String(data.id), name: "全文", sort: "1" }];
}
