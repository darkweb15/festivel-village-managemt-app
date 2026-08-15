"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { deleteResource, setDonationStatus } from "@/app/admin/actions";
import { ResourceForm } from "@/components/admin/resource-form";
import type { FieldOptions } from "@/components/admin/resource-fields";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/states";
import type { Resource } from "@/lib/admin/resources";
import { cn, formatCurrency, formatFullDate, formatTime } from "@/lib/utils";

type Row = Record<string, unknown> & { id: string };

export function ResourceManager({
  resourceKey,
  resource,
  rows,
  fieldOptions,
}: {
  resourceKey: string;
  resource: Resource;
  rows: Row[];
  fieldOptions?: FieldOptions;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<Row | null | "new">(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const close = useCallback(() => setEditing(null), []);

  const onSaved = useCallback(() => {
    setEditing(null);
    router.refresh();
  }, [router]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 3000);
    return () => clearTimeout(timer);
  }, [notice]);

  function remove(id: string) {
    startTransition(async () => {
      const result = await deleteResource(resourceKey, id);
      setConfirming(null);
      setNotice(result.message);
      if (result.ok) router.refresh();
    });
  }

  function changeStatus(id: string, status: "verified" | "rejected" | "pending") {
    startTransition(async () => {
      const result = await setDonationStatus(id, status);
      setNotice(result.message);
      if (result.ok) router.refresh();
    });
  }

  return (
    <>
      <header className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-[1.375rem] font-bold tracking-[-0.03em] text-ink-900">
            {resource.title}
          </h1>
          <p className="mt-1 max-w-[38rem] text-[0.8125rem] leading-relaxed text-ink-500">
            {resource.description}
          </p>
        </div>
        <Button onClick={() => setEditing("new")}>
          <Plus className="size-4" strokeWidth={2.4} aria-hidden />
          Add {resource.singular.toLowerCase()}
        </Button>
      </header>

      {notice ? (
        <p
          role="status"
          className="mb-4 rounded-tile bg-success-50 px-3.5 py-2.5 text-[0.8125rem] font-medium text-success-700"
        >
          {notice}
        </p>
      ) : null}

      {rows.length === 0 ? (
        <EmptyState
          title={`No ${resource.title.toLowerCase()} yet`}
          description={`Add your first ${resource.singular.toLowerCase()} to publish it in the app.`}
          action={
            <Button onClick={() => setEditing("new")}>
              <Plus className="size-4" strokeWidth={2.4} aria-hidden />
              Add {resource.singular.toLowerCase()}
            </Button>
          }
        />
      ) : (
        <ul className={cn("card divide-y divide-hairline overflow-hidden", pending && "opacity-70")}>
          {rows.map((row) => (
            <li key={row.id} className="flex flex-wrap items-center gap-3 px-4 py-3.5">
              {resource.list.thumbnail ? (
                <Thumb src={row[resource.list.thumbnail] ?? row.url} />
              ) : null}

              <div className="min-w-0 flex-1">
                <p className="truncate text-[0.875rem] font-medium text-ink-900">
                  {String(row[resource.list.title] ?? "Untitled")}
                </p>
                <p className="mt-0.5 truncate text-[0.75rem] text-ink-400">
                  {(resource.list.meta ?? [])
                    .map((key) => display(key, row[key]))
                    .filter(Boolean)
                    .join(" · ") || "—"}
                </p>
              </div>

              {resource.list.badge ? (
                <StatusChip value={String(row[resource.list.badge] ?? "")} />
              ) : null}

              {resource.list.amount && row[resource.list.amount] != null ? (
                <p className="tabular shrink-0 text-[0.875rem] font-semibold text-ink-900">
                  {formatCurrency(Number(row[resource.list.amount]))}
                </p>
              ) : null}

              <div className="flex shrink-0 items-center gap-1.5">
                {resourceKey === "donations" && row.status === "pending" ? (
                  <>
                    <IconButton
                      label="Mark verified"
                      tone="success"
                      onClick={() => changeStatus(row.id, "verified")}
                    >
                      <Check className="size-4" strokeWidth={2.4} aria-hidden />
                    </IconButton>
                    <IconButton
                      label="Reject"
                      tone="danger"
                      onClick={() => changeStatus(row.id, "rejected")}
                    >
                      <X className="size-4" strokeWidth={2.4} aria-hidden />
                    </IconButton>
                  </>
                ) : null}

                <IconButton label="Edit" onClick={() => setEditing(row)}>
                  <Pencil className="size-4" strokeWidth={2} aria-hidden />
                </IconButton>

                {confirming === row.id ? (
                  <span className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => remove(row.id)}
                      className="press rounded-full bg-danger-500 px-3 py-1.5 text-[0.75rem] font-semibold text-white"
                    >
                      Delete
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirming(null)}
                      className="press rounded-full bg-ink-100 px-3 py-1.5 text-[0.75rem] font-semibold text-ink-600"
                    >
                      Cancel
                    </button>
                  </span>
                ) : (
                  <IconButton
                    label="Delete"
                    tone="danger"
                    onClick={() => setConfirming(row.id)}
                  >
                    <Trash2 className="size-4" strokeWidth={2} aria-hidden />
                  </IconButton>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {editing !== null ? (
        <Panel
          title={
            editing === "new"
              ? `Add ${resource.singular.toLowerCase()}`
              : `Edit ${resource.singular.toLowerCase()}`
          }
          onClose={close}
        >
          <ResourceForm
            resourceKey={resourceKey}
            fields={resource.fields}
            row={editing === "new" ? null : editing}
            fieldOptions={fieldOptions}
            onSaved={onSaved}
          />
        </Panel>
      ) : null}
    </>
  );
}

/* -------------------------------------------------------------------------- */

function Thumb({ src }: { src: unknown }) {
  const url = typeof src === "string" && /^https?:\/\//.test(src) ? src : null;
  return (
    <span className="relative size-10 shrink-0 overflow-hidden rounded-tile bg-ink-100 ring-1 ring-hairline">
      {url ? <Image src={url} alt="" fill sizes="40px" className="object-cover" /> : null}
    </span>
  );
}

const CHIP_TONES: Record<string, string> = {
  verified: "bg-success-50 text-success-700",
  pending: "bg-gold-100 text-gold-700",
  rejected: "bg-danger-50 text-danger-700",
};

function StatusChip({ value }: { value: string }) {
  if (!value) return null;
  return (
    <span
      className={cn(
        "shrink-0 rounded-full px-2.5 py-1 text-[0.625rem] font-semibold tracking-[0.04em] uppercase",
        CHIP_TONES[value] ?? "bg-ink-100 text-ink-500",
      )}
    >
      {value}
    </span>
  );
}

function IconButton({
  label,
  tone = "neutral",
  onClick,
  children,
}: {
  label: string;
  tone?: "neutral" | "danger" | "success";
  onClick: () => void;
  children: React.ReactNode;
}) {
  const tones = {
    neutral: "text-ink-500 hover:bg-ink-100 hover:text-ink-900",
    danger: "text-ink-400 hover:bg-danger-50 hover:text-danger-700",
    success: "text-ink-400 hover:bg-success-50 hover:text-success-700",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn("press grid size-8 place-items-center rounded-full transition-colors", tones[tone])}
    >
      {children}
    </button>
  );
}

/** Bottom sheet on mobile, right-hand drawer on desktop. */
function Panel({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex sm:justify-end">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="animate-fade absolute inset-0 bg-ink-900/40"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="animate-rise relative mt-auto flex max-h-[92dvh] w-full flex-col rounded-t-[1.5rem] bg-white sm:mt-0 sm:max-h-none sm:h-dvh sm:w-[30rem] sm:rounded-none"
      >
        <div className="flex items-center gap-3 border-b border-hairline px-5 py-4">
          <h2 className="min-w-0 flex-1 text-[1rem] font-semibold tracking-[-0.02em] text-ink-900">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="press grid size-9 place-items-center rounded-full text-ink-400 hover:bg-ink-100 hover:text-ink-900"
          >
            <X className="size-[1.1rem]" strokeWidth={2.2} aria-hidden />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/** Best-effort formatting of arbitrary column values for the list rows. */
function display(key: string, value: unknown): string {
  if (value == null || value === "") return "";
  const text = String(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return formatFullDate(text);
  if (/^\d{4}-\d{2}-\d{2}T/.test(text)) return formatFullDate(text);
  if (/^\d{2}:\d{2}(:\d{2})?$/.test(text)) return formatTime(text) ?? text;
  if (key.endsWith("_url")) return "link";
  return text;
}
