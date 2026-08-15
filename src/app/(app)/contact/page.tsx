import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { MapPin, Phone, Siren, Users } from "lucide-react";
import { PageHeader } from "@/components/layout/app-header";
import { buttonClasses } from "@/components/ui/button";
import { ListGroup, ListRow } from "@/components/ui/list-row";
import {
  EmptyState,
  ErrorState,
  SetupNotice,
  SkeletonList,
} from "@/components/ui/states";
import { getContacts } from "@/lib/data/queries";

export const metadata: Metadata = { title: "Contact Us" };

export default function ContactPage() {
  return (
    <>
      <PageHeader title="Contact Us" />

      <div className="space-y-5 px-5 py-5">
        <p className="text-[0.875rem] leading-relaxed text-ink-500">
          Reach the committee directly. Tap any number to call.
        </p>

        <Suspense fallback={<SkeletonList count={3} />}>
          <Numbers />
        </Suspense>

        <div className="grid grid-cols-2 gap-3">
          <Link href="/committee" className={buttonClasses("secondary", "md", "w-full")}>
            <Users className="size-4" strokeWidth={2.2} aria-hidden />
            Committee
          </Link>
          <Link href="/location" className={buttonClasses("secondary", "md", "w-full")}>
            <MapPin className="size-4" strokeWidth={2.2} aria-hidden />
            Location
          </Link>
        </div>
      </div>
    </>
  );
}

async function Numbers() {
  const result = await getContacts();

  if (result.status === "unconfigured") return <SetupNotice what="contact numbers" />;
  if (result.status === "error") return <ErrorState message={result.message} />;

  if (result.data.length === 0) {
    return (
      <EmptyState
        icon={<Phone className="size-5" aria-hidden />}
        title="No numbers published yet"
        description="Committee contact numbers will appear here."
      />
    );
  }

  const emergency = result.data.filter((c) => c.is_emergency);
  const regular = result.data.filter((c) => !c.is_emergency);

  return (
    <div className="animate-rise space-y-5">
      {regular.length > 0 ? (
        <ListGroup title="Committee">
          {regular.map((contact) => (
            <ListRow
              key={contact.id}
              icon={Phone}
              tone="saffron"
              label={contact.label}
              description={
                contact.contact_name
                  ? `${contact.contact_name} · ${contact.phone}`
                  : contact.phone
              }
              href={`tel:${contact.phone.replace(/\s+/g, "")}`}
              external
            />
          ))}
        </ListGroup>
      ) : null}

      {emergency.length > 0 ? (
        <ListGroup title="Emergency">
          {emergency.map((contact) => (
            <ListRow
              key={contact.id}
              icon={Siren}
              tone="danger"
              label={contact.label}
              description={
                contact.contact_name
                  ? `${contact.contact_name} · ${contact.phone}`
                  : contact.phone
              }
              href={`tel:${contact.phone.replace(/\s+/g, "")}`}
              external
            />
          ))}
        </ListGroup>
      ) : null}
    </div>
  );
}
