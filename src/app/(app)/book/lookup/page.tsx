import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/app-header";
import { BookingLookup } from "@/components/booking/booking-lookup";

export const metadata: Metadata = { title: "Find a booking" };

export default function BookingLookupPage() {
  return (
    <>
      <PageHeader title="Find a booking" backHref="/book" />

      <div className="space-y-5 px-5 py-5">
        <p className="text-[0.875rem] leading-relaxed text-ink-500">
          Enter your booking ID and the phone number you booked with to see or
          cancel your pooja booking.
        </p>

        <BookingLookup />
      </div>
    </>
  );
}
