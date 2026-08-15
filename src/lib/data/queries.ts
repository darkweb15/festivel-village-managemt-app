import "server-only";

import { createClientOrNull } from "@/lib/supabase/server";
import { TIMEZONE } from "@/lib/constants";
import { festivalToday } from "@/lib/utils";
import type {
  Announcement,
  AnnouncementCategory,
  CommitteeMember,
  ContactInformation,
  FestivalEvent,
  FestivalSettings,
  GalleryItem,
  PoojaAvailability,
  PoojaSlot,
  PublicDonation,
  PublicExpense,
  PublicStats,
  Sponsor,
  Volunteer,
} from "@/lib/supabase/types";

/**
 * Every query returns this envelope so screens can tell the three failure
 * modes apart: Supabase not set up yet, a real query error, or simply no rows.
 */
export type Fetched<T> =
  | { status: "ok"; data: T }
  | { status: "unconfigured"; data: T }
  | { status: "error"; data: T; message: string };

function unconfigured<T>(fallback: T): Fetched<T> {
  return { status: "unconfigured", data: fallback };
}

function failed<T>(fallback: T, message: string): Fetched<T> {
  return { status: "error", data: fallback, message };
}

export function isEmpty(result: Fetched<unknown[]>) {
  return result.status === "ok" && result.data.length === 0;
}

/**
 * "Today" in the committee's timezone.
 *
 * Must not be `new Date().toISOString()` — that is UTC, and between 00:00 and
 * 05:30 IST it reports yesterday's date, which made past poojas appear as
 * upcoming while the UI (which formats in IST) labelled them "Yesterday".
 */
const today = () => festivalToday();

/** Current HH:MM:SS in the committee's timezone, for "already started" checks. */
function nowTime() {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: TIMEZONE,
  }).format(new Date());
}

// -----------------------------------------------------------------------------
// Festival settings
// -----------------------------------------------------------------------------

export async function getFestivalSettings(): Promise<
  Fetched<FestivalSettings | null>
> {
  const supabase = await createClientOrNull();
  if (!supabase) return unconfigured(null);

  const { data, error } = await supabase
    .from("festival_settings")
    .select("*")
    .limit(1)
    .maybeSingle();

  if (error) return failed(null, error.message);
  return { status: "ok", data };
}

// -----------------------------------------------------------------------------
// Stats
// -----------------------------------------------------------------------------

const EMPTY_STATS: PublicStats = {
  total_donations: 0,
  donor_count: 0,
  transaction_count: 0,
  top_donation: 0,
  total_expenses: 0,
  donation_goal: 0,
  volunteer_count: 0,
};

export async function getPublicStats(): Promise<Fetched<PublicStats>> {
  const supabase = await createClientOrNull();
  if (!supabase) return unconfigured(EMPTY_STATS);

  const { data, error } = await supabase.rpc("public_stats");
  if (error) return failed(EMPTY_STATS, error.message);

  // Postgres returns numerics as strings over the wire; normalise to numbers.
  const raw = (data ?? {}) as Record<string, unknown>;
  const stats = Object.fromEntries(
    Object.keys(EMPTY_STATS).map((key) => [key, Number(raw[key] ?? 0)]),
  ) as unknown as PublicStats;

  return { status: "ok", data: stats };
}

// -----------------------------------------------------------------------------
// Events
// -----------------------------------------------------------------------------

export async function getEvents(
  scope: "upcoming" | "past" | "all" = "all",
): Promise<Fetched<FestivalEvent[]>> {
  const supabase = await createClientOrNull();
  if (!supabase) return unconfigured([]);

  let query = supabase.from("events").select("*").eq("is_published", true);

  if (scope === "upcoming") {
    query = query
      .gte("event_date", today())
      .order("event_date", { ascending: true })
      .order("start_time", { ascending: true, nullsFirst: true });
  } else if (scope === "past") {
    query = query
      .lt("event_date", today())
      .order("event_date", { ascending: false });
  } else {
    query = query.order("event_date", { ascending: true });
  }

  const { data, error } = await query;
  if (error) return failed([], error.message);
  return { status: "ok", data: data ?? [] };
}

export async function getCulturalEvents(): Promise<Fetched<FestivalEvent[]>> {
  const supabase = await createClientOrNull();
  if (!supabase) return unconfigured([]);

  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("is_published", true)
    .eq("is_cultural", true)
    .gte("event_date", today())
    .order("event_date", { ascending: true });

  if (error) return failed([], error.message);
  return { status: "ok", data: data ?? [] };
}

// -----------------------------------------------------------------------------
// Pooja schedule
// -----------------------------------------------------------------------------

export async function getPoojaSchedule(): Promise<Fetched<PoojaSlot[]>> {
  const supabase = await createClientOrNull();
  if (!supabase) return unconfigured([]);

  const { data, error } = await supabase
    .from("pooja_schedule")
    .select("*")
    .eq("is_published", true)
    .gte("pooja_date", today())
    .order("pooja_date", { ascending: true })
    .order("start_time", { ascending: true });

  if (error) return failed([], error.message);
  return { status: "ok", data: data ?? [] };
}

export type ScheduleEntry = {
  id: string;
  title: string;
  date: string;
  time: string | null;
  kind: "Pooja" | "Event";
};

/**
 * Poojas and events from today onwards, merged into one chronological strip.
 * Home shows today's entries and, when the day is clear, the next few up.
 */
export async function getScheduleFeed(
  limit = 6,
): Promise<Fetched<ScheduleEntry[]>> {
  const supabase = await createClientOrNull();
  if (!supabase) return unconfigured([]);

  const day = today();
  const [poojas, events] = await Promise.all([
    supabase
      .from("pooja_schedule")
      .select("id, title, pooja_date, start_time")
      .eq("is_published", true)
      .gte("pooja_date", day)
      .order("pooja_date", { ascending: true })
      .order("start_time", { ascending: true })
      .limit(limit),
    supabase
      .from("events")
      .select("id, title, event_date, start_time")
      .eq("is_published", true)
      .gte("event_date", day)
      .order("event_date", { ascending: true })
      .order("start_time", { ascending: true, nullsFirst: true })
      .limit(limit),
  ]);

  const error = poojas.error ?? events.error;
  if (error) return failed([], error.message);

  const merged: ScheduleEntry[] = [
    ...(poojas.data ?? []).map((row) => ({
      id: `pooja-${row.id}`,
      title: row.title,
      date: row.pooja_date,
      time: row.start_time,
      kind: "Pooja" as const,
    })),
    ...(events.data ?? []).map((row) => ({
      id: `event-${row.id}`,
      title: row.title,
      date: row.event_date,
      time: row.start_time,
      kind: "Event" as const,
    })),
  ].sort((a, b) =>
    a.date === b.date
      ? (a.time ?? "99").localeCompare(b.time ?? "99")
      : a.date.localeCompare(b.date),
  );

  return { status: "ok", data: merged.slice(0, limit) };
}

// -----------------------------------------------------------------------------
// Pooja availability (aggregate counts — safe for anonymous visitors)
// -----------------------------------------------------------------------------

/**
 * Bookable poojas from `date` onwards, read from the pooja_availability view.
 * The view counts bookings without exposing any couple's details.
 */
export async function getPoojaAvailability(options?: {
  from?: string;
  to?: string;
  bookableOnly?: boolean;
  limit?: number;
}): Promise<Fetched<PoojaAvailability[]>> {
  const supabase = await createClientOrNull();
  if (!supabase) return unconfigured([]);

  let query = supabase
    .from("pooja_availability")
    .select("*")
    .gte("pooja_date", options?.from ?? today())
    .order("pooja_date", { ascending: true })
    .order("start_time", { ascending: true });

  if (options?.to) query = query.lte("pooja_date", options.to);
  if (options?.bookableOnly) query = query.eq("is_bookable", true);
  if (options?.limit) query = query.limit(options.limit);

  const { data, error } = await query;
  if (error) return failed([], error.message);
  return { status: "ok", data: data ?? [] };
}

export async function getPoojaAvailabilityById(
  poojaId: string,
): Promise<Fetched<PoojaAvailability | null>> {
  const supabase = await createClientOrNull();
  if (!supabase) return unconfigured(null);

  const { data, error } = await supabase
    .from("pooja_availability")
    .select("*")
    .eq("pooja_id", poojaId)
    .maybeSingle();

  if (error) return failed(null, error.message);
  return { status: "ok", data };
}

// -----------------------------------------------------------------------------
// Festival Pulse — the live status strip on Home
// -----------------------------------------------------------------------------

export type FestivalPulse = {
  nextPooja: {
    title: string;
    date: string;
    startTime: string;
    available: number;
    capacity: number;
    isBookable: boolean;
    isToday: boolean;
  } | null;
  nextEvent: { title: string; date: string; startTime: string | null } | null;
  topAnnouncement: { title: string; category: string; publishedAt: string } | null;
  /**
   * A stream link is on file. Deliberately NOT called `isLive`: only the Live
   * Darshan player can know whether a broadcast is actually running, so nothing
   * here ever claims LIVE.
   */
  hasLiveStream: boolean;
  slotsOpenToday: number;
};

/**
 * One round-trip for everything the Pulse card shows. Each value is read from
 * the database — nothing here is derived from a guess, and any piece the
 * committee hasn't published simply comes back null so the UI can omit it.
 */
export async function getFestivalPulse(): Promise<Fetched<FestivalPulse>> {
  const empty: FestivalPulse = {
    nextPooja: null,
    nextEvent: null,
    topAnnouncement: null,
    hasLiveStream: false,
    slotsOpenToday: 0,
  };

  const supabase = await createClientOrNull();
  if (!supabase) return unconfigured(empty);

  const day = today();

  const [poojas, events, announcements, settings] = await Promise.all([
    supabase
      .from("pooja_availability")
      .select("title, pooja_date, start_time, available, max_couples, is_bookable")
      .gte("pooja_date", day)
      .order("pooja_date", { ascending: true })
      .order("start_time", { ascending: true })
      .limit(20),
    supabase
      .from("events")
      .select("title, event_date, start_time")
      .eq("is_published", true)
      .gte("event_date", day)
      .order("event_date", { ascending: true })
      .order("start_time", { ascending: true, nullsFirst: true })
      .limit(1),
    supabase
      .from("announcements")
      .select("title, category, published_at")
      .eq("is_published", true)
      .order("is_pinned", { ascending: false })
      .order("published_at", { ascending: false })
      .limit(1),
    supabase.from("festival_settings").select("live_darshan_url").maybeSingle(),
  ]);

  const error = poojas.error ?? events.error ?? announcements.error;
  if (error) return failed(empty, error.message);

  const rows = poojas.data ?? [];

  // "Next" must genuinely be ahead: a 6 AM pooja is not the next one at 8 PM.
  const clock = nowTime();
  const upcoming = rows.filter(
    (p) => p.pooja_date > day || (p.pooja_date === day && p.start_time >= clock),
  );
  const next = upcoming[0] ?? null;
  const event = events.data?.[0] ?? null;
  const announcement = announcements.data?.[0] ?? null;

  return {
    status: "ok",
    data: {
      nextPooja: next
        ? {
            title: next.title,
            date: next.pooja_date,
            startTime: next.start_time,
            available: next.available,
            capacity: next.max_couples,
            isBookable: next.is_bookable,
            isToday: next.pooja_date === day,
          }
        : null,
      nextEvent: event
        ? { title: event.title, date: event.event_date, startTime: event.start_time }
        : null,
      topAnnouncement: announcement
        ? {
            title: announcement.title,
            category: announcement.category,
            publishedAt: announcement.published_at,
          }
        : null,
      hasLiveStream: Boolean(settings.data?.live_darshan_url),
      slotsOpenToday: rows
        .filter((p) => p.pooja_date === day && p.is_bookable)
        .reduce((sum, p) => sum + p.available, 0),
    },
  };
}

// -----------------------------------------------------------------------------
// Announcements
// -----------------------------------------------------------------------------

export async function getAnnouncements(
  category?: AnnouncementCategory,
  limit?: number,
): Promise<Fetched<Announcement[]>> {
  const supabase = await createClientOrNull();
  if (!supabase) return unconfigured([]);

  let query = supabase
    .from("announcements")
    .select("*")
    .eq("is_published", true)
    .order("is_pinned", { ascending: false })
    .order("published_at", { ascending: false });

  if (category) query = query.eq("category", category);
  if (limit) query = query.limit(limit);

  const { data, error } = await query;
  if (error) return failed([], error.message);
  return { status: "ok", data: data ?? [] };
}

// -----------------------------------------------------------------------------
// Donations & expenses (public transparency views)
// -----------------------------------------------------------------------------

export async function getPublicDonations(
  limit = 50,
): Promise<Fetched<PublicDonation[]>> {
  const supabase = await createClientOrNull();
  if (!supabase) return unconfigured([]);

  const { data, error } = await supabase
    .from("donations")
    .select(
      "id, donor_name, amount, donation_date, payment_method, status, is_anonymous, is_public, created_at",
    )
    .eq("status", "verified")
    .eq("is_public", true)
    .order("donation_date", { ascending: false })
    .limit(limit);

  if (error) return failed([], error.message);
  return { status: "ok", data: (data ?? []) as PublicDonation[] };
}

export async function getPublicExpenses(
  limit = 50,
): Promise<Fetched<PublicExpense[]>> {
  const supabase = await createClientOrNull();
  if (!supabase) return unconfigured([]);

  const { data, error } = await supabase
    .from("expenses")
    .select("id, title, category, amount, expense_date, is_public, created_at")
    .eq("is_public", true)
    .order("expense_date", { ascending: false })
    .limit(limit);

  if (error) return failed([], error.message);
  return { status: "ok", data: (data ?? []) as PublicExpense[] };
}

// -----------------------------------------------------------------------------
// Gallery
// -----------------------------------------------------------------------------

export async function getGallery(
  mediaType?: "photo" | "video",
): Promise<Fetched<GalleryItem[]>> {
  const supabase = await createClientOrNull();
  if (!supabase) return unconfigured([]);

  let query = supabase
    .from("gallery")
    .select("*")
    .eq("is_published", true)
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (mediaType) query = query.eq("media_type", mediaType);

  const { data, error } = await query;
  if (error) return failed([], error.message);
  return { status: "ok", data: data ?? [] };
}

// -----------------------------------------------------------------------------
// People
// -----------------------------------------------------------------------------

export async function getCommitteeMembers(): Promise<Fetched<CommitteeMember[]>> {
  const supabase = await createClientOrNull();
  if (!supabase) return unconfigured([]);

  const { data, error } = await supabase
    .from("committee_members")
    .select("*")
    .eq("is_active", true)
    .order("display_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) return failed([], error.message);
  return { status: "ok", data: data ?? [] };
}

export async function getVolunteers(): Promise<
  Fetched<Pick<Volunteer, "id" | "name" | "team" | "availability">[]>
> {
  const supabase = await createClientOrNull();
  if (!supabase) return unconfigured([]);

  const { data, error } = await supabase
    .from("volunteers")
    .select("id, name, team, availability")
    .eq("is_active", true)
    .eq("is_public", true)
    .order("team", { ascending: true })
    .order("name", { ascending: true });

  if (error) return failed([], error.message);
  return { status: "ok", data: data ?? [] };
}

export async function getSponsors(): Promise<Fetched<Sponsor[]>> {
  const supabase = await createClientOrNull();
  if (!supabase) return unconfigured([]);

  const { data, error } = await supabase
    .from("sponsors")
    .select("*")
    .eq("is_active", true)
    .order("display_order", { ascending: true });

  if (error) return failed([], error.message);
  return { status: "ok", data: data ?? [] };
}

export async function getContacts(): Promise<Fetched<ContactInformation[]>> {
  const supabase = await createClientOrNull();
  if (!supabase) return unconfigured([]);

  const { data, error } = await supabase
    .from("contact_information")
    .select("*")
    .eq("is_active", true)
    .order("display_order", { ascending: true });

  if (error) return failed([], error.message);
  return { status: "ok", data: data ?? [] };
}
