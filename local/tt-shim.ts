// local/tt-shim.ts — 浏览器版 tt.* 垫片（仅本地测试运行用，不进生产包）
// 把抖音小游戏 runtime 的 15 个 API 映射到 HTML5 Canvas / DOM / localStorage。
// 设计基线 750×1334，screenWidth/Height 直接取基线，使逻辑坐标与 base 1:1。

type TouchHandler = (evt: any) => void;

const SCREEN_W = 750;
const SCREEN_H = 1334;
const DPR = 2;

const touchStart: TouchHandler[] = [];
const touchMove: TouchHandler[] = [];
const touchEnd: TouchHandler[] = [];
const touchCancel: TouchHandler[] = [];
const showHandlers: Array<() => void> = [];
const hideHandlers: Array<() => void> = [];

let _onscreen: HTMLCanvasElement | null = null;

function toScreen(clientX: number, clientY: number, rect: DOMRect) {
  return {
    x: ((clientX - rect.left) / rect.width) * SCREEN_W,
    y: ((clientY - rect.top) / rect.height) * SCREEN_H
  };
}

function fire(handlers: TouchHandler[], x: number, y: number) {
  const evt = {
    touches: [{ clientX: x, clientY: y }],
    changedTouches: [{ clientX: x, clientY: y }]
  };
  for (const h of handlers) {
    try { h(evt); } catch (e) { console.error('[tt-shim] touch handler error', e); }
  }
}

function ensureOnscreen(): HTMLCanvasElement {
  if (_onscreen) return _onscreen;
  const c = document.createElement('canvas');
  c.id = 'game-canvas';
  c.width = SCREEN_W * DPR;
  c.height = SCREEN_H * DPR;
  c.style.width = '375px';   // 仅显示缩放，不影响逻辑坐标
  c.style.height = '667px';
  c.style.background = '#000';
  c.style.touchAction = 'none';
  (document.getElementById('app') || document.body).appendChild(c);

  const route = (clientX: number, clientY: number, set: TouchHandler[]) => {
    const { x, y } = toScreen(clientX, clientY, c.getBoundingClientRect());
    fire(set, x, y);
  };
  c.addEventListener('mousedown', e => route(e.clientX, e.clientY, touchStart));
  c.addEventListener('mousemove', e => { if (e.buttons) route(e.clientX, e.clientY, touchMove); });
  c.addEventListener('mouseup', e => route(e.clientX, e.clientY, touchEnd));
  c.addEventListener('touchstart', e => { const t = e.touches[0]; if (t) route(t.clientX, t.clientY, touchStart); }, { passive: true });
  c.addEventListener('touchmove', e => { const t = e.touches[0]; if (t) route(t.clientX, t.clientY, touchMove); }, { passive: true });
  c.addEventListener('touchend', () => fire(touchEnd, 0, 0), { passive: true });

  _onscreen = c;
  return c;
}

const tt = {
  getSystemInfoSync() {
    return {
      pixelRatio: DPR,
      screenWidth: SCREEN_W,
      screenHeight: SCREEN_H,
      windowWidth: SCREEN_W,
      windowHeight: SCREEN_H,
      platform: 'devtools',
      SDKVersion: 'local-shim'
    };
  },
  createCanvas() {
    // 抖音：首个 createCanvas 返回上屏 canvas；之后返回离屏 canvas
    if (!_onscreen) return ensureOnscreen();
    return document.createElement('canvas');
  },
  createImage() {
    return new Image();
  },
  onTouchStart(h: TouchHandler) { touchStart.push(h); },
  onTouchMove(h: TouchHandler) { touchMove.push(h); },
  onTouchEnd(h: TouchHandler) { touchEnd.push(h); },
  onTouchCancel(h: TouchHandler) { touchCancel.push(h); },
  onShow(h: () => void) { showHandlers.push(h); },
  onHide(h: () => void) { hideHandlers.push(h); },
  login(opts: any) {
    setTimeout(() => opts?.success?.({ code: 'local-mock-code', anonymousCode: 'local' }), 0);
  },
  shareAppMessage(opts: any) {
    console.log('[tt-shim] shareAppMessage:', opts?.title);
    setTimeout(() => opts?.success?.(), 0);
  },
  getStorageSync(key: string) {
    const v = localStorage.getItem('tt:' + key);
    return v === null ? '' : v;
  },
  setStorageSync(key: string, value: string) {
    localStorage.setItem('tt:' + key, value);
  },
  removeStorageSync(key: string) {
    localStorage.removeItem('tt:' + key);
  },
  createRewardedVideoAd() {
    const closeH: Array<(r: any) => void> = [];
    const errH: Array<(e: any) => void> = [];
    return {
      onClose(h: any) { closeH.push(h); },
      offClose(h: any) { const i = closeH.indexOf(h); if (i >= 0) closeH.splice(i, 1); },
      onError(h: any) { errH.push(h); },
      offError(h: any) { const i = errH.indexOf(h); if (i >= 0) errH.splice(i, 1); },
      load() { return Promise.resolve(); },
      show() {
        console.log('[tt-shim] rewarded ad shown → auto-complete (isEnded:true)');
        setTimeout(() => closeH.slice().forEach(h => h({ isEnded: true })), 120);
        return Promise.resolve();
      }
    };
  }
};

(globalThis as any).tt = tt;

// ── 测试驱动钩子 ──────────────────────────────────────────────
// 按 base 设计坐标（750×1334 空间）派发一次点击，供 Playwright 调用。
(globalThis as any).__tapBase = (bx: number, by: number) => fire(touchStart, bx, by);
// 触发 onHide / onShow（生命周期测试）
(globalThis as any).__hide = () => hideHandlers.slice().forEach(h => h());
(globalThis as any).__show = () => showHandlers.slice().forEach(h => h());
(globalThis as any).__shimReady = true;
console.log('[tt-shim] installed (screen %dx%d dpr %d)', SCREEN_W, SCREEN_H, DPR);
