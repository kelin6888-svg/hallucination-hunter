import { motion } from "framer-motion";
import { BadgeCheck, MapPin, Minus, Plus, Sparkles, Timer, Wallet } from "lucide-react";
import { cn } from "../lib/utils";
import { SHOP_ITEMS, SHOP_RULES, type SceneId, type SceneMeta, type ShopItemId } from "../../shared/game/content";
import { cartTotals, type SceneOutcome } from "../../shared/game/rules";

interface SceneProps {
  sceneId: SceneId;
  meta: SceneMeta;
  actions: string[];
  preview: SceneOutcome;
  onAction: (id: string) => void;
  busy: boolean;
}

const REMEDY_ONLY = new Set(["report", "accept_loss", "refund", "skip_refund", "go_home"]);

function ActionButton({
  id, label, hint, onClick, disabled, tone = "default", badge,
}: {
  id: string; label: string; hint?: string; onClick: (id: string) => void;
  disabled?: boolean; tone?: "default" | "primary" | "danger" | "ghost"; badge?: string;
}) {
  const styles = {
    default: "border-white/12 bg-white/[0.04] text-white/80 hover:border-violet-400/45 hover:bg-violet-500/10",
    primary: "border-violet-400/40 bg-violet-600/80 text-white hover:bg-violet-600",
    danger: "border-alarm/30 bg-alarm/10 text-alarm hover:bg-alarm/20",
    ghost: "border-white/10 bg-transparent text-white/55 hover:text-white/80",
  }[tone];
  return (
    <button
      type="button"
      onClick={() => onClick(id)}
      disabled={disabled}
      className={cn("flex w-full items-center justify-between gap-2 rounded-xl border px-3.5 py-2.5 text-left text-[14px] transition disabled:opacity-40", styles)}
    >
      <span className="min-w-0">
        <span className="block truncate">{label}</span>
        {hint ? <span className="mt-0.5 block text-[11px] text-white/35">{hint}</span> : null}
      </span>
      {badge ? <span className="shrink-0 font-mono text-[10px] text-white/40">{badge}</span> : null}
    </button>
  );
}

export function SceneBody({ sceneId, meta, actions, preview, onAction, busy }: SceneProps) {
  const acts = meta.actions;

  const list = Object.entries(acts).filter(([id, a]) => {
    if (REMEDY_ONLY.has(id)) return preview.stage === "remedy";
    if (id === "go_station" && sceneId === "parcel") return true;
    if (id === "checkout") return true;
    if (a.kind === "end" && preview.stage === "remedy" && id !== "skip" && id !== "give_up") return false;
    return true;
  });

  return (
    <div className="space-y-3">
      {sceneId === "ticket" && <TicketView preview={preview} />}
      {sceneId === "budget" && <BudgetView actions={actions} onAction={onAction} busy={busy} />}
      {sceneId === "parcel" && <ParcelView preview={preview} />}
      {sceneId === "rules" && <RulesView preview={preview} />}
      {sceneId === "bus" && <BusView preview={preview} />}

      <div className="space-y-2">
        {list.map(([id, a]) => (
          <ActionButton
            key={id}
            id={id}
            label={a.label}
            hint={a.hint}
            onClick={onAction}
            disabled={busy}
            tone={
              id === "pay_link" || id === "pay_fee"
                ? "danger"
                : id === "rebuy" || id === "register" || id === "depart" || id === "checkout"
                  ? "primary"
                  : "default"
            }
          />
        ))}
      </div>

      {preview.beats.length > 0 ? (
        <div className="space-y-1.5 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
          {preview.beats.slice(-3).map((beat, i) => (
            <motion.p
              key={i}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-[13px] leading-relaxed text-white/55"
            >
              · {beat}
            </motion.p>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function TicketView({ preview }: { preview: SceneOutcome }) {
  return (
    <div className="space-y-2">
      <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3.5">
        <div className="flex items-center justify-between">
          <span className="text-[13px] text-white/70">今晚 · 城市音乐厅</span>
          <span className="rounded bg-alarm/15 px-1.5 py-0.5 font-mono text-[10px] text-alarm">待支付</span>
        </div>
        <div className="mt-1.5 flex items-end justify-between">
          <span className="text-[15px] text-white/85">演出票 × 1</span>
          <span className="font-mono text-[20px] text-white">180</span>
        </div>
        <div className="mt-1 font-mono text-[10px] text-white/30">订单 T-88213 · 剩余 04:59</div>
      </div>
      <div className="rounded-xl border border-amber/25 bg-amber/[0.06] p-3">
        <div className="flex items-center gap-1.5 font-mono text-[10px] tracking-wider text-amber/80">
          <Sparkles size={11} /> 私聊消息 · 票务客服-小林
        </div>
        <p className="mt-1.5 text-[13px] leading-relaxed text-white/70">
          「系统升级，站内支付暂时不可用，点这个链接补差价，5 分钟内有效。」
        </p>
        <div className="mt-2 rounded bg-black/30 px-2 py-1.5 font-mono text-[10px] text-white/35">
          pay-ticket-fast.example/order/88213
        </div>
      </div>
      {preview.stage === "remedy" ? (
        <div className="rounded-xl border border-alarm/25 bg-alarm/[0.07] p-3 text-[12px] text-alarm/85">
          钱已经转出去了。现在只能尽量止损。
        </div>
      ) : null}
    </div>
  );
}

function deriveCart(actions: string[]) {
  let cart: ShopItemId[] = [];
  let coupon = true;
  for (const a of actions) {
    if (a === "toggle:coupon") { coupon = !coupon; continue; }
    if (a.startsWith("toggle:")) {
      const id = a.slice(7) as ShopItemId;
      if (!(id in SHOP_ITEMS)) continue;
      cart = cart.includes(id) ? cart.filter((x) => x !== id) : [...cart, id];
    }
  }
  return { cart, coupon };
}

function BudgetView({ actions, onAction, busy }: Pick<SceneProps, "actions" | "onAction" | "busy">) {
  const { cart, coupon } = deriveCart(actions);
  const totals = cartTotals(cart, coupon);
  return (
    <div className="space-y-2">
      <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3">
        <div className="flex items-center justify-between font-mono text-[10px] text-white/35">
          <span>购物车 {totals.count} 件</span>
          <span className={cn(totals.total > SHOP_RULES.budget ? "text-alarm" : "text-verify")}>
            实付 {totals.total} / 预算 {SHOP_RULES.budget}
          </span>
        </div>
        <div className="mt-2 space-y-1.5">
          {Object.values(SHOP_ITEMS).map((item) => {
            const inCart = cart.includes(item.id as ShopItemId);
            return (
              <button
                key={item.id}
                type="button"
                disabled={busy}
                onClick={() => onAction(`toggle:${item.id}`)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg border px-2.5 py-2 text-left transition",
                  inCart ? "border-violet-400/40 bg-violet-500/10" : "border-white/[0.06] bg-white/[0.02]",
                )}
              >
                <span className={cn("flex h-5 w-5 items-center justify-center rounded", inCart ? "bg-violet-500/30 text-violet-100" : "bg-white/[0.06] text-white/40")}>
                  {inCart ? <Minus size={11} /> : <Plus size={11} />}
                </span>
                <span className="flex-1 text-[13px] text-white/80">{item.name}</span>
                <span className="font-mono text-[12px] text-white/50">{item.price}</span>
              </button>
            );
          })}
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => onAction("toggle:coupon")}
          className="mt-2 flex w-full items-center justify-between rounded-lg border border-white/[0.08] px-2.5 py-2 text-[12px] text-white/60"
        >
          <span>10 元无门槛券</span>
          <span className={cn("rounded px-1.5 py-0.5 text-[10px]", coupon ? "bg-verify/15 text-verify" : "bg-white/[0.06] text-white/35")}>
            {coupon ? "已使用" : "未使用"}
          </span>
        </button>
        <div className="mt-2 space-y-0.5 border-t border-white/[0.07] pt-2 font-mono text-[11px] text-white/40">
          <div className="flex justify-between"><span>商品合计</span><span>{totals.subtotal}</span></div>
          <div className="flex justify-between"><span>满 {SHOP_RULES.threshold} 减 {SHOP_RULES.off}</span><span>-{totals.discount}</span></div>
          <div className="flex justify-between"><span>优惠券</span><span>-{totals.coupon}</span></div>
        </div>
      </div>
    </div>
  );
}

function ParcelView({ preview }: { preview: SceneOutcome }) {
  const logSeen = preview.beats.some((b) => b.includes("尚未到达"));
  return (
    <div className="space-y-2">
      <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3">
        <div className="flex items-center justify-between text-[11px] text-white/40">
          <span>物流状态</span>
          <span className="font-mono">{logSeen ? "已核对" : "运输中"}</span>
        </div>
        <svg viewBox="0 0 280 96" className="mt-2 w-full">
          <path d="M28 70 C 80 70, 90 26, 150 26 S 220 26, 252 46" fill="none" stroke="rgba(139,92,246,0.35)" strokeWidth="2" strokeDasharray="5 5" />
          {[
            { x: 28, y: 70, label: "家" },
            { x: 150, y: 26, label: "驿站" },
            { x: 252, y: 46, label: "配送站" },
          ].map((p) => (
            <g key={p.label}>
              <circle cx={p.x} cy={p.y} r="5" fill={p.label === "配送站" ? "#A78BFA" : "rgba(255,255,255,0.4)"} />
              <text x={p.x} y={p.y + 18} textAnchor="middle" fontSize="10" fill="rgba(255,255,255,0.55)">{p.label}</text>
            </g>
          ))}
        </svg>
        <div className="mt-1 flex items-center gap-1 text-[11px] text-white/35">
          <MapPin size={11} /> 最近记录：10:40 已发出，尚未送达
        </div>
      </div>
    </div>
  );
}

function RulesView({ preview }: { preview: SceneOutcome }) {
  const noticed = preview.beats.some((b) => b.includes("五条") || b.includes("全免费"));
  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3">
      <div className="flex items-center justify-between">
        <span className="text-[13px] text-white/75">旧物交换市集 · 活动须知</span>
        <span className="font-mono text-[10px] text-white/30">{noticed ? "已核对" : "未读"}</span>
      </div>
      <ol className="mt-2 space-y-1 text-[12px] leading-relaxed text-white/45">
        <li>一、本社区居民均可报名。</li>
        <li>二、交换物品需八成新以上。</li>
        <li>三、活动时间 17:40—19:00。</li>
        <li>四、请自备桌布与零钱。</li>
        <li>五、现场听从工作人员引导。</li>
      </ol>
      <div className="mt-2 font-mono text-[10px] text-white/25">全文共五条</div>
    </div>
  );
}

function BusView({ preview }: { preview: SceneOutcome }) {
  const left = Number(preview.ui?.left ?? 18);
  return (
    <div className="space-y-2">
      <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3">
        <div className="flex items-center justify-between">
          <span className="text-[13px] text-white/75">社区接驳车</span>
          <span className={cn("font-mono text-[11px]", left >= 12 ? "text-verify" : "text-alarm")}>
            距发车 {left} 分钟
          </span>
        </div>
        <div className="mt-2 flex gap-2">
          {["17:10", "17:40", "18:10"].map((t) => (
            <div key={t} className={cn("flex-1 rounded-lg border px-2 py-1.5 text-center font-mono text-[13px]", t === "17:10" ? "border-violet-400/40 bg-violet-500/10 text-violet-100" : "border-white/[0.07] text-white/35")}>
              {t}
            </div>
          ))}
        </div>
        <div className="mt-2 flex items-center gap-3 font-mono text-[10px] text-white/30">
          <span className="inline-flex items-center gap-1"><Timer size={10} />步行 12 分钟</span>
          <span className="inline-flex items-center gap-1"><Wallet size={10} />免费乘坐</span>
        </div>
      </div>
      <div className="flex items-center gap-1.5 rounded-lg border border-verify/20 bg-verify/[0.05] px-2.5 py-2 text-[11px] text-verify/80">
        <BadgeCheck size={12} /> AI 这次说的是对的：17:10 发车，现在出发来得及
      </div>
    </div>
  );
}

export function AIAdvice({ text, reliable, revealed }: { text: string; reliable: boolean; revealed: boolean }) {
  return (
    <div className="rounded-2xl rounded-tl-sm border border-violet-400/20 bg-violet-500/[0.08] p-3">
      <div className="mb-1 flex items-center gap-1.5 font-mono text-[9px] tracking-[0.16em] text-violet-200/60">
        <Sparkles size={10} /> 生活助手
        {revealed ? (
          <span className={cn("ml-auto rounded px-1.5 py-0.5 text-[9px]", reliable ? "bg-verify/15 text-verify" : "bg-alarm/15 text-alarm")}>
            {reliable ? "这次说得对" : "这次说错了"}
          </span>
        ) : null}
      </div>
      <p className="text-[14px] leading-[1.8] text-white/80">{text}</p>
    </div>
  );
}

export function SceneScene({ sceneId, meta, actions, preview, onAction, busy }: SceneProps) {
  return (
    <div className="space-y-3">
      <AIAdvice text={meta.aiAdvice} reliable={meta.adviceReliable} revealed={preview.finished} />
      <SceneBody sceneId={sceneId} meta={meta} actions={actions} preview={preview} onAction={onAction} busy={busy} />
    </div>
  );
}

export function MiniStat({ label, value, tone }: { label: string; value: string; tone?: "good" | "bad" }) {
  return (
    <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-2.5 py-1.5">
      <div className="font-mono text-[9px] tracking-[0.14em] text-white/30">{label}</div>
      <div className={cn("mt-0.5 font-mono text-[13px]", tone === "good" ? "text-verify" : tone === "bad" ? "text-alarm" : "text-white/80")}>{value}</div>
    </div>
  );
}
