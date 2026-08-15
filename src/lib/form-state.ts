/**
 * Shared `useActionState` shapes for every server action in the app.
 *
 * These live outside the `"use server"` modules because such modules may only
 * export async functions.
 */

export type ActionState = {
  ok: boolean;
  message: string;
  fieldErrors: Record<string, string>;
};

export const EMPTY_ACTION_STATE: ActionState = {
  ok: false,
  message: "",
  fieldErrors: {},
};

export type LoginState = { message: string };

export const EMPTY_LOGIN_STATE: LoginState = { message: "" };

export type DonationFormState = {
  ok: boolean;
  message: string;
  fieldErrors: Partial<Record<"donor_name" | "amount" | "transaction_ref", string>>;
};

export const EMPTY_DONATION_STATE: DonationFormState = {
  ok: false,
  message: "",
  fieldErrors: {},
};

/** Result of the couple-pooja booking action, mirroring book_pooja_slot(). */
export type BookingFormState = {
  status: "idle" | "error" | "confirmed";
  message: string;
  /** Machine-readable failure reason from the database function. */
  code?: string;
  fieldErrors: Partial<
    Record<"partner1_name" | "partner2_name" | "phone" | "email" | "gotram", string>
  >;
  booking?: {
    booking_ref: string;
    pooja_title: string;
    pooja_date: string;
    start_time: string;
    partner1_name: string;
    partner2_name: string | null;
    status: string;
    available_after: number;
  };
};

export const EMPTY_BOOKING_STATE: BookingFormState = {
  status: "idle",
  message: "",
  fieldErrors: {},
};

/** Result of looking up or cancelling an existing booking. */
export type BookingLookupState = {
  status: "idle" | "error" | "found" | "cancelled";
  message: string;
  booking?: {
    booking_ref: string;
    status: string;
    partner1_name: string;
    partner2_name: string | null;
    gotram: string | null;
    pooja_title: string;
    pooja_date: string;
    start_time: string;
    end_time: string | null;
    special_instructions: string | null;
  };
};

export const EMPTY_LOOKUP_STATE: BookingLookupState = {
  status: "idle",
  message: "",
};
