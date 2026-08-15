import { cn } from "@/lib/utils";
import type { PoojaAvailability } from "@/lib/supabase/types";

/**
 * "7 / 10 slots available" with a colour that degrades as the pooja fills.
 * Reads straight from the availability view, so it can never disagree with
 * what the booking function will do.
 */
export function AvailabilityBadge({
  pooja,
  className,
  compact = false,
}: {
  pooja: Pick<PoojaAvailability, "available" | "max_couples" | "is_bookable" | "booking_enabled">;
  className?: string;
  /** Shorter wording for tight rows, e.g. the Home summary cards at 390px. */
  compact?: boolean;
}) {
  if (!pooja.booking_enabled || pooja.max_couples === 0) {
    return (
      <span
        className={cn(
          "inline-flex items-center rounded-full bg-ink-100 px-2.5 py-1 text-[0.6875rem] font-semibold text-ink-500",
          className,
        )}
      >
        Booking not required
      </span>
    );
  }

  if (pooja.available === 0) {
    return (
      <span
        className={cn(
          "inline-flex items-center rounded-full bg-danger-50 px-2.5 py-1 text-[0.6875rem] font-semibold text-danger-700",
          className,
        )}
      >
        Fully booked
      </span>
    );
  }

  if (!pooja.is_bookable) {
    return (
      <span
        className={cn(
          "inline-flex items-center rounded-full bg-ink-100 px-2.5 py-1 text-[0.6875rem] font-semibold text-ink-500",
          className,
        )}
      >
        Booking closed
      </span>
    );
  }

  const ratio = pooja.available / Math.max(pooja.max_couples, 1);
  const tone =
    ratio <= 0.2
      ? "bg-saffron-50 text-saffron-700"
      : ratio <= 0.5
        ? "bg-gold-100 text-gold-700"
        : "bg-success-50 text-success-700";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-[0.6875rem] font-semibold tabular-nums",
        tone,
        className,
      )}
    >
      {pooja.available} / {pooja.max_couples} {compact ? "left" : "slots available"}
    </span>
  );
}
