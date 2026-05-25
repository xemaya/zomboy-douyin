// src/ui/theme.ts
// 颜色继承自原 zomboy spec：暗背景 #2a2724, cream #f6f1e0, pink #c93f74,
// GB 绿 #0f380f-#9bbc0f

export const colors = {
  bg: '#2a2724',
  cream: '#f6f1e0',
  pink: '#c93f74',
  gbDarkGreen: '#0f380f',
  gbLightGreen: '#9bbc0f',
  highlightMove: 'rgba(155, 188, 15, 0.45)',  // 半透明绿（合法移动）
  highlightJump: 'rgba(201, 63, 116, 0.5)',   // 半透明粉（跳杀落点）
  gridLine: 'rgba(246, 241, 224, 0.15)'
};

// 棋盘几何（按竖屏 750×1334 设计基线，scaled at runtime）
export const layout = {
  cols: 8,
  rows: 8,
  baseWidth: 750,
  baseHeight: 1334,
  boardMargin: 30,
  boardTopOffset: 220,    // 顶部 HUD 区高度
  get cellSize() {
    return Math.floor((this.baseWidth - this.boardMargin * 2) / this.cols);
  },
  get boardSize() {
    return this.cellSize * this.cols;
  }
};
