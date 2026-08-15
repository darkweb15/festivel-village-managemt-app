import type { Metadata } from "next";
import { Bot, Check, ShieldCheck, X } from "lucide-react";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { createClient } from "@/lib/supabase/server";
import { toolPastPhrase } from "@/lib/ai/labels";
import { cn } from "@/lib/utils";
import type { AiActionLog } from "@/lib/supabase/types";

export const metadata: Metadata = { title: "AI Activity" };
export const dynamic = "force-dynamic";

function timeOf(iso: string) {
  return new Intl.DateTimeFormat("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  }).format(new Date(iso));
}

function dayOf(iso: string) {
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Asia/Kolkata",
  }).format(new Date(iso));
}

export default async function AiActivityPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ai_action_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) return <ErrorState message={error.message} />;

  const logs = (data ?? []) as AiActionLog[];

  const byDay = new Map<string, AiActionLog[]>();
  for (const log of logs) {
    const day = dayOf(log.created_at);
    const bucket = byDay.get(day) ?? [];
    bucket.push(log);
    byDay.set(day, bucket);
  }

  return (
    <>
      <header className="mb-5">
        <h1 className="text-[1.375rem] font-bold tracking-[-0.03em] text-ink-900">
          AI Activity
        </h1>
        <p className="mt-1 max-w-[42rem] text-[0.8125rem] leading-relaxed text-ink-500">
          Every tool the assistant and copilot have run, with what happened.
          Personal details in the arguments are redacted before they are stored.
        </p>
      </header>

      {logs.length === 0 ? (
        <EmptyState
          icon={<Bot className="size-5" aria-hidden />}
          title="No AI activity yet"
          description="Tool calls appear here as soon as someone uses the assistant or the copilot."
        />
      ) : (
        <div className="space-y-6">
          {[...byDay.entries()].map(([day, entries]) => (
            <section key={day}>
              <h2 className="mb-2 px-1 text-[0.6875rem] font-semibold tracking-[0.08em] text-ink-400 uppercase">
                {day}
              </h2>

              <ul className="card divide-y divide-hairline overflow-hidden">
                {entries.map((log) => (
                  <li key={log.id} className="flex items-start gap-3 px-4 py-3">
                    <span className="tabular w-16 shrink-0 pt-0.5 text-[0.6875rem] text-ink-400">
                      {timeOf(log.created_at)}
                    </span>

                    <span
                      className={cn(
                        "mt-0.5 grid size-5 shrink-0 place-items-center rounded-full",
                        log.success
                          ? "bg-success-50 text-success-700"
                          : "bg-danger-50 text-danger-700",
                      )}
                    >
                      {log.success ? (
                        <Check className="size-3" strokeWidth={3} aria-hidden />
                      ) : (
                        <X className="size-3" strokeWidth={3} aria-hidden />
                      )}
                    </span>

                    <div className="min-w-0 flex-1">
                      <p className="text-[0.8125rem] text-ink-800">
                        <span className="font-medium">
                          {log.actor_type === "admin" ? "Copilot" : "Assistant"}
                        </span>{" "}
                        {toolPastPhrase(log.tool_name)}
                        {log.object_id ? (
                          <span className="font-mono text-[0.75rem] text-saffron-700">
                            {" "}
                            {log.object_id}
                          </span>
                        ) : null}
                      </p>

                      {log.error ? (
                        <p className="mt-0.5 text-[0.75rem] text-danger-700">{log.error}</p>
                      ) : null}

                      <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[0.6875rem] text-ink-400">
                        <span className="font-mono">{log.tool_name}</span>
                        {log.duration_ms != null ? <span>{log.duration_ms}ms</span> : null}
                        {log.model ? <span>{log.model}</span> : null}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      <p className="mt-6 flex items-start gap-2 px-1 text-[0.75rem] leading-relaxed text-ink-400">
        <ShieldCheck className="mt-px size-3.5 shrink-0" strokeWidth={2} aria-hidden />
        Names, phone numbers, emails and free-text notes are replaced with
        &ldquo;[redacted]&rdquo; before an entry is written, so this log never
        becomes a second copy of villagers&rsquo; personal data.
      </p>
    </>
  );
}
