// src/ui/modalBase.ts
// 通用半透明 modal：背景遮罩 + 中央卡片 + 标题 + 内容区 + 按钮列。
// 不是组件框架，是一组可复用绘制工具，由调用者控制可见性 + 命中检测。

import { getScreen } from './canvas';
import { colors, layout } from './theme';

export interface ModalRect {
  x: number; y: number; w: number; h: number;
}

export interface ModalButton {
  label: string;
  rect: ModalRect;
  primary?: boolean;
}

export function drawModalBackdrop(): void {
  const { ctx } = getScreen();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
  ctx.fillRect(0, 0, layout.baseWidth, layout.baseHeight);
}

export function drawModalCard(rect: ModalRect, title: string): void {
  const { ctx } = getScreen();
  // Card
  ctx.fillStyle = colors.cream;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  // Title bar
  ctx.fillStyle = colors.gbDarkGreen;
  ctx.fillRect(rect.x, rect.y, rect.w, 60);
  ctx.fillStyle = colors.cream;
  ctx.font = 'bold 32px "PingFang SC", "Microsoft YaHei", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(title, rect.x + rect.w / 2, rect.y + 30);
}

export function drawModalButton(btn: ModalButton): void {
  const { ctx } = getScreen();
  const bg = btn.primary ? colors.pink : colors.gbDarkGreen;
  ctx.fillStyle = bg;
  ctx.fillRect(btn.rect.x, btn.rect.y, btn.rect.w, btn.rect.h);
  ctx.fillStyle = colors.cream;
  ctx.font = 'bold 28px "PingFang SC", "Microsoft YaHei", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(btn.label, btn.rect.x + btn.rect.w / 2, btn.rect.y + btn.rect.h / 2);
}

export function hitButton(buttons: ModalButton[], px: number, py: number): number {
  for (let i = 0; i < buttons.length; i++) {
    const r = buttons[i].rect;
    if (px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h) return i;
  }
  return -1;
}
