import { getScreen } from './canvas';
import { colors, layout } from './theme';
import { drawModalBackdrop, drawModalCard, drawModalButton, type ModalButton } from './modalBase';
import type { State } from '../game/types';

export interface EndScreenButtons {
  rematch: ModalButton;
  share: ModalButton;
  revive?: ModalButton;
  back: ModalButton;
}

export function getEndScreenButtons(showRevive: boolean): EndScreenButtons {
  const W = layout.baseWidth;
  return {
    revive: showRevive ? {
      label: '看视频复活 ▶',
      rect: { x: 100, y: 770, w: W - 200, h: 90 },
      primary: true
    } : undefined as any,
    rematch: { label: '再来一局', rect: { x: 100, y: showRevive ? 880 : 770, w: (W - 240) / 2, h: 80 }, primary: !showRevive },
    share:   { label: '分享',     rect: { x: W / 2 + 20, y: showRevive ? 880 : 770, w: (W - 240) / 2, h: 80 } },
    back:    { label: '返回菜单', rect: { x: 100, y: showRevive ? 980 : 870, w: W - 200, h: 70 } }
  };
}

export function renderEndScreen(state: State, playerSide: 'survivor' | 'zombie', stats: { turns: number; durationSec: number }): void {
  if (!state.winner) return;

  drawModalBackdrop();
  const cardRect = { x: 75, y: 250, w: layout.baseWidth - 150, h: 460 };

  const win = state.winner === playerSide;
  const draw = state.winner === 'draw';

  let title: string;
  if (draw) title = '🤝 平局';
  else if (win) title = '🎉 你赢了！';
  else title = '😵 你输了';

  drawModalCard(cardRect, title);

  const { ctx } = getScreen();
  ctx.fillStyle = colors.gbDarkGreen;
  ctx.font = '26px "PingFang SC", "Microsoft YaHei", sans-serif';
  ctx.textAlign = 'center';

  ctx.fillText(`击退 ⭐ ${state.survivorKills}  |  拐走 👻 ${state.zombieKills}`, layout.baseWidth / 2, 380);
  ctx.fillText(`回合数：${stats.turns}   用时：${stats.durationSec} 秒`, layout.baseWidth / 2, 430);

  ctx.fillStyle = colors.pink;
  ctx.font = '20px "PingFang SC", "Microsoft YaHei", sans-serif';
  if (!win && !draw) {
    ctx.fillText('看一段广告还能续上！', layout.baseWidth / 2, 540);
  } else {
    ctx.fillText('分享到抖音让朋友也来玩一局？', layout.baseWidth / 2, 540);
  }

  const showRevive = !win && !draw;
  const btns = getEndScreenButtons(showRevive);
  if (btns.revive) drawModalButton(btns.revive);
  drawModalButton(btns.rematch);
  drawModalButton(btns.share);
  drawModalButton(btns.back);
}
