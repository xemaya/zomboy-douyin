// src/ui/rulesModal.ts
import { getScreen } from './canvas';
import { colors, layout } from './theme';
import { drawModalBackdrop, drawModalButton, type ModalButton } from './modalBase';

const RULES_TEXT = [
  { h: '🎮 30 秒上手', items: [
    '两个人轮流坐一起玩：一边管 4 个蓝色小人（守人类），一边管 僵尸大军。',
    '谁先拿到 4 分谁赢。守人靠 打飞僵尸 加分，僵尸靠 拐走小人 加分。',
    '好玩在两边节奏完全不一样——人能斜着走、还会跳过去打飞；僵尸只能直走，但能无限增兵。'
  ]},
  { h: '🏃 人类怎么玩', items: [
    '每回合挑 1 个小人走 1 格，上下左右、斜着走都行。',
    '绝技 跳杀：只要有僵尸贴在你身边（8 个方向都算），而且它背后那格是空的，你就能像跳棋一样跳过去，把它一脚踹飞，⭐ +1！',
    '走到 房子 上会立刻停下，并抽一张神秘事件卡。'
  ]},
  { h: '🧟 僵尸怎么玩', items: [
    '每回合二选一：',
    '① 增兵：点任意空地，凭空冒出 1 只新僵尸（库存 -1，开局有 9 只可放）。',
    '② 进军：移动 2 步——可以让同 1 只僵尸走两次，也可以两只各走一次。',
    '僵尸只能上下左右走，不能斜走。9 只放完后就不能再增兵。'
  ]},
  { h: '⭐ 小心被拐走', items: [
    '每回合一结束就结算：如果某个小人上下左右紧贴 2 只或更多僵尸，他当场被拐走。',
    '小人没了，僵尸 +1 分；要是库存还有僵尸，原地立刻再冒一只补位。'
  ]},
  { h: '🎁 房子里有惊喜', items: [
    '开局洗 5 张事件卡：鬼魂 ×2、靴子 ×2、咖啡 ×1。',
    '鬼魂 👻：把任意 1 只僵尸彻底驱散。',
    '靴子 👟：立刻让任意 1 个小人再多走 1 格。',
    '咖啡 ☕：立刻让任意 1 个小人连走 2 格——往往能凑出一记跳杀！',
    '每个房子只能用一次，用过就变普通地板了。'
  ]}
];

let _scrollY = 0;

export function getRulesModalButtons(): { close: ModalButton } {
  return {
    close: { label: '关闭', rect: { x: layout.baseWidth - 110, y: 30, w: 80, h: 60 }, primary: true }
  };
}

export function renderRulesModal(): void {
  const { ctx } = getScreen();
  drawModalBackdrop();

  // Sheet background
  ctx.fillStyle = colors.cream;
  ctx.fillRect(0, 0, layout.baseWidth, layout.baseHeight);

  // Header
  ctx.fillStyle = colors.gbDarkGreen;
  ctx.fillRect(0, 0, layout.baseWidth, 110);
  ctx.fillStyle = colors.cream;
  ctx.font = 'bold 40px "PingFang SC", "Microsoft YaHei", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('🎮 ZOM-BOY+ 规则', 30, 65);

  // Close button
  const btns = getRulesModalButtons();
  drawModalButton(btns.close);

  // Body
  ctx.fillStyle = colors.gbDarkGreen;
  let y = 150 - _scrollY;
  for (const sec of RULES_TEXT) {
    ctx.font = 'bold 28px "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.fillText(sec.h, 30, y);
    y += 50;
    ctx.font = '22px "PingFang SC", "Microsoft YaHei", sans-serif';
    for (const item of sec.items) {
      const wrapped = wrapText(ctx, '• ' + item, layout.baseWidth - 60);
      for (const line of wrapped) {
        ctx.fillText(line, 30, y);
        y += 32;
      }
    }
    y += 20;
  }
}

export function scrollRulesModal(deltaY: number): void {
  _scrollY = Math.max(0, _scrollY + deltaY);
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const out: string[] = [];
  let current = '';
  for (const ch of text) {
    const test = current + ch;
    const m = ctx.measureText(test) as any;
    const w = m.width || (test.length * 12);
    if (w > maxWidth && current.length > 0) {
      out.push(current);
      current = ch;
    } else {
      current = test;
    }
  }
  if (current) out.push(current);
  return out;
}
