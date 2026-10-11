import CryptoJS from "crypto-js";

/** jm3_Server 单条线路：[域名, 线路名] */
type Jm3ServerEntry = [domain: string, label: string];

/** newsvr-2025.txt 解密后的响应结构 */
interface CdnEndpoints {
  /** 通用 CDN 域名列表 */
  Setting: string[];
  /** 服务端 CDN 域名列表 */
  Server: string[];
  /** 分线路域名及展示名 */
  jm3_Server: Jm3ServerEntry[];
}

const urls = [
  "https://rup4a04-c02.tos-cn-hongkong.bytepluses.com/newsvr-2025.txt",
  "https://rup4a04-c01.tos-ap-southeast-1.bytepluses.com/newsvr-2025.txt",
  "https://rup4a04-c03.tos-cn-beijing.bytepluses.com.cn/newsvr-2025.txt",
];

/**
 * 依次尝试各端点，返回首个解密成功的 CDN 端点配置。
 * @returns 解密后的端点配置
 * @throws 所有端点均失败时抛出错误
 */
export async function fetchEndpoints(): Promise<CdnEndpoints> {
  let id = 0;
  let res: CdnEndpoints | null = null;
  while (!res) {
    if (!urls[id]) {
      throw new Error("failed to get endpoints");
    }
    res = await fetchEndpoint(urls[id]).catch((e) => {
      console.error(e);
      id++;
      return null;
    });
  }
  return res;
}

/**
 * 请求单个端点并解密响应。
 * @param url - 端点地址
 * @returns 解密后的端点配置
 */
async function fetchEndpoint(url: string): Promise<CdnEndpoints> {
  const res = await fetch(url).then((res) => res.text());
  return decrypt(res);
}

const key = CryptoJS.enc.Utf8.parse("6ae6b037507edb82ee4699827c4b4066");
/**
 * AES-ECB 解密并解析 JSON。
 * @param res - 密文文本
 * @returns 解密后的端点配置
 */
function decrypt(res: string): CdnEndpoints {
  const decrypted = CryptoJS.AES.decrypt(res, key, {
    mode: CryptoJS.mode.ECB,
  });
  return JSON.parse(decrypted.toString(CryptoJS.enc.Utf8));
}
