import "server-only";

import type { ToolDefinition, ToolResult } from "@/lib/ai/types";
import {
  ANNOUNCEMENT_CATEGORIES,
  ANNOUNCEMENT_PRIORITIES,
  BOOKING_STATUSES,
  fail,
  num,
  oneOf,
  resolveDate,
  str,
} from "@/lib/ai/tools/public";
import type { PoojaSlot } from "@/lib/supabase/types";
import { formatCurrency, formatFullDate, formatTime } from "@/lib/utils";

/**
 * Admin tools.
 *
 * Two independent guards apply to every one of these:
 *  1. They are only ever added to the registry for the `copilot` surface, and
 *     that surface is only reachable by a signed-in editor/admin.
 *  2. `requireAdmin` below re-checks the actor on each call, so a prompt that
 *     somehow reached this code with a public actor still gets nothing.
 * Row Level Security in Postgres remains the final boundary underneath both.
 */
function requireAdmin(ctx: { actor: { type: string } }): ToolResult | null {
  if (ctx.actor.type !== "admin") {
    return {
      ok: false,
      code: "unauthorized",
      summary:
        "That action needs committee sign-in. Tell the user you cannot do it here.",
    };
  }
  return null;
}

const DATE_PARAM = {
  type: "string",
  description: 'YYYY-MM-DD, or "today" / "tomorrow".',
};

/* -------------------------------------------------------------------------- */

const getAdminBookingSummary: ToolDefinition = {
  name: "get_admin_booking_summary",
  description:
    "Booking counts across the festival: today, tomorrow, upcoming, confirmed, pending, cancelled, total slots, slots left, unassigned volunteers.",
  parameters: { type: "object", properties: {} },
  scope: "admin",
  runningLabel: "Reading booking summary…",
  async execute(_args, ctx) {
    const denied = requireAdmin(ctx);
    if (denied) return denied;

    const { data, error } = await ctx.supabase.rpc("admin_booking_summary");
    if (error) return fail("query_failed", error.message);

    const s = Object.fromEntries(
      Object.entries((data ?? {}) as Record<string, unknown>).map(([k, v]) => [k, Number(v ?? 0)]),
    );

    return {
      ok: true,
      summary: `${s.today} booking(s) today, ${s.tomorrow} tomorrow, ${s.slots_left} slot(s) still free.`,
      data: s,
    };
  },
};

const getBookingsForDate: ToolDefinition = {
  name: "get_bookings_for_date",
  description:
    "The couple bookings for a given date, including couple names, phone numbers and status. Committee use only.",
  parameters: {
    type: "object",
    properties: { date: DATE_PARAM, status: { type: "string" } },
    required: ["date"],
  },
  scope: "admin",
  runningLabel: "Reading bookings…",
  async execute(args, ctx) {
    const denied = requireAdmin(ctx);
    if (denied) return denied;

    const date = resolveDate(args.date, ctx.today);
    if (!date) return fail("bad_date", "I need a specific date, e.g. today or 2026-08-25.");

    let query = ctx.supabase
      .from("pooja_bookings")
      .select(
        "booking_ref, partner1_name, partner2_name, phone, gotram, status, source, pooja:pooja_schedule!inner(title, pooja_date, start_time)",
      )
      .eq("pooja_schedule.pooja_date", date)
      .limit(200);

    const status = oneOf(args.status, BOOKING_STATUSES);
    if (status) query = query.eq("status", status);

    const { data, error } = await query;
    if (error) return fail("query_failed", error.message);

    return {
      ok: true,
      summary: `${data.length} booking(s) on ${formatFullDate(date)}.`,
      data: data.map((b) => {
        const embedded = b.pooja as unknown;
        const p = (Array.isArray(embedded) ? embedded[0] : embedded) as
          | { title: string; start_time: string }
          | undefined;
        return {
          booking_ref: b.booking_ref,
          couple: [b.partner1_name, b.partner2_name].filter(Boolean).join(" & "),
          phone: b.phone,
          gotram: b.gotram,
          status: b.status,
          source: b.source,
          pooja: p?.title,
          time: p ? formatTime(p.start_time) : null,
        };
      }),
    };
  },
};

const getAdminDonationSummary: ToolDefinition = {
  name: "get_admin_donation_summary",
  description:
    "Donation figures including pending (unverified) amounts that the public totals exclude.",
  parameters: { type: "object", properties: {} },
  scope: "admin",
  runningLabel: "Reading donation figures…",
  async execute(_args, ctx) {
    const denied = requireAdmin(ctx);
    if (denied) return denied;

    const { data, error } = await ctx.supabase.rpc("admin_stats");
    if (error) return fail("query_failed", error.message);

    const s = Object.fromEntries(
      Object.entries((data ?? {}) as Record<string, unknown>).map(([k, v]) => [k, Number(v ?? 0)]),
    );

    return {
      ok: true,
      summary: `${formatCurrency(s.total_donations ?? 0)} verified, ${formatCurrency(s.pending_donations ?? 0)} awaiting confirmation (${s.pending_count ?? 0} entries).`,
      data: {
        verified: formatCurrency(s.total_donations ?? 0),
        pending: formatCurrency(s.pending_donations ?? 0),
        pending_count: s.pending_count ?? 0,
        expenses: formatCurrency(s.total_expenses ?? 0),
        balance: formatCurrency((s.total_donations ?? 0) - (s.total_expenses ?? 0)),
        goal: formatCurrency(s.donation_goal ?? 0),
        donors: s.donor_count ?? 0,
      },
    };
  },
};

const getExpenseSummary: ToolDefinition = {
  name: "get_expense_summary",
  description:
    "Expenses, optionally limited to a date range, grouped by category with a total.",
  parameters: {
    type: "object",
    properties: {
      from: { type: "string", description: "YYYY-MM-DD" },
      to: { type: "string", description: "YYYY-MM-DD" },
    },
  },
  scope: "admin",
  runningLabel: "Adding up expenses…",
  async execute(args, ctx) {
    const denied = requireAdmin(ctx);
    if (denied) return denied;

    let query = ctx.supabase
      .from("expenses")
      .select("title, category, amount, expense_date, vendor")
      .order("expense_date", { ascending: false })
      .limit(500);

    const from = str(args.from);
    const to = str(args.to);
    if (from) query = query.gte("expense_date", from);
    if (to) query = query.lte("expense_date", to);

    const { data, error } = await query;
    if (error) return fail("query_failed", error.message);

    const byCategory = new Map<string, number>();
    let total = 0;
    for (const e of data) {
      const amount = Number(e.amount);
      total += amount;
      byCategory.set(e.category, (byCategory.get(e.category) ?? 0) + amount);
    }

    return {
      ok: true,
      summary: `${formatCurrency(total)} across ${data.length} expense(s).`,
      data: {
        total: formatCurrency(total),
        count: data.length,
        by_category: [...byCategory.entries()].map(([category, amount]) => ({
          category,
          amount: formatCurrency(amount),
        })),
      },
    };
  },
};

const getVolunteerAssignments: ToolDefinition = {
  name: "get_volunteer_assignments",
  description:
    "Volunteer duty assignments, optionally for one date, plus how many active volunteers have no assignment.",
  parameters: { type: "object", properties: { date: DATE_PARAM } },
  scope: "admin",
  runningLabel: "Reading volunteer duties…",
  async execute(args, ctx) {
    const denied = requireAdmin(ctx);
    if (denied) return denied;

    const date = resolveDate(args.date, ctx.today);

    let query = ctx.supabase
      .from("volunteer_assignments")
      .select("id, role, duty_date, status, volunteer:volunteers(name, team)")
      .limit(200);
    if (date) query = query.eq("duty_date", date);

    const [assignments, volunteers] = await Promise.all([
      query,
      ctx.supabase.from("volunteers").select("id, name").eq("is_active", true).limit(500),
    ]);

    if (assignments.error) return fail("query_failed", assignments.error.message);

    const assignedIds = new Set(
      (assignments.data ?? []).filter((a) => a.status === "assigned").map((a) => a.id),
    );

    return {
      ok: true,
      summary: `${assignments.data.length} assignment(s)${date ? ` on ${formatFullDate(date)}` : ""}; ${Math.max((volunteers.data?.length ?? 0) - assignedIds.size, 0)} volunteer(s) without a duty.`,
      data: {
        assignments: assignments.data.map((a) => {
          const embedded = a.volunteer as unknown;
          const v = (Array.isArray(embedded) ? embedded[0] : embedded) as
            | { name: string; team: string }
            | undefined;
          return {
            role: a.role,
            duty_date: a.duty_date,
            status: a.status,
            volunteer: v?.name,
            team: v?.team,
          };
        }),
        active_volunteers: volunteers.data?.length ?? 0,
      },
    };
  },
};

const updateBookingStatus: ToolDefinition = {
  name: "update_booking_status",
  description:
    "Change a booking's status (confirmed, cancelled, completed, no_show). Confirm with the admin before calling.",
  parameters: {
    type: "object",
    properties: {
      booking_ref: { type: "string" },
      status: {
        type: "string",
        enum: ["pending", "confirmed", "cancelled", "completed", "no_show"],
      },
    },
    required: ["booking_ref", "status"],
  },
  scope: "admin",
  runningLabel: "Updating booking…",
  mutates: true,
  async execute(args, ctx) {
    const denied = requireAdmin(ctx);
    if (denied) return denied;

    const ref = str(args.booking_ref).toUpperCase();
    const status = oneOf(args.status, BOOKING_STATUSES);
    if (!status) return fail("bad_status", "That is not a valid booking status.");

    const { data: updated, error } = await ctx.supabase
      .from("pooja_bookings")
      .update({ status })
      .eq("booking_ref", ref)
      .select("booking_ref, status")
      .maybeSingle();

    if (error) return fail("query_failed", error.message);
    if (!updated) return fail("not_found", `No booking with reference ${ref}.`);

    return {
      ok: true,
      summary: `${updated.booking_ref} is now ${updated.status}.`,
      objectType: "pooja_booking",
      objectId: updated.booking_ref,
      data: updated,
    };
  },
};

const createPooja: ToolDefinition = {
  name: "create_pooja",
  description:
    "Add a pooja to the schedule, optionally opening couple booking with a capacity.",
  parameters: {
    type: "object",
    properties: {
      title: { type: "string" },
      pooja_date: { type: "string", description: "YYYY-MM-DD" },
      start_time: { type: "string", description: "HH:MM in 24-hour form" },
      end_time: { type: "string" },
      description: { type: "string" },
      priest_name: { type: "string" },
      max_couples: { type: "number" },
      booking_enabled: { type: "boolean" },
      special_instructions: { type: "string" },
    },
    required: ["title", "pooja_date", "start_time"],
  },
  scope: "admin",
  runningLabel: "Creating pooja…",
  mutates: true,
  async execute(args, ctx) {
    const denied = requireAdmin(ctx);
    if (denied) return denied;

    const date = str(args.pooja_date);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return fail("bad_date", "Date must be YYYY-MM-DD.");
    const start = str(args.start_time);
    if (!/^\d{2}:\d{2}(:\d{2})?$/.test(start)) return fail("bad_time", "Start time must be HH:MM.");

    const { data, error } = await ctx.supabase
      .from("pooja_schedule")
      .insert({
        title: str(args.title),
        pooja_date: date,
        start_time: start,
        end_time: str(args.end_time) || null,
        description: str(args.description) || null,
        priest_name: str(args.priest_name) || null,
        max_couples: Math.max(0, num(args.max_couples) || 0),
        booking_enabled: args.booking_enabled === true,
        special_instructions: str(args.special_instructions) || null,
        is_published: true,
      })
      .select("id, title, pooja_date, start_time, max_couples, booking_enabled")
      .maybeSingle();

    if (error) return fail("query_failed", error.message);

    return {
      ok: true,
      summary: `Created "${data?.title}" on ${formatFullDate(date)} at ${formatTime(start)}.`,
      objectType: "pooja",
      objectId: data?.id,
      data,
    };
  },
};

const updatePooja: ToolDefinition = {
  name: "update_pooja",
  description:
    "Update an existing pooja — for example to open booking, change capacity, or cancel it.",
  parameters: {
    type: "object",
    properties: {
      pooja_id: { type: "string" },
      max_couples: { type: "number" },
      booking_enabled: { type: "boolean" },
      status: { type: "string", enum: ["scheduled", "cancelled", "completed"] },
      start_time: { type: "string" },
      special_instructions: { type: "string" },
    },
    required: ["pooja_id"],
  },
  scope: "admin",
  runningLabel: "Updating pooja…",
  mutates: true,
  async execute(args, ctx) {
    const denied = requireAdmin(ctx);
    if (denied) return denied;

    const patch: Partial<PoojaSlot> = {};
    if (args.max_couples !== undefined) patch.max_couples = Math.max(0, num(args.max_couples) || 0);
    if (args.booking_enabled !== undefined) patch.booking_enabled = args.booking_enabled === true;

    const status = oneOf(args.status, ["scheduled", "cancelled", "completed"] as const);
    if (status) patch.status = status;

    if (str(args.start_time)) patch.start_time = str(args.start_time);
    if (str(args.special_instructions)) {
      patch.special_instructions = str(args.special_instructions);
    }

    if (Object.keys(patch).length === 0) return fail("nothing_to_do", "No changes were given.");

    const { data, error } = await ctx.supabase
      .from("pooja_schedule")
      .update(patch)
      .eq("id", str(args.pooja_id))
      .select("id, title, pooja_date, max_couples, booking_enabled, status")
      .maybeSingle();

    if (error) return fail("query_failed", error.message);
    if (!data) return fail("not_found", "No pooja with that id.");

    return {
      ok: true,
      summary: `Updated "${data.title}".`,
      objectType: "pooja",
      objectId: data.id,
      data,
    };
  },
};

const createEvent: ToolDefinition = {
  name: "create_event",
  description: "Add a festival event to the public calendar.",
  parameters: {
    type: "object",
    properties: {
      title: { type: "string" },
      event_date: { type: "string", description: "YYYY-MM-DD" },
      start_time: { type: "string" },
      description: { type: "string" },
      venue: { type: "string" },
      day_part: { type: "string", enum: ["Morning", "Afternoon", "Evening", "Night"] },
    },
    required: ["title", "event_date"],
  },
  scope: "admin",
  runningLabel: "Creating event…",
  mutates: true,
  async execute(args, ctx) {
    const denied = requireAdmin(ctx);
    if (denied) return denied;

    const date = str(args.event_date);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return fail("bad_date", "Date must be YYYY-MM-DD.");

    const { data, error } = await ctx.supabase
      .from("events")
      .insert({
        title: str(args.title),
        event_date: date,
        start_time: str(args.start_time) || null,
        description: str(args.description) || null,
        venue: str(args.venue) || null,
        day_part: str(args.day_part) || null,
        is_published: true,
      })
      .select("id, title, event_date, start_time")
      .maybeSingle();

    if (error) return fail("query_failed", error.message);

    return {
      ok: true,
      summary: `Created event "${data?.title}" on ${formatFullDate(date)}.`,
      objectType: "event",
      objectId: data?.id,
      data,
    };
  },
};

/**
 * §28: high-impact content is never published silently. The model must first
 * call this to produce a draft, show it to the admin, and only then call
 * create_announcement with confirmed: true.
 */
const draftAnnouncement: ToolDefinition = {
  name: "draft_announcement",
  description:
    "Prepare an announcement draft for the admin to review. This does NOT publish anything. Always use this before create_announcement.",
  parameters: {
    type: "object",
    properties: {
      title: { type: "string" },
      body: { type: "string" },
      category: { type: "string", enum: ["pooja", "events", "general", "important"] },
      priority: { type: "string", enum: ["low", "normal", "high", "urgent"] },
    },
    required: ["title", "body"],
  },
  scope: "admin",
  runningLabel: "Drafting announcement…",
  async execute(args, ctx) {
    const denied = requireAdmin(ctx);
    if (denied) return denied;

    const draft = {
      title: str(args.title),
      body: str(args.body),
      category: oneOf(args.category, ANNOUNCEMENT_CATEGORIES) ?? "general",
      priority: oneOf(args.priority, ANNOUNCEMENT_PRIORITIES) ?? "normal",
    };

    if (!draft.title || !draft.body) return fail("incomplete", "A title and message are required.");

    return {
      ok: true,
      summary:
        "Draft ready — nothing has been published. Show this to the admin and ask for approval before calling create_announcement.",
      data: { draft, published: false, requires_approval: true },
    };
  },
};

const createAnnouncement: ToolDefinition = {
  name: "create_announcement",
  description:
    "Publish an announcement to every villager. Only call this after the admin has seen the draft and explicitly approved it, and pass confirmed: true.",
  parameters: {
    type: "object",
    properties: {
      title: { type: "string" },
      body: { type: "string" },
      category: { type: "string", enum: ["pooja", "events", "general", "important"] },
      priority: { type: "string", enum: ["low", "normal", "high", "urgent"] },
      confirmed: {
        type: "boolean",
        description: "Must be true, and only after the admin has approved the draft.",
      },
    },
    required: ["title", "body", "confirmed"],
  },
  scope: "admin",
  runningLabel: "Publishing announcement…",
  mutates: true,
  async execute(args, ctx) {
    const denied = requireAdmin(ctx);
    if (denied) return denied;

    if (args.confirmed !== true) {
      return {
        ok: false,
        code: "needs_approval",
        summary:
          "Not published. Show the draft to the admin and ask for explicit approval, then call again with confirmed: true.",
      };
    }

    const title = str(args.title);
    const body = str(args.body);
    if (!title || !body) return fail("incomplete", "A title and message are required.");

    const { data, error } = await ctx.supabase
      .from("announcements")
      .insert({
        title,
        body,
        category: oneOf(args.category, ANNOUNCEMENT_CATEGORIES) ?? "general",
        priority: oneOf(args.priority, ANNOUNCEMENT_PRIORITIES) ?? "normal",
        is_published: true,
        created_by: ctx.actor.type === "admin" ? ctx.actor.id : null,
      })
      .select("id, title, category, priority, published_at")
      .maybeSingle();

    if (error) return fail("query_failed", error.message);

    // Verify it is actually visible before reporting success.
    const { data: check } = await ctx.supabase
      .from("announcements")
      .select("id, is_published")
      .eq("id", data?.id ?? "")
      .maybeSingle();

    if (!check?.is_published) {
      return fail("verification_failed", "The announcement was saved but is not showing as published.");
    }

    return {
      ok: true,
      summary: `Published "${data?.title}".`,
      objectType: "announcement",
      objectId: data?.id,
      data: { ...data, verified_published: true },
    };
  },
};

const assignVolunteer: ToolDefinition = {
  name: "assign_volunteer",
  description: "Assign a volunteer to a duty, optionally tied to a date, pooja or event.",
  parameters: {
    type: "object",
    properties: {
      volunteer_name: { type: "string", description: "Name of an active volunteer." },
      role: { type: "string" },
      duty_date: { type: "string", description: "YYYY-MM-DD" },
    },
    required: ["volunteer_name", "role"],
  },
  scope: "admin",
  runningLabel: "Assigning volunteer…",
  mutates: true,
  async execute(args, ctx) {
    const denied = requireAdmin(ctx);
    if (denied) return denied;

    const name = str(args.volunteer_name);
    const { data: matches, error: findError } = await ctx.supabase
      .from("volunteers")
      .select("id, name")
      .ilike("name", `%${name}%`)
      .eq("is_active", true)
      .limit(5);

    if (findError) return fail("query_failed", findError.message);
    if (!matches || matches.length === 0) return fail("not_found", `No active volunteer matching "${name}".`);
    if (matches.length > 1) {
      return {
        ok: false,
        code: "ambiguous",
        summary: `Several volunteers match "${name}": ${matches.map((m) => m.name).join(", ")}. Ask which one.`,
      };
    }

    const { data, error } = await ctx.supabase
      .from("volunteer_assignments")
      .insert({
        volunteer_id: matches[0].id,
        role: str(args.role) || "General",
        duty_date: str(args.duty_date) || null,
        assigned_by: ctx.actor.type === "admin" ? ctx.actor.id : null,
      })
      .select("id, role, duty_date")
      .maybeSingle();

    if (error) return fail("query_failed", error.message);

    return {
      ok: true,
      summary: `${matches[0].name} assigned to ${data?.role}${data?.duty_date ? ` on ${formatFullDate(data.duty_date)}` : ""}.`,
      objectType: "volunteer_assignment",
      objectId: data?.id,
      data,
    };
  },
};

const generateEventSummary: ToolDefinition = {
  name: "generate_event_summary",
  description:
    "Gather everything relevant to one day — poojas, bookings, events, volunteer duties — so you can write an operational summary. Every number comes from the database.",
  parameters: { type: "object", properties: { date: DATE_PARAM }, required: ["date"] },
  scope: "admin",
  runningLabel: "Gathering the day's data…",
  async execute(args, ctx) {
    const denied = requireAdmin(ctx);
    if (denied) return denied;

    const date = resolveDate(args.date, ctx.today);
    if (!date) return fail("bad_date", "I need a specific date.");

    const [availability, events, bookings, duties] = await Promise.all([
      ctx.supabase
        .from("pooja_availability")
        .select("title, start_time, max_couples, booked, available")
        .eq("pooja_date", date),
      ctx.supabase
        .from("events")
        .select("title, start_time, venue, status")
        .eq("event_date", date)
        .eq("is_published", true),
      ctx.supabase
        .from("pooja_bookings")
        .select("status, pooja:pooja_schedule!inner(pooja_date)")
        .eq("pooja_schedule.pooja_date", date),
      ctx.supabase
        .from("volunteer_assignments")
        .select("role, status")
        .eq("duty_date", date),
    ]);

    const poojas = availability.data ?? [];
    const totalSlots = poojas.reduce((sum, p) => sum + p.max_couples, 0);
    const totalBooked = poojas.reduce((sum, p) => sum + p.booked, 0);

    return {
      ok: true,
      summary: `${formatFullDate(date)}: ${poojas.length} pooja(s), ${totalBooked}/${totalSlots} couple slots taken, ${events.data?.length ?? 0} event(s), ${duties.data?.length ?? 0} volunteer duties.`,
      data: {
        date,
        date_readable: formatFullDate(date),
        poojas: poojas.map((p) => ({
          title: p.title,
          time: formatTime(p.start_time),
          capacity: p.max_couples,
          booked: p.booked,
          available: p.available,
        })),
        events: (events.data ?? []).map((e) => ({
          title: e.title,
          time: formatTime(e.start_time),
          venue: e.venue,
          status: e.status,
        })),
        bookings_total: bookings.data?.length ?? 0,
        volunteer_duties: duties.data?.length ?? 0,
        slots_total: totalSlots,
        slots_taken: totalBooked,
      },
    };
  },
};

export const ADMIN_TOOLS: ToolDefinition[] = [
  getAdminBookingSummary,
  getBookingsForDate,
  getAdminDonationSummary,
  getExpenseSummary,
  getVolunteerAssignments,
  updateBookingStatus,
  createPooja,
  updatePooja,
  createEvent,
  draftAnnouncement,
  createAnnouncement,
  assignVolunteer,
  generateEventSummary,
];
