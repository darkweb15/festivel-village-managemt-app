import { DeepLinkFocus } from "@/components/deep-link-focus";
import { BottomNavigation } from "@/components/layout/bottom-navigation";
import { SideNavigation } from "@/components/layout/side-navigation";
import { SetupBanner } from "@/components/ui/states";
import { getNotificationDigest } from "@/lib/data/queries";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { I18nProvider } from "@/lib/i18n/client";
import { LOCALE_HTML_LANG } from "@/lib/i18n/config";
import { getI18n } from "@/lib/i18n/server";

/**
 * Public app shell.
 *
 * Mobile: a single phone-width column with the fixed bottom navigation.
 * Desktop: the same column widened, with the nav promoted to a left rail —
 * a dashboard layout that reuses the mobile design language rather than
 * replacing it.
 *
 * This is also where the language is resolved: the cookie is read once here and
 * the dictionary handed to both the server tree and the client provider, so
 * every public screen renders in one language on the first paint.
 */
export default async function AppLayout({ children }: LayoutProps<"/">) {
  const { locale, t } = await getI18n();

  // Ids and timestamps only, cached per request — the rail badges the count,
  // Home's bell reuses the same result rather than asking again.
  const digest = await getNotificationDigest();

  return (
    <I18nProvider locale={locale} dictionary={t}>
      {/* Scopes the language to the public app; /admin stays English. */}
      <div className="min-h-dvh bg-ink-100" lang={LOCALE_HTML_LANG[locale]}>
        <SideNavigation digest={digest.data} />

        <div className="md:pl-64 lg:pl-72">
          {/* The extra inline padding on larger screens sits on top of each
              screen's own px-5, so one change relaxes the whole app on desktop. */}
          <div className="app-shell md:max-w-[48rem] md:border-x md:border-hairline md:px-3 lg:max-w-[64rem] lg:px-8">
            {isSupabaseConfigured ? null : <SetupBanner />}
            <main
              id="main"
              className="pb-[calc(var(--nav-height)+var(--safe-bottom)+1.5rem)] md:pb-16"
            >
              {children}
            </main>
          </div>
        </div>

        <BottomNavigation />

        {/* Lands `#pooja-<id>` deep links on the row they name, once it renders. */}
        <DeepLinkFocus />
      </div>
    </I18nProvider>
  );
}
