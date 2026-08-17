import { Suspense } from "react";
import type { Metadata } from "next";
import { Users } from "lucide-react";
import { PageHeader } from "@/components/layout/app-header";
import { CommitteeMemberCard } from "@/components/committee-member-card";
import {
  EmptyState,
  ErrorState,
  SetupNotice,
  SkeletonList,
} from "@/components/ui/states";
import { getCommitteeMembers } from "@/lib/data/queries";
import { getDictionary } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getDictionary();
  return { title: t.committee.title };
}

export default async function CommitteePage() {
  const t = await getDictionary();

  return (
    <>
      <PageHeader title={t.committee.title} />

      <div className="px-5 py-5">
        <p className="mb-5 text-[0.875rem] leading-relaxed text-ink-500">
          {t.committee.intro}
        </p>

        <Suspense fallback={<SkeletonList count={6} />}>
          <MemberList />
        </Suspense>
      </div>
    </>
  );
}

async function MemberList() {
  const t = await getDictionary();
  const result = await getCommitteeMembers();

  if (result.status === "unconfigured") return <SetupNotice what="committee members" />;
  if (result.status === "error") return <ErrorState message={result.message} />;

  if (result.data.length === 0) {
    return (
      <EmptyState
        icon={<Users className="size-5" aria-hidden />}
        title={t.committee.empty}
        description={t.committee.emptyBody}
      />
    );
  }

  return (
    // Two columns only from lg: at md the desktop sidebar is already taking
    // 256px, which left each card too narrow and truncated names like
    // "Event Coordinator".
    <div className="animate-rise space-y-3 lg:grid lg:grid-cols-2 lg:gap-3 lg:space-y-0">
      {result.data.map((member) => (
        <CommitteeMemberCard key={member.id} member={member} />
      ))}
    </div>
  );
}
