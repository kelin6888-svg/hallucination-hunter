/**
 * 《失控的周六》场景与资源定义。
 * 这是唯一的事实来源：客户端用它即时渲染，服务端用同一份规则重算成绩。
 */

export type SceneId = "ticket" | "budget" | "parcel" | "rules" | "bus";

export const SCENE_ORDER: SceneId[] = ["ticket", "budget", "parcel", "rules", "bus"];

export interface Resources {
  /** 剩余时间（分钟） */
  time: number;
  /** 剩余预算（元） */
  money: number;
  /** 已完成任务数 */
  tasks: number;
}

export const START_RESOURCES: Resources = { time: 180, money: 500, tasks: 0 };
export const MAX_SCORE = 500;
export const SCENE_MAX = 100;

export type ActionKind = "check" | "act" | "end";

export interface ActionMeta {
  label: string;
  kind: ActionKind;
  /** 界面上的短说明 */
  hint?: string;
}

export interface SceneMeta {
  id: SceneId;
  order: number;
  app: string;
  place: string;
  clock: string;
  title: string;
  /** 场景开场（两句以内） */
  brief: string;
  /** 今天这一关要完成的事 */
  goal: string;
  /** AI 给出的建议（2-3 句） */
  aiAdvice: string;
  /** AI 这条建议是否可靠 */
  adviceReliable: boolean;
  actions: Record<string, ActionMeta>;
}

export const SCENES: Record<SceneId, SceneMeta> = {
  ticket: {
    id: "ticket",
    order: 1,
    app: "票务",
    place: "家中 · 14:20",
    clock: "14:20",
    title: "抢票危机",
    brief: "你抢到了今晚演出的最后一张票，站内支付却一直转圈。刚打开聊天软件，一个「客服」发来了新的付款链接。",
    goal: "拿到票，别让今天的生活费凭空少掉一大截。",
    aiAdvice:
      "站内支付可能卡住了，那个链接应该是官方备用通道。不想丢票的话，先付了再说。",
    adviceReliable: false,
    actions: {
      see_order: { label: "查看官方订单", kind: "check", hint: "订单号、金额、支付方式" },
      check_sender: { label: "查看发消息的账号", kind: "check", hint: "注册时间、认证标识" },
      read_notice: { label: "打开票务公告", kind: "check", hint: "官方会不会私聊发链接" },
      pay_link: { label: "按链接付款", kind: "act", hint: "180 元" },
      rebuy: { label: "回官方页面重新下单", kind: "act", hint: "180 元" },
      give_up: { label: "放弃这张票", kind: "end", hint: "任务作废" },
      report: { label: "联系平台举报并申请冻结", kind: "act", hint: "8 分钟" },
      accept_loss: { label: "认栽，继续今天的事", kind: "end" },
    },
  },
  budget: {
    id: "budget",
    order: 2,
    app: "商城",
    place: "超市线上店 · 15:05",
    clock: "15:05",
    title: "预算保卫战",
    brief: "下午的活动需要你带三样东西：气泡水、纸杯，和一份零食。你给自己定了 60 元预算。",
    goal: "买齐三样东西（气泡水、纸杯、任选一份零食），并且不超过 60 元。",
    aiAdvice:
      "气泡水 39、薯片 32、纸杯 25，一共 96。满 80 减 20，再用 10 元券，最后 56，预算内，直接下单吧。",
    adviceReliable: false,
    actions: {
      "toggle:drink": { label: "气泡水 39 元", kind: "act" },
      "toggle:cup": { label: "纸杯 25 元", kind: "act" },
      "toggle:snackA": { label: "薯片 32 元", kind: "act" },
      "toggle:snackB": { label: "饼干 19 元", kind: "act" },
      "toggle:wipe": { label: "湿巾 18 元", kind: "act" },
      "toggle:coupon": { label: "使用 10 元无门槛券", kind: "act" },
      check_rules: { label: "查看优惠规则", kind: "check", hint: "满减门槛与叠加方式" },
      calc: { label: "打开计算器按一遍", kind: "check", hint: "1 分钟" },
      checkout: { label: "去结算", kind: "end" },
    },
  },
  parcel: {
    id: "parcel",
    order: 3,
    app: "物流",
    place: "小区门口 · 16:05",
    clock: "16:05",
    title: "消失的快递",
    brief: "你急需一个包裹，物流信息停在「运输中」。AI 说它应该已经在小区门口了。",
    goal: "把包裹拿到手，别把下午的时间耗在来回跑上。",
    aiAdvice:
      "物流三天没更新，通常就是已经放到小区门口了。你直接去保安亭旁边找找，应该就在那儿。",
    adviceReliable: false,
    actions: {
      view_log: { label: "查看完整物流记录", kind: "check", hint: "最后一条记录" },
      call_station: { label: "打电话问配送站", kind: "check", hint: "5 分钟" },
      view_map: { label: "打开物流地图", kind: "check", hint: "包裹现在在哪" },
      go_gate: { label: "去小区门口取件", kind: "act", hint: "14 分钟" },
      go_station: { label: "去城西配送站", kind: "act", hint: "12 分钟" },
      go_home: { label: "先回家，改天再取", kind: "end" },
    },
  },
  rules: {
    id: "rules",
    order: 4,
    app: "社区",
    place: "社区中心 · 16:40",
    clock: "16:40",
    title: "不存在的规则",
    brief: "你报了名参加社区的旧物交换市集。AI 提醒你，按「活动须知第七条」还要交 50 元报名费。",
    goal: "确认能不能免费参加，并完成报名。",
    aiAdvice: "根据活动须知第七条，参与者要另交 50 元报名费，不交就视为放弃名额。建议先交上。",
    adviceReliable: false,
    actions: {
      view_event: { label: "打开活动页面", kind: "check", hint: "报名要求" },
      view_notice: { label: "读一遍活动须知", kind: "check", hint: "一共几条" },
      ask_staff: { label: "问现场工作人员", kind: "check", hint: "4 分钟" },
      register: { label: "直接登记报名", kind: "act" },
      pay_fee: { label: "交 50 元报名费", kind: "act", hint: "50 元" },
      skip: { label: "不去了", kind: "end" },
      refund: { label: "找工作人员说明并要求退款", kind: "act", hint: "8 分钟" },
      skip_refund: { label: "算了，不追究", kind: "end" },
    },
  },
  bus: {
    id: "bus",
    order: 5,
    app: "出行",
    place: "社区站台 · 16:52",
    clock: "16:52",
    title: "最后的信任",
    brief: "活动 17:40 开始。你还要坐社区接驳车，走过去要 12 分钟。距离最近一班发车还有 18 分钟。",
    goal: "赶上 17:10 的接驳车，别迟到。",
    aiAdvice: "按时刻表，下一班 17:10 发车，走过去 12 分钟，现在出发正好来得及。",
    adviceReliable: true,
    actions: {
      check_schedule: { label: "看一眼站牌时刻表", kind: "check", hint: "4 分钟" },
      ask_friend: { label: "问朋友车准不准点", kind: "check", hint: "4 分钟" },
      check_app: { label: "再查一次出行软件", kind: "check", hint: "3 分钟" },
      depart: { label: "现在出发", kind: "end" },
    },
  },
};

/** 购物车商品（预算关） */
export const SHOP_ITEMS = {
  drink: { id: "drink", name: "气泡水", price: 39, required: true },
  cup: { id: "cup", name: "纸杯", price: 25, required: true },
  snackA: { id: "snackA", name: "薯片", price: 32, required: false },
  snackB: { id: "snackB", name: "饼干", price: 19, required: false },
  wipe: { id: "wipe", name: "湿巾", price: 18, required: false },
} as const;

export type ShopItemId = keyof typeof SHOP_ITEMS;

export const SHOP_RULES = { threshold: 80, off: 20, coupon: 10, budget: 60, shipping: 0 };

/** 物流地点（快递关） */
export const PARCEL_PLACES = [
  { id: "station", name: "城西配送站", distance: "2.1 公里", note: "中转与分拣" },
  { id: "gate", name: "小区门口驿站", distance: "0.4 公里", note: "快递柜与代收点" },
  { id: "home", name: "家", distance: "0 米", note: "你在这里" },
] as const;

export const BUS_WINDOW = 18;
export const BUS_WALK = 12;
