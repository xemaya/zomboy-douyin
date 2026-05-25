// src/main.ts — 启动入口 + 渲染循环
import { newState, clickCell } from './game/state';
import { planTurn } from './game/ai';
import { legalMoves, legalJumps, pieceById } from './game/rules';
import { getScreen, clearScreen } from './ui/canvas';
import { loadAllSprites } from './ui/sprites';
import { registerInput } from './ui/input';
import { drawBoard, type Highlight } from './ui/boardRenderer';
import { drawHud } from './ui/hud';
import { colors, layout } from './ui/theme';
import type { State } from './game/types';

// ─── Module-level state ────────────────────────────────────────────────────
let state: State;
let dirty = true;

// ─── Winner overlay ────────────────────────────────────────────────────────

function drawWinnerOverlay(): void {
  if (!state.winner) return;

  const { ctx } = getScreen();

  // Semi-transparent black overlay
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.fillRect(0, 0, layout.baseWidth, layout.baseHeight);

  // Centered text
  let text: string;
  if (state.winner === 'survivor') {
    text = '🎉 你赢了！';
  } else if (state.winner === 'zombie') {
    text = '😵 你输了';
  } else {
    text = '🤝 平局';
  }

  ctx.fillStyle = colors.cream;
  ctx.font = 'bold 64px "PingFang SC", "Microsoft YaHei", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, layout.baseWidth / 2, layout.baseHeight / 2);
}

// ─── Compute highlight array from current selection ────────────────────────

function computeHighlights(): Highlight[] {
  if (!state.selectedPieceId) return [];

  const piece = pieceById(state, state.selectedPieceId);
  if (!piece) return [];

  const highlights: Highlight[] = [];

  // Legal one-step moves
  for (const m of legalMoves(state, piece)) {
    highlights.push({ r: m.r, c: m.c, kind: 'move' });
  }

  // Legal jumps (survivor only; legalJumps returns [] for zombies)
  for (const j of legalJumps(state, piece)) {
    highlights.push({ r: j.destR, c: j.destC, kind: 'jump' });
  }

  return highlights;
}

// ─── AI turn ───────────────────────────────────────────────────────────────

function scheduleAiTurn(): void {
  // Use setTimeout-like delay for the AI turn so the render shows the updated
  // board before the AI starts processing.
  // In the Douyin mini-game environment setTimeout is available (via polyfill).
  setTimeout(() => {
    if (state.winner) return;
    if (state.turnSide !== 'zombie') return;

    const clicks = planTurn(state, 'zombie', 'easy');
    for (const { r, c } of clicks) {
      clickCell(state, r, c);
    }
    dirty = true;
  }, 400);
}

// ─── Input handler ─────────────────────────────────────────────────────────

function handleTap(r: number, c: number): void {
  // Ignore taps when game is over
  if (state.winner) return;

  // Ignore taps when it's not the player's turn
  if (state.turnSide !== 'survivor') return;

  // Mutate state in-place (clickCell returns void)
  clickCell(state, r, c);
  dirty = true;

  // After clickCell the turnSide may have changed to 'zombie' (turn completed).
  // We read it through a local variable to avoid TypeScript's control-flow
  // narrowing (which still sees 'survivor' from the guard above).
  const nowSide: string = state.turnSide;
  if (nowSide === 'zombie' && !state.winner) {
    scheduleAiTurn();
  }
}

// ─── Render loop ───────────────────────────────────────────────────────────

function renderLoop(): void {
  if (dirty) {
    clearScreen(colors.bg);
    drawHud(state);

    const highlights = computeHighlights();
    drawBoard(state, highlights);

    if (state.winner) {
      drawWinnerOverlay();
    }

    dirty = false;
  }

  requestAnimationFrame(renderLoop);
}

// ─── Boot ──────────────────────────────────────────────────────────────────

async function boot(): Promise<void> {
  // 1. Initialize canvas
  getScreen();

  // 2. Load all sprite PNGs
  await loadAllSprites();

  // 3. Initialize game state
  state = newState();

  // 4. Register touch input
  registerInput((r, c) => handleTap(r, c));

  // 5. Start the render loop — game starts as zombie turn, schedule AI immediately
  // Note: newState() sets turnSide to 'zombie' initially, so kick off AI first turn.
  if (state.turnSide === 'zombie' && !state.winner) {
    scheduleAiTurn();
  }

  renderLoop();
}

boot().catch(e => console.error('boot failed', e));
