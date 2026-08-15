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
import { formatCurrency } from "@/lib/utils";

export const metadata: Metadata = { title: "Donations" };

export default function DonatePage() {
  return (
    <>
      <TabHeader title="Donations" />

      <div className="space-y-7 px-5 py-5">
        <p className="text-[1.375rem] leading-[1.25] font-bold tracking-[-0.03em] text-ink-900">
          Support the festival &amp;
          <br />
          <span className="text-saffron-600">view transparent accounts</span>
        </p>

        <section id="scan">
          <SectionHeader title="Scan & Donate" />
          <Suspense fallback={<Skeleton className="h-96 w-full rounded-card" />}>
            <ScanCard />
          </Suspense>
        </section>

        <section>
          <SectionHeader title="Donation Overview" />
          <Suspense fallback={<Skeleton className="h-44 w-full rounded-card" />}>
            <OverviewSlot />
          </Suspense>
        </section>

        <section id="record">
          <SectionHeader title="Record your donation" />
          <DonationForm />
        </section>

        <Link
          href="/donate/records"
          className={buttonClasses("secondary", "lg", "w-full")}
        >
          View all donations &amp; expenses
          <ArrowRight className="size-4" strokeWidth={2.2} aria-hidden />
        </Link>
      </div>
    </>
  );
}

/* -------------------------------------------------------------------------- */

async function ScanCard() {
  const settings = await getFestivalSettings();

  if (settings.status === "unconfigured") return <SetupNotice what="UPI details" />;
  if (settings.status === "error") return <ErrorState message={settings.message} />;

  const upiId = settings.data?.upi_id ?? null;
  const payee = settings.data?.upi_payee_name ?? null;

  return (
    <div className="card px-5 py-6">
      <div className="flex flex-col items-center">
        <UPIQRCode upiId={upiId} payeeName={payee} />

        <p className="mt-4 max-w-[15rem] text-center text-[0.8125rem] leading-relaxed text-ink-500">
          Scan this QR code to donate using any UPI app
        </p>

        {upiId ? (
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <span className="rounded-full bg-ink-100 px-3.5 py-1.5 font-mono text-[0.8125rem] font-medium text-ink-800">
              {upiId}
            </span>
            <CopyButton value={upiId} label="Copy UPI ID" />
          </div>
        ) : null}
      </div>

      <UpiAppRow className="mt-6 border-t border-hairline pt-5" />

      {upiId ? (
        <a
          href={upiUri({ upiId, payeeName: payee, note: APP.festivalShort })}
          className={buttonClasses("primary", "lg", "mt-5 w-full")}
        >
          Donate Now
        </a>
      ) : null}

      <p className="mt-3 flex gap-2 text-[0.6875rem] leading-relaxed text-ink-400">
        <Info className="mt-px size-3.5 shrink-0" strokeWidth={2} aria-hidden />
        Opens your UPI app. Payments are handled entirely by your bank — this app
        never sees your payment details.
      </p>
    </div>
  );
}

async function OverviewSlot() {
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
          label="Donors"
          value={donor_count.toLocaleString("en-IN")}
        />
        <StatsCard
          icon={Receipt}
          tone="neutral"
          label="Transactions"
          value={transaction_count.toLocaleString("en-IN")}
        />
        <StatsCard
          icon={Trophy}
          tone="gold"
          label="Top donation"
          // Only abbreviate past ₹10 lakh — below that, lakh-rounding hides
          // meaningful differences (₹1,24,500 and ₹1,00,000 both read "₹1L").
          value={formatCurrency(top_donation, { compact: top_donation >= 1_000_000 })}
        />
      </div>

      <p className="flex gap-2 px-1 text-[0.6875rem] leading-relaxed text-ink-400">
        <BadgeIndianRupee className="mt-px size-3.5 shrink-0" strokeWidth={2} aria-hidden />
        Totals count only donations a committee member has confirmed against the
        bank statement.
      </p>
    </div>
  );
}

