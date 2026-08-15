"use server";

import { revalidatePath } from "next/cache";
import { createClientOrNull } from "@/lib/supabase/server";
import type { DonationFormState } from "@/lib/form-state";

/**
 * Records a donation a visitor says they have already sent over UPI.
 *
 * This does NOT verify the payment — nothing in this app talks to a payment
 * provider. The row is stored as `pending` and a committee member confirms it
 * against the bank/UPI statement before it counts towards any public total.
 */
export async function submitDonation(
  _prev: DonationFormState,
  formData: FormData,
): Promise<DonationFormState> {
  const donorName = String(formData.get("donor_name") ?? "").trim();
  const rawAmount = String(formData.get("amount") ?? "").trim();
  const transactionRef = String(formData.get("transaction_ref") ?? "").trim();
  const phone = String(formData.get("donor_phone") ?? "").trim();
  const isAnonymous = formData.get("is_anonymous") === "on";

  const fieldErrors: DonationFormState["fieldErrors"] = {};

  if (donorName.length < 2 || donorName.length > 80) {
    fieldErrors.donor_name = "Please enter your name (2–80 characters).";
  }

  const amount = Number(rawAmount.replace(/,/g, ""));
  if (!Number.isFinite(amount) || amount <= 0) {
    fieldErrors.amount = "Enter the amount you sent.";
  } else if (amount > 1_000_000) {
    fieldErrors.amount = "Please contact the treasurer directly for this amount.";
  }

  if (transactionRef.length > 64) {
    fieldErrors.transaction_ref = "That reference looks too long.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, message: "", fieldErrors };
  }

  const supabase = await createClientOrNull();
  if (!supabase) {
    return {
      ok: false,
      message:
        "The donation register isn’t connected yet. Please contact a committee member.",
      fieldErrors: {},
    };
  }

  // No .select() — anonymous visitors are not permitted to read pending rows.
  const { error } = await supabase.from("donations").insert({
    donor_name: donorName,
    donor_phone: phone || null,
    amount,
    transaction_ref: transactionRef || null,
    is_anonymous: isAnonymous,
    payment_method: "upi",
    status: "pending",
    source: "public_form",
    donation_date: new Date().toISOString().slice(0, 10),
  });

  if (error) {
    return {
      ok: false,
      message: "We couldn’t save that. Please try again in a moment.",
      fieldErrors: {},
    };
  }

  revalidatePath("/donate");

  return {
    ok: true,
    message:
      "Thank you. Your donation has been sent to the committee for confirmation.",
    fieldErrors: {},
  };
}
