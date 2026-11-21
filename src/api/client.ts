import type { SceneId } from "../../shared/game/content";
import type { SceneOutcome } from "../../shared/game/rules";

export interface RunSceneRecord {
  sceneId: SceneId;
  score: number;
  taskDone: boolean;
  outcome: string;
  checks: number;
  mistakes: number;
  lost: number;
}

export interface RunState {
  runId: string;
  mode: "free" | "chain";
  resources: { time: number; money: number; tasks: number };
  scenes: RunSceneRecord[];
  score: number;
  maxScore: number;
  checks: number;
  mistakes: number;
  ending: { id: string; name: string; line: string; text: string };
  finished: boolean;
  address: string | null;
}

export class ApiError extends Error {
  status: number;
  payload: unknown;
  constructor(message: string, status: number, payload?: unknown) {
    super(message);
    this.status = status;
    this.payload = payload;
    this.name = "ApiError";
  }
}

async function call<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    throw new ApiError(
      (data && typeof data.error === "string" && data.error) || "服务暂时不可用",
      res.status,
      data,
    );
  }
  return data as T;
}

export const api = {
  createRun: (mode: "free" | "chain", address?: string) =>
    call<RunState>("/api/runs", { method: "POST", body: JSON.stringify({ mode, address }) }),
  getRun: (runId: string) => call<RunState & { outcomes: SceneOutcome[] }>(`/api/runs/${runId}`),
  submitScene: (runId: string, sceneId: SceneId, actions: string[]) =>
    call<{ outcome: SceneOutcome; state: RunState }>(`/api/runs/${runId}/scenes/${sceneId}`, {
      method: "POST",
      body: JSON.stringify({ actions }),
    }),
  attest: (runId: string, address?: string) =>
    call<{
      ready: boolean;
      error?: string;
      contract?: string;
      scorer?: string;
      gameId?: string;
      score?: number;
      digest?: string;
      deadline?: number;
      signature?: string;
    }>(`/api/runs/${runId}/attest`, { method: "POST", body: JSON.stringify({ address }) }),
  chainConfig: () =>
    call<{
      chain: { id: number; hexId: string; name: string; rpc: string; explorer: string; faucet: string };
      contract: string | null;
      scorer: string;
    }>("/api/chain/config"),
  registerContract: (address: string) =>
    call<{ ok: boolean; contract: string }>("/api/chain/contract", {
      method: "POST",
      body: JSON.stringify({ address }),
    }),
};
