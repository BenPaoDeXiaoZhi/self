@ 2026-10-03
@ tsdown的iife多入口解决方案
@@ 通过多配置方法实现tsdown以iife格式构建多个文件

# 问题

tsdown配置为

```js
export default defineConfig({
  entry: {
    1: "1.ts",
    2: "2.ts",
  },
  format: "iife",
  /** 浏览器运行，不做 Node 相关 polyfill 处理 */
  platform: "browser",
});
```

时会报错

> iife打包模式是不支持多入口的

# 解决方案

将**多入口**转为**多配置**

```js
export default defineConfig([
  {
    entry: "1.ts",
    format: "iife",
    /** 浏览器运行，不做 Node 相关 polyfill 处理 */
    platform: "browser",
  },
  {
    entry: "2.ts",
    format: "iife",
    /** 浏览器运行，不做 Node 相关 polyfill 处理 */
    platform: "browser",
  },
]);
```

就可以完美运行了, 开发模式也能顺滑使用.
