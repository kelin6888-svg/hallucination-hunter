import type { ReactNode } from "react";
import { cn } from "../lib/utils";

export function Tag({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: "neutral" | "violet" | "green" | "red" | "amber";
  className?: string;
}) {
  const tones = {
    neutral: "border-white/12 bg-white/[0.04] text-white/55",
    violet: "border-violet-400/30 bg-violet-500/12 text-violet-200",
    green: "border-verify/30 bg-verify/10 text-verify",
    red: "border-alarm/30 bg-alarm/10 text-alarm",
    amber: "border-amber/30 bg-amber/10 text-amber",
  } as const;

  return <span className={cn("tag", tones[tone], className)}>{children}</span>;
}

export function SectionHead({
  eyebrow,
  title,
  action,
  className,
}: {
  eyebrow?: string;
  title: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-end justify-between gap-4", className)}>
      <div className="min-w-0">
        {eyebrow ? <div className="label mb-1.5">{eyebrow}</div> : null}
        <h2 className="truncate text-[17px] font-medium tracking-wide text-white/90">
          {title}
        </h2>
      </div>
      {action}
    </div>
  );
}

export function Meter({
  value,
  max,
  tone = "violet",
  segments = 20,
  className,
}: {
  value: number;
  max: number;
  tone?: "violet" | "green" | "red" | "amber";
  segments?: number;
  className?: string;
}) {
  const ratio = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
  const filled = Math.round(ratio * segments);
  const colors = {
    violet: "bg-violet-400",
    green: "bg-verify",
    red: "bg-alarm",
    amber: "bg-amber",
  } as const;

  return (
    <div className={cn("flex items-center gap-[3px]", className)} aria-hidden="true">
      {Array.from({ length: segments }, (_, i) => (
        <span
          key={i}
          className={cn(
            "h-2.5 flex-1 rounded-[1px] transition-colors duration-500",
            i < filled ? colors[tone] : "bg-white/[0.07]",
          )}
          style={i < filled ? { opacity: 0.55 + (i / segments) * 0.45 } : undefined}
        />
      ))}
    </div>
  );
}

export function Stat({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: "violet" | "green" | "red";
}) {
  const valueTone =
    tone === "green"
      ? "text-verify"
      : tone === "red"
        ? "text-alarm"
        : tone === "violet"
          ? "text-violet-200"
          : "text-white";

  return (
    <div className="panel-flat px-4 py-3.5">
      <div className="label mb-1">{label}</div>
      <div className={cn("font-mono text-[26px] font-medium leading-none tracking-tight", valueTone)}>
        {value}
      </div>
      {hint ? <div className="mt-1.5 text-[12px] leading-snug text-white/40">{hint}</div> : null}
    </div>
  );
}

export function KeyHint({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded border border-white/15 bg-white/[0.06] px-1.5 py-0.5 font-mono text-[11px] text-white/70">
      {children}
    </kbd>
  );
}
