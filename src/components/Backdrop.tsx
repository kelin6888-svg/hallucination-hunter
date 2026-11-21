import { useMemo } from "react";

/** 纯 CSS 氛围层：扫描线、粒子、四角定位标记。不依赖图片资源。 */
export function Backdrop() {
  const particles = useMemo(
    () =>
      Array.from({ length: 16 }, (_, i) => {
        const seed = (i * 9301 + 49297) % 233280;
        const rnd = seed / 233280;
        return {
          left: `${(rnd * 100).toFixed(2)}%`,
          top: `${((rnd * 7919) % 100).toFixed(2)}%`,
          delay: `${(rnd * 8).toFixed(2)}s`,
          duration: `${(7 + rnd * 7).toFixed(2)}s`,
          size: rnd > 0.82 ? 3 : 2,
          violet: rnd > 0.6,
        };
      }),
    [],
  );

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[2] overflow-hidden">
      {particles.map((p, i) => (
        <span
          key={i}
          className="absolute rounded-full animate-float motion-reduce:animate-none"
          style={{
            left: p.left,
            top: p.top,
            width: p.size,
            height: p.size,
            animationDelay: p.delay,
            animationDuration: p.duration,
            background: p.violet ? "rgba(167,139,250,0.85)" : "rgba(148,163,210,0.55)",
            boxShadow: p.violet
              ? "0 0 10px rgba(139,92,246,0.85)"
              : "0 0 8px rgba(148,163,210,0.5)",
          }}
        />
      ))}

      <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-ink-950/90 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-ink-950/90 to-transparent" />

      <div className="absolute left-0 right-0 top-0 h-[38vh] overflow-hidden opacity-[0.55]">
        <div className="h-24 w-full animate-scan bg-gradient-to-b from-transparent via-violet-400/[0.07] to-transparent motion-reduce:animate-none" />
      </div>

      <div className="absolute inset-0 scanlines opacity-[0.35]" />
    </div>
  );
}

export function CornerMarks() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
      <span className="absolute left-3 top-3 h-4 w-4 border-l border-t border-violet-400/25" />
      <span className="absolute right-3 top-3 h-4 w-4 border-r border-t border-violet-400/25" />
      <span className="absolute bottom-3 left-3 h-4 w-4 border-b border-l border-violet-400/25" />
      <span className="absolute bottom-3 right-3 h-4 w-4 border-b border-r border-violet-400/25" />
    </div>
  );
}
