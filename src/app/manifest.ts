import type { MetadataRoute } from "next";
import { APP } from "@/lib/constants";

/** Served at /manifest.webmanifest. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${APP.name} · ${APP.festival}`,
    short_name: APP.shortName,
    description: APP.tagline,
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#ea5308",
    lang: "en-IN",
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
      { name: "Pooja Timings", url: "/pooja" },
      { name: "Donate", url: "/donate" },
      { name: "Announcements", url: "/announcements" },
    ],
  };
}
