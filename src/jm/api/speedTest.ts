/** 单条测速结果 */
export interface SpeedResult {
  /** 图源域名（含协议） */
  host: string;
  /** 展示名 */
  label: string;
  /** 加载耗时 ms，-1 表示失败或超时 */
  ms: number;
}

/** 测速超时（ms） */
const TIMEOUT = 8000;

/**
 * 对单个图源域名测速：加载 nopic 占位图并计时。
 * @param host - 图源域名（不含协议）
 * @returns 加载耗时（ms）
 * @throws 请求失败或超时
 */
export async function speedTest(host: string): Promise<number> {
  const url = `${host}/media/users/nopic-.gif?v=0`;
  const start = performance.now();
  await fetch(url, {
    mode: "no-cors",
    cache: "no-store",
    signal: AbortSignal.timeout(TIMEOUT),
  });
  return Math.round(performance.now() - start);
}
