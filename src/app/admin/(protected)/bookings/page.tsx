import { Suspense } from "react";
import type { Metadata } from "next";
import { CalendarCheck, CalendarClock, CircleSlash, TicketCheck, Users } from "lucide-react";
import { BookingTable, type AdminBookingRow } from "@/components/admin/booking-table";
import { StatsCard } from "@/components/stats-card";
import { FilterChips } from "@/components/ui/filter-chips";
import { ErrorState, SkeletonList } from "@/components/ui/states";
import { createClient } from "@/lib/supabase/server";
import { festivalDate, festivalToday } from "@/lib/utils";
import type { AdminBookingSummary, BookingStatus } from "@/lib/supabase/types";

export const metadata: Metadata = { title: "Pooja Bookings" };
export const dynamic = "force-dynamic";

const RANGES = [
  { value: "today", label: "Today" },
  { value: "tomorrow", label: "Tomorrow" },
  { value: "upcoming", label: "Upcoming" },
  { value: "all", label: "All" },
];

const STATUSES = [
  { value: "active", label: "Active" },
  { value: "confirmed", label: "Confirmed" },
  { value: "pending", label: "Pending" },
  { value: "cancelled", label: "Cancelled" },
  { value: "completed", label: "Completed" },
  { value: "no_show", label: "No-show" },
  { value: "any", label: "Any status" },
];

function one(value: string | string[] | undefined, fallback: string) {
  const v = Array.isArray(value) ? value[0] : value;
  return v ?? fallback;
}

export default async function AdminBookingsPage(props: PageProps<"/admin/bookings">) {
  const params = await props.searchParams;
  const range = one(params.range, "upcoming");
  const status = one(params.status, "active");
  const pooja = one(params.pooja, "");

  return (
    <>
      <header className="mb-5">
        <h1 className="text-[1.375rem] font-bold tracking-[-0.03em] text-ink-900">
          Pooja Bookings
        </h1>
        <p className="mt-1 max-w-[42rem] text-[0.8125rem] leading-relaxed text-ink-500">
          Couple bookings for every pooja. Capacity is enforced by the database,
          so this list can never exceed the configured limit.
        </p>
      </header>

      <Suspense fallback={<div className="mb-4 h-24 rounded-card bg-ink-100" />}>
        <SummaryCards />
      </Suspense>

      <div className="mb-4 space-y-3">
        <Suspense fallback={<div className="h-12 rounded-full bg-ink-100" />}>
          <FilterChips param="range" options={RANGES} defaultValue="upcoming" />
        </Suspense>
        <Suspense fallback={<div className="h-10 rounded-full bg-ink-100" />}>
          <FilterChips
            param="status"
            options={STATUSES}
            defaultValue="active"
            variant="pills"
          />
        </Suspense>
        <Suspense fallback={null}>
          <PoojaFilter selected={pooja} />
        </Suspense>
      </div>

      <Suspense key={`${range}-${status}-${pooja}`} fallback={<SkeletonList count={4} />}>
        <Bookings range={range} status={status} pooja={pooja} />
      </Suspense>
    </>
  );
}

/* -------------------------------------------------------------------------- */

async function SummaryCards() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_booking_summary");
  if (error) return <ErrorState message={error.message} />;

  const raw = (data ?? {}) as Record<string, unknown>;
  const s = Object.fromEntries(
    Object.entries(raw).map(([k, v]) => [k, Number(v ?? 0)]),
  ) as unknown as AdminBookingSummary;

  return (
    <section className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      <StatsCard icon={CalendarCheck} tone="saffron" label="Today" value={String(s.today)} />
      <StatsCard icon={CalendarClock} tone="info" label="Tomorrow" value={String(s.tomorrow)} />
      <StatsCard icon={TicketCheck} tone="success" label="Confirmed" value={String(s.confirmed)} />
      <StatsCard icon={CircleSlash} tone="neutral" label="Cancelled" value={String(s.cancelled)} />
      <StatsCard
        icon={Users}
        tone="gold"
        label="Slots left"
        value={String(s.slots_left)}
        hint={`${s.total_slots} total`}
      />
    </section>
  );
}

async function PoojaFilter({ selected }: { selected: string }) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("pooja_schedule")
    .select("id, title, pooja_date")
    .eq("booking_enabled", true)
    .order("pooja_date", { ascending: true })
    .limit(100);

  const options = [
    { value: "", label: "All poojas" },
    ...(data ?? []).map((p) => ({
      value: p.id,
      label: `${p.title} · ${p.pooja_date}`,
    })),
  ];

  return (
    <FilterChips
      param="pooja"
      options={options.slice(0, 12)}
      defaultValue=""
      variant="pills"
      key={selected}
    />
  );
}

async function Bookings({
  range,
  status,
  pooja,
}: {
  range: string;
  status: string;
  pooja: string;
}) {
  const supabase = await createClient();

  let query = supabase
    .from("pooja_bookings")
    .select(
      "id, booking_ref, partner1_name, partner2_name, gotram, phone, status, source, created_at, pooja:pooja_schedule!inner(id, title, pooja_date, start_time)",
    )
    .order("created_at", { ascending: false })
    .limit(300);

  const today = festivalToday();
  const tomorrow = festivalDate(1);

  if (range === "today") query = query.eq("pooja_schedule.pooja_date", today);
  else if (range === "tomorrow") query = query.eq("pooja_schedule.pooja_date", tomorrow);
  else if (range === "upcoming") query = query.gte("pooja_schedule.pooja_date", today);

  if (status === "active") {
    query = query.in("status", ["pending", "confirmed", "rescheduled"]);
  } else if (status !== "any") {
    query = query.eq("status", status as BookingStatus);
  }

  if (pooja) query = query.eq("pooja_id", pooja);

  const { data, error } = await query;
  if (error) return <ErrorState message={error.message} />;

  const { data: poojas } = await supabase
    .from("pooja_schedule")
    .select("id, title, pooja_date")
    .eq("booking_enabled", true)
    .gte("pooja_date", today)
    .order("pooja_date", { ascending: true })
    .limit(100);

  const rows = (data ?? []).map((row) => {
    // PostgREST returns an embedded one-to-one relation as an object, but the
    // generated types widen it to an array — normalise both shapes.
    const embedded = row.pooja as unknown;
    const pooja = Array.isArray(embedded) ? embedded[0] : embedded;
    return { ...row, pooja: pooja ?? null } as AdminBookingRow;
  });

  return (
    <BookingTable
      bookings={rows}
      poojaOptions={(poojas ?? []).map((p) => ({
        value: p.id,
        label: `${p.title} · ${p.pooja_date}`,
      }))}
    />
  );
}
