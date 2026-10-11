import { tryDecryption } from "../httpUtils";
import { genHeaders } from "./genHeader";

/** 漫画图片条目 */
export interface ReadImage {
  /** 页码 */
  page: number;
  /** 图片地址 */
  image: string;
}

/** /comic_read 章节内容（顶层直接返回，无 code/data 信封） */
export interface ReadData {
  /** 章节 id */
  id: number;
  /** 乱序还原 id */
  scramble_id: string;
  /** 标题 */
  name: string;
  /** 总页数 */
  total_page: number;
  /** 各页图片 */
  images: ReadImage[];
  /** 添加时间戳（秒，字符串） */
  addtime: string;
  /** 添加时间（格式化字符串） */
  adddt: string;
  /** 所属系列 id */
  series_id: string;
  /** 外部链接 */
  real_link: string;
  /** 当前用户是否已收藏 */
  is_favorite: boolean;
  /** 当前用户是否已点赞 */
  liked: boolean;
}

/**
 * 拉取章节阅读数据（/comic_read），AES 解密后返回。
 * @param host - 站点域名
 * @param readId - 章节 id
 * @returns 章节内容（顶层结构，无信封）
 */
export async function fetchRead(
  host: string,
  readId: number | string,
): Promise<ReadData> {
  const url = `https://${host}/comic_read?id=${readId}&lang=TW`;
  return (
    await tryDecryption(
      await fetch(url, {
        headers: genHeaders(),
      }),
      url,
    )
  ).data as ReadData;
}
