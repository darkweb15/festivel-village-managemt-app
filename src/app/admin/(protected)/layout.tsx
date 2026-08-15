import { redirect } from "next/navigation";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { getCurrentAppUser } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

/**
 * Server-side authorisation gate for the whole admin area.
 *
 * Middleware already bounces anonymous visitors, but this re-checks the role on
 * every render so a signed-in `viewer` can never reach an editor screen. The
 * database's RLS policies remain the actual enforcement point for writes.
 */
export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  if (!isSupabaseConfigured) redirect("/setup");

  const user = await getCurrentAppUser();

  if (!user) redirect("/admin/login");
  if (!user.is_active || (user.role !== "admin" && user.role !== "editor")) {
    redirect("/admin/no-access");
  }

  return (
    <div className="min-h-dvh bg-ink-100">
      <AdminSidebar email={user.email} />
      <div className="lg:pl-[17rem]">
        <main id="main" className="mx-auto max-w-[72rem] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
