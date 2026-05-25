import { describe, it, expect, beforeEach, vi } from 'vitest';

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
    vi.resetModules();
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
