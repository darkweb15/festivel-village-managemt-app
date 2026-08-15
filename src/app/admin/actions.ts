"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createClient,
  createClientOrNull,
  createDynamicClient,
  requireEditor,
} from "@/lib/supabase/server";
import {
  RESOURCES,
  SETTINGS_SECTIONS,
  isResourceKey,
  type Field,
  type ResourceKey,
} from "@/lib/admin/resources";
import type { ActionState } from "@/lib/form-state";

function fail(message: string, fieldErrors: Record<string, string> = {}): ActionState {
  return { ok: false, message, fieldErrors };
}

/**
 * Coerces one submitted value according to its declared type.
 * Returns `undefined` when the field should be omitted from the write.
 */
function coerce(
  field: Field,
  formData: FormData,
): { value: unknown } | { error: string } | null {
  if (field.type === "checkbox") {
    return { value: formData.get(field.name) === "on" };
  }

  const raw = formData.get(field.name);
  const text = typeof raw === "string" ? raw.trim() : "";

  if (text === "") {
    if (field.required) return { error: `${field.label} is required.` };
    // Empty optional field clears the column.
    return { value: null };
  }

  switch (field.type) {
    case "number":
    case "currency": {
      const num = Number(text.replace(/,/g, ""));
      if (!Number.isFinite(num)) return { error: `${field.label} must be a number.` };
      if (field.type === "currency" && num < 0) {
        return { error: `${field.label} cannot be negative.` };
      }
      return { value: num };
    }
    case "url":
    case "image": {
      if (field.type === "url" && !/^https?:\/\//i.test(text)) {
        return { error: "Enter a full link starting with https://" };
      }
      return { value: text };
    }
    case "select": {
      const allowed = field.options?.map((option) => option.value) ?? [];
      if (allowed.length > 0 && !allowed.includes(text)) {
        return { error: `Choose a valid ${field.label.toLowerCase()}.` };
      }
      return { value: text };
    }
    case "datetime": {
      // <input type="datetime-local"> submits "2026-08-24T09:00" with no zone;
      // treat it as the browser's local time, which is what the admin typed.
      const parsed = new Date(text);
      if (Number.isNaN(parsed.getTime())) {
        return { error: `${field.label} is not a valid date and time.` };
      }
      return { value: parsed.toISOString() };
    }
    case "reference": {
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(text)) {
        return { error: `Choose a valid ${field.label.toLowerCase()}.` };
      }
      return { value: text };
    }
    default:
      return { value: text };
  }
}

/** Creates or updates one row of an admin-managed table. */
export async function saveResource(
  key: string,
  id: string | null,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!isResourceKey(key)) return fail("Unknown section.");

  const editor = await requireEditor();
  if (!editor) return fail("You don’t have permission to make this change.");

  const resource = RESOURCES[key as ResourceKey];
  const values: Record<string, unknown> = {};
  const fieldErrors: Record<string, string> = {};

  for (const field of resource.fields) {
    const result = coerce(field, formData);
    if (!result) continue;
    if ("error" in result) fieldErrors[field.name] = result.error;
    else values[field.name] = result.value;
  }

  if (Object.keys(fieldErrors).length > 0) {
    return fail("Please check the highlighted fields.", fieldErrors);
  }

  const supabase = await createDynamicClient();

  const { error } = id
    ? await supabase.from(resource.table).update(values).eq("id", id)
    : await supabase.from(resource.table).insert(values);

  if (error) {
    return fail(
      error.code === "42501"
        ? "You don’t have permission to make this change."
        : error.message,
    );
  }

  revalidatePath(`/admin/${key}`);
  revalidatePath("/admin");
  revalidatePath("/", "layout");

  return {
    ok: true,
    message: id ? `${resource.singular} updated.` : `${resource.singular} added.`,
    fieldErrors: {},
  };
}

export async function deleteResource(key: string, id: string): Promise<ActionState> {
  if (!isResourceKey(key)) return fail("Unknown section.");

  const editor = await requireEditor();
  if (!editor) return fail("You don’t have permission to make this change.");

  const resource = RESOURCES[key as ResourceKey];
  const supabase = await createDynamicClient();
  const { error } = await supabase.from(resource.table).delete().eq("id", id);

  if (error) return fail(error.message);

  revalidatePath(`/admin/${key}`);
  revalidatePath("/admin");
  revalidatePath("/", "layout");

  return { ok: true, message: `${resource.singular} deleted.`, fieldErrors: {} };
}

/**
 * Fast path for the donations queue: confirm or reject without opening the
 * full editor. The database trigger stamps who verified it and when.
 */
export async function setDonationStatus(
  id: string,
  status: "pending" | "verified" | "rejected",
): Promise<ActionState> {
  const editor = await requireEditor();
  if (!editor) return fail("You don’t have permission to make this change.");

  const supabase = await createClient();
  const { error } = await supabase.from("donations").update({ status }).eq("id", id);

  if (error) return fail(error.message);

  revalidatePath("/admin/donations");
  revalidatePath("/admin");
  revalidatePath("/", "layout");

  return { ok: true, message: `Donation marked ${status}.`, fieldErrors: {} };
}

/** Saves the single festival_settings row. */
export async function saveSettings(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const editor = await requireEditor();
  if (!editor) return fail("You don’t have permission to make this change.");

  const values: Record<string, unknown> = {};
  const fieldErrors: Record<string, string> = {};

  for (const section of SETTINGS_SECTIONS) {
    for (const field of section.fields) {
      const result = coerce(field, formData);
      if (!result) continue;
      if ("error" in result) fieldErrors[field.name] = result.error;
      else values[field.name] = result.value;
    }
  }

  if (Object.keys(fieldErrors).length > 0) {
    return fail("Please check the highlighted fields.", fieldErrors);
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("festival_settings")
    .upsert({ id: true, ...values }, { onConflict: "id" });

  if (error) return fail(error.message);

  revalidatePath("/admin/settings");
  revalidatePath("/", "layout");

  return { ok: true, message: "Festival settings saved.", fieldErrors: {} };
}

export async function signOut() {
  const supabase = await createClientOrNull();
  await supabase?.auth.signOut();
  redirect("/admin/login");
}
