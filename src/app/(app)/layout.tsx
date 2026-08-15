import { BottomNavigation } from "@/components/layout/bottom-navigation";
import { SideNavigation } from "@/components/layout/side-navigation";
import { SetupBanner } from "@/components/ui/states";
import { isSupabaseConfigured } from "@/lib/supabase/env";

/**
 * Public app shell.
 *
 * Mobile: a single phone-width column with the fixed bottom navigation.
 * Desktop: the same column widened, with the nav promoted to a left rail —
 * a dashboard layout that reuses the mobile design language rather than
 * replacing it.
 */
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="min-h-dvh bg-ink-100">
      <SideNavigation />

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
    </div>
  );
}
