import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ProgressBar } from "@/components/ui/progress";
import { buttonClasses } from "@/components/ui/button";
import { cn, formatCurrency, percentOf } from "@/lib/utils";

/**
 * Donation goal summary. Shared by Home and the Donations screen so the two
 * can never drift apart.
 */
export function DonationOverviewCard({
  total,
  goal,
  className,
  action,
}: {
  total: number;
  goal: number;
  className?: string;
  action?: "view" | "donate" | "none";
}) {
  const pct = percentOf(total, goal);
  const remaining = Math.max(0, goal - total);
  const hasGoal = goal > 0;

  return (
    <div className={cn("card p-5", className)}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="tabular text-[1.75rem] leading-none font-bold tracking-[-0.035em] text-ink-900">
            {formatCurrency(total)}
          </p>
          <p className="mt-1.5 text-[0.8125rem] font-medium text-ink-500">
            Total Donations
          </p>
        </div>

        {hasGoal ? (
          <span className="shrink-0 rounded-full bg-saffron-50 px-3 py-1.5 text-[0.8125rem] font-bold tabular-nums text-saffron-700">
            {pct}%
          </span>
        ) : null}
      </div>

      {hasGoal ? (
        <>
          <ProgressBar
            value={pct}
            label={`${pct}% of the donation goal reached`}
            className="mt-4"
          />
          <div className="mt-3 flex items-center justify-between gap-3 text-[0.75rem]">
            <span className="text-ink-500">
              Goal:{" "}
              <span className="tabular font-semibold text-ink-700">
                {formatCurrency(goal)}
              </span>
            </span>
            <span className="text-ink-500">
              Remaining:{" "}
              <span className="tabular font-semibold text-ink-700">
                {formatCurrency(remaining)}
              </span>
            </span>
          </div>
        </>
      ) : (
        <p className="mt-3 text-[0.75rem] text-ink-400">
          No fundraising goal has been set yet.
        </p>
      )}

      {action === "view" ? (
        <Link
          href="/donate"
          className={buttonClasses("tertiary", "md", "mt-5 w-full")}
        >
          Support the festival
          <ArrowRight className="size-4" strokeWidth={2.2} aria-hidden />
        </Link>
      ) : null}
    </div>
  );
}
