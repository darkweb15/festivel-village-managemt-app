"use client";

import Image from "next/image";
import { useId, useState } from "react";
import { ImagePlus, Loader2, Trash2, Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Field } from "@/lib/admin/resources";
import { cn } from "@/lib/utils";

/** Options for `reference` fields, keyed by field name. Loaded server-side. */
export type FieldOptions = Record<string, { value: string; label: string }[]>;

/** Renders a list of fields into the admin form's two-column grid. */
export function ResourceFormFields({
  fields,
  row,
  errors,
  fieldOptions,
}: {
  fields: Field[];
  row: Record<string, unknown> | null;
  errors: Record<string, string>;
  fieldOptions?: FieldOptions;
}) {
  return (
    <>
      {fields.map((field) => (
        <FieldInput
          key={field.name}
          field={field}
          defaultValue={row?.[field.name]}
          error={errors[field.name]}
          options={fieldOptions?.[field.name]}
        />
      ))}
    </>
  );
}

function FieldInput({
  field,
  defaultValue,
  error,
  options,
}: {
  field: Field;
  defaultValue: unknown;
  error?: string;
  options?: { value: string; label: string }[];
}) {
  const id = useId();
  const describedBy = error ? `${id}-error` : field.hint ? `${id}-hint` : undefined;
  const span = field.full || field.type === "textarea" ? "col-span-2" : "col-span-1";

  const initial =
    defaultValue ?? (field.default as string | number | boolean | undefined) ?? "";

  const base = cn(
    "w-full rounded-tile border bg-white px-3.5 text-[0.875rem] text-ink-900 transition-colors",
    "placeholder:text-ink-300 focus:border-saffron-500 focus:outline-none",
    error ? "border-danger-500" : "border-ink-200",
  );

  if (field.type === "checkbox") {
    return (
      <div className={span}>
        <label className="flex items-start gap-3 rounded-tile bg-ink-50 px-3.5 py-3">
          <input
            type="checkbox"
            name={field.name}
            defaultChecked={Boolean(initial)}
            className="mt-0.5 size-4 shrink-0 accent-saffron-600"
          />
          <span>
            <span className="block text-[0.8125rem] font-medium text-ink-900">
              {field.label}
            </span>
            {field.hint ? (
              <span className="mt-0.5 block text-[0.6875rem] text-ink-400">
                {field.hint}
              </span>
            ) : null}
          </span>
        </label>
      </div>
    );
  }

  return (
    <div className={span}>
      <label
        htmlFor={id}
        className="mb-1.5 block text-[0.8125rem] font-medium text-ink-700"
      >
        {field.label}
        {field.required ? (
          <span className="ml-0.5 text-saffron-600" aria-hidden>
            *
          </span>
        ) : null}
      </label>

      {field.type === "textarea" ? (
        <textarea
          id={id}
          name={field.name}
          rows={4}
          defaultValue={String(initial)}
          placeholder={field.placeholder}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(base, "resize-y py-3 leading-relaxed")}
        />
      ) : field.type === "select" || field.type === "reference" ? (
        <select
          id={id}
          name={field.name}
          defaultValue={String(initial)}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(base, "h-11 appearance-none")}
        >
          {!field.required ? <option value="">—</option> : null}
          {(field.type === "reference" ? (options ?? []) : (field.options ?? [])).map(
            (option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ),
          )}
        </select>
      ) : field.type === "image" ? (
        <ImageField
          id={id}
          field={field}
          initial={typeof initial === "string" ? initial : ""}
          invalid={Boolean(error)}
        />
      ) : (
        <input
          id={id}
          name={field.name}
          type={inputType(field)}
          step={field.type === "currency" ? "0.01" : undefined}
          inputMode={field.type === "currency" ? "decimal" : undefined}
          defaultValue={normalise(field, initial)}
          placeholder={field.placeholder}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(base, "h-11")}
        />
      )}

      {error ? (
        <p
          id={`${id}-error`}
          role="alert"
          className="mt-1.5 text-[0.75rem] text-danger-700"
        >
          {error}
        </p>
      ) : field.hint ? (
        <p id={`${id}-hint`} className="mt-1.5 text-[0.75rem] text-ink-400">
          {field.hint}
        </p>
      ) : null}
    </div>
  );
}

function inputType(field: Field) {
  switch (field.type) {
    case "date":
      return "date";
    case "time":
      return "time";
    case "datetime":
      return "datetime-local";
    case "number":
    case "currency":
      return "number";
    case "url":
      return "url";
    default:
      return "text";
  }
}

/**
 * Reshapes stored values for the matching input:
 *  - Postgres `time` arrives as "19:00:00"; `<input type=time>` wants "19:00".
 *  - `timestamptz` arrives as ISO/UTC; `datetime-local` wants local "YYYY-MM-DDTHH:mm".
 */
function normalise(field: Field, value: unknown) {
  const text = String(value ?? "");
  if (!text) return "";

  if (field.type === "time" && /^\d{2}:\d{2}:\d{2}/.test(text)) return text.slice(0, 5);

  if (field.type === "datetime") {
    const d = new Date(text);
    if (Number.isNaN(d.getTime())) return "";
    const pad = (n: number) => String(n).padStart(2, "0");
    return (
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
      `T${pad(d.getHours())}:${pad(d.getMinutes())}`
    );
  }

  return text;
}

/* -------------------------------------------------------------------------- */

function ImageField({
  id,
  field,
  initial,
  invalid,
}: {
  id: string;
  field: Field;
  initial: string;
  invalid: boolean;
}) {
  const [value, setValue] = useState(initial);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function upload(file: File) {
    setUploading(true);
    setUploadError(null);
    try {
      const supabase = createClient();
      const bucket = field.bucket ?? "gallery";
      const extension = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
      const path = `${crypto.randomUUID()}.${extension}`;

      const { error } = await supabase.storage
        .from(bucket)
        .upload(path, file, { cacheControl: "31536000", upsert: false });

      if (error) throw error;

      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      setValue(data.publicUrl);
    } catch (error) {
      setUploadError(
        error instanceof Error ? error.message : "Upload failed. Please try again.",
      );
    } finally {
      setUploading(false);
    }
  }

  const isPreviewable =
    /^https?:\/\//.test(value) && !/youtube|youtu\.be|vimeo|facebook/.test(value);

  return (
    <div className="space-y-2.5">
      <input type="hidden" name={field.name} value={value} />

      <div className="flex items-start gap-3">
        <span className="relative grid size-16 shrink-0 place-items-center overflow-hidden rounded-tile bg-ink-100 ring-1 ring-hairline">
          {isPreviewable ? (
            <Image src={value} alt="" fill sizes="64px" className="object-cover" />
          ) : (
            <ImagePlus className="size-5 text-ink-400" strokeWidth={1.8} aria-hidden />
          )}
        </span>

        <div className="min-w-0 flex-1 space-y-2">
          <input
            id={id}
            type="url"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder="https://… or upload a file"
            aria-invalid={invalid ? true : undefined}
            className={cn(
              "h-11 w-full rounded-tile border bg-white px-3.5 text-[0.875rem] text-ink-900 placeholder:text-ink-300 focus:border-saffron-500 focus:outline-none",
              invalid ? "border-danger-500" : "border-ink-200",
            )}
          />

          <div className="flex flex-wrap gap-2">
            <label
              className={cn(
                "press inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-ink-100 px-3 py-1.5 text-[0.75rem] font-semibold text-ink-700 hover:bg-ink-200",
                uploading && "pointer-events-none opacity-60",
              )}
            >
              {uploading ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
              ) : (
                <Upload className="size-3.5" strokeWidth={2.2} aria-hidden />
              )}
              {uploading ? "Uploading…" : "Upload"}
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void upload(file);
                  event.target.value = "";
                }}
              />
            </label>

            {value ? (
              <button
                type="button"
                onClick={() => setValue("")}
                className="press inline-flex items-center gap-1.5 rounded-full bg-ink-100 px-3 py-1.5 text-[0.75rem] font-semibold text-ink-600 hover:bg-danger-50 hover:text-danger-700"
              >
                <Trash2 className="size-3.5" strokeWidth={2.2} aria-hidden />
                Clear
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {uploadError ? (
        <p role="alert" className="text-[0.75rem] text-danger-700">
          {uploadError}
        </p>
      ) : null}
    </div>
  );
}
