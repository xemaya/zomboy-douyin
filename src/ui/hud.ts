// src/ui/hud.ts
import { getScreen } from './canvas';
import { colors, layout } from './theme';
import type { State } from '../game/types';

export function drawHud(state: State): void {
  const { ctx } = getScreen();

  // Top bar background
  ctx.fillStyle = colors.cream;
  ctx.fillRect(0, 0, layout.baseWidth, layout.boardTopOffset - 30);

  // Scores (left ⭐ survivorKills / right 👻 zombieKills)
  ctx.fillStyle = colors.gbDarkGreen;
  ctx.font = 'bold 48px "PingFang SC", "Microsoft YaHei", sans-serif';
  ctx.textBaseline = 'middle';

  ctx.textAlign = 'left';
  ctx.fillText(`⭐ × ${state.survivorKills}`, 30, 80);

  ctx.textAlign = 'right';
  ctx.fillText(`👻 × ${state.zombieKills}`, layout.baseWidth - 30, 80);

  // Current side + phase
  ctx.fillStyle = colors.pink;
  ctx.font = 'bold 32px "PingFang SC", "Microsoft YaHei", sans-serif';
  ctx.textAlign = 'center';
  const sideText = state.turnSide === 'survivor' ? '👤 你的回合' : '🧟 僵尸的回合';
  ctx.fillText(sideText, layout.baseWidth / 2, 150);

  // Sub hint (reserve / houses)
  ctx.fillStyle = colors.gbDarkGreen;
  ctx.font = '24px "PingFang SC", "Microsoft YaHei", sans-serif';
  ctx.fillText(
    `僵尸库存 ${state.zombieReserve}  房子 ${countActiveHouses(state)}`,
    layout.baseWidth / 2,
    185
  );
}

function countActiveHouses(state: State): number {
  let n = 0;
  for (const row of state.map.terrain) {
    for (const t of row) {
      if (t === 'house') n++;
    }
  }
  return n;
}
