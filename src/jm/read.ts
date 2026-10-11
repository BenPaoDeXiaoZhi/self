import { fetchRead } from "./api/read";
import { HOST_KEY, renderPagesInto, resolveHost } from "./comic";

/** 当前会话站点域名 */
let host = "";

/** 当前图源 id（URL 透传，服务端按图源返回对应图床地址） */
let shunt = "";

/**
 * 获取漫画内容容器。
 * @returns 容器元素，页面缺失时返回 null
 */
function getComic(): HTMLElement | null {
  return document.getElementById("comic");
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
    const read = await fetchRead(host, readId, shunt);
    comic.replaceChildren();
    renderPagesInto(comic, read.id, read);
    return;
  } catch (e) {
    console.error("加载章节失败:", e);
  }
  // 传入/保存的 host 失效时重新解析线路再试一次
  try {
    host = await resolveHost();
    const read = await fetchRead(host, readId, shunt);
    comic.replaceChildren();
    renderPagesInto(comic, read.id, read);
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
  shunt = params.get("shunt") ?? "";
  if (!host) {
    try {
      host = localStorage.getItem(HOST_KEY) ?? "";
    } catch {
      /* ignore — 读取失败走重新解析 */
    }
  }

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
