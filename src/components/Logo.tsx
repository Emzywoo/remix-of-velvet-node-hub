export function Logo({ size = 32, active = true }: { size?: number; active?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <svg width={size} height={size} viewBox="0 0 40 40" className={active ? "animate-soft-pulse" : ""}>
        <defs>
          <linearGradient id="riftGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00FF87" />
            <stop offset="100%" stopColor="#00D4FF" />
          </linearGradient>
        </defs>
        <polygon
          points="20,3 35,11.5 35,28.5 20,37 5,28.5 5,11.5"
          fill="none"
          stroke="url(#riftGrad)"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        <circle cx="20" cy="20" r="3.5" fill="url(#riftGrad)" />
      </svg>
      <span className="font-bold tracking-tight text-lg">NODERIFT</span>
    </div>
  );
}
