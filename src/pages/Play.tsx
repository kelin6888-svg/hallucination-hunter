import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Clock3, Coins, ListChecks, RotateCcw, Sparkles } from "lucide-react";
import { Backdrop } from "../components/Backdrop";
import { useGame } from "../store/useGame";
import { api } from "../api/client";
import { SCENES, SCENE_ORDER, type SceneId } from "../../shared/game/content";
import { resolveScene, type SceneOutcome } from "../../shared/game/rules";
import { AIAdvice, SceneBody } from "../game/Scenes";
import { cn } from "../lib/utils";
import { playCue } from "../lib/sound";

export function Play() {
  const navigate = useNavigate();
  const state = useGame((s) => s.state);
  const apply = useGame((s) => s.apply);
  const reset = useGame((s) => s.reset);

  const index = state?.scenes.length ?? 0;
  const sceneId: SceneId = SCENE_ORDER[Math.min(index, SCENE_ORDER.length - 1)];
  const meta = SCENES[sceneId];

  const [actions, setActions] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [sheet, setSheet] = useState<SceneOutcome | null>(null);
  const [error, setError] = useState<string | null>(null);

  const resources = state?.resources ?? { time: 180, money: 500, tasks: 0 };
  const preview = useMemo(
    () => resolveScene(sceneId, actions, resources),
    [sceneId, actions, resources],
  );

  useEffect(() => {
    setActions([]);
  }, [sceneId]);

  useEffect(() => {
    if (!state) navigate("/", { replace: true });
  }, [state, navigate]);

  const finishScene = useCallback(
    async (finalActions: string[]) => {
      if (!state) return;
      setBusy(true);
      setError(null);
      try {
        const res = await api.submitScene(state.runId, sceneId, finalActions);
        apply(res.state);
        setSheet(res.outcome);
        playCue("stamp");
      } catch (err) {
        setError(err instanceof Error ? err.message : "提交失败");
      } finally {
        setBusy(false);
      }
    },
    [apply, sceneId, state],
  );

  const onAction = (id: string) => {
    if (busy || preview.finished) return;
    playCue(id.startsWith("toggle") ? "tick" : "select");
    const next = [...actions, id];
    setActions(next);
    const after = resolveScene(sceneId, next, resources);
    if (after.finished) void finishScene(next);
  };

  if (!state) return null;

  const sheetIsLast = sheet ? sheet.sceneId === SCENE_ORDER[SCENE_ORDER.length - 1] : false;
  const sheetMeta = sheet ? SCENES[sheet.sceneId] : meta;
  const nextLabel = sheetIsLast ? "查看今天的结果" : "继续下一件事";

  return (
    <div className="relative min-h-[calc(100dvh-64px)]">
      <Backdrop />
      <div className="relative z-10 mx-auto w-full max-w-[1180px] px-4 pb-10 pt-4 sm:px-6">
        {/* 顶部资源条 */}
        <div className="panel flex flex-wrap items-center gap-3 px-4 py-3">
          <span className="font-mono text-[10px] tracking-[0.2em] text-white/30">
            失控的周六 · 第 {meta.order} / 5 件事
          </span>
          <div className="ml-auto flex items-center gap-4 font-mono text-[12px]">
            <span className="inline-flex items-center gap-1.5 text-white/70">
              <Clock3 size={13} className="text-violet-300/70" />
              剩余 {Math.max(0, state.resources.time)} 分钟
            </span>
            <span className="inline-flex items-center gap-1.5 text-white/70">
              <Coins size={13} className="text-amber/80" />¥{state.resources.money}
            </span>
            <span className="inline-flex items-center gap-1.5 text-white/70">
              <ListChecks size={13} className="text-verify/80" />
              {state.resources.tasks}/5
            </span>
          </div>
          <div className="hidden gap-1 sm:flex">
            {SCENE_ORDER.map((id, i) => (
              <span
                key={id}
                className={cn(
                  "h-1.5 w-5 rounded-full",
                  i < index ? "bg-verify/60" : i === index ? "bg-violet-400" : "bg-white/12",
                )}
              />
            ))}
          </div>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_380px]">
          {/* 手机界面 */}
          <div className="mx-auto w-full max-w-[430px]">
            <div className="rounded-[28px] border border-white/[0.09] bg-ink-900/80 p-2 shadow-soft backdrop-blur-xl">
              <div className="rounded-[22px] border border-white/[0.05] bg-ink-850/60">
                <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-2.5">
                  <span className="text-[12px] text-white/45">{meta.app}</span>
                  <span className="font-mono text-[11px] text-white/30">{meta.clock}</span>
                </div>
                <div className="max-h-[62vh] overflow-y-auto px-3.5 pb-7 pt-3.5">
                  <div className="mb-3">
                    <div className="text-[17px] font-medium text-white/90">{meta.title}</div>
                    <p className="mt-1 text-[12px] leading-relaxed text-white/40">{meta.brief}</p>
                    <div className="mt-2 inline-flex items-center gap-1 rounded bg-white/[0.05] px-1.5 py-0.5 font-mono text-[10px] text-white/45">
                      目标：{meta.goal}
                    </div>
                  </div>
                  <AIAdvice text={meta.aiAdvice} reliable={meta.adviceReliable} revealed={preview.finished} />
                  <div className="mt-3">
                    <SceneBody
                      sceneId={sceneId}
                      meta={meta}
                      actions={actions}
                      preview={preview}
                      onAction={onAction}
                      busy={busy}
                    />
                  </div>
                  {error ? (
                    <p className="mt-3 rounded-lg border border-alarm/30 bg-alarm/10 px-3 py-2 text-[12px] text-alarm">
                      {error}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
            <div className="mt-2 flex items-center justify-center gap-3 font-mono text-[10px] text-white/25">
              <span>模拟界面</span>
              <span className="h-2.5 w-px bg-white/15" />
              <span>不产生真实支付</span>
            </div>
          </div>

          {/* 侧栏：今天的事 */}
          <aside className="space-y-3">
            <div className="panel p-4">
              <div className="label mb-2">今天的事</div>
              <div className="space-y-1.5">
                {SCENE_ORDER.map((id, i) => {
                  const rec = state.scenes[i];
                  const current = i === index;
                  return (
                    <div
                      key={id}
                      className={cn(
                        "flex items-center gap-2 rounded-lg border px-2.5 py-2",
                        current
                          ? "border-violet-400/35 bg-violet-500/10"
                          : rec
                            ? "border-white/[0.06] bg-white/[0.02]"
                            : "border-white/[0.04]",
                      )}
                    >
                      <span className="font-mono text-[10px] text-white/25">0{i + 1}</span>
                      <span className={cn("flex-1 text-[13px]", current ? "text-white/85" : rec ? "text-white/55" : "text-white/30")}>
                        {SCENES[id].title}
                      </span>
                      <span className="font-mono text-[10px] text-white/30">
                        {rec ? `${rec.score}` : current ? "进行中" : "—"}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="mt-3 flex items-center justify-between text-[11px] text-white/30">
                <span>当前得分</span>
                <span className="font-mono text-violet-200">{state.score} / 500</span>
              </div>
            </div>

            <div className="panel p-4">
              <div className="label mb-2">今日原则</div>
              <p className="text-[12px] leading-relaxed text-white/40">
                AI 很会给出「看起来成立」的答案。贵的选择先停一秒，查一眼；便宜的核对，别查三遍。
              </p>
              <button
                type="button"
                onClick={() => {
                  reset();
                  navigate("/", { replace: true });
                }}
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-[11px] text-white/40 hover:border-alarm/30 hover:text-alarm"
              >
                <RotateCcw size={11} /> 重新开始这一天
              </button>
            </div>
          </aside>

          {/* 桌面右栏空位在手机端隐藏 */}
          <div className="hidden" />
        </div>
      </div>

      {/* 结算抽屉 */}
      <AnimatePresence>
        {sheet ? (
          <motion.div
            className="fixed inset-0 z-50 flex items-end justify-center bg-ink-950/80 p-3 backdrop-blur-sm sm:items-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="panel w-full max-w-[560px] overflow-hidden p-5 sm:p-6"
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 30, opacity: 0 }}
              transition={{ type: "spring", stiffness: 220, damping: 22 }}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-mono text-[10px] tracking-[0.2em] text-white/30">
                    第 {sheetMeta.order} 件事 · {sheetMeta.title} · 结算
                  </div>
                  <h2 className="mt-1.5 text-[20px] text-white">{sheet.taskDone ? "任务完成" : "任务未完成"}</h2>
                  <p className="mt-1 text-[13px] leading-relaxed text-white/50">{sheet.outcome}</p>
                </div>
                <div className="text-right">
                  <div className="font-mono text-[30px] leading-none text-white">{sheet.score}</div>
                  <div className="font-mono text-[10px] text-white/25">/ 100</div>
                </div>
              </div>

              <div className="mt-4 space-y-1.5">
                {sheet.parts.map((p) => (
                  <div key={p.key} className="flex items-start justify-between gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2">
                    <div className="min-w-0">
                      <div className="text-[13px] text-white/75">{p.label}</div>
                      <div className="text-[11px] text-white/35">{p.note}</div>
                    </div>
                    <span className="font-mono text-[12px] text-white/60">+{p.value}</span>
                  </div>
                ))}
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2 font-mono text-[11px]">
                <div className="rounded-lg border border-white/[0.06] px-2 py-1.5">
                  <div className="text-white/30">时间</div>
                  <div className={cn("mt-0.5", sheet.timeSpent > 20 ? "text-alarm" : "text-white/75")}>
                    -{sheet.timeSpent} 分钟
                  </div>
                </div>
                <div className="rounded-lg border border-white/[0.06] px-2 py-1.5">
                  <div className="text-white/30">支出</div>
                  <div className="mt-0.5 text-white/75">¥{sheet.spent}</div>
                </div>
                <div className="rounded-lg border border-white/[0.06] px-2 py-1.5">
                  <div className="text-white/30">损失</div>
                  <div className={cn("mt-0.5", sheet.lost > 0 ? "text-alarm" : "text-verify")}>
                    ¥{sheet.lost}
                  </div>
                </div>
              </div>

              <div className="mt-3 rounded-lg border border-violet-400/20 bg-violet-500/[0.06] px-3 py-2.5">
                <div className="flex items-center gap-1.5 font-mono text-[9px] tracking-[0.16em] text-violet-200/60">
                  <Sparkles size={10} /> 这次 AI 的建议
                </div>
                <p className="mt-1 text-[12px] leading-relaxed text-violet-50/70">
                  {sheet.aiWasRight
                    ? "是对的，而且你没有为它浪费时间。"
                    : sheet.lost > 0 || sheet.mistakes > 0
                      ? "有问题，代价已经写进上面的数字里。"
                      : "有问题，但这一次你没有照着做。"}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (sheetIsLast) navigate("/final");
                  else setSheet(null);
                }}
                className="btn-primary mt-4 h-11 w-full"
              >
                {nextLabel}
                <ArrowRight size={15} />
              </button>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
