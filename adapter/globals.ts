// adapter/globals.ts
// 最小化全局占位：只 polyfill 抖音 runtime 缺失的、TS 强制要求的。
// 不模拟 DOM 树，不模拟 Element/Node — UI 完全用 Canvas 直绘。

declare const GameGlobal: any;

const g = typeof GameGlobal !== 'undefined' ? GameGlobal : globalThis;

// 1) window 最小占位（某些 NPM 库 import 时 sniff window 存在性）
if (typeof g.window === 'undefined') {
  g.window = g;
}

// 2) navigator（抖音原生有，但 type 上没有，给 stub 让 TS 编译过）
if (typeof g.navigator === 'undefined') {
  g.navigator = { userAgent: 'douyin-minigame', language: 'zh-CN' };
}

// 3) console（抖音原生有，无需 polyfill，仅 declare 让 TS 不抱怨）
declare global {
  var console: Console;
  var requestAnimationFrame: (cb: (t: number) => void) => number;
  var cancelAnimationFrame: (id: number) => void;
  var setTimeout: typeof globalThis.setTimeout;
  var clearTimeout: typeof globalThis.clearTimeout;
}

export {};
