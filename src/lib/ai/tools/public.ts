import "server-only";

import type { ToolDefinition, ToolContext, ToolResult } from "@/lib/ai/types";
import { formatCurrency, formatFullDate, formatTime } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/* helpers                                                                     */
/* -------------------------------------------------------------------------- */

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const num = (v: unknown) => (typeof v === "number" ? v : Number(v));

/** Resolves "today" / "tomorrow" / "2026-08-25" against the committee's clock. */
function resolveDate(value: unknown, today: string): string | null {
  const raw = str(value).toLowerCase();
  if (!raw) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;

  const base = new Date(`${today}T00:00:00Z`);
  const shift = (days: number) =>
    new Date(base.getTime() + days * 86_400_000).toISOString().slice(0, 10);

  if (raw === "today") return today;
  if (raw === "tomorrow") return shift(1);
  if (raw === "yesterday") return shift(-1);
  if (raw === "day after tomorrow") return shift(2);
  return null;
}

/**
 * `summary` is for the model. Pass `userSummary` only when the text is
 * genuinely useful and safe for a villager to read ("that pooja is full"),
 * never for schema or database detail.
 */
const fail = (code: string, summary: string, userSummary?: string): ToolResult => ({
  ok: false,
  code,
  summary,
  userSummary,
});

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Narrows an LLM-supplied string to one of a fixed set of literals.
 * Tool arguments arrive as free text from the model, so nothing may be passed
 * to a typed enum column without going through here first.
 */
function oneOf<T extends string>(value: unknown, allowed: readonly T[]): T | null {
  const raw = str(value);
  return (allowed as readonly string[]).includes(raw) ? (raw as T) : null;
}

const ANNOUNCEMENT_CATEGORIES = ["pooja", "events", "general", "important"] as const;
const ANNOUNCEMENT_PRIORITIES = ["low", "normal", "high", "urgent"] as const;
const BOOKING_STATUSES = [
  "pending",
  "confirmed",
  "cancelled",
  "rescheduled",
  "completed",
  "no_show",
] as const;

const DATE_PARAM = {
  type: "string",
  description:
    'A date as YYYY-MM-DD, or one of "today", "tomorrow", "day after tomorrow". Omit for all upcoming.',
};

/* -------------------------------------------------------------------------- */
/* tools                                                                       */
/* -------------------------------------------------------------------------- */

const getFestivalInfo: ToolDefinition = {
  name: "get_festival_info",
  description:
    "Festival name, year, dates, tagline, about text, nimajjanam details and venue.",
  parameters: { type: "object", properties: {} },
  scope: "public",
  runningLabel: "Reading festival details…",
  async execute(_args, ctx) {
    const { data, error } = await ctx.supabase
      .from("festival_settings")
      .select(
        "festival_name, festival_year, tagline, about, start_date, end_date, nimajjanam_date, nimajjanam_time, nimajjanam_route, venue_name, venue_address",
      )
      .maybeSingle();

    if (error) return fail("query_failed", error.message);
    if (!data) return fail("no_data", "Festival details have not been published yet.");

    return {
      ok: true,
      summary: `${data.festival_name} ${data.festival_year}`,
      data,
    };
  },
};

const getEvents: ToolDefinition = {
  name: "get_events",
  description:
    "Published festival events. scope: upcoming (default) or past. Optional date filter.",
  parameters: {
    type: "object",
    properties: {
      scope: { type: "string", enum: ["upcoming", "past"] },
      date: DATE_PARAM,
    },
  },
  scope: "public",
  runningLabel: "Checking the event schedule…",
  async execute(args, ctx) {
    const scope = str(args.scope) === "past" ? "past" : "upcoming";
    const date = resolveDate(args.date, ctx.today);

    let query = ctx.supabase
      .from("events")
      .select("id, title, description, event_date, start_time, end_time, day_part, venue, category, status")
      .eq("is_published", true)
      .limit(30);

    if (date) query = query.eq("event_date", date);
    else if (scope === "past")
      query = query.lt("event_date", ctx.today).order("event_date", { ascending: false });
    else query = query.gte("event_date", ctx.today).order("event_date", { ascending: true });

    const { data, error } = await query;
    if (error) return fail("query_failed", error.message);

    return {
      ok: true,
      summary:
        data.length === 0
          ? date
            ? `No events on ${formatFullDate(date)}.`
            : `No ${scope} events are published.`
          : `${data.length} ${scope} event${data.length === 1 ? "" : "s"}.`,
      data: data.map((e) => ({
        ...e,
        start_time: formatTime(e.start_time),
        end_time: formatTime(e.end_time),
        event_date_readable: formatFullDate(e.event_date),
      })),
    };
  },
};

const getPoojaSchedule: ToolDefinition = {
  name: "get_pooja_schedule",
  description:
    "Published pooja timings, optionally for one date.",
  parameters: {
    type: "object",
    properties: { date: DATE_PARAM },
  },
  scope: "public",
  runningLabel: "Checking the pooja schedule…",
  async execute(args, ctx) {
    const date = resolveDate(args.date, ctx.today);

    let query = ctx.supabase
      .from("pooja_schedule")
      .select("id, title, description, pooja_date, start_time, end_time, priest_name, status, special_instructions")
      .eq("is_published", true)
      .order("pooja_date", { ascending: true })
      .order("start_time", { ascending: true })
      .limit(40);

    if (date) query = query.eq("pooja_date", date);
    else query = query.gte("pooja_date", ctx.today);

    const { data, error } = await query;
    if (error) return fail("query_failed", error.message);

    return {
      ok: true,
      summary:
        data.length === 0
          ? date
            ? `No poojas are scheduled for ${formatFullDate(date)}.`
            : "No upcoming poojas are published."
          : `${data.length} pooja${data.length === 1 ? "" : "s"} found.`,
      data: data.map((p) => ({
        pooja_id: p.id,
        title: p.title,
        date: p.pooja_date,
        date_readable: formatFullDate(p.pooja_date),
        start_time: formatTime(p.start_time),
        end_time: formatTime(p.end_time),
        priest: p.priest_name,
        status: p.status,
        instructions: p.special_instructions,
      })),
    };
  },
};

const getAvailablePoojaSlots: ToolDefinition = {
  name: "get_available_pooja_slots",
  description:
    "Live couple-booking availability. ALWAYS call before offering to book.",
  parameters: {
    type: "object",
    properties: {
      date: DATE_PARAM,
      pooja_id: { type: "string", description: "Restrict to one pooja id." },
    },
  },
  scope: "public",
  runningLabel: "Checking availability…",
  async execute(args, ctx) {
    const date = resolveDate(args.date, ctx.today);
    // The model sometimes passes a pooja *title* here. Silently ignoring a
    // non-UUID is right: the query still returns the day's slots, whereas
    // passing it through produced a raw Postgres uuid-cast error.
    const poojaId = UUID.test(str(args.pooja_id)) ? str(args.pooja_id) : "";

    let query = ctx.supabase
      .from("pooja_availability")
      .select(
        "pooja_id, title, pooja_date, start_time, end_time, max_couples, booked, available, is_bookable, booking_enabled, special_instructions",
      )
      .gte("pooja_date", date ?? ctx.today)
      .order("pooja_date", { ascending: true })
      .order("start_time", { ascending: true })
      .limit(30);

    if (date) query = query.eq("pooja_date", date);
    if (poojaId) query = query.eq("pooja_id", poojaId);

    const { data, error } = await query;
    if (error) return fail("query_failed", error.message);

    const bookable = data.filter((p) => p.is_bookable);

    return {
      ok: true,
      summary:
        data.length === 0
          ? `No poojas found${date ? ` for ${formatFullDate(date)}` : ""}.`
          : bookable.length === 0
            ? "No poojas are open for couple booking right now."
            : bookable
                .map((p) => `${p.title} ${formatTime(p.start_time)}: ${p.available} of ${p.max_couples} slots left`)
                .join("; "),
      data: data.map((p) => ({
        pooja_id: p.pooja_id,
        title: p.title,
        date: p.pooja_date,
        date_readable: formatFullDate(p.pooja_date),
        start_time: formatTime(p.start_time),
        capacity: p.max_couples,
        booked: p.booked,
        available: p.available,
        can_book_now: p.is_bookable,
        instructions: p.special_instructions,
      })),
    };
  },
};

const createBooking: ToolDefinition = {
  name: "create_booking",
  description:
    "Create a couple pooja booking. Call only after the user confirms the details you read back. May fail with code full or duplicate.",
  parameters: {
    type: "object",
    properties: {
      pooja_id: { type: "string", description: "Id from get_available_pooja_slots." },
      partner1_name: { type: "string" },
      partner2_name: { type: "string" },
      phone: { type: "string", description: "Contact phone number." },
      gotram: { type: "string" },
      email: { type: "string" },
      notes: { type: "string" },
    },
    required: ["pooja_id", "partner1_name", "phone"],
  },
  scope: "public",
  runningLabel: "Creating booking…",
  mutates: true,
  async execute(args, ctx) {
    const poojaId = str(args.pooja_id);
    const partner1 = str(args.partner1_name);
    const phone = str(args.phone);

    if (!poojaId) return fail("missing_pooja", "I need to know which pooja to book.");

    // The model occasionally passes a title or a placeholder instead of the id.
    // The model gets the precise instruction; the villager sees nothing, since
    // the agent recovers on the next step.
    if (!UUID.test(poojaId)) {
      return fail(
        "bad_pooja_id",
        "pooja_id must be the exact pooja_id value returned by get_available_pooja_slots, not a title or placeholder.",
      );
    }
    if (partner1.length < 2) return fail("missing_name", "I need the first person's name.");
    if (!/^\+?[0-9][0-9\s-]{6,18}$/.test(phone)) {
      return fail("missing_phone", "I need a valid contact phone number.");
    }

    const { data, error } = await ctx.supabase.rpc("book_pooja_slot", {
      p_pooja_id: poojaId,
      p_partner1: partner1,
      p_partner2: str(args.partner2_name) || null,
      p_phone: phone,
      p_gotram: str(args.gotram) || null,
      p_email: str(args.email) || null,
      p_notes: str(args.notes) || null,
      p_source: "ai_agent",
    });

    if (error) return fail("query_failed", error.message);

    if (!data?.ok) {
      // book_pooja_slot's messages are written for people ("All slots for this
      // pooja have just been taken"), so they are safe to show as-is.
      const message = data?.message ?? "That booking could not be completed.";
      return {
        ok: false,
        code: data?.code ?? "failed",
        summary: message,
        userSummary: message,
      };
    }

    // Verification step: read the booking back before telling the user it exists.
    const { data: verified } = await ctx.supabase.rpc("get_booking_by_ref", {
      p_booking_ref: data.booking_ref,
      p_phone: phone,
    });

    if (!verified?.ok) {
      return {
        ok: false,
        code: "verification_failed",
        summary:
          "The booking was submitted but could not be read back. Ask the user to check with the committee before assuming it worked.",
      };
    }

    return {
      ok: true,
      summary: `Booking ${data.booking_ref} confirmed for ${verified.pooja_title} on ${formatFullDate(verified.pooja_date)} at ${formatTime(verified.start_time)}.`,
      objectType: "pooja_booking",
      objectId: data.booking_ref,
      data: {
        booking_ref: data.booking_ref,
        status: verified.status,
        couple: [verified.partner1_name, verified.partner2_name].filter(Boolean).join(" & "),
        pooja: verified.pooja_title,
        date_readable: formatFullDate(verified.pooja_date),
        start_time: formatTime(verified.start_time),
        slots_left_after: data.available_after,
        verified: true,
      },
    };
  },
};

const getBooking: ToolDefinition = {
  name: "get_booking",
  description:
    "Look up a booking. Needs BOTH the reference and the phone number.",
  parameters: {
    type: "object",
    properties: {
      booking_ref: { type: "string", description: "e.g. SK2026-0042" },
      phone: { type: "string" },
    },
    required: ["booking_ref", "phone"],
  },
  scope: "public",
  runningLabel: "Looking up booking…",
  async execute(args, ctx) {
    const { data, error } = await ctx.supabase.rpc("get_booking_by_ref", {
      p_booking_ref: str(args.booking_ref),
      p_phone: str(args.phone),
    });
    if (error) return fail("query_failed", error.message);
    if (!data?.ok) {
      const message = data?.message ?? "No booking matches those details.";
      return fail("not_found", message, message);
    }

    return {
      ok: true,
      summary: `${data.booking_ref} — ${data.pooja_title} on ${formatFullDate(data.pooja_date)}, status ${data.status}.`,
      objectType: "pooja_booking",
      objectId: data.booking_ref,
      data,
    };
  },
};

const cancelBookingTool: ToolDefinition = {
  name: "cancel_booking",
  description:
    "Cancel a booking. Needs BOTH the reference and phone. Confirm with the user first.",
  parameters: {
    type: "object",
    properties: {
      booking_ref: { type: "string" },
      phone: { type: "string" },
      reason: { type: "string" },
    },
    required: ["booking_ref", "phone"],
  },
  scope: "public",
  runningLabel: "Cancelling booking…",
  mutates: true,
  async execute(args, ctx) {
    const { data, error } = await ctx.supabase.rpc("cancel_pooja_booking", {
      p_booking_ref: str(args.booking_ref),
      p_phone: str(args.phone),
      p_reason: str(args.reason) || null,
    });
    if (error) return fail("query_failed", error.message);
    if (!data?.ok) {
      const message = data?.message ?? "That booking could not be cancelled.";
      return fail(data?.code ?? "failed", message, message);
    }

    return {
      ok: true,
      summary: data.message ?? "Booking cancelled.",
      objectType: "pooja_booking",
      objectId: str(args.booking_ref),
      data,
    };
  },
};

const getAnnouncements: ToolDefinition = {
  name: "get_announcements",
  description: "Latest published committee announcements, optionally by category.",
  parameters: {
    type: "object",
    properties: {
      category: { type: "string", enum: ["pooja", "events", "general", "important"] },
      limit: { type: "number" },
    },
  },
  scope: "public",
  runningLabel: "Reading announcements…",
  async execute(args, ctx) {
    let query = ctx.supabase
      .from("announcements")
      .select("title, body, category, priority, published_at")
      .eq("is_published", true)
      .order("is_pinned", { ascending: false })
      .order("published_at", { ascending: false })
      .limit(Math.min(Math.max(num(args.limit) || 5, 1), 20));

    const category = oneOf(args.category, ANNOUNCEMENT_CATEGORIES);
    if (category) query = query.eq("category", category);

    const { data, error } = await query;
    if (error) return fail("query_failed", error.message);

    return {
      ok: true,
      summary:
        data.length === 0 ? "No announcements published yet." : `${data.length} announcement(s).`,
      data,
    };
  },
};

const getDonationSummary: ToolDefinition = {
  name: "get_public_donation_summary",
  description:
    "Public donation totals: verified amount, goal, expenses, balance, donor count.",
  parameters: { type: "object", properties: {} },
  scope: "public",
  runningLabel: "Reading donation totals…",
  async execute(_args, ctx) {
    const { data, error } = await ctx.supabase.rpc("public_stats");
    if (error) return fail("query_failed", error.message);

    const s = Object.fromEntries(
      Object.entries((data ?? {}) as Record<string, unknown>).map(([k, v]) => [k, Number(v ?? 0)]),
    );
    const balance = (s.total_donations ?? 0) - (s.total_expenses ?? 0);

    return {
      ok: true,
      summary: `${formatCurrency(s.total_donations ?? 0)} verified of a ${formatCurrency(s.donation_goal ?? 0)} goal.`,
      data: {
        verified_donations: formatCurrency(s.total_donations ?? 0),
        donation_goal: formatCurrency(s.donation_goal ?? 0),
        total_expenses: formatCurrency(s.total_expenses ?? 0),
        remaining_balance: formatCurrency(balance),
        donors: s.donor_count ?? 0,
        transactions: s.transaction_count ?? 0,
        note: "Only donations a committee member has verified against the bank statement are counted.",
      },
    };
  },
};

const getCommitteeInfo: ToolDefinition = {
  name: "get_committee_info",
  description: "The committee roster: names and positions.",
  parameters: { type: "object", properties: {} },
  scope: "public",
  runningLabel: "Reading committee list…",
  async execute(_args, ctx) {
    const { data, error } = await ctx.supabase
      .from("committee_members")
      .select("name, position")
      .eq("is_active", true)
      .order("display_order", { ascending: true })
      .limit(50);
    if (error) return fail("query_failed", error.message);
    return {
      ok: true,
      summary: data.length === 0 ? "No committee members listed yet." : `${data.length} members.`,
      data,
    };
  },
};

const getLocationInfo: ToolDefinition = {
  name: "get_location_info",
  description: "Venue name, address and public contact numbers.",
  parameters: { type: "object", properties: {} },
  scope: "public",
  runningLabel: "Reading location details…",
  async execute(_args, ctx) {
    const [settings, contacts] = await Promise.all([
      ctx.supabase
        .from("festival_settings")
        .select("venue_name, venue_address, directions_url")
        .maybeSingle(),
      ctx.supabase
        .from("contact_information")
        .select("label, contact_name, phone, is_emergency")
        .eq("is_active", true)
        .order("display_order", { ascending: true })
        .limit(20),
    ]);

    if (settings.error) return fail("query_failed", settings.error.message);

    return {
      ok: true,
      summary: settings.data?.venue_name
        ? `${settings.data.venue_name}, ${settings.data.venue_address ?? ""}`.trim()
        : "The venue has not been published yet.",
      data: { venue: settings.data, contacts: contacts.data ?? [] },
    };
  },
};

const getVolunteerInformation: ToolDefinition = {
  name: "get_volunteer_information",
  description:
    "Public volunteer list: names and teams only. Phone numbers are never available.",
  parameters: { type: "object", properties: {} },
  scope: "public",
  runningLabel: "Reading volunteer teams…",
  async execute(_args, ctx) {
    const { data, error } = await ctx.supabase
      .from("volunteers")
      .select("name, team, availability")
      .eq("is_active", true)
      .eq("is_public", true)
      .order("team", { ascending: true })
      .limit(100);
    if (error) return fail("query_failed", error.message);
    return {
      ok: true,
      summary: data.length === 0 ? "No volunteers listed yet." : `${data.length} volunteers.`,
      data,
    };
  },
};

const getGalleryHighlights: ToolDefinition = {
  name: "get_gallery_highlights",
  description: "Highlighted gallery items (titles and captions only).",
  parameters: { type: "object", properties: {} },
  scope: "public",
  runningLabel: "Reading gallery…",
  async execute(_args, ctx) {
    const { data, error } = await ctx.supabase
      .from("gallery")
      .select("title, caption, media_type, album")
      .eq("is_published", true)
      .eq("is_highlight", true)
      .limit(20);
    if (error) return fail("query_failed", error.message);
    return {
      ok: true,
      summary: data.length === 0 ? "No gallery highlights yet." : `${data.length} highlights.`,
      data,
    };
  },
};

export const PUBLIC_TOOLS: ToolDefinition[] = [
  getFestivalInfo,
  getEvents,
  getPoojaSchedule,
  getAvailablePoojaSlots,
  createBooking,
  getBooking,
  cancelBookingTool,
  getAnnouncements,
  getDonationSummary,
  getCommitteeInfo,
  getLocationInfo,
  getVolunteerInformation,
  getGalleryHighlights,
];

export {
  resolveDate,
  str,
  num,
  fail,
  oneOf,
  ANNOUNCEMENT_CATEGORIES,
  ANNOUNCEMENT_PRIORITIES,
  BOOKING_STATUSES,
};
export type { ToolContext };
