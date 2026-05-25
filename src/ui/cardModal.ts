import { getScreen } from './canvas';
import { colors, layout } from './theme';
import { drawModalBackdrop, drawModalCard, drawModalButton, type ModalButton } from './modalBase';
import type { State } from '../game/types';

const CARD_INFO: Record<string, { name: string; emoji: string; desc: string; hint: string }> = {
  ghost: { name: '鬼魂', emoji: '👻', desc: '一阵风吹过！把任意 1 只僵尸彻底驱散。', hint: '点击棋盘上想驱散的僵尸。' },
  shoes: { name: '靴子', emoji: '👟', desc: '换上飞毛腿！让任意 1 个小人再多走 1 格。', hint: '点击棋盘上要继续走的小人，然后点目的地。' },
  coffee: { name: '咖啡', emoji: '☕', desc: '续命咖啡！让任意 1 个小人连走 2 格。', hint: '点击棋盘上要冲锋的小人，然后连点两步。' }
};

export function getCardModalButtons(): { confirm: ModalButton } {
  return {
    confirm: {
      label: '知道了',
      rect: { x: layout.baseWidth / 2 - 120, y: 850, w: 240, h: 80 },
      primary: true
    }
  };
}

export function renderCardModal(state: State): void {
  if (!state.pendingCard) return;
  const card = state.pendingCard;
  const info = CARD_INFO[card.kind] ?? { name: card.kind, emoji: '🎴', desc: '?', hint: '' };

  drawModalBackdrop();
  const cardRect = { x: 75, y: 400, w: layout.baseWidth - 150, h: 480 };
  drawModalCard(cardRect, `${info.emoji} ${info.name}`);

  const { ctx } = getScreen();
  ctx.fillStyle = colors.gbDarkGreen;
  ctx.font = 'bold 28px "PingFang SC", "Microsoft YaHei", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(info.desc, layout.baseWidth / 2, 520);
  ctx.font = '24px "PingFang SC", "Microsoft YaHei", sans-serif';
  ctx.fillStyle = colors.pink;
  ctx.fillText(info.hint, layout.baseWidth / 2, 600);

  drawModalButton(getCardModalButtons().confirm);
}
