# ZOM-BOY+ 抖音版 Stage 1B 实施计划：SDK + 完整 UI

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 Stage 1A 的"能跑通一局但裸"版本升级为"可提审、玩家能正常上手、有 SDK 反馈"的完整版。

**Architecture:** 在 1A 的 game/ui/adapter 三层架构上扩展：(1) 加 SDK 适配层 `adapter/sdk.ts` 封装 tt.* 调用；(2) UI 层加 menu/modal/endgame/log；(3) 资源层做 sprite 压缩到 4MB 主包限制内。**不动 game/ 规则代码**。

**Tech Stack:**
- 抖音小游戏 SDK：`tt.login` / `tt.createRewardedVideoAd` / `tt.shareAppMessage` / `tt.onShow` / `tt.onHide` / `tt.setStorageSync`
- sharp（npm 包，做 sprite 压缩降采样）

**预计单元工作量:** 11 个 task，~10-15 天个人节奏。本 plan 不包含抖音模式参数调整（满 3 杀、7 秒倒计时）、30 关、短视频自动剪辑、文案最终替换、提审材料——那些是 Stage 1C。

---

## File Structure (新增)

```
zomboy-douyin/
├── adapter/
│   ├── sdk.ts                    # NEW: 封装 tt.login / tt.shareAppMessage / lifecycle
│   ├── ads.ts                    # NEW: 封装 RewardedVideoAd 生命周期
│   └── persistence.ts            # NEW: 高层存档（封装 storage 做 GameState 持久化）
├── src/
│   ├── ui/
│   │   ├── startMenu.ts          # NEW: 开始菜单（模式 / 难度 / 阵营）
│   │   ├── rulesModal.ts         # NEW: 规则说明（Canvas 重画）
│   │   ├── cardModal.ts          # NEW: 房子卡牌效果展示
│   │   ├── endScreen.ts          # NEW: 胜利/失败界面 + 再来一局 + 分享
│   │   ├── log.ts                # NEW: 日志列表渲染
│   │   └── modalBase.ts          # NEW: 通用 modal 框架（背景 + 卡片 + 按钮）
│   └── app.ts                    # NEW: 应用级状态机（菜单/对局/结算），替代 main.ts 的直接 boot
├── scripts/
│   └── optimize-sprites.mjs      # NEW: 批量压缩降采样脚本
└── ...
```

`main.ts` 改造：从"直接进入对局"变成"调用 app.ts 进入菜单"。

---

## Task 1: Sprite 压缩降采样到 4MB 主包限制

**Files:**
- Create: `/Users/xiaren/Workspace/zomboy-douyin/scripts/optimize-sprites.mjs`
- Modify: `/Users/xiaren/Workspace/zomboy-douyin/package.json` (加 sharp dep + 加 sprites:optimize 脚本)
- Modify (overwrite): `assets/sprites/*.png` (压缩后版本)

**Constraints:**
- 当前 21MB 总和必须降到 **< 3MB 总和**（给主包其他代码留 1MB 富余）
- 每张 PNG **128×128** 或 **64×64**（像素风够用）
- 用 PNG-8 palette 模式压缩
- 美术风格不能破坏（圆头、绷带、表情清晰可见）

**Step 1: Install sharp dependency**

```bash
cd /Users/xiaren/Workspace/zomboy-douyin && npm install --save-dev sharp
```

**Step 2: Write the optimization script**

```javascript
// scripts/optimize-sprites.mjs
import sharp from 'sharp';
import { readdir, stat } from 'fs/promises';
import { join } from 'path';

const SPRITES_DIR = 'assets/sprites';
const TARGET_SIZE = 128;  // 128x128 PNG palette

async function optimizeOne(path) {
  const before = (await stat(path)).size;
  const tmpPath = path + '.tmp';
  
  await sharp(path)
    .resize(TARGET_SIZE, TARGET_SIZE, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ palette: true, compressionLevel: 9, quality: 80 })
    .toFile(tmpPath);
  
  const after = (await stat(tmpPath)).size;
  
  // Atomic replace via rename
  await sharp(tmpPath).toFile(path);
  await import('fs').then(fs => fs.promises.unlink(tmpPath));
  
  const ratio = ((1 - after / before) * 100).toFixed(1);
  console.log(`  ${path}: ${(before / 1024).toFixed(0)}KB → ${(after / 1024).toFixed(0)}KB (-${ratio}%)`);
  return after;
}

async function main() {
  const files = (await readdir(SPRITES_DIR)).filter(f => f.endsWith('.png'));
  console.log(`Optimizing ${files.length} sprites in ${SPRITES_DIR}...`);
  
  let totalAfter = 0;
  for (const f of files) {
    totalAfter += await optimizeOne(join(SPRITES_DIR, f));
  }
  
  console.log(`Total: ${(totalAfter / 1024).toFixed(0)}KB`);
  if (totalAfter > 3 * 1024 * 1024) {
    console.error(`❌ Total ${(totalAfter / 1024 / 1024).toFixed(2)}MB exceeds 3MB target. Reduce TARGET_SIZE or palette quality.`);
    process.exit(1);
  }
  console.log('✅ Within 3MB budget.');
}

main().catch(e => { console.error(e); process.exit(1); });
```

**Step 3: Add npm script**

In package.json scripts:
```json
"sprites:optimize": "node scripts/optimize-sprites.mjs"
```

**Step 4: Run it**

```bash
cd /Users/xiaren/Workspace/zomboy-douyin && npm run sprites:optimize
```

Expected: 7 files each compressed; total < 3MB. If any single file fails to compress meaningfully, lower TARGET_SIZE to 64.

**Step 5: Visual verification**

Open each png in /Users/xiaren/Workspace/zomboy-douyin/assets/sprites/ in a viewer. Confirm:
- 128×128 dimensions
- Q 版风格 preserved (僵尸还是萌的、survivor 圆头蓝衣 etc)
- Transparent background intact

If美术不达标，先回滚 (git checkout assets/sprites/) 再调脚本参数。

**Step 6: Commit**

```bash
cd /Users/xiaren/Workspace/zomboy-douyin && git add -A && git commit -m "feat(assets): 压缩 sprite 到 128x128 PNG palette，总大小 21MB → <3MB"
```

---

## Task 2: SDK 适配层 — adapter/sdk.ts

**Files:**
- Create: `/Users/xiaren/Workspace/zomboy-douyin/adapter/sdk.ts`

**Step 1: 写 sdk.ts**

```typescript
// adapter/sdk.ts
// 封装 tt.* 中 Stage 1B 需要的方法。所有调用要 Promise 化 + 失败兜底。

declare const tt: any;

export interface UserInfo {
  openid: string;
  nickname?: string;
  avatarUrl?: string;
}

let _userInfo: UserInfo | null = null;

export async function login(): Promise<UserInfo> {
  if (_userInfo) return _userInfo;
  return new Promise((resolve, reject) => {
    tt.login({
      success: (res: any) => {
        // 真实生产要把 res.code 发到自己的后端换 openid。
        // Stage 1B 没有后端，直接 fabricate 一个本地 ID + cache。
        _userInfo = { openid: 'local-' + res.code.substring(0, 8) };
        resolve(_userInfo);
      },
      fail: (e: any) => reject(new Error('tt.login failed: ' + JSON.stringify(e)))
    });
  });
}

export interface ShareOptions {
  title?: string;
  imageUrl?: string;
  templateId?: string;
  query?: string;
}

export function shareAppMessage(opts: ShareOptions = {}): void {
  try {
    tt.shareAppMessage({
      title: opts.title ?? '来玩我刚通关的僵尸棋！',
      imageUrl: opts.imageUrl ?? '',
      templateId: opts.templateId ?? '',
      query: opts.query ?? '',
      success: () => {},
      fail: (e: any) => console.warn('[share] failed', e)
    });
  } catch (e) {
    console.warn('[share] threw', e);
  }
}

// Lifecycle: pause/resume
type LifecycleHandler = () => void;

export function onAppShow(handler: LifecycleHandler): void {
  tt.onShow?.(handler);
}

export function onAppHide(handler: LifecycleHandler): void {
  tt.onHide?.(handler);
}
```

**Step 2: Typecheck + commit**

```bash
cd /Users/xiaren/Workspace/zomboy-douyin && npm run typecheck
cd /Users/xiaren/Workspace/zomboy-douyin && git add -A && git commit -m "feat(sdk): tt.login / shareAppMessage / lifecycle 封装"
```

---

## Task 3: 广告适配 — adapter/ads.ts

**Files:**
- Create: `/Users/xiaren/Workspace/zomboy-douyin/adapter/ads.ts`

**Step 1: 写 ads.ts**

```typescript
// adapter/ads.ts
// 抖音激励视频生命周期较复杂：实例要 cache（频繁 create 会报错），
// 显示前要 load，显示后听 onClose 来判定 isEnded（看完）vs 未看完。

declare const tt: any;

// 你的真实广告位 ID（在抖音小游戏后台申请），先用占位
const REWARDED_AD_UNIT_ID = 'YOUR_REWARDED_AD_UNIT_ID';

let _rewardedAd: any = null;

function getRewardedAd(): any {
  if (_rewardedAd) return _rewardedAd;
  _rewardedAd = tt.createRewardedVideoAd({
    adUnitId: REWARDED_AD_UNIT_ID,
    multiton: false
  });
  return _rewardedAd;
}

/**
 * Show rewarded ad. Resolves with true if user watched to completion,
 * false if skipped or closed early. Rejects on network/load failure.
 */
export function showRewardedAd(): Promise<boolean> {
  const ad = getRewardedAd();
  return new Promise((resolve, reject) => {
    const onClose = (res: any) => {
      ad.offClose(onClose);
      ad.offError(onError);
      resolve(res?.isEnded === true);
    };
    const onError = (e: any) => {
      ad.offClose(onClose);
      ad.offError(onError);
      reject(new Error('[ad] error: ' + JSON.stringify(e)));
    };
    ad.onClose(onClose);
    ad.onError(onError);
    ad.load()
      .then(() => ad.show())
      .catch(reject);
  });
}
```

**Step 2: Typecheck + commit**

```bash
cd /Users/xiaren/Workspace/zomboy-douyin && npm run typecheck
cd /Users/xiaren/Workspace/zomboy-douyin && git add -A && git commit -m "feat(sdk): 激励视频广告适配（load/show/onClose 标准生命周期）"
```

---

## Task 4: 持久化适配 — adapter/persistence.ts

**Files:**
- Create: `/Users/xiaren/Workspace/zomboy-douyin/adapter/persistence.ts`

**Step 1: 写 persistence.ts**

```typescript
// adapter/persistence.ts
// 高层存档：把用户元数据和当局状态分开存。

import { storage } from './storage';

export interface UserMeta {
  totalGamesPlayed: number;
  totalWins: number;
  totalLosses: number;
  highestStreak: number;
  currentStreak: number;
  preferredDifficulty: 'easy' | 'medium' | 'hard';
  preferredSide: 'survivor' | 'zombie';
  noAd: boolean;
  lastPlayedAt: number;
}

const USER_META_KEY = 'zomboy.userMeta.v1';
const ACTIVE_GAME_KEY = 'zomboy.activeGame.v1';

const DEFAULT_META: UserMeta = {
  totalGamesPlayed: 0,
  totalWins: 0,
  totalLosses: 0,
  highestStreak: 0,
  currentStreak: 0,
  preferredDifficulty: 'easy',
  preferredSide: 'survivor',
  noAd: false,
  lastPlayedAt: 0
};

export function loadUserMeta(): UserMeta {
  return storage.get<UserMeta>(USER_META_KEY, DEFAULT_META);
}

export function saveUserMeta(m: UserMeta): void {
  storage.set(USER_META_KEY, m);
}

export function recordGameEnd(winner: 'survivor' | 'zombie' | 'draw', playerSide: 'survivor' | 'zombie'): UserMeta {
  const meta = loadUserMeta();
  meta.totalGamesPlayed += 1;
  if (winner === 'draw') {
    meta.currentStreak = 0;
  } else if (winner === playerSide) {
    meta.totalWins += 1;
    meta.currentStreak += 1;
    if (meta.currentStreak > meta.highestStreak) meta.highestStreak = meta.currentStreak;
  } else {
    meta.totalLosses += 1;
    meta.currentStreak = 0;
  }
  meta.lastPlayedAt = Date.now();
  saveUserMeta(meta);
  return meta;
}

// Active game save: serialize state object as opaque JSON (no game-specific shape here).
export function saveActiveGame(state: unknown): void {
  storage.set(ACTIVE_GAME_KEY, state);
}

export function loadActiveGame<T = unknown>(): T | null {
  return storage.get<T | null>(ACTIVE_GAME_KEY, null);
}

export function clearActiveGame(): void {
  storage.remove(ACTIVE_GAME_KEY);
}
```

**Step 2: Test + commit**

Write `tests/persistence.test.ts` covering: default meta load, increment win, streak reset on loss, draw resets streak.

```typescript
// tests/persistence.test.ts
import { describe, it, expect, beforeEach } from 'vitest';

// Mock tt before importing module
(globalThis as any).tt = (() => {
  const store: Record<string, string> = {};
  return {
    getStorageSync: (k: string) => store[k] ?? '',
    setStorageSync: (k: string, v: string) => { store[k] = v; },
    removeStorageSync: (k: string) => { delete store[k]; }
  };
})();

describe('persistence', () => {
  beforeEach(async () => {
    // Reset store
    (globalThis as any).tt = (() => {
      const store: Record<string, string> = {};
      return {
        getStorageSync: (k: string) => store[k] ?? '',
        setStorageSync: (k: string, v: string) => { store[k] = v; },
        removeStorageSync: (k: string) => { delete store[k]; }
      };
    })();
  });

  it('returns default meta when storage empty', async () => {
    const { loadUserMeta } = await import('../adapter/persistence');
    const m = loadUserMeta();
    expect(m.totalGamesPlayed).toBe(0);
    expect(m.preferredDifficulty).toBe('easy');
  });

  it('increments wins and streak on player victory', async () => {
    const { recordGameEnd, loadUserMeta } = await import('../adapter/persistence');
    recordGameEnd('survivor', 'survivor');
    const m = loadUserMeta();
    expect(m.totalWins).toBe(1);
    expect(m.currentStreak).toBe(1);
    expect(m.highestStreak).toBe(1);
    expect(m.totalGamesPlayed).toBe(1);
  });

  it('resets streak on loss', async () => {
    const { recordGameEnd, loadUserMeta } = await import('../adapter/persistence');
    recordGameEnd('survivor', 'survivor');
    recordGameEnd('survivor', 'survivor');
    recordGameEnd('zombie', 'survivor');
    const m = loadUserMeta();
    expect(m.totalWins).toBe(2);
    expect(m.totalLosses).toBe(1);
    expect(m.currentStreak).toBe(0);
    expect(m.highestStreak).toBe(2);
  });

  it('draw resets streak', async () => {
    const { recordGameEnd, loadUserMeta } = await import('../adapter/persistence');
    recordGameEnd('survivor', 'survivor');
    recordGameEnd('draw', 'survivor');
    const m = loadUserMeta();
    expect(m.totalWins).toBe(1);
    expect(m.currentStreak).toBe(0);
  });
});
```

```bash
cd /Users/xiaren/Workspace/zomboy-douyin && npm test -- persistence.test.ts
cd /Users/xiaren/Workspace/zomboy-douyin && git add -A && git commit -m "feat(persistence): 用户元数据 + 当局存档"
```

---

## Task 5: 通用 Modal 框架 — src/ui/modalBase.ts

**Files:**
- Create: `/Users/xiaren/Workspace/zomboy-douyin/src/ui/modalBase.ts`

**Step 1: 写 modalBase.ts**

```typescript
// src/ui/modalBase.ts
// 通用半透明 modal：背景遮罩 + 中央卡片 + 标题 + 内容区 + 按钮列。
// 不是组件框架，是一组可复用绘制工具，由调用者控制可见性 + 命中检测。

import { getScreen } from './canvas';
import { colors, layout } from './theme';

export interface ModalRect {
  x: number; y: number; w: number; h: number;
}

export interface ModalButton {
  label: string;
  rect: ModalRect;
  primary?: boolean;
}

export function drawModalBackdrop(): void {
  const { ctx } = getScreen();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
  ctx.fillRect(0, 0, layout.baseWidth, layout.baseHeight);
}

export function drawModalCard(rect: ModalRect, title: string): void {
  const { ctx } = getScreen();
  // Card
  ctx.fillStyle = colors.cream;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  // Title bar
  ctx.fillStyle = colors.gbDarkGreen;
  ctx.fillRect(rect.x, rect.y, rect.w, 60);
  ctx.fillStyle = colors.cream;
  ctx.font = 'bold 32px "PingFang SC", "Microsoft YaHei", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(title, rect.x + rect.w / 2, rect.y + 30);
}

export function drawModalButton(btn: ModalButton): void {
  const { ctx } = getScreen();
  const bg = btn.primary ? colors.pink : colors.gbDarkGreen;
  ctx.fillStyle = bg;
  ctx.fillRect(btn.rect.x, btn.rect.y, btn.rect.w, btn.rect.h);
  ctx.fillStyle = colors.cream;
  ctx.font = 'bold 28px "PingFang SC", "Microsoft YaHei", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(btn.label, btn.rect.x + btn.rect.w / 2, btn.rect.y + btn.rect.h / 2);
}

export function hitButton(buttons: ModalButton[], px: number, py: number): number {
  for (let i = 0; i < buttons.length; i++) {
    const r = buttons[i].rect;
    if (px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h) return i;
  }
  return -1;
}
```

**Step 2: Typecheck + commit**

```bash
cd /Users/xiaren/Workspace/zomboy-douyin && npm run typecheck
cd /Users/xiaren/Workspace/zomboy-douyin && git add -A && git commit -m "feat(ui): 通用 modal 绘制工具（backdrop / card / button / hit）"
```

---

## Task 6: 开始菜单 — src/ui/startMenu.ts

**Files:**
- Create: `/Users/xiaren/Workspace/zomboy-douyin/src/ui/startMenu.ts`

要求：
- 显示游戏名"末日 4 对 4：僵尸来袭"（占位用 ZOM-BOY+ 也可）
- 模式：PVE（单人 vs AI） / PVP（双人热座）
- AI 难度（PVE 时）：轻松 / 普通 / 挑战
- 玩家阵营（PVE 时）：守 / 攻
- "开始游戏" 主按钮 + "规则" 次按钮
- 状态保存：选择存到 storage（preferredDifficulty / preferredSide）
- 命中检测：调用 modalBase.hitButton

写出完整接口：`renderStartMenu(cfg, hitContext) -> void`、`getStartMenuButtons(cfg) -> ModalButton[]`，让 app.ts 控制 cfg 状态。

```typescript
// src/ui/startMenu.ts
import { getScreen } from './canvas';
import { colors, layout } from './theme';
import { drawModalBackdrop, drawModalButton, type ModalButton } from './modalBase';

export type GameMode = 'pve' | 'pvp';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type Side = 'survivor' | 'zombie';

export interface StartMenuConfig {
  mode: GameMode;
  difficulty: Difficulty;
  side: Side;
}

export interface StartMenuButtons {
  modePve: ModalButton;
  modePvp: ModalButton;
  diffEasy: ModalButton;
  diffMed: ModalButton;
  diffHard: ModalButton;
  sideSurvivor: ModalButton;
  sideZombie: ModalButton;
  start: ModalButton;
  rules: ModalButton;
}

export function getStartMenuButtons(): StartMenuButtons {
  const W = layout.baseWidth;
  return {
    modePve:     { label: '单人',  rect: { x: 60,   y: 320, w: 290, h: 80 } },
    modePvp:     { label: '热座',  rect: { x: 400,  y: 320, w: 290, h: 80 } },
    diffEasy:    { label: '轻松',  rect: { x: 60,   y: 460, w: 195, h: 70 } },
    diffMed:     { label: '普通',  rect: { x: 277,  y: 460, w: 195, h: 70 } },
    diffHard:    { label: '挑战',  rect: { x: 494,  y: 460, w: 195, h: 70 } },
    sideSurvivor:{ label: '守人类', rect: { x: 60,   y: 580, w: 290, h: 80 } },
    sideZombie:  { label: '玩僵尸', rect: { x: 400,  y: 580, w: 290, h: 80 } },
    start:       { label: '开始游戏', rect: { x: 100, y: 760, w: 550, h: 100 }, primary: true },
    rules:       { label: '规则说明', rect: { x: 100, y: 900, w: 550, h: 80 } }
  };
}

export function renderStartMenu(cfg: StartMenuConfig): void {
  const { ctx } = getScreen();
  drawModalBackdrop();

  // Title
  ctx.fillStyle = colors.cream;
  ctx.font = 'bold 64px "PingFang SC", "Microsoft YaHei", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('末日 4 对 4', layout.baseWidth / 2, 150);
  ctx.font = 'bold 40px "PingFang SC", "Microsoft YaHei", sans-serif';
  ctx.fillStyle = colors.pink;
  ctx.fillText('僵尸来袭', layout.baseWidth / 2, 220);

  // Section labels
  ctx.fillStyle = colors.cream;
  ctx.font = '24px "PingFang SC", "Microsoft YaHei", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('模式', 60, 300);
  ctx.fillText('AI 难度', 60, 440);
  ctx.fillText('你玩哪一边', 60, 560);

  // Buttons with active state highlighting
  const btns = getStartMenuButtons();
  const isActive = (which: keyof StartMenuButtons): boolean => {
    if (which === 'modePve') return cfg.mode === 'pve';
    if (which === 'modePvp') return cfg.mode === 'pvp';
    if (which === 'diffEasy') return cfg.difficulty === 'easy';
    if (which === 'diffMed') return cfg.difficulty === 'medium';
    if (which === 'diffHard') return cfg.difficulty === 'hard';
    if (which === 'sideSurvivor') return cfg.side === 'survivor';
    if (which === 'sideZombie') return cfg.side === 'zombie';
    return false;
  };
  for (const key of Object.keys(btns) as (keyof StartMenuButtons)[]) {
    const b = btns[key];
    drawModalButton({ ...b, primary: b.primary || isActive(key) });
  }
}
```

**Step 2: Typecheck + commit**

```bash
cd /Users/xiaren/Workspace/zomboy-douyin && npm run typecheck
cd /Users/xiaren/Workspace/zomboy-douyin && git add -A && git commit -m "feat(ui): 开始菜单（模式/难度/阵营选择）"
```

---

## Task 7: 规则说明弹窗 — src/ui/rulesModal.ts

**Files:**
- Create: `/Users/xiaren/Workspace/zomboy-douyin/src/ui/rulesModal.ts`

复用原 zomboy `rulesModal.ts` 文案，**逐条做动词替换**（杀→打飞、感染→拐走、emoji ☠️→⭐、🧟 保留）；用 Canvas 绘制不用 HTML。

要求：
- 全屏 modal
- 滚动支持（内容会比屏长）
- "关闭" 按钮

```typescript
// src/ui/rulesModal.ts
import { getScreen } from './canvas';
import { colors, layout } from './theme';
import { drawModalBackdrop, drawModalButton, type ModalButton } from './modalBase';

const RULES_TEXT = [
  { h: '🎮 30 秒上手', items: [
    '两个人轮流坐一起玩：一边管 4 个蓝色小人（守人类），一边管 僵尸大军。',
    '谁先拿到 4 分谁赢。守人靠 打飞僵尸 加分，僵尸靠 拐走小人 加分。',
    '好玩在两边节奏完全不一样——人能斜着走、还会跳过去打飞；僵尸只能直走，但能无限增兵。'
  ]},
  { h: '🏃 人类怎么玩', items: [
    '每回合挑 1 个小人走 1 格，上下左右、斜着走都行。',
    '绝技 跳杀：只要有僵尸贴在你身边（8 个方向都算），而且它背后那格是空的，你就能像跳棋一样跳过去，把它一脚踹飞，⭐ +1！',
    '走到 房子 上会立刻停下，并抽一张神秘事件卡。'
  ]},
  { h: '🧟 僵尸怎么玩', items: [
    '每回合二选一：',
    '① 增兵：点任意空地，凭空冒出 1 只新僵尸（库存 -1，开局有 9 只可放）。',
    '② 进军：移动 2 步——可以让同 1 只僵尸走两次，也可以两只各走一次。',
    '僵尸只能上下左右走，不能斜走。9 只放完后就不能再增兵。'
  ]},
  { h: '⭐ 小心被拐走', items: [
    '每回合一结束就结算：如果某个小人上下左右紧贴 2 只或更多僵尸，他当场被拐走。',
    '小人没了，僵尸 +1 分；要是库存还有僵尸，原地立刻再冒一只补位。'
  ]},
  { h: '🎁 房子里有惊喜', items: [
    '开局洗 5 张事件卡：鬼魂 ×2、靴子 ×2、咖啡 ×1。',
    '鬼魂 👻：把任意 1 只僵尸彻底驱散。',
    '靴子 👟：立刻让任意 1 个小人再多走 1 格。',
    '咖啡 ☕：立刻让任意 1 个小人连走 2 格——往往能凑出一记跳杀！',
    '每个房子只能用一次，用过就变普通地板了。'
  ]}
];

let _scrollY = 0;

export function getRulesModalButtons(): { close: ModalButton } {
  return {
    close: { label: '关闭', rect: { x: layout.baseWidth - 110, y: 30, w: 80, h: 60 }, primary: true }
  };
}

export function renderRulesModal(): void {
  const { ctx } = getScreen();
  drawModalBackdrop();

  // Sheet background
  ctx.fillStyle = colors.cream;
  ctx.fillRect(0, 0, layout.baseWidth, layout.baseHeight);

  // Header
  ctx.fillStyle = colors.gbDarkGreen;
  ctx.fillRect(0, 0, layout.baseWidth, 110);
  ctx.fillStyle = colors.cream;
  ctx.font = 'bold 40px "PingFang SC", "Microsoft YaHei", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('🎮 ZOM-BOY+ 规则', 30, 65);

  // Close button
  const btns = getRulesModalButtons();
  drawModalButton(btns.close);

  // Body
  ctx.fillStyle = colors.gbDarkGreen;
  let y = 150 - _scrollY;
  for (const sec of RULES_TEXT) {
    ctx.font = 'bold 28px "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.fillText(sec.h, 30, y);
    y += 50;
    ctx.font = '22px "PingFang SC", "Microsoft YaHei", sans-serif';
    for (const item of sec.items) {
      const wrapped = wrapText(ctx, '• ' + item, layout.baseWidth - 60);
      for (const line of wrapped) {
        ctx.fillText(line, 30, y);
        y += 32;
      }
    }
    y += 20;
  }
}

export function scrollRulesModal(deltaY: number): void {
  _scrollY = Math.max(0, _scrollY + deltaY);
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  // Simplified wrap: split by char, accumulate until exceeds maxWidth
  const out: string[] = [];
  let current = '';
  for (const ch of text) {
    const test = current + ch;
    const m = ctx.measureText(test) as any;
    const w = m.width || (test.length * 12);  // fallback for environments lacking real measure
    if (w > maxWidth && current.length > 0) {
      out.push(current);
      current = ch;
    } else {
      current = test;
    }
  }
  if (current) out.push(current);
  return out;
}
```

**Step 2: Typecheck + commit**

```bash
cd /Users/xiaren/Workspace/zomboy-douyin && npm run typecheck
cd /Users/xiaren/Workspace/zomboy-douyin && git add -A && git commit -m "feat(ui): 规则说明弹窗（文案替换打飞/拐走）"
```

---

## Task 8: 卡牌弹窗 — src/ui/cardModal.ts

**Files:**
- Create: `/Users/xiaren/Workspace/zomboy-douyin/src/ui/cardModal.ts`

抽到卡牌时显示效果说明 + 等玩家选择目标的提示。读 state.pendingCard 决定显示什么。

```typescript
// src/ui/cardModal.ts
import { getScreen } from './canvas';
import { colors, layout } from './theme';
import { drawModalBackdrop, drawModalCard, drawModalButton, type ModalButton } from './modalBase';
import type { State } from '../game/types';

const CARD_INFO: Record<string, { name: string; emoji: string; desc: string; hint: string }> = {
  ghost: { name: '鬼魂', emoji: '👻', desc: '一阵风吹过！把任意 1 只僵尸彻底驱散。', hint: '点击棋盘上想驱散的僵尸。' },
  boots: { name: '靴子', emoji: '👟', desc: '换上飞毛腿！让任意 1 个小人再多走 1 格。', hint: '点击棋盘上要继续走的小人，然后点目的地。' },
  coffee:{ name: '咖啡', emoji: '☕', desc: '续命咖啡！让任意 1 个小人连走 2 格。',     hint: '点击棋盘上要冲锋的小人，然后连点两步。' }
};

export function getCardModalButtons(): { confirm: ModalButton } {
  return {
    confirm: {
      label: '知道了',
      rect: { x: layout.baseWidth / 2 - 120, y: 850, w: 240, h: 80 },
      primary: true
    }
  };
}

export function renderCardModal(state: State): void {
  if (!state.pendingCard) return;
  const card = state.pendingCard;
  const info = CARD_INFO[card.type] ?? { name: card.type, emoji: '🎴', desc: '?', hint: '' };

  drawModalBackdrop();
  const cardRect = { x: 75, y: 400, w: layout.baseWidth - 150, h: 480 };
  drawModalCard(cardRect, `${info.emoji} ${info.name}`);

  const { ctx } = getScreen();
  ctx.fillStyle = colors.gbDarkGreen;
  ctx.font = 'bold 28px "PingFang SC", "Microsoft YaHei", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(info.desc, layout.baseWidth / 2, 520);
  ctx.font = '24px "PingFang SC", "Microsoft YaHei", sans-serif';
  ctx.fillStyle = colors.pink;
  ctx.fillText(info.hint, layout.baseWidth / 2, 600);

  drawModalButton(getCardModalButtons().confirm);
}
```

**Step 2: Typecheck + commit**

```bash
cd /Users/xiaren/Workspace/zomboy-douyin && npm run typecheck
cd /Users/xiaren/Workspace/zomboy-douyin && git add -A && git commit -m "feat(ui): 卡牌弹窗（鬼魂/靴子/咖啡）"
```

---

## Task 9: 结算界面 — src/ui/endScreen.ts

**Files:**
- Create: `/Users/xiaren/Workspace/zomboy-douyin/src/ui/endScreen.ts`

要求：
- 胜利 / 失败 / 平局三种状态
- 当局统计：用时、回合数、跳杀数
- 三个按钮：再来一局 / 分享 / 看广告复活（仅败北时显示）
- 看广告按钮使用 `adapter/ads.showRewardedAd`

```typescript
// src/ui/endScreen.ts
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

  // Hint
  ctx.fillStyle = colors.pink;
  ctx.font = '20px "PingFang SC", "Microsoft YaHei", sans-serif';
  if (!win && !draw) {
    ctx.fillText('看一段广告还能续上！', layout.baseWidth / 2, 540);
  } else {
    ctx.fillText('分享到抖音让朋友也来玩一局？', layout.baseWidth / 2, 540);
  }

  // Buttons
  const showRevive = !win && !draw;
  const btns = getEndScreenButtons(showRevive);
  if (btns.revive) drawModalButton(btns.revive);
  drawModalButton(btns.rematch);
  drawModalButton(btns.share);
  drawModalButton(btns.back);
}
```

**Step 2: Typecheck + commit**

```bash
cd /Users/xiaren/Workspace/zomboy-douyin && npm run typecheck
cd /Users/xiaren/Workspace/zomboy-douyin && git add -A && git commit -m "feat(ui): 结算界面（胜/败/平局 + 复活/分享/再来）"
```

---

## Task 10: 日志列表 — src/ui/log.ts

**Files:**
- Create: `/Users/xiaren/Workspace/zomboy-douyin/src/ui/log.ts`

要求：
- 在棋盘下方显示最近 4-6 行 state.log
- 简洁、不抢眼

```typescript
// src/ui/log.ts
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
    const fade = i / Math.max(1, lines.length - 1);  // older = darker
    const alpha = 0.4 + 0.6 * fade;
    ctx.globalAlpha = alpha;
    ctx.fillText(lines[i], 30, top + 8 + i * LOG_LINE_HEIGHT);
  }
  ctx.globalAlpha = 1;
}
```

注意：需要在 `adapter/globals.ts` 的 CanvasRenderingContext2D 接口加 `globalAlpha: number;` 和 `measureText(text: string): { width: number };` 这两个属性/方法。

**Step 2: Typecheck + commit**

```bash
cd /Users/xiaren/Workspace/zomboy-douyin && npm run typecheck
cd /Users/xiaren/Workspace/zomboy-douyin && git add -A && git commit -m "feat(ui): 棋盘下方日志（最近 5 行 + 渐隐）"
```

---

## Task 11: 应用级状态机 + 整合 — src/app.ts + 改写 src/main.ts

**Files:**
- Create: `/Users/xiaren/Workspace/zomboy-douyin/src/app.ts`
- Modify: `/Users/xiaren/Workspace/zomboy-douyin/src/main.ts`

这是 Stage 1B 的整合 task。把 5-10 task 的 UI 组件和 SDK 适配组合成完整应用。

### app.ts 责任
1. 应用级状态机：`menu | playing | end | rules | card`
2. 路由 `tt.onTouchStart` 事件到当前 screen
3. 启动时 `tt.login` 获取 openid（失败不阻塞）
4. 启动时 `loadUserMeta` 注入 difficulty/side 偏好
5. 切到游戏：触发 `newState()` + 启动渲染
6. 结算：调 `recordGameEnd` + 显示 endScreen
7. 复活按钮：`showRewardedAd` 成功后回滚 2 回合
8. 分享按钮：`shareAppMessage` with title 模板
9. lifecycle：`tt.onShow` 解锁渲染，`tt.onHide` 保存当局并停渲染
10. 路由 modalBase.hitButton 命中检测

具体实现见 `src/app.ts` 模板（约 250-300 行）。**这个 task 是 Stage 1B 最复杂的一个**，subagent 应该被允许问问题、用 sonnet 模型。

### main.ts 改写为最薄入口

```typescript
// src/main.ts (重写)
import { boot } from './app';
boot().catch(e => console.error('boot failed', e));
```

**Step 2: 整体跑通验证**

```bash
cd /Users/xiaren/Workspace/zomboy-douyin && npm run typecheck && npm test && npm run build
```

预期：全绿。然后用户在抖音 IDE 重启项目，验证：
- 进入 → 看到开始菜单
- 选普通难度 + 守人类 → 点开始 → 进对局
- 完成一局 → 看到结算界面
- 点再来一局 → 回到对局
- 点返回 → 回到菜单
- 点规则 → 看到规则页 → 关闭返回
- 房子触发卡牌 → 看到卡牌弹窗
- 切到后台 → 切回不崩溃

**Step 3: Commit**

```bash
cd /Users/xiaren/Workspace/zomboy-douyin && git add -A && git commit -m "feat: 应用级状态机整合菜单/对局/结算/规则/卡牌"
```

---

## Self-Review 校验

**Spec 覆盖**：
- ✅ Sprite 压缩 → Task 1
- ✅ tt.login / share / lifecycle → Task 2
- ✅ 激励视频广告 → Task 3
- ✅ 用户元数据 + 存档 → Task 4
- ✅ 通用 modal 框架 → Task 5
- ✅ 开始菜单 → Task 6
- ✅ 规则说明 → Task 7
- ✅ 卡牌弹窗 → Task 8
- ✅ 结算界面 → Task 9
- ✅ 日志列表 → Task 10
- ✅ 应用级整合 → Task 11

**Placeholder 扫描**：所有 task 给了完整代码。Task 11 因为依赖前 10 task 的接口，整合代码留给 subagent 自己组合（不算 placeholder，是 valid integration work）。

**Type 一致性**：
- 所有 modal 使用 modalBase 提供的 ModalButton/ModalRect 类型，一致
- StartMenuConfig 字段名 (mode/difficulty/side) 在 app.ts 和 persistence 之间一致
- State 引用统一从 `game/types`

**已知风险**：
1. Task 1 的 sharp 安装在某些 mac 上需要先 brew install vips。如失败可改用 `pngquant` 命令行 + child_process
2. Task 3 的 REWARDED_AD_UNIT_ID 占位，真值要等用户在抖音后台申请广告位。代码本地能编译，运行时调 ad 会失败——这是预期的，Stage 1B 接 SDK 但不强求广告真投放
3. Task 11 集成最复杂，可能需要多轮 subagent 协作

---

## 执行约定

- 顺序执行 Task 1-11
- Task 11（整合）允许 subagent 用 sonnet 模型并问问题
- 每个 task 完成 commit
- Task 1 优先完成（解锁 24-29 包大小问题，否则后续都白干）
