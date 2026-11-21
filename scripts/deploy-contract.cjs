const hre = require("hardhat");

async function main() {
  const signerAddress = process.env.SCORER_ADDRESS;
  if (!signerAddress) throw new Error("缺少 SCORER_ADDRESS（服务端签名地址）");
  const factory = await hre.ethers.getContractFactory("HallucinationHunter");
  const contract = await factory.deploy(signerAddress);
  await contract.waitForDeployment();
  console.log("合约地址：", contract.target);
  console.log("链 ID：", (await hre.ethers.provider.getNetwork()).chainId.toString());
}

main().catch((err) => { console.error(err); process.exitCode = 1; });
