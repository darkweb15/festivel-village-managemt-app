import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ResourceManager } from "@/components/admin/resource-manager";
import { ErrorState } from "@/components/ui/states";
import { createDynamicClient } from "@/lib/supabase/server";
import { RESOURCES, isResourceKey } from "@/lib/admin/resources";

export const dynamic = "force-dynamic";

export async function generateMetadata(
  props: PageProps<"/admin/[resource]">,
): Promise<Metadata> {
  const { resource } = await props.params;
  if (!isResourceKey(resource)) return { title: "Admin" };
  return { title: `${RESOURCES[resource].title} · Admin` };
}

export default async function AdminResourcePage(
  props: PageProps<"/admin/[resource]">,
) {
  const { resource: key } = await props.params;
  if (!isResourceKey(key)) notFound();

  const resource = RESOURCES[key];
  const supabase = await createDynamicClient();

  let query = supabase.from(resource.table).select("*");
  for (const { column, ascending } of resource.order) {
    query = query.order(column, { ascending, nullsFirst: false });
  }

  const { data, error } = await query.limit(500);

  if (error) return <ErrorState message={error.message} />;

  // Load the option lists for any `reference` fields so the form can render a
  // real picker instead of asking an admin to paste a UUID.
  const fieldOptions: Record<string, { value: string; label: string }[]> = {};
  for (const field of resource.fields) {
    if (field.type !== "reference" || !field.reference) continue;

    let refQuery = supabase
      .from(field.reference.table)
      .select(["id", ...field.reference.labelColumns].join(","))
      .order(field.reference.orderBy, { ascending: true })
      .limit(300);

    for (const [column, value] of Object.entries(field.reference.filter ?? {})) {
      refQuery = refQuery.eq(column, value);
    }

    const { data: refRows } = await refQuery;
    const labelColumns = field.reference.labelColumns;
    fieldOptions[field.name] = ((refRows ?? []) as unknown as Record<string, unknown>[]).map(
      (row) => ({
        value: String(row.id),
        label:
          labelColumns
            .map((c) => row[c])
            .filter(Boolean)
            .join(" · ") || String(row.id),
      }),
    );
  }

  return (
    <ResourceManager
      resourceKey={key}
      resource={resource}
      rows={(data ?? []) as unknown as (Record<string, unknown> & { id: string })[]}
      fieldOptions={fieldOptions}
    />
  );
}
