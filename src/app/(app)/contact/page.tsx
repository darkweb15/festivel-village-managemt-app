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
import { getDictionary } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getDictionary();
  return { title: t.contact.title };
}

export default async function ContactPage() {
  const t = await getDictionary();

  return (
    <>
      <PageHeader title={t.contact.title} />

      <div className="space-y-5 px-5 py-5">
        <p className="text-[0.875rem] leading-relaxed text-ink-500">
          {t.contact.intro}
        </p>

        <Suspense fallback={<SkeletonList count={3} />}>
          <Numbers />
        </Suspense>

        <div className="grid grid-cols-2 gap-3">
          <Link href="/committee" className={buttonClasses("secondary", "md", "w-full")}>
            <Users className="size-4" strokeWidth={2.2} aria-hidden />
            {t.contact.committeeCta}
          </Link>
          <Link href="/location" className={buttonClasses("secondary", "md", "w-full")}>
            <MapPin className="size-4" strokeWidth={2.2} aria-hidden />
            {t.contact.locationCta}
          </Link>
        </div>
      </div>
    </>
  );
}

async function Numbers() {
  const t = await getDictionary();
  const result = await getContacts();

  if (result.status === "unconfigured") return <SetupNotice what="contact numbers" />;
  if (result.status === "error") return <ErrorState message={result.message} />;

  if (result.data.length === 0) {
    return (
      <EmptyState
        icon={<Phone className="size-5" aria-hidden />}
        title={t.contact.empty}
        description={t.contact.emptyBody}
      />
    );
  }

  const emergency = result.data.filter((c) => c.is_emergency);
  const regular = result.data.filter((c) => !c.is_emergency);

  return (
    <div className="animate-rise space-y-5">
      {regular.length > 0 ? (
        <ListGroup title={t.contact.committee}>
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
        <ListGroup title={t.contact.emergency}>
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
