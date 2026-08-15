import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Tone = "saffron" | "gold" | "success" | "info" | "neutral";

const TONES: Record<Tone, string> = {
  saffron: "bg-saffron-50 text-saffron-600",
  gold: "bg-gold-100 text-gold-600",
  success: "bg-success-50 text-success-700",
  info: "bg-info-50 text-info-700",
  neutral: "bg-ink-100 text-ink-500",
};

export function StatsCard({
  icon: Icon,
  label,
  value,
  hint,
  tone = "neutral",
  className,
}: {
  icon?: LucideIcon;
  label: string;
  value: string;
  hint?: string;
  tone?: Tone;
  className?: string;
}) {
  return (
    <div className={cn("card p-4", className)}>
      {Icon ? (
        <span
          className={cn(
            "mb-3 grid size-9 place-items-center rounded-[0.75rem]",
            TONES[tone],
          )}
        >
          <Icon className="size-[1.05rem]" strokeWidth={2} aria-hidden />
        </span>
      ) : null}
      <p className="tabular text-[1.25rem] leading-none font-bold tracking-[-0.03em] text-ink-900">
        {value}
      </p>
      <p className="mt-1.5 text-[0.75rem] font-medium text-ink-500">{label}</p>
      {hint ? <p className="mt-1 text-[0.6875rem] text-ink-400">{hint}</p> : null}
    </div>
  );
}
