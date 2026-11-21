import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  Check,
  CircleDollarSign,
  ExternalLink,
  Loader2,
  Rocket,
  ShieldCheck,
  Wallet,
  Wifi,
} from "lucide-react";
import { useAccount, useBalance, useConnect, useDisconnect, usePublicClient, useSwitchChain, useWalletClient } from "wagmi";
import { keccak256, stringToHex, type Address, type Hex } from "viem";
import { HH_ABI, HH_BYTECODE } from "../chain/artifact";
import { api } from "../api/client";
import { useGame } from "../store/useGame";
import { Backdrop } from "../components/Backdrop";
import {
  CHAIN_ID,
  EXPLORER,
  FAUCET,
  getContractAddress,
  monadTestnet,
  setContractAddress,
} from "../lib/web3";
import { cn, shortAddress } from "../lib/utils";

type TxPhase = "idle" | "signing" | "pending" | "confirmed" | "failed";

interface TxState {
  phase: TxPhase;
  hash?: string;
  error?: string;
  note?: string;
}

const IDLE: TxState = { phase: "idle" };

const PHASE_LABEL: Record<TxPhase, string> = {
  idle: "待执行",
  signing: "等待钱包签名",
  pending: "已提交，等待确认",
  confirmed: "已确认",
  failed: "失败",
};

function PhasePill({ tx }: { tx: TxState }) {
  const tone =
    tx.phase === "confirmed"
      ? "border-verify/40 bg-verify/10 text-verify"
      : tx.phase === "failed"
        ? "border-alarm/40 bg-alarm/10 text-alarm"
        : tx.phase === "idle"
          ? "border-white/10 bg-white/[0.03] text-white/40"
          : "border-violet-400/40 bg-violet-500/10 text-violet-200";
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px]", tone)}>
      {tx.phase === "signing" || tx.phase === "pending" ? (
        <Loader2 size={11} className="animate-spin" />
      ) : tx.phase === "confirmed" ? (
        <Check size={11} />
      ) : tx.phase === "failed" ? (
        <AlertTriangle size={11} />
      ) : null}
      {PHASE_LABEL[tx.phase]}
    </span>
  );
}

function TxLink({ tx }: { tx: TxState }) {
  if (!tx.hash) return null;
  return (
    <a
      href={`${EXPLORER}/tx/${tx.hash}`}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 font-mono text-[11px] text-violet-300/80 hover:text-violet-200"
    >
      {shortAddress(tx.hash, 8, 6)}
      <ExternalLink size={10} />
    </a>
  );
}

function Step({
  index,
  title,
  desc,
  children,
  done,
}: {
  index: number;
  title: string;
  desc: string;
  done?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("panel p-4", done && "border-verify/25")}>
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border font-mono text-[11px]",
            done
              ? "border-verify/40 bg-verify/10 text-verify"
              : "border-white/12 bg-white/[0.03] text-white/40",
          )}
        >
          {done ? <Check size={12} /> : index}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-[15px] text-white/90">{title}</h3>
          <p className="mt-1 text-[13px] leading-relaxed text-white/45">{desc}</p>
          <div className="mt-3">{children}</div>
        </div>
      </div>
    </div>
  );
}

const btn =
  "inline-flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-[12.5px] transition disabled:cursor-not-allowed disabled:opacity-40";
const btnPrimary = cn(btn, "border-violet-400/40 bg-violet-500/15 text-violet-100 hover:bg-violet-500/25");
const btnGhost = cn(btn, "border-white/12 bg-white/[0.03] text-white/65 hover:border-white/25 hover:text-white/85");

export function WalletPage() {
  const navigate = useNavigate();
  const { address, isConnected, chainId, connector } = useAccount();
  const { connectors, connectAsync, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChainAsync, isPending: switching } = useSwitchChain();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient({ chainId: CHAIN_ID });

  const runId = useGame((s) => s.runId);
  const runState = useGame((s) => s.state);
  const startRun = useGame((s) => s.start);

  const [config, setConfig] = useState<{ contract: string | null; scorer: string } | null>(null);
  const [contract, setContract] = useState<Address | null>(getContractAddress());
  const [deployTx, setDeployTx] = useState<TxState>(IDLE);
  const [startTx, setStartTx] = useState<TxState>(IDLE);
  const [submitTx, setSubmitTx] = useState<TxState>(IDLE);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [onChain, setOnChain] = useState<{
    player: string;
    score: number;
    digest: string;
    settled: boolean;
    startedAt: number;
  } | null>(null);

  const gameId = useMemo<Hex | null>(
    () => (runId ? keccak256(stringToHex(runId)) : null),
    [runId],
  );

  const { data: balance } = useBalance({
    address,
    chainId: CHAIN_ID,
    query: { enabled: Boolean(address) && chainId === CHAIN_ID },
  });

  const loadConfig = useCallback(() => {
    api
      .chainConfig()
      .then((data) => {
        setConfig({ contract: data.contract, scorer: data.scorer });
        if (data.contract) {
          setContractAddress(data.contract as Address);
          setContract(data.contract as Address);
        }
      })
      .catch(() => setConfig(null));
  }, []);

  useEffect(loadConfig, [loadConfig]);

  const wrongChain = isConnected && chainId !== CHAIN_ID;
  const hasProvider =
    typeof window !== "undefined" && Boolean((window as { ethereum?: unknown }).ethereum);

  const ensureChain = useCallback(async () => {
    if (chainId === CHAIN_ID) return true;
    try {
      await switchChainAsync({ chainId: CHAIN_ID });
      return true;
    } catch {
      try {
        await walletClient?.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: "0x279f",
              chainName: "Monad Testnet",
              nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
              rpcUrls: ["https://testnet-rpc.monad.xyz"],
              blockExplorerUrls: ["https://testnet.monadvision.com/"],
            },
          ],
        });
        await switchChainAsync({ chainId: CHAIN_ID });
        return true;
      } catch {
        return false;
      }
    }
  }, [chainId, switchChainAsync, walletClient]);

  const connectWallet = async () => {
    setConnectError(null);
    const injectedReady = typeof window !== "undefined" && Boolean((window as { ethereum?: unknown }).ethereum);
    // 桌面浏览器装了 MetaMask 时，直接用注入的 provider，避免走 SDK 弹窗
    const preferred = injectedReady
      ? (connectors.find((c) => c.id === "injected") ?? connectors.find((c) => c.id === "metaMask") ?? connectors[0])
      : (connectors.find((c) => c.id === "metaMask") ?? connectors[0]);
    if (!preferred) {
      setConnectError("没有检测到浏览器钱包。请先安装 MetaMask 后刷新页面。");
      return;
    }
    try {
      await connectAsync({ connector: preferred });
    } catch (err) {
      setConnectError((err as Error).message || "钱包拒绝了连接");
    }
  };

  const deploy = async () => {
    if (!walletClient || !address || !config) return;
    setDeployTx({ phase: "signing" });
    try {
      if (!(await ensureChain())) throw new Error("请先在钱包里切换到 Monad 测试网");
      const hash = await walletClient.deployContract({
        abi: HH_ABI,
        bytecode: HH_BYTECODE,
        args: [config.scorer as Address],
        account: address,
        chain: monadTestnet,
      });
      setDeployTx({ phase: "pending", hash });
      const receipt = await publicClient!.waitForTransactionReceipt({ hash });
      if (!receipt.contractAddress) throw new Error("交易已确认，但没有拿到合约地址");
      setDeployTx({ phase: "confirmed", hash, note: receipt.contractAddress });
      setContract(receipt.contractAddress);
      setContractAddress(receipt.contractAddress);
      await api.registerContract(receipt.contractAddress);
      loadConfig();
    } catch (err) {
      setDeployTx({ phase: "failed", error: (err as Error).message });
    }
  };

  const startGame = async () => {
    if (!walletClient || !address || !contract) return;
    setStartTx({ phase: "signing" });
    try {
      if (!(await ensureChain())) throw new Error("请先在钱包里切换到 Monad 测试网");
      const created = await api.createRun("chain", address);
      const id = keccak256(stringToHex(created.runId));
      const hash = await walletClient.writeContract({
        address: contract,
        abi: HH_ABI,
        functionName: "startGame",
        args: [id],
        account: address,
        chain: monadTestnet,
      });
      setStartTx({ phase: "pending", hash });
      await publicClient!.waitForTransactionReceipt({ hash });
      setStartTx({ phase: "confirmed", hash, note: created.runId });
      startRun(created);
      navigate("/play");
    } catch (err) {
      setStartTx({ phase: "failed", error: (err as Error).message });
    }
  };

  const submit = async () => {
    if (!walletClient || !address || !contract || !runId) return;
    setSubmitTx({ phase: "signing" });
    try {
      if (!(await ensureChain())) throw new Error("请先在钱包里切换到 Monad 测试网");
      const signed = await api.attest(runId, address);
      if (!signed.ready || !signed.signature) {
        throw new Error(signed.error ?? "服务端还没有准备好签名");
      }
      const hash = await walletClient.writeContract({
        address: contract,
        abi: HH_ABI,
        functionName: "submitScore",
        args: [
          signed.gameId as Hex,
          signed.score ?? 0,
          signed.digest as Hex,
          BigInt(signed.deadline ?? 0),
          signed.signature as Hex,
        ],
        account: address,
        chain: monadTestnet,
      });
      setSubmitTx({ phase: "pending", hash });
      await publicClient!.waitForTransactionReceipt({ hash });
      setSubmitTx({ phase: "confirmed", hash });
      await readChain(signed.gameId as Hex);
    } catch (err) {
      setSubmitTx({ phase: "failed", error: (err as Error).message });
    }
  };

  const readChain = async (id?: Hex) => {
    const target = id ?? gameId;
    if (!publicClient || !contract || !target) return;
    try {
      const game = (await publicClient.readContract({
        address: contract,
        abi: HH_ABI,
        functionName: "getGame",
        args: [target],
      })) as unknown as {
        player: Address;
        startedAt: bigint;
        settledAt: bigint;
        score: number;
        digest: Hex;
        settled: boolean;
      };
      setOnChain({
        player: game.player,
        startedAt: Number(game.startedAt),
        score: Number(game.score),
        digest: game.digest,
        settled: game.settled,
      });
    } catch (err) {
      setSubmitTx({ phase: "failed", error: `读取链上状态失败：${(err as Error).message}` });
    }
  };

  useEffect(() => {
    if (contract && gameId) void readChain();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contract, gameId]);

  return (
    <div className="relative min-h-[calc(100dvh-64px)]">
      <Backdrop />
      <div className="relative z-10 mx-auto w-full max-w-[1040px] px-4 pb-16 pt-6 sm:px-6">
        <div className="flex flex-wrap items-center gap-2 text-[12px] text-white/35">
          <Link to="/" className="transition hover:text-white/70">
            首页
          </Link>
          <span>/</span>
          <span className="text-white/60">链上工作台</span>
        </div>

        <h1 className="mt-3 text-[26px] font-medium text-white sm:text-[30px]">Monad 测试网 · 链上工作台</h1>
        <p className="mt-2 max-w-[52em] text-[14px] leading-relaxed text-white/50">
          只有两次交易需要你在 MetaMask 里确认：开局一次，交成绩一次。中间所有购物、付款、预算都是游戏内模拟，不会弹钱包，也不会花真实资金。
        </p>

        {!hasProvider ? (
          <div className="mt-4 rounded-xl border border-amber/35 bg-amber/[0.07] px-4 py-3 text-[12.5px] leading-relaxed text-amber">
            这个窗口里没有检测到钱包扩展。IDE 内置预览面板不会加载浏览器扩展，
            请复制地址 <span className="font-mono">http://127.0.0.1:4176/wallet</span> 到 Chrome 或 Edge 打开，
            再点「连接 MetaMask」。
          </div>
        ) : null}

        <div className="mt-5 panel flex flex-wrap items-center gap-x-5 gap-y-3 px-4 py-3">
          <span className="inline-flex items-center gap-1.5 text-[13px] text-white/70">
            <Wifi size={13} className="text-violet-300/70" />
            {isConnected ? `已连接 ${shortAddress(address!)}` : "未连接钱包"}
          </span>
          <span className="inline-flex items-center gap-1.5 text-[13px] text-white/55">
            <ShieldCheck size={13} className={chainId === CHAIN_ID ? "text-verify/80" : "text-amber/80"} />
            {isConnected ? (chainId === CHAIN_ID ? "网络：Monad 测试网 10143" : `网络不匹配（${chainId}）`) : "网络：未连接"}
          </span>
          <span className="inline-flex items-center gap-1.5 text-[13px] text-white/55">
            <CircleDollarSign size={13} className="text-amber/80" />
            {balance ? `${Number(balance.formatted).toFixed(4)} MON` : "余额待读取"}
          </span>
          <span className="ml-auto inline-flex items-center gap-2 text-[12px] text-white/40">
            {contract ? (
              <a
                href={`${EXPLORER}/address/${contract}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-mono text-verify/80 hover:text-verify"
              >
                合约 {shortAddress(contract, 6, 4)}
                <ExternalLink size={10} />
              </a>
            ) : (
              "合约尚未部署"
            )}
          </span>
        </div>

        {balance && Number(balance.formatted) === 0 ? (
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-amber/30 bg-amber/[0.06] px-3.5 py-2.5 text-[12.5px] text-amber">
            <AlertTriangle size={13} />
            这个地址没有测试 MON，部署会失败。
            <a href={FAUCET} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 underline">
              去水龙头领测试币
              <ExternalLink size={10} />
            </a>
          </div>
        ) : null}

        <div className="mt-4 grid gap-3">
          <Step index={1} title="连接钱包" desc="用 MetaMask 连接，只读取公开地址与余额。私钥、助记词始终留在钱包里。" done={isConnected}>
            {!isConnected ? (
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={connectWallet} disabled={isPending} className={btnPrimary}>
                  <Wallet size={13} />
                  {isPending ? "等待钱包确认…" : "连接 MetaMask"}
                </button>
                <a href="https://metamask.io/download/" target="_blank" rel="noreferrer" className={btnGhost}>
                  没装钱包？下载
                  <ExternalLink size={11} />
                </a>
                {connectError ? <span className="text-[12px] text-alarm">{connectError}</span> : null}
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <PhasePill tx={{ phase: "confirmed" }} />
                <span className="font-mono text-[11px] text-white/35">{connector?.name}</span>
                {wrongChain ? (
                  <button
                    type="button"
                    onClick={async () => {
                      const ok = await ensureChain();
                      if (!ok) setConnectError("切换失败，请在 MetaMask 里手动选择 Monad Testnet");
                    }}
                    disabled={switching}
                    className={btnPrimary}
                  >
                    {switching ? "切换中…" : "切换到 Monad 测试网"}
                  </button>
                ) : null}
                <button type="button" onClick={() => disconnect()} className={btnGhost}>
                  断开
                </button>
              </div>
            )}
          </Step>

          <Step
            index={2}
            title="部署成绩合约（只需一次）"
            desc="合约创建交易由你的钱包签名，部署后地址会写入服务端，后续成绩都记在这份合约上。"
            done={Boolean(contract)}
          >
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={deploy}
                disabled={!isConnected || Boolean(contract) || deployTx.phase === "signing" || deployTx.phase === "pending"}
                className={btnPrimary}
              >
                <Rocket size={13} />
                {contract ? "已部署" : "部署合约"}
              </button>
              <PhasePill tx={deployTx} />
              <TxLink tx={deployTx} />
              {deployTx.note ? (
                <span className="font-mono text-[11px] text-verify/80">{shortAddress(deployTx.note, 8, 6)}</span>
              ) : null}
            </div>
            {deployTx.error ? <p className="mt-2 text-[12px] text-alarm">{deployTx.error}</p> : null}
            {config ? (
              <p className="mt-2 font-mono text-[11px] text-white/30">评分签名地址 {shortAddress(config.scorer, 8, 6)}</p>
            ) : null}
          </Step>

          <Step
            index={3}
            title="开局：把这一局写进链上"
            desc="交易用途：登记 gameId、你的钱包地址和开始时间。确认后进入游戏，五幕过程中不再有钱包弹窗。"
            done={Boolean(runId)}
          >
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={startGame}
                disabled={!isConnected || !contract || startTx.phase === "signing" || startTx.phase === "pending"}
                className={btnPrimary}
              >
                <Rocket size={13} />
                开局并开始游戏
              </button>
              <PhasePill tx={startTx} />
              <TxLink tx={startTx} />
              {runState && !runState.finished ? (
                <Link to="/play" className={btnGhost}>
                  继续未完成的一局
                  <ArrowRight size={12} />
                </Link>
              ) : null}
            </div>
            {startTx.error ? <p className="mt-2 text-[12px] text-alarm">{startTx.error}</p> : null}
          </Step>

          <Step
            index={4}
            title="交成绩：服务端签名，合约校验"
            desc="分数由服务端按你的行动重算，再用 EIP-712 签名；合约验证签名、拒绝重复结算，你无法自己填写分数。"
            done={submitTx.phase === "confirmed"}
          >
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={submit}
                disabled={
                  !isConnected ||
                  !contract ||
                  !runId ||
                  !runState?.finished ||
                  submitTx.phase === "signing" ||
                  submitTx.phase === "pending"
                }
                className={btnPrimary}
              >
                <BadgeCheck size={13} />
                提交并上链
              </button>
              <PhasePill tx={submitTx} />
              <TxLink tx={submitTx} />
              {!runId || !runState?.finished ? (
                <span className="text-[12px] text-white/35">先完成五幕，再回来交成绩</span>
              ) : null}
            </div>
            {submitTx.error ? <p className="mt-2 text-[12px] text-alarm">{submitTx.error}</p> : null}

            {onChain ? (
              <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.02] p-3 font-mono text-[11.5px] leading-relaxed text-white/55">
                <div>链上玩家 {onChain.player}</div>
                <div>状态 {onChain.settled ? "已结算" : "已开局，未结算"}</div>
                <div>分数 {onChain.settled ? onChain.score : "—"} / 500</div>
                <div className="break-all">成绩摘要 {onChain.digest.slice(0, 26)}…</div>
              </div>
            ) : null}
          </Step>
        </div>

        <p className="mt-5 text-[11.5px] leading-relaxed text-white/25">
          测试网说明：所有交易都发生在 Monad Testnet（10143），使用测试 MON，没有真实价值。游戏内的 500 元预算与购物付款均为模拟数据。
        </p>
      </div>
    </div>
  );
}
