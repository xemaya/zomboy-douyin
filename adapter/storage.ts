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
