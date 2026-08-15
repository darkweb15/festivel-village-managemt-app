"use server";

import { revalidatePath } from "next/cache";
import { createClient, requireEditor } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/form-state";
import type { BookingStatus } from "@/lib/supabase/types";

const ALLOWED: BookingStatus[] = [
  "pending",
  "confirmed",
  "cancelled",
  "rescheduled",
  "completed",
  "no_show",
];

function fail(message: string): ActionState {
  return { ok: false, message, fieldErrors: {} };
}

/** Confirm / cancel / complete / no-show a booking from the admin dashboard. */
export async function setBookingStatus(
  id: string,
  status: BookingStatus,
  reason?: string,
): Promise<ActionState> {
  const editor = await requireEditor();
  if (!editor) return fail("You don't have permission to make this change.");
  if (!ALLOWED.includes(status)) return fail("Unknown booking status.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("pooja_bookings")
    .update({
      status,
      cancel_reason: status === "cancelled" ? (reason ?? "Cancelled by the committee") : null,
    })
    .eq("id", id);

  if (error) return fail(error.message);

  revalidatePath("/admin/bookings");
  revalidatePath("/admin");
  revalidatePath("/book");

  return { ok: true, message: `Booking marked ${status.replace("_", " ")}.`, fieldErrors: {} };
}

/**
 * Moves a booking to a different pooja.
 *
 * Capacity on the destination is re-checked here under the same rules the
 * public booking path uses, so rescheduling cannot overfill a pooja.
 */
export async function rescheduleBooking(
  id: string,
  newPoojaId: string,
): Promise<ActionState> {
  const editor = await requireEditor();
  if (!editor) return fail("You don't have permission to make this change.");
  if (!newPoojaId) return fail("Choose the pooja to move this booking to.");

  const supabase = await createClient();

  const { data: target, error: targetError } = await supabase
    .from("pooja_availability")
    .select("available, max_couples, is_bookable, title")
    .eq("pooja_id", newPoojaId)
    .maybeSingle();

  if (targetError) return fail(targetError.message);
  if (!target) return fail("That pooja could not be found.");
  if (target.max_couples > 0 && target.available <= 0) {
    return fail(`${target.title} is already full.`);
  }

  const { error } = await supabase
    .from("pooja_bookings")
    .update({
      pooja_id: newPoojaId,
      status: "rescheduled",
      rescheduled_from: id,
    })
    .eq("id", id);

  if (error) return fail(error.message);

  revalidatePath("/admin/bookings");
  revalidatePath("/admin");
  revalidatePath("/book");

  return {
    ok: true,
    message: `Booking moved to ${target.title}.`,
    fieldErrors: {},
  };
}
