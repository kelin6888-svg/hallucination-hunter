import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Award, Link2, Loader2, RotateCcw, ShieldCheck, TriangleAlert } from "lucide-react";
import { Backdrop } from "../components/Backdrop";
import { Meter, Stat, Tag } from "../components/ui";
import { useGame } from "../store/useGame";
import { api } from "../api/client";
import { SCENES, SCENE_ORDER } from "../../shared/game/content";
import { CHAIN_LABEL } from "../lib/web3";
import { cn } from "../lib/utils";

export function Final() {
  const navigate = useNavigate();
  const state = useGame((s) => s.state);
  const reset = useGame((s) => s.reset);
  const [attest, setAttest] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  if (!state) {
    return (
      <div className="relative z-10 mx-auto max-w-xl px-6 py-24 text-center">
        <p className="text-[15px] text-white/50">还没有这一天的记录。</p>
        <Link to="/" className="btn-primary mt-5 inline-flex h-10 px-5 text-[14px]">
          开始这一天
        </Link>
      </div>
    );
  }

  const { ending, resources, score } = state;

  const tryAttest = async () => {
    setBusy(true);
    setAttest(null);
    try {
      const res = await api.attest(state.runId, state.address ?? undefined);
      setAttest({
        ok: res.ready,
        text: res.ready
          ? `服务端签名完成，成绩摘要 ${res.digest?.slice(0, 12)}…`
          : res.message ?? "链上登记尚未开放",
      });
    } catch (err) {
      setAttest({ ok: false, text: err instanceof Error ? err.message : "登记失败" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative min-h-[calc(100dvh-64px)] overflow-hidden">
      <Backdrop />
      <div className="relative z-10 mx-auto w-full max-w-[1080px] px-5 pb-16 pt-8 sm:px-8">
        <div className="flex flex-wrap items-center gap-2">
          <Tag tone="violet"><Award size={11} /> 一天结束</Tag>
          <Tag>{state.mode === "chain" ? "链上模式" : "体验模式 · 未上链"}</Tag>
          {state.finished ? <Tag tone="green">五件事全部经历</Tag> : <Tag tone="amber">这一天提前结束了</Tag>}
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="panel p-6">
            <div className="label">你的结局</div>
            <h1 className="mt-2 text-[34px] font-medium tracking-wide text-white">{ending.name}</h1>
            <p className="mt-2 text-[16px] leading-relaxed text-violet-100/75">{ending.line}</p>
            <p className="mt-3 text-[14px] leading-[1.9] text-white/50">{ending.text}</p>

            <div className="mt-6 grid grid-cols-3 gap-2">
              <Stat label="总分" value={`${score}`} hint="满分 500" tone="violet" />
              <Stat label="剩余时间" value={`${Math.max(0, resources.time)}`} hint="分钟" tone={resources.time > 80 ? "green" : "red"} />
              <Stat label="剩余资金" value={`¥${resources.money}`} hint="初始 500 元" tone={resources.money >= 320 ? "green" : "red"} />
            </div>
            <div className="mt-4 flex items-center gap-3">
              <Meter value={score} max={500} segments={25} className="flex-1" />
              <span className="font-mono text-[11px] text-white/40">{score} / 500</span>
            </div>
          </motion.div>

          <div className="panel p-6">
            <div className="flex items-center gap-2">
              <ShieldCheck size={14} className="text-violet-300/80" />
              <span className="label !tracking-[0.14em] !normal-case !text-white/45">
                {CHAIN_LABEL} 成绩记录
              </span>
            </div>
            <div className="mt-3 space-y-2 text-[12px] leading-relaxed text-white/45">
              <p>正式分数由服务端根据每一关的行动记录计算，前端无法自报得分。</p>
              <p>链上模式只需两次签名：开局创建记录，结束提交成绩。中间的购物、付款都是游戏内模拟。</p>
            </div>
            <button
              type="button"
              onClick={() => void tryAttest()}
              disabled={busy}
              className="btn-ghost mt-4 h-10 w-full text-[13px]"
            >
              {busy ? <Loader2 size={14} className="animate-spin" /> : <Link2 size={14} />}
              请求链上成绩凭证
            </button>
            {attest ? (
              <p className={cn("mt-2 rounded-lg border px-3 py-2 text-[12px]", attest.ok ? "border-verify/30 bg-verify/10 text-verify" : "border-amber/30 bg-amber/10 text-amber/90")}>
                {attest.text}
              </p>
            ) : (
              <p className="mt-2 flex items-center gap-1.5 text-[11px] text-white/25">
                <TriangleAlert size={11} /> 合约尚未部署到测试网，此按钮会如实返回未开放状态
              </p>
            )}
          </div>
        </div>

        <div className="panel mt-4 p-5">
          <div className="label mb-3">五件事的经过</div>
          <div className="space-y-2">
            {SCENE_ORDER.map((id, i) => {
              const rec = state.scenes[i];
              return (
                <div key={id} className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-lg border border-white/[0.05] bg-white/[0.015] px-3 py-2.5 sm:grid-cols-[1fr_140px_auto]">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] text-white/25">0{i + 1}</span>
                      <span className="text-[14px] text-white/80">{SCENES[id].title}</span>
                      {rec ? (
                        rec.taskDone ? <Tag tone="green">完成</Tag> : <Tag tone="red">未完成</Tag>
                      ) : (
                        <Tag>未经历</Tag>
                      )}
                    </div>
                    <div className="mt-0.5 truncate text-[12px] text-white/40">{rec?.outcome ?? "这一天没走到这里"}</div>
                  </div>
                  <Meter value={rec?.score ?? 0} max={100} segments={10} tone={rec?.taskDone ? "green" : "red"} className="hidden sm:flex" />
                  <span className="font-mono text-[16px] text-white/70">{rec?.score ?? 0}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => {
              reset();
              navigate("/");
            }}
            className="btn-primary h-11 px-6"
          >
            <RotateCcw size={15} /> 再过一次周六
          </button>
          <Link to="/play" className="btn-ghost h-11 px-5">回到游戏</Link>
        </div>
      </div>
    </div>
  );
}
