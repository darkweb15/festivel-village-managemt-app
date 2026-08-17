"use server";

import { revalidatePath } from "next/cache";
import { createClientOrNull } from "@/lib/supabase/server";
import { bookingMessage, lookupMessage } from "@/lib/booking-messages";
import { getDictionary } from "@/lib/i18n/server";
import type {
  BookingFormState,
  BookingLookupState,
} from "@/lib/form-state";

/**
 * Creates a couple pooja booking.
 *
 * All capacity and eligibility logic lives in public.book_pooja_slot(), which
 * takes a row lock on the pooja before counting. This action only shapes input
 * and translates the result — it deliberately does NOT pre-check availability
 * and then insert, because that pattern is exactly what loses a race.
 */
export async function createBooking(
  _prev: BookingFormState,
  formData: FormData,
): Promise<BookingFormState> {
  const t = await getDictionary();
  const poojaId = String(formData.get("pooja_id") ?? "").trim();
  const partner1 = String(formData.get("partner1_name") ?? "").trim();
  const partner2 = String(formData.get("partner2_name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const gotram = String(formData.get("gotram") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  const fieldErrors: BookingFormState["fieldErrors"] = {};

  if (partner1.length < 2 || partner1.length > 80) {
    fieldErrors.partner1_name = t.bookingErrors.name;
  }
  if (partner2.length > 80) {
    fieldErrors.partner2_name = t.bookingErrors.nameLong;
  }
  if (!/^\+?[0-9][0-9\s-]{6,18}$/.test(phone)) {
    fieldErrors.phone = t.bookingErrors.phone;
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    fieldErrors.email = t.bookingErrors.email;
  }
  if (gotram.length > 80) {
    fieldErrors.gotram = t.bookingErrors.nameLong;
  }
  if (!poojaId) {
    return {
      status: "error",
      message: t.bookingErrors.chooseFirst,
      fieldErrors: {},
    };
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { status: "error", message: "", fieldErrors };
  }

  const supabase = await createClientOrNull();
  if (!supabase) {
    return {
      status: "error",
      message: t.bookingErrors.unavailableNow,
      fieldErrors: {},
    };
  }

  const { data, error } = await supabase.rpc("book_pooja_slot", {
    p_pooja_id: poojaId,
    p_partner1: partner1,
    p_partner2: partner2 || null,
    p_phone: phone,
    p_gotram: gotram || null,
    p_email: email || null,
    p_notes: notes || null,
    p_source: "public_form",
  });

  if (error) {
    return {
      status: "error",
      message: t.bookingErrors.failed,
      fieldErrors: {},
    };
  }

  if (!data?.ok) {
    return {
      status: "error",
      code: data?.code,
      // The database's English message is the fallback for a code we don't know.
      message: bookingMessage(t, data?.code, data?.message ?? t.bookingErrors.slotGone),
      fieldErrors: {},
    };
  }

  revalidatePath("/book");
  revalidatePath("/pooja");
  revalidatePath("/");

  return {
    status: "confirmed",
    message: t.bookingErrors.confirmedMsg,
    fieldErrors: {},
    booking: {
      booking_ref: data.booking_ref,
      pooja_title: data.pooja_title ?? "",
      pooja_date: data.pooja_date ?? "",
      start_time: data.start_time ?? "",
      partner1_name: data.partner1_name ?? partner1,
      partner2_name: data.partner2_name ?? (partner2 || null),
      status: data.status,
      available_after: data.available_after ?? 0,
    },
  };
}

/** Looks up a booking. Requires reference AND phone, so refs can't be enumerated. */
export async function lookupBooking(
  _prev: BookingLookupState,
  formData: FormData,
): Promise<BookingLookupState> {
  const t = await getDictionary();
  const ref = String(formData.get("booking_ref") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();

  if (!ref || !phone) {
    return {
      status: "error",
      message: t.bookingErrors.enterBoth,
    };
  }

  const supabase = await createClientOrNull();
  if (!supabase) {
    return { status: "error", message: t.bookingErrors.unavailableNow };
  }

  const { data, error } = await supabase.rpc("get_booking_by_ref", {
    p_booking_ref: ref,
    p_phone: phone,
  });

  if (error) {
    return { status: "error", message: t.bookingErrors.generic };
  }
  if (!data?.ok) {
    return {
      status: "error",
      message: lookupMessage(t, data?.code, t.bookingErrors.lookupNotFound),
    };
  }

  return {
    status: "found",
    message: "",
    booking: {
      booking_ref: data.booking_ref,
      status: data.status,
      partner1_name: data.partner1_name,
      partner2_name: data.partner2_name,
      gotram: data.gotram,
      pooja_title: data.pooja_title,
      pooja_date: data.pooja_date,
      start_time: data.start_time,
      end_time: data.end_time,
      special_instructions: data.special_instructions,
    },
  };
}

/** Cancels a booking, freeing the slot. Also requires reference AND phone. */
export async function cancelBooking(
  _prev: BookingLookupState,
  formData: FormData,
): Promise<BookingLookupState> {
  const t = await getDictionary();
  const ref = String(formData.get("booking_ref") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();

  const supabase = await createClientOrNull();
  if (!supabase) {
    return { status: "error", message: t.bookingErrors.unavailableNow };
  }

  const { data, error } = await supabase.rpc("cancel_pooja_booking", {
    p_booking_ref: ref,
    p_phone: phone,
    // Stored in the cancellation audit trail the committee reads, so this one
    // stays English along with the rest of the admin-facing data.
    p_reason: "Cancelled by the person who booked",
  });

  if (error) {
    return { status: "error", message: t.bookingErrors.generic };
  }
  if (!data?.ok) {
    return {
      status: "error",
      message: lookupMessage(t, data?.code, t.bookingErrors.cancelFailed),
    };
  }

  revalidatePath("/book");
  revalidatePath("/pooja");

  return { status: "cancelled", message: t.bookingErrors.cancelled };
}
