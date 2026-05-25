import { describe, it, expect } from 'vitest';

describe('storage polyfill', () => {
  it('returns defaultValue when key missing', async () => {
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
