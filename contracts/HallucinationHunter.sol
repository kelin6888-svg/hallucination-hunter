// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title 失控的周六 · 成绩记录（Monad 测试网）
/// @notice 服务端用 EIP-712 签名认证成绩，玩家调用 submitScore 上链。
///         合约只接受玩家本人 + 有效签名 + 未结算过的对局，且分数上限 500。
contract HallucinationHunter {
    struct Game {
        address player;
        uint64 startedAt;
        uint64 settledAt;
        uint16 score;
        bytes32 digest;
        bool settled;
    }

    bytes32 public constant SCORE_TYPEHASH =
        keccak256("Score(address player,bytes32 gameId,uint256 score,bytes32 digest,uint256 deadline)");

    bytes32 public immutable DOMAIN_SEPARATOR;

    address public owner;
    address public signer;
    uint16 public constant MAX_SCORE = 500;

    mapping(bytes32 => Game) private games;
    mapping(address => bytes32[]) private playerGames;
    mapping(address => uint16) public bestScore;

    event GameStarted(bytes32 indexed gameId, address indexed player, uint64 startedAt);
    event ScoreSettled(bytes32 indexed gameId, address indexed player, uint16 score, bytes32 digest);

    error NotOwner();
    error NotPlayer();
    error AlreadyStarted();
    error AlreadySettled();
    error UnknownGame();
    error InvalidScore();
    error Expired();
    error BadSignature();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor(address initialSigner) {
        owner = msg.sender;
        signer = initialSigner;
        DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
                keccak256("HallucinationHunter"),
                keccak256("1"),
                block.chainid,
                address(this)
            )
        );
    }

    function setSigner(address next) external onlyOwner {
        signer = next;
    }

    /// @notice 开局：每局 gameId 由前端生成（服务端也记录了同一 id）
    function startGame(bytes32 gameId) external {
        if (games[gameId].player != address(0)) revert AlreadyStarted();
        games[gameId] = Game({
            player: msg.sender,
            startedAt: uint64(block.timestamp),
            settledAt: 0,
            score: 0,
            digest: bytes32(0),
            settled: false
        });
        playerGames[msg.sender].push(gameId);
        emit GameStarted(gameId, msg.sender, uint64(block.timestamp));
    }

    /// @notice 结算：分数由服务端签名，玩家无法自报
    function submitScore(
        bytes32 gameId,
        uint16 score,
        bytes32 digest,
        uint256 deadline,
        bytes calldata signature
    ) external {
        Game storage game = games[gameId];
        if (game.player == address(0)) revert UnknownGame();
        if (game.player != msg.sender) revert NotPlayer();
        if (game.settled) revert AlreadySettled();
        if (block.timestamp > deadline) revert Expired();
        if (score > MAX_SCORE) revert InvalidScore();

        bytes32 structHash = keccak256(
            abi.encode(SCORE_TYPEHASH, msg.sender, gameId, uint256(score), digest, deadline)
        );
        bytes32 digestToVerify = keccak256(abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR, structHash));
        if (_recover(digestToVerify, signature) != signer) revert BadSignature();

        game.score = score;
        game.digest = digest;
        game.settledAt = uint64(block.timestamp);
        game.settled = true;
        if (score > bestScore[msg.sender]) bestScore[msg.sender] = score;

        emit ScoreSettled(gameId, msg.sender, score, digest);
    }

    function getGame(bytes32 gameId) external view returns (Game memory) {
        return games[gameId];
    }

    function gamesOf(address player) external view returns (bytes32[] memory) {
        return playerGames[player];
    }

    function gameCount(address player) external view returns (uint256) {
        return playerGames[player].length;
    }

    function _recover(bytes32 digest, bytes calldata signature) private pure returns (address) {
        if (signature.length != 65) revert BadSignature();
        bytes32 r;
        bytes32 s;
        uint8 v;
        assembly {
            r := calldataload(signature.offset)
            s := calldataload(add(signature.offset, 32))
            v := byte(0, calldataload(add(signature.offset, 64)))
        }
        if (v < 27) v += 27;
        if (v != 27 && v != 28) revert BadSignature();
        return ecrecover(digest, v, r, s);
    }
}
