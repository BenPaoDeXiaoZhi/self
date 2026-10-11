import { tryDecryption } from "../httpUtils";
import { genHeaders } from "./genHeader";

/** 系列章节条目 */
export interface AlbumSeries {
  /** 章节 id */
  id: string;
  /** 章节名（可能为空） */
  name: string;
  /** 排序序号（字符串） */
  sort: string;
}

/** 相关作品条目 */
export interface AlbumRelated {
  /** 漫画 id */
  id: string;
  /** 作者 */
  author: string;
  /** 标题 */
  name: string;
  /** 封面图（可能为空） */
  image: string;
}

/** /album 漫画详情 */
export interface AlbumData {
  /** 漫画 id */
  id: number;
  /** 标题 */
  name: string;
  /** 图片列表（响应中通常为空数组） */
  images: unknown[];
  /** 添加时间戳（秒，字符串） */
  addtime: string;
  /** 简介 */
  description: string;
  /** 总浏览量（字符串） */
  total_views: string;
  /** 总页数 */
  total_photos: number;
  /** 点赞数（字符串） */
  likes: string;
  /** 章节列表 */
  series: AlbumSeries[];
  /** 所属系列 id */
  series_id: string;
  /** 外部链接 */
  real_link: string;
  /** 评论总数（字符串） */
  comment_total: string;
  /** 作者列表 */
  author: string[];
  /** 标签列表 */
  tags: string[];
  /** 社团/出品方 */
  works: string[];
  /** 出场人物 */
  actors: string[];
  /** 相关作品列表 */
  related_list: AlbumRelated[];
  /** 当前用户是否已点赞 */
  liked: boolean;
  /** 当前用户是否已收藏 */
  is_favorite: boolean;
  /** 是否援助作品 */
  is_aids: boolean;
  /** 价格 */
  price: string;
  /** 购买状态 */
  purchased: string;
}

/**
 * 拉取漫画详情（/album），AES 解密后返回。
 * @param host - 站点域名
 * @param albumId - 漫画 id
 * @returns 响应信封，data 为漫画详情
 */
export async function fetchAlbum(
  host: string,
  albumId: number | string,
): Promise<{ code: number; data: AlbumData }> {
  const url = `https://${host}/album?id=${albumId}&lang=TW`;
  return (await tryDecryption(
    await fetch(url, {
      headers: genHeaders(),
    }),
    url,
  )) as { code: number; data: AlbumData };
}
