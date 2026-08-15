import type { Metadata, Viewport } from "next";
import { Inter, Noto_Sans_Telugu } from "next/font/google";
import { ServiceWorker } from "@/components/service-worker";
import { APP } from "@/lib/constants";
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

export const metadata: Metadata = {
  metadataBase: new URL(APP.siteUrl),
  title: {
    default: `${APP.name} · ${APP.festival}`,
    template: `%s · ${APP.name}`,
  },
  description: APP.tagline,
  applicationName: APP.name,
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: APP.shortName,
  },
  formatDetection: { telephone: true },
  openGraph: {
    type: "website",
    title: `${APP.name} · ${APP.festival}`,
    description: APP.tagline,
    siteName: APP.name,
  },
  icons: {
    icon: [{ url: "/icons/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
};

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
