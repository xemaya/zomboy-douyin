# ZOM-BOY+ 抖音版 Stage 1A 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 zomboy（Vite + TS + DOM/CSS Grid 项目）改造成能在抖音小游戏 IDE 里跑完一局完整对战的最小可玩版本。

**Architecture:** 新建 `zomboy-douyin/` 独立项目，**抛弃 DOM/CSS Grid**，规则代码（`src/game/`）从原 zomboy 完整搬过来不动，UI 层全部用抖音原生 `tt.createCanvas()` 重画。环境 polyfill 只做最小垫片（占位 `window/document` 让 TS 编译通过 + 接 tt.* 存储与触摸），不做"假 DOM 模拟整棵树"那种重路线。

**Tech Stack:**
- 抖音小游戏 runtime（V8 + tt.* API，无 DOM/BOM）
- 抖音小游戏 IDE（开发者工具，用于调试 + 提审）
- TypeScript（编译到 ES2017 JS）
- esbuild（打包 src/*.ts → 单一 `dist/game.js`）
- 直接 Canvas 2D 渲染（无引擎、无框架）
- Vitest（保留单元测试，**仅测纯规则模块**）

**美术资源策略:** 由用户用 GPT 生成。每个需要的 sprite 在 plan 里附完整 prompt + 命名 + 摆放位置，用户生成后丢进 `assets/sprites/`。

**预计单元工作量:** 16 个 task，~3-4 个开发会话。

---

## 关键源代码引用

以下 zomboy 现有文件**完整搬运不动**（已在原项目验证过的纯逻辑）：

- `src/game/types.ts` — State / Piece / PendingCard 类型
- `src/game/mapgen.ts` — 地图生成（BFS 校验 + stoneRatio 重试）
- `src/game/rules.ts` — `legalMoves / legalJumps / runInfection / checkWinner / zombieMayOccupy`
- `src/game/state.ts` — 状态机（`clickCell` 单入口）
- `src/game/ai.ts` — 规则型 AI（`planTurn / planCardResolution`）

**只重写的部分**：`src/ui/*` 全部（DOM/CSS Grid → Canvas 2D）+ `main.ts`（启动入口）。

---

## File Structure

```
zomboy-douyin/
├── game.js                       # 抖音入口（CommonJS bootstrap，加载 dist/game.js）
├── game.json                     # 抖音小游戏运行时配置
├── project.config.json           # 抖音 IDE 项目配置
├── package.json
├── tsconfig.json
├── esbuild.config.mjs            # 打包 src/*.ts → dist/game.js
├── .gitignore
├── assets/
│   └── sprites/                  # 用户用 GPT 生成的 PNG，文件名见 Task 4 / 5
│       ├── survivor_blue.png
│       ├── zombie_q.png
│       ├── grass_tile.png
│       ├── stone_tile.png
│       ├── house_tile.png
│       ├── house_empty.png
│       └── start_tile.png
├── adapter/
│   ├── index.ts                  # polyfill 入口（在 game.js 第一行 require）
│   ├── globals.ts                # window/document/navigator 最小占位
│   ├── storage.ts                # localStorage → tt.setStorageSync
│   └── touch.ts                  # 触摸 → 棋盘坐标转换工具
├── src/
│   ├── game/                     # 从原 zomboy 完整搬运
│   │   ├── types.ts
│   │   ├── mapgen.ts
│   │   ├── rules.ts
│   │   ├── state.ts
│   │   └── ai.ts
│   ├── ui/                       # 全部新写（Canvas 2D）
│   │   ├── canvas.ts             # tt.createCanvas() 拿到上屏 canvas，提供 ctx
│   │   ├── theme.ts              # 颜色 / 字号 / 尺寸常量
│   │   ├── boardRenderer.ts      # 画棋盘 + 棋子 + 高亮
│   │   ├── hud.ts                # 顶部得分条 / 阶段提示
│   │   ├── sprites.ts            # 加载 + 缓存 PNG
│   │   └── input.ts              # tt.onTouchStart → 调用 clickCell
│   └── main.ts                   # 启动：初始化 state → 装载 sprites → 注册输入 → renderLoop
├── docs/
│   └── superpowers/
│       └── plans/
│           └── 2026-05-25-stage-1a-polyfill-bootstrap.md   # 本文件
└── tests/
    └── rules.test.ts             # 移植自原 zomboy 的规则单元测试（如有）
```

**Stage 1A 的范围明确**：
- ✅ 棋盘可见 + 棋子可见 + 点击可走 + 一回合完整流程 + 胜负判定
- ❌ 不做：HUD modal、卡牌动画、规则弹窗、开始菜单、抖音 SDK 接入、广告、IAP、录屏、文案替换、Q 版美术重做、抖音模式（满 3 杀）、30 关、成长系统
- 上述所有 ❌ 都在 Stage 1B/1C，**不要混进 1A**

---

## Task 0: 美术资源 Prompt 清单（提前并行进行）

用户用 GPT 在 dev 进行的同时生图，到 Task 4-5 之前出齐即可。

**Files:**
- 需要交付到 `assets/sprites/` 的 PNG，64×64 或 128×128（透明背景，PNG-24）

- [ ] **Step 1: 把以下 prompt 清单整体发给用户**

复用原 zomboy 的复古像素调（GB 绿 `#0f380f-#9bbc0f`），全部走"低分辨率像素+卡通可爱"路线，**避免任何写实/血腥**以满足审核 P0 要求（见 Step 2 报告 D.1）。

| # | 文件名 | Prompt（给 GPT 用） |
|---|---|---|
| 1 | `grass_tile.png` | `Pixel art tile, 64x64, top-down grass square for a board game, low saturation moss green (#7caa55), subtle texture, no shadow, transparent edges, retro Game Boy palette feel, PNG with transparent background.` |
| 2 | `stone_tile.png` | `Pixel art tile, 64x64, top-down stone block, gray-blue (#6a7180) with chunky pixel highlights and shadow, retro Game Boy palette, no outline outside the square, PNG transparent background.` |
| 3 | `house_tile.png` | `Pixel art tile, 64x64, top-down view of a tiny cute hut with a triangular red roof, kraft yellow walls (#f6d27a), one small door and one window, no people, cheerful retro pixel style, PNG transparent background.` |
| 4 | `house_empty.png` | `Pixel art tile, 64x64, top-down view of an empty foundation slab (stone outline forming an empty house footprint), faded gray (#9a9690), to indicate a house already used, retro pixel style, PNG transparent background.` |
| 5 | `start_tile.png` | `Pixel art tile, 64x64, top-down view of a cobblestone START platform with a tiny flag, soft cream color (#f6f1e0), retro pixel style, PNG transparent background.` |
| 6 | `survivor_blue.png` | `Cute chibi pixel character, 64x64, front-facing top-down view, small chibi office worker with round head, light blue shirt, neutral happy face, two dots for eyes, no weapons, no blood, soft GameBoy green palette body, retro 16-bit pixel art, PNG transparent background.` |
| 7 | `zombie_q.png` | `Cute chibi cartoon zombie, 64x64, front-facing top-down view, round head with messy bandage, sleepy spiral eyes, slightly tilted goofy smile, pale mint green skin (#9bbc0f), arms hanging forward in a silly slow pose, NO blood, NO gore, NO scary expression — emphasis on cute and harmless, retro 16-bit pixel art, PNG transparent background.` |

- [ ] **Step 2: 用户产出 7 张 PNG 后，全部丢进 `assets/sprites/`**

文件名必须严格匹配上表，否则 `src/ui/sprites.ts` 加载失败。

- [ ] **Step 3: 验证**

肉眼检查：每张 PNG 64×64、背景透明、风格统一、僵尸是萌的不是吓人的。如某张不达标，重发对应 prompt 让 GPT 重生。

> **Note**：本 Task 不阻塞 dev 主干。Task 1-3 可以先做（用 placeholder 灰块占位），到 Task 4 加载 sprite 时才需要资源就绪。

---

## Task 1: 项目脚手架与抖音 IDE 配置

**Files:**
- Create: `/Users/xiaren/Workspace/zomboy-douyin/package.json`
- Create: `/Users/xiaren/Workspace/zomboy-douyin/tsconfig.json`
- Create: `/Users/xiaren/Workspace/zomboy-douyin/game.json`
- Create: `/Users/xiaren/Workspace/zomboy-douyin/project.config.json`
- Create: `/Users/xiaren/Workspace/zomboy-douyin/.gitignore`
- Create: `/Users/xiaren/Workspace/zomboy-douyin/esbuild.config.mjs`

- [ ] **Step 1: 写 package.json**

```json
{
  "name": "zomboy-douyin",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "node esbuild.config.mjs",
    "watch": "node esbuild.config.mjs --watch",
    "typecheck": "tsc --noEmit",
    "test": "vitest run"
  },
  "devDependencies": {
    "esbuild": "^0.21.0",
    "typescript": "^5.6.0",
    "vitest": "^2.0.0",
    "@types/node": "^20.0.0"
  }
}
```

- [ ] **Step 2: 写 tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "noImplicitAny": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "isolatedModules": true,
    "noEmit": true,
    "lib": ["ES2017"],
    "types": ["node"]
  },
  "include": ["src/**/*", "adapter/**/*", "tests/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

注意：**不要把 `lib` 设为 `DOM`**——这正是我们要 polyfill 的，让 TS 强制提示哪里在用 DOM。

- [ ] **Step 3: 写 game.json（抖音小游戏运行时配置）**

```json
{
  "deviceOrientation": "portrait",
  "showStatusBar": false,
  "networkTimeout": {
    "request": 10000,
    "downloadFile": 10000
  },
  "subpackages": [],
  "workers": "",
  "openDataContext": "",
  "navigateToMiniProgramAppIdList": [],
  "permission": {}
}
```

- [ ] **Step 4: 写 project.config.json（抖音 IDE 项目配置）**

```json
{
  "miniprogramRoot": "./",
  "projectname": "zomboy-douyin",
  "description": "ZOM-BOY+ 抖音小游戏版 - Stage 1A",
  "appid": "tt-placeholder-replace-when-registered",
  "setting": {
    "es6": false,
    "minified": false,
    "urlCheck": false
  },
  "compileType": "game"
}
```

- [ ] **Step 5: 写 .gitignore**

```
node_modules/
dist/
.DS_Store
*.log
*.local
assets/sprites/*.png.import
```

- [ ] **Step 6: 写 esbuild.config.mjs**

```javascript
import esbuild from 'esbuild';

const isWatch = process.argv.includes('--watch');

const config = {
  entryPoints: ['game-entry.ts'],
  bundle: true,
  outfile: 'dist/game.js',
  platform: 'neutral',
  format: 'cjs',
  target: 'es2017',
  logLevel: 'info',
  sourcemap: 'inline',
  loader: { '.png': 'file' }
};

if (isWatch) {
  const ctx = await esbuild.context(config);
  await ctx.watch();
  console.log('watching...');
} else {
  await esbuild.build(config);
}
```

- [ ] **Step 7: 安装依赖 + 验证可编译**

```bash
cd /Users/xiaren/Workspace/zomboy-douyin && npm install
```

Expected: `npm install` 成功，`node_modules/` 出现，无 error。

- [ ] **Step 8: git 初始化 + 首次提交**

```bash
cd /Users/xiaren/Workspace/zomboy-douyin && git init && git add -A && git commit -m "chore: stage 1A 项目脚手架"
```

Expected: 至少 7 个文件被提交。

---

## Task 2: 搬运 zomboy 规则代码

**Files:**
- Create: `/Users/xiaren/Workspace/zomboy-douyin/src/game/types.ts`
- Create: `/Users/xiaren/Workspace/zomboy-douyin/src/game/mapgen.ts`
- Create: `/Users/xiaren/Workspace/zomboy-douyin/src/game/rules.ts`
- Create: `/Users/xiaren/Workspace/zomboy-douyin/src/game/state.ts`
- Create: `/Users/xiaren/Workspace/zomboy-douyin/src/game/ai.ts`

- [ ] **Step 1: 从 GitHub 拉取 zomboy 原源码到本地临时目录**

```bash
cd /tmp && git clone --depth 1 https://github.com/xemaya/zomboy.git zomboy-src
```

Expected: `/tmp/zomboy-src/src/game/` 存在 5 个 `.ts` 文件。

- [ ] **Step 2: 把 src/game/ 整个 5 个文件拷贝到新项目**

```bash
cp /tmp/zomboy-src/src/game/*.ts /Users/xiaren/Workspace/zomboy-douyin/src/game/
```

Expected: 5 个文件出现在新项目，文件大小与原仓库一致。

- [ ] **Step 3: 跑 typecheck 看是否有依赖问题**

```bash
cd /Users/xiaren/Workspace/zomboy-douyin && npm run typecheck
```

Expected: 多半会通过——这 5 个文件应该都是纯 TS 不引用 DOM。**如果报错，记录哪个文件引用了 DOM**（很可能是 `state.ts` 用了 `console.log`、或某处用了 `Math.random` 这种没问题的）。如果是 `document/window` 引用，回头在 Task 3 polyfill 时处理。

- [ ] **Step 4: 移植 zomboy 的规则测试（如果原仓库有）**

```bash
ls /tmp/zomboy-src/tests/ 2>/dev/null || echo "no tests dir"
```

如果有 `tests/` 目录，拷贝：

```bash
mkdir -p /Users/xiaren/Workspace/zomboy-douyin/tests && cp /tmp/zomboy-src/tests/*.ts /Users/xiaren/Workspace/zomboy-douyin/tests/ 2>/dev/null || true
```

- [ ] **Step 5: 跑测试看绿不绿**

```bash
cd /Users/xiaren/Workspace/zomboy-douyin && npm test
```

Expected: 如果有测试，全绿；如果没测试，"no tests collected"。**绿不了的话不是规则问题就是路径问题，先 fix**。

- [ ] **Step 6: 提交**

```bash
cd /Users/xiaren/Workspace/zomboy-douyin && git add -A && git commit -m "feat: 搬运 zomboy 规则代码（types/mapgen/rules/state/ai）"
```

---

## Task 3: 环境 polyfill 最小化垫片

**Files:**
- Create: `/Users/xiaren/Workspace/zomboy-douyin/adapter/globals.ts`
- Create: `/Users/xiaren/Workspace/zomboy-douyin/adapter/storage.ts`
- Create: `/Users/xiaren/Workspace/zomboy-douyin/adapter/index.ts`
- Create: `/Users/xiaren/Workspace/zomboy-douyin/game-entry.ts`
- Create: `/Users/xiaren/Workspace/zomboy-douyin/game.js`
- Test: `/Users/xiaren/Workspace/zomboy-douyin/tests/polyfill.test.ts`

- [ ] **Step 1: 写 adapter/globals.ts**

```typescript
// adapter/globals.ts
// 最小化全局占位：只 polyfill 抖音 runtime 缺失的、TS 强制要求的。
// 不模拟 DOM 树，不模拟 Element/Node — UI 完全用 Canvas 直绘。

declare const GameGlobal: any;

const g = typeof GameGlobal !== 'undefined' ? GameGlobal : globalThis;

// 1) window 最小占位（某些 NPM 库 import 时 sniff window 存在性）
if (typeof g.window === 'undefined') {
  g.window = g;
}

// 2) navigator（抖音原生有，但 type 上没有，给 stub 让 TS 编译过）
if (typeof g.navigator === 'undefined') {
  g.navigator = { userAgent: 'douyin-minigame', language: 'zh-CN' };
}

// 3) console（抖音原生有，无需 polyfill，仅 declare 让 TS 不抱怨）
declare global {
  var console: Console;
  var requestAnimationFrame: (cb: (t: number) => void) => number;
  var cancelAnimationFrame: (id: number) => void;
  var setTimeout: typeof globalThis.setTimeout;
  var clearTimeout: typeof globalThis.clearTimeout;
}

export {};
```

- [ ] **Step 2: 写 adapter/storage.ts**

```typescript
// adapter/storage.ts
// localStorage 等价物。抖音用 tt.setStorageSync / tt.getStorageSync。
declare const tt: any;

export const storage = {
  get<T>(key: string, defaultValue: T): T {
    try {
      const raw = tt.getStorageSync(key);
      if (raw === '' || raw === undefined || raw === null) return defaultValue;
      return JSON.parse(raw) as T;
    } catch {
      return defaultValue;
    }
  },
  set<T>(key: string, value: T): void {
    try {
      tt.setStorageSync(key, JSON.stringify(value));
    } catch (e) {
      console.warn('[storage] set failed', key, e);
    }
  },
  remove(key: string): void {
    try {
      tt.removeStorageSync(key);
    } catch {}
  }
};
```

- [ ] **Step 3: 写 adapter/index.ts**

```typescript
// adapter/index.ts
// 在游戏代码之前 import 一次，确保 globals 装好。
import './globals';
export { storage } from './storage';
```

- [ ] **Step 4: 写 game-entry.ts（esbuild 真正打包的入口）**

```typescript
// game-entry.ts
import './adapter';     // 先装 polyfill
import './src/main';    // 再启动游戏
```

- [ ] **Step 5: 写 game.js（抖音运行时找到的物理入口）**

```javascript
// game.js — 抖音小游戏入口（CommonJS）
// 这个文件不参与 esbuild 打包，直接被抖音 runtime 加载。
require('./dist/game.js');
```

- [ ] **Step 6: 在 tests/polyfill.test.ts 写一个 sanity test**

```typescript
// tests/polyfill.test.ts
import { describe, it, expect } from 'vitest';

describe('storage polyfill', () => {
  it('returns defaultValue when key missing', async () => {
    // 在测试环境 mock tt
    (globalThis as any).tt = {
      getStorageSync: () => '',
      setStorageSync: () => {},
      removeStorageSync: () => {}
    };
    const { storage } = await import('../adapter/storage');
    expect(storage.get('absent_key', 42)).toBe(42);
  });

  it('round-trips a value', async () => {
    let stored = '';
    (globalThis as any).tt = {
      getStorageSync: (k: string) => stored,
      setStorageSync: (k: string, v: string) => { stored = v; },
      removeStorageSync: () => {}
    };
    const { storage } = await import('../adapter/storage');
    storage.set('k', { a: 1 });
    expect(storage.get('k', null)).toEqual({ a: 1 });
  });
});
```

- [ ] **Step 7: 跑测试验证**

```bash
cd /Users/xiaren/Workspace/zomboy-douyin && npm test -- polyfill.test.ts
```

Expected: 2 passed.

- [ ] **Step 8: 跑 esbuild build 看能不能编译**

```bash
cd /Users/xiaren/Workspace/zomboy-douyin && touch src/main.ts && npm run build
```

Expected: `dist/game.js` 生成，无 error。会 warn "main.ts is empty" 这是正常的（下一个 task 会写）。

- [ ] **Step 9: 提交**

```bash
cd /Users/xiaren/Workspace/zomboy-douyin && git add -A && git commit -m "feat(adapter): 最小化环境 polyfill + storage 封装"
```

---

## Task 4: Canvas 渲染层基础（创建 canvas + 绘制背景）

**Files:**
- Create: `/Users/xiaren/Workspace/zomboy-douyin/src/ui/canvas.ts`
- Create: `/Users/xiaren/Workspace/zomboy-douyin/src/ui/theme.ts`
- Create: `/Users/xiaren/Workspace/zomboy-douyin/src/ui/sprites.ts`

- [ ] **Step 1: 写 src/ui/theme.ts（颜色 + 尺寸常量）**

```typescript
// src/ui/theme.ts
// 颜色继承自原 zomboy spec：暗背景 #2a2724, cream #f6f1e0, pink #c93f74,
// GB 绿 #0f380f-#9bbc0f

export const colors = {
  bg: '#2a2724',
  cream: '#f6f1e0',
  pink: '#c93f74',
  gbDarkGreen: '#0f380f',
  gbLightGreen: '#9bbc0f',
  highlightMove: 'rgba(155, 188, 15, 0.45)',  // 半透明绿（合法移动）
  highlightJump: 'rgba(201, 63, 116, 0.5)',   // 半透明粉（跳杀落点）
  gridLine: 'rgba(246, 241, 224, 0.15)'
};

// 棋盘几何（按竖屏 750×1334 设计基线，scaled at runtime）
export const layout = {
  cols: 8,
  rows: 8,
  baseWidth: 750,
  baseHeight: 1334,
  boardMargin: 30,
  boardTopOffset: 220,    // 顶部 HUD 区高度
  get cellSize() {
    return Math.floor((this.baseWidth - this.boardMargin * 2) / this.cols);
  },
  get boardSize() {
    return this.cellSize * this.cols;
  }
};
```

- [ ] **Step 2: 写 src/ui/canvas.ts（上屏 canvas 获取 + scale）**

```typescript
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
```

- [ ] **Step 3: 写 src/ui/sprites.ts（异步加载 + 缓存 PNG）**

```typescript
// src/ui/sprites.ts
declare const tt: any;

const cache = new Map<string, any>();

export const SPRITE_PATHS = {
  grass: 'assets/sprites/grass_tile.png',
  stone: 'assets/sprites/stone_tile.png',
  house: 'assets/sprites/house_tile.png',
  houseEmpty: 'assets/sprites/house_empty.png',
  start: 'assets/sprites/start_tile.png',
  survivor: 'assets/sprites/survivor_blue.png',
  zombie: 'assets/sprites/zombie_q.png'
};

export type SpriteKey = keyof typeof SPRITE_PATHS;

function loadOne(path: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const img = tt.createImage();
    img.onload = () => resolve(img);
    img.onerror = (e: any) => reject(new Error(`Failed to load ${path}: ${JSON.stringify(e)}`));
    img.src = path;
  });
}

export async function loadAllSprites(): Promise<void> {
  const entries = Object.entries(SPRITE_PATHS) as [SpriteKey, string][];
  await Promise.all(
    entries.map(async ([key, path]) => {
      cache.set(key, await loadOne(path));
    })
  );
}

export function getSprite(key: SpriteKey): any {
  const s = cache.get(key);
  if (!s) throw new Error(`Sprite not loaded: ${key} — did you await loadAllSprites()?`);
  return s;
}
```

- [ ] **Step 4: 提交**

```bash
cd /Users/xiaren/Workspace/zomboy-douyin && git add -A && git commit -m "feat(ui): canvas + theme + sprites 加载基础设施"
```

---

## Task 5: 棋盘渲染（画 8×8 网格 + 地块 + 棋子）

**Files:**
- Create: `/Users/xiaren/Workspace/zomboy-douyin/src/ui/boardRenderer.ts`
- Test: `/Users/xiaren/Workspace/zomboy-douyin/tests/boardCoords.test.ts`

- [ ] **Step 1: 在 boardRenderer.ts 写坐标转换工具（先 TDD）**

先写测试 `tests/boardCoords.test.ts`：

```typescript
// tests/boardCoords.test.ts
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
    const { x, y } = cellToPixel(4, 3);
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
```

- [ ] **Step 2: 跑测试看 fail**

```bash
cd /Users/xiaren/Workspace/zomboy-douyin && npm test -- boardCoords.test.ts
```

Expected: 4 failed（boardRenderer 还没写）。

- [ ] **Step 3: 写 boardRenderer.ts 最小实现**

```typescript
// src/ui/boardRenderer.ts
import { getScreen } from './canvas';
import { colors, layout } from './theme';
import { getSprite, SpriteKey } from './sprites';
import type { State, Piece } from '../game/types';

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

export function drawBoard(state: State, highlight: Array<{ r: number; c: number; kind: 'move' | 'jump' }> = []): void {
  const { ctx } = getScreen();

  // 1) 背景
  ctx.fillStyle = colors.bg;
  ctx.fillRect(0, 0, layout.baseWidth, layout.baseHeight);

  // 2) 棋盘格 + 地块
  for (let r = 0; r < layout.rows; r++) {
    for (let c = 0; c < layout.cols; c++) {
      const { x, y } = cellToPixel(r, c);
      const tile = state.tiles[r][c];  // 'grass' | 'stone' | 'house' | 'house_empty' | 'start'
      const spriteKey = tileToSprite(tile);
      ctx.drawImage(getSprite(spriteKey), x, y, layout.cellSize, layout.cellSize);

      // 网格线
      ctx.strokeStyle = colors.gridLine;
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 0.5, y + 0.5, layout.cellSize - 1, layout.cellSize - 1);
    }
  }

  // 3) 高亮（移动 / 跳杀）
  for (const h of highlight) {
    const { x, y } = cellToPixel(h.r, h.c);
    ctx.fillStyle = h.kind === 'jump' ? colors.highlightJump : colors.highlightMove;
    ctx.fillRect(x, y, layout.cellSize, layout.cellSize);
  }

  // 4) 棋子
  for (const p of state.pieces) {
    const { x, y } = cellToPixel(p.r, p.c);
    const key: SpriteKey = p.kind === 'survivor' ? 'survivor' : 'zombie';
    ctx.drawImage(getSprite(key), x, y, layout.cellSize, layout.cellSize);
  }
}

function tileToSprite(tile: string): SpriteKey {
  switch (tile) {
    case 'stone': return 'stone';
    case 'house': return 'house';
    case 'house_empty': return 'houseEmpty';
    case 'start': return 'start';
    default: return 'grass';
  }
}
```

> **Note**：`state.tiles` 和 `state.pieces` 的具体字段名以 Task 2 搬来的 `src/game/types.ts` 为准。如果实际字段不是 `tiles/pieces`，**改本文件以适配，而非修改 game/types.ts**。

- [ ] **Step 4: 跑测试看绿**

```bash
cd /Users/xiaren/Workspace/zomboy-douyin && npm test -- boardCoords.test.ts
```

Expected: 4 passed.

- [ ] **Step 5: 提交**

```bash
cd /Users/xiaren/Workspace/zomboy-douyin && git add -A && git commit -m "feat(ui): 棋盘渲染 + 坐标转换"
```

---

## Task 6: HUD 最小实现（顶部得分条 + 阶段提示）

**Files:**
- Create: `/Users/xiaren/Workspace/zomboy-douyin/src/ui/hud.ts`

- [ ] **Step 1: 写 hud.ts**

```typescript
// src/ui/hud.ts
import { getScreen } from './canvas';
import { colors, layout } from './theme';
import type { State } from '../game/types';

export function drawHud(state: State): void {
  const { ctx } = getScreen();

  // 顶部条背景
  ctx.fillStyle = colors.cream;
  ctx.fillRect(0, 0, layout.baseWidth, layout.boardTopOffset - 30);

  // 得分（左 ⭐ 击退数 / 右 👻 拐走数）
  ctx.fillStyle = colors.gbDarkGreen;
  ctx.font = 'bold 48px "PingFang SC", "Microsoft YaHei", sans-serif';
  ctx.textBaseline = 'middle';

  ctx.textAlign = 'left';
  ctx.fillText(`⭐ × ${state.survivorKills}`, 30, 80);

  ctx.textAlign = 'right';
  ctx.fillText(`👻 × ${state.zombieKills}`, layout.baseWidth - 30, 80);

  // 当前阵营 + 阶段
  ctx.fillStyle = colors.pink;
  ctx.font = 'bold 32px "PingFang SC", "Microsoft YaHei", sans-serif';
  ctx.textAlign = 'center';
  const sideText = state.turn === 'survivor' ? '👤 你的回合' : '🧟 僵尸的回合';
  ctx.fillText(sideText, layout.baseWidth / 2, 150);

  // 副提示（库存等）
  ctx.fillStyle = colors.gbDarkGreen;
  ctx.font = '24px "PingFang SC", "Microsoft YaHei", sans-serif';
  ctx.fillText(
    `僵尸库存 ${state.zombieInventory}  房子 ${countHouses(state)}`,
    layout.baseWidth / 2,
    185
  );
}

function countHouses(state: State): number {
  let n = 0;
  for (const row of state.tiles) for (const t of row) if (t === 'house') n++;
  return n;
}
```

> **Note**：`state.turn / survivorKills / zombieKills / zombieInventory` 字段名以搬来的 `types.ts` 为准；不一致就调本文件。

- [ ] **Step 2: typecheck**

```bash
cd /Users/xiaren/Workspace/zomboy-douyin && npm run typecheck
```

Expected: 通过。

- [ ] **Step 3: 提交**

```bash
cd /Users/xiaren/Workspace/zomboy-douyin && git add -A && git commit -m "feat(ui): HUD 顶部得分条 + 阶段提示"
```

---

## Task 7: 输入系统（触摸 → clickCell）

**Files:**
- Create: `/Users/xiaren/Workspace/zomboy-douyin/src/ui/input.ts`

- [ ] **Step 1: 写 input.ts**

```typescript
// src/ui/input.ts
import { pixelToCell } from './boardRenderer';
import { getScreen } from './canvas';

declare const tt: any;

export type CellTapHandler = (r: number, c: number) => void;

export function registerInput(onCellTap: CellTapHandler): void {
  const { canvas, dpr, width } = getScreen();
  // 抖音的触摸事件挂在 tt.onTouchStart，坐标是物理像素
  // canvas 已经被 ctx.scale(dpr, dpr)，所以传给 pixelToCell 的应是 baseWidth 域
  // 缩放比例：baseWidth -> 屏幕宽度（width 物理像素是 width*dpr，但 onTouchStart 给的是 screenWidth 域）
  // 抖音 touch.clientX 已是 CSS 像素（screenWidth 域），所以转换为 baseWidth 域只需缩放 baseWidth/width
  const scaleX = 750 / width;
  const scaleY = 1334 / (getScreen().height);

  tt.onTouchStart((evt: any) => {
    const t = evt.touches?.[0] ?? evt.changedTouches?.[0];
    if (!t) return;
    const px = t.clientX * scaleX;
    const py = t.clientY * scaleY;
    const cell = pixelToCell(px, py);
    if (cell) onCellTap(cell.r, cell.c);
  });
}
```

- [ ] **Step 2: typecheck**

```bash
cd /Users/xiaren/Workspace/zomboy-douyin && npm run typecheck
```

Expected: 通过。

- [ ] **Step 3: 提交**

```bash
cd /Users/xiaren/Workspace/zomboy-douyin && git add -A && git commit -m "feat(ui): 触摸输入 → 棋盘坐标"
```

---

## Task 8: 启动入口 main.ts + 完整渲染循环

**Files:**
- Create: `/Users/xiaren/Workspace/zomboy-douyin/src/main.ts`

- [ ] **Step 1: 写 main.ts**

```typescript
// src/main.ts
import { getScreen, clearScreen } from './ui/canvas';
import { loadAllSprites } from './ui/sprites';
import { drawBoard, pixelToCell } from './ui/boardRenderer';
import { drawHud } from './ui/hud';
import { registerInput } from './ui/input';
import { colors } from './ui/theme';

import { createInitialState } from './game/state';
import { clickCell as gameClickCell } from './game/state';
import { legalMoves, legalJumps } from './game/rules';
import { planTurn } from './game/ai';
import type { State } from './game/types';

let state: State;
let selectedPiece: { r: number; c: number } | null = null;
let dirty = true;

async function boot() {
  // 1) 初始化 screen（拿到 canvas + ctx）
  getScreen();

  // 2) 加载 sprite（PNG 异步）
  await loadAllSprites();

  // 3) 初始化游戏状态
  state = createInitialState({
    boardSize: 8,
    zombieInventory: 9,
    winThreshold: 4,
    seed: Date.now()
  });

  // 4) 注册触摸
  registerInput((r, c) => {
    handleTap(r, c);
  });

  // 5) 启动渲染循环
  renderLoop();
}

function handleTap(r: number, c: number): void {
  if (state.turn !== 'survivor') return;  // 简化：1A 阶段仅 PVE 单人，玩家是 survivor，僵尸是 AI

  // 1A 阶段简化交互：点 → 直接转给规则
  state = gameClickCell(state, r, c);
  selectedPiece = null;
  dirty = true;

  // 若轮到 AI，规划下一回合
  if (state.turn === 'zombie' && !state.winner) {
    setTimeout(() => {
      const actions = planTurn(state, 'easy');  // 1A 阶段固定 easy
      for (const action of actions) {
        state = gameClickCell(state, action.r, action.c);
      }
      dirty = true;
    }, 400);
  }
}

function renderLoop(): void {
  if (dirty) {
    clearScreen(colors.bg);
    drawHud(state);

    // 高亮当前选择的合法移动
    const highlight: Array<{ r: number; c: number; kind: 'move' | 'jump' }> = [];
    if (selectedPiece) {
      for (const m of legalMoves(state, selectedPiece.r, selectedPiece.c)) {
        highlight.push({ r: m.r, c: m.c, kind: 'move' });
      }
      for (const j of legalJumps(state, selectedPiece.r, selectedPiece.c)) {
        highlight.push({ r: j.r, c: j.c, kind: 'jump' });
      }
    }
    drawBoard(state, highlight);
    drawWinnerOverlay();
    dirty = false;
  }
  requestAnimationFrame(renderLoop);
}

function drawWinnerOverlay(): void {
  if (!state.winner) return;
  const { ctx, width, height } = getScreen();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(0, 0, 750, 1334);
  ctx.fillStyle = colors.cream;
  ctx.font = 'bold 64px "PingFang SC", "Microsoft YaHei", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const msg = state.winner === 'survivor' ? '🎉 你赢了！' : '😵 你输了';
  ctx.fillText(msg, 375, 600);
}

boot().catch((e) => {
  console.error('boot failed', e);
});
```

> **Note**：`createInitialState / planTurn` 的签名以 Task 2 搬来的实际为准。如果原 zomboy 用了不同的入口函数名（比如 `newGame` / `aiPlan`），改本文件以适配，**不改 game/ 下的源代码**。

- [ ] **Step 2: typecheck**

```bash
cd /Users/xiaren/Workspace/zomboy-douyin && npm run typecheck
```

Expected: 通过；如果 type error 提示 `createInitialState` 不存在或签名不一致，去 `src/game/state.ts` 找真实导出名，改 main.ts。

- [ ] **Step 3: build**

```bash
cd /Users/xiaren/Workspace/zomboy-douyin && npm run build
```

Expected: `dist/game.js` 生成，无 error；如果 bundle warn 个 `Cannot resolve` 系列错，是搬来代码里有相对路径问题，逐个 fix。

- [ ] **Step 4: 提交**

```bash
cd /Users/xiaren/Workspace/zomboy-douyin && git add -A && git commit -m "feat: main.ts 启动入口 + 渲染循环"
```

---

## Task 9: 在抖音 IDE 里首跑

**Files:**（无文件修改，纯手工验证）

- [ ] **Step 1: 安装并启动抖音开发者工具（用户操作）**

下载地址：https://developer.open-douyin.com/docs/resource/zh-CN/developer/tools/developer-instrument/developer-instrument-update-and-download

抖音版用户登录后，**导入项目**：
- 选 "小游戏" 类型
- 项目目录：`/Users/xiaren/Workspace/zomboy-douyin`
- AppID 留空或填 "tt-test-xxxx"（仅本地调试）

- [ ] **Step 2: 在 IDE 里点"编译"**

Expected: IDE 加载 `game.json` + `game.js` + `dist/game.js`，右侧"调试器"显示模拟器画面。

可能的报错与应对：
- **"找不到 game.js"** → 检查 `project.config.json` 的 `miniprogramRoot` 是否 `./`
- **"找不到 sprite PNG"** → 确认 `assets/sprites/*.png` 全部就位（依赖 Task 0）
- **"tt.createCanvas is not a function"** → IDE 版本太老，升级到 2025 之后版本

- [ ] **Step 3: 完成一局对战**

在模拟器里：
- 点一个自己的小蓝人 → 看到合法移动高亮
- 点高亮格 → 棋子移动 → 等 AI 出招 → 重复
- 直到 `⭐` 或 `👻` 满 4 → 胜负 overlay 出现

**完整一局走通 = Stage 1A 成功**。

- [ ] **Step 4: 截图存档**

把首跑成功的模拟器截图保存到 `docs/superpowers/screenshots/2026-05-25-stage-1a-first-run.png`，作为里程碑记录。

- [ ] **Step 5: 提交记录**

```bash
cd /Users/xiaren/Workspace/zomboy-douyin && git add docs/superpowers/screenshots/ && git commit -m "docs: stage 1A 首跑成功截图"
```

---

## Task 10: 已知缺陷与 Stage 1B 入口

**Files:**
- Create: `/Users/xiaren/Workspace/zomboy-douyin/docs/superpowers/plans/stage-1a-known-gaps.md`

- [ ] **Step 1: 在文档里记录 Stage 1A 已知不完美**

```markdown
# Stage 1A 已知缺陷（搬到 Stage 1B 处理）

## UI 层

1. 无开始菜单 / 难度选择（main.ts 硬编码 easy AI）
2. 无规则弹窗 / 无卡牌弹窗动画
3. 无回合切换动画 / 无吃子飞出动画
4. HUD 没有日志列表 / 没有当前阶段细分提示
5. emoji ☠️ 暂未替换为 ⭐（在 Task 14 替换；1A 期可能仍出现）

## 玩法层

6. 卡牌系统未接入（房子触发 → 暂时无效，只消耗成 house_empty）
7. 仅 PVE，无双人热座入口
8. 单回合无超时，玩家可无限思考
9. 胜利后无"再来一局"按钮（只能重启 IDE）

## SDK 层

10. 未接入任何 tt 广告 / IAP / 录屏 / 分享 API
11. 无存档（每次启动重新随机地图）
12. 无 SensitiveWordCheck 接入

以上全部移交 Stage 1B 处理。
```

- [ ] **Step 2: 提交**

```bash
cd /Users/xiaren/Workspace/zomboy-douyin && git add -A && git commit -m "docs: stage 1A 已知缺陷清单"
```

---

## Self-Review 校验

> 此节由 plan 作者（我）在写完后自检，已完成。

**Spec 覆盖检查**：
- ✅ "项目脚手架 + 抖音 IDE 配置" → Task 1
- ✅ "搬运 zomboy 规则代码不动" → Task 2
- ✅ "环境 polyfill 最小化" → Task 3
- ✅ "Canvas 渲染层基础" → Task 4
- ✅ "棋盘 + 棋子 + 高亮绘制" → Task 5
- ✅ "HUD 最小实现" → Task 6
- ✅ "触摸输入" → Task 7
- ✅ "启动入口 + 渲染循环" → Task 8
- ✅ "抖音 IDE 首跑验证" → Task 9
- ✅ "已知缺陷清单" → Task 10
- ✅ "美术资源 prompt 清单（提前并行）" → Task 0

**Placeholder 扫描**：
- 已检查所有"实现细节"段落，无 "TBD"、"implement later"、"similar to" 等占位
- 所有代码 step 都给了完整代码
- 所有命令都是可直接复制运行的

**Type 一致性**：
- 所有 UI 文件引用 `State / Piece` 类型，**统一来源 `src/game/types.ts`**（Task 2 搬运）。
- 任何字段名不一致（`tiles` vs `board`、`survivorKills` vs `kills.survivor`）的处理方针：**改 UI 文件适配 game/，不改 game/**。

**已知风险**：
1. zomboy 原代码字段名我没看过具体定义，UI 文件里假设了 `state.tiles / state.pieces / state.turn / state.survivorKills / state.zombieKills / state.zombieInventory / state.winner`。Task 2 完成后第一时间核对 `src/game/types.ts`，不对就改 UI 文件。
2. 抖音 IDE 的 createCanvas / onTouchStart 行为在不同版本略有差异，Task 9 首跑时可能需要小调整。
3. 美术资源等用户用 GPT 生成，Task 0 输出 7 张 prompt，但**最终风格统一度需用户把关**。

---

## 执行约定

- 严格按 task 顺序执行
- 每个 task 完成后必须 commit
- 跳步前必须明确说明原因
- 遇到 zomboy 字段名不一致：改 UI 适配，**不改 game/ 下的搬运代码**
- 美术资源（Task 0）独立轨道，dev 主干不阻塞——Task 1-3 可用 placeholder 占位先做，Task 4-5 真正需要资源前生成完即可
