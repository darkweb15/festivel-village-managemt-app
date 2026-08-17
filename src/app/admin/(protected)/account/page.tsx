import { cookies } from "next/headers";
import type { Metadata } from "next";
import { KeyRound, ShieldCheck } from "lucide-react";
import { ChangePasswordForm } from "@/components/admin/change-password-form";
import { getCurrentAppUser } from "@/lib/supabase/server";
import { RECOVERY_COOKIE } from "@/lib/auth/recovery";

export const metadata: Metadata = { title: "My account" };

/**
 * The signed-in member's own account screen.
 *
 * The surrounding (protected) layout has already established that there is a
 * session and that the role is admin or editor, so this only has to render.
 */
export default async function AccountPage() {
  const user = await getCurrentAppUser();
  const cookieStore = await cookies();

  // Trust the httpOnly cookie set by /auth/confirm, not the ?recovery=1 in the
  // URL — the query string is caller-controlled and proves nothing.
  const viaRecovery = cookieStore.get(RECOVERY_COOKIE)?.value === "1";

  return (
    <div className="mx-auto max-w-[34rem]">
      <header className="mb-6">
        <h1 className="text-[1.375rem] font-bold tracking-[-0.03em] text-ink-900">
          My account
        </h1>
        <p className="mt-1.5 text-[0.875rem] text-ink-500">
          Your sign-in details for the committee admin panel.
        </p>
      </header>

      <div className="card mb-5 divide-y divide-hairline">
        <Row label="Email" value={user?.email ?? "—"} />
        <Row label="Role" value={user?.role ?? "—"} capitalize />
        <Row
          label="Status"
          value={user?.is_active ? "Active" : "Inactive"}
          capitalize
        />
      </div>

      <div className="mb-5 flex gap-3 rounded-tile bg-ink-50 p-3.5">
        <ShieldCheck
          className="mt-px size-[1.15rem] shrink-0 text-ink-400"
          strokeWidth={2}
          aria-hidden
        />
        <p className="text-[0.75rem] leading-relaxed text-ink-600">
          Your role is managed separately by an admin and is not affected by
          changing your password. Only an admin can change who has access.
        </p>
      </div>

      <section>
        <h2 className="mb-3 flex items-center gap-2 text-[0.9375rem] font-semibold text-ink-900">
          <KeyRound className="size-4 text-ink-400" strokeWidth={2.2} aria-hidden />
          Change password
        </h2>
        <ChangePasswordForm viaRecovery={viaRecovery} />
      </section>
    </div>
  );
}

function Row({
  label,
  value,
  capitalize,
}: {
  label: string;
  value: string;
  capitalize?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3.5">
      <span className="text-[0.8125rem] font-medium text-ink-500">{label}</span>
      <span
        className={`truncate text-[0.875rem] font-medium text-ink-900 ${
          capitalize ? "capitalize" : ""
        }`}
      >
        {value}
      </span>
    </div>
  );
}
