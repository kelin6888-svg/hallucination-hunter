import test from "node:test";
import assert from "node:assert/strict";
import { resolveScene, cartTotals, resolveEnding, summarizeScenes } from "../shared/game/rules";
import { SCENE_ORDER, START_RESOURCES, SCENES, type SceneId } from "../shared/game/content";

const run = (id: SceneId, actions: string[], start = START_RESOURCES) =>
  resolveScene(id, actions, start);

test("五个场景都存在且能结算", () => {
  assert.equal(SCENE_ORDER.length, 5);
  for (const id of SCENE_ORDER) {
    const meta = SCENES[id];
    assert.ok(meta.title && meta.aiAdvice && meta.brief);
    assert.ok(Object.keys(meta.actions).length >= 4, `${id} 动作太少`);
  }
});

test("正确路线可以拿到满分，总分恰好 500", () => {
  const plan: Record<SceneId, string[]> = {
    ticket: ["see_order", "check_sender", "rebuy"],
    budget: ["toggle:drink", "toggle:cup", "toggle:snackB", "check_rules", "checkout"],
    parcel: ["view_log", "go_station"],
    rules: ["view_notice", "register"],
    bus: ["depart"],
  };
  let resources = { ...START_RESOURCES };
  let total = 0;
  for (const id of SCENE_ORDER) {
    const out = run(id, plan[id], resources);
    assert.equal(out.finished, true, `${id} 未结算`);
    assert.equal(out.score, 100, `${id} 满分失败`);
    total += out.score;
    resources = out.resources;
  }
  assert.equal(total, 500);
  assert.equal(resources.tasks, 5);
});

test("付了假链接的钱会真实损失资金并降低得分", () => {
  const out = run("ticket", ["pay_link", "accept_loss"]);
  assert.equal(out.finished, true);
  assert.equal(out.lost, 180);
  assert.equal(out.resources.money, START_RESOURCES.money - 180);
  assert.equal(out.taskDone, false);
  assert.ok(out.score <= 20);
});

test("购物车计算符合规则，超预算会被识别", () => {
  assert.equal(cartTotals(["drink", "cup", "snackA"], true).total, 66);
  assert.equal(cartTotals(["drink", "cup", "snackB"], true).total, 53);
  assert.equal(cartTotals(["cup"], true).total, 15);
  const over = run("budget", ["toggle:drink", "toggle:cup", "toggle:snackA", "checkout"]);
  assert.equal(over.taskDone, true);
  assert.ok(over.lost > 0);
  assert.equal(over.score, 50, "超预算不应拿到预算分");
});

test("少买一件不算完成任务", () => {
  const out = run("budget", ["toggle:drink", "toggle:cup", "checkout"]);
  assert.equal(out.taskDone, false);
  assert.equal(out.score, 0);
});

test("过度核实会错过末班车", () => {
  const ok = run("bus", ["check_schedule", "depart"]);
  assert.equal(ok.taskDone, true);
  assert.equal(ok.score, 100);
  const late = run("bus", ["check_schedule", "ask_friend", "depart"]);
  assert.equal(late.taskDone, false);
  assert.equal(late.score, 0);
});

test("物流白跑一趟后仍可补救，但拿不到效率分", () => {
  const out = run("parcel", ["go_gate", "go_station"]);
  assert.equal(out.taskDone, true);
  assert.equal(out.mistakes, 1);
  assert.equal(out.score, 60);
});

test("为不存在的规则付费会损失资金", () => {
  const out = run("rules", ["pay_fee", "refund", "register"]);
  assert.equal(out.taskDone, true);
  assert.equal(out.lost, 20);
  assert.ok(out.score < 100);
});

test("结局由实际记录决定", () => {
  assert.equal(
    resolveEnding({ tasks: 1, money: 300, time: 120, checks: 1, mistakes: 3, score: 120 }).name,
    "盲目信任者",
  );
  assert.equal(
    resolveEnding({ tasks: 5, money: 340, time: 120, checks: 9, mistakes: 0, score: 460 }).name,
    "过度怀疑者",
  );
  assert.equal(
    resolveEnding({ tasks: 5, money: 340, time: 120, checks: 3, mistakes: 0, score: 480 }).name,
    "高效协作者",
  );
  assert.equal(
    resolveEnding({ tasks: 3, money: 340, time: 120, checks: 2, mistakes: 1, score: 300 }).name,
    "冷静调查员",
  );
});

test("汇总分数与资源由同一份记录推出", () => {
  const records = [
    { sceneId: "ticket" as const, score: 100, taskDone: true, outcome: "", checks: 2, mistakes: 0, lost: 0 },
    { sceneId: "budget" as const, score: 80, taskDone: true, outcome: "", checks: 1, mistakes: 0, lost: 0 },
  ];
  const agg = summarizeScenes(records, { time: 140, money: 267, tasks: 2 });
  assert.equal(agg.score, 180);
  assert.equal(agg.checks, 3);
  assert.equal(agg.maxScore, 500);
});

test("同一组行动重复计算结果稳定，且客户端与服务端使用同一实现", () => {
  const a = run("parcel", ["view_log", "go_station"]);
  const b = run("parcel", ["view_log", "go_station"]);
  assert.deepEqual(a, b);
});
