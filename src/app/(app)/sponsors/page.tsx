import Image from "next/image";
import { Suspense } from "react";
import type { Metadata } from "next";
import { ExternalLink, Handshake } from "lucide-react";
import { PageHeader } from "@/components/layout/app-header";
import {
  EmptyState,
  ErrorState,
  SetupNotice,
  SkeletonList,
} from "@/components/ui/states";
import { getSponsors } from "@/lib/data/queries";
import { initials } from "@/lib/utils";
import type { SponsorTier } from "@/lib/supabase/types";

export const metadata: Metadata = { title: "Sponsors" };

const TIER_ORDER: SponsorTier[] = ["platinum", "gold", "silver", "supporter"];

const TIER_STYLE: Record<SponsorTier, { label: string; chip: string }> = {
  platinum: { label: "Platinum", chip: "bg-ink-800 text-white" },
  gold: { label: "Gold", chip: "bg-gold-100 text-gold-700" },
  silver: { label: "Silver", chip: "bg-ink-100 text-ink-600" },
  supporter: { label: "Supporters", chip: "bg-saffron-50 text-saffron-700" },
};

export default function SponsorsPage() {
  return (
    <>
      <PageHeader title="Sponsors" />

      <div className="px-5 py-5">
        <p className="mb-5 text-[0.875rem] leading-relaxed text-ink-500">
          Our heartfelt thanks to everyone supporting this year&rsquo;s festival.
        </p>

        <Suspense fallback={<SkeletonList count={4} />}>
          <Tiers />
        </Suspense>
      </div>
    </>
  );
}

async function Tiers() {
  const result = await getSponsors();

  if (result.status === "unconfigured") return <SetupNotice what="sponsors" />;
  if (result.status === "error") return <ErrorState message={result.message} />;

  if (result.data.length === 0) {
    return (
      <EmptyState
        icon={<Handshake className="size-5" aria-hidden />}
        title="No sponsors listed yet"
        description="Sponsors will be acknowledged here once added."
      />
    );
  }

  return (
    <div className="animate-rise space-y-6">
      {TIER_ORDER.map((tier) => {
        const sponsors = result.data.filter((s) => s.tier === tier);
        if (sponsors.length === 0) return null;

        return (
          <section key={tier}>
            <h2 className="mb-2.5 px-1">
              <span
                className={`inline-block rounded-full px-3 py-1 text-[0.6875rem] font-semibold tracking-[0.06em] uppercase ${TIER_STYLE[tier].chip}`}
              >
                {TIER_STYLE[tier].label}
              </span>
            </h2>

            <ul className="grid grid-cols-2 gap-3">
              {sponsors.map((sponsor) => {
                const body = (
                  <>
                    <span className="relative grid size-14 place-items-center overflow-hidden rounded-2xl bg-ink-50 ring-1 ring-hairline">
                      {sponsor.logo_url ? (
                        <Image
                          src={sponsor.logo_url}
                          alt=""
                          fill
                          sizes="56px"
                          className="object-contain p-2"
                        />
                      ) : (
                        <span className="text-[0.9375rem] font-bold text-ink-400" aria-hidden>
                          {initials(sponsor.name)}
                        </span>
                      )}
                    </span>
                    <span className="mt-3 line-clamp-2 text-center text-[0.8125rem] font-medium text-ink-900">
                      {sponsor.name}
                    </span>
                    {sponsor.website_url ? (
                      <span className="mt-1 inline-flex items-center gap-1 text-[0.6875rem] text-saffron-700">
                        Visit
                        <ExternalLink className="size-3" strokeWidth={2.2} aria-hidden />
                      </span>
                    ) : null}
                  </>
                );

                return (
                  <li key={sponsor.id}>
                    {sponsor.website_url ? (
                      <a
                        href={sponsor.website_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="card card-interactive flex h-full flex-col items-center px-4 py-5"
                      >
                        {body}
                      </a>
                    ) : (
                      <div className="card flex h-full flex-col items-center px-4 py-5">
                        {body}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
