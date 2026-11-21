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

## Monad 接入（真实可用）

链：**Monad Testnet**（chainId `10143` / `0x279f`，货币 MON，RPC `https://testnet-rpc.monad.xyz`，浏览器 `https://testnet.monadvision.com`，水龙头 `https://faucet.monad.xyz`）。

两种入口：
- **免费体验**：不连钱包，五幕可完整游玩，成绩只存在本地/服务端，页面标明未上链。
- **链上模式**：从「连接钱包」进入 **/wallet 链上工作台**，四步走完就完成真实上链。

### 链上工作台怎么用（全过程由 MetaMask 确认，私钥不进代码）

1. 打开 http://127.0.0.1:4176/wallet
2. 点「连接 MetaMask」→ 在钱包弹窗点「连接」
3. 网络不对时点「切换到 Monad 测试网」→ 钱包弹窗会提示添加/切换网络（chainId 10143）
4. 余额为 0 时先去 https://faucet.monad.xyz 领测试 MON
5. 点「部署合约」→ 钱包弹窗确认**一笔合约创建交易**，用途：部署成绩记录合约（构造参数是服务端评分签名地址）
6. 确认后页面显示合约地址，并自动登记到服务端 `.chain/contract.json`
7. 点「开局并开始游戏」→ 钱包确认**第二笔交易**，用途：`startGame(gameId)` 记录玩家地址与开局时间，然后进入五幕
8. 玩完五幕回到 /wallet，点「提交并上链」→ 服务端按行动重算分数并签 EIP-712，你在钱包里确认 `submitScore`
9. 页面读回 `getGame` 显示链上玩家、状态、分数与摘要，附区块浏览器链接

页面上的每个动作都有独立状态：**等待钱包签名 / 已提交等待确认 / 已确认 / 失败（含原因）**。

### 合约

`contracts/HallucinationHunter.sol`（Solidity 0.8.24）

- `startGame(bytes32 gameId)`：记录玩家、开局时间，同一 gameId 不能重复开
- `submitScore(gameId, score, digest, deadline, signature)`：校验 EIP-712 签名后写入成绩
- EIP-712 域：`name=HallucinationHunter, version=1, chainId, verifyingContract`
- 消息：`player / gameId / score / digest / deadline`
- 已结算不可重复提交、分数上限 500、仅玩家本人可结算、owner 可更换签名地址
- 查询：`getGame` / `gamesOf` / `gameCount` / `bestScore`

服务端入口：
- `GET /api/chain/config`：链参数、合约地址、评分签名地址
- `POST /api/chain/contract`：登记部署后的合约地址
- `POST /api/runs/:id/attest`：校验玩家与局号，按行动重算分数并返回 EIP-712 签名

评分签名密钥：优先读 `SCORER_PRIVATE_KEY`，否则自动生成并保存在 `.chain/scorer.json`（已 gitignore）。它只用于签成绩，和你的钱包私钥无关。

合约测试：

```bash
npm run contract:test      # 9 项：开局 / 正常结算 / 重复结算 / 伪造签名 / 越权 / 超分 / 过期 / 换签名者 / 未开局
npx tsx scripts/chain-sign-check.ts   # 校验服务端签名可恢复为签名者地址
```

可选：不用浏览器也能部署（需要私钥，不推荐在公用机器上用）

```bash
cp .env.example .env       # 填 DEPLOYER_PRIVATE_KEY 与 SCORER_ADDRESS
npm run contract:deploy
```

## 结构与判定

```
shared/game/content.ts   场景文案、动作、商品与规则常量
shared/game/rules.ts     确定性规则：每个场景的结算、购物车金额、结局判定
server/index.ts          局记录、逐关提交、服务端重算、EIP-712 签名入口
src/pages/Play.tsx       手机界面 + 资源条 + 结算抽屉
src/pages/WalletPage.tsx 链上工作台：连接 / 部署 / 开局 / 交成绩
src/chain/artifact.ts    合约 ABI 与字节码（由 artifacts 生成）
server/chain.ts          评分签名密钥、合约登记、EIP-712 签名
src/game/Scenes.tsx      五个模拟 App 的界面
contracts/               成绩记录合约
test/contract.test.cjs   合约测试
tests/game.test.ts       规则测试
```

服务端保存每局行动序列，用同一份 `resolveScene` 重算，客户端无法自报分数；同一局同一关只能提交一次，越关提交返回 409。

## 已知边界

1. 合约已编译并通过 9 项测试；**是否已部署取决于你是否在 /wallet 点过部署**，页面不会伪造地址或交易哈希。
2. 局记录保存在服务端内存，服务重启后旧局失效（前端会回首页重新开始）。
3. 链上模式必须先在 /wallet 完成部署，再开局；未部署时「开局」按钮不可用。
4. 演示物料在 `pitch/`：`幻觉猎人-黑客松路演.pptx`（4 页）、`VIDEO-60s.md`（60 秒分镜）、`promo/hallucination-hunter-60s.mp4`（成片）。
