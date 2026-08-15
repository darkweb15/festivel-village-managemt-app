import { Suspense } from "react";
import type { Metadata } from "next";
import { HandHeart } from "lucide-react";
import { PageHeader } from "@/components/layout/app-header";
import { Avatar } from "@/components/committee-member-card";
import {
  EmptyState,
  ErrorState,
  SetupNotice,
  SkeletonList,
} from "@/components/ui/states";
import { getVolunteers } from "@/lib/data/queries";

export const metadata: Metadata = { title: "Volunteers" };

export default function VolunteersPage() {
  return (
    <>
      <PageHeader title="Volunteers" />

      <div className="px-5 py-5">
        <p className="mb-5 text-[0.875rem] leading-relaxed text-ink-500">
          The team keeping the mandapam running, day and night.
        </p>

        <Suspense fallback={<SkeletonList count={5} />}>
          <Teams />
        </Suspense>
      </div>
    </>
  );
}

async function Teams() {
  const result = await getVolunteers();

  if (result.status === "unconfigured") return <SetupNotice what="the volunteer list" />;
  if (result.status === "error") return <ErrorState message={result.message} />;

  if (result.data.length === 0) {
    return (
      <EmptyState
        icon={<HandHeart className="size-5" aria-hidden />}
        title="No volunteers listed yet"
        description="Volunteers will appear here once an admin adds them."
      />
    );
  }

  const byTeam = new Map<string, typeof result.data>();
  for (const volunteer of result.data) {
    const bucket = byTeam.get(volunteer.team) ?? [];
    bucket.push(volunteer);
    byTeam.set(volunteer.team, bucket);
  }

  return (
    <div className="animate-rise space-y-6">
      {[...byTeam.entries()].map(([team, members]) => (
        <section key={team}>
          <h2 className="mb-2 flex items-center gap-2 px-1 text-[0.6875rem] font-semibold tracking-[0.08em] text-ink-400 uppercase">
            {team}
            <span className="rounded-full bg-ink-100 px-2 py-0.5 text-[0.625rem] tracking-normal text-ink-500 normal-case">
              {members.length}
            </span>
          </h2>

          <ul className="card divide-y divide-hairline overflow-hidden">
            {members.map((volunteer) => (
              <li key={volunteer.id} className="flex items-center gap-3.5 px-4 py-3">
                <Avatar name={volunteer.name} className="size-10" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[0.875rem] font-medium text-ink-900">
                    {volunteer.name}
                  </p>
                  {volunteer.availability ? (
                    <p className="truncate text-[0.75rem] text-ink-400">
                      {volunteer.availability}
                    </p>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
