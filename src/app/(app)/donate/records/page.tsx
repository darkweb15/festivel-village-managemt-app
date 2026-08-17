import { Suspense } from "react";
import type { Metadata } from "next";
import { Receipt, ScrollText } from "lucide-react";
import { PageHeader } from "@/components/layout/app-header";
import { FilterChips } from "@/components/ui/filter-chips";
import {
  EmptyState,
  ErrorState,
  SetupNotice,
  SkeletonList,
} from "@/components/ui/states";
import {
  getPublicDonations,
  getPublicExpenses,
  getPublicStats,
} from "@/lib/data/queries";
import { getDictionary } from "@/lib/i18n/server";
import { formatCurrency, formatFullDate } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getDictionary();
  return { title: t.records.title };
}

export default async function RecordsPage(props: PageProps<"/donate/records">) {
  const params = await props.searchParams;
  const raw = params.view;
  const view = (Array.isArray(raw) ? raw[0] : raw) === "expenses" ? "expenses" : "donations";
  const t = await getDictionary();

  const TABS = [
    { value: "donations", label: t.records.donations },
    { value: "expenses", label: t.records.expenses },
  ];

  return (
    <>
      <PageHeader
        title={t.records.title}
        subtitle={t.records.subtitle}
        backHref="/donate"
      />

      <div className="space-y-5 px-5 py-5">
        <Suspense fallback={<div className="h-14 rounded-card bg-ink-100" />}>
          <BalanceStrip />
        </Suspense>

        <Suspense fallback={<div className="h-12 rounded-full bg-ink-100" />}>
          <FilterChips param="view" options={TABS} defaultValue="donations" />
        </Suspense>

        <Suspense key={view} fallback={<SkeletonList count={5} />}>
          {view === "donations" ? <DonationList /> : <ExpenseList />}
        </Suspense>
      </div>
    </>
  );
}

async function BalanceStrip() {
  const t = await getDictionary();
  const stats = await getPublicStats();
  if (stats.status !== "ok") return null;

  const balance = stats.data.total_donations - stats.data.total_expenses;

  return (
    <div className="card grid grid-cols-3 divide-x divide-hairline overflow-hidden">
      <Figure label={t.records.received} value={stats.data.total_donations} tone="text-ink-900" />
      <Figure label={t.records.spent} value={stats.data.total_expenses} tone="text-ink-900" />
      <Figure
        label={t.records.balance}
        value={balance}
        tone={balance >= 0 ? "text-success-700" : "text-danger-700"}
      />
    </div>
  );
}

function Figure({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: string;
}) {
  return (
    <div className="px-2.5 py-4 text-center">
      {/* Never abbreviate here: ₹1,24,500 and ₹1,00,000 both compact to "₹1L",
          which would show two different figures as the same number on the
          screen whose whole purpose is transparency. */}
      <p
        className={`tabular text-[0.8125rem] leading-none font-bold tracking-[-0.02em] ${tone}`}
      >
        {formatCurrency(value)}
      </p>
      <p className="mt-1.5 text-[0.6875rem] font-medium text-ink-500">{label}</p>
    </div>
  );
}

async function DonationList() {
  const t = await getDictionary();
  const result = await getPublicDonations(100);

  if (result.status === "unconfigured") return <SetupNotice what="the donation list" />;
  if (result.status === "error") return <ErrorState message={result.message} />;

  if (result.data.length === 0) {
    return (
      <EmptyState
        icon={<ScrollText className="size-5" aria-hidden />}
        title={t.records.noDonations}
        description={t.records.noDonationsBody}
      />
    );
  }

  return (
    <ul className="card animate-rise divide-y divide-hairline overflow-hidden">
      {result.data.map((donation) => (
        <li key={donation.id} className="flex items-center gap-3 px-4 py-3.5">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[0.875rem] font-medium text-ink-900">
              {donation.is_anonymous ? t.records.anonymous : donation.donor_name}
            </p>
            <p className="text-[0.75rem] text-ink-400">
              {formatFullDate(donation.donation_date)}
            </p>
          </div>
          <p className="tabular shrink-0 text-[0.875rem] font-semibold text-ink-900">
            {formatCurrency(donation.amount)}
          </p>
        </li>
      ))}
    </ul>
  );
}

async function ExpenseList() {
  const t = await getDictionary();
  const result = await getPublicExpenses(100);

  if (result.status === "unconfigured") return <SetupNotice what="the expense list" />;
  if (result.status === "error") return <ErrorState message={result.message} />;

  if (result.data.length === 0) {
    return (
      <EmptyState
        icon={<Receipt className="size-5" aria-hidden />}
        title={t.records.noExpenses}
        description={t.records.noExpensesBody}
      />
    );
  }

  return (
    <ul className="card animate-rise divide-y divide-hairline overflow-hidden">
      {result.data.map((expense) => (
        <li key={expense.id} className="flex items-center gap-3 px-4 py-3.5">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[0.875rem] font-medium text-ink-900">
              {expense.title}
            </p>
            <p className="text-[0.75rem] text-ink-400">
              <span className="capitalize">{expense.category}</span>
              {" · "}
              {formatFullDate(expense.expense_date)}
            </p>
          </div>
          <p className="tabular shrink-0 text-[0.875rem] font-semibold text-ink-700">
            {formatCurrency(expense.amount)}
          </p>
        </li>
      ))}
    </ul>
  );
}
