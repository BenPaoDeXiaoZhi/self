/**
 * 页面共用的数据类型定义。
 *
 * 构建期分 chunk：generated-blogs-meta.json（元数据）与
 * dist/blogs/<title>.json（正文）分离，避免列表页拉取全文。
 */

/** 首页列表与 flexsearch 索引使用的元数据（content 加载前可选为空字符串） */
export interface RawBlogMeta {
  /** 文件名（已去除 .md 后缀） */
  title: string;
  /** 发布日期，格式 YYYY-MM-DD（缺失日期的文件会在构建期报错） */
  date: string;
  /** 描述行（"@@ ..."），可选 */
  desc?: string;
  /** 标签数组（可能为空数组） */
  tags: string[];
  /** 正文：加载前可留空，加载后由 appendContentIndex 写入 */
  content?: string;
}

/** 单篇详情页使用的完整文章（由 dist/blogs/<title>.json 加载） */
export interface RawBlogChunk extends RawBlogMeta {
  /** Markdown 正文 */
  content: string;
}

/** 全文搜索按需加载的 content 索引（仅 title + content，供 flexsearch 追加索引） */
export interface BlogContentIndex {
  title: string;
  content: string;
}

/** 博客文章结构（首页列表展示用） */
export interface Post {
  /** 文章标题 */
  title: string;
  /** 发布日期，格式 YYYY-MM-DD */
  date: string;
  /** 摘要：优先取描述行，否则取正文 */
  excerpt: string;
  /** 标签列表（已去除空值） */
  tags: string[];
}
