import Link from "next/link";
import type { Metadata } from "next";
import { GaneshaMark } from "@/components/brand/ganesha-mark";
import { buttonClasses } from "@/components/ui/button";
import { LOCALE_HTML_LANG } from "@/lib/i18n/config";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getI18n().then((r) => r.t);
  return { title: t.notFound.label };
}

/**
 * Lives outside the (app) group, so it carries its own `lang` rather than
 * inheriting the public shell's.
 */
export default async function NotFound() {
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

        {/* No uppercase or wide tracking — Telugu has no case, and letter-spacing
            separates its conjuncts. */}
        <p className="mt-8 text-[0.75rem] font-semibold text-saffron-600">
          {t.notFound.label}
        </p>
        <h1 className="mt-2 text-[1.375rem] font-bold tracking-[-0.03em] text-ink-900">
          {t.notFound.title}
        </h1>
        <p className="mx-auto mt-2 max-w-[20rem] text-[0.875rem] leading-relaxed text-ink-500">
          {t.notFound.body}
        </p>

        <Link href="/" className={buttonClasses("primary", "lg", "mt-7")}>
          {t.notFound.home}
        </Link>
      </div>
    </main>
  );
}
