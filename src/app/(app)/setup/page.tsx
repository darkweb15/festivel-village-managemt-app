import type { Metadata } from "next";
import { CheckCircle2, Circle } from "lucide-react";
import { PageHeader } from "@/components/layout/app-header";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const metadata: Metadata = { title: "Setup guide" };

const STEPS = [
  {
    title: "Create a Supabase project",
    body: "Go to supabase.com, create a free project, and open Project Settings → API.",
  },
  {
    title: "Add the keys to .env.local",
    body: "Copy .env.example to .env.local, then paste in NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY. Restart the dev server afterwards.",
    code: "cp .env.example .env.local",
  },
  {
    title: "Run the migrations",
    body: "In the Supabase SQL editor, run supabase/migrations/20260101000000_init.sql, then 20260101000100_rls.sql. Optionally run supabase/seed.sql to create the settings row.",
  },
  {
    title: "Create your admin account",
    body: "In Supabase → Authentication → Users, add a user with an email and password. That is the login for /admin.",
  },
  {
    title: "Promote that user to admin",
    body: "In the SQL editor, run the statement below with your email. Roles are never assigned from the app itself.",
    code: "update public.users set role = 'admin' where email = 'you@example.com';",
  },
];

export default function SetupPage() {
  return (
    <>
      <PageHeader title="Setup guide" backHref="/settings" />

      <div className="space-y-5 px-5 py-5">
        <div
          className={`card flex items-center gap-3.5 px-4 py-4 ${
            isSupabaseConfigured ? "" : "border-saffron-300"
          }`}
        >
          <span
            className={`grid size-10 shrink-0 place-items-center rounded-[0.875rem] ${
              isSupabaseConfigured
                ? "bg-success-50 text-success-700"
                : "bg-saffron-50 text-saffron-600"
            }`}
          >
            {isSupabaseConfigured ? (
              <CheckCircle2 className="size-[1.1rem]" strokeWidth={2} aria-hidden />
            ) : (
              <Circle className="size-[1.1rem]" strokeWidth={2} aria-hidden />
            )}
          </span>
          <p className="text-[0.875rem] font-medium text-ink-900">
            {isSupabaseConfigured
              ? "Supabase keys detected"
              : "Supabase keys not detected yet"}
          </p>
        </div>

        <ol className="space-y-3">
          {STEPS.map((step, index) => (
            <li key={step.title} className="card px-4 py-4">
              <div className="flex gap-3.5">
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-ink-100 text-[0.75rem] font-bold text-ink-600">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="text-[0.9375rem] font-semibold text-ink-900">
                    {step.title}
                  </h2>
                  <p className="mt-1 text-[0.8125rem] leading-relaxed text-ink-600">
                    {step.body}
                  </p>
                  {step.code ? (
                    <pre className="mt-3 overflow-x-auto rounded-tile bg-ink-900 px-3.5 py-3 text-[0.75rem] leading-relaxed text-ink-100">
                      <code>{step.code}</code>
                    </pre>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ol>

        <p className="px-1 text-[0.75rem] leading-relaxed text-ink-400">
          The service role key is never needed by this app and must not be added
          to any environment file here — every write goes through a signed-in
          committee member and Row Level Security.
        </p>
      </div>
    </>
  );
}
