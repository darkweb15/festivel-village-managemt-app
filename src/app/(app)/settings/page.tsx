import type { Metadata } from "next";
import { Database, Info, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/layout/app-header";
import { InstallAppCard } from "@/components/install-app-card";
import { ListGroup, ListRow } from "@/components/ui/list-row";
import { LanguageSwitcherRow } from "@/components/language-switcher";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getDictionary } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getDictionary();
  return { title: t.settings.title };
}

export default async function SettingsPage() {
  const t = await getDictionary();

  return (
    <>
      <PageHeader title={t.settings.title} />

      <div className="space-y-6 px-5 py-5">
        <LanguageSwitcherRow />

        <InstallAppCard />

        <ListGroup title={t.settings.about}>
          <ListRow
            icon={Info}
            tone="neutral"
            label={t.brand.name}
            description={t.brand.festival}
            trailing={<span aria-hidden />}
          />
          <ListRow
            icon={Database}
            tone={isSupabaseConfigured ? "success" : "danger"}
            label={t.settings.database}
            description={
              isSupabaseConfigured ? t.settings.dbConnected : t.settings.dbNotConnected
            }
            href={isSupabaseConfigured ? undefined : "/setup"}
            trailing={isSupabaseConfigured ? <span aria-hidden /> : undefined}
          />
        </ListGroup>

        <ListGroup title={t.settings.committee}>
          <ListRow
            icon={ShieldCheck}
            tone="saffron"
            label={t.settings.adminSignIn}
            description={t.settings.adminSignInBody}
            href="/admin"
          />
        </ListGroup>

        <p className="px-1 text-center text-[0.6875rem] leading-relaxed text-ink-400">
          {t.settings.footer1}
          <br />
          {t.settings.footer2}
        </p>
      </div>
    </>
  );
}
