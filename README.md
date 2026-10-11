# self · 孟夫子的博客

一个部署在 Cloudflare Workers（纯静态资源托管）上的个人站点，包含博客、小游戏和 JM 漫画阅读器三个板块。

## 功能

- **博客**：Markdown 文章渲染（markdown-it + highlight.js），构建时从 `blogs/` 目录生成元数据与全文 JSON，支持列表展示与 FlexSearch 全文搜索。
- **小游戏**：基于 PixiJS 的 Flappy 孟夫子（`/games/flappy-fuzi.html`）。
- **JM 漫画阅读器**（`/jm/index.html`）：
  - 线路选择：拉取端点列表，支持测速与 localStorage 持久化；
  - 图源（分流）选择：radio 单选列表，逐个测速即时展示结果；
  - 章节阅读：`/comic_read` 数据 AES 解密、乱序切片还原渲染；
  - 配置分享：线路、图源、漫画 id、章节 id 全部透传在 URL 中（`history.replaceState` 不刷新页面），复制地址栏即可分享当前状态；阅读页返回选择页时也会透传配置。

## 目录结构

```
blogs/                 博客 Markdown 原文
public/                静态资源（html/css/图片/游戏页面）
src/
  index/               主页（列表 + 搜索）
  blog/                博客页（渲染 + 搜索）
  games/flappy-fuzi/   小游戏
  jm/                  漫画阅读器
    index.ts           选择页（线路/图源/漫画详情）
    read.ts            阅读页（章节图片渲染）
    api/               接口封装（album/read/setting 等，AES 解密）
    comic.ts           公共工具（渲染、host 解析、localStorage 键）
    scramble.ts        图片乱序还原
  shared/              跨板块共享工具
tsdown.config.ts       构建配置（一 html 一目录，产物输出 dist/）
wrangler.jsonc         Cloudflare Workers 配置
```

## 开发

```bash
npm install

# 开发模式（watch 构建，产物在 dist/，可用 VSCode Live Server 或下一步命令预览）
npm run dev

# 本地预览（wrangler dev 服务 dist/）
npm run start
```

## 构建与部署

```bash
# 构建到 dist/（tsdown 打包 + 静态资源复制 + 博客 JSON 生成）
npm run build

# 构建并部署到 Cloudflare Workers
npm run deploy
```
