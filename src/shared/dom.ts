/**
 * DOM 查询工具。
 */

/**
 * 查询指定的单个元素。
 * @param selector - CSS 选择器
 * @returns 匹配的元素
 * @throws 页面结构缺失时抛出错误
 */
export function mustQuery<T extends Element>(selector: string): T {
  const el = document.querySelector<T>(selector);
  if (!el) {
    throw new Error(`Element not found: ${selector}`);
  }
  return el;
}
