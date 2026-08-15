"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";
import { saveSettings } from "@/app/admin/actions";
import { EMPTY_ACTION_STATE, type ActionState } from "@/lib/form-state";
import { ResourceFormFields } from "@/components/admin/resource-fields";
import { Button } from "@/components/ui/button";
import { SETTINGS_SECTIONS } from "@/lib/admin/resources";

export function SettingsForm({ settings }: { settings: Record<string, unknown> | null }) {
  const router = useRouter();
  const [state, action, pending] = useActionState<ActionState, FormData>(
    saveSettings,
    EMPTY_ACTION_STATE,
  );

  useEffect(() => {
    if (state.ok) router.refresh();
  }, [state.ok, router]);

  return (
    <form action={action} className="space-y-4">
      {SETTINGS_SECTIONS.map((section) => (
        <section key={section.title} className="card px-5 py-5">
          <h2 className="mb-4 text-[0.9375rem] font-semibold tracking-[-0.015em] text-ink-900">
            {section.title}
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <ResourceFormFields
              fields={section.fields}
              row={settings}
              errors={state.fieldErrors}
            />
          </div>
        </section>
      ))}

      {state.message ? (
        <p
          role="status"
          className={
            state.ok
              ? "flex items-center gap-2 rounded-tile bg-success-50 px-3.5 py-3 text-[0.8125rem] font-medium text-success-700"
              : "rounded-tile bg-danger-50 px-3.5 py-3 text-[0.8125rem] text-danger-700"
          }
        >
          {state.ok ? (
            <CheckCircle2 className="size-4 shrink-0" strokeWidth={2.2} aria-hidden />
          ) : null}
          {state.message}
        </p>
      ) : null}

      <div className="sticky bottom-0 -mx-4 border-t border-hairline bg-white/90 px-4 py-4 backdrop-blur-xl sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={pending}>
          {pending ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Saving…
            </>
          ) : (
            "Save settings"
          )}
        </Button>
      </div>
    </form>
  );
}
