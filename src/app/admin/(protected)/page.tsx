import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRight,
  CalendarCheck,
  CalendarDays,
  HandHeart,
  Scale,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  FestivalInsights,
  RequiresAttention,
  buildInsights,
} from "@/components/admin/festival-insights";
import {
  DonationTrendChart,
  ExpenseCategoryChart,
} from "@/components/admin/charts";
import { StatsCard } from "@/components/stats-card";
import { ProgressBar } from "@/components/ui/progress";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { createClient } from "@/lib/supabase/server";
import { RESOURCES } from "@/lib/admin/resources";
import {
  festivalDate,
  festivalToday,
  formatCurrency,
  formatFullDate,
  percentOf,
} from "@/lib/utils";

/** Time-of-day greeting in the committee's timezone. */
function greeting() {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      hour12: false,
      timeZone: "Asia/Kolkata",
    }).format(new Date()),
  );
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}
import type { AdminBookingSummary, AdminStats } from "@/lib/supabase/types";

export const metadata: Metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const supabase = await createClient();

  const tomorrow = festivalDate(1);

  const [
    statsResult,
    donationsResult,
    expensesResult,
    pendingResult,
    bookingResult,
    tomorrowAvailability,
    volunteerCount,
  ] = await Promise.all([
      supabase.rpc("admin_stats"),
      supabase
        .from("donations")
        .select("amount, donation_date")
        .eq("status", "verified")
        .order("donation_date", { ascending: true })
        .limit(1000),
      supabase.from("expenses").select("amount, category").limit(1000),
      supabase
        .from("donations")
        .select("id, donor_name, amount, created_at")
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(5),
      supabase.rpc("admin_booking_summary"),
      supabase
        .from("pooja_availability")
        .select("max_couples, available")
        .eq("pooja_date", tomorrow),
      supabase.from("volunteers").select("id", { count: "exact", head: true }).eq("is_active", true),
    ]);

  if (statsResult.error) return <ErrorState message={statsResult.error.message} />;

  const raw = (statsResult.data ?? {}) as Record<string, unknown>;
  const stats = Object.fromEntries(
    Object.entries(raw).map(([key, value]) => [key, Number(value ?? 0)]),
  ) as unknown as AdminStats;

  const balance = stats.total_donations - stats.total_expenses;
  const pct = percentOf(stats.total_donations, stats.donation_goal);

  const trend = buildTrend(donationsResult.data ?? []);
  const byCategory = buildCategories(expensesResult.data ?? []);

  const bookingRaw = (bookingResult.data ?? {}) as Record<string, unknown>;
  const bookings = Object.fromEntries(
    Object.entries(bookingRaw).map(([k, v]) => [k, Number(v ?? 0)]),
  ) as unknown as AdminBookingSummary;

  const tomorrowRows = tomorrowAvailability.data ?? [];
  const insights = buildInsights({
    bookingsTomorrow: bookings.tomorrow ?? 0,
    slotsTomorrow: tomorrowRows.reduce((sum, p) => sum + p.available, 0),
    capacityTomorrow: tomorrowRows.reduce((sum, p) => sum + p.max_couples, 0),
    poojasTomorrow: tomorrowRows.length,
    pendingDonations: stats.pending_donations,
    pendingCount: stats.pending_count,
    unassignedVolunteers: bookings.unassigned_volunteers ?? 0,
    activeVolunteers: volunteerCount.count ?? 0,
    upcomingEvents: stats.upcoming_events,
    verifiedDonations: stats.total_donations,
    donationGoal: stats.donation_goal,
  });

  return (
    <>
      <header className="mb-6">
        <h1 className="t-h1 text-ink-900">{greeting()}, Sri Krishna Youth</h1>
        <p className="t-small mt-1 text-ink-500">
          {formatFullDate(festivalToday())} · festival operations at a glance.
        </p>
      </header>

      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <RequiresAttention insights={insights} />
        <FestivalInsights insights={insights} />
      </div>

      {/* Headline finance strip */}
      <section className="mb-4 grid gap-3 sm:grid-cols-3">
        <StatsCard
          icon={TrendingUp}
          tone="success"
          label="Total Donations"
          value={formatCurrency(stats.total_donations)}
          hint="Verified only"
        />
        <StatsCard
          icon={TrendingDown}
          tone="saffron"
          label="Total Expenses"
          value={formatCurrency(stats.total_expenses)}
        />
        <StatsCard
          icon={Scale}
          tone={balance >= 0 ? "info" : "neutral"}
          label="Remaining Balance"
          value={formatCurrency(balance)}
          hint="Donations − expenses"
        />
      </section>

      <section className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatsCard
          icon={Users}
          tone="neutral"
          label="Total Donors"
          value={stats.donor_count.toLocaleString("en-IN")}
        />
        <StatsCard
          icon={HandHeart}
          tone="neutral"
          label="Volunteers"
          value={stats.volunteer_count.toLocaleString("en-IN")}
        />
        <StatsCard
          icon={CalendarDays}
          tone="neutral"
          label="Upcoming Events"
          value={stats.upcoming_events.toLocaleString("en-IN")}
        />
        <StatsCard
          icon={CalendarCheck}
          tone="saffron"
          label="Bookings today"
          value={String(bookings.today ?? 0)}
          hint={`${bookings.tomorrow ?? 0} tomorrow`}
        />
        <StatsCard
          icon={TrendingUp}
          tone="gold"
          label="Awaiting confirmation"
          value={formatCurrency(stats.pending_donations)}
          hint={`${stats.pending_count} entr${stats.pending_count === 1 ? "y" : "ies"}`}
        />
      </section>

      {/* Goal */}
      {stats.donation_goal > 0 ? (
        <section className="card mb-4 px-5 py-5">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="text-[0.9375rem] font-semibold text-ink-900">
              Fundraising goal
            </h2>
            <span className="tabular text-[0.8125rem] font-semibold text-saffron-700">
              {pct}%
            </span>
          </div>
          <ProgressBar value={pct} label="Progress towards the donation goal" className="mt-3.5" />
          <p className="mt-3 text-[0.75rem] text-ink-500">
            <span className="tabular font-semibold text-ink-700">
              {formatCurrency(stats.total_donations)}
            </span>{" "}
            of{" "}
            <span className="tabular font-semibold text-ink-700">
              {formatCurrency(stats.donation_goal)}
            </span>
          </p>
        </section>
      ) : null}

      {/* Pending queue */}
      {(pendingResult.data ?? []).length > 0 ? (
        <section className="card mb-4 overflow-hidden">
          <div className="flex items-center justify-between gap-3 px-5 py-4">
            <div>
              <h2 className="text-[0.9375rem] font-semibold text-ink-900">
                Waiting for confirmation
              </h2>
              <p className="mt-0.5 text-[0.75rem] text-ink-500">
                Match each against the bank statement before verifying.
              </p>
            </div>
            <Link
              href="/admin/donations"
              className="inline-flex shrink-0 items-center gap-1 text-[0.8125rem] font-semibold text-saffron-700 hover:text-saffron-800"
            >
              Review
              <ArrowRight className="size-3.5" strokeWidth={2.4} aria-hidden />
            </Link>
          </div>
          <ul className="divide-y divide-hairline border-t border-hairline">
            {(pendingResult.data ?? []).map((donation) => (
              <li key={donation.id} className="flex items-center gap-3 px-5 py-3">
                <span className="min-w-0 flex-1 truncate text-[0.8125rem] text-ink-700">
                  {donation.donor_name}
                </span>
                <span className="tabular shrink-0 text-[0.8125rem] font-semibold text-ink-900">
                  {formatCurrency(Number(donation.amount))}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card px-5 py-5">
          <h2 className="text-[0.9375rem] font-semibold text-ink-900">
            Donations received
          </h2>
          <p className="mt-0.5 mb-4 text-[0.75rem] text-ink-500">
            Cumulative, verified donations
          </p>
          {trend.length > 1 ? (
            <DonationTrendChart data={trend} />
          ) : (
            <EmptyState
              title="Not enough data yet"
              description="The trend appears once a few donations have been verified."
            />
          )}
        </section>

        <section className="card px-5 py-5">
          <h2 className="text-[0.9375rem] font-semibold text-ink-900">
            Spending by category
          </h2>
          <p className="mt-0.5 mb-4 text-[0.75rem] text-ink-500">
            All recorded expenses
          </p>
          {byCategory.length > 0 ? (
            <ExpenseCategoryChart data={byCategory} />
          ) : (
            <EmptyState
              title="No expenses recorded"
              description="Add expenses to see where the festival budget is going."
            />
          )}
        </section>
      </div>

      {/* Quick links */}
      <section className="mt-6">
        <h2 className="mb-3 text-[0.6875rem] font-semibold tracking-[0.08em] text-ink-400 uppercase">
          Manage
        </h2>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {Object.entries(RESOURCES).map(([key, resource]) => (
            <li key={key}>
              <Link
                href={`/admin/${key}`}
                className="card card-interactive flex h-full flex-col justify-between px-4 py-4"
              >
                <span className="text-[0.875rem] font-semibold text-ink-900">
                  {resource.title}
                </span>
                <span className="mt-2 inline-flex items-center gap-1 text-[0.75rem] font-medium text-saffron-700">
                  Open
                  <ArrowRight className="size-3" strokeWidth={2.4} aria-hidden />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

/* -------------------------------------------------------------------------- */

/** Cumulative donation total per day, for the trend chart. */
function buildTrend(rows: { amount: number; donation_date: string }[]) {
  const byDate = new Map<string, number>();
  for (const row of rows) {
    byDate.set(row.donation_date, (byDate.get(row.donation_date) ?? 0) + Number(row.amount));
  }

  let running = 0;
  return [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, amount]) => {
      running += amount;
      return {
        label: formatFullDate(date).replace(/ \d{4}$/, ""),
        total: running,
      };
    });
}

function buildCategories(rows: { amount: number; category: string }[]) {
  const byCategory = new Map<string, number>();
  for (const row of rows) {
    const key = row.category || "general";
    byCategory.set(key, (byCategory.get(key) ?? 0) + Number(row.amount));
  }

  return [...byCategory.entries()]
    .map(([category, total]) => ({
      label: category.charAt(0).toUpperCase() + category.slice(1),
      total,
    }))
    .sort((a, b) => b.total - a.total);
}
