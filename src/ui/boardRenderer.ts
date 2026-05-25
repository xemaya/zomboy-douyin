// src/ui/boardRenderer.ts
import { getScreen } from './canvas';
import { colors, layout } from './theme';
import { getSprite, SpriteKey } from './sprites';
import type { State, Terrain } from '../game/types';

export function cellToPixel(r: number, c: number): { x: number; y: number } {
  return {
    x: layout.boardMargin + c * layout.cellSize,
    y: layout.boardTopOffset + r * layout.cellSize
  };
}

export function pixelToCell(px: number, py: number): { r: number; c: number } | null {
  const localX = px - layout.boardMargin;
  const localY = py - layout.boardTopOffset;
  if (localX < 0 || localY < 0) return null;
  const c = Math.floor(localX / layout.cellSize);
  const r = Math.floor(localY / layout.cellSize);
  if (r < 0 || r >= layout.rows || c < 0 || c >= layout.cols) return null;
  return { r, c };
}

export type Highlight = { r: number; c: number; kind: 'move' | 'jump' };

export function drawBoard(state: State, highlight: Highlight[] = []): void {
  const { ctx } = getScreen();

  // 1) Background
  ctx.fillStyle = colors.bg;
  ctx.fillRect(0, 0, layout.baseWidth, layout.baseHeight);

  // 2) Tiles — terrain values: "empty" | "stone" | "house" | "start"
  //    草地是统一地面层：每格先垫草地，再把 stone/house/start 物体叠上去
  //    （这些物体 sprite 现在是透明背景，直接坐在草地上）。
  for (let r = 0; r < layout.rows; r++) {
    for (let c = 0; c < layout.cols; c++) {
      const { x, y } = cellToPixel(r, c);
      const tile = state.map.terrain[r][c];
      ctx.drawImage(getSprite('grass'), x, y, layout.cellSize, layout.cellSize);
      // 仅 stone/house 是叠在草地上的物体；start 是逻辑起始格，按普通草地渲染
      if (tile === 'stone' || tile === 'house') {
        ctx.drawImage(getSprite(tileToSprite(tile)), x, y, layout.cellSize, layout.cellSize);
      }

      // Grid line
      ctx.strokeStyle = colors.gridLine;
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 0.5, y + 0.5, layout.cellSize - 1, layout.cellSize - 1);
    }
  }

  // 3) Highlights (drawn above tiles, below pieces)
  for (const h of highlight) {
    const { x, y } = cellToPixel(h.r, h.c);
    ctx.fillStyle = h.kind === 'jump' ? colors.highlightJump : colors.highlightMove;
    ctx.fillRect(x, y, layout.cellSize, layout.cellSize);
  }

  // 4) Pieces — Piece has: id, side: Side, r, c
  for (const p of state.pieces) {
    const { x, y } = cellToPixel(p.r, p.c);
    const key: SpriteKey = p.side === 'survivor' ? 'survivor' : 'zombie';
    ctx.drawImage(getSprite(key), x, y, layout.cellSize, layout.cellSize);
  }
}

function tileToSprite(tile: Terrain): SpriteKey {
  switch (tile) {
    case 'stone': return 'stone';
    case 'house': return 'house';
    case 'start': return 'start';
    case 'empty':
    default:      return 'grass';
  }
}
