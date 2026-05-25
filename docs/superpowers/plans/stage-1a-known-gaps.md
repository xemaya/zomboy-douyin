# Stage 1A 已知缺陷（移交 Stage 1B/1C 处理）

Stage 1A 范围明确：让 zomboy 在抖音 IDE 里**走完一局完整对战**。下列项**有意识地未做**，移交后续阶段。

## UI 层（Stage 1B）

1. **无开始菜单** — main.ts 硬编码 PVE + easy AI 直接进局，没有难度选择、PVP 入口
2. **无规则弹窗** — 现有 rulesModal.ts（原 zomboy DOM 版）没迁移；玩家只能盲玩
3. **无卡牌弹窗** — 房子触发会消耗，但抽到的鬼魂/靴子/咖啡卡没有 UI 呈现（游戏逻辑会执行，玩家看不见过程）
4. **无回合切换 / 吃子 / 感染动画** — 状态变化是瞬时的，没有过渡动画
5. **HUD 无日志列表** — state.log 字段没接进 UI，玩家看不到事件流
6. **HUD 无当前阶段细分提示** — 僵尸有"召唤 / 移动 2 次"两种选项，状态机内部知道，UI 没显示
7. **无"再来一局"按钮** — 胜利 overlay 是死状态，只能重启 IDE
8. **sprite 仍为 emoji-light 版** — 例如 ☠️/🧟 在 UI 文字里仍然出现（rulesModal 未迁移所以暂时没出现，但 main.ts 的胜利文案里有 😵）

## 玩法层（Stage 1B/1C）

9. **每回合无超时** — 玩家可无限思考，违背抖音模式 90 秒原则（Stage 1C 接超时）
10. **AI 难度固定 easy** — 没有 medium/hard 切换 UI（state.ts 支持但 main.ts 没暴露）
11. **没有抖音模式默认参数** — 仍是经典模式（4 杀胜、9 库存、4 房子）。Stage 1C 改为 3 杀胜 + 6 库存 + 2 房子 + 起始 1 zombie + 7 秒倒计时
12. **僵尸先手 vs 玩家先手** — 现在 newState() 默认 turnSide='zombie' 所以 boot() 里立刻调度 AI 首回合。这导致首次见到棋盘后玩家要等 ~400ms AI 才出招。可以接受但需要在文案上提示

## SDK 层（Stage 1B）

13. **未接入 tt 广告 API** — `tt.createRewardedVideoAd` / `tt.createInterstitialAd` 完全没接
14. **未接入 tt.requestPayment** — IAP 三档（去广告 / 角色解锁）没接
15. **未接入 tt.startGameRecording / shareVideo** — 短视频自动生成机制是 Stage 1C 核心
16. **未接入 tt.shareAppMessage** — 好友分享没接
17. **未接入 tt.SensitiveWordCheck** — 没有 UGC 输入位（暂不需要），等 Stage 1C 加昵称 / 自定义内容时再接
18. **未接入 tt.login** — 没有玩家身份；Stage 1B 接（用于统计 + 跨端存档）
19. **未接入 tt.onShow / tt.onHide** — 切后台不会自动暂停或保存

## 数据持久化（Stage 1B）

20. **每次启动重新随机地图** — adapter/storage.ts 写好了但没人用
21. **金币 / 解锁 / 段位 / 关卡星数** — 完全没有概念（Stage 1C 加成长系统时引入）
22. **当局未完成不保存** — 切到后台或杀进程后整局丢失

## 文案与审核（Stage 1C）

23. **应用名 / 商店简介 / 适龄选择 / 软著名** — 全部待补
24. **代码内仍有 zombie / kill / infection 字段** — 这是内部命名，UI 显示已用 ⭐/👻/拐走，代码不强求改（增加迁移成本，无审核风险）
25. **`zombie_q.png` 是占位** — 用户用 GPT 生成的 Q 版僵尸 sprite 上线前必须替换为审核安全版
26. **emoji 替换** — main.ts 胜负 overlay 用了 😵/🎉/🤝，可考虑替换为 ⭐/💫（Stage 1C 微调）

## 未使用资产

27. **`houseEmpty` sprite 未引用** — Terrain enum 只有 4 个值，没有 `house_empty`。SPRITE_PATHS 里保留了 key 但 tileToSprite 不会用到。可以在 1B 清理掉

## 已知微小技术债

28. **adapter/globals.ts 的 CanvasRenderingContext2D 手写 declaration** — 当 Stage 1B 添加新 Canvas API 调用时，需要在此扩展（已加 9 个方法）
29. **main.ts 的 TS 控制流绕过** — `const nowSide: string = state.turnSide;` 是 TS 窄化限制的 workaround。可以提取为 helper `function readTurnSide(state: State): string` 让意图更明显（非紧急）

## 不是 Stage 1A 范围的事情，但要提早开始

- **美术资产生成**（用户并行进行中）：7 张 PNG 必须在抖音 IDE 首跑前到位
- **抖音开发者账号注册**：用于真机调试 + 提审（Stage 1B 开始用）
