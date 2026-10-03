@ 2026-10-02
@ CCW 前端 逆向
@@ 用原型链 hook 在 Tampermonkey 用户脚本里拿到 Scratch 页面的 axios、scratch-vm 与 React 组件实例

## 为什么要拿这三个东西

在 ccw.site 的项目页写用户脚本时，经常需要：

- **axios**：页面自带的 HTTP 客户端，自带完整登录态。复用它调 Scratch API，不用自己处理鉴权。
- **scratch-vm**：项目运行时实例。拿到它就能读写角色、变量，执行绿旗，监听运行时事件。
- **React 组件实例**：GUI 组件树里的 `stateNode`。拿到它就能读写 `props` / `state`，介入 UI 内部逻辑, 也可用于获取ccw oss。

难点：这些实例全部藏在闭包和 webpack 模块作用域里，`window` 上直接找不到。

## 核心思路：原型链污染

- axios每次请求会通过apply调用axios.request, 通过修改Function.apply可获取axios实例
- sc runtime每一帧会调用Object.defineProperty, 通过Object.defineProperty获取
- react初始化时会设置props属性, 通过修改Object.prototype上的props setter获取

## 示例

以下代码均运行在 `@run-at document-start` + `unsafeWindow` 前提下。

### 截 axios：hook Function.prototype.apply

axios 实例方法由 `bind(Axios.prototype.request, context)` 生成，每次请求最终都会执行 `request.apply(实例, arguments)`，此时 `thisArg` 就是实例：

```js
const originApply = Function.prototype.apply;
Function.prototype.apply = function (thisArg, argsArray) {
  if (
    thisArg &&
    thisArg.interceptors &&
    thisArg.defaults &&
    typeof thisArg.request === "function"
  ) {
    unsafeWindow.__axios = thisArg;
    Function.prototype.apply = originApply; // 截到即摘除
  }
  return originApply.call(this, thisArg, argsArray);
};
```

### 截 VM：hook Object.defineProperty

runtime 每帧都会调用 defineProperty。先用调试版看清每帧落在哪些对象上，再按特征过滤：

```js
const originDefineProperty = Object.defineProperty;
const seen = new WeakSet();
Object.defineProperty = function (target, prop, desc) {
  if (target && !seen.has(target)) {
    seen.add(target);
    console.log("[probe] defineProperty:", prop, target); // 调试期打印，确认后删掉
  }
  if (target && typeof target.greenFlag === "function") {
    unsafeWindow.__vm = target.extensionManager.vm; // target 即 Runtime 实例
  }
  return originDefineProperty.call(this, target, prop, desc);
};
```

### 截 React 组件：在 Object.prototype 上装 props setter

class 组件构造函数里执行 `this.props = props`，此时实例上还没有自有的 `props` 属性，赋值会命中 `Object.prototype` 上的 setter，`this` 即组件实例：

```js
const originDefineProperty = Object.defineProperty;
originDefineProperty(Object.prototype, "props", {
  configurable: true,
  get() {
    return undefined;
  },
  set(value) {
    unsafeWindow.__comp = this; // this 即组件实例
    // 立即改为自有属性，恢复正常读写，避免后续赋值反复触发
    originDefineProperty(this, "props", {
      value,
      writable: true,
      enumerable: true,
      configurable: true,
    });
    // 只想截第一个组件时，可在此恢复现场：
    // delete Object.prototype.props;
  },
});
```

## 使用

```js
unsafeWindow.__axios.get("/api/xxx"); // 自带登录态
unsafeWindow.__vm.greenFlag();
console.log(unsafeWindow.__comp.props, unsafeWindow.__comp.state);
```

## 注意

- 三个 hook 都必须在页面脚本执行前装上，`@run-at document-start` 是硬要求。
- `apply` / `defineProperty` 是全局热点路径，hook 内只做廉价的特征判断；截到目标后尽快摘除，恢复原生函数。
- `props` setter 只对 class 组件（`this.props = ...` 赋值）有效，函数组件没有 `stateNode`，拿不到。
- 在 `Object.prototype` 上装 accessor 影响整页，务必保留 `configurable: true` 以便随时 `delete` 恢复。
