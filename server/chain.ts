import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { keccak256, stringToHex, isAddress, type Address, type Hex } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

/**
 * 链上成绩服务的本地状态。
 * - 评分签名者：优先用环境变量 SCORER_PRIVATE_KEY，否则在 .chain/ 生成本地开发用密钥。
 * - 合约地址：优先用环境变量 ATTEST_CONTRACT_ADDRESS，否则用前端部署后回报的地址。
 * 这里只保存"签名者"密钥，玩家的私钥/助记词永远只在 MetaMask 里。
 */
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIR = path.join(ROOT, ".chain");

const writeJSON = (name: string, value: unknown) => {
  mkdirSync(DIR, { recursive: true });
  writeFileSync(path.join(DIR, name), JSON.stringify(value, null, 2), "utf8");
};

const readJSON = <T>(name: string): T | null => {
  const file = path.join(DIR, name);
  if (!existsSync(file)) return null;
  try {
    return JSON.parse(readFileSync(file, "utf8")) as T;
  } catch {
    return null;
  }
};

function loadScorerKey(): Hex {
  const env = process.env.SCORER_PRIVATE_KEY;
  if (env && /^0x[0-9a-fA-F]{64}$/.test(env)) return env as Hex;
  const saved = readJSON<{ key: Hex }>("scorer.json");
  if (saved?.key && /^0x[0-9a-fA-F]{64}$/.test(saved.key)) return saved.key;
  const key = generatePrivateKey();
  writeJSON("scorer.json", { key, createdAt: new Date().toISOString() });
  return key;
}

export const scorer = privateKeyToAccount(loadScorerKey());

let contract: Address | null = (() => {
  const env = process.env.ATTEST_CONTRACT_ADDRESS;
  if (env && isAddress(env)) return env as Address;
  const saved = readJSON<{ address: Address }>("contract.json");
  return saved?.address && isAddress(saved.address) ? saved.address : null;
})();

export const getContract = () => contract;

export function setContract(address: string): Address {
  if (!isAddress(address)) throw new Error("合约地址格式不正确");
  contract = address as Address;
  writeJSON("contract.json", { address: contract, at: new Date().toISOString() });
  return contract;
}

/** 把一局游戏的 UUID 映射为合约里的 bytes32 gameId（前端用同一算法） */
export const gameIdOf = (runId: string): Hex => keccak256(stringToHex(runId));

export const digestOf = (runId: string, score: number, parts: string[]): Hex =>
  keccak256(stringToHex([runId, score, ...parts].join("|")));

export const CHAIN = {
  id: 10143,
  hexId: "0x279f",
  name: "Monad Testnet",
  rpc: "https://testnet-rpc.monad.xyz",
  explorer: "https://testnet.monadvision.com/",
  faucet: "https://faucet.monad.xyz",
} as const;

export function signScore(input: {
  player: Address;
  runId: string;
  score: number;
  digest: Hex;
  deadline: number;
}) {
  if (!contract) throw new Error("合约尚未登记，请先在前端完成部署");
  return scorer.signTypedData({
    domain: {
      name: "HallucinationHunter",
      version: "1",
      chainId: CHAIN.id,
      verifyingContract: contract,
    },
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
      player: input.player,
      gameId: gameIdOf(input.runId),
      score: BigInt(input.score),
      digest: input.digest,
      deadline: BigInt(input.deadline),
    },
  });
}
