import { Suspense } from "react";
import type { Metadata } from "next";
import { MapPin, Navigation, Phone, Siren } from "lucide-react";
import { PageHeader } from "@/components/layout/app-header";
import { buttonClasses } from "@/components/ui/button";
import { ListGroup, ListRow } from "@/components/ui/list-row";
import {
  EmptyState,
  ErrorState,
  SetupNotice,
  Skeleton,
} from "@/components/ui/states";
import { getContacts, getFestivalSettings } from "@/lib/data/queries";
import type { FestivalSettings } from "@/lib/supabase/types";

export const metadata: Metadata = { title: "Location" };

export default function LocationPage() {
  return (
    <>
      <PageHeader title="Location" />

      <div className="space-y-6 px-5 py-5">
        <Suspense fallback={<Skeleton className="h-72 w-full rounded-card" />}>
          <VenueCard />
        </Suspense>

        <Suspense fallback={<Skeleton className="h-40 w-full rounded-card" />}>
          <ContactNumbers />
        </Suspense>
      </div>
    </>
  );
}

/** OpenStreetMap needs no API key, so the committee can self-host this as-is. */
function mapEmbed(settings: FestivalSettings) {
  if (settings.map_embed_url) return settings.map_embed_url;
  if (settings.latitude == null || settings.longitude == null) return null;

  const lat = Number(settings.latitude);
  const lon = Number(settings.longitude);
  const d = 0.004;
  const bbox = [lon - d, lat - d, lon + d, lat + d].join("%2C");
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat}%2C${lon}`;
}

function directionsUrl(settings: FestivalSettings) {
  if (settings.directions_url) return settings.directions_url;
  if (settings.latitude != null && settings.longitude != null) {
    return `https://www.google.com/maps/dir/?api=1&destination=${settings.latitude},${settings.longitude}`;
  }
  const query = [settings.venue_name, settings.venue_address]
    .filter(Boolean)
    .join(", ");
  if (!query) return null;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(query)}`;
}

async function VenueCard() {
  const result = await getFestivalSettings();

  if (result.status === "unconfigured") return <SetupNotice what="the venue" />;
  if (result.status === "error") return <ErrorState message={result.message} />;

  const settings = result.data;
  if (!settings || (!settings.venue_name && !settings.venue_address)) {
    return (
      <EmptyState
        icon={<MapPin className="size-5" aria-hidden />}
        title="Venue not set yet"
        description="An admin can add the mandapam address in Festival Settings."
      />
    );
  }

  const embed = mapEmbed(settings);
  const directions = directionsUrl(settings);

  return (
    <section className="card animate-rise overflow-hidden">
      <div className="relative aspect-[16/11] w-full bg-ink-100">
        {embed ? (
          <iframe
            src={embed}
            title={`Map showing ${settings.venue_name ?? "the mandapam"}`}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className="size-full border-0"
          />
        ) : (
          <div className="grid size-full place-items-center text-center">
            <div>
              <MapPin className="mx-auto size-7 text-ink-400" strokeWidth={1.6} aria-hidden />
              <p className="mt-2 text-[0.8125rem] text-ink-500">
                Map coordinates not set
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="px-5 py-5">
        <div className="flex gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-[0.875rem] bg-saffron-50 text-saffron-600">
            <MapPin className="size-[1.1rem]" strokeWidth={2} aria-hidden />
          </span>
          <div className="min-w-0">
            <h2 className="text-[1rem] font-semibold tracking-[-0.02em] text-ink-900">
              {settings.venue_name ?? "Festival Mandapam"}
            </h2>
            {settings.venue_address ? (
              <p className="mt-1 text-[0.8125rem] leading-relaxed text-ink-500">
                {settings.venue_address}
              </p>
            ) : null}
          </div>
        </div>

        {directions ? (
          <a
            href={directions}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonClasses("primary", "lg", "mt-5 w-full")}
          >
            <Navigation className="size-[1.05rem]" strokeWidth={2.2} aria-hidden />
            Get Directions
          </a>
        ) : null}
      </div>
    </section>
  );
}

async function ContactNumbers() {
  const result = await getContacts();

  if (result.status === "unconfigured") return null;
  if (result.status === "error") return <ErrorState message={result.message} />;

  if (result.data.length === 0) {
    return (
      <EmptyState
        icon={<Phone className="size-5" aria-hidden />}
        title="No contact numbers yet"
        description="Committee phone numbers will be listed here."
      />
    );
  }

  return (
    <ListGroup title="Contact Numbers">
      {result.data.map((contact) => (
        <ListRow
          key={contact.id}
          icon={contact.is_emergency ? Siren : Phone}
          tone={contact.is_emergency ? "danger" : "neutral"}
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
  );
}
