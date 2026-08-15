import type { Metadata } from "next";
import { Database, Info, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/layout/app-header";
import { InstallAppCard } from "@/components/install-app-card";
import { ListGroup, ListRow } from "@/components/ui/list-row";
import { APP } from "@/lib/constants";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="Settings" />

      <div className="space-y-6 px-5 py-5">
        <InstallAppCard />

        <ListGroup title="About">
          <ListRow
            icon={Info}
            tone="neutral"
            label={APP.name}
            description={APP.festival}
            trailing={<span aria-hidden />}
          />
          <ListRow
            icon={Database}
            tone={isSupabaseConfigured ? "success" : "danger"}
            label="Database"
            description={
              isSupabaseConfigured
                ? "Connected to Supabase"
                : "Not connected — see the setup guide"
            }
            href={isSupabaseConfigured ? undefined : "/setup"}
            trailing={isSupabaseConfigured ? <span aria-hidden /> : undefined}
          />
        </ListGroup>

        <ListGroup title="Committee">
          <ListRow
            icon={ShieldCheck}
            tone="saffron"
            label="Admin sign in"
            description="Manage events, donations and content"
            href="/admin"
          />
        </ListGroup>

        <p className="px-1 text-center text-[0.6875rem] leading-relaxed text-ink-400">
          Built for the village community.
          <br />
          Content is managed by the committee.
        </p>
      </div>
    </>
  );
}
