import Link from "next/link";
import { Suspense } from "react";
import type { Metadata } from "next";
import {
  ArrowRight,
  BadgeIndianRupee,
  Info,
  Receipt,
  Trophy,
  Users,
} from "lucide-react";
import { TabHeader } from "@/components/layout/app-header";
import { DonationOverviewCard } from "@/components/donation-card";
import { DonationForm } from "@/components/donation-form";
import { StatsCard } from "@/components/stats-card";
import { UPIQRCode, UpiAppRow, upiUri } from "@/components/upi-qr-code";
import { buttonClasses } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { SectionHeader } from "@/components/ui/card";
import { ErrorState, SetupNotice, Skeleton } from "@/components/ui/states";
import { getFestivalSettings, getPublicStats } from "@/lib/data/queries";
import { APP } from "@/lib/constants";
import { getDictionary } from "@/lib/i18n/server";
import { formatCurrency } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getDictionary();
  return { title: t.donate.title };
}

export default async function DonatePage() {
  const t = await getDictionary();

  return (
    <>
      <TabHeader title={t.donate.title} />

      <div className="space-y-7 px-5 py-5">
        <p className="text-[1.375rem] leading-[1.4] font-bold tracking-[-0.03em] text-ink-900">
          {t.donate.headline1}
          <br />
          <span className="text-saffron-600">{t.donate.headline2}</span>
        </p>

        <section id="scan">
          <SectionHeader title={t.donate.scanSection} />
          <Suspense fallback={<Skeleton className="h-96 w-full rounded-card" />}>
            <ScanCard />
          </Suspense>
        </section>

        <section>
          <SectionHeader title={t.donate.overviewSection} />
          <Suspense fallback={<Skeleton className="h-44 w-full rounded-card" />}>
            <OverviewSlot />
          </Suspense>
        </section>

        <section id="record">
          <SectionHeader title={t.donate.recordSection} />
          <DonationForm />
        </section>

        <Link
          href="/donate/records"
          className={buttonClasses("secondary", "lg", "w-full")}
        >
          {t.donate.viewAll}
          <ArrowRight className="size-4" strokeWidth={2.2} aria-hidden />
        </Link>
      </div>
    </>
  );
}

/* -------------------------------------------------------------------------- */

async function ScanCard() {
  const t = await getDictionary();
  const settings = await getFestivalSettings();

  if (settings.status === "unconfigured") return <SetupNotice what="UPI details" />;
  if (settings.status === "error") return <ErrorState message={settings.message} />;

  const upiId = settings.data?.upi_id ?? null;
  const payee = settings.data?.upi_payee_name ?? null;

  return (
    <div className="card px-5 py-6">
      <div className="flex flex-col items-center">
        <UPIQRCode upiId={upiId} payeeName={payee} />

        <p className="mt-4 max-w-[16rem] text-center text-[0.8125rem] leading-relaxed text-ink-500">
          {t.donate.scanHint}
        </p>

        {upiId ? (
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <span className="rounded-full bg-ink-100 px-3.5 py-1.5 font-mono text-[0.8125rem] font-medium text-ink-800">
              {upiId}
            </span>
            <CopyButton value={upiId} label={t.donate.copyUpi} />
          </div>
        ) : null}
      </div>

      <UpiAppRow className="mt-6 border-t border-hairline pt-5" />

      {upiId ? (
        <a
          href={upiUri({ upiId, payeeName: payee, note: APP.upiNote })}
          className={buttonClasses("primary", "lg", "mt-5 w-full")}
        >
          {t.donate.donateNow}
        </a>
      ) : null}

      <p className="mt-3 flex gap-2 text-[0.6875rem] leading-relaxed text-ink-400">
        <Info className="mt-px size-3.5 shrink-0" strokeWidth={2} aria-hidden />
        {t.donate.upiNote}
      </p>
    </div>
  );
}

async function OverviewSlot() {
  const t = await getDictionary();
  const stats = await getPublicStats();

  if (stats.status === "unconfigured") return <SetupNotice what="donation totals" />;
  if (stats.status === "error") return <ErrorState message={stats.message} />;

  const { total_donations, donation_goal, donor_count, transaction_count, top_donation } =
    stats.data;

  return (
    <div className="space-y-3">
      <DonationOverviewCard total={total_donations} goal={donation_goal} />

      <div className="grid grid-cols-3 gap-3">
        <StatsCard
          icon={Users}
          tone="info"
          label={t.donate.donors}
          value={donor_count.toLocaleString("en-IN")}
        />
        <StatsCard
          icon={Receipt}
          tone="neutral"
          label={t.donate.transactions}
          value={transaction_count.toLocaleString("en-IN")}
        />
        <StatsCard
          icon={Trophy}
          tone="gold"
          label={t.donate.topDonation}
          // Only abbreviate past ₹10 lakh — below that, lakh-rounding hides
          // meaningful differences (₹1,24,500 and ₹1,00,000 both read "₹1L").
          value={formatCurrency(top_donation, { compact: top_donation >= 1_000_000 })}
        />
      </div>

      <p className="flex gap-2 px-1 text-[0.6875rem] leading-relaxed text-ink-400">
        <BadgeIndianRupee className="mt-px size-3.5 shrink-0" strokeWidth={2} aria-hidden />
        {t.donate.verifiedNote}
      </p>
    </div>
  );
}

