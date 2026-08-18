"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { armAudio, playChime } from "@/lib/notifications/sound";
import type { NotificationDigest } from "@/lib/supabase/types";

/**
 * Notices the moment a new notification appears, and says so quietly.
 *
 * Worth being precise about what this is, because the words get muddled:
 *
 *   IN-APP  — this file. While the app is open in front of someone, a new
 *             committee notice makes a soft chime and the badge updates.
 *   PUSH    — a notification that reaches a phone with the app CLOSED. That
 *             needs a service worker `push` handler, VAPID keys, a stored
 *             subscription per device and something server-side to send it.
 *             None of that exists here, and this file does not provide it.
 *
 * The feed itself is server-rendered once per request, so before this component
 * nothing could "arrive" at all — the page had to be reloaded. This polls the
 * same read-only digest the badge uses (ids and timestamps, the two columns
 * anon is granted) and refreshes the tree when something genuinely new lands.
 *
 * Polling rather than Supabase Realtime on purpose: Realtime would mean adding
 * `notifications` to a publication, and the notification schema is meant to stay
 * untouched. A committee publishes a handful of notices a day — a query every
 * 45 seconds while the tab is actually visible is the cheaper honest answer.
 */

/** Only while visible; a hidden tab is throttled by the browser anyway. */
const POLL_MS = 45_000;

/** Comfortably more than a committee publishes between two polls. */
const WINDOW = 20;

export function NotificationSound({ digest }: { digest: NotificationDigest[] }) {
  const router = useRouter();

  // What this browser has already accounted for. Seeded from the server render,
  // which is what stops the chime firing on page load: everything already on
  // screen is, by definition, not new.
  const known = useRef<Set<string>>(new Set(digest.map((n) => n.id)));
  const latest = useRef<string>(
    digest.reduce((max, n) => (n.published_at > max ? n.published_at : max), ""),
  );

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    let cancelled = false;
    let timer: number | undefined;

    // The audio context can only start from a real gesture. Arm it on the first
    // one, whatever it is, so the chime is ready long before it is needed.
    const arm = () => armAudio();
    for (const type of ["pointerdown", "keydown", "touchstart"] as const) {
      window.addEventListener(type, arm, { once: true, passive: true });
    }

    const supabase = createClient();

    async function poll({ silent }: { silent: boolean }) {
      if (cancelled) return;

      const { data, error } = await supabase
        .from("notifications")
        .select("id, published_at")
        .order("published_at", { ascending: false })
        .limit(WINDOW);

      if (cancelled || error || !data) return;

      const fresh = data.filter(
        (n) => !known.current.has(n.id) && n.published_at > latest.current,
      );

      for (const n of data) known.current.add(n.id);
      latest.current = data.reduce(
        (max, n) => (n.published_at > max ? n.published_at : max),
        latest.current,
      );

      if (fresh.length === 0) return;

      // One chime for the batch. Three notices arriving together is one event
      // to the person hearing it, not three.
      if (!silent) playChime();

      // Pull the new entries into the badge and the feed. `router.refresh` is a
      // soft refresh: server components re-render, client state survives, so a
      // half-typed booking form is not disturbed by someone else's news.
      router.refresh();
    }

    function schedule() {
      window.clearTimeout(timer);
      timer = window.setTimeout(async () => {
        if (document.visibilityState === "visible") await poll({ silent: false });
        schedule();
      }, POLL_MS);
    }

    // Coming back to a tab that sat in the background is not the moment for a
    // noise — catch the badge up silently and let the next real arrival speak.
    function onVisibility() {
      if (document.visibilityState !== "visible") return;
      void poll({ silent: true });
      schedule();
    }

    document.addEventListener("visibilitychange", onVisibility);
    schedule();

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibility);
      for (const type of ["pointerdown", "keydown", "touchstart"] as const) {
        window.removeEventListener(type, arm);
      }
    };
  }, [router]);

  return null;
}
