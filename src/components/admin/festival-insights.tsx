import Link from "next/link";
import { AlertTriangle, ArrowRight, CheckCircle2, Info, Sparkles } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";

export type InsightInput = {
  bookingsTomorrow: number;
  slotsTomorrow: number;
  capacityTomorrow: number;
  poojasTomorrow: number;
  pendingDonations: number;
  pendingCount: number;
  unassignedVolunteers: number;
  activeVolunteers: number;
  upcomingEvents: number;
  verifiedDonations: number;
  donationGoal: number;
};

type Insight = { tone: "alert" | "warn" | "ok"; text: string };

/**
 * Rule-based summary computed from real aggregates — deliberately NOT written
 * by the language model.
 *
 * §29 requires every number here to come from the database. Generating this
 * text with an LLM would risk a hallucinated figure appearing on the committee's
 * operations dashboard, so the wording is templated and the values are passed
 * straight through. The copilot is where free-form analysis belongs.
 */
export function buildInsights(input: InsightInput): Insight[] {
  const out: Insight[] = [];

  if (input.poojasTomorrow > 0 && input.capacityTomorrow > 0) {
    const taken = input.capacityTomorrow - input.slotsTomorrow;
    const pct = Math.round((taken / input.capacityTomorrow) * 100);
    if (input.slotsTomorrow === 0) {
      out.push({
        tone: "alert",
        text: `Tomorrow's poojas are fully booked — all ${input.capacityTomorrow} couple slots are taken.`,
      });
    } else if (pct >= 75) {
      out.push({
        tone: "warn",
        text: `Pooja bookings are ${pct}% full for tomorrow. ${input.slotsTomorrow} slot${input.slotsTomorrow === 1 ? "" : "s"} remain.`,
      });
    } else {
      out.push({
        tone: "ok",
        text: `Tomorrow has ${input.slotsTomorrow} of ${input.capacityTomorrow} couple slots still open across ${input.poojasTomorrow} pooja${input.poojasTomorrow === 1 ? "" : "s"}.`,
      });
    }
  }

  if (input.pendingCount > 0) {
    out.push({
      tone: "warn",
      text: `${formatCurrency(input.pendingDonations)} across ${input.pendingCount} donation${input.pendingCount === 1 ? "" : "s"} is waiting for committee verification.`,
    });
  }

  if (input.unassignedVolunteers > 0) {
    out.push({
      tone: input.unassignedVolunteers > 5 ? "warn" : "ok",
      text: `${input.unassignedVolunteers} of ${input.activeVolunteers} volunteers have no duty assigned.`,
    });
  }

  if (input.donationGoal > 0) {
    const pct = Math.round((input.verifiedDonations / input.donationGoal) * 100);
    out.push({
      tone: pct >= 100 ? "ok" : "ok",
      text: `Verified donations are at ${pct}% of the ${formatCurrency(input.donationGoal)} goal.`,
    });
  }

  if (out.length === 0) {
    out.push({
      tone: "ok",
      text: "Nothing needs attention right now. Add poojas, events and volunteers to see more here.",
    });
  }

  return out;
}

const TONE = {
  alert: { cls: "bg-danger-50 text-danger-700", Icon: AlertTriangle },
  warn: { cls: "bg-gold-100 text-gold-700", Icon: Info },
  ok: { cls: "bg-success-50 text-success-700", Icon: CheckCircle2 },
} as const;

/**
 * "Requires Attention" — only the insights that are actually actionable.
 * Returns an empty list when nothing is wrong, and the caller then shows a
 * calm "all clear" rather than manufacturing an alert to fill the space.
 */
export function attentionItems(insights: Insight[]) {
  return insights.filter((i) => i.tone !== "ok");
}

export function RequiresAttention({ insights }: { insights: Insight[] }) {
  const items = attentionItems(insights);

  return (
    <section className="card overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4">
        <span
          className={cn(
            "grid size-9 shrink-0 place-items-center rounded-[0.75rem]",
            items.length > 0 ? "bg-gold-100 text-gold-700" : "bg-success-50 text-success-700",
          )}
        >
          {items.length > 0 ? (
            <AlertTriangle className="size-4" strokeWidth={2.2} aria-hidden />
          ) : (
            <CheckCircle2 className="size-4" strokeWidth={2.2} aria-hidden />
          )}
        </span>
        <div>
          <h2 className="t-h3 text-ink-900">Requires Attention</h2>
          <p className="t-caption mt-0.5 text-ink-500">
            {items.length > 0
              ? `${items.length} item${items.length === 1 ? "" : "s"} to look at`
              : "Nothing needs action right now"}
          </p>
        </div>
      </div>

      {items.length > 0 ? (
        <ul className="divide-y divide-hairline border-t border-hairline">
          {items.map((item, i) => {
            const { cls, Icon } = TONE[item.tone];
            return (
              <li key={i} className="flex items-start gap-3 px-5 py-3">
                <span className={cn("mt-px grid size-5 shrink-0 place-items-center rounded-full", cls)}>
                  <Icon className="size-3" strokeWidth={2.6} aria-hidden />
                </span>
                <p className="t-small text-ink-700">{item.text}</p>
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}

export function FestivalInsights({ insights }: { insights: Insight[] }) {
  return (
    <section className="card overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-[0.75rem] bg-saffron-600 text-white">
            <Sparkles className="size-4" strokeWidth={2.2} aria-hidden />
          </span>
          <div>
            <h2 className="text-[0.9375rem] font-semibold text-ink-900">
              AI Festival Insights
            </h2>
            <p className="mt-0.5 text-[0.6875rem] text-ink-500">
              Computed from live data, not generated text
            </p>
          </div>
        </div>
        <Link
          href="/admin/copilot"
          className="inline-flex shrink-0 items-center gap-1 text-[0.8125rem] font-semibold text-saffron-700 hover:text-saffron-800"
        >
          Ask
          <ArrowRight className="size-3.5" strokeWidth={2.4} aria-hidden />
        </Link>
      </div>

      <ul className="divide-y divide-hairline border-t border-hairline">
        {insights.map((insight, i) => {
          const { cls, Icon } = TONE[insight.tone];
          return (
            <li key={i} className="flex items-start gap-3 px-5 py-3">
              <span className={cn("mt-px grid size-5 shrink-0 place-items-center rounded-full", cls)}>
                <Icon className="size-3" strokeWidth={2.6} aria-hidden />
              </span>
              <p className="text-[0.8125rem] leading-relaxed text-ink-700">{insight.text}</p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
