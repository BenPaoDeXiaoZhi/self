import { fetchEndpoints } from "./getCdn";
import { fetchSettings } from "./api/setting";
import { speedTest, type SpeedResult } from "./api/speedTest";
import { fetchAlbum, type AlbumData } from "./api/album";
import {
  NODE_KEY,
  SHUNT_KEY,
  HOST_KEY,
  TESTING_SUFFIX,
  loadNodeId,
  renderMetaInto,
  sortedChapters,
} from "./comic";

/** 当前会话线路列表（供漫画加载取 host） */
let lineList: [string, string][] = [];

/** 当前会话使用的站点域名（确认线路时更新） */
let currentHost = "";

/** 漫画加载互斥标志 */
let comicLoading = false;

/**
 * 获取线路选择框。
 * @returns 选择框元素，页面缺失时返回 null
 */
function getSelect(): HTMLSelectElement | null {
  return document.getElementById("node-select") as HTMLSelectElement | null;
}

/**
 * 获取图源选择框。
 * @returns 选择框元素，页面缺失时返回 null
 */
function getShuntSelect(): HTMLSelectElement | null {
  return document.getElementById("shunt-select") as HTMLSelectElement | null;
}

/**
 * 获取漫画内容容器。
 * @returns 容器元素，页面缺失时返回 null
 */
function getComic(): HTMLElement | null {
  return document.getElementById("comic");
}

/**
 * 绑定线路选择框：一次性填充全部线路选项，
 * 切换时仅更新选中项，确认后才持久化。
 * @param lines - jm3_Server 线路列表
 * @param current - 当前选中的线路下标
 */
function setupNodeSelect(lines: [string, string][], current: number): void {
  const select = getSelect();
  if (!select) {
    return;
  }
  lines.forEach(([host, label], i) => {
    const opt = document.createElement("option");
    opt.value = String(i);
    opt.textContent = `${label}（${host}）`;
    select.appendChild(opt);
  });
  select.value = String(current);
}

/**
 * 填充图源选择框并全部置为测速中，恢复上次保存的选择。
 * @param shunts - 图源列表
 */
function setupShuntSelect(shunts: { title: string; key?: number }[]): void {
  const select = getShuntSelect();
  if (!select) {
    return;
  }
  select.replaceChildren();
  shunts.forEach(({ title, key }) => {
    const opt = document.createElement("option");
    opt.value = String(key ?? "");
    opt.textContent = `${title}${TESTING_SUFFIX}`;
    select.appendChild(opt);
  });
  try {
    const saved = localStorage.getItem(SHUNT_KEY);
    if (saved && shunts.some((s) => String(s.key ?? "") === saved)) {
      select.value = saved;
    }
  } catch {
    /* ignore — 恢复失败保持默认 */
  }
}

/**
 * 将图源测速结果写回对应 option 标签。
 * @param results - 测速结果（与图源顺序一一对应）
 */
function updateShuntLabels(results: SpeedResult[]): void {
  const select = getShuntSelect();
  if (!select) {
    return;
  }
  results.forEach((r, i) => {
    const opt = select.options[i];
    if (!opt) {
      return;
    }
    opt.textContent =
      r.ms >= 0 ? `${r.label}（${r.host}）· ${r.ms} ms` : `${r.label} · 超时`;
  });
}

/**
 * 确认线路：持久化下标，拉取该线路图源列表，
 * 再逐个图源（带 shunt id 请求 setting）取 img_host 测速。
 * @param lines - jm3_Server 线路列表
 */
async function confirmLine(lines: [string, string][]): Promise<void> {
  const select = getSelect();
  if (!select || !select.value) {
    return;
  }
  const id = Number(select.value);
  try {
    localStorage.setItem(NODE_KEY, select.value);
  } catch {
    /* ignore — 持久化失败不影响本次会话 */
  }
  const [host] = lines[id] ?? [];
  if (!host) {
    return;
  }
  currentHost = host;

  let shunts: { title: string; key?: number }[] = [];
  try {
    const { data } = await fetchSettings(host);
    shunts = data.app_shunts.map(({ title, key }) => ({ title, key }));
  } catch {
    /* 拉取失败按无图源配置处理 */
  }
  if (!shunts.length) {
    shunts = [{ title: "默认图源", key: undefined }];
  }
  setupShuntSelect(shunts);

  const results = await Promise.all(
    shunts.map(async ({ title, key }): Promise<SpeedResult> => {
      try {
        const { data } = await fetchSettings(host, key);
        try {
          return {
            label: title,
            host: data.img_host,
            ms: await speedTest(data.img_host),
          };
        } catch {
          return { label: title, host: data.img_host, ms: -1 };
        }
      } catch {
        return { label: title, host: "", ms: -1 };
      }
    }),
  );
  updateShuntLabels(results);
}

/**
 * 跳转阅读页：透传章节 id 与当前 host，避免阅读页重新解析线路失效。
 * @param readId - 章节 id
 */
function gotoRead(readId: string): void {
  const params = new URLSearchParams({ id: readId, host: currentHost });
  const shunt = getShuntSelect()?.value;
  if (shunt) {
    params.set("shunt", shunt);
  }
  location.href = `./read.html?${params}`;
}

/**
 * 渲染漫画详情、章节按钮列表与开始阅读按钮。
 * @param data - 漫画详情
 */
function renderAlbum(data: AlbumData): void {
  const comic = getComic();
  if (!comic) {
    return;
  }
  comic.replaceChildren();
  renderMetaInto(comic, data);

  const chapters = document.createElement("div");
  chapters.className = "jm-chapters";
  sortedChapters(data).forEach((s, i) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = s.name || `第${i + 1}话`;
    btn.addEventListener("click", () => gotoRead(s.id));
    chapters.appendChild(btn);
  });
  comic.appendChild(chapters);

  const actions = document.createElement("div");
  actions.className = "jm-controls";
  const start = document.createElement("button");
  start.type = "button";
  start.textContent = "开始阅读";
  start.addEventListener("click", () => {
    gotoRead(sortedChapters(data)[0]?.id || String(data.id));
  });
  actions.appendChild(start);
  comic.appendChild(actions);
}

/**
 * 加载漫画详情：按输入框中的漫画 id 拉取并渲染。
 */
async function loadAlbum(): Promise<void> {
  const input = document.getElementById(
    "album-input",
  ) as HTMLInputElement | null;
  const id = input?.value.trim();
  if (!id || !currentHost || comicLoading) {
    return;
  }
  comicLoading = true;
  try {
    const { data } = await fetchAlbum(currentHost, id);
    renderAlbum(data);
  } catch (e) {
    console.error("加载漫画失败:", e);
  } finally {
    comicLoading = false;
  }
}

/**
 * 页面主流程：绑定控件，线路确认后触发图源测速，
 * 漫画输入框加载详情，章节按钮加载阅读内容。
 */
async function main(): Promise<void> {
  const endpoints = await fetchEndpoints();
  lineList = endpoints.jm3_Server;

  const nodeId = loadNodeId(lineList.length);
  setupNodeSelect(lineList, nodeId);
  // 未确认线路时也按保存的线路取 host，保证漫画加载可用
  currentHost = lineList[nodeId]?.[0] ?? "";
  try {
    localStorage.setItem(HOST_KEY, currentHost);
  } catch {
    /* ignore — 持久化失败不影响本次会话 */
  }

  document.getElementById("confirm-btn")?.addEventListener("click", () => {
    void confirmLine(lineList);
  });

  document.getElementById("shunt-select")?.addEventListener("change", (e) => {
    try {
      localStorage.setItem(SHUNT_KEY, (e.target as HTMLSelectElement).value);
    } catch {
      /* ignore — 持久化失败不影响本次会话 */
    }
  });

  document.getElementById("load-btn")?.addEventListener("click", () => {
    void loadAlbum();
  });
  document.getElementById("album-input")?.addEventListener("keydown", (e) => {
    if ((e as KeyboardEvent).key === "Enter") {
      void loadAlbum();
    }
  });
}

main();
