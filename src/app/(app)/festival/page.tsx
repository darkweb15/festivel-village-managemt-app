import { Suspense } from "react";
import type { Metadata } from "next";
import { CalendarRange, Info, Route, Waves } from "lucide-react";
import { PageHeader } from "@/components/layout/app-header";
import { EmptyState, ErrorState, SetupNotice, Skeleton } from "@/components/ui/states";
import { getFestivalSettings } from "@/lib/data/queries";
import { getDictionary } from "@/lib/i18n/server";
import { formatFullDate, formatTime } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getDictionary();
  return { title: t.festivalInfo.title };
}

export default async function FestivalPage() {
  const t = await getDictionary();

  return (
    <>
      <PageHeader title={t.festivalInfo.title} />

      <div className="space-y-4 px-5 py-5">
        <Suspense fallback={<Skeleton className="h-64 w-full rounded-card" />}>
          <Details />
        </Suspense>
      </div>
    </>
  );
}

async function Details() {
  const t = await getDictionary();
  const result = await getFestivalSettings();

  if (result.status === "unconfigured") return <SetupNotice what="festival details" />;
  if (result.status === "error") return <ErrorState message={result.message} />;

  const settings = result.data;
  if (!settings) {
    return (
      <EmptyState
        icon={<Info className="size-5" aria-hidden />}
        title={t.festivalInfo.notPublished}
        description={t.festivalInfo.notPublishedBody}
      />
    );
  }

  const hasDates = Boolean(settings.start_date || settings.end_date);
  const hasNimajjanam = Boolean(
    settings.nimajjanam_date || settings.nimajjanam_time || settings.nimajjanam_route,
  );

  return (
    <div className="animate-rise space-y-4">
      <section className="card px-5 py-5">
        <h2 className="text-[1.125rem] font-bold tracking-[-0.025em] text-ink-900">
          {settings.festival_name} {settings.festival_year}
        </h2>
        {settings.tagline ? (
          <p className="mt-1.5 text-[0.875rem] leading-relaxed text-saffron-700">
            {settings.tagline}
          </p>
        ) : null}
        {settings.about ? (
          <p className="mt-4 text-[0.875rem] leading-relaxed whitespace-pre-line text-ink-600">
            {settings.about}
          </p>
        ) : (
          <p className="mt-4 text-[0.8125rem] text-ink-400">
            {t.festivalInfo.noDescription}
          </p>
        )}
      </section>

      {hasDates ? (
        <InfoCard icon={CalendarRange} tone="saffron" title={t.festivalInfo.dates}>
          <dl className="space-y-2">
            {settings.start_date ? (
              <Row label={t.festivalInfo.begins} value={formatFullDate(settings.start_date)} />
            ) : null}
            {settings.end_date ? (
              <Row label={t.festivalInfo.ends} value={formatFullDate(settings.end_date)} />
            ) : null}
          </dl>
        </InfoCard>
      ) : null}

      {hasNimajjanam ? (
        <InfoCard icon={Waves} tone="info" title={t.festivalInfo.nimajjanam}>
          <dl className="space-y-2">
            {settings.nimajjanam_date ? (
              <Row label={t.festivalInfo.date} value={formatFullDate(settings.nimajjanam_date)} />
            ) : null}
            {settings.nimajjanam_time ? (
              <Row
                label={t.festivalInfo.starts}
                value={formatTime(settings.nimajjanam_time) ?? settings.nimajjanam_time}
              />
            ) : null}
          </dl>
          {settings.nimajjanam_route ? (
            <div className="mt-4 flex gap-2.5 rounded-tile bg-ink-50 p-3.5">
              <Route className="mt-px size-4 shrink-0 text-ink-400" strokeWidth={2} aria-hidden />
              <p className="text-[0.8125rem] leading-relaxed whitespace-pre-line text-ink-600">
                {settings.nimajjanam_route}
              </p>
            </div>
          ) : null}
        </InfoCard>
      ) : null}
    </div>
  );
}

function InfoCard({
  icon: Icon,
  tone,
  title,
  children,
}: {
  icon: React.ElementType;
  tone: "saffron" | "info";
  title: string;
  children: React.ReactNode;
}) {
  const tones = {
    saffron: "bg-saffron-50 text-saffron-600",
    info: "bg-info-50 text-info-700",
  };

  return (
    <section className="card px-5 py-5">
      <div className="mb-4 flex items-center gap-3">
        <span
          className={`grid size-10 shrink-0 place-items-center rounded-[0.875rem] ${tones[tone]}`}
        >
          <Icon className="size-[1.1rem]" strokeWidth={2} aria-hidden />
        </span>
        <h2 className="text-[1rem] font-semibold tracking-[-0.02em] text-ink-900">
          {title}
        </h2>
      </div>
      {children}
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-hairline pb-2 last:border-0 last:pb-0">
      <dt className="text-[0.8125rem] text-ink-500">{label}</dt>
      <dd className="text-[0.8125rem] font-semibold text-ink-900">{value}</dd>
    </div>
  );
}
