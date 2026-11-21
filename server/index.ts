import express from "express";
import cors from "cors";
import { randomUUID, createHash } from "node:crypto";
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

/** 第三阶段：EIP-712 签名 + Monad 上链 */
app.post("/api/runs/:id/attest", async (req, res) => {
  const run = runs.get(req.params.id);
  if (!run) return res.status(404).json({ error: "这一局记录不存在" });
  const summary = summaryOf(run);
  if (!summary.finished) return res.status(400).json({ error: "还没有完成全部关卡" });

  const digest = createHash("sha256")
    .update([run.id, summary.score, ...summary.scenes.map((s) => `${s.sceneId}:${s.score}`)].join("|"))
    .digest("hex");

  const key = process.env.SCORER_PRIVATE_KEY;
  const contract = process.env.ATTEST_CONTRACT_ADDRESS;
  if (!key || !contract) {
    return res.status(200).json({
      ready: false,
      message: "尚未配置签名私钥与合约地址，合约部署后开放",
      digest,
      score: summary.score,
    });
  }

  try {
    const { privateKeyToAccount } = await import("viem/accounts");
    const account = privateKeyToAccount(key as `0x${string}`);
    const domain = {
      name: "HallucinationHunter",
      version: "1",
      chainId: 10143,
      verifyingContract: contract as `0x${string}`,
    } as const;
    const types = {
      Score: [
        { name: "player", type: "address" },
        { name: "gameId", type: "bytes32" },
        { name: "score", type: "uint256" },
        { name: "digest", type: "bytes32" },
        { name: "deadline", type: "uint256" },
      ],
    } as const;
    const message = {
      player: (req.body?.address ?? run.address) as `0x${string}`,
      gameId: run.id as `0x${string}`,
      score: BigInt(summary.score),
      digest: `0x${digest}` as `0x${string}`,
      deadline: BigInt(Math.floor(Date.now() / 1000) + 3600),
    };
    const signature = await account.signTypedData({
      domain,
      types,
      primaryType: "Score",
      message,
    });
    res.json({ ready: true, domain, types, message, signature, digest });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, "../dist");
if (existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get("*", (_req, res) => res.sendFile(path.join(distDir, "index.html")));
}

app.listen(PORT, "127.0.0.1", () => console.log(`[服务端] http://127.0.0.1:${PORT}`));
