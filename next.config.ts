import type { NextConfig } from "next";

/**
 * Committee photos and gallery media are served from the project's Supabase
 * Storage bucket, so that host is the only remote image origin we allow.
 */
const supabaseHost = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").hostname;
  } catch {
    return null;
  }
})();

const nextConfig: NextConfig = {
  // The floating dev badge sits on top of the fixed bottom navigation.
  devIndicators: false,
  images: {
    remotePatterns: supabaseHost
      ? [
          {
            protocol: "https",
            hostname: supabaseHost,
            pathname: "/storage/v1/object/public/**",
          },
        ]
      : [],
    formats: ["image/avif", "image/webp"],
    // On an IPv6-only network — an iOS personal hotspot, say — DNS64 hands back
    // synthesised addresses under the NAT64 prefix 64:ff9b::/96. Next 16's image
    // optimiser reads those as private and refuses to fetch, even though they
    // front ordinary public addresses, which blocks every uploaded photo during
    // local development. Limited to dev: a deployed committee site reaches
    // Supabase over normal IPv4 and keeps the SSRF guard intact. The blast
    // radius is small either way, since `remotePatterns` above already limits
    // the optimiser to this project's own Supabase host.
    dangerouslyAllowLocalIP: process.env.NODE_ENV === "development",
  },
};

export default nextConfig;
