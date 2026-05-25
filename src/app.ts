// src/app.ts — 应用级状态机
// 5 screens: menu | playing | rules | card | end
// Touch routing is handled here directly (not via input.ts registerInput)
// because we need finer-grained routing to modal buttons vs board cells.

import { newState, clickCell } from './game/state';
import { planTurn, type Level } from './game/ai';
import { legalMoves, legalJumps, pieceById } from './game/rules';
import type { State, Side } from './game/types';

import { getScreen, clearScreen } from './ui/canvas';
import { loadAllSprites } from './ui/sprites';
import { colors, layout } from './ui/theme';
import { drawBoard, pixelToCell, type Highlight } from './ui/boardRenderer';
import { drawHud } from './ui/hud';
import { drawLog } from './ui/log';
import { hitButton } from './ui/modalBase';

import { renderStartMenu, getStartMenuButtons, type StartMenuConfig } from './ui/startMenu';
import { renderRulesModal, getRulesModalButtons, scrollRulesModal } from './ui/rulesModal';
import { renderCardModal, getCardModalButtons } from './ui/cardModal';
import { renderEndScreen, getEndScreenButtons } from './ui/endScreen';

import { login, shareAppMessage, onAppShow, onAppHide } from '../adapter/sdk';
import { showRewardedAd } from '../adapter/ads';
import { loadUserMeta, saveUserMeta, recordGameEnd, saveActiveGame, clearActiveGame } from '../adapter/persistence';

declare const tt: any;

// ─── Screen type ───────────────────────────────────────────────────────────

type Screen = 'menu' | 'playing' | 'rules' | 'card' | 'end';

// ─── Module-level state ────────────────────────────────────────────────────

let screen: Screen = 'menu';
let cfg: StartMenuConfig = { mode: 'pve', difficulty: 'easy', side: 'survivor' };
let state: State = newState();   // placeholder; replaced in startGame()
let playerSide: Side = 'survivor';
let gameStartTime: number = 0;
let dirty = true;

// Touch tracking for rules modal scrolling
let _lastTouchY: number | null = null;

// ─── computeHighlights ────────────────────────────────────────────────────

function computeHighlights(): Highlight[] {
  if (!state.selectedPieceId) return [];
  const piece = pieceById(state, state.selectedPieceId);
  if (!piece) return [];
  const highlights: Highlight[] = [];
  for (const m of legalMoves(state, piece)) highlights.push({ r: m.r, c: m.c, kind: 'move' });
  for (const j of legalJumps(state, piece)) highlights.push({ r: j.destR, c: j.destC, kind: 'jump' });
  return highlights;
}

// ─── Render dispatcher ────────────────────────────────────────────────────

function renderLoop(): void {
  if (dirty) {
    clearScreen(colors.bg);
    switch (screen) {
      case 'menu':
        renderStartMenu(cfg);
        break;
      case 'rules':
        renderRulesModal();
        break;
      case 'playing':
        drawHud(state);
        drawBoard(state, computeHighlights());
        drawLog(state);
        break;
      case 'card':
        drawHud(state);
        drawBoard(state, computeHighlights());
        renderCardModal(state);
        break;
      case 'end':
        drawHud(state);
        drawBoard(state, []);
        renderEndScreen(state, playerSide, {
          turns: state.turnNumber,
          durationSec: (Date.now() - gameStartTime) / 1000 | 0
        });
        break;
    }
    dirty = false;
  }
  requestAnimationFrame(renderLoop);
}

// ─── AI turn scheduling ───────────────────────────────────────────────────

function scheduleAiTurn(): void {
  setTimeout(() => {
    if (state.winner) return;
    if (state.turnSide === playerSide) return;
    const aiSide = state.turnSide;
    const clicks = planTurn(state, aiSide, cfg.difficulty as Level);
    for (const { r, c } of clicks) {
      clickCell(state, r, c);
    }
    dirty = true;
    if (state.winner) { onGameEnd(); return; }
    if (state.pendingCard) { screen = 'card'; return; }
  }, 400);
}

// ─── Game lifecycle ───────────────────────────────────────────────────────

function startGame(): void {
  state = newState();
  playerSide = cfg.side as Side;
  gameStartTime = Date.now();
  screen = 'playing';
  dirty = true;

  // If AI moves first (zombie always goes first per newState), schedule AI
  if (cfg.mode !== 'pvp' && state.turnSide !== playerSide) {
    scheduleAiTurn();
  }
}

function onGameEnd(): void {
  // state.winner is guaranteed non-null here; cast is safe
  const winner = state.winner as 'survivor' | 'zombie' | 'draw';
  recordGameEnd(winner, playerSide);
  clearActiveGame();
  screen = 'end';
  dirty = true;
}

// ─── Touch handlers per screen ────────────────────────────────────────────

function handleMenuTouch(px: number, py: number): void {
  const btns = getStartMenuButtons();
  const allBtns = Object.values(btns);
  const idx = hitButton(allBtns, px, py);
  if (idx < 0) return;
  const key = (Object.keys(btns) as Array<keyof typeof btns>)[idx];

  switch (key) {
    case 'modePve':      cfg = { ...cfg, mode: 'pve' };         break;
    case 'modePvp':      cfg = { ...cfg, mode: 'pvp' };         break;
    case 'diffEasy':     cfg = { ...cfg, difficulty: 'easy' };   break;
    case 'diffMed':      cfg = { ...cfg, difficulty: 'medium' }; break;
    case 'diffHard':     cfg = { ...cfg, difficulty: 'hard' };   break;
    case 'sideSurvivor': cfg = { ...cfg, side: 'survivor' };     break;
    case 'sideZombie':   cfg = { ...cfg, side: 'zombie' };       break;
    case 'start': {
      const meta = loadUserMeta();
      meta.preferredDifficulty = cfg.difficulty;
      meta.preferredSide = cfg.side;
      saveUserMeta(meta);
      startGame();
      return;
    }
    case 'rules':
      screen = 'rules';
      break;
  }
  dirty = true;
}

function handleRulesTouch(px: number, py: number): void {
  const btns = getRulesModalButtons();
  if (hitButton([btns.close], px, py) === 0) {
    screen = 'menu';
    dirty = true;
  }
}

function handlePlayingTouch(px: number, py: number): void {
  if (state.winner) return;

  // In PVP mode, both sides tap; in PVE, only player's side taps
  if (cfg.mode !== 'pvp' && state.turnSide !== playerSide) return;

  const cell = pixelToCell(px, py);
  if (!cell) return;

  clickCell(state, cell.r, cell.c);
  dirty = true;

  if (state.winner) { onGameEnd(); return; }
  if (state.pendingCard) { screen = 'card'; return; }

  // After human turn ends, schedule AI if applicable
  if (cfg.mode !== 'pvp') {
    const nowSide: string = state.turnSide;
    if (nowSide !== playerSide) {
      scheduleAiTurn();
    }
  }
}

function handleCardTouch(px: number, py: number): void {
  const btn = getCardModalButtons();
  if (hitButton([btn.confirm], px, py) === 0) {
    screen = 'playing';
    dirty = true;
    return;
  }
  // Treat as a board tap to resolve the card
  const cell = pixelToCell(px, py);
  if (!cell) return;
  clickCell(state, cell.r, cell.c);
  dirty = true;

  if (state.winner) { onGameEnd(); return; }
  if (!state.pendingCard) {
    screen = 'playing';
    if (cfg.mode !== 'pvp') {
      const nowSide: string = state.turnSide;
      if (nowSide !== playerSide) scheduleAiTurn();
    }
  }
}

function handleEndTouch(px: number, py: number): void {
  const playerWon = state.winner === playerSide;
  const draw = state.winner === 'draw';
  const showRevive = !playerWon && !draw;
  const btns = getEndScreenButtons(showRevive);

  if (showRevive && btns.revive && hitButton([btns.revive], px, py) === 0) {
    showRewardedAd().then(watched => {
      if (watched) {
        // Stage 1B simple revive: clear winner, undo zombie kill count slightly
        state.winner = null;
        if (state.zombieKills >= 4) state.zombieKills = 3;
        screen = 'playing';
        dirty = true;
      }
    }).catch(e => console.warn('ad failed', e));
    return;
  }
  if (hitButton([btns.rematch], px, py) === 0) {
    startGame();
    return;
  }
  if (hitButton([btns.share], px, py) === 0) {
    const verb = playerWon ? '我刚通关了僵尸棋！' : '差一点就赢了，来挑战一下？';
    shareAppMessage({ title: verb });
    return;
  }
  if (hitButton([btns.back], px, py) === 0) {
    screen = 'menu';
    dirty = true;
  }
}

// ─── Top-level touch router ───────────────────────────────────────────────

function handleTouch(evt: any): void {
  const t = evt.touches?.[0] ?? evt.changedTouches?.[0];
  if (!t) return;

  const { width, height } = getScreen();
  const px = t.clientX * (layout.baseWidth / width);
  const py = t.clientY * (layout.baseHeight / height);

  // Track last touch Y for rules scrolling
  _lastTouchY = py;

  switch (screen) {
    case 'menu':    return handleMenuTouch(px, py);
    case 'rules':   return handleRulesTouch(px, py);
    case 'playing': return handlePlayingTouch(px, py);
    case 'card':    return handleCardTouch(px, py);
    case 'end':     return handleEndTouch(px, py);
  }
}

// ─── boot() — application entry point ────────────────────────────────────

export async function boot(): Promise<void> {
  // 1. Init canvas
  getScreen();

  // 2. Load sprites
  await loadAllSprites();

  // 3. Best-effort login (don't block on failure)
  login().catch(e => console.warn('login failed', e));

  // 4. Restore preferences
  const meta = loadUserMeta();
  cfg = {
    mode: 'pve',
    difficulty: meta.preferredDifficulty,
    side: meta.preferredSide
  };

  // 5. Lifecycle hooks
  onAppShow(() => { dirty = true; });
  onAppHide(() => {
    if (screen === 'playing') saveActiveGame(state);
  });

  // 6. Register touch handler directly (input.ts registerInput is too coarse
  //    for multi-screen routing; we need raw touch events here)
  tt.onTouchStart(handleTouch);

  // 7. Rules modal scrolling via touch drag
  tt.onTouchMove?.((evt: any) => {
    if (screen !== 'rules') return;
    const t = evt.touches?.[0] ?? evt.changedTouches?.[0];
    if (!t) return;
    const { width, height } = getScreen();
    const py = t.clientY * (layout.baseHeight / height);
    if (_lastTouchY !== null) {
      const delta = _lastTouchY - py;  // dragging up = scroll down (positive delta)
      if (Math.abs(delta) > 2) {
        scrollRulesModal(delta);
        dirty = true;
      }
    }
    _lastTouchY = py;
  });

  tt.onTouchEnd?.(() => { _lastTouchY = null; });
  tt.onTouchCancel?.(() => { _lastTouchY = null; });

  // 8. Start at menu screen
  screen = 'menu';
  dirty = true;
  renderLoop();
}
