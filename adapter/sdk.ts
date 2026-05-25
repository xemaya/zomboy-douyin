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
        _userInfo = { openid: 'local-' + String(res.code ?? '').substring(0, 8) };
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
