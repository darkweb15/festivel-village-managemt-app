import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { CommitteeEmblem } from "@/components/brand/committee-emblem";
import { ForgotPasswordForm } from "@/components/admin/forgot-password-form";
import { APP } from "@/lib/constants";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const metadata: Metadata = { title: "Reset password" };

export default function ForgotPasswordPage() {
  return (
    <main className="grid min-h-dvh place-items-center bg-ink-100 px-5 py-10">
      <div className="w-full max-w-[24rem]">
        <div className="mb-7 text-center">
          <CommitteeEmblem className="mx-auto w-32 sm:w-36" priority />
          <h1 className="mt-5 text-[1.25rem] font-bold tracking-[-0.03em] text-ink-900">
            Reset your password
          </h1>
          <p className="mt-1.5 text-[0.8125rem] text-ink-500">{APP.name}</p>
        </div>

        {isSupabaseConfigured ? (
          <ForgotPasswordForm />
        ) : (
          <div className="card px-5 py-6 text-center">
            <p className="text-[0.9375rem] font-semibold text-ink-900">
              Database not connected
            </p>
            <p className="mt-2 text-[0.8125rem] leading-relaxed text-ink-600">
              Add your Supabase keys to <code className="font-mono">.env.local</code>{" "}
              first.
            </p>
          </div>
        )}

        <Link
          href="/admin/login"
          className="mt-6 flex items-center justify-center gap-1.5 text-[0.8125rem] font-medium text-ink-500 hover:text-ink-800"
        >
          <ArrowLeft className="size-3.5" strokeWidth={2.2} aria-hidden />
          Back to sign in
        </Link>
      </div>
    </main>
  );
}
