import Link from "next/link";
import { Suspense } from "react";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { GaneshaMark } from "@/components/brand/ganesha-mark";
import { LoginForm } from "@/components/admin/login-form";
import { APP } from "@/lib/constants";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const metadata: Metadata = { title: "Admin sign in" };

export default async function LoginPage(props: PageProps<"/admin/login">) {
  const params = await props.searchParams;
  const raw = params.next;
  const next = Array.isArray(raw) ? raw[0] : raw;

  return (
    <main className="grid min-h-dvh place-items-center bg-ink-100 px-5 py-10">
      <div className="w-full max-w-[24rem]">
        <div className="mb-7 text-center">
          <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-saffron-600 text-white shadow-[0_10px_24px_-10px_rgba(234,83,8,0.8)]">
            <GaneshaMark className="size-8" strokeWidth={2} />
          </span>
          <h1 className="mt-5 text-[1.25rem] font-bold tracking-[-0.03em] text-ink-900">
            Committee Admin
          </h1>
          <p className="mt-1.5 text-[0.8125rem] text-ink-500">{APP.name}</p>
        </div>

        {isSupabaseConfigured ? (
          <Suspense fallback={<div className="card h-80" />}>
            <LoginForm next={next ?? "/admin"} />
          </Suspense>
        ) : (
          <div className="card px-5 py-6 text-center">
            <p className="text-[0.9375rem] font-semibold text-ink-900">
              Database not connected
            </p>
            <p className="mt-2 text-[0.8125rem] leading-relaxed text-ink-600">
              Add your Supabase keys to <code className="font-mono">.env.local</code>{" "}
              before signing in.
            </p>
            <Link
              href="/setup"
              className="mt-4 inline-block text-[0.8125rem] font-semibold text-saffron-700 underline underline-offset-4"
            >
              Open the setup guide
            </Link>
          </div>
        )}

        <Link
          href="/"
          className="mt-6 flex items-center justify-center gap-1.5 text-[0.8125rem] font-medium text-ink-500 hover:text-ink-800"
        >
          <ArrowLeft className="size-3.5" strokeWidth={2.2} aria-hidden />
          Back to the app
        </Link>
      </div>
    </main>
  );
}
