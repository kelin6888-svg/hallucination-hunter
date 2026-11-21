/**
 * Monad 测试网部署前自检：确认 RPC、链号、gas 价格，以及合约创建交易能否通过 EVM 校验。
 * 用法：npx tsx scripts/monad-preflight.ts
 */
import { createPublicClient, defineChain, encodeDeployData, formatEther, formatGwei, http } from "viem";
import { HH_ABI, HH_BYTECODE } from "../src/chain/artifact";

const monad = defineChain({
  id: 10143,
  name: "Monad Testnet",
  nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
  rpcUrls: { default: { http: ["https://testnet-rpc.monad.xyz"] } },
  blockExplorers: { default: { name: "MonadVision", url: "https://testnet.monadvision.com" } },
});

const client = createPublicClient({ chain: monad, transport: http() });

async function main() {
  const chainId = await client.getChainId();
  const block = await client.getBlockNumber();
  const gasPrice = await client.getGasPrice();
  console.log("链号       :", chainId, chainId === 10143 ? "（正确）" : "（异常）");
  console.log("最新区块   :", block.toString());
  console.log("gas 价格   :", formatGwei(gasPrice), "gwei");

  // 仅用于估算：这个地址没有测试币，估不出来就说明只差余额
  const probe = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8" as const;
  const data = encodeDeployData({
    abi: HH_ABI,
    bytecode: HH_BYTECODE,
    args: ["0x2e7e0ff29b01D113f9466994F6d4134477f6Aa7b"],
  });
  console.log("部署数据   :", ((data.length - 2) / 2).toLocaleString(), "字节");

  try {
    const gas = await client.estimateGas({ account: probe, data });
    console.log("估算 gas   :", gas.toString(), "→ 实际约", formatEther(gas * gasPrice), "MON");
  } catch (err) {
    const msg = (err as Error).message ?? String(err);
    const short = msg.split("\n")[0].slice(0, 160);
    console.log("估算结果   : 未通过 ——", short);
    console.log("说明       : 若是 insufficient funds，说明字节码与构造参数本身没问题，只差测试币。");
  }
}

void main();
