/**
 * 页面共用的数据类型定义。
 */

/** generated-blogs.json 中的原始条目（构建脚本输出结构，头部行已在构建期剥离） */
export interface RawBlog {
  /** Markdown 正文 */
  content: string;
  /** 文件名（已去除 .md 后缀） */
  title: string;
  /** 发布日期，格式 YYYY-MM-DD（缺失日期的文件会在构建期报错） */
  date: string;
  /** 描述行（"@@ ..."），可选 */
  desc?: string;
  /** 标签数组（可能为空数组） */
  tags: string[];
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
