import { tryDecryption } from "../httpUtils";
import { genHeaders } from "./genHeader";

/** 图源分流条目 */
interface AppShunt {
  /** 展示名 */
  title: string;
  /** 分流 key */
  key: number;
}

/** /setting 接口解密后的 data 结构 */
export interface JMSettings {
  /** 安卓正式版本号 */
  version: string;
  /** 安卓测试版本号 */
  test_version: string;
  /** 安卓商店链接 */
  store_link: string;
  /** iOS 正式版本号 */
  ios_version: string;
  /** iOS 测试版本号 */
  ios_test_version: string;
  /** iOS 商店链接 */
  ios_store_link: string;
  /** JM3 正式版本号 */
  jm3_version: string;
  /** JM3 测试版本号 */
  jm3_test_version: string;
  /** JM3 安卓商店链接 */
  jm3_store_link: string;
  /** JM3 iOS 正式版本号 */
  jm3_ios_version: string;
  /** JM3 iOS 测试版本号 */
  jm3_ios_test_version: string;
  /** JM3 iOS 商店链接 */
  jm3_ios_store_link: string;
  /** JM3 安卓 APK 下载地址 */
  jm3_download_url: string;
  /** 客户端 IP 所属国家码 */
  ipcountry: string;
  /** 新年活动开关 */
  newYearEvent: boolean;
  /** 广告缓存版本 */
  ad_cache_version: number;
  /** 安卓热更补丁包地址 */
  bundle_url: string;
  /** 安卓 APK 下载地址 */
  download_url: string;
  /** APP 落地页 */
  app_landing_page: string;
  /** 安卓更新说明 */
  version_info: string;
  /** JM3 是否热更 */
  jm3_is_hot_update: boolean;
  /** JM3 更新说明 */
  jm3_version_info: string;
  /** 安卓是否热更 */
  is_hot_update: boolean;
  /** 主站基址 */
  base_url: string;
  /** 赞助链接 */
  donate_url: string;
  /** 主站域名 */
  main_web_host: string;
  /** 图源基址 */
  img_host: string;
  /** 频道 banner 图地址模板（拼时间戳） */
  api_banner_path: string;
  /** logo 图地址 */
  logo_path: string;
  /** 浮动广告开关 */
  float_ad: boolean;
  /** 是否大陆线路（1 是 / 0 否） */
  is_cn: number;
  /** 大陆线路基址 */
  cn_base_url: string;
  /** 图源分流列表 */
  app_shunts: AppShunt[];
  /** 愚人节活动开关 */
  foolsDayEvent: boolean;
  /** iqq 下载页 */
  iqq_app_download_page: string;
}

/**
 * 拉取站点设置（/setting），AES 解密后返回。
 * @param host - 站点域名
 * @param shunt - 图源 id（可选，指定时下发对应图源的 img_host）
 * @returns 响应信封，data 为设置项
 */
export async function fetchSettings(
  host: string,
  shunt?: number,
): Promise<{ data: JMSettings }> {
  const url = `https://${host}/setting?lang=TW${
    shunt === undefined ? "" : `&shunt=${shunt}`
  }`;
  return (await tryDecryption(
    await fetch(url, {
      headers: genHeaders(),
    }),
    url,
  )) as { data: JMSettings };
}
