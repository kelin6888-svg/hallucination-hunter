# 失控的周六 · 幻觉猎人 Hallucination Hunter

**AI 给你答案，后果由你承担。**

一款关于「AI 信任与核实成本」的互动叙事游戏。周六有五个生活任务，手机里的生活助手会一直给建议：有时对，有时错，而且从来不说「我不确定」。你只有 180 分钟和 500 元预算。

## 玩法（已重构，不再是阅读理解）

每个场景 = 一个模拟 App 界面 + 一句 AI 建议 + 若干真实可点的操作：

| 场景 | 应用 | AI 的错误 | 可以怎么做 |
| --- | --- | --- | --- |
| 01 抢票危机 | 票务 | 把陌生私聊链接说成「官方备用通道」 | 查订单、查账号、查公告，或直接付款 |
| 02 预算保卫战 | 商城 | 96 元报成 56 元，还说在预算内 | 加减商品、开关优惠券、看规则、按计算器 |
| 03 消失的快递 | 物流 | 把「已发出」推断成「已到小区」 | 看完整物流、打电话问站、看地图、直接去门口 |
| 04 不存在的规则 | 社区 | 编造「须知第七条」收 50 元 | 看活动页、数须知条款、问工作人员、直接交钱 |
| 05 最后的信任 | 出行 | **这次完全正确** | 直接出发、核对一次，或反复核实到错过班车 |

核心不是找错别字，而是：**决定信不信、花不花时间核实、承担什么后果。**

- 时间 180 分钟、资金 500 元、任务 5 件，实时显示。
- 错误决定会真实扣钱、扣时间，并进入补救流程（举报追回、找工作人员退款、白跑后再去配送站）。
- 过于谨慎也有代价：末班车场景里，第 2 次核实就会错过班车。
- 每关满分 100，共 500；分数按「完成任务 / 避免损失 / 有效核实」三部分计算，不止一条通关路线能拿高分。
- 结局由实际记录决定：盲目信任者、过度怀疑者、高效协作者、冷静调查员、普通的一天。

## 运行

```bash
npm install
npm run dev          # 前端 4176 + 判定服务 8787
```

打开 **http://127.0.0.1:4176/**

> 4175 被本机另一个无关项目占用，本项目固定 4176。

常用命令：

```bash
npm test                  # 11 项规则/计分单测（node:test）
npm run typecheck         # 前端 + 服务端类型检查
npm run build             # 生产构建
npm run contract:compile  # 合约编译
npm run contract:test     # 合约测试（9 项）
node scripts/playthrough.mjs   # 浏览器实际操作五关并校验分数/结局
```

## Monad 接入

- 链：Monad 测试网（chainId 10143），钱包用 wagmi + viem（injected）。
- 两种入口：**免费体验**（无需钱包，标明未上链）与**链上模式**（连接钱包后开局）。
- 游玩过程全程链下，只有开局与结算各一次签名；游戏内购物/付款均为模拟，不触发真实交易。
- 合约：`contracts/HallucinationHunter.sol`
  - `startGame(gameId)` 记录开局与玩家地址
  - `submitScore(gameId, score, digest, deadline, signature)` 校验 EIP-712 签名后写入成绩
  - EIP-712 域绑定 `name/version/chainId/verifyingContract`，消息绑定 `player/gameId/score/digest/deadline`
  - 已结算不可重复提交；分数上限 500；仅玩家本人可结算；owner 可更换签名地址
  - 查询：`getGame`、`gamesOf`、`gameCount`、`bestScore`
- 服务端 `/api/runs/:id/attest` 生成成绩摘要并（配置私钥后）返回 EIP-712 签名。**当前未配置部署私钥与合约地址，接口如实返回「未开放」，页面不显示任何伪造交易哈希。**

部署步骤（需要你自己完成，因为没有部署私钥与测试币）：

```bash
cp .env.example .env      # 填入 DEPLOYER_PRIVATE_KEY、SCORER_ADDRESS
npm run contract:deploy   # 输出合约地址
# 再把合约地址填进 .env 的 ATTEST_CONTRACT_ADDRESS 与前端 src/lib/web3.ts
```

## 结构与判定

```
shared/game/content.ts   场景文案、动作、商品与规则常量
shared/game/rules.ts     确定性规则：每个场景的结算、购物车金额、结局判定
server/index.ts          局记录、逐关提交、服务端重算、EIP-712 签名入口
src/pages/Play.tsx       手机界面 + 资源条 + 结算抽屉
src/game/Scenes.tsx      五个模拟 App 的界面
contracts/               成绩记录合约
test/contract.test.cjs   合约测试
tests/game.test.ts       规则测试
```

服务端保存每局行动序列，用同一份 `resolveScene` 重算，客户端无法自报分数；同一局同一关只能提交一次，越关提交返回 409。

## 已知边界

1. 合约已编译并通过 9 项测试，**未部署**（缺私钥/测试币），前端不显示假交易。
2. 局记录保存在服务端内存，服务重启后旧局失效（前端会回首页重新开始）。
3. 链上模式的钱包签名流程已接好钱包连接与开局记录，正式上链需先完成部署与地址配置。
