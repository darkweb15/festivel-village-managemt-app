import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/app-header";
import { BookingLookup } from "@/components/booking/booking-lookup";
import { getDictionary } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getDictionary();
  return { title: t.lookup.title };
}

export default async function BookingLookupPage() {
  const t = await getDictionary();

  return (
    <>
      <PageHeader title={t.lookup.title} backHref="/book" />

      <div className="space-y-5 px-5 py-5">
        <p className="text-[0.875rem] leading-relaxed text-ink-500">
          {t.lookup.intro}
        </p>

        <BookingLookup />
      </div>
    </>
  );
}
