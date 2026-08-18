import { Suspense } from "react";
import type { Metadata } from "next";
import { BellRing } from "lucide-react";
import { PageHeader } from "@/components/layout/app-header";
import { NotificationFeed } from "@/components/notifications/notification-feed";
import {
  EmptyState,
  ErrorState,
  SetupNotice,
  SkeletonList,
} from "@/components/ui/states";
import { getNotifications } from "@/lib/data/queries";
import { getDictionary } from "@/lib/i18n/server";

/**
 * The notification centre.
 *
 * Rendered fresh on every visit: the whole point of the screen is "what has
 * changed since I last looked", and a cached copy would answer a different
 * question.
 */
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getDictionary();
  return { title: t.notifications.title };
}

export default async function NotificationsPage() {
  const t = await getDictionary();

  return (
    <>
      <PageHeader
        title={t.notifications.title}
        subtitle={t.notifications.subtitle}
        backHref="/"
      />

      <div className="px-5 py-5">
        <Suspense fallback={<Loading label={t.notifications.loadingAria} />}>
          <Feed />
        </Suspense>
      </div>
    </>
  );
}

function Loading({ label }: { label: string }) {
  return (
    <div aria-label={label}>
      <SkeletonList count={5} />
    </div>
  );
}

async function Feed() {
  const t = await getDictionary();
  const result = await getNotifications();

  if (result.status === "unconfigured") return <SetupNotice what="notifications" />;
  if (result.status === "error") return <ErrorState message={result.message} />;

  if (result.data.length === 0) {
    return (
      <EmptyState
        icon={<BellRing className="size-5" aria-hidden />}
        title={t.notifications.empty}
        description={t.notifications.emptyBody}
      />
    );
  }

  return <NotificationFeed notifications={result.data} />;
}
