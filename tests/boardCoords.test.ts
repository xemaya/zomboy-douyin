import { describe, it, expect } from 'vitest';
import { cellToPixel, pixelToCell } from '../src/ui/boardRenderer';
import { layout } from '../src/ui/theme';

describe('boardCoords', () => {
  it('cellToPixel returns top-left of cell (0,0)', () => {
    const { x, y } = cellToPixel(0, 0);
    expect(x).toBe(layout.boardMargin);
    expect(y).toBe(layout.boardTopOffset);
  });

  it('cellToPixel returns top-left of cell (7,7)', () => {
    const { x, y } = cellToPixel(7, 7);
    expect(x).toBe(layout.boardMargin + 7 * layout.cellSize);
    expect(y).toBe(layout.boardTopOffset + 7 * layout.cellSize);
  });

  it('pixelToCell maps center of cell (3,4) back to (3,4)', () => {
    const { x, y } = cellToPixel(3, 4);
    const px = x + layout.cellSize / 2;
    const py = y + layout.cellSize / 2;
    const cell = pixelToCell(px, py);
    expect(cell).toEqual({ r: 3, c: 4 });
  });

  it('pixelToCell returns null for clicks outside board', () => {
    expect(pixelToCell(5, 5)).toBeNull();
    expect(pixelToCell(layout.baseWidth + 10, 500)).toBeNull();
  });
});
