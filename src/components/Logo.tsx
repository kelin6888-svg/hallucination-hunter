import { useId } from "react";

export function Logo({ size = 56 }: { size?: number }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
      className="shrink-0"
    >
      <defs>
        <linearGradient id={`lg-${id}`} x1="6" y1="4" x2="58" y2="60">
          <stop offset="0" stopColor="#C4B5FD" />
          <stop offset="0.55" stopColor="#8B5CF6" />
          <stop offset="1" stopColor="#5B21B6" />
        </linearGradient>
      </defs>
      <path
        d="M32 3.5 57 17.5v29L32 60.5 7 46.5v-29L32 3.5Z"
        stroke={`url(#lg-${id})`}
        strokeWidth="1.5"
      />
      <path
        d="M32 10.5 50.5 21v22L32 53.5 13.5 43V21L32 10.5Z"
        fill="rgba(139,92,246,0.10)"
        stroke="rgba(167,139,250,0.28)"
        strokeWidth="0.8"
      />
      <path
        d="M17.5 32c4.6-7.6 24.4-7.6 29 0-4.6 7.6-24.4 7.6-29 0Z"
        stroke="#DDD6FE"
        strokeWidth="1.3"
      />
      <circle cx="32" cy="32" r="3.9" fill="#A78BFA" />
      <circle cx="32" cy="32" r="7.6" stroke="rgba(167,139,250,0.45)" strokeWidth="0.9" strokeDasharray="1.6 4" />
      <path d="M32 15v5M32 44v5M15 32h5M44 32h5" stroke="rgba(196,181,253,0.5)" strokeWidth="1" />
      <rect x="35.5" y="30" width="6" height="1.4" fill="#05060D" opacity="0.85" />
    </svg>
  );
}
