import { cn } from "@/lib/utils";

/**
 * Donation goal meter. The fill grows from 0 to its target on mount using a
 * pure-CSS keyframe, so it animates without shipping JavaScript.
 */
export function ProgressBar({
  value,
  label,
  className,
  tone = "saffron",
}: {
  /** 0–100 */
  value: number;
  label?: string;
  className?: string;
  tone?: "saffron" | "gold" | "success";
}) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));

  const fill = {
    saffron: "bg-saffron-500",
    gold: "bg-gold-400",
    success: "bg-success-500",
  }[tone];

  return (
    <div
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label ?? "Progress"}
      className={cn("h-2 w-full overflow-hidden rounded-full bg-ink-200", className)}
    >
      <div
        className={cn("progress-fill h-full rounded-full", fill)}
        style={{ "--pct": `${pct}%` } as React.CSSProperties}
      />
    </div>
  );
}
