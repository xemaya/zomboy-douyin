import { getScreen } from './canvas';
import { colors, layout } from './theme';
import type { State } from '../game/types';

const LOG_VISIBLE_LINES = 5;
const LOG_LINE_HEIGHT = 28;

export function drawLog(state: State): void {
  const { ctx } = getScreen();
  const top = layout.boardTopOffset + layout.boardSize + 30;
  const lines = state.log.slice(-LOG_VISIBLE_LINES);

  // Faint background panel
  ctx.fillStyle = 'rgba(246, 241, 224, 0.08)';
  ctx.fillRect(20, top, layout.baseWidth - 40, LOG_LINE_HEIGHT * LOG_VISIBLE_LINES + 16);

  ctx.fillStyle = colors.cream;
  ctx.font = '20px "PingFang SC", "Microsoft YaHei", sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  for (let i = 0; i < lines.length; i++) {
    const fade = i / Math.max(1, lines.length - 1);
    const alpha = 0.4 + 0.6 * fade;
    ctx.globalAlpha = alpha;
    ctx.fillText(lines[i], 30, top + 8 + i * LOG_LINE_HEIGHT);
  }
  ctx.globalAlpha = 1;
}
