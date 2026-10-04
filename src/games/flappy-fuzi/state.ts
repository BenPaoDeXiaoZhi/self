/** 全局游戏状态 */
export const state = {
  /** 管道移动速度 */
  speed: 2,
  /** 初始速度 */
  baseSpeed: 2,
  /** 速度上限 */
  maxSpeed: 8,
  /** 每得一分增加的速度 */
  speedPerScore: 0.3,
  /** 游戏暂停/未开始状态 */
  paused: true,
  /** 当前分数 */
  score: 0,
  /** 历史最高分（运行时内存值，持久化在 localStorage） */
  best: 0,
};
