// src/ui/input.ts
import { pixelToCell } from './boardRenderer';
import { getScreen } from './canvas';

declare const tt: any;

export type CellTapHandler = (r: number, c: number) => void;

export function registerInput(onCellTap: CellTapHandler): void {
  const { width, height } = getScreen();
  // The base design coordinate space is 750x1334; tt.onTouchStart gives us
  // clientX/Y in CSS-pixel units (screenWidth domain), so we scale them into
  // the base design space before delegating to pixelToCell.
  const scaleX = 750 / width;
  const scaleY = 1334 / height;

  tt.onTouchStart((evt: any) => {
    const t = evt.touches?.[0] ?? evt.changedTouches?.[0];
    if (!t) return;
    const px = t.clientX * scaleX;
    const py = t.clientY * scaleY;
    const cell = pixelToCell(px, py);
    if (cell) onCellTap(cell.r, cell.c);
  });
}
