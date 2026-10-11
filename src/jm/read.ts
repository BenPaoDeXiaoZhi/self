import { fetchRead, type ReadData } from "./api/read";
import { HOST_KEY, renderPagesInto, resolveHost } from "./comic";

/** 当前会话站点域名 */
let host = "";

/** 当前图源图床域名（URL 透传，渲染图片时替换原始域名） */
let shunt = "";

/**
 * 提取图床域名：兼容完整 URL 或裸域名。
 * @param value - URL 参数透传的图源地址
 * @returns 域名，无法解析时返回空串
 */
function parseShuntHost(value: string): string {
  if (!value) {
    return "";
  }
  try {
    return new URL(value.includes("://") ? value : `https://${value}`).hostname;
  } catch {
    return "";
  }
}

/**
 * 获取漫画内容容器。
 * @returns 容器元素，页面缺失时返回 null
 */
function getComic(): HTMLElement | null {
  return document.getElementById("comic");
}

/**
 * 更新返回选择页链接：透传当前配置，避免丢失线路与图源。
 * @param read - 章节数据（可选，带上章节 id 与所属漫画 id 便于恢复）
 */
function updateBackLink(read?: ReadData): void {
  const back = document.querySelector<HTMLAnchorElement>(".game-back");
  if (!back) {
    return;
  }
  const backParams = new URLSearchParams();
  if (host) {
    backParams.set("host", host);
  }
  if (shunt) {
    backParams.set("shunt", shunt);
  }
  if (read) {
    backParams.set("id", String(read.id));
    backParams.set("album", read.series_id || String(read.id));
  }
  const qs = backParams.toString();
  back.href = qs ? `./index.html?${qs}` : "./index.html";
}

/**
 * 拉取章节并渲染全部图片（本页只负责展示图片内容）。
 * @param readId - 章节 id
 */
async function loadChapter(readId: string): Promise<void> {
  const comic = getComic();
  if (!comic || !readId) {
    return;
  }
  try {
    const read = await fetchRead(host, readId);
    comic.replaceChildren();
    renderPagesInto(comic, read.id, read, shunt);
    updateBackLink(read);
    return;
  } catch (e) {
    console.error("加载章节失败:", e);
  }
  // 传入/保存的 host 失效时重新解析线路再试一次
  try {
    host = await resolveHost();
    const read = await fetchRead(host, readId);
    comic.replaceChildren();
    renderPagesInto(comic, read.id, read, shunt);
    updateBackLink(read);
  } catch (e) {
    console.error("回退线路仍失败:", e);
    comic.textContent = "加载失败，请返回选择页重试";
  }
}

/**
 * 页面主流程：优先用 URL 透传的 host，其次 localStorage，
 * 最后重新解析线路；按 URL 中的章节 id 加载图片。
 */
async function main(): Promise<void> {
  const params = new URLSearchParams(location.search);
  const id = params.get("id")?.trim();

  host = params.get("host") ?? "";
  shunt = parseShuntHost(params.get("shunt") ?? "");
  if (!host) {
    try {
      host = localStorage.getItem(HOST_KEY) ?? "";
    } catch {
      /* ignore — 读取失败走重新解析 */
    }
  }

  // 返回选择页时透传当前配置，避免丢失线路与图源
  updateBackLink();

  const comic = getComic();
  if (!id) {
    if (comic) {
      comic.textContent = "缺少章节 id，请从选择页进入";
    }
    return;
  }
  await loadChapter(id);
}

main();
