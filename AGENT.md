# AGENT.md

个人主页与博客静态站点。无框架，原生 TypeScript + CSS，构建产物为纯静态文件，由 Cloudflare Workers Assets 部署。

## 项目结构

```
blogs/            Markdown 博客源文件（构建期解析生成数据）
public/           静态资源，构建时整体复制到 dist/
  index.html      首页（简介 + 博客列表）
  blog.html       文章详情页
  css/style.css   全站样式
  assets/         图片资源
src/              TypeScript 源码（一 html 一目录）
  shared/         多页面共用模块
    dom.ts        mustQuery 等 DOM 工具
    types.ts      RawBlog / Post 类型定义
    blogs.ts      generated-blogs.json 加载
    theme.ts      深浅色主题切换
  index/          首页（index.html）模块
    main.ts       入口：组装 profile 与 posts
    posts.ts      博客列表渲染、标签过滤、搜索绑定
    search.ts     flexsearch 索引与关键词高亮
    profile.ts    头像 OC 切换、一言加载动画
  blog/           详情页（blog.html）模块
    main.ts       markdown-it 渲染文章详情
tsdown.config.ts  构建配置：入口编译 + 静态资源复制 + onSuccess 生成 generated-blogs.json
dist/             构建产物（勿手动编辑，勿提交关注点外的生成物）
wrangler.jsonc    Cloudflare 部署配置（assets 指向 dist/）
```

## 常用命令

| 命令 | 作用 |
| --- | --- |
| `npm run build` | 一次性构建到 `dist/`（含博客数据生成） |
| `npm run dev` | tsdown watch 模式 |
| `npm start` | `wrangler dev` 本地预览 `dist/`（默认 http://127.0.0.1:8787） |
| `npm run deploy` | 构建并部署到 Cloudflare |

改动后必须运行 `npm run build` 验证通过；涉及页面外观或交互的改动，再用 `wrangler dev` + 浏览器实测（无控制台报错、渲染正确）。

## 博客数据格式

`blogs/*.md` 首行起为固定头部，由 `tsdown.config.ts` 中的正则解析：

```
@ 2026-10-02
@ 标签1 标签2
@@ 一句话描述（可选）

正文 Markdown…
```

- 日期行必填（缺失构建报错），格式 `YYYY-MM-DD`
- 标签行可选，空格分隔
- `@@` 描述行可选，列表摘要优先使用描述，否则用正文
- 详情页仅注册了 JavaScript 高亮语言，代码块尽量用 ```js

## TypeScript 代码风格

- 每个函数、接口、导出成员写 JSDoc 注释，注释语言为中文；`@param` / `@returns` / `@throws` 齐全
- 界面逻辑拆为独立的 `setupXxx()` 函数，在 `init()` 中统一调用
- 页面元素获取：必需元素用 `mustQuery()`（缺失即抛错），可选元素用 `querySelector` 判空后静默跳过
- 用户偏好持久化统一用 `localStorage`，读写包 `try/catch`，键名小写连字符（如 `theme`、`avatar-oc`）
- 不引入构建工具链之外的依赖；新依赖需确认能打进浏览器 bundle

## CSS 风格（简约主题）

- 浅色主题为基准，深色模式仅在 `html[data-theme="dark"]` 覆盖 CSS 变量，不改结构
- 颜色一律引用 `:root` 变量（`--bg` `--card` `--text` `--muted` `--accent` `--accent-soft` `--chip` 等），不写死色值
- 统一小圆角 `--radius`（8px）；不用渐变色；避免明显的亮色单边框
- 交互过渡统一 `100ms ease`（动画类效果可稍长，如 300–600ms，并提供 `prefers-reduced-motion` 回退）
- 布局优先 flex，尽量少用绝对定位
- 新样式按区块添加中文注释分隔（如 `/* 一言 */`、`/* 博客 */`）

## 外部组件约定

- 一言（hitokoto）通过 JSONP `<script>` 注入 `.hitokoto` 元素文本，无回调；需要感知加载完成时用 `MutationObserver`（见 `setupHitokoto`）
- 头像与 OC 形象通过点击 `#avatar` 切换，状态持久化

## 提交规范

Conventional Commits（`feat:` / `fix:` / `style:` / `chore:` 等），描述用中文，聚焦"为什么"。
