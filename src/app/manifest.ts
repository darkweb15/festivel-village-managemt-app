import type { MetadataRoute } from "next";
import { LOCALE_HTML_LANG } from "@/lib/i18n/config";
import { getI18n } from "@/lib/i18n/server";

/**
 * Served at /manifest.webmanifest.
 *
 * Localized, so the icon a villager adds to their home screen is labelled in
 * the language they chose. The browser caches the manifest, so the label
 * follows the language that was active when the app was installed.
 */
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const { locale, t } = await getI18n();

  return {
    name: `${t.brand.name} · ${t.brand.festival}`,
    short_name: t.brand.shortName,
    description: t.brand.tagline,
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#ea5308",
    lang: `${LOCALE_HTML_LANG[locale]}-IN`,
    dir: "ltr",
    categories: ["lifestyle", "social", "events"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      { name: t.more.timings, url: "/pooja" },
      { name: t.nav.donate, url: "/donate" },
      { name: t.nav.announcements, url: "/announcements" },
    ],
  };
}
