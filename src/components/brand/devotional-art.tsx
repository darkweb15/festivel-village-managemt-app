import { GaneshaMark } from "./ganesha-mark";
import { cn } from "@/lib/utils";

/**
 * Vector devotional artwork used wherever the committee has not uploaded a
 * real photograph yet. Drawn rather than stock-sourced so it always matches
 * the palette and never ships a low-quality or unrelated image.
 */
export function DevotionalArt({ className }: { className?: string }) {
  return (
    <div className={cn("relative isolate overflow-hidden", className)}>
      <svg
        viewBox="0 0 320 320"
        aria-hidden="true"
        className="absolute inset-0 size-full"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <radialGradient id="halo" cx="50%" cy="42%" r="62%">
            <stop offset="0%" stopColor="#fff6ed" />
            <stop offset="70%" stopColor="#ffefe0" />
            <stop offset="100%" stopColor="#fde6d2" />
          </radialGradient>
        </defs>

        <rect width="320" height="320" fill="url(#halo)" />

        {/* mandala rings, centred slightly above the optical middle */}
        <g fill="none" stroke="#e3b44c" strokeOpacity=".45">
          <circle cx="160" cy="148" r="98" strokeWidth="1.1" />
          <circle cx="160" cy="148" r="80" strokeWidth="1" strokeDasharray="2 7" />
          <circle cx="160" cy="148" r="116" strokeWidth="1" strokeOpacity=".25" />
        </g>

        {/* radiating petals */}
        <g stroke="#f96a12" strokeOpacity=".22" strokeWidth="1.5" strokeLinecap="round">
          {Array.from({ length: 24 }).map((_, i) => {
            const angle = (i * Math.PI * 2) / 24;
            const x1 = 160 + Math.cos(angle) * 102;
            const y1 = 148 + Math.sin(angle) * 102;
            const x2 = 160 + Math.cos(angle) * 113;
            const y2 = 148 + Math.sin(angle) * 113;
            return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} />;
          })}
        </g>

        {/* lotus base */}
        <g fill="#fdb171" fillOpacity=".45">
          <ellipse cx="160" cy="266" rx="88" ry="15" />
          <ellipse cx="160" cy="262" rx="60" ry="11" fillOpacity=".7" />
        </g>
        <g fill="none" stroke="#c23e09" strokeOpacity=".22" strokeWidth="1.4">
          <path d="M72 266c14-16 34-24 88-24s74 8 88 24" />
        </g>
      </svg>

      <div className="relative flex h-full items-center justify-center px-8 pb-[12%]">
        {/* h-auto is required: GaneshaMark's default `size-6` would otherwise
            pin the height and shrink the art to icon size. */}
        <GaneshaMark
          className="h-auto w-[52%] max-w-[13rem] min-w-[7rem] text-saffron-700/90 drop-shadow-[0_12px_28px_rgba(194,62,9,0.18)]"
          strokeWidth={1.6}
        />
      </div>
    </div>
  );
}

/** Small corner label so nobody mistakes the artwork for a real festival photo. */
export function PlaceholderBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "pointer-events-none rounded-full bg-white/85 px-2.5 py-1 text-[0.625rem] font-semibold tracking-[0.06em] text-ink-500 uppercase backdrop-blur-sm",
        className,
      )}
    >
      Placeholder art
    </span>
  );
}
