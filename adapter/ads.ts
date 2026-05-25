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
