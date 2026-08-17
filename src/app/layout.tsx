import type { Metadata, Viewport } from "next";
import { Inter, Noto_Sans_Telugu } from "next/font/google";
import { ServiceWorker } from "@/components/service-worker";
import { APP } from "@/lib/constants";
import { getDictionary } from "@/lib/i18n/server";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const notoTelugu = Noto_Sans_Telugu({
  variable: "--font-noto-telugu",
  subsets: ["telugu"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

/**
 * Locale-aware: the WhatsApp link preview a villager forwards should be in the
 * language the app is set to, so the title and description come from the
 * dictionary rather than the English constants.
 */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getDictionary();

  return {
    metadataBase: new URL(APP.siteUrl),
    title: {
      default: `${t.brand.name} · ${t.brand.festival}`,
      template: `%s · ${t.brand.name}`,
    },
    description: t.brand.tagline,
    applicationName: t.brand.name,
    manifest: "/manifest.webmanifest",
    appleWebApp: {
      capable: true,
      statusBarStyle: "default",
      title: t.brand.shortName,
    },
    formatDetection: { telephone: true },
    openGraph: {
      type: "website",
      title: `${t.brand.name} · ${t.brand.festival}`,
      description: t.brand.tagline,
      siteName: t.brand.name,
      // The committee emblem on the standard 1200×630 frame. This is the preview
      // a villager sees when the link is forwarded on WhatsApp, which is how the
      // app actually spreads, so it is worth more here than anywhere in the UI.
      images: [
        {
          url: "/og.png",
          width: 1200,
          height: 630,
          alt: `${t.brand.name}, ${t.brand.festival}`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${t.brand.name} · ${t.brand.festival}`,
      description: t.brand.tagline,
      images: ["/og.png"],
    },
    icons: {
      icon: [{ url: "/icons/icon.svg", type: "image/svg+xml" }],
      apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
    },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: "#ea5308",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${notoTelugu.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-full focus:bg-saffron-600 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
        >
          Skip to content
        </a>
        {children}
        <ServiceWorker />
      </body>
    </html>
  );
}
