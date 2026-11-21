import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Clock3, Coins, Link2, Sparkles, TriangleAlert, Wallet } from "lucide-react";
import { useAccount, useConnect } from "wagmi";
import { Backdrop } from "../components/Backdrop";
import { Logo } from "../components/Logo";
import { Tag } from "../components/ui";
import { api } from "../api/client";
import { useGame } from "../store/useGame";
import { CHAIN_LABEL } from "../lib/web3";
import { shortAddress } from "../lib/utils";

export function Landing() {
  const navigate = useNavigate();
  const start = useGame((s) => s.start);
  const saved = useGame((s) => s.state);
  const { address, isConnected } = useAccount();
  const { connectors, connect } = useConnect();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const begin = async (mode: "free" | "chain") => {
    setBusy(true);
    setError(null);
    try {
      if (mode === "chain" && !isConnected) {
        const connector = connectors[0];
        if (!connector) throw new Error("没有检测到浏览器钱包");
        connect({ connector });
        setBusy(false);
        return;
      }
      const state = await api.createRun(mode, address);
      start(state);
      navigate("/play");
    } catch (err) {
      setError(err instanceof Error ? err.message : "无法开始今天的日程");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative min-h-[calc(100dvh-64px)] overflow-hidden">
      <Backdrop />
      <div className="relative z-10 mx-auto w-full max-w-[1100px] px-5 pb-14 pt-8 sm:px-8 sm:pt-12">
        <div className="flex flex-wrap items-center gap-2">
          <Tag tone="violet">
            <Sparkles size={11} /> 互动叙事 · 五幕
          </Tag>
          <Tag>无需钱包也能玩</Tag>
          <Tag tone="green">
            <Link2 size={11} /> {CHAIN_LABEL}
          </Tag>
        </div>

        <div className="mt-8 grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <div className="flex items-center gap-3">
              <Logo size={52} />
              <span className="font-mono text-[10px] tracking-[0.32em] text-violet-300/60">
                真相调查局 · 第七科
              </span>
            </div>
            <h1 className="mt-5 text-[42px] font-semibold leading-[1.08] tracking-wide text-white sm:text-[60px]">
              失控的周六
            </h1>
            <p className="mt-3 font-mono text-[11px] tracking-[0.3em] text-violet-300/60">
              幻觉猎人 · 别轻信 · 去验证
            </p>
            <p className="mt-5 max-w-[30em] text-[20px] leading-relaxed text-white/85">
              AI 给你答案，后果由你承担。
            </p>
            <p className="mt-3 max-w-[34em] text-[15px] leading-[1.9] text-white/50">
              周六有五个任务：抢票、买菜、取快递、报名活动、赶最后一班车。
              手机里的生活助手会一直给建议——有时对，有时错，而且从来不说「我不确定」。
              你只有 180 分钟和 500 块钱。
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => void begin("free")}
                disabled={busy}
                className="btn-primary h-12 px-6 text-[16px]"
              >
                免费体验
                <ArrowRight size={16} />
              </button>
              <button
                type="button"
                onClick={() => void begin("chain")}
                disabled={busy}
                className="btn-ghost h-12 px-5 text-[14px]"
              >
                <Wallet size={15} />
                {isConnected ? `链上模式 · ${shortAddress(address)}` : "连接钱包开始"}
              </button>
              {saved && !saved.finished ? (
                <button
                  type="button"
                  onClick={() => navigate("/play")}
                  className="btn-ghost h-12 px-4 text-[13px]"
                >
                  继续上次
                </button>
              ) : null}
            </div>

            {error ? (
              <p className="mt-3 rounded-lg border border-alarm/30 bg-alarm/10 px-3 py-2 text-[12px] text-alarm">
                {error}
              </p>
            ) : null}

            <p className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[10px] text-white/25">
              <span className="inline-flex items-center gap-1"><Clock3 size={10} />180 分钟</span>
              <span className="inline-flex items-center gap-1"><Coins size={10} />500 元</span>
              <span>五个场景 · 约 8 分钟</span>
              <span>链上模式只在开始与结算时各签名一次</span>
            </p>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            className="panel relative overflow-hidden p-5"
          >
            <div className="flex items-center justify-between">
              <span className="label">一个真实的瞬间</span>
              <Tag tone="amber">
                <TriangleAlert size={11} /> 权衡中
              </Tag>
            </div>
            <div className="mt-4 rounded-2xl rounded-tl-sm border border-violet-400/20 bg-violet-500/[0.07] p-3.5">
              <div className="mb-1 font-mono text-[9px] tracking-[0.16em] text-violet-200/50">生活助手</div>
              <p className="text-[14px] leading-[1.8] text-white/80">
                「满 80 减 20，再用 10 元券，最后 56，预算 60，直接下单吧。」
              </p>
            </div>
            <div className="mt-3 rounded-xl border border-white/[0.07] bg-white/[0.03] p-3.5">
              <div className="flex justify-between font-mono text-[11px] text-white/40">
                <span>气泡水 39</span><span>纸杯 25</span><span>薯片 32</span>
              </div>
              <div className="mt-2 flex items-baseline justify-between font-mono">
                <span className="text-[10px] text-white/30">你自己按下计算器</span>
                <span className="text-[18px] text-alarm">66</span>
              </div>
            </div>
            <p className="mt-3 text-[12px] leading-relaxed text-white/35">
              差 10 块钱，就会让你在收银台前把东西一件件放回去。游戏里，这 10 块钱会真的从预算里消失。
            </p>
          </motion.div>
        </div>

        <div className="mt-12 grid gap-3 sm:grid-cols-3">
          {[
            { t: "做决定，而不是答题", d: "每个场景都有两三种可行做法，价格和代价写在规则里。" },
            { t: "错误会留下痕迹", d: "转错的钱、白跑的路、错过的班车，都会记进你的结算。" },
            { t: "核实也要花时间", d: "该查的查一次就够；查三遍，车就开走了。" },
          ].map((item) => (
            <div key={item.t} className="panel p-4">
              <div className="text-[14px] text-white/85">{item.t}</div>
              <p className="mt-1.5 text-[12px] leading-relaxed text-white/40">{item.d}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
