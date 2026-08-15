"use client";

import { useActionState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { saveResource } from "@/app/admin/actions";
import { EMPTY_ACTION_STATE, type ActionState } from "@/lib/form-state";
import {
  ResourceFormFields,
  type FieldOptions,
} from "@/components/admin/resource-fields";
import { Button } from "@/components/ui/button";
import type { Field } from "@/lib/admin/resources";

/** Create/edit form for one row of an admin-managed table. */
export function ResourceForm({
  resourceKey,
  fields,
  row,
  fieldOptions,
  onSaved,
}: {
  resourceKey: string;
  fields: Field[];
  /** `null` for a new record. */
  row: (Record<string, unknown> & { id?: string }) | null;
  fieldOptions?: FieldOptions;
  onSaved: () => void;
}) {
  const boundSave = saveResource.bind(null, resourceKey, row?.id ?? null);
  const [state, action, pending] = useActionState<ActionState, FormData>(
    boundSave,
    EMPTY_ACTION_STATE,
  );

  useEffect(() => {
    if (state.ok) onSaved();
  }, [state.ok, onSaved]);

  return (
    <form action={action} className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
        <div className="grid grid-cols-2 gap-4">
          <ResourceFormFields
            fields={fields}
            row={row}
            errors={state.fieldErrors}
            fieldOptions={fieldOptions}
          />
        </div>

        {state.message && !state.ok ? (
          <p
            role="alert"
            className="mt-5 rounded-tile bg-danger-50 px-3.5 py-3 text-[0.8125rem] text-danger-700"
          >
            {state.message}
          </p>
        ) : null}
      </div>

      <div className="flex gap-3 border-t border-hairline px-5 py-4">
        <Button
          type="button"
          variant="secondary"
          className="flex-1"
          onClick={onSaved}
          disabled={pending}
        >
          Cancel
        </Button>
        <Button type="submit" className="flex-1" disabled={pending}>
          {pending ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Saving…
            </>
          ) : row ? (
            "Save changes"
          ) : (
            "Add"
          )}
        </Button>
      </div>
    </form>
  );
}
