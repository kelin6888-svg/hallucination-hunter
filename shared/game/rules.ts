import {
  BUS_WALK,
  BUS_WINDOW,
  SCENE_ORDER,
  SHOP_ITEMS,
  SHOP_RULES,
  type Resources,
  type SceneId,
  type ShopItemId,
} from "./content";

export interface ScorePart { key: string; label: string; value: number; max: number; note: string }
export type SceneStage = "active" | "remedy" | "done";

export interface SceneOutcome {
  sceneId: SceneId;
  stage: SceneStage;
  resources: Resources;
  score: number;
  parts: ScorePart[];
  taskDone: boolean;
  spent: number;
  lost: number;
  timeSpent: number;
  checks: number;
  mistakes: number;
  beats: string[];
  outcome: string;
  aiWasRight: boolean;
  finished: boolean;
  ui: Record<string, number | boolean | string[]>;
}

const base = (start: Resources) => ({
  time: start.time,
  money: start.money,
  checks: 0,
  mistakes: 0,
  lost: 0,
  spent: 0,
  beats: [] as string[],
  outcome: "",
});

export interface CartTotals {
  subtotal: number; discount: number; coupon: number; total: number;
  overBudget: number; complete: boolean; count: number;
}

export function cartTotals(cart: ShopItemId[], coupon: boolean): CartTotals {
  const subtotal = cart.reduce((sum, id) => sum + SHOP_ITEMS[id].price, 0);
  const discount = subtotal >= SHOP_RULES.threshold ? SHOP_RULES.off : 0;
  const couponOff = coupon && subtotal > 0 ? SHOP_RULES.coupon : 0;
  const total = Math.max(0, subtotal - discount - couponOff);
  const complete =
    cart.includes("drink") && cart.includes("cup") &&
    (cart.includes("snackA") || cart.includes("snackB"));
  return { subtotal, discount, coupon: couponOff, total, overBudget: Math.max(0, total - SHOP_RULES.budget), complete, count: cart.length };
}

const scoreOf = (parts: ScorePart[]) => parts.reduce((n, p) => n + p.value, 0);

/* ---------------------------- 01 抢票 ---------------------------- */
function ticket(actions: string[], start: Resources): SceneOutcome {
  const s = base(start);
  let stage: SceneStage = "active";
  let taskDone = false;
  const seen = new Set<string>();

  for (const a of actions) {
    if (stage === "done") break;
    if (stage === "remedy") {
      if (a === "report") {
        s.time -= 8; s.money += 60; s.lost -= 60;
        s.beats.push("你提交举报并申请冻结，平台追回 60 元。");
        s.outcome = "追回 60 元，净损失 120 元，票没拿到。";
        stage = "done";
      } else if (a === "accept_loss") {
        s.beats.push("你没有再追究，对方把你拉黑了。");
        s.outcome = "180 元打了水漂，票也没了。";
        stage = "done";
      }
      continue;
    }
    switch (a) {
      case "see_order":
        if (!seen.has(a)) { seen.add(a); s.checks++; s.time -= 3;
          s.beats.push("官方订单已超时关闭，页面写明「仅限本站收银台支付」。"); }
        break;
      case "check_sender":
        if (!seen.has(a)) { seen.add(a); s.checks++; s.time -= 3;
          s.beats.push("发消息的账号注册 3 天、无官方认证，收款方是个人账户。"); }
        break;
      case "read_notice":
        if (!seen.has(a)) { seen.add(a); s.checks++; s.time -= 2;
          s.beats.push("票务公告：官方不会通过私聊发送付款链接。"); }
        break;
      case "pay_link":
        s.money -= 180; s.lost += 180; s.mistakes++; s.time -= 5;
        s.beats.push("转账成功的瞬间，对方账号消失，链接打不开了。");
        stage = "remedy";
        break;
      case "rebuy":
        s.money -= 180; s.spent += 180; s.time -= 1; taskDone = true;
        s.beats.push("你在官方页面重新下单，两分钟后出票成功。");
        s.outcome = "票拿到了，时间几乎没耽误。";
        stage = "done";
        break;
      case "give_up":
        s.outcome = "你关掉页面，今晚的演出不去了。";
        stage = "done";
        break;
    }
  }

  const parts: ScorePart[] = [
    { key: "task", label: "拿到票", value: taskDone ? 50 : 0, max: 50,
      note: taskDone ? "通过官方渠道完成购票。" : "没有完成购票任务。" },
    { key: "loss", label: "没有资金损失", value: s.lost <= 0 ? 30 : 0, max: 30,
      note: s.lost <= 0 ? "没有往陌生账户转钱。" : `损失 ${s.lost} 元。` },
    { key: "verify", label: "有价值的核实", value: s.checks > 0 ? 20 : 0, max: 20,
      note: s.checks > 0 ? `核对了 ${s.checks} 处信息。` : "没有核对任何信息。" },
  ];

  return {
    sceneId: "ticket", stage,
    resources: { time: s.time, money: s.money, tasks: start.tasks + (taskDone ? 1 : 0) },
    score: scoreOf(parts), parts, taskDone,
    spent: s.spent, lost: Math.max(0, s.lost), timeSpent: start.time - s.time,
    checks: s.checks, mistakes: s.mistakes, beats: s.beats,
    outcome: s.outcome || (stage === "remedy" ? "钱已经转出去，只能补救了。" : ""),
    aiWasRight: false, finished: stage === "done", ui: {},
  };
}

/* ---------------------------- 02 预算 ---------------------------- */
function budget(actions: string[], start: Resources): SceneOutcome {
  const s = base(start);
  let stage: SceneStage = "active";
  let cart: ShopItemId[] = [];
  let coupon = true;
  let rulesSeen = false;
  let calcUsed = false;
  let taskDone = false;

  for (const a of actions) {
    if (stage === "done") break;
    if (a.startsWith("toggle:")) {
      const id = a.slice(7) as ShopItemId;
      if (!(id in SHOP_ITEMS)) continue;
      cart = cart.includes(id) ? cart.filter((x) => x !== id) : [...cart, id];
      continue;
    }
    switch (a) {
      case "toggle:coupon":
        coupon = !coupon;
        break;
      case "check_rules":
        if (!rulesSeen) { rulesSeen = true; s.checks++; s.time -= 2;
          s.beats.push("规则：满 80 减 20，可叠加 10 元券，先满减、后用券。"); }
        break;
      case "calc":
        if (!calcUsed) { calcUsed = true; s.checks++; s.time -= 1;
          s.beats.push("你按了一遍计算器，发现 AI 报的总价对不上。"); }
        break;
      case "checkout": {
        const t = cartTotals(cart, coupon);
        s.time -= 2;
        if (!t.complete) {
          s.beats.push("结算页提示：气泡水、纸杯、一份零食，缺一不可。");
          s.outcome = "东西没买齐，下午的活动没法开展。";
          stage = "done";
          break;
        }
        s.money -= t.total;
        s.spent += t.total;
        taskDone = true;
        if (t.total > SHOP_RULES.budget) {
          s.mistakes++;
          s.lost += t.total - SHOP_RULES.budget;
          s.beats.push(`结算成功，实付 ${t.total} 元，超出预算 ${t.total - SHOP_RULES.budget} 元。`);
          s.outcome = `买齐了，但超支 ${t.total - SHOP_RULES.budget} 元。`;
        } else {
          s.beats.push(`结算成功，实付 ${t.total} 元，预算还剩 ${SHOP_RULES.budget - t.total} 元。`);
          s.outcome = `买齐了，还省下 ${SHOP_RULES.budget - t.total} 元。`;
        }
        stage = "done";
        break;
      }
    }
  }

  const t = cartTotals(cart, coupon);
  const parts: ScorePart[] = [
    { key: "task", label: "买齐三样", value: taskDone ? 50 : 0, max: 50,
      note: taskDone ? "气泡水、纸杯、零食都到手。" : "没有买齐指定物品。" },
    { key: "budget", label: "控制在预算内", value: taskDone && t.total <= SHOP_RULES.budget ? 30 : 0, max: 30,
      note: taskDone ? `实付 ${t.total} 元，预算 ${SHOP_RULES.budget} 元。` : "未完成结算。" },
    { key: "verify", label: "自己核算过", value: rulesSeen || calcUsed ? 20 : 0, max: 20,
      note: rulesSeen || calcUsed ? "看过规则或用计算器核过价。" : "直接相信了 AI 的报价。" },
  ];

  return {
    sceneId: "budget", stage,
    resources: { time: s.time, money: s.money, tasks: start.tasks + (taskDone ? 1 : 0) },
    score: scoreOf(parts), parts, taskDone,
    spent: s.spent, lost: Math.max(0, s.lost), timeSpent: start.time - s.time,
    checks: s.checks, mistakes: s.mistakes, beats: s.beats,
    outcome: s.outcome || "还在挑东西。",
    aiWasRight: false, finished: stage === "done",
    ui: { subtotal: t.subtotal, total: t.total, discount: t.discount, coupon: coupon ? 1 : 0, complete: t.complete ? 1 : 0 },
  };
}

/* ---------------------------- 03 快递 ---------------------------- */
function parcel(actions: string[], start: Resources): SceneOutcome {
  const s = base(start);
  let stage: SceneStage = "active";
  let taskDone = false;
  const seen = new Set<string>();

  for (const a of actions) {
    if (stage === "done") break;
    if (stage === "remedy") {
      if (a === "go_station") {
        s.time -= 12; taskDone = true;
        s.beats.push("你赶到城西配送站，包裹还在待分拣的架子上，报手机号就取到了。");
        s.outcome = "多跑了一趟，但包裹拿到了。";
        stage = "done";
      } else if (a === "go_home") {
        s.beats.push("你先回了家，包裹今天没取到。");
        s.outcome = "包裹还在配送站，今天没拿到。";
        stage = "done";
      }
      continue;
    }
    switch (a) {
      case "view_log":
        if (!seen.has(a)) { seen.add(a); s.checks++; s.time -= 3;
          s.beats.push("物流详情：10:12 到达城西配送站；10:40 已发出，预计 14:00 前送到驿站，目前尚未到达。"); }
        break;
      case "call_station":
        if (!seen.has(a)) { seen.add(a); s.checks++; s.time -= 5;
          s.beats.push("配送站值班员：包裹还在站里，下午 15:30 才发车。"); }
        break;
      case "view_map":
        if (!seen.has(a)) { seen.add(a); s.checks++; s.time -= 2;
          s.beats.push("地图显示：包裹定位停在城西配送站，距离你 2.1 公里。"); }
        break;
      case "go_gate":
        s.time -= 14; s.mistakes++;
        s.beats.push("保安亭旁有三排快递柜，你逐个翻了取件码，没有你的包裹。");
        s.outcome = "白跑一趟，包裹根本还没送到。";
        stage = "remedy";
        break;
      case "go_station":
        s.time -= 12; taskDone = true;
        s.beats.push("你直达配送站，包裹还在架子上，报手机号取到了。");
        s.outcome = "一步到位，包裹到手。";
        stage = "done";
        break;
    }
  }

  const parts: ScorePart[] = [
    { key: "task", label: "取到包裹", value: taskDone ? 60 : 0, max: 60,
      note: taskDone ? "包裹已经在手里。" : "包裹还在配送站。" },
    { key: "waste", label: "没有白跑", value: taskDone && s.mistakes === 0 ? 20 : 0, max: 20,
      note: s.mistakes === 0 ? "直接去了正确的地方。" : "先去了一趟错误的地点。" },
    { key: "verify", label: "核对过物流", value: s.checks > 0 ? 20 : 0, max: 20,
      note: s.checks > 0 ? "看过完整记录或问过站点。" : "只凭 AI 的判断就出门了。" },
  ];

  return {
    sceneId: "parcel", stage,
    resources: { time: s.time, money: s.money, tasks: start.tasks + (taskDone ? 1 : 0) },
    score: scoreOf(parts), parts, taskDone,
    spent: 0, lost: 0, timeSpent: start.time - s.time,
    checks: s.checks, mistakes: s.mistakes, beats: s.beats,
    outcome: s.outcome || "你还在原地。",
    aiWasRight: false, finished: stage === "done", ui: {},
  };
}

/* ---------------------------- 04 规则 ---------------------------- */
function rules(actions: string[], start: Resources): SceneOutcome {
  const s = base(start);
  let stage: SceneStage = "active";
  let taskDone = false;
  let refunded = false;
  const seen = new Set<string>();

  for (const a of actions) {
    if (stage === "done") break;
    if (stage === "remedy") {
      if (a === "refund" && !refunded) {
        refunded = true; s.time -= 8; s.money += 30; s.lost -= 30;
        s.beats.push("工作人员确认没有收费，退给你 30 元，另 20 元对方已经提走。");
        s.outcome = "追回一部分，净损失 20 元。";
        stage = "active";
      } else if (a === "skip_refund") {
        stage = "done";
        s.outcome = "50 元没要回来，活动也没参加。";
      }
      continue;
    }
    switch (a) {
      case "view_event":
        if (!seen.has(a)) { seen.add(a); s.checks++; s.time -= 2;
          s.beats.push("活动页面：免费参加，线上登记即可，限额 20 人。"); }
        break;
      case "view_notice":
        if (!seen.has(a)) { seen.add(a); s.checks++; s.time -= 3;
          s.beats.push("《活动须知》全文五条：报名、时间、物品要求、安全提示、场地规则。没有任何收费条款。"); }
        break;
      case "ask_staff":
        if (!seen.has(a)) { seen.add(a); s.checks++; s.time -= 4;
          s.beats.push("工作人员：「全免费，别转钱给任何人，我们只收登记表。」"); }
        break;
      case "pay_fee":
        s.money -= 50; s.lost += 50; s.mistakes++; s.time -= 2;
        s.beats.push("你把 50 元转给了「报名专员」，对方收了钱就再没回复。");
        stage = "remedy";
        break;
      case "register":
        taskDone = true; s.time -= 1;
        s.beats.push("你在活动页点了登记，名额确认，页面没有任何缴费入口。");
        s.outcome = "报名成功，一分钱没花。";
        stage = "done";
        break;
      case "skip":
        s.outcome = "你放弃了这次活动。";
        stage = "done";
        break;
    }
  }

  const parts: ScorePart[] = [
    { key: "task", label: "完成报名", value: taskDone ? 50 : 0, max: 50,
      note: taskDone ? "报名成功。" : "没有完成报名。" },
    { key: "loss", label: "没有多花钱", value: s.lost <= 0 ? 30 : 0, max: 30,
      note: s.lost <= 0 ? "没有为不存在的规则付费。" : `净损失 ${s.lost} 元。` },
    { key: "verify", label: "核对过须知", value: s.checks > 0 ? 20 : 0, max: 20,
      note: s.checks > 0 ? "看过公告或问过工作人员。" : "直接相信了「第七条」。" },
  ];

  return {
    sceneId: "rules", stage,
    resources: { time: s.time, money: s.money, tasks: start.tasks + (taskDone ? 1 : 0) },
    score: scoreOf(parts), parts, taskDone,
    spent: 0, lost: Math.max(0, s.lost), timeSpent: start.time - s.time,
    checks: s.checks, mistakes: s.mistakes, beats: s.beats,
    outcome: s.outcome || (stage === "remedy" ? "钱已经付出去了。" : "你还在犹豫。"),
    aiWasRight: false, finished: stage === "done", ui: {},
  };
}

/* ---------------------------- 05 末班车 ---------------------------- */
function bus(actions: string[], start: Resources): SceneOutcome {
  const s = base(start);
  let stage: SceneStage = "active";
  let waited = 0;
  let boarded: boolean | null = null;
  const seen = new Set<string>();

  for (const a of actions) {
    if (stage === "done") break;
    switch (a) {
      case "check_schedule":
        if (!seen.has(a)) { seen.add(a); s.checks++; waited += 4;
          s.beats.push("站牌时刻表确认：17:10 发车，下一班 17:40，已经来不及。"); }
        break;
      case "ask_friend":
        if (!seen.has(a)) { seen.add(a); s.checks++; waited += 4;
          s.beats.push("朋友说：「准点，但你别磨蹭，走过去要十几分钟。」"); }
        break;
      case "check_app":
        if (!seen.has(a)) { seen.add(a); s.checks++; waited += 3;
          s.beats.push("出行软件显示车辆正常，没有延误提示。"); }
        break;
      case "depart": {
        const left = BUS_WINDOW - waited;
        boarded = left >= BUS_WALK;
        if (boarded) {
          s.beats.push(`你走了 ${BUS_WALK} 分钟，赶在 17:10 前上了车。`);
          s.outcome = "刚好赶上，17:22 就能到活动现场。";
        } else {
          s.beats.push(`你出发时只剩 ${left} 分钟，走到站台时车已经开走了。`);
          s.outcome = "错过这班车，活动要迟到了。";
          s.mistakes++;
        }
        stage = "done";
        break;
      }
    }
  }

  const parts: ScorePart[] = [
    { key: "task", label: "赶上接驳车", value: boarded ? 70 : 0, max: 70,
      note: boarded ? "17:10 的车坐上了。" : boarded === false ? "错过了这班车。" : "还没出发。" },
    { key: "efficient", label: "没有过度核实", value: boarded && waited <= 4 ? 30 : 0, max: 30,
      note: waited <= 4 ? "最多核对了一次就行动。" : `核实花了 ${waited} 分钟，时间被吃掉。` },
  ];

  const timeCost = waited;
  return {
    sceneId: "bus", stage,
    resources: { time: s.time - timeCost, money: s.money, tasks: start.tasks + (boarded ? 1 : 0) },
    score: scoreOf(parts), parts, taskDone: Boolean(boarded),
    spent: 0, lost: 0, timeSpent: timeCost,
    checks: s.checks, mistakes: boarded === false ? 1 : 0, beats: s.beats,
    outcome: s.outcome || "你还在站台附近。",
    aiWasRight: true, finished: stage === "done", ui: { waited, left: Math.max(0, BUS_WINDOW - waited) },
  };
}

const RESOLVERS = { ticket, budget, parcel, rules, bus } as const;

export function resolveScene(sceneId: SceneId, actions: string[], start: Resources): SceneOutcome {
  const resolver = RESOLVERS[sceneId];
  if (!resolver) throw new Error(`未知场景：${sceneId}`);
  return resolver(actions.slice(0, 40), start);
}

/* ---------------------------- 结算与结局 ---------------------------- */
export interface RunSceneRecord { sceneId: SceneId; score: number; taskDone: boolean; outcome: string; checks: number; mistakes: number; lost: number }

export interface Ending {
  id: string; name: string; line: string; text: string;
}

export function resolveEnding(input: {
  tasks: number; money: number; time: number; checks: number; mistakes: number; score: number;
}): Ending {
  const { tasks, time, checks, mistakes, score } = input;
  if (mistakes >= 2) {
    return { id: "trusting", name: "盲目信任者", line: "你把决定权交给了那个总说「应该没问题」的声音。",
      text: "这一天里，你两次以上照着 AI 的判断直接行动，钱和时间都替你交了学费。它不是骗子，只是从来不说「我不确定」。" };
  }
  if (checks >= 7 || time <= 80) {
    return { id: "overthinker", name: "过度怀疑者", line: "你把一天过成了一场没完没了的核对。",
      text: "你几乎每一步都要再查一遍，风险确实避开了，但时间也被吃掉了。独立判断不等于无限核实。" };
  }
  if (tasks >= 4 && mistakes <= 1 && score >= 380) {
    return { id: "collaborator", name: "高效协作者", line: "该信的时候信，该查的时候查。",
      text: "你把 AI 当成一个很快但会犯错的同事：先听它的思路，再自己确认关键的一步。五件事里你完成了大部分。" };
  }
  if (tasks >= 3) {
    return { id: "calm", name: "冷静调查员", line: "你没有全信，也没有全疑。",
      text: "你在几个关键节点停下来核对，避开了最贵的坑。剩下的时间，够你把这一天过完。" };
  }
  return { id: "ordinary", name: "普通的一天", line: "事情没做完，但你都还记得。",
    text: "这一天漏掉了几件事。AI 的建议有对有错，而你还没来得及分辨。" };
}

export function summarizeScenes(records: RunSceneRecord[], resources: Resources) {
  const score = records.reduce((sum, r) => sum + r.score, 0);
  const checks = records.reduce((sum, r) => sum + r.checks, 0);
  const mistakes = records.reduce((sum, r) => sum + r.mistakes, 0);
  return {
    score,
    maxScore: SCENE_ORDER.length * 100,
    checks,
    mistakes,
    resources,
    ending: resolveEnding({ tasks: resources.tasks, money: resources.money, time: resources.time, checks, mistakes, score }),
  };
}
