import Link from "next/link";
import type { Metadata } from "next";
import { ShieldAlert } from "lucide-react";
import { buttonClasses } from "@/components/ui/button";
import { signOut } from "@/app/admin/actions";

export const metadata: Metadata = { title: "No access" };

export default function NoAccessPage() {
  return (
    <main className="grid min-h-dvh place-items-center bg-ink-100 px-5 text-center">
      <div className="card max-w-[24rem] px-6 py-8">
        <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-danger-50 text-danger-500">
          <ShieldAlert className="size-5" strokeWidth={2} aria-hidden />
        </span>

        <h1 className="mt-5 text-[1.125rem] font-bold tracking-[-0.025em] text-ink-900">
          Not authorised
        </h1>
        <p className="mt-2 text-[0.875rem] leading-relaxed text-ink-600">
          Your account is signed in but doesn&rsquo;t have committee editing
          rights. An admin can grant them in Supabase.
        </p>

        <div className="mt-6 space-y-2.5">
          <Link href="/" className={buttonClasses("primary", "md", "w-full")}>
            Back to the app
          </Link>
          <form action={signOut}>
            <button type="submit" className={buttonClasses("secondary", "md", "w-full")}>
              Sign out
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
