import CryptoJS from "crypto-js";

/**
 * 等待图片加载完成。
 * @param img - 目标图片元素
 */
export function waitForImageLoad(img: HTMLImageElement): Promise<void> {
  if (img.complete && img.naturalWidth > 0) {
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    img.addEventListener("load", () => resolve(), { once: true });
    img.addEventListener("error", () => reject(new Error("图片加载失败")), {
      once: true,
    });
  });
}

/**
 * 清除图片后紧邻插入的还原图 canvas。
 * @param img - 目标图片元素
 */
export function clearCanvases(img: HTMLImageElement): void {
  let node = img.nextElementSibling;
  while (node instanceof HTMLCanvasElement) {
    const next = node.nextElementSibling;
    node.remove();
    node = next;
  }
}

/**
 * 计算切份数：md5(aid + page) 末位字符码，
 * 按 aid 区间取模后映射为偶数切份数。
 * @param aid - 漫画 id
 * @param page - 页标识（建议传图片 URL 文件名，如 00001，与官方 App 一致）
 * @returns 切份数（2~20 的偶数，无法映射时为 10）
 */
function getNum(aid: number | string, page: number | string): number {
  const aidNum = parseInt(String(aid), 10);
  const md5 = CryptoJS.MD5(`${aid}${page}`).toString();
  let key = String(md5.charCodeAt(md5.length - 1));

  if (aidNum >= 268850 && aidNum <= 421925) {
    key = String(Number(key) % 10);
  } else if (aidNum >= 421926) {
    key = String(Number(key) % 8);
  }

  // key 0~9 依序映射 2~20；未命中（旧漫 key 为原始字符码）保持 10
  const table = [2, 4, 6, 8, 10, 12, 14, 16, 18, 20];
  return table[Number(key)] ?? 10;
}

/**
 * 将切乱的图片按片段自底向上重排并绘制到 canvas。
 * 需要原图宽高已就绪，请先 waitForImageLoad。
 * @param img - 源图片元素（canvas 将插入其后）
 * @param num - 切份数
 * @returns 还原后的 canvas
 */
function restoreImage(img: HTMLImageElement, num: number): HTMLCanvasElement {
  // 防重复调用时叠 canvas
  clearCanvases(img);

  const canvas = document.createElement("canvas");
  // 插入前就定位，免得中途取消时留一张在普通流里撑开版面
  canvas.style.position = "absolute";
  canvas.style.top = "0";
  canvas.style.left = "0";
  img.after(canvas);

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("canvas 2d context 不可用");
  }

  const w = img.naturalWidth;
  const h = img.naturalHeight;

  // 缩到显示大小，避免 WebView canvas 内存超限变空白
  let sW = img.width;
  const parentW = img.parentElement?.offsetWidth ?? w;
  if (sW > parentW || sW === 0) {
    sW = parentW;
  }

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const targetW = Math.min(w, Math.round(sW * dpr));
  const scale = targetW / w;
  canvas.width = targetW;
  canvas.height = Math.round(h * scale);

  // 用 % 不用 px，避免 offsetWidth 量不准时卡住错误宽度
  canvas.style.width = "100%";
  canvas.style.display = "block";

  const remainder = h % num;
  const copyW = w;

  for (let i = 0; i < num; i++) {
    let copyH = Math.floor(h / num);
    let py = copyH * i;
    // 自底向上取片段：第 i 段对应原图底部第 i 个切片
    const y = h - copyH * (i + 1) - remainder;

    if (i === 0) {
      copyH += remainder;
    } else {
      py += remainder;
    }

    // 累积边界整数对齐，各自 round 高度会差 1px 露出白线
    const dy = Math.round(py * scale);
    const dyNext = Math.round((py + copyH) * scale);
    const dh = dyNext - dy + (i === num - 1 ? 0 : 1); // 多垫 1px 盖掉缩放边缘接缝

    ctx.drawImage(img, 0, y, copyW, copyH, 0, dy, canvas.width, dh);
  }

  return canvas;
}

/**
 * 还原被切的漫画图并绘制到其后的 canvas。
 * GIF 与旧漫画（aid < scrambleId）未切，返回 null 由调用方直接显示原图。
 * @param img - 源图片元素
 * @param aid - 漫画 id
 * @param scrambleId - 乱序还原阈值 id
 * @param page - 页标识（建议传图片 URL 文件名，如 00001）
 * @returns 还原 canvas；无需还原时返回 null
 */
export function scrambleImage(
  img: HTMLImageElement,
  aid: number | string,
  scrambleId: number | string,
  page: number | string,
): HTMLCanvasElement | null {
  // GIF 和旧漫没切不用还原
  if (
    img.src.includes(".gif") ||
    parseInt(String(aid), 10) < parseInt(String(scrambleId), 10)
  ) {
    return null;
  }
  return restoreImage(img, getNum(aid, page));
}
