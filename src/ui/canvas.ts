// src/ui/canvas.ts
declare const tt: any;

export interface ScreenCanvas {
  canvas: any;             // tt canvas object
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  dpr: number;
}

let _screen: ScreenCanvas | null = null;

export function getScreen(): ScreenCanvas {
  if (_screen) return _screen;

  const info = tt.getSystemInfoSync();
  // 抖音首个 createCanvas() 返回上屏 canvas
  const canvas = tt.createCanvas();
  const dpr = info.pixelRatio || 1;
  canvas.width = info.screenWidth * dpr;
  canvas.height = info.screenHeight * dpr;

  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
  ctx.scale(dpr, dpr);
  ctx.imageSmoothingEnabled = false;  // 像素风必须关掉抗锯齿

  _screen = {
    canvas,
    ctx,
    width: info.screenWidth,
    height: info.screenHeight,
    dpr
  };
  return _screen;
}

export function clearScreen(color: string): void {
  const { ctx, width, height } = getScreen();
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, width, height);
}
