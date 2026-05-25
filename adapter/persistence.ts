// adapter/persistence.ts
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
