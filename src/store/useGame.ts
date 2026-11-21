import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { RunState } from "../api/client";

interface Store {
  runId: string | null;
  mode: "free" | "chain";
  state: RunState | null;
  muted: boolean;
  setMuted: (muted: boolean) => void;
  start: (state: RunState) => void;
  apply: (state: RunState) => void;
  reset: () => void;
}

export const useGame = create<Store>()(
  persist(
    (set) => ({
      runId: null,
      mode: "free",
      state: null,
      muted: false,
      setMuted: (muted) => set({ muted }),
      start: (state) => set({ runId: state.runId, mode: state.mode, state }),
      apply: (state) => set({ state }),
      reset: () => set({ runId: null, state: null }),
    }),
    { name: "hh-day-v1" },
  ),
);

export const useResources = () =>
  useGame((s) => s.state?.resources ?? { time: 180, money: 500, tasks: 0 });
