import { createHash } from "crypto";
import {
  existsSync,
  glob,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "fs";
import { defineConfig } from "tsdown";

/**
 * tsdown 构建配置。
 *
 * 产物输出到 `dist/`，并通过 copy 选项将静态资源一并复制进去，
 * 使 `dist/` 成为完整的静态站点根目录，可直接由
 * VSCode Live Server（root=/dist）或 `wrangler dev` 提供服务。
 *
 * 博客数据分 chunk：
 *   dist/generated-blogs-meta.json   — 元数据列表（title/date/desc/tags，列表页用）
 *   dist/generated-blogs-content.json — title + content 对（全文搜索按需加载）
 *   dist/blogs/<encoded-title>.json   — 单篇完整正文（详情页用）
 */
export default defineConfig({
  /** 入口：一 html 一目录，TS 源码编译为 dist/js/*.js */
  entry: {
    "js/main": "src/index/main.ts",
    "js/blog": "src/blog/main.ts",
    "js/games/flappy-fuzi": "src/games/flappy-fuzi/main.ts",
  },
  watch: ["./blogs", "./public", "./src"],
  outDir: "dist",
  format: "es",
  /** 浏览器运行，不做 Node 相关 polyfill 处理 */
  platform: "browser",
  /** 构建前清空 dist（watch 模式下仅在首次执行） */
  clean: true,
  deps: {
    alwaysBundle: () => true,
    onlyBundle: false,
  },
  /**
   * 静态资源复制（不设 to，默认输出到 outDir；flatten:false 保留目录结构）：
   */
  copy: [{ from: "public/**", flatten: false }],
  onSuccess,
});

/**
 * 博客文件头部格式（正则执行前已通过 `readFileSync` 去掉 UTF-8 BOM 干扰）：
 *   @ 日期
 *   @ 标签(可选)
 *   @@ 描述(可选)
 */
const PATTERN =
  /^(?:\@ (\d{4}-\d{2}-\d{2})\r?\n)(?:\@ ([^\n]*)\r?\n)?(?:\@\@ ([^\n]*))?([\s\S]*)/;

/**
 * 将文章标题编码为安全的 chunk 文件名。
 * @param title - 文章标题（不含 .md 后缀）
 * @returns URL 安全的文件名（已含 .json 后缀）
 */
function chunkName(title: string): string {
  return `${title}.json`;
}

function onSuccess(): void {
  const blogFiles = readdirSync("./blogs");
  glob("./dist/**/*.html", (_, matches) => {
    const nav = readFileSync("./public/nav.html", { encoding: "utf-8" });
    matches.forEach((n) => {
      const content = readFileSync(n, { encoding: "utf-8" });
      writeFileSync(n, content.replaceAll("{nav}", nav));
    });
  });
  const parsed = blogFiles.map((n) => {
    const content = readFileSync(`./blogs/${n}`, { encoding: "utf-8" });
    const [, date, tags, desc, blogContent] = PATTERN.exec(content) || [];
    if (!date) {
      throw new Error(`${n}未设置日期`);
    }
    const title = n.split(".").slice(0, -1).join(".");
    return {
      title,
      date,
      desc,
      tags: (tags || "")
        .split(" ")
        .map((tag) => tag.trim())
        .filter(Boolean),
      content: blogContent,
    };
  });

  // 1. 元数据列表（首页列表 + flexsearch 默认索引）
  const meta = parsed.map(({ content: _c, ...rest }) => rest);
  writeFileSync("./dist/generated-blogs-meta.json", JSON.stringify(meta));

  // 2. title + content 对（全文搜索按需拉取），附带 contentHash 供客户端对比
  const contentIndex = parsed.map(({ title, content }) => ({ title, content }));
  const contentHash = createHash("sha1")
    .update(JSON.stringify(contentIndex))
    .digest("hex");
  writeFileSync(
    "./dist/generated-blogs-content.json",
    JSON.stringify(contentIndex),
  );
  writeFileSync(
    "./dist/generated-blogs-hash.json",
    JSON.stringify({ contentHash }),
  );

  // 3. 每篇独立 chunk（详情页拉取）
  const blogDir = "./dist/blogs";
  if (!existsSync(blogDir)) {
    mkdirSync(blogDir, { recursive: true });
  }
  parsed.forEach((blog) => {
    writeFileSync(
      `${blogDir}/${chunkName(blog.title)}`,
      JSON.stringify(blog, null, 2),
    );
  });

  console.log(`✔ 已构建blogs（${parsed.length} 篇，分 chunk 输出）`);
}
