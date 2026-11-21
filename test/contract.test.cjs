const { expect } = require("chai");
const { ethers } = require("hardhat");

const MAX = 500;
const GAME_ID = ethers.keccak256(ethers.toUtf8Bytes("game-001"));

async function deploy() {
  const [owner, player, attacker] = await ethers.getSigners();
  const scorer = ethers.Wallet.createRandom();
  const Factory = await ethers.getContractFactory("HallucinationHunter");
  const contract = await Factory.deploy(scorer.address);
  await contract.waitForDeployment();
  return { contract, owner, player, attacker, scorer };
}

function domainOf(contract) {
  return { name: "HallucinationHunter", version: "1", chainId: 31337, verifyingContract: contract.target };
}

const TYPES = {
  Score: [
    { name: "player", type: "address" },
    { name: "gameId", type: "bytes32" },
    { name: "score", type: "uint256" },
    { name: "digest", type: "bytes32" },
    { name: "deadline", type: "uint256" },
  ],
};

async function sign(contract, scorer, player, score, deadline, digest = ethers.id("run")) {
  return scorer.signTypedData(domainOf(contract), TYPES, {
    player, gameId: GAME_ID, score, digest, deadline,
  });
}

describe("HallucinationHunter", () => {
  it("开局记录玩家与时间", async () => {
    const { contract, player } = await deploy();
    await expect(contract.connect(player).startGame(GAME_ID)).to.emit(contract, "GameStarted");
    const game = await contract.getGame(GAME_ID);
    expect(game.player).to.equal(player.address);
    expect(game.startedAt).to.be.greaterThan(0);
    expect(await contract.gameCount(player.address)).to.equal(1);
  });

  it("服务端签名的成绩可以上链并更新最高分", async () => {
    const { contract, player, scorer } = await deploy();
    await contract.connect(player).startGame(GAME_ID);
    const deadline = Math.floor(Date.now() / 1000) + 3600;
    const sig = await sign(contract, scorer, player.address, 460, deadline);
    await expect(contract.connect(player).submitScore(GAME_ID, 460, ethers.id("run"), deadline, sig))
      .to.emit(contract, "ScoreSettled");
    expect((await contract.getGame(GAME_ID)).score).to.equal(460);
    expect(await contract.bestScore(player.address)).to.equal(460);
  });

  it("重复结算会被拒绝", async () => {
    const { contract, player, scorer } = await deploy();
    await contract.connect(player).startGame(GAME_ID);
    const deadline = Math.floor(Date.now() / 1000) + 3600;
    const sig = await sign(contract, scorer, player.address, 400, deadline);
    await contract.connect(player).submitScore(GAME_ID, 400, ethers.id("run"), deadline, sig);
    await expect(
      contract.connect(player).submitScore(GAME_ID, 400, ethers.id("run"), deadline, sig)
    ).to.be.revertedWithCustomError(contract, "AlreadySettled");
  });

  it("伪造签名会被拒绝", async () => {
    const { contract, player, attacker } = await deploy();
    await contract.connect(player).startGame(GAME_ID);
    const deadline = Math.floor(Date.now() / 1000) + 3600;
    const fake = await sign(contract, attacker, player.address, 500, deadline);
    await expect(
      contract.connect(player).submitScore(GAME_ID, 500, ethers.id("run"), deadline, fake)
    ).to.be.revertedWithCustomError(contract, "BadSignature");
  });

  it("别人不能替玩家结算", async () => {
    const { contract, player, attacker, scorer } = await deploy();
    await contract.connect(player).startGame(GAME_ID);
    const deadline = Math.floor(Date.now() / 1000) + 3600;
    const sig = await sign(contract, scorer, player.address, 300, deadline);
    await expect(
      contract.connect(attacker).submitScore(GAME_ID, 300, ethers.id("run"), deadline, sig)
    ).to.be.revertedWithCustomError(contract, "NotPlayer");
  });

  it("超过 500 分会被拒绝", async () => {
    const { contract, player, scorer } = await deploy();
    await contract.connect(player).startGame(GAME_ID);
    const deadline = Math.floor(Date.now() / 1000) + 3600;
    const sig = await sign(contract, scorer, player.address, 9999, deadline);
    await expect(
      contract.connect(player).submitScore(GAME_ID, 9999, ethers.id("run"), deadline, sig)
    ).to.be.revertedWithCustomError(contract, "InvalidScore");
  });

  it("过期签名会被拒绝", async () => {
    const { contract, player, scorer } = await deploy();
    await contract.connect(player).startGame(GAME_ID);
    const deadline = Math.floor(Date.now() / 1000) - 10;
    const sig = await sign(contract, scorer, player.address, 300, deadline);
    await expect(
      contract.connect(player).submitScore(GAME_ID, 300, ethers.id("run"), deadline, sig)
    ).to.be.revertedWithCustomError(contract, "Expired");
  });

  it("只有 owner 可以更换签名者", async () => {
    const { contract, attacker } = await deploy();
    await expect(contract.connect(attacker).setSigner(attacker.address))
      .to.be.revertedWithCustomError(contract, "NotOwner");
  });

  it("未开局的 gameId 不能结算", async () => {
    const { contract, player, scorer } = await deploy();
    const deadline = Math.floor(Date.now() / 1000) + 3600;
    const sig = await sign(contract, scorer, player.address, 100, deadline);
    await expect(
      contract.connect(player).submitScore(GAME_ID, 100, ethers.id("run"), deadline, sig)
    ).to.be.revertedWithCustomError(contract, "UnknownGame");
  });
});
