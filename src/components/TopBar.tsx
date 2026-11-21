import { Link, useLocation } from "react-router-dom";
import { useAccount } from "wagmi";
import { Volume2, VolumeX, Wallet } from "lucide-react";
import { Logo } from "./Logo";
import { Tag } from "./ui";
import { useGame } from "../store/useGame";
import { cn, shortAddress } from "../lib/utils";
import { CHAIN_LABEL } from "../lib/web3";

export function TopBar() {
  const { pathname } = useLocation();
  const state = useGame((s) => s.state);
  const muted = useGame((s) => s.muted);
  const setMuted = useGame((s) => s.setMuted);
  const { address, isConnected } = useAccount();

  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-ink-950/75 backdrop-blur-xl">
      <div className="mx-auto flex h-14 w-full max-w-[1200px] items-center gap-3 px-4 sm:h-16 sm:px-6">
        <Link to="/" className="flex items-center gap-2.5">
          <Logo size={28} />
          <div className="leading-none">
            <div className="text-[14px] font-medium tracking-[0.12em] text-white/90">失控的周六</div>
            <div className="mt-1 font-mono text-[9px] tracking-[0.28em] text-violet-300/50">幻觉猎人</div>
          </div>
        </Link>

        {pathname !== "/" ? (
          <Tag tone="violet" className="ml-2 hidden sm:inline-flex">
            {state?.finished ? "已结算" : state ? `第 ${state.scenes.length + 1} / 5 件事` : "准备开始"}
          </Tag>
        ) : null}

        <div className="ml-auto flex items-center gap-2">
          <span className="hidden font-mono text-[10px] tracking-wider text-white/30 sm:inline">
            {CHAIN_LABEL}
          </span>
          <button
            type="button"
            onClick={() => setMuted(!muted)}
            className="rounded-lg border border-white/10 p-1.5 text-white/40 transition hover:border-violet-400/35 hover:text-violet-200"
            aria-label={muted ? "开启音效" : "关闭音效"}
          >
            {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
          </button>
          <Link
            to="/wallet"
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 font-mono text-[11px] transition",
              isConnected
                ? "border-verify/25 bg-verify/[0.08] text-verify hover:bg-verify/[0.14]"
                : "border-violet-400/25 bg-violet-500/10 text-violet-200 hover:bg-violet-500/20",
            )}
            title="打开链上工作台"
          >
            <Wallet size={12} />
            {isConnected && address ? shortAddress(address) : "连接钱包"}
          </Link>
        </div>
      </div>
    </header>
  );
}
