import express from "express";
import cors from "cors";
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  resolveScene,
  summarizeScenes,
  type SceneOutcome,
  type RunSceneRecord,
} from "../shared/game/rules";
import {
  SCENE_ORDER,
  SCENES,
  START_RESOURCES,
  type Resources,
  type SceneId,
} from "../shared/game/content";
import {
  CHAIN,
  digestOf,
  gameIdOf,
  getContract,
  scorer,
  setContract,
  signScore,
} from "./chain";

const PORT = Number(process.env.PORT ?? 8787);

interface RunState {
  id: string;
  mode: "free" | "chain";
  createdAt: string;
  resources: Resources;
  results: Map<SceneId, SceneOutcome>;
  address?: string;
}

const runs = new Map<string, RunState>();
const isScene = (v: unknown): v is SceneId =>
  typeof v === "string" && (SCENE_ORDER as string[]).includes(v);

const app = express();
app.use(cors());
app.use(express.json({ limit: "128kb" }));

app.get("/api/health", (_req, res) =>
  res.json({ ok: true, scenes: SCENE_ORDER.length }),
);

app.get("/api/scenes", (_req, res) => {
  res.json({ scenes: SCENE_ORDER.map((id) => SCENES[id]), start: START_RESOURCES });
});

function summaryOf(run: RunState) {
  const records: RunSceneRecord[] = SCENE_ORDER.filter((id) => run.results.has(id)).map(
    (id) => {
      const r = run.results.get(id)!;
      return {
        sceneId: id,
        score: r.score,
        taskDone: r.taskDone,
        outcome: r.outcome,
        checks: r.checks,
        mistakes: r.mistakes,
        lost: r.lost,
      };
    },
  );
  const agg = summarizeScenes(records, run.resources);
  return {
    runId: run.id,
    mode: run.mode,
    createdAt: run.createdAt,
    address: run.address ?? null,
    scenes: records,
    ...agg,
    finished: records.length === SCENE_ORDER.length,
  };
}

app.post("/api/runs", (req, res) => {
  const mode = req.body?.mode === "chain" ? "chain" : "free";
  const run: RunState = {
    id: randomUUID(),
    mode,
    createdAt: new Date().toISOString(),
    resources: { ...START_RESOURCES },
    results: new Map(),
    address: typeof req.body?.address === "string" ? req.body.address : undefined,
  };
  runs.set(run.id, run);
  res.status(201).json(summaryOf(run));
});

app.get("/api/runs/:id", (req, res) => {
  const run = runs.get(req.params.id);
  if (!run) return res.status(404).json({ error: "这一局记录不存在" });
  res.json({ ...summaryOf(run), outcomes: [...run.results.values()] });
});

app.post("/api/runs/:id/scenes/:sceneId", (req, res) => {
  const run = runs.get(req.params.id);
  if (!run) return res.status(404).json({ error: "这一局记录不存在" });
  const sceneId = req.params.sceneId;
  if (!isScene(sceneId)) return res.status(400).json({ error: "场景不存在" });

  const expected = SCENE_ORDER[run.results.size];
  if (sceneId !== expected) {
    return res
      .status(409)
      .json({ error: `请先完成第 ${SCENES[expected].order} 关`, expected });
  }

  const actions = Array.isArray(req.body?.actions)
    ? req.body.actions.filter((a: unknown): a is string => typeof a === "string").slice(0, 40)
    : [];
  const outcome = resolveScene(sceneId, actions, run.resources);
  if (!outcome.finished) {
    return res.status(400).json({ error: "这一关还没有做出决定", outcome });
  }

  run.results.set(sceneId, outcome);
  run.resources = outcome.resources;
  res.json({ outcome, state: summaryOf(run) });
});

/* ---------------- Monad 测试网：配置、合约登记、成绩签名 ---------------- */

app.get("/api/chain/config", (_req, res) => {
  res.json({
    chain: CHAIN,
    contract: getContract(),
    scorer: scorer.address,
  });
});

app.post("/api/chain/contract", (req, res) => {
  try {
    const address = setContract(String(req.body?.address ?? ""));
    res.json({ ok: true, contract: address });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

app.post("/api/runs/:id/attest", (req, res) => {
  const run = runs.get(req.params.id);
  if (!run) return res.status(404).json({ error: "这一局记录不存在" });
  const summary = summaryOf(run);
  if (!summary.finished) return res.status(400).json({ error: "还没有完成全部关卡" });

  const player = String(req.body?.address ?? run.address ?? "");
  if (!/^0x[0-9a-fA-F]{40}$/.test(player)) {
    return res.status(400).json({ error: "缺少玩家钱包地址" });
  }
  if (run.address && run.address.toLowerCase() !== player.toLowerCase()) {
    return res.status(403).json({ error: "这一局不是这个钱包开的" });
  }

  const digest = digestOf(
    run.id,
    summary.score,
    summary.scenes.map((s) => `${s.sceneId}:${s.score}`),
  );

  if (!getContract()) {
    return res.json({
      ready: false,
      error: "合约尚未部署并登记，请先在链上工作台完成部署",
      digest,
      score: summary.score,
    });
  }

  try {
    const deadline = Math.floor(Date.now() / 1000) + 1800;
    const signature = signScore({
      player: player as `0x${string}`,
      runId: run.id,
      score: summary.score,
      digest,
      deadline,
    });
    res.json({
      ready: true,
      chainId: CHAIN.id,
      contract: getContract(),
      scorer: scorer.address,
      gameId: gameIdOf(run.id),
      score: summary.score,
      digest,
      deadline,
      signature,
      mode: run.mode,
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.get("/api/runs/:id/attest", (req, res) => {
  const run = runs.get(req.params.id);
  if (!run) return res.status(404).json({ error: "这一局记录不存在" });
  const summary = summaryOf(run);
  res.json({
    runId: run.id,
    gameId: gameIdOf(run.id),
    score: summary.score,
    finished: summary.finished,
    contract: getContract(),
    scorer: scorer.address,
    chainId: CHAIN.id,
  });
});

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, "../dist");
if (existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get("*", (_req, res) => res.sendFile(path.join(distDir, "index.html")));
}

app.listen(PORT, "127.0.0.1", () => console.log(`[服务端] http://127.0.0.1:${PORT}`));
