"use client";

import { useState } from "react";
import { Check, Share2 } from "lucide-react";
import { ListRow } from "@/components/ui/list-row";
import { APP } from "@/lib/constants";

/**
 * Uses the Web Share sheet where the browser has one, and quietly falls back to
 * copying the link everywhere else.
 */
export function ShareAppRow() {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = typeof window === "undefined" ? APP.siteUrl : window.location.origin;
    const payload = {
      title: APP.name,
      text: `${APP.festival} — ${APP.tagline}`,
      url,
    };

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share(payload);
        return;
      } catch {
        // The user dismissed the sheet, or sharing is blocked — fall through.
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Nothing more we can do without a clipboard; the URL is in the address bar.
    }
  }

  return (
    <ListRow
      icon={copied ? Check : Share2}
      label={copied ? "Link copied" : "Share App"}
      description="Invite others from the village"
      tone="saffron"
      onClick={share}
      trailing={<span aria-hidden />}
    />
  );
}
