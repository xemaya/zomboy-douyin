// src/ui/input.ts
import { pixelToCell } from './boardRenderer';
import { getScreen } from './canvas';
import { layout } from './theme';

declare const tt: any;

export type CellTapHandler = (r: number, c: number) => void;

export function registerInput(onCellTap: CellTapHandler): void {
  const { width, height } = getScreen();
  // tt.onTouchStart gives us clientX/Y in CSS-pixel units (screenWidth domain),
  // so we scale them into the base design space before delegating to pixelToCell.
  const scaleX = layout.baseWidth / width;
  const scaleY = layout.baseHeight / height;

  tt.onTouchStart((evt: any) => {
    const t = evt.touches?.[0] ?? evt.changedTouches?.[0];
    if (!t) return;
    const px = t.clientX * scaleX;
    const py = t.clientY * scaleY;
    const cell = pixelToCell(px, py);
    if (cell) onCellTap(cell.r, cell.c);
  });
}
