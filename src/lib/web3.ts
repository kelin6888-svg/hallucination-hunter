import { createConfig, http } from "wagmi";
import { defineChain } from "viem";
import { injected } from "wagmi/connectors";

/** Monad 测试网，第三阶段用于成绩登记合约 */
export const monadTestnet = defineChain({
  id: 10143,
  name: "Monad 测试网",
  nativeCurrency: { name: "Monad", symbol: "MON", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://testnet-rpc.monad.xyz"] },
  },
  blockExplorers: {
    default: {
      name: "Monad 区块浏览器",
      url: "https://testnet.monadvision.com",
    },
  },
  testnet: true,
});

export const CHAIN_LABEL = "Monad 测试网";
export const CHAIN_ID = monadTestnet.id;

/** 成绩登记合约地址：第三阶段部署后填入 */
export const ATTEST_CONTRACT_ADDRESS =
  "0x0000000000000000000000000000000000000000" as const;

export const wagmiConfig = createConfig({
  chains: [monadTestnet],
  connectors: [injected({ shimDisconnect: true })],
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
