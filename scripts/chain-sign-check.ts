/**
 * 校验服务端 EIP-712 签名能被正确恢复成签名者地址。
 * 用法：npx tsx scripts/chain-sign-check.ts
 * 不会改动正在运行的服务，只会写一份临时合约地址记录，跑完自动清掉。
 */
import { recoverTypedDataAddress } from "viem";
import { existsSync, rmSync } from "node:fs";
import path from "node:path";

async function main() {
  const { setContract, signScore, digestOf, gameIdOf, scorer } = await import("../server/chain");
  const file = path.resolve(process.cwd(), ".chain/contract.json");
  const dummy = "0x1234567890abcdef1234567890abcdef12345678" as const;
  setContract(dummy);

  const player = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8" as const;
  const digest = digestOf("run-test-1", 380, ["ticket:80", "bus:100"]);
  const deadline = Math.floor(Date.now() / 1000) + 900;
  const signature = await signScore({ player, runId: "run-test-1", score: 380, digest, deadline });

  const recovered = await recoverTypedDataAddress({
    domain: { name: "HallucinationHunter", version: "1", chainId: 10143, verifyingContract: dummy },
    types: {
      Score: [
        { name: "player", type: "address" },
        { name: "gameId", type: "bytes32" },
        { name: "score", type: "uint256" },
        { name: "digest", type: "bytes32" },
        { name: "deadline", type: "uint256" },
      ],
    },
    primaryType: "Score",
    message: {
      player,
      gameId: gameIdOf("run-test-1"),
      score: 380n,
      digest,
      deadline: BigInt(deadline),
    },
    signature,
  });

  const ok = recovered.toLowerCase() === scorer.address.toLowerCase();
  console.log("签名者地址 :", scorer.address);
  console.log("恢复出的地址:", recovered);
  console.log("签名长度   :", (signature.length - 2) / 2, "字节");
  console.log("结果       :", ok ? "通过" : "失败");

  if (existsSync(file)) rmSync(file);
  process.exitCode = ok ? 0 : 1;
}

void main();
