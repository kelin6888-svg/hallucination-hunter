require("@nomicfoundation/hardhat-ethers");
require("@nomicfoundation/hardhat-chai-matchers");
require("dotenv").config();

const PK = process.env.DEPLOYER_PRIVATE_KEY;

module.exports = {
  solidity: { version: "0.8.24", settings: { optimizer: { enabled: true, runs: 200 } } },
  networks: {
    monadTestnet: {
      url: process.env.MONAD_RPC ?? "https://testnet-rpc.monad.xyz",
      chainId: 10143,
      accounts: PK ? [PK] : [],
    },
  },
};
