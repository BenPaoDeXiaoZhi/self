import { readFileSync, readdirSync, writeFileSync } from "fs";
import { defineConfig } from "tsdown";

/**
 * tsdown 构建配置。
 *
 * 产物输出到 `dist/`，并通过 copy 选项将静态资源一并复制进去，
 * 使 `dist/` 成为完整的静态站点根目录，可直接由
 * VSCode Live Server（root=/dist）或 `wrangler dev` 提供服务。
 */
export default defineConfig({
  /** 入口：TS 源码编译为 dist/js/*.js */
  entry: {
    "js/main": "src/main.ts",
    "js/blog": "src/blog.ts",
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
 * @ 日期
 * @ 标签(可选)
 * @@ 描述(可选)
 */
const pattern =
  /^(?:\@ (\d{4}-\d{2}-\d{2})\r?\n)(?:\@ ([^\n]*)\r?\n)?(?:\@\@ ([^\n]*))?([\s\S]*)/;
function onSuccess() {
  const blogFiles = readdirSync("./blogs");
  const meta = blogFiles.map((n) => {
    const content = readFileSync(`./blogs/${n}`, { encoding: "utf-8" });
    const [_, date, tags, desc, blogContent] = pattern.exec(content) || [];
    if (!date) {
      throw new Error(`${n}未设置日期`);
    }
    return {
      title: n.split(".").slice(0, -1).join("."),
      date,
      desc,
      tags: (tags || "").split(" ").map((tag) => tag.trim()),
      content: blogContent,
    };
  });
  writeFileSync("./dist/generated-blogs.json", JSON.stringify(meta, null, 2));
  console.log("✔ 已构建blogs");
}
