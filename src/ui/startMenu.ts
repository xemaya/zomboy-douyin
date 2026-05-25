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
  return {
    modePve:     { label: '单人',  rect: { x: 60,   y: 320, w: 290, h: 80 } },
    modePvp:     { label: '双人同屏',  rect: { x: 400,  y: 320, w: 290, h: 80 } },
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
  ctx.fillText('僵尸跳棋', layout.baseWidth / 2, 150);
  ctx.font = 'bold 40px "PingFang SC", "Microsoft YaHei", sans-serif';
  ctx.fillStyle = colors.pink;
  ctx.fillText('末日生存对战', layout.baseWidth / 2, 220);

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
