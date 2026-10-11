/**
 * scramble 核心逻辑与官方 App 原版实现对拍测试。
 * 原版代码逐行移植为基准函数，暴力枚举比对：
 * 1. getNum 切份数 —— 覆盖三个 aid 区间（<268850 / 268850~421925 / >=421926）
 * 2. computeSlicePlan 切片参数 —— 覆盖整除 / 带余数 / 各缩放比
 *
 * 运行：npx tsx src/jm/scramble.test.ts
 */
import md5 from "md5";
import { computeSlicePlan, getNum } from "./scramble";

/* ---------- 基准：官方 App 原版实现（逐行移植） ---------- */

/** 原版 md5（hex 小写，与官方 App 同用 md5 包） */
const md5Orig = md5;

/**
 * 原版 get_num：入参为 btoa 后的 aid/page，内部先 atob。
 * @param aidB64 - btoa(aid)
 * @param pageB64 - btoa(page)
 * @returns 切份数
 */
function originalGetNum(aidB64: string, pageB64: string): number {
  const aid = atob(aidB64);
  const page = atob(pageB64);

  let num = 10;
  let key = aid + page;
  key = md5Orig(key);
  key = key.substr(-1);
  let code = key.charCodeAt(0);

  if (parseInt(aid) >= 268850 && parseInt(aid) <= 421925) {
    code = code % 10;
  } else if (parseInt(aid) >= 421926) {
    code = code % 8;
  }

  switch (code) {
    case 0:
      num = 2;
      break;
    case 1:
      num = 4;
      break;
    case 2:
      num = 6;
      break;
    case 3:
      num = 8;
      break;
    case 4:
      num = 10;
      break;
    case 5:
      num = 12;
      break;
    case 6:
      num = 14;
      break;
    case 7:
      num = 16;
      break;
    case 8:
      num = 18;
      break;
    case 9:
      num = 20;
      break;
  }
  return num;
}

/** 原版切片循环产出的一组 drawImage 参数 */
interface OrigDraw {
  sy: number;
  sh: number;
  dy: number;
  dh: number;
}

/**
 * 原版 onImageLoaded 切片循环（只提取 drawImage 的 src/dst y 与高度）。
 * @param w - 原图宽
 * @param h - 原图高
 * @param num - 切份数
 * @param scale - 缩放比
 * @returns drawImage 参数列表
 */
function originalSlices(
  w: number,
  h: number,
  num: number,
  scale: number,
): OrigDraw[] {
  const out: OrigDraw[] = [];
  const remainder = h % num;
  const copyW = w;

  for (let i = 0; i < num; i++) {
    let copyH = Math.floor(h / num);
    let py = copyH * i;
    const y = h - copyH * (i + 1) - remainder;

    if (i == 0) {
      copyH = copyH + remainder;
    } else {
      py = py + remainder;
    }

    const dy = Math.round(py * scale);
    const dyNext = Math.round((py + copyH) * scale);
    const dh = dyNext - dy + (i === num - 1 ? 0 : 1);

    out.push({ sy: y, sh: copyW, dy, dh });
    // sh 实际应为切片高；copyW 仅作宽度，与对拍无关，这里修正：
    out[out.length - 1].sh = copyH;
  }
  return out;
}

/* ---------- 测试 ---------- */

let passed = 0;
let failed = 0;

/** 断言相等，失败计数并打印差异 */
function assertEq(label: string, actual: unknown, expected: unknown): void {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) {
    passed++;
  } else {
    failed++;
    console.error(`FAIL ${label}: actual=${a} expected=${e}`);
  }
}

function testGetNum(): void {
  // 三个 aid 区间代表值 + 边界值
  const aids = [
    1,
    220979,
    220980, // < 268850（旧漫）
    268850,
    268851,
    300000,
    421925, // 268850~421925（%10）
    421926,
    421927,
    500000,
    1027519, // >= 421926（%8）
  ];
  // 页标识：服务器页码与 URL 文件名两种形态
  const pages = [
    "1",
    "2",
    "00001",
    "00002",
    "00010",
    "00050",
    "00100",
    "abc",
    "99999",
  ];

  for (const aid of aids) {
    for (const page of pages) {
      const mine = getNum(aid, page);
      const orig = originalGetNum(btoa(String(aid)), btoa(page));
      assertEq(`getNum(aid=${aid}, page=${page})`, mine, orig);
    }
  }
}

function testSlicePlan(): void {
  // 宽 / 高（含不能整除的组合）/ 切份数（原版只出现 2~20 偶数）/ 缩放比
  const widths = [590, 800, 1280];
  const heights = [50, 886, 1200, 1811, 4096];
  const nums = [2, 4, 6, 8, 10, 12, 14, 16, 18, 20];
  const scales = [0.375, 0.5, 1, 1.3559];

  for (const w of widths) {
    for (const h of heights) {
      for (const num of nums) {
        for (const scale of scales) {
          const mine = computeSlicePlan(h, num, scale);
          const orig = originalSlices(w, h, num, scale);
          const label = `plan(w=${w}, h=${h}, num=${num}, scale=${scale})`;
          assertEq(
            label,
            mine.map((p) => [p.sy, p.sh, p.dy, p.dh]),
            orig.map((p) => [p.sy, p.sh, p.dy, p.dh]),
          );
        }
      }
    }
  }
}

function testPlanCoverage(): void {
  // 附加校验：末片 dy+dh 必须精确到达画布底部（无透明缝）
  for (const num of [2, 6, 10, 16, 20]) {
    for (const h of [886, 1200, 1811]) {
      const scale = 0.5;
      const plan = computeSlicePlan(h, num, scale);
      const last = plan[plan.length - 1];
      assertEq(
        `coverage(num=${num}, h=${h}) 底部对齐`,
        last.dy + last.dh,
        Math.round(h * scale),
      );
      assertEq(`coverage(num=${num}, h=${h}) 首片顶部对齐`, plan[0].dy, 0);
    }
  }
}

testGetNum();
testSlicePlan();
testPlanCoverage();

console.log(`scramble 对拍测试: ${passed} 通过, ${failed} 失败`);
if (failed > 0) {
  process.exitCode = 1;
}
