import Link from "next/link";
import type { Metadata } from "next";
import { WifiOff } from "lucide-react";
import { GaneshaMark } from "@/components/brand/ganesha-mark";
import { buttonClasses } from "@/components/ui/button";
import { LOCALE_HTML_LANG } from "@/lib/i18n/config";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.offline.metaTitle };
}

/**
 * Served by the service worker when a page is not in the cache. It renders in
 * whichever language was current when the worker cached it, which is the one
 * thing about the switch that cannot follow the reader offline.
 */
export default async function OfflinePage() {
  const { locale, t } = await getI18n();

  return (
    <main
      lang={LOCALE_HTML_LANG[locale]}
      className="grid min-h-dvh place-items-center bg-white px-8 text-center"
    >
      <div>
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-saffron-600 text-white">
          <GaneshaMark className="size-8" strokeWidth={2} />
        </span>

        <div className="mt-8 flex items-center justify-center gap-2 text-ink-400">
          <WifiOff className="size-4" strokeWidth={2} aria-hidden />
          <span className="text-[0.75rem] font-semibold">
            {t.offline.noConnection}
          </span>
        </div>

        <h1 className="mt-3 text-[1.375rem] font-bold tracking-[-0.03em] text-ink-900">
          {t.offline.title}
        </h1>
        <p className="mx-auto mt-2 max-w-[18rem] text-[0.875rem] leading-relaxed text-ink-500">
          {t.offline.body}
        </p>

        <Link href="/" className={buttonClasses("primary", "lg", "mt-7")}>
          {t.offline.home}
        </Link>

        <p className="mt-10 text-[0.6875rem] text-ink-300">{t.brand.name}</p>
      </div>
    </main>
  );
}
