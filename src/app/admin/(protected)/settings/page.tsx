import type { Metadata } from "next";
import { SettingsForm } from "@/components/admin/settings-form";
import { ErrorState } from "@/components/ui/states";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Festival Settings" };
export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("festival_settings")
    .select("*")
    .limit(1)
    .maybeSingle();

  if (error) return <ErrorState message={error.message} />;

  return (
    <>
      <header className="mb-5">
        <h1 className="text-[1.375rem] font-bold tracking-[-0.03em] text-ink-900">
          Festival Settings
        </h1>
        <p className="mt-1 max-w-[38rem] text-[0.8125rem] leading-relaxed text-ink-500">
          These values drive the Home hero, donation goal, UPI details, location
          and nimajjanam information across the public app.
        </p>
      </header>

      <SettingsForm settings={data as Record<string, unknown> | null} />
    </>
  );
}
