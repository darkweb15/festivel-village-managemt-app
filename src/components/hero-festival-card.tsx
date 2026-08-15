import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CalendarHeart, Clock } from "lucide-react";
import { DevotionalArt, PlaceholderBadge } from "@/components/brand/devotional-art";
import { buttonClasses } from "@/components/ui/button";
import { APP } from "@/lib/constants";
import type { FestivalSettings } from "@/lib/supabase/types";

/**
 * The Home hero. Falls back to the vector artwork until the committee uploads
 * a photograph in Festival Settings.
 */
export function HeroFestivalCard({
  settings,
}: {
  settings: FestivalSettings | null;
}) {
  const invocation = settings?.invocation ?? APP.invocation;
  const name = settings?.festival_name ?? APP.festivalShort.replace(/\s+\d{4}$/, "");
  const year = settings?.festival_year ?? new Date().getFullYear();
  const tagline = settings?.tagline ?? APP.tagline;
  const heroImage = settings?.hero_image_url;

  return (
    <section className="card overflow-hidden">
      {/* Portrait crop on phones; wider and capped on desktop so the hero
          doesn't push the rest of the screen below the fold. */}
      <div className="relative aspect-[4/3] max-h-[26rem] w-full bg-saffron-50 md:aspect-[2/1]">
        {heroImage ? (
          <Image
            src={heroImage}
            alt={`${name} ${year}`}
            fill
            priority
            sizes="(min-width: 768px) 640px, 100vw"
            className="object-cover"
          />
        ) : (
          <>
            <DevotionalArt className="size-full" />
            <PlaceholderBadge className="absolute right-3 bottom-3" />
          </>
        )}
      </div>

      <div className="px-5 pt-5 pb-6 text-center">
        <p className="t-label tracking-[0.18em] text-saffron-600">{invocation}</p>

        <h1 className="t-display mt-3 text-ink-900">
          {name}
          <br />
          {year}
        </h1>

        <p className="t-body mx-auto mt-3 max-w-[19rem] font-medium text-saffron-700">
          {tagline}
        </p>

        <div className="mt-6 space-y-2.5 sm:flex sm:justify-center sm:gap-3 sm:space-y-0">
          <Link
            href="/book"
            className={buttonClasses("primary", "lg", "group w-full sm:w-auto")}
          >
            <CalendarHeart className="size-[1.05rem]" strokeWidth={2.2} aria-hidden />
            Book a Pooja
            <ArrowRight
              className="size-4 transition-transform duration-[--duration-fast] group-hover:translate-x-0.5"
              strokeWidth={2.4}
              aria-hidden
            />
          </Link>
          <Link
            href="/pooja"
            className={buttonClasses("secondary", "lg", "w-full sm:w-auto")}
          >
            <Clock className="size-[1.05rem]" strokeWidth={2.2} aria-hidden />
            View Schedule
          </Link>
        </div>
      </div>
    </section>
  );
}
