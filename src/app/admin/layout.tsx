import type { Metadata } from "next";
import { APP } from "@/lib/constants";

/**
 * Pins the whole admin area to English.
 *
 * The root layout builds its title from the dictionary, so a committee member
 * working while the public app is set to Telugu would otherwise see a Telugu
 * suffix on every admin browser tab. Overriding the template here keeps the
 * admin panel English end to end — chrome, copy and tab title alike — without
 * touching the public app's localized metadata.
 *
 * Renders nothing of its own; the visual shell still lives in (protected)/layout.
 */
export const metadata: Metadata = {
  title: {
    default: `${APP.name} · Committee Admin`,
    template: `%s · ${APP.name}`,
  },
};

export default function AdminSegmentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
