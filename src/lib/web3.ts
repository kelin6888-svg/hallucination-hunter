import { createConfig, http } from "wagmi";
import { defineChain, type Address } from "viem";
import { injected, metaMask } from "wagmi/connectors";

/** Monad 测试网（chainId 10143 / 0x279f） */
export const monadTestnet = defineChain({
  id: 10143,
  name: "Monad Testnet",
  nativeCurrency: { name: "Monad", symbol: "MON", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://testnet-rpc.monad.xyz"] },
  },
  blockExplorers: {
    default: {
      name: "Monad Vision",
      url: "https://testnet.monadvision.com",
    },
  },
  testnet: true,
});

export const CHAIN_LABEL = "Monad 测试网";
export const CHAIN_ID = monadTestnet.id;
export const EXPLORER = "https://testnet.monadvision.com";
export const FAUCET = "https://faucet.monad.xyz";

const STORE_KEY = "hh-contract-address";

/** 合约地址：环境变量优先，其次用链上工作台部署后记在本地 */
export function getContractAddress(): Address | null {
  const env = (import.meta.env.VITE_ATTEST_CONTRACT ?? "").trim();
  if (/^0x[0-9a-fA-F]{40}$/.test(env)) return env as Address;
  const saved = localStorage.getItem(STORE_KEY) ?? "";
  return /^0x[0-9a-fA-F]{40}$/.test(saved) ? (saved as Address) : null;
}

export function setContractAddress(address: Address) {
  localStorage.setItem(STORE_KEY, address);
}

export const wagmiConfig = createConfig({
  chains: [monadTestnet],
  connectors: [metaMask(), injected({ shimDisconnect: true })],
  transports: {
    [monadTestnet.id]: http("https://testnet-rpc.monad.xyz"),
  },
  ssr: false,
});

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
